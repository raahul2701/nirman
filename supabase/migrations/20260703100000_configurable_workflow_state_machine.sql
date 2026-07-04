-- Configurable workflow state machine for the broader PWD ERP backend.
-- This migration is idempotent and self-contained.

create extension if not exists pgcrypto;

create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null unique,
  display_name text not null,
  description text,
  entity_type text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_states (
  id uuid primary key default gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  state_key text not null,
  display_name text not null,
  sequence integer not null default 0,
  is_initial boolean not null default false,
  is_terminal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_definition_id, state_key)
);

create table if not exists public.workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  from_state text not null,
  to_state text not null,
  allowed_role text not null default 'any',
  allowed_action text not null,
  requires_signature boolean not null default false,
  requires_attachment boolean not null default false,
  requires_remarks boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_definition_id, from_state, to_state, allowed_role, allowed_action)
);

create index if not exists idx_workflow_definitions_key on public.workflow_definitions(workflow_key);
create index if not exists idx_workflow_states_definition on public.workflow_states(workflow_definition_id, sequence);
create index if not exists idx_workflow_transitions_definition on public.workflow_transitions(workflow_definition_id, from_state, allowed_action);

alter table public.workflow_instances
  add column if not exists workflow_definition_id uuid references public.workflow_definitions(id) on delete set null;

alter table public.workflow_instances
  add column if not exists current_stage_code text;

alter table public.workflow_instances
  add column if not exists current_state_key text;

alter table public.workflow_instances
  add column if not exists assigned_role text;

alter table public.workflow_instances
  add column if not exists latest_transition_id uuid;

create index if not exists idx_workflow_instances_definition on public.workflow_instances(workflow_definition_id, status);

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('dpr', 'DPR Workflow', 'Daily progress report workflow', 'dpr')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('measurement_book', 'Measurement Book Workflow', 'Measurement book workflow', 'measurement_book')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('material_verification', 'Material Verification Workflow', 'Material verification workflow', 'material_verification')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('ra_bill', 'RA Bill Workflow', 'RA bill workflow', 'ra_bill')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('drawing_approval', 'Drawing Approval Workflow', 'Drawing approval workflow', 'drawing_approval')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('extension', 'Extension Workflow', 'Extension workflow', 'extension')
on conflict (workflow_key) do nothing;

insert into public.workflow_definitions (workflow_key, display_name, description, entity_type)
values
  ('ncr', 'NCR Workflow', 'Non-conformance report workflow', 'ncr')
on conflict (workflow_key) do nothing;

with defs as (
  select id, workflow_key from public.workflow_definitions
)
insert into public.workflow_states (workflow_definition_id, state_key, display_name, sequence, is_initial, is_terminal)
select d.id, state_key, display_name, sequence, is_initial, is_terminal
from defs d
join (
  values
    ('dpr','draft','Draft',1,true,false),
    ('dpr','submitted','Submitted',2,false,false),
    ('dpr','approved','Approved',3,false,true),
    ('dpr','rejected','Rejected',4,false,true),
    ('dpr','returned','Returned',5,false,false),
    ('measurement_book','draft','Draft',1,true,false),
    ('measurement_book','submitted','Submitted',2,false,false),
    ('measurement_book','approved','Approved',3,false,true),
    ('measurement_book','rejected','Rejected',4,false,true),
    ('measurement_book','returned','Returned',5,false,false),
    ('material_verification','draft','Draft',1,true,false),
    ('material_verification','submitted','Submitted',2,false,false),
    ('material_verification','approved','Approved',3,false,true),
    ('material_verification','rejected','Rejected',4,false,true),
    ('material_verification','returned','Returned',5,false,false),
    ('ra_bill','draft','Draft',1,true,false),
    ('ra_bill','submitted','Submitted',2,false,false),
    ('ra_bill','approved','Approved',3,false,true),
    ('ra_bill','rejected','Rejected',4,false,true),
    ('ra_bill','returned','Returned',5,false,false),
    ('drawing_approval','draft','Draft',1,true,false),
    ('drawing_approval','submitted','Submitted',2,false,false),
    ('drawing_approval','approved','Approved',3,false,true),
    ('drawing_approval','rejected','Rejected',4,false,true),
    ('drawing_approval','returned','Returned',5,false,false),
    ('extension','draft','Draft',1,true,false),
    ('extension','submitted','Submitted',2,false,false),
    ('extension','approved','Approved',3,false,true),
    ('extension','rejected','Rejected',4,false,true),
    ('extension','returned','Returned',5,false,false),
    ('ncr','draft','Draft',1,true,false),
    ('ncr','submitted','Submitted',2,false,false),
    ('ncr','approved','Approved',3,false,true),
    ('ncr','rejected','Rejected',4,false,true),
    ('ncr','returned','Returned',5,false,false)
) as v(workflow_key, state_key, display_name, sequence, is_initial, is_terminal)
on d.workflow_key = v.workflow_key
on conflict (workflow_definition_id, state_key) do nothing;

with defs as (
  select id, workflow_key from public.workflow_definitions
)
insert into public.workflow_transitions (workflow_definition_id, from_state, to_state, allowed_role, allowed_action, requires_signature, requires_attachment, requires_remarks)
select d.id, from_state, to_state, allowed_role, allowed_action, requires_signature, requires_attachment, requires_remarks
from defs d
join (
  values
    ('dpr','draft','submitted','any','submit',false,false,true),
    ('dpr','submitted','approved','any','approve',false,false,false),
    ('dpr','submitted','rejected','any','reject',false,false,true),
    ('dpr','submitted','returned','any','return',false,false,true),
    ('measurement_book','draft','submitted','any','submit',false,false,true),
    ('measurement_book','submitted','approved','any','approve',false,false,false),
    ('measurement_book','submitted','rejected','any','reject',false,false,true),
    ('measurement_book','submitted','returned','any','return',false,false,true),
    ('material_verification','draft','submitted','any','submit',false,false,true),
    ('material_verification','submitted','approved','any','approve',false,false,false),
    ('material_verification','submitted','rejected','any','reject',false,false,true),
    ('material_verification','submitted','returned','any','return',false,false,true),
    ('ra_bill','draft','submitted','any','submit',false,false,true),
    ('ra_bill','submitted','approved','any','approve',false,false,false),
    ('ra_bill','submitted','rejected','any','reject',false,false,true),
    ('ra_bill','submitted','returned','any','return',false,false,true),
    ('drawing_approval','draft','submitted','any','submit',false,false,true),
    ('drawing_approval','submitted','approved','any','approve',false,false,false),
    ('drawing_approval','submitted','rejected','any','reject',false,false,true),
    ('drawing_approval','submitted','returned','any','return',false,false,true),
    ('extension','draft','submitted','any','submit',false,false,true),
    ('extension','submitted','approved','any','approve',false,false,false),
    ('extension','submitted','rejected','any','reject',false,false,true),
    ('extension','submitted','returned','any','return',false,false,true),
    ('ncr','draft','submitted','any','submit',false,false,true),
    ('ncr','submitted','approved','any','approve',false,false,false),
    ('ncr','submitted','rejected','any','reject',false,false,true),
    ('ncr','submitted','returned','any','return',false,false,true)
) as v(workflow_key, from_state, to_state, allowed_role, allowed_action, requires_signature, requires_attachment, requires_remarks)
on d.workflow_key = v.workflow_key
on conflict (workflow_definition_id, from_state, to_state, allowed_role, allowed_action) do nothing;
