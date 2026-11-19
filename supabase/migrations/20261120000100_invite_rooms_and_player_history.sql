-- Extend the initial realtime game model with invite rooms and private history.
-- Apply after 20261119000100_realtime_commonality_game.sql.

alter table public.game_rooms
  drop constraint if exists game_rooms_status_check;

alter table public.game_rooms
  add constraint game_rooms_status_check
  check (status in ('waiting', 'playing', 'completed', 'abandoned', 'expired'));

alter table public.game_rooms
  add column created_by uuid references auth.users(id) on delete set null,
  add column invite_code text;

create unique index game_rooms_invite_code_unique
  on public.game_rooms (invite_code);

comment on column public.game_rooms.invite_code is
  'Temporary 12-character invite code; cleared when the room starts or closes.';

create table public.player_match_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  opponent_user_id uuid,
  opponent_nickname text not null,
  topic_key text not null check (topic_key in ('travel', 'music', 'daily', 'food')),
  completed_at timestamptz not null,
  question_count smallint not null check (question_count between 1 and 5),
  common_answer_count smallint not null check (
    common_answer_count between 0 and question_count
  ),
  common_choices jsonb not null default '[]'::jsonb
    check (jsonb_typeof(common_choices) = 'array'),
  unique (user_id, room_id)
);

create index player_match_history_recent_by_user
  on public.player_match_history (user_id, completed_at desc, id desc);
create index player_match_history_recent_by_opponent
  on public.player_match_history (user_id, opponent_user_id, completed_at desc)
  where opponent_user_id is not null;

comment on table public.player_match_history is
  'Per-player completed-game summary retained independently of 24-hour room data.';

alter table public.player_match_history enable row level security;
revoke all on table public.player_match_history from public, anon, authenticated;

create function private.expire_inactive_rooms()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expired integer;
begin
  update public.game_rooms r
  set status = 'expired',
      closed_at = coalesce(r.closed_at, r.expires_at),
      delete_after = r.expires_at + interval '24 hours',
      invite_code = null,
      updated_at = clock_timestamp()
  where r.status in ('waiting', 'playing')
    and r.expires_at <= clock_timestamp();
  get diagnostics v_expired = row_count;

  update public.matchmaking_queue q
  set delete_after = r.delete_after
  from public.game_rooms r
  where q.room_id = r.id
    and r.status in ('completed', 'abandoned', 'expired')
    and q.delete_after is distinct from r.delete_after;

  return v_expired;
end;
$function$;

revoke all on function private.expire_inactive_rooms() from public, anon, authenticated;

create function private.record_player_match_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player record;
  v_question_count smallint;
  v_common_answer_count smallint;
  v_common_choices jsonb;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  if (select count(*) from public.room_members rm where rm.room_id = new.id) <> 2 then
    raise exception 'A completed game must have exactly two players' using errcode = '23514';
  end if;

  for v_player in
    select
      mine.user_id,
      partner.user_id as opponent_user_id,
      partner.nickname as opponent_nickname
    from public.room_members mine
    join public.room_members partner
      on partner.room_id = mine.room_id
      and partner.user_id <> mine.user_id
    where mine.room_id = new.id
    order by mine.user_id
  loop
    select
      count(*)::smallint,
      (count(*) filter (where own_answer.choice = partner_answer.choice))::smallint,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'question_no', qb.question_no,
            'prompt', qb.prompt,
            'choice', case own_answer.choice when 0 then qb.choice_a else qb.choice_b end
          ) order by qb.question_no
        ) filter (where own_answer.choice = partner_answer.choice),
        '[]'::jsonb
      )
    into v_question_count, v_common_answer_count, v_common_choices
    from public.question_bank qb
    join public.game_answers own_answer
      on own_answer.room_id = new.id
      and own_answer.user_id = v_player.user_id
      and own_answer.question_no = qb.question_no
    join public.game_answers partner_answer
      on partner_answer.room_id = new.id
      and partner_answer.user_id = v_player.opponent_user_id
      and partner_answer.question_no = qb.question_no
    where qb.topic_key = new.topic_key;

    if v_question_count <> 5 then
      raise exception 'A completed game must contain five answered questions' using errcode = '23514';
    end if;

    insert into public.player_match_history (
      room_id, user_id, opponent_user_id, opponent_nickname, topic_key,
      completed_at, question_count, common_answer_count, common_choices
    ) values (
      new.id, v_player.user_id, v_player.opponent_user_id,
      v_player.opponent_nickname, new.topic_key,
      coalesce(new.closed_at, clock_timestamp()), v_question_count,
      v_common_answer_count, v_common_choices
    )
    on conflict (user_id, room_id) do nothing;
  end loop;

  return new;
end;
$function$;

create trigger game_rooms_record_player_history
  after update of status on public.game_rooms
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function private.record_player_match_history();

create function private.anonymize_deleted_opponent_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.player_match_history h
  set opponent_nickname = '已刪除玩家',
      opponent_user_id = null
  where h.opponent_user_id = old.id;
  return old;
end;
$function$;

create trigger auth_users_anonymize_opponent_history
  after delete on auth.users
  for each row
  execute function private.anonymize_deleted_opponent_history();

create function public.create_invite_room(
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
    v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
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

create function public.join_invite_room(
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
  v_room public.game_rooms%rowtype;
  v_active_room public.game_rooms%rowtype;
  v_opponent_nickname text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_invite_code is null or upper(btrim(p_invite_code)) !~ '^[0-9A-F]{12}$' then
    raise exception 'Invite code must contain 12 letters or digits' using errcode = '22023';
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

  select r.* into v_room
  from public.game_rooms r
  where r.invite_code = upper(btrim(p_invite_code))
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_room.status <> 'waiting' then
    return jsonb_build_object('status', 'unavailable', 'room_id', v_room.id);
  end if;
  if v_room.expires_at <= clock_timestamp() then
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

create function public.get_invite_room_status(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform private.expire_inactive_rooms();
  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id
    and r.created_by = v_user_id
    and private.is_room_member(r.id);
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'status', v_room.status,
    'room_id', v_room.id,
    'topic_key', v_room.topic_key,
    'invite_code', v_room.invite_code,
    'expires_at', v_room.expires_at
  );
end;
$function$;

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

create or replace function public.leave_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82420711);
  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id
  for update;
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  if v_room.status in ('waiting', 'playing') then
    update public.game_rooms r
    set status = 'abandoned',
        invite_code = null,
        closed_at = clock_timestamp(),
        delete_after = clock_timestamp() + interval '24 hours',
        updated_at = clock_timestamp()
    where r.id = v_room.id
    returning r.* into v_room;
    update public.matchmaking_queue q
    set status = case when q.status = 'waiting' then 'cancelled' else q.status end,
        delete_after = v_room.delete_after
    where q.user_id = v_user_id
      and (q.status = 'waiting' or q.room_id = v_room.id);
  end if;

  return jsonb_build_object('status', v_room.status, 'room_id', v_room.id);
end;
$function$;

create function public.get_my_match_history(
  p_limit integer default 20,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if (p_before_at is null) <> (p_before_id is null) then
    raise exception 'Both history cursor values must be supplied together' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', page.id,
        'completed_at', page.completed_at,
        'topic_key', page.topic_key,
        'opponent_nickname', page.opponent_nickname,
        'question_count', page.question_count,
        'common_answer_count', page.common_answer_count,
        'common_choices', page.common_choices
      ) order by page.completed_at desc, page.id desc
    ),
    '[]'::jsonb
  ) into v_items
  from (
    select h.*
    from public.player_match_history h
    where h.user_id = v_user_id
      and h.completed_at > clock_timestamp() - interval '90 days'
      and (
        p_before_at is null
        or (h.completed_at, h.id) < (p_before_at, p_before_id)
      )
    order by h.completed_at desc, h.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  ) page;

  return jsonb_build_object('items', v_items);
end;
$function$;

create function public.delete_my_match_history(p_history_id uuid)
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

  delete from public.player_match_history h
  where h.id = p_history_id
    and h.user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$function$;

create function public.get_my_commonality_ranking()
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

  with stats as (
    select
      h.opponent_user_id,
      (array_agg(h.opponent_nickname order by h.completed_at desc, h.id desc))[1] as opponent_nickname,
      count(*)::integer as match_count,
      sum(h.common_answer_count)::integer as common_answer_count,
      sum(h.question_count)::integer as question_count,
      round(
        sum(h.common_answer_count)::numeric / nullif(sum(h.question_count), 0),
        4
      ) as commonality_ratio
    from public.player_match_history h
    where h.user_id = v_user_id
      and h.opponent_user_id is not null
      and h.completed_at > clock_timestamp() - interval '90 days'
    group by h.opponent_user_id
    having count(*) >= 3
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'opponent_nickname', s.opponent_nickname,
        'match_count', s.match_count,
        'common_answer_count', s.common_answer_count,
        'question_count', s.question_count,
        'commonality_ratio', s.commonality_ratio
      ) order by s.commonality_ratio desc, s.match_count desc,
        s.common_answer_count desc, s.opponent_nickname asc
    ),
    '[]'::jsonb
  ) into v_players
  from stats s;

  return jsonb_build_object('players', v_players);
end;
$function$;

create or replace function private.purge_expired_game_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rooms_expired integer;
  v_queue_expired integer;
  v_queue_deleted integer;
  v_rooms_deleted integer;
  v_history_deleted integer;
begin
  v_rooms_expired := private.expire_inactive_rooms();

  update public.matchmaking_queue q
  set status = 'timed_out',
      delete_after = q.expires_at + interval '24 hours'
  where q.status = 'waiting'
    and q.expires_at <= clock_timestamp();
  get diagnostics v_queue_expired = row_count;

  delete from public.matchmaking_queue q
  where q.delete_after <= clock_timestamp();
  get diagnostics v_queue_deleted = row_count;

  delete from public.game_rooms r
  where r.delete_after is not null
    and r.delete_after <= clock_timestamp();
  get diagnostics v_rooms_deleted = row_count;

  delete from public.player_match_history h
  where h.completed_at <= clock_timestamp() - interval '90 days';
  get diagnostics v_history_deleted = row_count;

  return v_rooms_expired + v_queue_expired + v_queue_deleted + v_rooms_deleted + v_history_deleted;
end;
$function$;

comment on function private.purge_expired_game_data() is
  'Expire idle invite/match rooms, purge raw room data after 24 hours, and purge player history after 90 days.';

do $schedule$
begin
  if pg_catalog.to_regclass('cron.job') is not null then
    execute 'select cron.schedule($1, $2)'
      using '*/15 * * * *', 'select private.purge_expired_game_data()';
  else
    raise notice 'pg_cron is unavailable; schedule private.purge_expired_game_data() before launch.';
  end if;
exception
  when insufficient_privilege or undefined_function then
    raise notice 'Could not schedule cleanup automatically; schedule private.purge_expired_game_data() before launch.';
end;
$schedule$;

revoke all on function public.create_invite_room(text, text) from public, anon, authenticated;
revoke all on function public.join_invite_room(text, text) from public, anon, authenticated;
revoke all on function public.get_invite_room_status(uuid) from public, anon, authenticated;
revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
revoke all on function public.leave_room(uuid) from public, anon, authenticated;
revoke all on function public.get_my_match_history(integer, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.delete_my_match_history(uuid) from public, anon, authenticated;
revoke all on function public.get_my_commonality_ranking() from public, anon, authenticated;
revoke all on function private.purge_expired_game_data() from public, anon, authenticated;
revoke all on function private.record_player_match_history() from public, anon, authenticated;
revoke all on function private.anonymize_deleted_opponent_history() from public, anon, authenticated;
revoke all on function private.expire_inactive_rooms() from public, anon, authenticated;

grant execute on function public.create_invite_room(text, text) to authenticated;
grant execute on function public.join_invite_room(text, text) to authenticated;
grant execute on function public.get_invite_room_status(uuid) to authenticated;
grant execute on function public.queue_for_match(text, text) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.get_my_match_history(integer, timestamptz, uuid) to authenticated;
grant execute on function public.delete_my_match_history(uuid) to authenticated;
grant execute on function public.get_my_commonality_ranking() to authenticated;
