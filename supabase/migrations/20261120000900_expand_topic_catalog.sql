-- Expand the shared topic catalog without changing the five-question game flow.

alter table public.question_bank
  drop constraint if exists question_bank_topic_key_check,
  add constraint question_bank_topic_key_check
    check (topic_key in (
      'travel', 'music', 'daily', 'food', 'entertainment',
      'hobbies', 'sports', 'pets', 'reading', 'culture'
    ));

alter table public.game_rooms
  drop constraint if exists game_rooms_topic_key_check,
  add constraint game_rooms_topic_key_check
    check (topic_key in (
      'travel', 'music', 'daily', 'food', 'entertainment',
      'hobbies', 'sports', 'pets', 'reading', 'culture'
    ));

alter table public.matchmaking_queue
  drop constraint if exists matchmaking_queue_topic_choice_check,
  add constraint matchmaking_queue_topic_choice_check
    check (topic_choice in (
      'travel', 'music', 'daily', 'food', 'entertainment',
      'hobbies', 'sports', 'pets', 'reading', 'culture', 'random'
    ));

insert into public.question_bank (topic_key, question_no, prompt, choice_a, choice_b)
values
  ('entertainment', 1, '看影視作品時，你最容易被什麼吸引？', '精彩的故事', '鮮明的畫面與氛圍'),
  ('entertainment', 2, '追劇時你比較喜歡？', '一次看好幾集', '留著慢慢享受'),
  ('entertainment', 3, '挑一部新作品時，你會先看？', '朋友推薦', '預告或片段'),
  ('entertainment', 4, '休閒時打開影音平台，你通常想看？', '輕鬆好笑的內容', '引人好奇的故事'),
  ('entertainment', 5, '看完喜歡的作品後，你比較會？', '找人分享心得', '回味最喜歡的片段'),
  ('hobbies', 1, '開始一項新興趣時，你會先？', '跟著入門教學試試看', '直接動手邊做邊學'),
  ('hobbies', 2, '週末有一段空閒，你比較想？', '做點手作或創作', '出門走走找靈感'),
  ('hobbies', 3, '做興趣活動時，你偏好？', '自己專心完成', '找朋友一起玩'),
  ('hobbies', 4, '遇到喜歡的新嗜好，你會？', '先試最基本的玩法', '很快想挑戰進階內容'),
  ('hobbies', 5, '你比較享受興趣中的哪一部分？', '完成一個作品或目標', '過程裡的新發現'),
  ('sports', 1, '活動身體時，你通常偏好？', '戶外走動與跑跳', '室內運動或伸展'),
  ('sports', 2, '做運動時你比較喜歡？', '和大家組隊', '照自己的步調進行'),
  ('sports', 3, '看一場比賽時，你最期待？', '緊張的攻防變化', '選手展現技巧'),
  ('sports', 4, '安排運動時間，你會選？', '早一點開始一天', '忙完後放鬆活動'),
  ('sports', 5, '運動時哪種感覺更吸引你？', '突破自己的紀錄', '享受流汗後的輕鬆'),
  ('pets', 1, '和熟悉的動物相處時，你更喜歡？', '一起散步活動', '安靜陪伴一會兒'),
  ('pets', 2, '如果照顧寵物，你比較期待？', '一起玩耍互動', '觀察牠慢慢熟悉你'),
  ('pets', 3, '看到可愛的動物內容，你會先看？', '活潑逗趣的日常', '溫馨療癒的陪伴'),
  ('pets', 4, '你覺得理想的寵物個性是？', '親人又愛互動', '自在而有自己的步調'),
  ('pets', 5, '在公園遇見不認識的狗，你會？', '先詢問飼主能否打招呼', '保持距離欣賞牠'),
  ('reading', 1, '挑一本書時，你比較會選？', '想像豐富的故事', '新的知識或真實經驗'),
  ('reading', 2, '想學會一件新事物，你通常先？', '找文章或書來讀', '看示範後親自練習'),
  ('reading', 3, '讀到有用的內容，你會？', '記下重點方便回看', '先繼續讀完再整理'),
  ('reading', 4, '你比較喜歡哪種閱讀節奏？', '每天讀一小段', '有空時一次讀久一點'),
  ('reading', 5, '遇到感興趣的主題，你想？', '先廣泛看看不同面向', '挑一個方向深入研究'),
  ('culture', 1, '逛展覽時，你比較喜歡？', '聽導覽了解背景', '照自己的步調欣賞'),
  ('culture', 2, '看現場表演時，你更享受？', '音樂與節奏的感染力', '演出和故事的張力'),
  ('culture', 3, '走進一座陌生城市，你會留意？', '老建築與在地歷史', '當代設計與新空間'),
  ('culture', 4, '接觸不同文化時，你比較想？', '體驗節慶和日常習俗', '欣賞藝術和表演'),
  ('culture', 5, '在文化活動中，你更喜歡？', '和人交流分享看法', '安靜感受作品')
on conflict (topic_key, question_no) do nothing;

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
  if p_topic_choice is null or p_topic_choice not in (
    'travel', 'music', 'daily', 'food', 'entertainment',
    'hobbies', 'sports', 'pets', 'reading', 'culture', 'random'
  ) then
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

revoke all on function public.create_invite_room(text, text) from public, anon, authenticated;
grant execute on function public.create_invite_room(text, text) to authenticated;
revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
grant execute on function public.queue_for_match(text, text) to authenticated;
