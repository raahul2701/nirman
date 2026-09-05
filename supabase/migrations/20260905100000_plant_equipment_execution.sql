begin;

-- ===========================================================================
-- Plant & Equipment Execution — Phase 1 (ADDITIVE ONLY; contractor-scoped)
-- ---------------------------------------------------------------------------
-- Creates ONLY the three new tables of the approved design plus one SECURITY
-- DEFINER RPC and one additive scope helper. Nothing existing is modified:
--   * maintenance_logs / service_schedules / breakdown_reports /
--     machinery_health / machinery_runtime_logs / diesel_issue_logs are NOT
--     read or written by this migration or by the new feature.
--   * materials / stock_transactions / daily_reports / project_assignments /
--     projects / workers / profiles are NOT altered.
--   * Existing policies, helpers and RPCs are NOT modified. New policies live
--     only on the three NEW tables and reuse the existing canonical guard
--     `can_manage_contractor_project_scope(...)` (20260814193000) unchanged.
--   * No anon access (RLS enabled, no anon policies, anon privileges revoked).
--   * No DELETE grants/policies anywhere: removal is soft via deleted_at.
--   * equipment_execution_logs has NO direct client INSERT/UPDATE/DELETE
--     policy — the RPC is the only write path.
-- Business locks implemented here:
--   A. One ACTIVE deployment per asset overall -> partial unique index on
--      project_equipment_assignments(equipment_asset_id)
--      WHERE status='active' AND deleted_at IS NULL
--   B. One execution log per equipment per execution_date (V1) -> partial
--      unique index on equipment_execution_logs(equipment_asset_id,
--      execution_date) WHERE deleted_at IS NULL
--   C. project_table kept in schema ('projects'|'gov_projects'); the V1
--      contractor UI uses 'projects' only
--   D/E. contractor_id + created_by always come from auth.uid() (scope guard
--      + RPC); client input is never trusted for identity
--   F. running_hours / km_travelled are GENERATED ALWAYS ... STORED columns
--   G/H. meter monotonicity and execution validity are enforced server-side
--      by contractor_record_equipment_execution
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. equipment_assets — workspace-scoped contractor asset register.
--    Assets are registered once per workspace and deployed to projects via
--    project_equipment_assignments, so this table intentionally carries NO
--    project_id / project_table columns.
-- ---------------------------------------------------------------------------
create table if not exists public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contractor_id uuid not null constraint equipment_assets_contractor_id_fkey
    references public.profiles(id) on delete restrict,
  name text not null constraint equipment_assets_name_check check (btrim(name) <> ''),
  asset_type text not null default 'other',
  registration_number text,
  status text not null default 'active' constraint equipment_assets_status_check
    check (status in ('active', 'inactive')),
  initial_hour_meter numeric(12,2) not null default 0
    constraint equipment_assets_initial_hour_check check (initial_hour_meter >= 0),
  initial_km numeric(12,2) not null default 0
    constraint equipment_assets_initial_km_check check (initial_km >= 0),
  notes text,
  deleted_at timestamptz,
  created_by uuid not null constraint equipment_assets_created_by_fkey
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_assets_contractor_scope_idx
  on public.equipment_assets (workspace_id, contractor_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2. project_equipment_assignments — deployment lifecycle per project
-- ---------------------------------------------------------------------------
create table if not exists public.project_equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  project_table text not null default 'projects'
    constraint project_equipment_assignments_project_table_check
    check (project_table in ('projects', 'gov_projects')),
  contractor_id uuid not null constraint project_equipment_assignments_contractor_id_fkey
    references public.profiles(id) on delete restrict,
  equipment_asset_id uuid not null constraint project_equipment_assignments_asset_id_fkey
    references public.equipment_assets(id) on delete cascade,
  status text not null default 'active' constraint project_equipment_assignments_status_check
    check (status in ('active', 'ended')),
  deployed_on date not null default current_date,
  ended_on date,
  notes text,
  deleted_at timestamptz,
  created_by uuid not null constraint project_equipment_assignments_created_by_fkey
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_equipment_assignments_dates_check
    check (ended_on is null or ended_on >= deployed_on)
);

-- Business lock A: an equipment asset may have ONLY ONE active deployment.
create unique index if not exists project_equipment_assignments_one_active_per_asset_uidx
  on public.project_equipment_assignments (equipment_asset_id)
  where status = 'active' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. equipment_execution_logs — immutable contractor execution ledger.
--    running_hours / km_travelled are PostgreSQL GENERATED STORED columns
--    (business lock F): authoritative values are never computed only in the
--    frontend. There is NO client INSERT/UPDATE/DELETE policy; the SECURITY
--    DEFINER RPC is the single write path.
-- ---------------------------------------------------------------------------
create table if not exists public.equipment_execution_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  project_table text not null default 'projects'
    constraint equipment_execution_logs_project_table_check
    check (project_table in ('projects', 'gov_projects')),
  contractor_id uuid not null constraint equipment_execution_logs_contractor_id_fkey
    references public.profiles(id) on delete restrict,
  equipment_asset_id uuid not null constraint equipment_execution_logs_asset_id_fkey
    references public.equipment_assets(id) on delete cascade,
  deployment_id uuid not null constraint equipment_execution_logs_deployment_id_fkey
    references public.project_equipment_assignments(id) on delete restrict,
  execution_date date not null,
  start_hour_meter numeric(12,2) not null
    constraint equipment_execution_logs_start_hour_check check (start_hour_meter >= 0),
  end_hour_meter numeric(12,2) not null
    constraint equipment_execution_logs_end_hour_check check (end_hour_meter >= start_hour_meter),
  start_km numeric(12,2) not null
    constraint equipment_execution_logs_start_km_check check (start_km >= 0),
  end_km numeric(12,2) not null
    constraint equipment_execution_logs_end_km_check check (end_km >= start_km),
  running_hours numeric(12,2) generated always as (end_hour_meter - start_hour_meter) stored,
  km_travelled numeric(12,2) generated always as (end_km - start_km) stored,
  fuel_used_litres numeric(12,2)
    constraint equipment_execution_logs_fuel_check
    check (fuel_used_litres is null or fuel_used_litres >= 0),
  operator_name text not null default '',
  activity text not null default '',
  status text not null default 'working' constraint equipment_execution_logs_status_check
    check (status in ('working', 'idle', 'breakdown')),
  chainage_from text not null default '',
  chainage_to text not null default '',
  remarks text not null default '',
  photos jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  created_by uuid not null constraint equipment_execution_logs_created_by_fkey
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Business lock B: V1 permits ONE execution log per equipment per day.
create unique index if not exists equipment_execution_logs_one_per_asset_per_day_uidx
  on public.equipment_execution_logs (equipment_asset_id, execution_date)
  where deleted_at is null;

create index if not exists equipment_execution_logs_scope_idx
  on public.equipment_execution_logs (workspace_id, project_id, project_table, contractor_id);
create index if not exists equipment_execution_logs_history_idx
  on public.equipment_execution_logs (workspace_id, project_id, contractor_id, execution_date desc);

-- ---------------------------------------------------------------------------
-- 4. Additive scope helpers (NEW only — no existing helper is modified).
--    can_manage_contractor_project_scope(...) is project-scoped, but assets
--    are registered before any deployment exists, so a workspace-level
--    contractor guard is required. It mirrors the canonical helper minus the
--    project legs. The second helper keeps the deployment insert policy
--    narrow: an asset can only be deployed by its owning contractor.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_contractor_workspace_scope(
  target_workspace_id uuid,
  target_contractor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    target_workspace_id is not null
    and target_contractor_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'contractor'
    )
    and exists (
      select 1
      from public.workspace_users wu
      where wu.workspace_id = target_workspace_id
        and wu.user_id = auth.uid()
        and wu.role = 'contractor'
        and wu.active = true
    ),
    false
  );
$$;

revoke all on function public.can_manage_contractor_workspace_scope(uuid, uuid) from public;
grant execute on function public.can_manage_contractor_workspace_scope(uuid, uuid)
  to authenticated, service_role;

create or replace function public.can_deploy_contractor_equipment_asset(
  target_workspace_id uuid,
  target_contractor_id uuid,
  target_asset_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.equipment_assets a
    where a.id = target_asset_id
      and a.workspace_id = target_workspace_id
      and a.contractor_id = target_contractor_id
      and a.status = 'active'
      and a.deleted_at is null
  ), false);
$$;

revoke all on function public.can_deploy_contractor_equipment_asset(uuid, uuid, uuid) from public;
grant execute on function public.can_deploy_contractor_equipment_asset(uuid, uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS — enabled on all three tables; no anon access; no DELETE policy.
--    Contractor writes are narrowly scoped and identity comes from auth.uid().
-- ---------------------------------------------------------------------------
alter table public.equipment_assets enable row level security;
alter table public.project_equipment_assignments enable row level security;
alter table public.equipment_execution_logs enable row level security;

revoke all on table public.equipment_assets from anon;
revoke all on table public.project_equipment_assignments from anon;
revoke all on table public.equipment_execution_logs from anon;

revoke delete on table public.equipment_assets from anon, authenticated;
revoke delete on table public.project_equipment_assignments from anon, authenticated;
revoke delete on table public.equipment_execution_logs from anon, authenticated;

-- equipment_assets — workspace-scoped contractor read/insert/update.
drop policy if exists "contractor scoped equipment assets select" on public.equipment_assets;
create policy "contractor scoped equipment assets select"
  on public.equipment_assets for select to authenticated
  using (public.can_manage_contractor_workspace_scope(workspace_id, contractor_id));

drop policy if exists "contractor scoped equipment assets insert" on public.equipment_assets;
create policy "contractor scoped equipment assets insert"
  on public.equipment_assets for insert to authenticated
  with check (
    contractor_id = auth.uid()
    and created_by = auth.uid()
    and public.can_manage_contractor_workspace_scope(workspace_id, contractor_id)
  );

drop policy if exists "contractor scoped equipment assets update" on public.equipment_assets;
create policy "contractor scoped equipment assets update"
  on public.equipment_assets for update to authenticated
  using (public.can_manage_contractor_workspace_scope(workspace_id, contractor_id))
  with check (
    contractor_id = auth.uid()
    and public.can_manage_contractor_workspace_scope(workspace_id, contractor_id)
  );

-- project_equipment_assignments — canonical project-scoped guard.
drop policy if exists "contractor scoped equipment deployments select" on public.project_equipment_assignments;
create policy "contractor scoped equipment deployments select"
  on public.project_equipment_assignments for select to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

drop policy if exists "contractor scoped equipment deployments insert" on public.project_equipment_assignments;
create policy "contractor scoped equipment deployments insert"
  on public.project_equipment_assignments for insert to authenticated
  with check (
    contractor_id = auth.uid()
    and created_by = auth.uid()
    and status = 'active'
    and public.can_manage_contractor_project_scope(
      workspace_id, project_id, project_table, contractor_id
    )
    and public.can_deploy_contractor_equipment_asset(
      workspace_id, contractor_id, equipment_asset_id
    )
  );

drop policy if exists "contractor scoped equipment deployments update" on public.project_equipment_assignments;
create policy "contractor scoped equipment deployments update"
  on public.project_equipment_assignments for update to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ))
  with check (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

-- equipment_execution_logs — SELECT only. NO insert/update/delete policy:
-- contractor_record_equipment_execution is the single write path.
drop policy if exists "contractor scoped equipment execution logs select" on public.equipment_execution_logs;
create policy "contractor scoped equipment execution logs select"
  on public.equipment_execution_logs for select to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

-- ---------------------------------------------------------------------------
-- 6. Scope-change protection on authenticated writes — mirrors the existing
--    workforce trigger pattern (prevent_authenticated_worker_scope_change).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_authenticated_equipment_asset_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.workspace_id is distinct from old.workspace_id
       or new.contractor_id is distinct from old.contractor_id
     ) then
    raise exception 'authenticated users cannot change equipment asset scope';
  end if;
  return new;
end;
$$;

drop trigger if exists equipment_assets_prevent_authenticated_scope_change on public.equipment_assets;
create trigger equipment_assets_prevent_authenticated_scope_change
  before update on public.equipment_assets
  for each row execute function public.prevent_authenticated_equipment_asset_scope_change();

create or replace function public.prevent_authenticated_equipment_deployment_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.workspace_id is distinct from old.workspace_id
       or new.project_id is distinct from old.project_id
       or new.project_table is distinct from old.project_table
       or new.contractor_id is distinct from old.contractor_id
       or new.equipment_asset_id is distinct from old.equipment_asset_id
     ) then
    raise exception 'authenticated users cannot change equipment deployment scope';
  end if;
  return new;
end;
$$;

drop trigger if exists project_equipment_assignments_prevent_authenticated_scope_change on public.project_equipment_assignments;
create trigger project_equipment_assignments_prevent_authenticated_scope_change
  before update on public.project_equipment_assignments
  for each row execute function public.prevent_authenticated_equipment_deployment_scope_change();

-- ---------------------------------------------------------------------------
drop trigger if exists equipment_assets_set_updated_at on public.equipment_assets;
create trigger equipment_assets_set_updated_at
  before update on public.equipment_assets
 for each row execute function public.update_updated_at();

drop trigger if exists project_equipment_assignments_set_updated_at on public.project_equipment_assignments;
create trigger project_equipment_assignments_set_updated_at
  before update on public.project_equipment_assignments
 for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 8. contractor_record_equipment_execution — SECURITY DEFINER RPC; the only
--    write path into equipment_execution_logs.
--    Contract: authenticate -> validate workspace membership -> validate the
--    exact project assignment -> validate asset ownership/state -> validate
--    the active deployment -> validate date -> validate meter/fuel/status ->
--    enforce monotonic meters -> enforce the duplicate-day rule -> insert
--    with server-side contractor_id + created_by -> return the inserted log
--    id plus the GENERATED running_hours and km_travelled.
-- ---------------------------------------------------------------------------
create or replace function public.contractor_record_equipment_execution(
  p_workspace_id uuid,
  p_project_id uuid,
  p_project_table text,
  p_equipment_asset_id uuid,
  p_execution_date date,
  p_start_hour_meter numeric,
  p_end_hour_meter numeric,
  p_start_km numeric,
  p_end_km numeric,
  p_fuel_used_litres numeric default null,
  p_operator_name text default '',
  p_activity text default '',
  p_status text default 'working',
  p_chainage_from text default '',
  p_chainage_to text default '',
  p_remarks text default '',
  p_photos jsonb default '[]'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contractor_id uuid;
  v_profile_role text;
  v_asset_id uuid;
  v_asset_status text;
  v_asset_hour numeric;
  v_asset_km numeric;
  v_deployment_id uuid;
  v_last_hour numeric;
  v_last_km numeric;
  v_log_id uuid;
  v_running_hours numeric;
  v_km_travelled numeric;
begin
  -- 0. Input validation: date, scope shape, meters, fuel, status.
  if p_execution_date is null then
    raise exception 'Execution date is required.';
  end if;
  if p_execution_date > current_date then
    raise exception 'Execution date cannot be in the future.';
  end if;
  if p_workspace_id is null or p_project_id is null or p_equipment_asset_id is null then
    raise exception 'Workspace, project and equipment asset are required.';
  end if;
  if p_project_table is null or p_project_table not in ('projects', 'gov_projects') then
    raise exception 'Invalid project table.';
  end if;
  if p_start_hour_meter is null or p_end_hour_meter is null
     or p_start_km is null or p_end_km is null then
    raise exception 'Opening and closing hour meter and KM readings are required.';
  end if;
  if p_start_hour_meter < 0 or p_end_hour_meter < 0
     or p_start_km < 0 or p_end_km < 0 then
    raise exception 'Meter readings cannot be negative.';
  end if;
  if p_end_hour_meter < p_start_hour_meter then
    raise exception 'Closing hour meter cannot be behind the opening hour meter.';
  end if;
  if p_end_km < p_start_km then
    raise exception 'Closing KM cannot be behind the opening KM.';
  end if;
  if p_fuel_used_litres is not null and p_fuel_used_litres < 0 then
    raise exception 'Fuel used cannot be negative.';
  end if;
  if p_status is null or p_status not in ('working', 'idle', 'breakdown') then
    raise exception 'Execution status must be working, idle or breakdown.';
  end if;
  if p_photos is null then
    p_photos := '[]'::jsonb;
  elsif jsonb_typeof(p_photos) <> 'array' then
    raise exception 'Photos must be a JSON array of URLs.';
  end if;

  -- 1. Authenticate: contractor identity ALWAYS comes from auth.uid().
  v_contractor_id := auth.uid();
  if v_contractor_id is null then
    raise exception 'Your session has expired. Please sign in again.';
  end if;

  select role into v_profile_role
  from public.profiles
  where id = v_contractor_id;
  if v_profile_role is null or v_profile_role <> 'contractor' then
    raise exception 'Equipment execution entries are available only to contractor accounts.';
  end if;

  -- 2. Validate workspace membership (active contractor member).
  if not exists (
    select 1 from public.workspace_users wu
    where wu.workspace_id = p_workspace_id
      and wu.user_id = v_contractor_id
      and wu.role = 'contractor'
      and wu.active = true
  ) then
    raise exception 'Contractor is not an active member of the requested workspace.';
  end if;

  -- 3. Validate the exact project assignment (active or pilot), including the
  --    project_table, scoped to the authenticated contractor.
  if not exists (
    select 1 from public.project_assignments pa
    where pa.workspace_id = p_workspace_id
      and pa.project_id = p_project_id
      and pa.project_table = p_project_table
      and pa.contractor_id = v_contractor_id
      and pa.access_status in ('active', 'pilot')
  ) then
    raise exception 'No active or pilot contractor assignment exists for this project.';
  end if;

  -- Serialize concurrent executions per asset so the monotonic-meter check
  -- cannot be interleaved by parallel requests for the same asset.
  perform pg_advisory_xact_lock(hashtextextended('equipment_execution:' || p_equipment_asset_id::text, 0));

  -- 4. Validate asset ownership and state.
  select a.id, a.status, a.initial_hour_meter, a.initial_km
    into v_asset_id, v_asset_status, v_asset_hour, v_asset_km
  from public.equipment_assets a
  where a.id = p_equipment_asset_id
    and a.workspace_id = p_workspace_id
    and a.contractor_id = v_contractor_id
    and a.deleted_at is null;
  if v_asset_id is null then
    raise exception 'Equipment asset was not found in your workspace.';
  end if;
  if v_asset_status <> 'active' then
    raise exception 'Equipment asset is inactive and cannot record execution.';
  end if;

  -- 5. Validate the ACTIVE deployment to this exact project for the date.
  select d.id into v_deployment_id
  from public.project_equipment_assignments d
  where d.equipment_asset_id = p_equipment_asset_id
    and d.workspace_id = p_workspace_id
    and d.project_id = p_project_id
    and d.project_table = p_project_table
    and d.contractor_id = v_contractor_id
    and d.status = 'active'
    and d.deleted_at is null
    and d.deployed_on <= p_execution_date
  limit 1;
  if v_deployment_id is null then
    raise exception 'Equipment is not actively deployed to this project for the execution date.';
  end if;

  -- 8. Enforce monotonic meters (business lock G): the opening readings can
  --    never move backwards across execution history. The baseline falls back
  --    to the asset's initial registration readings.
  select l.end_hour_meter, l.end_km
    into v_last_hour, v_last_km
  from public.equipment_execution_logs l
  where l.equipment_asset_id = p_equipment_asset_id
    and l.deleted_at is null
  order by l.execution_date desc, l.created_at desc
  limit 1;
  if v_last_hour is null then
    v_last_hour := v_asset_hour;
    v_last_km := v_asset_km;
  end if;
  if p_start_hour_meter < v_last_hour then
    raise exception 'Opening hour meter % is behind the last recorded reading %; meters cannot move backwards.', p_start_hour_meter, v_last_hour;
  end if;
  if p_start_km < v_last_km then
    raise exception 'Opening KM % is behind the last recorded reading %; meters cannot move backwards.', p_start_km, v_last_km;
  end if;

  -- 9. Enforce the duplicate-day rule (business lock B): V1 permits ONE
  --    execution log per equipment per execution_date. The partial unique
  --    index is the hard guarantee; this pre-check returns a friendly error.
  if exists (
    select 1 from public.equipment_execution_logs
    where equipment_asset_id = p_equipment_asset_id
      and execution_date = p_execution_date
      and deleted_at is null
  ) then
    raise exception 'An execution log already exists for this equipment on %. Only one execution per equipment per day is allowed.', p_execution_date;
  end if;

  -- 10. Insert with SERVER-SIDE contractor_id + created_by (business locks
  --     D/E). The client never supplies identity. running_hours and
  --     km_travelled are filled by the GENERATED STORED columns.
  insert into public.equipment_execution_logs (
    workspace_id, project_id, project_table, contractor_id,
    equipment_asset_id, deployment_id, execution_date,
    start_hour_meter, end_hour_meter, start_km, end_km,
    fuel_used_litres, operator_name, activity, status,
    chainage_from, chainage_to, remarks, photos, created_by
  ) values (
    p_workspace_id, p_project_id, p_project_table, v_contractor_id,
    p_equipment_asset_id, v_deployment_id, p_execution_date,
    p_start_hour_meter, p_end_hour_meter, p_start_km, p_end_km,
    p_fuel_used_litres, btrim(coalesce(p_operator_name, '')),
    btrim(coalesce(p_activity, '')), p_status,
    btrim(coalesce(p_chainage_from, '')), btrim(coalesce(p_chainage_to, '')),
    btrim(coalesce(p_remarks, '')), p_photos, v_contractor_id
  )
  returning id, running_hours, km_travelled
    into v_log_id, v_running_hours, v_km_travelled;

  -- 11. Return the inserted log id plus the generated values.
  return json_build_object(
    'log_id', v_log_id,
    'running_hours', v_running_hours,
    'km_travelled', v_km_travelled
  );
end;
$$;

revoke all on function public.contractor_record_equipment_execution(
  uuid, uuid, text, uuid, date, numeric, numeric, numeric, numeric,
  numeric, text, text, text, text, text, text, jsonb
) from public;
grant execute on function public.contractor_record_equipment_execution(
  uuid, uuid, text, uuid, date, numeric, numeric, numeric, numeric,
  numeric, text, text, text, text, text, text, jsonb
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;


create index if not exists project_equipment_assignments_scope_idx
  on public.project_equipment_assignments (workspace_id, project_id, project_table, contractor_id);
create index if not exists project_equipment_assignments_asset_idx
  on public.project_equipment_assignments (equipment_asset_id);
