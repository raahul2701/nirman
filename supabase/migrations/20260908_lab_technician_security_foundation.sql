-- ============================================================================
-- Migration: 20260908_lab_technician_security_foundation
--
-- Introduces the 'lab_technician' role into the three live role CHECK
-- constraints, creates the authorization helper (lab_technician_allows),
-- creates the creation RPC (create_lab_material_test), and scopes the
-- material_tests SELECT policy to eliminate cross-project leakage.
--
-- Live role lists verified from pg_catalog (2026-09-08).
-- Neither project table nor material_tests carries workspace_id; the
-- project-to-workspace relationship is represented by project_assignments
-- and project_user_scopes.
-- ============================================================================

begin;

------------------------------------------------------------------
-- A. ROLE CONSTRAINTS: add 'lab_technician' to the three live CHECKs.
------------------------------------------------------------------

-- profiles: 20 live roles + lab_technician
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'super_admin','admin','admin_viewer','project_manager',
    'executive_engineer','assistant_engineer','junior_engineer',
    'site_engineer','labor_supervisor','labour_supervisor',
    'contractor','subcontractor','labour_contractor','surveyor',
    'storekeeper','mechanical_engineer','electrical_engineer',
    'qc_engineer','gov_official','worker','lab_technician'
  ));

-- workspace_users: 15 live roles + lab_technician
alter table public.workspace_users
  drop constraint if exists workspace_users_role_check;
alter table public.workspace_users
  add constraint workspace_users_role_check
  check (role in (
    'executive_engineer','assistant_engineer','junior_engineer',
    'contractor','project_manager','subcontractor',
    'labour_contractor','surveyor','site_engineer','storekeeper',
    'mechanical_engineer','electrical_engineer','qc_engineer',
    'labour_supervisor','admin_viewer','lab_technician'
  ));

-- project_user_scopes: 10 live roles + lab_technician
alter table public.project_user_scopes
  drop constraint if exists project_user_scopes_role_check;
alter table public.project_user_scopes
  add constraint project_user_scopes_role_check
  check (role in (
    'project_manager','subcontractor','labour_contractor',
    'surveyor','site_engineer','storekeeper',
    'mechanical_engineer','electrical_engineer','qc_engineer',
    'labour_supervisor','lab_technician'
  ));

------------------------------------------------------------------
-- B. lab_technician_allows(target_workspace_id, target_project_id)
--    Verifies caller (auth.uid()) is an active lab_technician across
--    workspace_users + profiles + project_user_scopes.
--    Must be called via a CALLER-SCOPED client (anon key + JWT) so
--    auth.uid() resolves to the real caller — NEVER service-role.
--    No work_package_ref: material_tests has no such column.
------------------------------------------------------------------

create or replace function public.lab_technician_allows(
  target_workspace_id uuid,
  target_project_id   uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   public.workspace_users      wu
    join   public.profiles             p   on p.id               = auth.uid()
    join   public.project_user_scopes  pus on pus.user_id         = auth.uid()
    where  wu.workspace_id = target_workspace_id
      and  wu.user_id      = auth.uid()
      and  wu.role         = 'lab_technician'
      and  wu.active       is true
      and  p.role          = 'lab_technician'
      and  pus.workspace_id = target_workspace_id
      and  pus.project_id   = target_project_id
      and  pus.user_id      = auth.uid()
      and  pus.role         = 'lab_technician'
      and  pus.active       is true
    );
$$;

------------------------------------------------------------------
-- C. material_tests SELECT SECURITY (project-scoped policy)
--    Replaces the open "Authenticated users can read material tests"
--    policy with a project-scoped one. Three verified branches:
--    (a) Active project scopes through the verified project access helper
--        (lab_technicians additionally pass lab_technician_allows)
--    (b) JE/AE and assigned privileged users via project_assignments
------------------------------------------------------------------

alter table public.material_tests enable row level security;

drop policy if exists "Authenticated users can read material tests"
  on public.material_tests;

create policy "Material test reads are scoped to authorized project roles"
  on public.material_tests
  for select
  to authenticated
  using (
    -- (a) Active project scopes. Lab technicians must pass the stricter
    --     three-table authorization helper; other scoped users use the
    --     established project access helper.
    exists (
      select 1
      from   public.project_user_scopes pus
      where  pus.project_id = material_tests.project_id
        and  pus.user_id    = auth.uid()
        and  pus.active     is true
        and (
          (pus.role = 'lab_technician'
            and public.lab_technician_allows(pus.workspace_id, material_tests.project_id))
          or (pus.role <> 'lab_technician'
            and public.can_access_project(pus.workspace_id, material_tests.project_id))
        )
    )
    -- (b) JE/AE and assigned privileged users through the established
    --     project-assignment authorization for either project table.
    or exists (
      select 1
      from   public.project_assignments pa
      where  pa.project_id    = material_tests.project_id
        and  pa.project_table in ('projects', 'gov_projects')
        and  public.can_access_assigned_project(pa.project_id, pa.project_table)
    )
  );

------------------------------------------------------------------
-- D. create_lab_material_test RPC
--    SECURITY DEFINER. Derives workspace from the caller's
--    project_user_scopes, authorizes via lab_technician_allows(),
--    and inserts only real material_tests columns.
------------------------------------------------------------------

create or replace function public.create_lab_material_test(
  p_project_id            uuid,
  p_material_type         text,
  p_test_type             text,
  p_sample_location        text,
  p_lab_name               text,
  p_lab_certificate_number text,
  p_test_report_url        text,
  p_achieved_value         text,
  p_result                 text,
  p_test_date              date default current_date,
  p_site_id                uuid default null,
  p_required_value         text default null,
  p_unit                   text default null,
  p_drive_link             text default null,
  p_milestone_id           uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_id           uuid;
begin
  if not exists (
    select 1
    from public.project_user_scopes pus
    where pus.project_id = p_project_id
      and pus.user_id = v_caller
      and pus.role = 'lab_technician'
      and pus.active is true
      and public.lab_technician_allows(pus.workspace_id, p_project_id)
  ) then
    raise exception
      'Access denied: caller is not an authorized lab_technician for project %',
      p_project_id
      using ERRCODE = '42501';
  end if;

  if not exists (select 1 from public.gov_projects where id = p_project_id) then
    raise exception 'Project not found: %', p_project_id
      using ERRCODE = 'P0804';
  end if;

  insert into public.material_tests (
    project_id, site_id, material_type, test_type, test_date,
    sample_location, lab_name, lab_certificate_number, test_report_url,
    drive_link, required_value, achieved_value, unit, result,
    submitted_by, blocks_payment, ai_report_verified,
    ai_verification_notes, ai_authenticity_score, milestone_id, created_at
  )
  values (
    p_project_id, p_site_id, p_material_type, p_test_type, p_test_date,
    p_sample_location, p_lab_name, p_lab_certificate_number,
    p_test_report_url, p_drive_link, p_required_value, p_achieved_value,
    p_unit, p_result,
    v_caller, false, false, null, null, p_milestone_id, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

------------------------------------------------------------------
-- E. Privileges & commit
--    No INSERT/UPDATE/DELETE RLS policies. The RPC is SECURITY
--    DEFINER (owner postgres) and bypasses RLS. Direct browser
--    writes remain blocked by default-deny.
------------------------------------------------------------------

grant execute on function public.lab_technician_allows(uuid, uuid) to authenticated;
grant execute on function public.create_lab_material_test(
  uuid, text, text, text, text, text, text, text, text, date, uuid, text, text, text, uuid
) to authenticated;
revoke execute on function public.lab_technician_allows(uuid, uuid) from anon;
revoke execute on function public.create_lab_material_test(
  uuid, text, text, text, text, text, text, text, text, date, uuid, text, text, text, uuid
) from anon;
grant select on public.material_tests to authenticated;

alter function public.lab_technician_allows(uuid, uuid) owner to postgres;
alter function public.create_lab_material_test(
  uuid, text, text, text, text, text, text, text, text, date, uuid, text, text, text, uuid
) owner to postgres;

revoke all on function public.lab_technician_allows(uuid, uuid) from public;
revoke all on function public.create_lab_material_test(
  uuid, text, text, text, text, text, text, text, text, date, uuid, text, text, text, uuid
) from public;

commit;

