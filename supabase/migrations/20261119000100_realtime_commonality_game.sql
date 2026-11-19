-- Initial server-side model for the two-player commonality game.
-- Apply this migration only to a Supabase project with Anonymous Auth enabled.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.question_bank (
  id bigint generated always as identity primary key,
  topic_key text not null check (topic_key in ('travel', 'music', 'daily', 'food')),
  question_no smallint not null check (question_no between 1 and 5),
  prompt text not null check (char_length(btrim(prompt)) > 0),
  choice_a text not null check (char_length(btrim(choice_a)) > 0),
  choice_b text not null check (char_length(btrim(choice_b)) > 0),
  unique (topic_key, question_no)
);

insert into public.question_bank (topic_key, question_no, prompt, choice_a, choice_b)
values
  ('travel', 1, '旅行時，你更喜歡哪一種安排？', '先規劃好行程', '留點空白隨興走'),
  ('travel', 2, '到了陌生城市，你最想先做什麼？', '找在地小吃', '四處散步看看'),
  ('travel', 3, '你比較想把旅行記憶留在哪裡？', '拍很多照片', '好好感受當下'),
  ('travel', 4, '旅途中多出半天空檔，你會？', '探索沒去過的地方', '找間咖啡店休息'),
  ('travel', 5, '你偏好的旅行夥伴是？', '一起安排、互相提醒', '走到哪裡算哪裡'),
  ('music', 1, '聽一首新歌時，你通常先注意？', '歌詞寫了什麼', '旋律聽起來如何'),
  ('music', 2, '你最常在什麼時候聽音樂？', '通勤或移動時', '專心休息的時候'),
  ('music', 3, '遇到喜歡的歌，你比較會？', '立刻分享給朋友', '先收藏起來自己聽'),
  ('music', 4, '如果去聽現場演出，你會？', '跟著唱、享受熱鬧', '安靜感受每一首歌'),
  ('music', 5, '你的歌單通常比較像？', '熟悉的歌反覆播放', '常常加入新發現'),
  ('daily', 1, '放假早上，你比較想？', '早點起床開始一天', '睡到自然醒再說'),
  ('daily', 2, '做事時，你偏好哪一種節奏？', '先排好順序再開始', '想到什麼就先做什麼'),
  ('daily', 3, '一天結束後，哪種方式最能放鬆？', '自己安靜待一會兒', '找人聊聊今天的事'),
  ('daily', 4, '你比較常用哪種方式記住事情？', '寫在行事曆或清單上', '相信自己會記得'),
  ('daily', 5, '突然有一小時空檔，你會？', '完成一件待辦事項', '讓自己放空一下'),
  ('food', 1, '點餐時，你通常會選？', '最熟悉、吃不膩的', '試試沒吃過的新口味'),
  ('food', 2, '你喜歡哪一種早餐？', '慢慢吃一頓完整早餐', '簡單方便就可以'),
  ('food', 3, '和朋友聚餐時，你比較在意？', '大家能一起分享食物', '每個人都吃到喜歡的'),
  ('food', 4, '甜點擺在面前，你會？', '先拍照再開始吃', '趁熱趁新鮮馬上吃'),
  ('food', 5, '喝飲料時，你偏好？', '固定點最愛的那款', '偶爾換個新口味')
on conflict (topic_key, question_no) do nothing;

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  topic_key text not null check (topic_key in ('travel', 'music', 'daily', 'food')),
  status text not null default 'playing'
    check (status in ('playing', 'completed', 'abandoned', 'expired')),
  current_question smallint not null default 1 check (current_question between 1 and 5),
  answer_count smallint not null default 0 check (answer_count between 0 and 2),
  ready_count smallint not null default 0 check (ready_count between 0 and 2),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  last_activity_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '10 minutes'),
  closed_at timestamptz,
  delete_after timestamptz
);

create table public.room_members (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  ready_for_question smallint not null default 0 check (ready_for_question between 0 and 5),
  joined_at timestamptz not null default clock_timestamp(),
  primary key (room_id, user_id)
);

create table public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_choice text not null check (topic_choice in ('travel', 'music', 'daily', 'food', 'random')),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  status text not null default 'waiting'
    check (status in ('waiting', 'matched', 'cancelled', 'timed_out')),
  room_id uuid references public.game_rooms(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '30 seconds'),
  delete_after timestamptz not null default (clock_timestamp() + interval '24 hours')
);

create unique index matchmaking_queue_one_waiting_per_user
  on public.matchmaking_queue (user_id)
  where status = 'waiting';
create index matchmaking_queue_waiting_order
  on public.matchmaking_queue (created_at)
  where status = 'waiting';
create index room_members_by_user
  on public.room_members (user_id, room_id);

create table public.game_answers (
  room_id uuid not null,
  user_id uuid not null,
  question_no smallint not null check (question_no between 1 and 5),
  choice smallint not null check (choice in (0, 1)),
  submitted_at timestamptz not null default clock_timestamp(),
  primary key (room_id, user_id, question_no),
  foreign key (room_id, user_id)
    references public.room_members (room_id, user_id)
    on delete cascade
);
create index game_answers_by_room_question
  on public.game_answers (room_id, question_no);

comment on table public.question_bank is 'Public, non-sensitive two-choice game questions.';
comment on table public.matchmaking_queue is 'Private queue tickets; all access is through authenticated RPC functions.';
comment on table public.game_rooms is 'Realtime-safe room state; never stores answer values.';
comment on table public.room_members is 'Private room membership and ephemeral display names.';
comment on table public.game_answers is 'Private submitted answers; only exposed through gated RPC functions.';

alter table public.question_bank enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.game_answers enable row level security;

revoke all on table public.question_bank, public.game_rooms, public.room_members,
  public.matchmaking_queue, public.game_answers from anon, authenticated;
grant select on table public.question_bank, public.game_rooms to authenticated;

create policy question_bank_read_authenticated
  on public.question_bank for select to authenticated
  using (true);

create function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = auth.uid()
  );
$function$;

revoke all on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;

create policy game_rooms_read_by_members
  on public.game_rooms for select to authenticated
  using (private.is_room_member(id));

do $publication$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_rooms'
  ) then
    execute 'alter publication supabase_realtime add table public.game_rooms';
  end if;
end;
$publication$;

create function public.queue_for_match(p_topic_choice text, p_nickname text default null)
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

  -- Serialize queue decisions so two simultaneous callers cannot claim the same ticket.
  perform pg_catalog.pg_advisory_xact_lock(82420711);
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
      user_id, topic_choice, nickname, status, room_id, expires_at,
      delete_after
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

create function public.get_match_status(p_ticket_id uuid)
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
    'opponent_nickname', v_opponent_nickname,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

create function public.cancel_matchmaking(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.matchmaking_queue%rowtype;
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

  if v_ticket.status = 'waiting' and v_ticket.expires_at > clock_timestamp() then
    update public.matchmaking_queue q
    set status = 'cancelled',
        delete_after = clock_timestamp() + interval '24 hours'
    where q.id = v_ticket.id
    returning q.* into v_ticket;
  elsif v_ticket.status = 'waiting' then
    update public.matchmaking_queue q
    set status = 'timed_out',
        delete_after = v_ticket.expires_at + interval '24 hours'
    where q.id = v_ticket.id
    returning q.* into v_ticket;
  end if;

  return jsonb_build_object('status', v_ticket.status, 'ticket_id', v_ticket.id);
end;
$function$;

create function public.get_room_state(p_room_id uuid)
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

create function public.submit_answer(p_room_id uuid, p_choice smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_existing_choice smallint;
  v_own_choice smallint;
  v_opponent_choice smallint;
  v_answer_count smallint;
begin
  if v_user_id is null or not private.is_room_member(p_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if p_choice is null or p_choice not in (0, 1) then
    raise exception 'Choice must be 0 or 1' using errcode = '22023';
  end if;

  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id
  for update;
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if v_room.status <> 'playing' then
    return jsonb_build_object('status', v_room.status, 'reveal', false);
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
    return jsonb_build_object('status', 'expired', 'reveal', false);
  end if;

  select a.choice into v_existing_choice
  from public.game_answers a
  where a.room_id = v_room.id
    and a.user_id = v_user_id
    and a.question_no = v_room.current_question;
  if found then
    if v_existing_choice <> p_choice then
      raise exception 'An answer for this question is already final' using errcode = '23514';
    end if;
  else
    insert into public.game_answers (room_id, user_id, question_no, choice)
    values (v_room.id, v_user_id, v_room.current_question, p_choice);
  end if;

  select count(*)::smallint into v_answer_count
  from public.game_answers a
  where a.room_id = v_room.id
    and a.question_no = v_room.current_question;
  update public.game_rooms r
  set answer_count = v_answer_count,
      last_activity_at = clock_timestamp(),
      expires_at = clock_timestamp() + interval '10 minutes',
      updated_at = clock_timestamp()
  where r.id = v_room.id;

  if v_answer_count = 2 then
    select a.choice into v_own_choice
    from public.game_answers a
    where a.room_id = v_room.id
      and a.user_id = v_user_id
      and a.question_no = v_room.current_question;
    select a.choice into v_opponent_choice
    from public.game_answers a
    where a.room_id = v_room.id
      and a.user_id <> v_user_id
      and a.question_no = v_room.current_question;
  end if;

  return jsonb_build_object(
    'status', 'playing',
    'question_no', v_room.current_question,
    'answer_count', v_answer_count,
    'reveal', v_answer_count = 2,
    'your_choice', case when v_answer_count = 2 then v_own_choice else null end,
    'partner_choice', case when v_answer_count = 2 then v_opponent_choice else null end
  );
end;
$function$;

create function public.continue_room(p_room_id uuid)
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

  if v_room.current_question = 5 then
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

create function public.leave_room(p_room_id uuid)
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
  select r.* into v_room
  from public.game_rooms r
  where r.id = p_room_id
  for update;
  if not found then
    raise exception 'Room not found' using errcode = '42501';
  end if;
  if v_room.status = 'playing' then
    update public.game_rooms r
    set status = 'abandoned',
        closed_at = clock_timestamp(),
        delete_after = clock_timestamp() + interval '24 hours',
        updated_at = clock_timestamp()
    where r.id = v_room.id
    returning r.* into v_room;
    update public.matchmaking_queue q
    set delete_after = v_room.delete_after
    where q.room_id = v_room.id;
  end if;
  return jsonb_build_object('status', v_room.status, 'room_id', v_room.id);
end;
$function$;

create function public.get_room_results(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_topic_key text;
  v_status text;
  v_match_count integer;
  v_common_choices jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select r.topic_key, r.status into v_topic_key, v_status
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
  where qb.topic_key = v_topic_key;

  return jsonb_build_object(
    'room_id', p_room_id,
    'topic_key', v_topic_key,
    'match_count', coalesce(v_match_count, 0),
    'common_choices', coalesce(v_common_choices, '[]'::jsonb)
  );
end;
$function$;

create function private.purge_expired_game_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rooms_expired integer;
  v_queue_deleted integer;
  v_rooms_deleted integer;
begin
  update public.game_rooms r
  set status = 'expired',
      closed_at = r.expires_at,
      delete_after = r.expires_at + interval '24 hours',
      updated_at = clock_timestamp()
  where r.status = 'playing'
    and r.expires_at <= clock_timestamp();
  get diagnostics v_rooms_expired = row_count;

  update public.matchmaking_queue q
  set delete_after = r.delete_after
  from public.game_rooms r
  where q.room_id = r.id
    and r.status in ('completed', 'abandoned', 'expired')
    and q.delete_after is distinct from r.delete_after;

  delete from public.matchmaking_queue q
  where q.delete_after <= clock_timestamp();
  get diagnostics v_queue_deleted = row_count;

  delete from public.game_rooms r
  where r.delete_after is not null
    and r.delete_after <= clock_timestamp();
  get diagnostics v_rooms_deleted = row_count;

  return v_rooms_expired + v_queue_deleted + v_rooms_deleted;
end;
$function$;

comment on function private.purge_expired_game_data() is
  'Expire idle rooms and purge closed game data after 24 hours; schedule this function before launch.';

revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
revoke all on function public.get_match_status(uuid) from public, anon, authenticated;
revoke all on function public.cancel_matchmaking(uuid) from public, anon, authenticated;
revoke all on function public.get_room_state(uuid) from public, anon, authenticated;
revoke all on function public.submit_answer(uuid, smallint) from public, anon, authenticated;
revoke all on function public.continue_room(uuid) from public, anon, authenticated;
revoke all on function public.leave_room(uuid) from public, anon, authenticated;
revoke all on function public.get_room_results(uuid) from public, anon, authenticated;
revoke all on function private.purge_expired_game_data() from public, anon, authenticated;

grant execute on function public.queue_for_match(text, text) to authenticated;
grant execute on function public.get_match_status(uuid) to authenticated;
grant execute on function public.cancel_matchmaking(uuid) to authenticated;
grant execute on function public.get_room_state(uuid) to authenticated;
grant execute on function public.submit_answer(uuid, smallint) to authenticated;
grant execute on function public.continue_room(uuid) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.get_room_results(uuid) to authenticated;
