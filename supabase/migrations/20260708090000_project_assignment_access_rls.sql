-- Make project_assignments the source of truth for GovTrack project access.

create or replace function public.can_access_assigned_gov_project(target_project_id uuid)
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
  );
$$;

drop policy if exists "Users can view own or assigned gov projects" on public.gov_projects;
create policy "Users can view own or assigned gov projects"
  on public.gov_projects for select to authenticated
  using (public.can_access_assigned_gov_project(id));

drop policy if exists "Users can update own gov projects" on public.gov_projects;
create policy "Users can update own gov projects"
  on public.gov_projects for update to authenticated
  using (
    exists (
      select 1
      from public.project_assignments pa
      where pa.project_table = 'gov_projects'
        and pa.project_id = gov_projects.id
        and pa.access_status in ('active', 'pilot')
        and (
          pa.executive_engineer_id = auth.uid()
          or pa.assistant_engineer_id = auth.uid()
          or pa.junior_engineer_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.project_assignments pa
      where pa.project_table = 'gov_projects'
        and pa.project_id = gov_projects.id
        and pa.access_status in ('active', 'pilot')
        and (
          pa.executive_engineer_id = auth.uid()
          or pa.assistant_engineer_id = auth.uid()
          or pa.junior_engineer_id = auth.uid()
        )
    )
  );

drop policy if exists "Users can view milestones for accessible projects" on public.payment_milestones;
create policy "Users can view milestones for accessible projects"
  on public.payment_milestones for select to authenticated
  using (public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert milestones for their projects" on public.payment_milestones;
create policy "Users can insert milestones for their projects"
  on public.payment_milestones for insert to authenticated
  with check (public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can update milestones for their projects" on public.payment_milestones;
create policy "Users can update milestones for their projects"
  on public.payment_milestones for update to authenticated
  using (public.can_access_assigned_gov_project(project_id))
  with check (public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can view uploads for accessible projects" on public.work_uploads;
create policy "Users can view uploads for accessible projects"
  on public.work_uploads for select to authenticated
  using (uploaded_by = auth.uid() or public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert own uploads" on public.work_uploads;
create policy "Users can insert own uploads"
  on public.work_uploads for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_access_assigned_gov_project(project_id));

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
  using (public.can_access_assigned_gov_project(project_id))
  with check (public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can view inspections for accessible projects" on public.inspection_reports;
create policy "Users can view inspections for accessible projects"
  on public.inspection_reports for select to authenticated
  using (inspected_by = auth.uid() or public.can_access_assigned_gov_project(project_id));

drop policy if exists "Users can insert inspections for their projects" on public.inspection_reports;
create policy "Users can insert inspections for their projects"
  on public.inspection_reports for insert to authenticated
  with check (inspected_by = auth.uid() and public.can_access_assigned_gov_project(project_id));

notify pgrst, 'reload schema';
