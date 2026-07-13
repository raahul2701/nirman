-- Make project_assignments the source of truth for GovTrack project access.
-- This migration is intentionally idempotent: policies are dropped/recreated, helper
-- functions are replaced, and supporting indexes use IF NOT EXISTS.

create or replace function public.can_access_assigned_gov_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.project_assignments pa
      join public.workspace_users wu
        on wu.workspace_id = pa.workspace_id
        and wu.user_id = auth.uid()
        and wu.active = true
      where pa.project_table = 'gov_projects'
        and pa.project_id = target_project_id
        and pa.access_status in ('active', 'pilot')
        and (
          pa.executive_engineer_id = auth.uid()
          or pa.assistant_engineer_id = auth.uid()
          or pa.junior_engineer_id = auth.uid()
          or pa.contractor_id = auth.uid()
          or wu.role in ('executive_engineer', 'admin_viewer')
        )
    )
    -- Bootstrap compatibility for the two-step project creation flow:
    -- gov_projects is inserted before the project_assignments row can exist.
    or exists (
      select 1
      from public.gov_projects gp
      where gp.id = target_project_id
        and (
          gp.owner_id = auth.uid()
          or gp.engineer_id = auth.uid()
          or gp.contractor_id = auth.uid()
        )
    );
$$;

create or replace function public.can_manage_assigned_gov_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.project_assignments pa
      join public.workspace_users wu
        on wu.workspace_id = pa.workspace_id
        and wu.user_id = auth.uid()
        and wu.active = true
      where pa.project_table = 'gov_projects'
        and pa.project_id = target_project_id
        and pa.access_status in ('active', 'pilot')
        and (
          pa.executive_engineer_id = auth.uid()
          or pa.assistant_engineer_id = auth.uid()
          or pa.junior_engineer_id = auth.uid()
          or wu.role in ('executive_engineer', 'admin_viewer')
        )
    )
    or exists (
      select 1
      from public.gov_projects gp
      where gp.id = target_project_id
        and (
          gp.owner_id = auth.uid()
          or gp.engineer_id = auth.uid()
        )
    );
$$;

revoke all on function public.can_access_assigned_gov_project(uuid) from public;
revoke all on function public.can_manage_assigned_gov_project(uuid) from public;
grant execute on function public.can_access_assigned_gov_project(uuid) to authenticated, service_role;
grant execute on function public.can_manage_assigned_gov_project(uuid) to authenticated, service_role;

create index if not exists idx_project_assignments_project_table_project_id
  on public.project_assignments(project_table, project_id);
create index if not exists idx_workspace_users_workspace_user_active
  on public.workspace_users(workspace_id, user_id, active);
create index if not exists idx_project_assignments_gov_executive_engineer
  on public.project_assignments(project_table, executive_engineer_id)
  where project_table = 'gov_projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_gov_assistant_engineer
  on public.project_assignments(project_table, assistant_engineer_id)
  where project_table = 'gov_projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_gov_junior_engineer
  on public.project_assignments(project_table, junior_engineer_id)
  where project_table = 'gov_projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_gov_contractor
  on public.project_assignments(project_table, contractor_id)
  where project_table = 'gov_projects' and access_status in ('active', 'pilot');

alter table public.gov_projects enable row level security;
alter table public.project_assignments enable row level security;

drop policy if exists "Users can view own or assigned gov projects" on public.gov_projects;
create policy "Users can view own or assigned gov projects"
  on public.gov_projects for select to authenticated
  using (public.can_access_assigned_gov_project(id));

drop policy if exists "Users can insert gov projects" on public.gov_projects;
create policy "Users can insert gov projects"
  on public.gov_projects for insert to authenticated
  with check (
    owner_id = auth.uid()
    or engineer_id = auth.uid()
  );

drop policy if exists "Users can update own gov projects" on public.gov_projects;
create policy "Users can update own gov projects"
  on public.gov_projects for update to authenticated
  using (public.can_manage_assigned_gov_project(id))
  with check (public.can_manage_assigned_gov_project(id));

-- No DELETE policy is created for gov_projects. Authenticated client deletes remain denied.

drop policy if exists "project hierarchy read" on public.project_assignments;
create policy "project hierarchy read"
  on public.project_assignments for select to authenticated
  using (
    project_table = 'gov_projects'
    and access_status in ('active', 'pilot')
    and (
      executive_engineer_id = auth.uid()
      or assistant_engineer_id = auth.uid()
      or junior_engineer_id = auth.uid()
      or contractor_id = auth.uid()
      or exists (
        select 1
        from public.workspace_users wu
        where wu.workspace_id = project_assignments.workspace_id
          and wu.user_id = auth.uid()
          and wu.active = true
          and wu.role in ('executive_engineer', 'admin_viewer')
      )
    )
  );

drop policy if exists "ee manages project hierarchy" on public.project_assignments;
create policy "ee manages project hierarchy"
  on public.project_assignments for all to authenticated
  using (
    executive_engineer_id = auth.uid()
    or exists (
      select 1
      from public.executive_engineer_workspaces w
      where w.id = project_assignments.workspace_id
        and w.executive_engineer_id = auth.uid()
    )
  )
  with check (
    project_table = 'gov_projects'
    and access_status in ('active', 'pilot', 'paused', 'locked', 'completed', 'archived')
    and (
      executive_engineer_id = auth.uid()
      or exists (
        select 1
        from public.executive_engineer_workspaces w
        where w.id = project_assignments.workspace_id
          and w.executive_engineer_id = auth.uid()
      )
    )
  );

-- No separate DELETE policy is created for project_assignments beyond EE ownership in
-- "ee manages project hierarchy". Non-EE assignment deletes remain denied.

drop policy if exists "Users can view milestones for accessible projects" on public.payment_milestones;
create policy "Users can view milestones for accessible projects"
  on public.payment_milestones for select to authenticated
  using (public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert milestones for their projects" on public.payment_milestones;
create policy "Users can insert milestones for their projects"
  on public.payment_milestones for insert to authenticated
  with check (public.can_manage_assigned_gov_project(project_id));

drop policy if exists "Users can update milestones for their projects" on public.payment_milestones;
create policy "Users can update milestones for their projects"
  on public.payment_milestones for update to authenticated
  using (public.can_manage_assigned_gov_project(project_id))
  with check (public.can_manage_assigned_gov_project(project_id));

-- No DELETE policy is created for payment_milestones.

drop policy if exists "Users can view uploads for accessible projects" on public.work_uploads;
create policy "Users can view uploads for accessible projects"
  on public.work_uploads for select to authenticated
  using (uploaded_by = auth.uid() or public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert own uploads" on public.work_uploads;
create policy "Users can insert own uploads"
  on public.work_uploads for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_access_assigned_gov_project(project_id));

-- No UPDATE/DELETE policy is created for work_uploads.

drop policy if exists "Users can view payment requests" on public.payment_requests;
create policy "Users can view payment requests"
  on public.payment_requests for select to authenticated
  using (requested_by = auth.uid() or public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert own payment requests" on public.payment_requests;
create policy "Users can insert own payment requests"
  on public.payment_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.can_access_assigned_gov_project(project_id));

drop policy if exists "Engineers can update payment requests" on public.payment_requests;
create policy "Engineers can update payment requests"
  on public.payment_requests for update to authenticated
  using (public.can_manage_assigned_gov_project(project_id))
  with check (public.can_manage_assigned_gov_project(project_id));

-- No DELETE policy is created for payment_requests.

drop policy if exists "Users can view inspections for accessible projects" on public.inspection_reports;
create policy "Users can view inspections for accessible projects"
  on public.inspection_reports for select to authenticated
  using (inspected_by = auth.uid() or public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert inspections for their projects" on public.inspection_reports;
create policy "Users can insert inspections for their projects"
  on public.inspection_reports for insert to authenticated
  with check (inspected_by = auth.uid() and public.can_manage_assigned_gov_project(project_id));

-- No UPDATE/DELETE policy is created for inspection_reports.

notify pgrst, 'reload schema';