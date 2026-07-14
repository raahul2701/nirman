-- Make project_assignments the source of truth for project access.
-- Core-only and idempotent: no optional workflow/child tables are referenced here.

create or replace function public.can_access_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_users wu
    where wu.workspace_id = target_workspace_id
      and wu.user_id = auth.uid()
      and wu.active = true
  );
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_users wu
    where wu.workspace_id = target_workspace_id
      and wu.user_id = auth.uid()
      and wu.active = true
      and wu.role in ('executive_engineer', 'admin_viewer')
  );
$$;

create or replace function public.can_access_workspace_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or exists (
      select 1
      from public.workspace_users viewer
      join public.workspace_users target
        on target.workspace_id = viewer.workspace_id
        and target.user_id = target_profile_id
        and target.active = true
      where viewer.user_id = auth.uid()
        and viewer.active = true
    );
$$;

create or replace function public.can_access_assigned_project(target_project_id uuid, target_project_table text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.workspace_users wu
      on wu.workspace_id = pa.workspace_id
      and wu.user_id = auth.uid()
      and wu.active = true
    where pa.project_table = target_project_table
      and pa.project_id = target_project_id
      and pa.access_status in ('active', 'pilot')
      and (
        pa.executive_engineer_id = auth.uid()
        or pa.assistant_engineer_id = auth.uid()
        or pa.junior_engineer_id = auth.uid()
        or pa.contractor_id = auth.uid()
        or wu.role in ('executive_engineer', 'admin_viewer')
      )
  );
$$;

create or replace function public.can_manage_assigned_project(target_project_id uuid, target_project_table text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.workspace_users wu
      on wu.workspace_id = pa.workspace_id
      and wu.user_id = auth.uid()
      and wu.active = true
    where pa.project_table = target_project_table
      and pa.project_id = target_project_id
      and pa.access_status in ('active', 'pilot')
      and (
        pa.executive_engineer_id = auth.uid()
        or pa.assistant_engineer_id = auth.uid()
        or pa.junior_engineer_id = auth.uid()
        or wu.role in ('executive_engineer', 'admin_viewer')
      )
  );
$$;

create or replace function public.can_access_assigned_gov_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_assigned_project(target_project_id, 'gov_projects')
    or exists (
      select 1
      from public.gov_projects gp
      where gp.id = target_project_id
        and gp.engineer_id = auth.uid()
    );
$$;

create or replace function public.can_manage_assigned_gov_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_assigned_project(target_project_id, 'gov_projects')
    or exists (
      select 1
      from public.gov_projects gp
      where gp.id = target_project_id
        and gp.engineer_id = auth.uid()
    );
$$;

revoke all on function public.can_access_workspace(uuid) from public;
revoke all on function public.can_manage_workspace(uuid) from public;
revoke all on function public.can_access_workspace_profile(uuid) from public;
revoke all on function public.can_access_assigned_project(uuid, text) from public;
revoke all on function public.can_manage_assigned_project(uuid, text) from public;
revoke all on function public.can_access_assigned_gov_project(uuid) from public;
revoke all on function public.can_manage_assigned_gov_project(uuid) from public;
grant execute on function public.can_access_workspace(uuid) to authenticated, service_role;
grant execute on function public.can_manage_workspace(uuid) to authenticated, service_role;
grant execute on function public.can_access_workspace_profile(uuid) to authenticated, service_role;
grant execute on function public.can_access_assigned_project(uuid, text) to authenticated, service_role;
grant execute on function public.can_manage_assigned_project(uuid, text) to authenticated, service_role;
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
create index if not exists idx_project_assignments_legacy_executive_engineer
  on public.project_assignments(project_table, executive_engineer_id)
  where project_table = 'projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_legacy_assistant_engineer
  on public.project_assignments(project_table, assistant_engineer_id)
  where project_table = 'projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_legacy_junior_engineer
  on public.project_assignments(project_table, junior_engineer_id)
  where project_table = 'projects' and access_status in ('active', 'pilot');
create index if not exists idx_project_assignments_legacy_contractor
  on public.project_assignments(project_table, contractor_id)
  where project_table = 'projects' and access_status in ('active', 'pilot');

alter table public.gov_projects enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.workspace_users enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Authenticated see gov_projects" on public.gov_projects;
drop policy if exists "Users can view own or assigned gov projects" on public.gov_projects;
create policy "Users can view own or assigned gov projects"
  on public.gov_projects for select to authenticated
  using (public.can_access_assigned_gov_project(id));

drop policy if exists "Users can insert gov projects" on public.gov_projects;
create policy "Users can insert gov projects"
  on public.gov_projects for insert to authenticated
  with check (engineer_id = auth.uid());

drop policy if exists "Users can update own gov projects" on public.gov_projects;
create policy "Users can update own gov projects"
  on public.gov_projects for update to authenticated
  using (public.can_manage_assigned_gov_project(id))
  with check (public.can_manage_assigned_gov_project(id));

-- No DELETE policy is created for gov_projects. Authenticated client deletes remain denied.

drop policy if exists "Users can view assigned projects" on public.projects;
create policy "Users can view assigned projects"
  on public.projects for select to authenticated
  using (public.can_access_assigned_project(id, 'projects'));

drop policy if exists "pilot_open_access_assignments" on public.project_assignments;
drop policy if exists "project hierarchy read" on public.project_assignments;
create policy "project hierarchy read"
  on public.project_assignments for select to authenticated
  using (
    project_table in ('gov_projects', 'projects')
    and access_status in ('active', 'pilot')
    and (
      executive_engineer_id = auth.uid()
      or assistant_engineer_id = auth.uid()
      or junior_engineer_id = auth.uid()
      or contractor_id = auth.uid()
      or public.can_manage_workspace(workspace_id)
    )
  );

drop policy if exists "ee manages project hierarchy" on public.project_assignments;
create policy "ee manages project hierarchy"
  on public.project_assignments for all to authenticated
  using (
    project_table in ('gov_projects', 'projects')
    and (
      executive_engineer_id = auth.uid()
      or public.can_manage_workspace(workspace_id)
    )
  )
  with check (
    project_table in ('gov_projects', 'projects')
    and access_status in ('active', 'pilot', 'paused', 'locked', 'completed', 'archived')
    and (
      executive_engineer_id = auth.uid()
      or public.can_manage_workspace(workspace_id)
    )
  );

-- No separate DELETE policy is created for project_assignments beyond EE/admin ownership in
-- "ee manages project hierarchy". Non-EE assignment deletes remain denied.

drop policy if exists "pilot_open_access_users" on public.workspace_users;
drop policy if exists "workspace members read workspace users" on public.workspace_users;
create policy "workspace members read workspace users"
  on public.workspace_users for select to authenticated
  using (user_id = auth.uid() or public.can_access_workspace(workspace_id));

drop policy if exists "ee manages workspace users" on public.workspace_users;
create policy "ee manages workspace users"
  on public.workspace_users for all to authenticated
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

drop policy if exists "Users can view own or workspace profiles" on public.profiles;
create policy "Users can view own or workspace profiles"
  on public.profiles for select to authenticated
  using (public.can_access_workspace_profile(id));

notify pgrst, 'reload schema';
