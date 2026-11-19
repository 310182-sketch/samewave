-- Remove both player account links when either player deletes their account.
-- Apply after 20261120000300_close_rooms_on_account_deletion.sql.

create function private.anonymize_deleted_safety_report_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.player_safety_reports r
  set reporter_user_id = null,
      reported_user_id = null
  where r.reporter_user_id = old.id
     or r.reported_user_id = old.id;

  return old;
end;
$function$;

revoke all on function private.anonymize_deleted_safety_report_links()
  from public, anon, authenticated;

create trigger auth_users_anonymize_safety_report_links_before_delete
  before delete on auth.users
  for each row execute function private.anonymize_deleted_safety_report_links();
