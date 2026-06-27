-- Production repair for Agreement & BOQ upload.
-- Aligns the existing production schema with the app's workspace/upload expectations
-- without replacing frontend table usage.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  company text default '',
  role text default 'worker',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
check (role in (
  'super_admin',
  'admin',
  'admin_viewer',
  'project_manager',
  'executive_engineer',
  'assistant_engineer',
  'junior_engineer',
  'site_engineer',
  'labor_supervisor',
  'contractor',
  'gov_official',
  'worker'
));

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'User'), '@', 1)),
  'executive_engineer'
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
  role = case when public.profiles.role in ('worker', 'gov_official') then 'executive_engineer' else public.profiles.role end,
  updated_at = now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default '',
  message text not null default '',
  type text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.executive_engineer_workspaces add column if not exists executive_engineer_id uuid references public.profiles(id) on delete cascade;
alter table public.executive_engineer_workspaces add column if not exists workspace_name text;
alter table public.executive_engineer_workspaces add column if not exists division_code text;
alter table public.executive_engineer_workspaces add column if not exists department text;
alter table public.executive_engineer_workspaces add column if not exists district text;
alter table public.executive_engineer_workspaces add column if not exists drive_root_folder_id text;
alter table public.executive_engineer_workspaces add column if not exists storage_namespace text;
alter table public.executive_engineer_workspaces add column if not exists status text not null default 'active';
alter table public.executive_engineer_workspaces add column if not exists updated_at timestamptz not null default now();

update public.executive_engineer_workspaces
set
  workspace_name = coalesce(workspace_name, executive_engineer_name, workspace_code, 'NIRMAN Workspace'),
  drive_root_folder_id = coalesce(drive_root_folder_id, google_drive_root_folder_id),
  storage_namespace = coalesce(storage_namespace, 'ee_' || replace(id::text, '-', '')),
  status = coalesce(status, 'active'),
  updated_at = now();

insert into public.executive_engineer_workspaces (
  executive_engineer_name,
  executive_engineer_email,
  workspace_code,
  executive_engineer_id,
  workspace_name,
  division_code,
  department,
  district,
  storage_namespace,
  status
)
select
  coalesce(nullif(p.full_name, ''), split_part(coalesce(p.email, 'Executive Engineer'), '@', 1), 'Executive Engineer'),
  p.email,
  'DEFAULT',
  p.id,
  'NIRMAN Workspace',
  'DEFAULT',
  'Public Works',
  null,
  'ee_' || replace(p.id::text, '-', ''),
  'active'
from public.profiles p
where not exists (select 1 from public.executive_engineer_workspaces)
limit 1;

alter table public.workspace_users add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.workspace_users add column if not exists parent_user_id uuid references public.profiles(id) on delete set null;
alter table public.workspace_users add column if not exists subdivision_name text;
alter table public.workspace_users add column if not exists free_lifetime boolean not null default true;
alter table public.workspace_users add column if not exists active boolean not null default true;

update public.workspace_users
set active = coalesce(active, is_active, true);

insert into public.workspace_users (workspace_id, user_id, role, full_name, email, active, free_lifetime)
select
  w.id,
  w.executive_engineer_id,
  'executive_engineer',
  coalesce(p.full_name, 'Executive Engineer'),
  p.email,
  true,
  true
from public.executive_engineer_workspaces w
join public.profiles p on p.id = w.executive_engineer_id
where w.executive_engineer_id is not null
  and not exists (
    select 1
    from public.workspace_users wu
    where wu.workspace_id = w.id
      and wu.user_id = w.executive_engineer_id
  );

alter table public.project_assignments add column if not exists workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade;
alter table public.project_assignments drop constraint if exists project_assignments_project_id_fkey;
alter table public.project_assignments add column if not exists project_table text not null default 'gov_projects';
alter table public.project_assignments add column if not exists executive_engineer_id uuid references public.profiles(id) on delete cascade;
alter table public.project_assignments add column if not exists assistant_engineer_id uuid references public.profiles(id) on delete set null;
alter table public.project_assignments add column if not exists junior_engineer_id uuid references public.profiles(id) on delete set null;
alter table public.project_assignments add column if not exists contractor_id uuid references public.profiles(id) on delete set null;
alter table public.project_assignments add column if not exists contractor_company_name text;

insert into public.project_assignments (
  workspace_id,
  project_id,
  project_table,
  executive_engineer_id,
  access_status
)
select
  w.id,
  gp.id,
  'gov_projects',
  w.executive_engineer_id,
  'active'
from public.executive_engineer_workspaces w
cross join public.gov_projects gp
where w.executive_engineer_id is not null
  and not exists (
    select 1
    from public.project_assignments pa
    where pa.workspace_id = w.id
      and pa.project_id = gp.id
  );

create table if not exists public.workspace_google_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  google_project_id text,
  drive_root_folder_id text,
  maps_api_status text not null default 'not_configured',
  gemini_api_status text not null default 'not_configured',
  drive_api_status text not null default 'not_configured',
  setup_status text not null default 'manual_pending',
  encrypted_gemini_key_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

insert into public.workspace_google_connections (workspace_id, drive_root_folder_id, setup_status)
select id, drive_root_folder_id, 'manual_pending'
from public.executive_engineer_workspaces
on conflict (workspace_id) do nothing;

create or replace function public.can_access_project(target_workspace_id uuid, target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    where pa.workspace_id = target_workspace_id
      and pa.project_id = target_project_id
      and pa.access_status in ('active', 'pilot')
      and (
        pa.executive_engineer_id = auth.uid()
        or pa.assistant_engineer_id = auth.uid()
        or pa.junior_engineer_id = auth.uid()
        or pa.contractor_id = auth.uid()
      )
  );
$$;

create or replace function public.is_project_field_user(target_workspace_id uuid, target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_project(target_workspace_id, target_project_id);
$$;

create table if not exists public.agreement_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_url text,
  storage_path text,
  mime_type text,
  document_status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_project_study (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  agreement_document_id uuid references public.agreement_documents(id) on delete set null,
  extracted_boq jsonb not null default '[]'::jsonb,
  technical_specifications jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  bg_terms jsonb not null default '{}'::jsonb,
  sd_terms jsonb not null default '{}'::jsonb,
  dlp_terms jsonb not null default '{}'::jsonb,
  payment_terms jsonb not null default '{}'::jsonb,
  completion_schedule jsonb not null default '{}'::jsonb,
  important_clauses jsonb not null default '[]'::jsonb,
  confidence_score numeric(5,2) not null default 0,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_boq (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  total_estimated_value numeric not null default 0,
  extraction_confidence numeric(5,2) not null default 0,
  extracted_at timestamptz,
  source_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boq_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid,
  boq_id uuid references public.project_boq(id) on delete cascade,
  agreement_document_id uuid references public.agreement_documents(id) on delete set null,
  item_number text,
  item_code text,
  description text not null,
  category text,
  work_type text,
  component_type text,
  unit text not null,
  quantity numeric not null default 0,
  rate numeric not null default 0,
  amount numeric not null default 0,
  completed_quantity numeric not null default 0,
  completion_percentage numeric not null default 0,
  technical_specification text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.agreement_documents add column if not exists role text;
alter table public.agreement_documents add column if not exists document_type text not null default 'agreement';
alter table public.agreement_documents add column if not exists module_name text not null default 'agreement_boq';
alter table public.agreement_documents add column if not exists original_filename text;
alter table public.agreement_documents add column if not exists storage_provider text not null default 'supabase';
alter table public.agreement_documents add column if not exists supabase_path text;
alter table public.agreement_documents add column if not exists google_drive_file_id text;
alter table public.agreement_documents add column if not exists google_drive_folder_id text;
alter table public.agreement_documents add column if not exists google_drive_sync_status text not null default 'google_drive_sync_pending';
alter table public.agreement_documents add column if not exists drive_folder_path text;
alter table public.agreement_documents add column if not exists ai_processing_status text not null default 'uploaded';
alter table public.agreement_documents add column if not exists ai_error_message text;
alter table public.agreement_documents add column if not exists updated_at timestamptz not null default now();

alter table public.document_metadata add column if not exists owner_executive_engineer_id uuid references public.profiles(id) on delete cascade;
alter table public.document_metadata add column if not exists contractor_id uuid references public.profiles(id) on delete set null;
alter table public.document_metadata add column if not exists role text;
alter table public.document_metadata add column if not exists module_name text;
alter table public.document_metadata add column if not exists original_filename text;
alter table public.document_metadata add column if not exists mime_type text;
alter table public.document_metadata add column if not exists size_bytes bigint;
alter table public.document_metadata add column if not exists storage_provider text;
alter table public.document_metadata add column if not exists supabase_path text;
alter table public.document_metadata add column if not exists google_drive_file_id text;
alter table public.document_metadata add column if not exists google_drive_folder_id text;
alter table public.document_metadata add column if not exists file_url text;
alter table public.document_metadata add column if not exists ai_processing_status text;
alter table public.document_metadata add column if not exists google_drive_sync_status text;
alter table public.document_metadata add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.agreement_documents enable row level security;
alter table public.ai_project_study enable row level security;
alter table public.boq_items enable row level security;
alter table public.document_metadata enable row level security;

drop policy if exists "agreement_documents project read" on public.agreement_documents;
create policy "agreement_documents project read" on public.agreement_documents
for select using (workspace_id is not null and public.can_access_project(workspace_id, project_id));

drop policy if exists "agreement_documents project insert" on public.agreement_documents;
create policy "agreement_documents project insert" on public.agreement_documents
for insert with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));

drop policy if exists "agreement_documents project update" on public.agreement_documents;
create policy "agreement_documents project update" on public.agreement_documents
for update using (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));

drop policy if exists "boq_items project read" on public.boq_items;
create policy "boq_items project read" on public.boq_items
for select using (workspace_id is not null and public.can_access_project(workspace_id, project_id));

drop policy if exists "boq_items project insert" on public.boq_items;
create policy "boq_items project insert" on public.boq_items
for insert with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));

drop policy if exists "document metadata project insert" on public.document_metadata;
create policy "document metadata project insert" on public.document_metadata
for insert with check (workspace_id is not null and public.can_access_project(workspace_id, project_id));

drop policy if exists "document metadata project read" on public.document_metadata;
create policy "document metadata project read" on public.document_metadata
for select using (workspace_id is not null and public.can_access_project(workspace_id, project_id));

create index if not exists idx_agreement_documents_workspace_project on public.agreement_documents(workspace_id, project_id);
create index if not exists idx_agreement_documents_ai_status on public.agreement_documents(workspace_id, project_id, ai_processing_status);
create index if not exists idx_boq_items_workspace_project on public.boq_items(workspace_id, project_id);
create index if not exists idx_document_metadata_module on public.document_metadata(workspace_id, project_id, module_name);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  104857600,
  array[
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'video/mp4'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users can upload project files" on storage.objects;
create policy "authenticated users can upload project files" on storage.objects
for insert to authenticated
with check (bucket_id in ('project-files', 'reports', 'field-uploads'));

drop policy if exists "owners can read project files" on storage.objects;
create policy "owners can read project files" on storage.objects
for select to authenticated
using (bucket_id in ('project-files', 'reports', 'field-uploads'));

drop policy if exists "owners can update project files" on storage.objects;
create policy "owners can update project files" on storage.objects
for update to authenticated
using (bucket_id in ('project-files', 'reports', 'field-uploads'))
with check (bucket_id in ('project-files', 'reports', 'field-uploads'));
