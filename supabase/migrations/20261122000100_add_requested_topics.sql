-- Add K-pop, F1, values, relationships, and politics as five-question topics.
-- Existing deployed functions contain explicit allow lists, so replace both RPCs forward-only.

alter table public.question_bank
  drop constraint if exists question_bank_topic_key_check,
  add constraint question_bank_topic_key_check
    check (topic_key in (
      'travel',
      'music',
      'daily',
      'food',
      'entertainment',
      'hobbies',
      'sports',
      'pets',
      'reading',
      'culture',
      'kpop',
      'f1',
      'values',
      'relationships',
      'politics'
    ));

alter table public.game_rooms
  drop constraint if exists game_rooms_topic_key_check,
  add constraint game_rooms_topic_key_check
    check (topic_key in (
      'travel',
      'music',
      'daily',
      'food',
      'entertainment',
      'hobbies',
      'sports',
      'pets',
      'reading',
      'culture',
      'kpop',
      'f1',
      'values',
      'relationships',
      'politics'
    ));

alter table public.matchmaking_queue
  drop constraint if exists matchmaking_queue_topic_choice_check,
  add constraint matchmaking_queue_topic_choice_check
    check (topic_choice in (
      'travel',
      'music',
      'daily',
      'food',
      'entertainment',
      'hobbies',
      'sports',
      'pets',
      'reading',
      'culture',
      'kpop',
      'f1',
      'values',
      'relationships',
      'politics',
      'random'
    ));

insert into public.question_bank (topic_key, question_no, prompt, choice_a, choice_b)
values
  ('kpop', 1, '追一個 K-pop 團體時，你最期待？', '舞台表演', '成員互動'),
  ('kpop', 2, '新歌剛發佈，你通常先看？', '音樂錄影帶', '現場舞台'),
  ('kpop', 3, '聽到喜歡的歌，你比較會？', '先收藏起來', '分享給朋友'),
  ('kpop', 4, '看表演影片時，你容易注意？', '編舞和隊形', '整體氣氛和造型'),
  ('kpop', 5, '認識一個新團體時，你想先了解？', '音樂風格', '成員特色'),
  ('f1', 1, 'F1 賽事週末，你最期待？', '排位賽', '正賽'),
  ('f1', 2, '看比賽時，你更享受？', '車手在賽道上的攻防', '車隊的策略安排'),
  ('f1', 3, '你偏好的賽道是？', '街道賽道', '傳統永久賽道'),
  ('f1', 4, '追 F1 時，你通常會支持？', '特定車手', '特定車隊'),
  ('f1', 5, '賽後回看精華，你會先找？', '車手視角片段', '進站與策略解析'),
  ('values', 1, '面對重要選擇時，你通常先考慮？', '是否符合自己的原則', '會帶來什麼實際結果'),
  ('values', 2, '做承諾時，你比較重視？', '盡力準時完成', '有變化就及早溝通'),
  ('values', 3, '分配有限資源時，你傾向？', '先照顧眼前最需要的人', '為長期目標預留資源'),
  ('values', 4, '遇到和自己不同的觀點，你會先？', '理解對方在意什麼', '說明自己看重的理由'),
  ('values', 5, '你更欣賞哪種做事方式？', '保持一致、公平對待', '依情況彈性調整'),
  ('relationships', 1, '相處時，你比較重視？', '常常分享日常', '保留各自的空間'),
  ('relationships', 2, '意見不同時，你比較希望？', '先冷靜一下再談', '趁當下把感受說清楚'),
  ('relationships', 3, '表達在乎時，你更常用？', '說出鼓勵和感謝', '用行動幫忙或陪伴'),
  ('relationships', 4, '安排兩人時間，你喜歡？', '一起嘗試新活動', '做熟悉而放鬆的事'),
  ('relationships', 5, '關係中遇到難題，你會先？', '一起討論解法', '確認彼此感受和需求'),
  ('politics', 1, '討論公共議題時，你通常先？', '聽聽不同立場', '查找資料和背景'),
  ('politics', 2, '規劃公共資源時，你會先想到？', '眼前有需要的人', '長期公共建設'),
  ('politics', 3, '評估一項公共政策，你比較先看？', '可能影響哪些人', '實際成效如何衡量'),
  ('politics', 4, '參與社區公共事務，你比較傾向？', '出席討論交流', '整理意見後提出建議'),
  ('politics', 5, '公共方案需要調整時，你較支持？', '先小規模試行再檢視', '先規劃長期方向再推動')
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
    'hobbies', 'sports', 'pets', 'reading', 'culture',
    'kpop', 'f1', 'values', 'relationships', 'politics', 'random'
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
    'hobbies', 'sports', 'pets', 'reading', 'culture',
    'kpop', 'f1', 'values', 'relationships', 'politics', 'random'
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

revoke all on function public.create_invite_room(text, text) from public, anon, authenticated;
grant execute on function public.create_invite_room(text, text) to authenticated;
revoke all on function public.queue_for_match(text, text) from public, anon, authenticated;
grant execute on function public.queue_for_match(text, text) to authenticated;
