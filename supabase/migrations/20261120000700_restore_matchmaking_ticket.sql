-- Recover the caller's active queue ticket after a page reload.
create index matchmaking_queue_by_user_active_recent
  on public.matchmaking_queue (user_id, created_at desc)
  where status in ('waiting', 'matched');

create function public.get_my_matchmaking_ticket()
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
          where r.id = q.room_id
            and r.status = 'playing'
            and rm.user_id = v_user_id
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
    set status = 'timed_out',
        delete_after = v_ticket.expires_at + interval '24 hours'
    where q.id = v_ticket.id
    returning q.* into v_ticket;
    return jsonb_build_object(
      'status', v_ticket.status,
      'ticket_id', v_ticket.id
    );
  end if;

  if v_ticket.status = 'matched' then
    select r.* into v_room
    from public.game_rooms r
    join public.room_members mine on mine.room_id = r.id
    where r.id = v_ticket.room_id
      and r.status = 'playing'
      and mine.user_id = v_user_id;
    if not found then
      return jsonb_build_object('status', 'none');
    end if;

    select rm.nickname into v_opponent_nickname
    from public.room_members rm
    where rm.room_id = v_room.id
      and rm.user_id <> v_user_id
    limit 1;

    return jsonb_build_object(
      'status', 'matched',
      'ticket_id', v_ticket.id,
      'room_id', v_room.id,
      'topic_key', v_room.topic_key,
      'opponent_nickname', v_opponent_nickname,
      'expires_at', v_room.expires_at
    );
  end if;

  return jsonb_build_object(
    'status', v_ticket.status,
    'ticket_id', v_ticket.id,
    'topic_choice', v_ticket.topic_choice,
    'nickname', v_ticket.nickname,
    'expires_at', v_ticket.expires_at
  );
end;
$function$;

revoke all on function public.get_my_matchmaking_ticket() from public, anon, authenticated;
grant execute on function public.get_my_matchmaking_ticket() to authenticated;
