-- Add an allowlisted moderation workflow with audited reviewer RPCs.
-- Apply after 20261120000700_restore_matchmaking_ticket.sql.

create table private.moderation_reviewers (
  reviewer_user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);

comment on table private.moderation_reviewers is
  'Explicit allowlist for staff accounts. Provision only through trusted database administration.';

alter table private.moderation_reviewers enable row level security;
revoke all on table private.moderation_reviewers from public, anon, authenticated, service_role;

alter table public.player_safety_reports
  add column assigned_reviewer_id uuid
    references private.moderation_reviewers(reviewer_user_id) on delete set null,
  add column reviewed_by uuid
    references private.moderation_reviewers(reviewer_user_id) on delete set null;

comment on column public.player_safety_reports.assigned_reviewer_id is
  'Allowlisted reviewer currently responsible for this case; null permits another reviewer to claim it.';
comment on column public.player_safety_reports.reviewed_by is
  'Allowlisted reviewer who resolved the case.';

create table private.player_safety_report_events (
  id bigint generated always as identity primary key,
  report_id uuid references public.player_safety_reports(id) on delete cascade,
  actor_user_id uuid not null,
  event_type text not null check (
    event_type in ('queue_listed', 'report_viewed', 'claimed', 'resolved')
  ),
  previous_status text check (
    previous_status is null
    or previous_status in ('pending', 'reviewing', 'actioned', 'dismissed')
  ),
  new_status text check (
    new_status is null
    or new_status in ('pending', 'reviewing', 'actioned', 'dismissed')
  ),
  filter_status text check (
    filter_status is null
    or filter_status in ('all', 'pending', 'reviewing', 'actioned', 'dismissed')
  ),
  created_at timestamptz not null default clock_timestamp(),
  check (
    (event_type = 'queue_listed' and filter_status is not null)
    or
    (event_type <> 'queue_listed' and report_id is not null and filter_status is null)
  )
);

comment on table private.player_safety_report_events is
  'Append-only application audit events for reviewer queue access, report views, claims, and resolutions. Events expire with their report after 180 days.';

create index player_safety_report_events_by_report
  on private.player_safety_report_events (report_id, created_at);

create index player_safety_reports_review_queue
  on public.player_safety_reports (status, created_at, id)
  where status in ('pending', 'reviewing');

alter table private.player_safety_report_events enable row level security;
revoke all on table private.player_safety_report_events from public, anon, authenticated, service_role;

revoke all on table public.player_safety_reports from public, anon, authenticated, service_role;

create function private.is_active_moderation_reviewer(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.moderation_reviewers r
    where r.reviewer_user_id = p_user_id
      and r.active
  );
$function$;

revoke all on function private.is_active_moderation_reviewer(uuid)
  from public, anon, authenticated, service_role;

create function public.list_moderation_reports(
  p_status text default 'pending',
  p_page_size integer default 50,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
)
returns table (
  report_id uuid,
  category text,
  status text,
  created_at timestamptz,
  assigned_reviewer_id uuid
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_logged integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_active_moderation_reviewer(v_user_id) then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in (
    'all', 'pending', 'reviewing', 'actioned', 'dismissed'
  ) then
    raise exception 'Unsupported report status' using errcode = '22023';
  end if;
  if p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'Page size must be between 1 and 100' using errcode = '22023';
  end if;
  if (p_after_created_at is null) <> (p_after_id is null) then
    raise exception 'Both pagination cursor values are required' using errcode = '22023';
  end if;

  insert into private.player_safety_report_events (
    report_id, actor_user_id, event_type, filter_status
  )
  select r.id, v_user_id, 'queue_listed', p_status
  from public.player_safety_reports r
  where (p_status = 'all' or r.status = p_status)
    and r.reporter_user_id is distinct from v_user_id
    and r.reported_user_id is distinct from v_user_id
    and (
      p_after_created_at is null
      or (r.created_at, r.id) > (p_after_created_at, p_after_id)
    )
  order by r.created_at, r.id
  limit p_page_size;
  get diagnostics v_logged = row_count;

  if v_logged = 0 then
    insert into private.player_safety_report_events (
      actor_user_id, event_type, filter_status
    ) values (
      v_user_id, 'queue_listed', p_status
    );
  end if;

  return query
  select
    r.id,
    r.category,
    r.status,
    r.created_at,
    r.assigned_reviewer_id
  from public.player_safety_reports r
  where (p_status = 'all' or r.status = p_status)
    and r.reporter_user_id is distinct from v_user_id
    and r.reported_user_id is distinct from v_user_id
    and (
      p_after_created_at is null
      or (r.created_at, r.id) > (p_after_created_at, p_after_id)
    )
  order by r.created_at, r.id
  limit p_page_size;
end;
$function$;

create function public.get_moderation_report(p_report_id uuid)
returns table (
  report_id uuid,
  room_id uuid,
  reporter_user_id uuid,
  reported_user_id uuid,
  category text,
  details text,
  status text,
  created_at timestamptz,
  assigned_reviewer_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_report public.player_safety_reports%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_active_moderation_reviewer(v_user_id) then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  select r.* into v_report
  from public.player_safety_reports r
  where r.id = p_report_id
  for share;

  if not found
    or v_report.reporter_user_id = v_user_id
    or v_report.reported_user_id = v_user_id then
    raise exception 'Report unavailable' using errcode = '42501';
  end if;

  insert into private.player_safety_report_events (
    report_id, actor_user_id, event_type, previous_status, new_status
  ) values (
    v_report.id, v_user_id, 'report_viewed', v_report.status, v_report.status
  );

  return query
  select
    v_report.id,
    v_report.room_id,
    v_report.reporter_user_id,
    v_report.reported_user_id,
    v_report.category,
    v_report.details,
    v_report.status,
    v_report.created_at,
    v_report.assigned_reviewer_id,
    v_report.reviewed_by,
    v_report.reviewed_at;
end;
$function$;

create function public.claim_moderation_report(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_report public.player_safety_reports%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_active_moderation_reviewer(v_user_id) then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  select r.* into v_report
  from public.player_safety_reports r
  where r.id = p_report_id
  for update;

  if not found
    or v_report.reporter_user_id = v_user_id
    or v_report.reported_user_id = v_user_id then
    return false;
  end if;

  if v_report.status = 'reviewing'
    and v_report.assigned_reviewer_id is not null
    and private.is_active_moderation_reviewer(v_report.assigned_reviewer_id) then
    return false;
  end if;
  if v_report.status not in ('pending', 'reviewing') then
    return false;
  end if;

  update public.player_safety_reports r
  set status = 'reviewing',
      assigned_reviewer_id = v_user_id,
      reviewed_by = null,
      reviewed_at = null
  where r.id = p_report_id;

  insert into private.player_safety_report_events (
    report_id, actor_user_id, event_type, previous_status, new_status
  ) values (
    p_report_id, v_user_id, 'claimed', v_report.status, 'reviewing'
  );

  return true;
end;
$function$;

create function public.resolve_moderation_report(
  p_report_id uuid,
  p_resolution text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_report public.player_safety_reports%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.is_active_moderation_reviewer(v_user_id) then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_resolution is null or p_resolution not in ('actioned', 'dismissed') then
    raise exception 'Unsupported report resolution' using errcode = '22023';
  end if;

  select r.* into v_report
  from public.player_safety_reports r
  where r.id = p_report_id
  for update;

  if not found
    or v_report.reporter_user_id = v_user_id
    or v_report.reported_user_id = v_user_id then
    raise exception 'Report unavailable' using errcode = '42501';
  end if;
  if v_report.status <> 'reviewing'
    or v_report.assigned_reviewer_id <> v_user_id then
    raise exception 'Report must be claimed by this reviewer' using errcode = '42501';
  end if;

  update public.player_safety_reports r
  set status = p_resolution,
      reviewed_by = v_user_id,
      reviewed_at = clock_timestamp()
  where r.id = p_report_id;

  insert into private.player_safety_report_events (
    report_id, actor_user_id, event_type, previous_status, new_status
  ) values (
    p_report_id, v_user_id, 'resolved', v_report.status, p_resolution
  );

  return true;
end;
$function$;

create or replace function private.purge_expired_moderation_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.player_safety_reports r
  where r.created_at <= clock_timestamp() - interval '180 days';
  get diagnostics v_deleted = row_count;

  delete from private.player_safety_report_events e
  where e.report_id is null
    and e.created_at <= clock_timestamp() - interval '180 days';

  return v_deleted;
end;
$function$;

revoke all on function public.list_moderation_reports(text, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_moderation_report(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_moderation_report(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.resolve_moderation_report(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.list_moderation_reports(text, integer, timestamptz, uuid)
  to authenticated;
grant execute on function public.get_moderation_report(uuid)
  to authenticated;
grant execute on function public.claim_moderation_report(uuid)
  to authenticated;
grant execute on function public.resolve_moderation_report(uuid, text)
  to authenticated;
