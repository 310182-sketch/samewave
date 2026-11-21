-- Read-only verification for migration 20261121000200.
-- Run after the migration succeeds in Supabase SQL Editor.
-- A SQL Editor run does not create the CLI ledger row; a false ledger check is expected
-- until the schema checks pass and the applied version is recorded with migration repair.
-- The generated code is a disposable sample and is not stored.
with generated_code as (
  select private.generate_room_invite_code() as code
),
join_function as (
  select pg_catalog.pg_get_functiondef(
    'public.join_invite_room(text,text)'::regprocedure
  ) as body
),
checks as (
  select
    'CLI migration ledger row'::text as check_name,
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20261121000200'
    ) as passed,
    'SQL Editor does not add the CLI ledger row; record it after the schema checks pass'::text as expected
  union all
  select
    'rate-limit table RLS',
    coalesce((
      select c.relrowsecurity
      from pg_catalog.pg_class c
      where c.oid = pg_catalog.to_regclass(
        'private.invite_code_join_attempt_limits'
      )
    ), false),
    'RLS is enabled on private.invite_code_join_attempt_limits'
  union all
  select
    'rate-limit table access',
    not coalesce(pg_catalog.has_table_privilege(
      'anon', 'private.invite_code_join_attempt_limits', 'SELECT'
    ), false)
      and not coalesce(pg_catalog.has_table_privilege(
        'authenticated', 'private.invite_code_join_attempt_limits', 'SELECT'
      ), false),
    'anon and authenticated cannot read the private table directly'
  union all
  select
    'sample invite code',
    (select code ~ '^[0-9]{6}$' from generated_code),
    'the generator returns six decimal digits'
  union all
  select
    'room RPC access',
    not pg_catalog.has_function_privilege(
      'anon', 'public.create_invite_room(text,text)', 'EXECUTE'
    )
      and pg_catalog.has_function_privilege(
        'authenticated', 'public.create_invite_room(text,text)', 'EXECUTE'
      )
      and not pg_catalog.has_function_privilege(
        'anon', 'public.join_invite_room(text,text)', 'EXECUTE'
      )
      and pg_catalog.has_function_privilege(
        'authenticated', 'public.join_invite_room(text,text)', 'EXECUTE'
      ),
    'only authenticated players can call create/join room RPCs'
  union all
  select
    'attempt rate limit',
    position('v_attempt_count >= 5' in join_function.body) > 0
      and position('10 minutes' in join_function.body) > 0,
    'join attempts are limited to five per ten-minute window'
  from join_function
  union all
  select
    'legacy code compatibility',
    position('^[0-9A-F]{12}$' in join_function.body) > 0,
    'unexpired legacy 12-character hexadecimal codes remain accepted'
  from join_function
  union all
  select
    'attempt cleanup schedule',
    exists (
      select 1
      from cron.job
      where jobname = 'purge-expired-invite-code-join-attempts'
        and active
    ),
    'the hourly cleanup job is active'
)
select check_name, passed, expected
from checks
order by check_name;
