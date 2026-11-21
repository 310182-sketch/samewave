-- Shorter numeric invitation codes with server-side guess throttling.

create table private.invite_code_join_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempt_count smallint not null check (attempt_count between 1 and 5),
  updated_at timestamptz not null
);

alter table private.invite_code_join_attempt_limits enable row level security;
revoke all on table private.invite_code_join_attempt_limits
  from public, anon, authenticated;

comment on table private.invite_code_join_attempt_limits is
  'Stores at most one short-lived join-attempt counter per authenticated player; invite codes themselves are never stored here.';

comment on column public.game_rooms.invite_code is
  'Temporary six-digit numeric invitation code; unexpired legacy 12-character codes remain accepted during deployment transition.';

create or replace function private.generate_room_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $function$
declare
  v_bytes bytea;
  v_number integer;
begin
  loop
    v_bytes := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
    v_number := (
      pg_catalog.get_byte(v_bytes, 0) * 65536
      + pg_catalog.get_byte(v_bytes, 1) * 256
      + pg_catalog.get_byte(v_bytes, 2)
    ) / 16;
    if v_number < 1000000 then
      return pg_catalog.lpad(v_number::text, 6, '0');
    end if;
  end loop;
end;
$function$;

revoke all on function private.generate_room_invite_code()
  from public, anon, authenticated;

create or replace function private.purge_expired_invite_code_join_attempts()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from private.invite_code_join_attempt_limits
  where updated_at <= clock_timestamp() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.purge_expired_invite_code_join_attempts()
  from public, anon, authenticated;

do $schedule$
begin
  if pg_catalog.to_regclass('cron.job') is not null then
    execute 'select cron.schedule($1, $2, $3)'
      using 'purge-expired-invite-code-join-attempts', '0 * * * *',
        'select private.purge_expired_invite_code_join_attempts()';
  else
    raise notice 'pg_cron is unavailable; schedule private.purge_expired_invite_code_join_attempts() before launch.';
  end if;
exception
  when insufficient_privilege or undefined_function then
    raise notice 'Could not schedule invite-code attempt cleanup automatically.';
end;
$schedule$;

create or replace function public.create_invite_room(
  p_topic_choice text,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_topic_key text;
  v_room public.game_rooms%rowtype;
  v_room_id uuid;
  v_invite_code text;
  v_expires_at timestamptz;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_topic_choice is null or p_topic_choice not in (
    'travel', 'music', 'daily', 'food', 'entertainment',
    'hobbies', 'sports', 'pets', 'reading', 'culture', 'random'
  ) then
    raise exception 'Unsupported topic choice' using errcode = '22023';
  end if;

  v_nickname := coalesce(nullif(btrim(coalesce(p_nickname, '')), ''), '企鵝');
  if char_length(v_nickname) > 12 then
    raise exception 'Nickname must be at most 12 characters' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82420711);
  perform private.expire_inactive_rooms();
  update public.matchmaking_queue q
  set status = 'timed_out',
      delete_after = q.expires_at + interval '24 hours'
  where q.status = 'waiting'
    and q.expires_at <= clock_timestamp();
  update public.matchmaking_queue q
  set status = 'cancelled',
      delete_after = clock_timestamp() + interval '24 hours'
  where q.user_id = v_user_id
    and q.status = 'waiting';

  select r.* into v_room
  from public.game_rooms r
  join public.room_members rm on rm.room_id = r.id
  where rm.user_id = v_user_id
    and r.status in ('waiting', 'playing')
  order by r.created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'status', 'active_room',
      'room_id', v_room.id,
      'topic_key', v_room.topic_key,
      'invite_code', case when v_room.status = 'waiting' then v_room.invite_code else null end,
      'expires_at', v_room.expires_at
    );
  end if;

  if p_topic_choice = 'random' then
    select qb.topic_key into v_topic_key
    from public.question_bank qb
    where qb.question_no = 1
    order by random()
    limit 1;
  else
    v_topic_key := p_topic_choice;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_invite_code := private.generate_room_invite_code();
    insert into public.game_rooms (
      topic_key, status, created_by, invite_code, expires_at
    ) values (
      v_topic_key, 'waiting', v_user_id, v_invite_code,
      clock_timestamp() + interval '10 minutes'
    )
    on conflict (invite_code) do nothing
    returning id, expires_at into v_room_id, v_expires_at;
    exit when v_room_id is not null;
    if v_attempt >= 5 then
      raise exception 'Could not allocate a unique invite code' using errcode = '54000';
    end if;
  end loop;

  insert into public.room_members (room_id, user_id, nickname)
  values (v_room_id, v_user_id, v_nickname);

  return jsonb_build_object(
    'status', 'waiting',
    'room_id', v_room_id,
    'topic_key', v_topic_key,
    'invite_code', v_invite_code,
    'expires_at', v_expires_at
  );
end;
$function$;

create or replace function public.join_invite_room(
  p_invite_code text,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_normalized_invite_code text;
  v_room public.game_rooms%rowtype;
  v_active_room public.game_rooms%rowtype;
  v_opponent_nickname text;
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_attempt_count smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  v_normalized_invite_code := upper(btrim(coalesce(p_invite_code, '')));
  if v_normalized_invite_code !~ '^[0-9]{6}$'
     and v_normalized_invite_code !~ '^[0-9A-F]{12}$' then
    raise exception 'Invite code must contain six digits' using errcode = '22023';
  end if;

  v_nickname := coalesce(nullif(btrim(coalesce(p_nickname, '')), ''), '企鵝');
  if char_length(v_nickname) > 12 then
    raise exception 'Nickname must be at most 12 characters' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82420711);
  perform private.expire_inactive_rooms();
  update public.matchmaking_queue q
  set status = 'timed_out',
      delete_after = q.expires_at + interval '24 hours'
  where q.status = 'waiting'
    and q.expires_at <= v_now;

  select limits.window_started_at, limits.attempt_count
  into v_window_started_at, v_attempt_count
  from private.invite_code_join_attempt_limits limits
  where limits.user_id = v_user_id
  for update;

  if not found then
    insert into private.invite_code_join_attempt_limits (
      user_id, window_started_at, attempt_count, updated_at
    ) values (v_user_id, v_now, 1, v_now);
  elsif v_window_started_at <= v_now - interval '10 minutes' then
    update private.invite_code_join_attempt_limits
    set window_started_at = v_now,
        attempt_count = 1,
        updated_at = v_now
    where user_id = v_user_id;
  elsif v_attempt_count >= 5 then
    return jsonb_build_object(
      'status', 'rate_limited',
      'retry_after_seconds',
        greatest(
          1,
          pg_catalog.ceil(
            extract(epoch from (v_window_started_at + interval '10 minutes' - v_now))
          )::integer
        )
    );
  else
    update private.invite_code_join_attempt_limits
    set attempt_count = attempt_count + 1,
        updated_at = v_now
    where user_id = v_user_id;
  end if;

  select r.* into v_room
  from public.game_rooms r
  where r.invite_code = v_normalized_invite_code
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_room.status <> 'waiting' then
    return jsonb_build_object('status', 'unavailable', 'room_id', v_room.id);
  end if;
  if v_room.expires_at <= v_now then
    return jsonb_build_object('status', 'expired', 'room_id', v_room.id);
  end if;
  if v_room.created_by = v_user_id then
    raise exception 'Room creator cannot join their own room' using errcode = '22023';
  end if;

  select rm.nickname into v_opponent_nickname
  from public.room_members rm
  where rm.room_id = v_room.id
  limit 1;
  if v_opponent_nickname is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select r.* into v_active_room
  from public.game_rooms r
  join public.room_members rm on rm.room_id = r.id
  where rm.user_id = v_user_id
    and r.status in ('waiting', 'playing')
  order by r.created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'status', 'active_room',
      'room_id', v_active_room.id,
      'topic_key', v_active_room.topic_key
    );
  end if;

  update public.matchmaking_queue q
  set status = 'cancelled',
      delete_after = clock_timestamp() + interval '24 hours'
  where q.user_id = v_user_id
    and q.status = 'waiting';

  insert into public.room_members (room_id, user_id, nickname)
  values (v_room.id, v_user_id, v_nickname);

  update public.game_rooms r
  set status = 'playing',
      invite_code = null,
      expires_at = clock_timestamp() + interval '10 minutes',
      last_activity_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where r.id = v_room.id
  returning r.* into v_room;

  return jsonb_build_object(
    'status', 'joined',
    'room_id', v_room.id,
    'topic_key', v_room.topic_key,
    'opponent_nickname', v_opponent_nickname,
    'expires_at', v_room.expires_at
  );
end;
$function$;

revoke all on function public.create_invite_room(text, text)
  from public, anon, authenticated;
grant execute on function public.create_invite_room(text, text) to authenticated;
revoke all on function public.join_invite_room(text, text)
  from public, anon, authenticated;
grant execute on function public.join_invite_room(text, text) to authenticated;
