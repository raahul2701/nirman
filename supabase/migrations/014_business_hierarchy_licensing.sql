-- Business hierarchy, workspace isolation, and contractor licensing.
-- Government users are free lifetime users. Contractors are billed per active project licence.

create extension if not exists "pgcrypto";

create table if not exists public.executive_engineer_workspaces (
  id uuid primary key default gen_random_uuid(),
  executive_engineer_id uuid not null references public.profiles(id) on delete cascade,
  workspace_name text not null,
  division_code text,
  department text,
  district text,
  drive_root_folder_id text,
  storage_namespace text not null unique default ('ee_' || replace(gen_random_uuid()::text, '-', '')),
  status text not null default 'active' check (status in ('active', 'setup_pending', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('executive_engineer', 'assistant_engineer', 'junior_engineer', 'contractor', 'admin_viewer')),
  parent_user_id uuid references public.profiles(id) on delete set null,
  subdivision_name text,
  free_lifetime boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  project_table text not null default 'gov_projects',
  executive_engineer_id uuid not null references public.profiles(id) on delete cascade,
  assistant_engineer_id uuid references public.profiles(id) on delete set null,
  junior_engineer_id uuid references public.profiles(id) on delete set null,
  contractor_id uuid references public.profiles(id) on delete set null,
  contractor_company_name text,
  access_status text not null default 'active' check (access_status in ('active', 'locked', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.contractor_licenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  contractor_company_name text not null,
  contractor_user_count integer not null default 1 check (contractor_user_count >= 0),
  minimum_billable_users integer not null default 10 check (minimum_billable_users >= 10),
  price_per_user_month numeric(12,2) not null default 270,
  billable_users integer generated always as (greatest(contractor_user_count, minimum_billable_users)) stored,
  monthly_amount numeric(12,2) generated always as (greatest(contractor_user_count, minimum_billable_users) * price_per_user_month) stored,
  license_status text not null default 'trial' check (license_status in ('active', 'trial', 'expired', 'suspended')),
  billing_owner text not null default 'contractor' check (billing_owner = 'contractor'),
  recommended_by_executive_engineer_id uuid references public.profiles(id) on delete set null,
  approved_by_executive_engineer_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz,
  expires_at timestamptz,
  grace_until timestamptz,
  renewal_alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, contractor_id)
);

create table if not exists public.contractor_license_users (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.contractor_licenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (license_id, user_id, project_id)
);

create table if not exists public.contractor_billing_cycles (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.contractor_licenses(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  actual_users integer not null,
  billable_users integer not null,
  amount numeric(12,2) not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'waived')),
  payment_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_google_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  google_project_id text,
  drive_root_folder_id text,
  maps_api_status text not null default 'not_configured',
  gemini_api_status text not null default 'not_configured',
  drive_api_status text not null default 'not_configured',
  setup_status text not null default 'manual_pending' check (setup_status in ('manual_pending', 'connected', 'error', 'disabled')),
  encrypted_gemini_key_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.workspace_drive_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid,
  folder_type text not null check (folder_type in ('root', 'projects', 'project', 'dpr', 'qc', 'tpa', 'mb', 'bills', 'drawings', 'diesel', 'hindrance', 'gis', 'photos', 'videos', 'contractors', 'reports', 'archive')),
  folder_name text not null,
  drive_folder_id text not null,
  parent_drive_folder_id text,
  created_at timestamptz not null default now(),
  unique (workspace_id, project_id, folder_type)
);

create table if not exists public.document_metadata (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  owner_executive_engineer_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid,
  contractor_id uuid references public.profiles(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  document_type text not null check (document_type in ('agreement', 'dpr', 'qc', 'tpa', 'mb', 'bill', 'drawing', 'diesel', 'hindrance', 'gis', 'photo', 'video', 'contractor_document', 'ai_report', 'other')),
  drive_file_id text not null,
  drive_folder_id text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  ai_report_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contractor_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  recommended_by_executive_engineer_id uuid not null references public.profiles(id) on delete cascade,
  contractor_name text not null,
  contractor_email text,
  contractor_phone text,
  contractor_company_name text,
  project_ids uuid[] not null default '{}',
  onboarding_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'recommended' check (status in ('recommended', 'invited', 'registered', 'approved', 'rejected', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_ai_context (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  contractor_id uuid references public.profiles(id) on delete set null,
  material_quality_history jsonb not null default '[]'::jsonb,
  contractor_risk_score numeric(5,2) not null default 0,
  delay_pattern jsonb not null default '{}'::jsonb,
  diesel_anomalies jsonb not null default '[]'::jsonb,
  document_audit_history jsonb not null default '[]'::jsonb,
  ai_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (workspace_id, project_id)
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
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

create or replace function public.can_access_project(target_workspace_id uuid, target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_users wu
    left join public.project_assignments pa
      on pa.workspace_id = wu.workspace_id
      and pa.project_id = target_project_id
    where wu.workspace_id = target_workspace_id
      and wu.user_id = auth.uid()
      and wu.active = true
      and (
        wu.role in ('executive_engineer', 'admin_viewer')
        or pa.assistant_engineer_id = auth.uid()
        or pa.junior_engineer_id = auth.uid()
        or pa.contractor_id = auth.uid()
      )
  );
$$;

alter table public.executive_engineer_workspaces enable row level security;
alter table public.workspace_users enable row level security;
alter table public.project_assignments enable row level security;
alter table public.contractor_licenses enable row level security;
alter table public.contractor_license_users enable row level security;
alter table public.contractor_billing_cycles enable row level security;
alter table public.workspace_google_connections enable row level security;
alter table public.workspace_drive_folders enable row level security;
alter table public.document_metadata enable row level security;
alter table public.contractor_recommendations enable row level security;
alter table public.project_ai_context enable row level security;

drop policy if exists "workspace members read workspaces" on public.executive_engineer_workspaces;
create policy "workspace members read workspaces" on public.executive_engineer_workspaces
for select using (public.is_workspace_member(id));

drop policy if exists "ee owns workspace writes" on public.executive_engineer_workspaces;
create policy "ee owns workspace writes" on public.executive_engineer_workspaces
for all using (executive_engineer_id = auth.uid()) with check (executive_engineer_id = auth.uid());

drop policy if exists "workspace members read users" on public.workspace_users;
create policy "workspace members read users" on public.workspace_users
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "ee manages workspace users" on public.workspace_users;
create policy "ee manages workspace users" on public.workspace_users
for all using (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
) with check (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
);

drop policy if exists "project hierarchy read" on public.project_assignments;
create policy "project hierarchy read" on public.project_assignments
for select using (public.can_access_project(workspace_id, project_id));

drop policy if exists "ee manages project hierarchy" on public.project_assignments;
create policy "ee manages project hierarchy" on public.project_assignments
for all using (executive_engineer_id = auth.uid()) with check (executive_engineer_id = auth.uid());

drop policy if exists "workspace billing read" on public.contractor_licenses;
create policy "workspace billing read" on public.contractor_licenses
for select using (public.is_workspace_member(workspace_id) and (contractor_id = auth.uid() or public.is_workspace_member(workspace_id)));

drop policy if exists "ee manages contractor licenses" on public.contractor_licenses;
create policy "ee manages contractor licenses" on public.contractor_licenses
for all using (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
) with check (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
);

drop policy if exists "license users read by workspace" on public.contractor_license_users;
create policy "license users read by workspace" on public.contractor_license_users
for select using (
  exists (
    select 1 from public.contractor_licenses cl
    where cl.id = license_id and public.is_workspace_member(cl.workspace_id)
  )
);

drop policy if exists "billing cycles read by workspace" on public.contractor_billing_cycles;
create policy "billing cycles read by workspace" on public.contractor_billing_cycles
for select using (
  exists (
    select 1 from public.contractor_licenses cl
    where cl.id = license_id and public.is_workspace_member(cl.workspace_id)
  )
);

drop policy if exists "workspace google read" on public.workspace_google_connections;
create policy "workspace google read" on public.workspace_google_connections
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "ee manages google connections" on public.workspace_google_connections;
create policy "ee manages google connections" on public.workspace_google_connections
for all using (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
) with check (
  exists (select 1 from public.executive_engineer_workspaces w where w.id = workspace_id and w.executive_engineer_id = auth.uid())
);

drop policy if exists "workspace drive folders read" on public.workspace_drive_folders;
create policy "workspace drive folders read" on public.workspace_drive_folders
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "project documents isolated read" on public.document_metadata;
create policy "project documents isolated read" on public.document_metadata
for select using (
  public.is_workspace_member(workspace_id)
  and (project_id is null or public.can_access_project(workspace_id, project_id))
  and (contractor_id is null or contractor_id = auth.uid() or exists (
    select 1 from public.workspace_users wu
    where wu.workspace_id = document_metadata.workspace_id
      and wu.user_id = auth.uid()
      and wu.role in ('executive_engineer', 'assistant_engineer', 'junior_engineer', 'admin_viewer')
      and wu.active = true
  ))
);

drop policy if exists "workspace users insert document metadata" on public.document_metadata;
create policy "workspace users insert document metadata" on public.document_metadata
for insert with check (
  uploaded_by = auth.uid()
  and public.is_workspace_member(workspace_id)
  and (project_id is null or public.can_access_project(workspace_id, project_id))
);

drop policy if exists "recommendations read by workspace" on public.contractor_recommendations;
create policy "recommendations read by workspace" on public.contractor_recommendations
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "ee manages recommendations" on public.contractor_recommendations;
create policy "ee manages recommendations" on public.contractor_recommendations
for all using (recommended_by_executive_engineer_id = auth.uid()) with check (recommended_by_executive_engineer_id = auth.uid());

drop policy if exists "project ai context isolated read" on public.project_ai_context;
create policy "project ai context isolated read" on public.project_ai_context
for select using (public.can_access_project(workspace_id, project_id));

create index if not exists idx_workspace_users_user on public.workspace_users(user_id, active);
create index if not exists idx_project_assignments_workspace_project on public.project_assignments(workspace_id, project_id);
create unique index if not exists idx_project_assignments_unique_contractor
on public.project_assignments(workspace_id, project_id, coalesce(contractor_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists idx_project_assignments_contractor on public.project_assignments(contractor_id);
create index if not exists idx_contractor_licenses_workspace on public.contractor_licenses(workspace_id, license_status);
create index if not exists idx_document_metadata_workspace_project on public.document_metadata(workspace_id, project_id, document_type);
create index if not exists idx_project_ai_context_workspace_project on public.project_ai_context(workspace_id, project_id);
