-- Let both members of a completed room agree to start a fresh game together.

create table public.game_rematch_requests (
  source_room_id uuid primary key references public.game_rooms(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete cascade,
  new_room_id uuid references public.game_rooms(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'matched', 'expired')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  check (accepted_by is null or accepted_by <> requested_by)
);

comment on table public.game_rematch_requests is
  'Short-lived mutual-consent requests to replay with the same two players; access is through authenticated RPCs.';

alter table public.game_rematch_requests enable row level security;
revoke all on table public.game_rematch_requests from public, anon, authenticated;

create function public.request_same_player_rematch(p_source_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_source public.game_rooms%rowtype;
  v_request public.game_rematch_requests%rowtype;
  v_player_ids uuid[];
  v_partner_id uuid;
  v_new_room_id uuid;
  v_new_room public.game_rooms%rowtype;
  v_is_busy boolean;
  v_has_request boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82420711);
  perform private.expire_inactive_rooms();

  select r.* into v_source
  from public.game_rooms r
  where r.id = p_source_room_id
  for update;
  if not found
    or v_source.status <> 'completed'
    or coalesce(v_source.delete_after, v_source.closed_at + interval '24 hours') <= clock_timestamp()
  then
    raise exception 'Completed room is unavailable' using errcode = '42501';
  end if;

  select array_agg(rm.user_id order by rm.joined_at, rm.user_id)
    into v_player_ids
  from public.room_members rm
  where rm.room_id = v_source.id;
  if coalesce(array_length(v_player_ids, 1), 0) <> 2
    or not (v_user_id = any(v_player_ids))
  then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  select rm.user_id into v_partner_id
  from public.room_members rm
  where rm.room_id = v_source.id
    and rm.user_id <> v_user_id
  limit 1;

  if private.players_have_blocked(v_user_id, v_partner_id) then
    return jsonb_build_object('status', 'blocked');
  end if;

  select q.* into v_request
  from public.game_rematch_requests q
  where q.source_room_id = v_source.id
  for update;
  v_has_request := found;

  if v_has_request and v_request.status = 'matched' then
    if v_request.new_room_id is not null then
      select r.* into v_new_room
      from public.game_rooms r
      where r.id = v_request.new_room_id;
      if found and v_new_room.status in ('waiting', 'playing') then
        return jsonb_build_object(
          'status', 'matched',
          'room_id', v_new_room.id,
          'topic_key', v_new_room.topic_key,
          'expires_at', v_new_room.expires_at
        );
      end if;
    end if;
    v_request.status := 'expired';
  end if;

  select exists (
    select 1
    from public.room_members rm
    join public.game_rooms r on r.id = rm.room_id
    where rm.user_id = any(v_player_ids)
      and r.id <> v_source.id
      and r.status in ('waiting', 'playing')
  ) into v_is_busy;
  if v_is_busy then
    return jsonb_build_object('status', 'busy');
  end if;

  if not v_has_request
    or v_request.status = 'expired'
    or v_request.expires_at <= clock_timestamp()
    or (v_request.status = 'matched' and v_new_room.id is null)
  then
    insert into public.game_rematch_requests (
      source_room_id, requested_by, accepted_by, new_room_id,
      status, created_at, expires_at
    ) values (
      v_source.id, v_user_id, null, null,
      'pending', clock_timestamp(), clock_timestamp() + interval '10 minutes'
    )
    on conflict (source_room_id) do update
    set requested_by = excluded.requested_by,
        accepted_by = null,
        new_room_id = null,
        status = 'pending',
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
    returning * into v_request;

    update public.game_rooms r
    set updated_at = clock_timestamp()
    where r.id = v_source.id;

    return jsonb_build_object(
      'status', 'pending',
      'requested_by_you', true,
      'expires_at', v_request.expires_at
    );
  end if;

  if v_request.status = 'pending' and v_request.expires_at > clock_timestamp() then
    if v_request.requested_by = v_user_id then
      return jsonb_build_object(
        'status', 'pending',
        'requested_by_you', true,
        'expires_at', v_request.expires_at
      );
    end if;

    insert into public.game_rooms (
      topic_key, status, created_by, expires_at
    ) values (
      v_source.topic_key, 'playing', v_user_id,
      clock_timestamp() + interval '10 minutes'
    ) returning * into v_new_room;
    v_new_room_id := v_new_room.id;

    insert into public.room_members (room_id, user_id, nickname)
    select v_new_room_id, rm.user_id, rm.nickname
    from public.room_members rm
    where rm.room_id = v_source.id;

    update public.game_rematch_requests q
    set status = 'matched',
        accepted_by = v_user_id,
        new_room_id = v_new_room_id
    where q.source_room_id = v_source.id
    returning * into v_request;

    update public.game_rooms r
    set updated_at = clock_timestamp()
    where r.id = v_source.id;

    return jsonb_build_object(
      'status', 'matched',
      'room_id', v_new_room.id,
      'topic_key', v_new_room.topic_key,
      'expires_at', v_new_room.expires_at
    );
  end if;

  return jsonb_build_object('status', 'expired');
end;
$function$;

create function public.get_same_player_rematch_status(p_source_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_source public.game_rooms%rowtype;
  v_request public.game_rematch_requests%rowtype;
  v_new_room public.game_rooms%rowtype;
  v_partner_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select r.* into v_source
  from public.game_rooms r
  where r.id = p_source_room_id
    and r.status = 'completed'
    and private.is_room_member(r.id);
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  if coalesce(v_source.delete_after, v_source.closed_at + interval '24 hours') <= clock_timestamp() then
    raise exception 'Completed room is unavailable' using errcode = '42501';
  end if;

  select rm.user_id into v_partner_id
  from public.room_members rm
  where rm.room_id = v_source.id
    and rm.user_id <> v_user_id
  limit 1;
  if v_partner_id is null or private.players_have_blocked(v_user_id, v_partner_id) then
    return jsonb_build_object('status', 'blocked');
  end if;

  select q.* into v_request
  from public.game_rematch_requests q
  where q.source_room_id = v_source.id;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  if v_request.status = 'pending'
    and v_request.expires_at <= clock_timestamp()
  then
    update public.game_rematch_requests q
    set status = 'expired'
    where q.source_room_id = v_source.id;
    return jsonb_build_object('status', 'expired');
  end if;

  if v_request.status = 'pending' then
    return jsonb_build_object(
      'status', 'pending',
      'requested_by_you', v_request.requested_by = v_user_id,
      'expires_at', v_request.expires_at
    );
  end if;

  if v_request.status = 'matched' and v_request.new_room_id is not null then
    select r.* into v_new_room
    from public.game_rooms r
    where r.id = v_request.new_room_id;
    if found and v_new_room.status in ('waiting', 'playing') then
      return jsonb_build_object(
        'status', 'matched',
        'room_id', v_new_room.id,
        'topic_key', v_new_room.topic_key,
        'expires_at', v_new_room.expires_at
      );
    end if;
    if found and v_new_room.status = 'completed' then
      return jsonb_build_object('status', 'finished');
    end if;
    return jsonb_build_object('status', 'ended');
  end if;

  return jsonb_build_object('status', v_request.status);
end;
$function$;

revoke all on function public.request_same_player_rematch(uuid) from public, anon, authenticated;
revoke all on function public.get_same_player_rematch_status(uuid) from public, anon, authenticated;
grant execute on function public.request_same_player_rematch(uuid) to authenticated;
grant execute on function public.get_same_player_rematch_status(uuid) to authenticated;
revoke all on function public.get_same_player_rematch_status(uuid) from public, anon;
