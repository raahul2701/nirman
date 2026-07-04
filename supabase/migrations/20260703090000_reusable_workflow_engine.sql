-- Reusable workflow engine for the broader PWD ERP ecosystem.
-- This migration is self-contained, idempotent, and avoids JE/AE/EE assumptions.

create extension if not exists pgcrypto;

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  title text,
  current_stage_code text not null default 'submitted',
  status text not null default 'submitted' check (status in ('draft','submitted','in_review','approved','rejected','returned','cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_stage_history (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  stage_code text not null,
  stage_name text not null,
  status text not null default 'submitted' check (status in ('draft','submitted','in_review','approved','rejected','returned','cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  remarks text,
  metadata jsonb not null default '{}'::jsonb,
  entered_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('submit','approve','return','reject','cancel','comment')),
  from_status text check (from_status in ('draft','submitted','in_review','approved','rejected','returned','cancelled')),
  to_status text check (to_status in ('draft','submitted','in_review','approved','rejected','returned','cancelled')),
  remarks text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_attachments (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size_bytes integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_notifications (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app','email','sms','whatsapp')),
  subject text,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_revisions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  revision_number integer not null default 1,
  changed_by uuid references public.profiles(id) on delete set null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, revision_number)
);

create table if not exists public.workflow_context (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_instances(id) on delete cascade,
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  project_id uuid,
  key_name text not null,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_instances_workspace_project on public.workflow_instances(workspace_id, project_id, status, created_at desc);
create index if not exists idx_workflow_instances_entity on public.workflow_instances(entity_type, entity_id);
create index if not exists idx_workflow_stage_history_workflow on public.workflow_stage_history(workflow_id, entered_at desc);
create index if not exists idx_workflow_actions_workflow on public.workflow_actions(workflow_id, created_at desc);
create index if not exists idx_workflow_attachments_workflow on public.workflow_attachments(workflow_id, created_at desc);
create index if not exists idx_workflow_notifications_recipient on public.workflow_notifications(recipient_id, status, created_at desc);
create index if not exists idx_workflow_revisions_workflow on public.workflow_revisions(workflow_id, revision_number desc);
create index if not exists idx_workflow_context_workflow on public.workflow_context(workflow_id, key_name);

alter table public.workflow_instances enable row level security;
alter table public.workflow_stage_history enable row level security;
alter table public.workflow_actions enable row level security;
alter table public.workflow_attachments enable row level security;
alter table public.workflow_notifications enable row level security;
alter table public.workflow_revisions enable row level security;
alter table public.workflow_context enable row level security;

drop policy if exists "workflow instances access" on public.workflow_instances;
create policy "workflow instances access" on public.workflow_instances
for all to authenticated
using (public.can_access_project(workspace_id, project_id));

create or replace function public.ensure_workflow_stage_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.workflow_stage_history(workflow_id, workspace_id, project_id, stage_code, stage_name, status, assigned_to, remarks, metadata)
    values (
      new.id,
      new.workspace_id,
      new.project_id,
      coalesce(new.current_stage_code, 'submitted'),
      coalesce(new.title, 'Workflow created'),
      new.status,
      new.assigned_to,
      'Workflow created',
      coalesce(new.context, '{}'::jsonb)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists workflow_instances_stage_history on public.workflow_instances;
create trigger workflow_instances_stage_history
after insert on public.workflow_instances
for each row
execute function public.ensure_workflow_stage_history();

alter table public.audit_logs
  add column if not exists workspace_id uuid references public.executive_engineer_workspaces(id) on delete set null,
  add column if not exists project_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.approval_requests
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists stage_code text,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists context jsonb not null default '{}'::jsonb;

alter table public.approval_actions
  add column if not exists stage_code text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_approval_requests_entity on public.approval_requests(entity_type, entity_id);
create index if not exists idx_approval_actions_workflow on public.approval_actions(request_id, created_at desc);
