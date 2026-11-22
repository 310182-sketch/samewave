-- Keep 5-question games as the default while making 10- and 15-question
-- games first-class across rooms, matchmaking, results and history.

alter table public.game_rooms
  add column question_count smallint not null default 5
    check (question_count in (5, 10, 15));

alter table public.matchmaking_queue
  add column question_count smallint not null default 5
    check (question_count in (5, 10, 15));

alter table public.game_rooms
  drop constraint if exists game_rooms_current_question_check,
  add constraint game_rooms_current_question_check
    check (current_question between 1 and 15);

alter table public.room_members
  drop constraint if exists room_members_ready_for_question_check,
  add constraint room_members_ready_for_question_check
    check (ready_for_question between 0 and 15);

alter table public.game_answers
  drop constraint if exists game_answers_question_no_check,
  add constraint game_answers_question_no_check
    check (question_no between 1 and 15);

alter table public.player_match_history
  drop constraint if exists player_match_history_question_count_check,
  add constraint player_match_history_question_count_check
    check (question_count in (5, 10, 15));

alter table public.player_match_history
  drop constraint if exists player_match_history_topic_key_check,
  add constraint player_match_history_topic_key_check
    check (topic_key in (
      'travel', 'music', 'daily', 'food', 'entertainment',
      'hobbies', 'sports', 'pets', 'reading', 'culture',
      'kpop', 'f1', 'values', 'relationships', 'politics'
    ));

create index matchmaking_queue_waiting_by_question_count
  on public.matchmaking_queue (question_count, created_at)
  where status = 'waiting';

create or replace function public.create_invite_room(
  p_topic_choice text,
  p_nickname text,
  p_question_count smallint
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
    'hobbies', 'sports', 'pets', 'reading', 'culture',
    'kpop', 'f1', 'values', 'relationships', 'politics', 'random'
  ) then
    raise exception 'Unsupported topic choice' using errcode = '22023';
  end if;
  if p_question_count is null or p_question_count not in (5, 10, 15) then
    raise exception 'Question count must be 5, 10, or 15' using errcode = '22023';
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
      'question_count', v_room.question_count,
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
      topic_key, question_count, status, created_by, invite_code, expires_at
    ) values (
      v_topic_key, p_question_count, 'waiting', v_user_id, v_invite_code,
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
    'question_count', p_question_count,
    'invite_code', v_invite_code,
    'expires_at', v_expires_at
  );
end;
$function$;

create or replace function private.record_player_match_history()
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
    where qb.topic_key = new.topic_key
      and qb.question_no <= new.question_count;

    if v_question_count <> new.question_count then
      raise exception 'A completed game must contain the selected number of answered questions' using errcode = '23514';
    end if;

    insert into public.player_match_history (
      room_id, user_id, opponent_user_id, opponent_nickname, topic_key,
      completed_at, question_count, common_answer_count, common_choices
    ) values (
      new.id, v_player.user_id, v_player.opponent_user_id,
      v_player.opponent_nickname, new.topic_key,
      coalesce(new.closed_at, clock_timestamp()), new.question_count,
      v_common_answer_count, v_common_choices
    )
    on conflict (user_id, room_id) do nothing;
  end loop;

  return new;
end;
$function$;

create or replace function private.inherit_rematch_question_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'matched' and old.status is distinct from 'matched' and new.new_room_id is not null then
    update public.game_rooms next_room
    set question_count = source_room.question_count
    from public.game_rooms source_room
    where source_room.id = new.source_room_id
      and next_room.id = new.new_room_id;
  end if;
  return new;
end;
$function$;

create trigger game_rematch_requests_inherit_question_count
  after update of status on public.game_rematch_requests
  for each row
  when (new.status = 'matched' and old.status is distinct from 'matched')
  execute function private.inherit_rematch_question_count();

revoke all on function private.inherit_rematch_question_count() from public, anon, authenticated;

create or replace function public.get_invite_room_status(p_room_id uuid)
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
    'question_count', v_room.question_count,
    'invite_code', v_room.invite_code,
    'expires_at', v_room.expires_at
  );
end;
$function$;

create or replace function public.get_my_active_room()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_nickname text;
  v_opponent_nickname text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform private.expire_inactive_rooms();
  select r.* into v_room
  from public.game_rooms r
  join public.room_members rm on rm.room_id = r.id
  where rm.user_id = v_user_id
    and r.status in ('waiting', 'playing')
  order by r.created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  select rm.nickname into v_nickname
  from public.room_members rm
  where rm.room_id = v_room.id and rm.user_id = v_user_id;
  select rm.nickname into v_opponent_nickname
  from public.room_members rm
  where rm.room_id = v_room.id and rm.user_id <> v_user_id
  limit 1;

  return jsonb_build_object(
    'room_id', v_room.id,
    'status', v_room.status,
    'topic_key', v_room.topic_key,
    'question_count', v_room.question_count,
    'invite_code', case
      when v_room.status = 'waiting' and v_room.created_by = v_user_id
      then v_room.invite_code else null end,
    'expires_at', v_room.expires_at,
    'created_by', v_room.created_by = v_user_id,
    'nickname', v_nickname,
    'opponent_nickname', v_opponent_nickname
  );
end;
$function$;

create or replace function public.get_my_matchmaking_ticket()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.matchmaking_queue%rowtype;
  v_room public.game_rooms%rowtype;
  v_opponent_nickname text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform private.expire_inactive_rooms();
  select q.* into v_ticket
  from public.matchmaking_queue q
  where q.user_id = v_user_id
    and q.delete_after > clock_timestamp()
    and (
      q.status = 'waiting'
      or (
        q.status = 'matched'
        and exists (
          select 1
          from public.game_rooms r
          join public.room_members rm on rm.room_id = r.id
          where r.id = q.room_id and r.status = 'playing' and rm.user_id = v_user_id
        )
      )
    )
  order by q.created_at desc
  limit 1
  for update of q;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  if v_ticket.status = 'waiting' and v_ticket.expires_at <= clock_timestamp() then
    update public.matchmaking_queue q
    set status = 'timed_out', delete_after = v_ticket.expires_at + interval '24 hours'
    where q.id = v_ticket.id
    returning q.* into v_ticket;
    return jsonb_build_object(
      'status', v_ticket.status,
      'ticket_id', v_ticket.id,
      'question_count', v_ticket.question_count
    );
  end if;

  if v_ticket.status = 'matched' then
    select r.* into v_room
    from public.game_rooms r
    join public.room_members mine on mine.room_id = r.id
    where r.id = v_ticket.room_id and r.status = 'playing' and mine.user_id = v_user_id;
    if not found then
      return jsonb_build_object('status', 'none');
    end if;
    select rm.nickname into v_opponent_nickname
    from public.room_members rm
    where rm.room_id = v_room.id and rm.user_id <> v_user_id
    limit 1;
    return jsonb_build_object(
      'status', 'matched',
      'ticket_id', v_ticket.id,
      'room_id', v_room.id,
      'topic_key', v_room.topic_key,
      'question_count', v_room.question_count,
      'opponent_nickname', v_opponent_nickname,
      'expires_at', v_room.expires_at
    );
  end if;

  return jsonb_build_object(
    'status', v_ticket.status,
    'ticket_id', v_ticket.id,
    'topic_choice', v_ticket.topic_choice,
    'question_count', v_ticket.question_count,
    'nickname', v_ticket.nickname,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

revoke all on function public.get_invite_room_status(uuid) from public, anon, authenticated;
grant execute on function public.get_invite_room_status(uuid) to authenticated;
revoke all on function public.get_my_active_room() from public, anon, authenticated;
grant execute on function public.get_my_active_room() to authenticated;
revoke all on function public.get_my_matchmaking_ticket() from public, anon, authenticated;
grant execute on function public.get_my_matchmaking_ticket() to authenticated;

-- Existing clients calling the two-argument RPC keep the five-question default.
create or replace function public.create_invite_room(
  p_topic_choice text,
  p_nickname text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select public.create_invite_room(p_topic_choice, p_nickname, 5::smallint);
$function$;

revoke all on function public.create_invite_room(text, text, smallint) from public, anon, authenticated;
grant execute on function public.create_invite_room(text, text, smallint) to authenticated;
revoke all on function public.create_invite_room(text, text) from public, anon, authenticated;
grant execute on function public.create_invite_room(text, text) to authenticated;

create or replace function public.queue_for_match(
  p_topic_choice text,
  p_nickname text,
  p_question_count smallint
)
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
  if p_topic_choice is null or p_topic_choice not in (
    'travel', 'music', 'daily', 'food', 'entertainment',
    'hobbies', 'sports', 'pets', 'reading', 'culture',
    'kpop', 'f1', 'values', 'relationships', 'politics', 'random'
  ) then
    raise exception 'Unsupported topic choice' using errcode = '22023';
  end if;
  if p_question_count is null or p_question_count not in (5, 10, 15) then
    raise exception 'Question count must be 5, 10, or 15' using errcode = '22023';
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
      'question_count', v_ticket.question_count,
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
      'question_count', v_active_room.question_count,
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
      'question_count', v_ticket.question_count,
      'expires_at', v_ticket.expires_at
    );
  end if;

  select q.* into v_candidate
  from public.matchmaking_queue q
  where q.status = 'waiting'
    and q.user_id <> v_user_id
    and q.expires_at > clock_timestamp()
    and q.question_count = p_question_count
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

    insert into public.game_rooms (topic_key, question_count)
    values (v_topic_key, p_question_count)
    returning id into v_room_id;

    update public.matchmaking_queue
    set status = 'matched',
        room_id = v_room_id,
        delete_after = clock_timestamp() + interval '24 hours'
    where id = v_candidate.id;

    insert into public.matchmaking_queue (
      user_id, topic_choice, question_count, nickname, status, room_id, expires_at, delete_after
    ) values (
      v_user_id, p_topic_choice, p_question_count, v_nickname, 'matched', v_room_id,
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
      'question_count', p_question_count,
      'opponent_nickname', v_candidate.nickname
    );
  end if;

  insert into public.matchmaking_queue (user_id, topic_choice, question_count, nickname)
  values (v_user_id, p_topic_choice, p_question_count, v_nickname)
  returning * into v_ticket;

  return jsonb_build_object(
    'status', 'waiting',
    'ticket_id', v_ticket.id,
    'question_count', p_question_count,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

create or replace function public.queue_for_match(
  p_topic_choice text,
  p_nickname text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select public.queue_for_match(p_topic_choice, p_nickname, 5::smallint);
$function$;

revoke all on function public.queue_for_match(text, text, smallint) from public, anon, authenticated;
grant execute on function public.queue_for_match(text, text, smallint) to authenticated;
revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
grant execute on function public.queue_for_match(text, text) to authenticated;

create or replace function public.get_match_status(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.matchmaking_queue%rowtype;
  v_topic_key text;
  v_opponent_nickname text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select q.* into v_ticket
  from public.matchmaking_queue q
  where q.id = p_ticket_id
    and q.user_id = v_user_id
  for update;
  if not found then
    raise exception 'Match ticket not found' using errcode = '42501';
  end if;

  if v_ticket.status = 'waiting' and v_ticket.expires_at <= clock_timestamp() then
    update public.matchmaking_queue q
    set status = 'timed_out',
        delete_after = v_ticket.expires_at + interval '24 hours'
    where q.id = v_ticket.id
    returning q.* into v_ticket;
  end if;

  if v_ticket.status = 'matched' and v_ticket.room_id is not null then
    select r.topic_key into v_topic_key
    from public.game_rooms r
    where r.id = v_ticket.room_id;
    select rm.nickname into v_opponent_nickname
    from public.room_members rm
    where rm.room_id = v_ticket.room_id
      and rm.user_id <> v_user_id
    limit 1;
  end if;

  return jsonb_build_object(
    'status', v_ticket.status,
    'ticket_id', v_ticket.id,
    'room_id', v_ticket.room_id,
    'topic_key', v_topic_key,
    'question_count', v_ticket.question_count,
    'opponent_nickname', v_opponent_nickname,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

revoke all on function public.get_match_status(uuid) from public, anon, authenticated;
grant execute on function public.get_match_status(uuid) to authenticated;

create or replace function public.get_room_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_question public.question_bank%rowtype;
  v_nickname text;
  v_opponent_nickname text;
  v_own_choice smallint;
  v_opponent_choice smallint;
  v_own_ready smallint;
  v_opponent_answered boolean;
  v_answer_count smallint;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id;
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  if v_room.status = 'playing' and v_room.expires_at <= clock_timestamp() then
    update public.game_rooms r
    set status = 'expired',
        closed_at = clock_timestamp(),
        delete_after = v_room.expires_at + interval '24 hours',
        updated_at = clock_timestamp()
    where r.id = v_room.id
    returning r.* into v_room;
    update public.matchmaking_queue q
    set delete_after = v_room.delete_after
    where q.room_id = v_room.id;
  end if;

  select qb.* into v_question
  from public.question_bank qb
  where qb.topic_key = v_room.topic_key
    and qb.question_no = v_room.current_question;
  select rm.nickname, rm.ready_for_question
    into v_nickname, v_own_ready
  from public.room_members rm
  where rm.room_id = v_room.id
    and rm.user_id = v_user_id;
  select rm.nickname into v_opponent_nickname
  from public.room_members rm
  where rm.room_id = v_room.id
    and rm.user_id <> v_user_id
  limit 1;
  select a.choice into v_own_choice
  from public.game_answers a
  where a.room_id = v_room.id
    and a.user_id = v_user_id
    and a.question_no = v_room.current_question;
  select exists (
    select 1 from public.game_answers a
    where a.room_id = v_room.id
      and a.user_id <> v_user_id
      and a.question_no = v_room.current_question
  ) into v_opponent_answered;
  select count(*)::smallint into v_answer_count
  from public.game_answers a
  where a.room_id = v_room.id
    and a.question_no = v_room.current_question;

  if v_answer_count = 2 then
    select a.choice into v_opponent_choice
    from public.game_answers a
    where a.room_id = v_room.id
      and a.user_id <> v_user_id
      and a.question_no = v_room.current_question;
  end if;

  return jsonb_build_object(
    'room_id', v_room.id,
    'status', v_room.status,
    'topic_key', v_room.topic_key,
    'question_count', v_room.question_count,
    'current_question', v_room.current_question,
    'answer_count', v_answer_count,
    'ready_count', v_room.ready_count,
    'your_ready', v_own_ready = v_room.current_question,
    'you', jsonb_build_object('nickname', v_nickname, 'answered', v_own_choice is not null),
    'partner', jsonb_build_object('nickname', v_opponent_nickname, 'answered', v_opponent_answered),
    'question', jsonb_build_object(
      'prompt', v_question.prompt,
      'choice_a', v_question.choice_a,
      'choice_b', v_question.choice_b
    ),
    'reveal', v_answer_count = 2,
    'your_choice', case when v_answer_count = 2 then v_own_choice else null end,
    'partner_choice', case when v_answer_count = 2 then v_opponent_choice else null end
  );
end;
$function$;

create or replace function public.continue_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_answer_count smallint;
  v_ready_count smallint;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id
  for update;
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if v_room.status <> 'playing' then
    return jsonb_build_object('status', v_room.status);
  end if;
  if v_room.expires_at <= clock_timestamp() then
    update public.game_rooms r
    set status = 'expired',
        closed_at = clock_timestamp(),
        delete_after = v_room.expires_at + interval '24 hours',
        updated_at = clock_timestamp()
    where r.id = v_room.id
    returning r.* into v_room;
    update public.matchmaking_queue q
    set delete_after = v_room.delete_after
    where q.room_id = v_room.id;
    return jsonb_build_object('status', 'expired');
  end if;

  select count(*)::smallint into v_answer_count
  from public.game_answers a
  where a.room_id = v_room.id
    and a.question_no = v_room.current_question;
  if v_answer_count <> 2 then
    return jsonb_build_object('status', 'waiting_for_answers');
  end if;

  update public.room_members rm
  set ready_for_question = v_room.current_question
  where rm.room_id = v_room.id
    and rm.user_id = v_user_id;
  select count(*)::smallint into v_ready_count
  from public.room_members rm
  where rm.room_id = v_room.id
    and rm.ready_for_question = v_room.current_question;

  if v_ready_count < 2 then
    update public.game_rooms r
    set ready_count = v_ready_count,
        last_activity_at = clock_timestamp(),
        expires_at = clock_timestamp() + interval '10 minutes',
        updated_at = clock_timestamp()
    where r.id = v_room.id;
    return jsonb_build_object(
      'status', 'waiting_for_partner',
      'question_no', v_room.current_question,
      'ready_count', v_ready_count
    );
  end if;

  if v_room.current_question = v_room.question_count then
    update public.game_rooms r
    set status = 'completed',
        ready_count = 2,
        closed_at = clock_timestamp(),
        delete_after = clock_timestamp() + interval '24 hours',
        last_activity_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where r.id = v_room.id;
    update public.matchmaking_queue q
    set delete_after = clock_timestamp() + interval '24 hours'
    where q.room_id = v_room.id;
    return jsonb_build_object('status', 'completed');
  end if;

  update public.room_members rm
  set ready_for_question = 0
  where rm.room_id = v_room.id;
  update public.game_rooms r
  set current_question = v_room.current_question + 1,
      answer_count = 0,
      ready_count = 0,
      last_activity_at = clock_timestamp(),
      expires_at = clock_timestamp() + interval '10 minutes',
      updated_at = clock_timestamp()
  where r.id = v_room.id;
  return jsonb_build_object(
    'status', 'advanced',
    'question_no', v_room.current_question + 1
  );
end;
$function$;

create or replace function public.get_room_results(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_topic_key text;
  v_status text;
  v_question_count smallint;
  v_match_count integer;
  v_common_choices jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select r.topic_key, r.status, r.question_count
    into v_topic_key, v_status, v_question_count
  from public.game_rooms r
  where r.id = p_room_id
    and private.is_room_member(r.id);
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if v_status <> 'completed' then
    raise exception 'Game results are available after both players finish' using errcode = '55000';
  end if;

  select
    (count(*) filter (where own_answer.choice = partner_answer.choice))::integer,
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
  into v_match_count, v_common_choices
  from public.question_bank qb
  join public.game_answers own_answer
    on own_answer.room_id = p_room_id
    and own_answer.user_id = v_user_id
    and own_answer.question_no = qb.question_no
  join public.game_answers partner_answer
    on partner_answer.room_id = p_room_id
    and partner_answer.user_id <> v_user_id
    and partner_answer.question_no = qb.question_no
  where qb.topic_key = v_topic_key
    and qb.question_no <= v_question_count;

  return jsonb_build_object(
    'room_id', p_room_id,
    'topic_key', v_topic_key,
    'question_count', v_question_count,
    'match_count', coalesce(v_match_count, 0),
    'common_choices', coalesce(v_common_choices, '[]'::jsonb)
  );
end;
$function$;
