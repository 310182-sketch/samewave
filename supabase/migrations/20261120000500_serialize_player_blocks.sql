-- Serialize new block relationships with random matchmaking and invite joins.
-- Apply after 20261120000400_anonymize_safety_reports_on_account_deletion.sql.

create or replace function public.block_room_opponent(p_room_id uuid)
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
  if v_user_id is null then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  -- queue_for_match and join_invite_room use this transaction lock before
  -- checking the block list. Matching therefore sees a complete block write.
  perform pg_catalog.pg_advisory_xact_lock(82420711);

  if not private.is_room_member(p_room_id) then
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

revoke all on function public.block_room_opponent(uuid) from public, anon, authenticated;
grant execute on function public.block_room_opponent(uuid) to authenticated;
