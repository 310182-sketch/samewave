-- Let an authenticated player recover their own non-expired room after reload.
create function public.get_my_active_room()
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
  where rm.room_id = v_room.id
    and rm.user_id = v_user_id;

  select rm.nickname into v_opponent_nickname
  from public.room_members rm
  where rm.room_id = v_room.id
    and rm.user_id <> v_user_id
  limit 1;

  return jsonb_build_object(
    'room_id', v_room.id,
    'status', v_room.status,
    'topic_key', v_room.topic_key,
    'invite_code', case
      when v_room.status = 'waiting' and v_room.created_by = v_user_id
      then v_room.invite_code
      else null
    end,
    'expires_at', v_room.expires_at,
    'created_by', v_room.created_by = v_user_id,
    'nickname', v_nickname,
    'opponent_nickname', v_opponent_nickname
  );
end;
$function$;

revoke all on function public.get_my_active_room() from public, anon, authenticated;
grant execute on function public.get_my_active_room() to authenticated;
