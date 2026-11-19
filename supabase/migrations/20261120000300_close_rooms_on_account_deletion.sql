-- Close live rooms before Auth user deletion cascades room membership.
-- Apply after 20261120000200_safety_and_abuse_controls.sql.

create function private.close_rooms_for_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_closed_at timestamptz := clock_timestamp();
begin
  update public.game_rooms r
  set status = 'abandoned',
      closed_at = v_closed_at,
      delete_after = v_closed_at + interval '24 hours',
      invite_code = null,
      last_activity_at = v_closed_at,
      updated_at = v_closed_at
  where r.status in ('waiting', 'playing')
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = r.id
        and rm.user_id = old.id
    );

  update public.matchmaking_queue q
  set status = 'cancelled',
      delete_after = v_closed_at + interval '24 hours'
  where q.user_id = old.id
    and q.status = 'waiting';

  update public.matchmaking_queue q
  set delete_after = r.delete_after
  from public.game_rooms r
  join public.room_members rm on rm.room_id = r.id
  where rm.user_id = old.id
    and q.room_id = r.id
    and r.status = 'abandoned';

  return old;
end;
$function$;

revoke all on function private.close_rooms_for_deleted_user() from public, anon, authenticated;

create trigger auth_users_close_rooms_before_delete
  before delete on auth.users
  for each row execute function private.close_rooms_for_deleted_user();
