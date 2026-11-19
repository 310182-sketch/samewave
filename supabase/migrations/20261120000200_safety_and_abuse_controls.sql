-- Add private player blocks, room reports and basic account-level rate limits.
-- Apply after 20261120000100_invite_rooms_and_player_history.sql.

create table public.player_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_nickname text not null check (char_length(btrim(blocked_nickname)) between 1 and 12),
  created_at timestamptz not null default clock_timestamp(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create index player_blocks_by_blocked_user
  on public.player_blocks (blocked_user_id, blocker_user_id);

comment on table public.player_blocks is
  'Private, one-way player blocks; either direction prevents future pairing.';

alter table public.player_blocks enable row level security;
revoke all on table public.player_blocks from public, anon, authenticated;

create table public.player_safety_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('harassment', 'hate', 'sexual_content', 'spam', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default clock_timestamp(),
  reviewed_at timestamptz,
  unique (room_id, reporter_user_id),
  check (reporter_user_id is null or reported_user_id is null or reporter_user_id <> reported_user_id)
);

create index player_safety_reports_pending
  on public.player_safety_reports (created_at)
  where status = 'pending';
create index player_safety_reports_created_at
  on public.player_safety_reports (created_at);

comment on table public.player_safety_reports is
  'Restricted moderation queue. Reports intentionally do not retain room answers or chat content.';

alter table public.player_safety_reports enable row level security;
revoke all on table public.player_safety_reports from public, anon, authenticated;
grant select, update, delete on table public.player_safety_reports to service_role;

create function private.players_have_blocked(p_first_user_id uuid, p_second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.player_blocks b
    where (b.blocker_user_id = p_first_user_id and b.blocked_user_id = p_second_user_id)
       or (b.blocker_user_id = p_second_user_id and b.blocked_user_id = p_first_user_id)
  );
$function$;

revoke all on function private.players_have_blocked(uuid, uuid) from public, anon, authenticated;

create function private.guard_matchmaking_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_recent_tickets integer;
begin
  select count(*)::integer into v_recent_tickets
  from public.matchmaking_queue q
  where q.user_id = new.user_id
    and q.created_at > clock_timestamp() - interval '10 minutes';

  if v_recent_tickets >= 12 then
    raise exception 'Matchmaking rate limit reached' using errcode = '54000';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_matchmaking_rate_limit() from public, anon, authenticated;

create trigger matchmaking_queue_rate_limit
  before insert on public.matchmaking_queue
  for each row execute function private.guard_matchmaking_rate_limit();

create function private.guard_invite_room_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_recent_rooms integer;
begin
  if new.created_by is null then
    return new;
  end if;

  select count(*)::integer into v_recent_rooms
  from public.game_rooms r
  where r.created_by = new.created_by
    and r.created_at > clock_timestamp() - interval '1 hour';

  if v_recent_rooms >= 6 then
    raise exception 'Invite room rate limit reached' using errcode = '54000';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_invite_room_rate_limit() from public, anon, authenticated;

create trigger game_rooms_invite_rate_limit
  before insert on public.game_rooms
  for each row execute function private.guard_invite_room_rate_limit();

create function private.prevent_blocked_room_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing_user_id uuid;
begin
  select rm.user_id into v_existing_user_id
  from public.room_members rm
  where rm.room_id = new.room_id
    and rm.user_id <> new.user_id
  limit 1;

  if v_existing_user_id is not null
     and private.players_have_blocked(v_existing_user_id, new.user_id) then
    raise exception 'Room unavailable' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.prevent_blocked_room_join() from public, anon, authenticated;

create trigger room_members_reject_blocked_players
  before insert on public.room_members
  for each row execute function private.prevent_blocked_room_join();

create or replace function public.queue_for_match(p_topic_choice text, p_nickname text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_ticket public.matchmaking_queue%rowtype;
  v_candidate public.matchmaking_queue%rowtype;
  v_active_room public.game_rooms%rowtype;
  v_room_id uuid;
  v_topic_key text;
  v_opponent_nickname text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_topic_choice is null or p_topic_choice not in ('travel', 'music', 'daily', 'food', 'random') then
    raise exception 'Unsupported topic choice' using errcode = '22023';
  end if;

  v_nickname := coalesce(nullif(btrim(coalesce(p_nickname, '')), ''), '小星');
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

  select q.* into v_ticket
  from public.matchmaking_queue q
  join public.game_rooms r on r.id = q.room_id and r.status = 'playing'
  where q.user_id = v_user_id
    and q.status = 'matched'
  order by q.created_at desc
  limit 1;
  if found then
    select rm.nickname into v_opponent_nickname
    from public.room_members rm
    where rm.room_id = v_ticket.room_id
      and rm.user_id <> v_user_id
    limit 1;
    return jsonb_build_object(
      'status', 'matched',
      'ticket_id', v_ticket.id,
      'room_id', v_ticket.room_id,
      'topic_key', (select r.topic_key from public.game_rooms r where r.id = v_ticket.room_id),
      'opponent_nickname', v_opponent_nickname
    );
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
      'topic_key', v_active_room.topic_key,
      'invite_code', case when v_active_room.status = 'waiting' then v_active_room.invite_code else null end
    );
  end if;

  select q.* into v_ticket
  from public.matchmaking_queue q
  where q.user_id = v_user_id
    and q.status = 'waiting'
    and q.expires_at > clock_timestamp()
  order by q.created_at desc
  limit 1
  for update;
  if found then
    return jsonb_build_object(
      'status', 'waiting',
      'ticket_id', v_ticket.id,
      'expires_at', v_ticket.expires_at
    );
  end if;

  select q.* into v_candidate
  from public.matchmaking_queue q
  where q.status = 'waiting'
    and q.user_id <> v_user_id
    and q.expires_at > clock_timestamp()
    and (p_topic_choice = 'random' or q.topic_choice = 'random' or q.topic_choice = p_topic_choice)
    and not exists (
      select 1
      from public.room_members rm
      join public.game_rooms r on r.id = rm.room_id
      where rm.user_id = q.user_id
        and r.status in ('waiting', 'playing')
    )
    and not private.players_have_blocked(v_user_id, q.user_id)
  order by q.created_at
  limit 1
  for update of q skip locked;

  if found then
    if p_topic_choice = 'random' and v_candidate.topic_choice = 'random' then
      select qb.topic_key into v_topic_key
      from public.question_bank qb
      where qb.question_no = 1
      order by random()
      limit 1;
    elsif p_topic_choice = 'random' then
      v_topic_key := v_candidate.topic_choice;
    else
      v_topic_key := p_topic_choice;
    end if;

    insert into public.game_rooms (topic_key)
    values (v_topic_key)
    returning id into v_room_id;

    update public.matchmaking_queue
    set status = 'matched',
        room_id = v_room_id,
        delete_after = clock_timestamp() + interval '24 hours'
    where id = v_candidate.id;

    insert into public.matchmaking_queue (
      user_id, topic_choice, nickname, status, room_id, expires_at, delete_after
    ) values (
      v_user_id, p_topic_choice, v_nickname, 'matched', v_room_id,
      clock_timestamp(), clock_timestamp() + interval '24 hours'
    ) returning * into v_ticket;

    insert into public.room_members (room_id, user_id, nickname)
    values
      (v_room_id, v_candidate.user_id, v_candidate.nickname),
      (v_room_id, v_user_id, v_nickname);

    return jsonb_build_object(
      'status', 'matched',
      'ticket_id', v_ticket.id,
      'room_id', v_room_id,
      'topic_key', v_topic_key,
      'opponent_nickname', v_candidate.nickname
    );
  end if;

  insert into public.matchmaking_queue (user_id, topic_choice, nickname)
  values (v_user_id, p_topic_choice, v_nickname)
  returning * into v_ticket;

  return jsonb_build_object(
    'status', 'waiting',
    'ticket_id', v_ticket.id,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

create function public.block_room_opponent(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
  v_opponent_nickname text;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  select rm.user_id, rm.nickname
    into v_opponent_id, v_opponent_nickname
  from public.room_members rm
  where rm.room_id = p_room_id
    and rm.user_id <> v_user_id
  limit 1;
  if v_opponent_id is null then
    raise exception 'Room has no other player' using errcode = '55000';
  end if;

  insert into public.player_blocks (blocker_user_id, blocked_user_id, blocked_nickname)
  values (v_user_id, v_opponent_id, v_opponent_nickname)
  on conflict (blocker_user_id, blocked_user_id)
  do update set blocked_nickname = excluded.blocked_nickname;

  return jsonb_build_object('status', 'blocked');
end;
$function$;

create function public.get_my_blocked_players()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_players jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', b.blocked_user_id,
        'nickname', b.blocked_nickname,
        'blocked_at', b.created_at
      ) order by b.created_at desc
    ),
    '[]'::jsonb
  ) into v_players
  from public.player_blocks b
  where b.blocker_user_id = v_user_id;

  return jsonb_build_object('players', v_players);
end;
$function$;

create function public.unblock_player(p_blocked_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  delete from public.player_blocks b
  where b.blocker_user_id = v_user_id
    and b.blocked_user_id = p_blocked_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$function$;

create function public.submit_player_report(
  p_room_id uuid,
  p_category text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
  v_details text := coalesce(btrim(coalesce(p_details, '')), '');
  v_inserted integer;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if p_category is null or p_category not in ('harassment', 'hate', 'sexual_content', 'spam', 'other') then
    raise exception 'Unsupported report category' using errcode = '22023';
  end if;
  if char_length(v_details) > 500 then
    raise exception 'Report details must be at most 500 characters' using errcode = '22023';
  end if;

  select rm.user_id into v_opponent_id
  from public.room_members rm
  where rm.room_id = p_room_id
    and rm.user_id <> v_user_id
  limit 1;
  if v_opponent_id is null then
    raise exception 'Room has no other player' using errcode = '55000';
  end if;

  insert into public.player_safety_reports (
    room_id, reporter_user_id, reported_user_id, category, details
  ) values (
    p_room_id, v_user_id, v_opponent_id, p_category, v_details
  ) on conflict (room_id, reporter_user_id) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'status', case when v_inserted = 1 then 'submitted' else 'already_submitted' end
  );
end;
$function$;

create function private.purge_expired_moderation_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.player_safety_reports r
  where r.created_at <= clock_timestamp() - interval '180 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.purge_expired_moderation_reports() from public, anon, authenticated;

do $schedule$
begin
  if pg_catalog.to_regclass('cron.job') is not null then
    execute 'select cron.schedule($1, $2, $3)'
      using 'purge-expired-moderation-reports', '17 3 * * *',
        'select private.purge_expired_moderation_reports()';
  else
    raise notice 'pg_cron is unavailable; schedule private.purge_expired_moderation_reports() before launch.';
  end if;
exception
  when insufficient_privilege or undefined_function then
    raise notice 'Could not schedule report cleanup automatically; schedule private.purge_expired_moderation_reports() before launch.';
end;
$schedule$;

revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
revoke all on function public.block_room_opponent(uuid) from public, anon, authenticated;
revoke all on function public.get_my_blocked_players() from public, anon, authenticated;
revoke all on function public.unblock_player(uuid) from public, anon, authenticated;
revoke all on function public.submit_player_report(uuid, text, text) from public, anon, authenticated;

grant execute on function public.queue_for_match(text, text) to authenticated;
grant execute on function public.block_room_opponent(uuid) to authenticated;
grant execute on function public.get_my_blocked_players() to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
grant execute on function public.submit_player_report(uuid, text, text) to authenticated;
