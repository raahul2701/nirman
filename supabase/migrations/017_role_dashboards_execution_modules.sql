-- Role dashboards, execution modules, BOQ study, survey quantity, material advance, MB, and RA bill alignment.

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

create table if not exists public.project_components (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  component_type text not null check (component_type in ('earthwork','gsb','wmm','dbm','bc','building','bridge','irrigation','phe','other')),
  component_name text not null,
  planned_quantity numeric not null default 0,
  executed_quantity numeric not null default 0,
  unit text not null default 'unit',
  progress_percent numeric not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_progress_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  component_id uuid references public.project_components(id) on delete set null,
  progress_date date not null default current_date,
  chainage_from text,
  chainage_to text,
  planned_quantity numeric not null default 0,
  executed_quantity numeric not null default 0,
  progress_percent numeric not null default 0,
  submitted_by uuid references public.profiles(id) on delete set null,
  submission_role text,
  remarks text,
  status text not null default 'draft' check (status in ('draft','submitted','verified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.agreement_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_url text,
  storage_path text,
  mime_type text,
  document_status text not null default 'uploaded' check (document_status in ('uploaded','processing','extracted','failed')),
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

alter table public.project_boq add column if not exists total_estimated_value numeric not null default 0;
alter table public.project_boq add column if not exists extraction_confidence numeric(5,2) not null default 0;
alter table public.project_boq add column if not exists extracted_at timestamptz;
alter table public.project_boq add column if not exists source_file_url text;
alter table public.project_boq add column if not exists updated_at timestamptz not null default now();

alter table public.boq_items add column if not exists workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade;
alter table public.boq_items add column if not exists project_id uuid;
alter table public.boq_items add column if not exists boq_id uuid references public.project_boq(id) on delete cascade;
alter table public.boq_items add column if not exists agreement_document_id uuid references public.agreement_documents(id) on delete set null;
alter table public.boq_items add column if not exists item_number text;
alter table public.boq_items add column if not exists item_code text;
alter table public.boq_items add column if not exists category text;
alter table public.boq_items add column if not exists work_type text;
alter table public.boq_items add column if not exists component_type text;
alter table public.boq_items add column if not exists completed_quantity numeric not null default 0;
alter table public.boq_items add column if not exists completion_percentage numeric not null default 0;
alter table public.boq_items add column if not exists technical_specification text;
alter table public.boq_items add column if not exists notes text;

create table if not exists public.survey_level_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  chainage text not null,
  tbm_reference text,
  benchmark_rl numeric,
  backsight numeric,
  intermediate_sight numeric,
  foresight numeric,
  calculated_rl numeric,
  formation_level numeric,
  existing_ground_level numeric,
  design_level numeric,
  layer_component_type text,
  remarks text,
  entry_date date not null default current_date,
  entered_by uuid references public.profiles(id) on delete set null,
  source_type text not null default 'manual_tbm' check (source_type in ('manual_tbm','auto_level','total_station','dgps','csv_excel')),
  created_at timestamptz not null default now()
);

create table if not exists public.survey_quantity_calculations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  survey_level_entry_id uuid references public.survey_level_entries(id) on delete cascade,
  level_difference numeric,
  required_crust_thickness_mm numeric,
  actual_available_thickness_mm numeric,
  deficiency_excess_mm numeric,
  earthwork_quantity numeric,
  layer_wise_quantity jsonb not null default '{}'::jsonb,
  progress_percent numeric,
  billing_quantity_impact numeric,
  warning text,
  ai_recommendation text,
  calculated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.material_advance_claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  contractor_id uuid references public.profiles(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  material_type text not null,
  quantity_received numeric not null default 0,
  unit text not null default 'unit',
  location_site text,
  supplier_name text,
  gst_invoice_number text,
  boq_item_id uuid references public.boq_items(id) on delete set null,
  agreement_reference text,
  submitted_value numeric not null default 0,
  ai_recommended_eligible_value numeric not null default 0,
  approved_value numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','rejected','paid','adjusted')),
  final_approval_note text not null default 'AI recommended eligible value only. Final approval subject to EE/department verification.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.material_advance_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  claim_id uuid not null references public.material_advance_claims(id) on delete cascade,
  document_type text not null check (document_type in ('bill_invoice','material_photo','delivery_challan','test_certificate','other')),
  file_name text not null,
  file_url text,
  storage_path text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.material_advance_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  claim_id uuid not null references public.material_advance_claims(id) on delete cascade,
  boq_relevance jsonb not null default '{}'::jsonb,
  quantity_reasonableness jsonb not null default '{}'::jsonb,
  ai_recommended_eligible_value numeric not null default 0,
  deduction_warning text,
  missing_document_warning text,
  quality_certificate_warning text,
  specification_reference text,
  legal_note text not null default 'AI recommended eligible value only. Final approval subject to EE/department verification.',
  created_at timestamptz not null default now()
);

create table if not exists public.measurement_book_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  boq_item_id uuid references public.boq_items(id) on delete set null,
  survey_level_entry_id uuid references public.survey_level_entries(id) on delete set null,
  mb_number text,
  measurement_date date not null default current_date,
  chainage text,
  length numeric,
  width numeric,
  depth numeric,
  quantity numeric not null default 0,
  entered_by uuid references public.profiles(id) on delete set null,
  checked_by uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','checked','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.ra_bill_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.executive_engineer_workspaces(id) on delete cascade,
  project_id uuid not null,
  contractor_id uuid references public.profiles(id) on delete set null,
  boq_item_id uuid references public.boq_items(id) on delete set null,
  measurement_book_entry_id uuid references public.measurement_book_entries(id) on delete set null,
  ra_bill_number text,
  item_quantity numeric not null default 0,
  rate numeric not null default 0,
  amount numeric generated always as (item_quantity * rate) stored,
  deductions numeric not null default 0,
  net_amount numeric generated always as ((item_quantity * rate) - deductions) stored,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','paid','rejected')),
  created_at timestamptz not null default now()
);

alter table public.project_components enable row level security;
alter table public.project_progress_items enable row level security;
alter table public.agreement_documents enable row level security;
alter table public.ai_project_study enable row level security;
alter table public.project_boq enable row level security;
alter table public.boq_items enable row level security;
alter table public.survey_level_entries enable row level security;
alter table public.survey_quantity_calculations enable row level security;
alter table public.material_advance_claims enable row level security;
alter table public.material_advance_documents enable row level security;
alter table public.material_advance_ai_reviews enable row level security;
alter table public.measurement_book_entries enable row level security;
alter table public.ra_bill_items enable row level security;

create or replace function public.is_project_field_user(target_workspace_id uuid, target_project_id uuid)
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
      and pa.access_status = 'active'
      and (
        pa.executive_engineer_id = auth.uid()
        or pa.assistant_engineer_id = auth.uid()
        or pa.junior_engineer_id = auth.uid()
        or pa.contractor_id = auth.uid()
      )
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'project_components',
    'project_progress_items',
    'agreement_documents',
    'ai_project_study',
    'boq_items',
    'survey_level_entries',
    'survey_quantity_calculations',
    'material_advance_claims',
    'material_advance_documents',
    'material_advance_ai_reviews',
    'measurement_book_entries',
    'ra_bill_items'
  ]
  loop
    execute format('drop policy if exists "%s project read" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s project insert" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s project update" on public.%I', table_name, table_name);
  end loop;
end $$;

create policy "project_components project read" on public.project_components
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or updated_by = auth.uid()
);
create policy "project_components project insert" on public.project_components
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or updated_by = auth.uid()
);
create policy "project_components project update" on public.project_components
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or updated_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or updated_by = auth.uid()
);

create policy "project_progress_items project read" on public.project_progress_items
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or submitted_by = auth.uid()
);
create policy "project_progress_items project insert" on public.project_progress_items
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
);
create policy "project_progress_items project update" on public.project_progress_items
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
);

create policy "agreement_documents project read" on public.agreement_documents
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or uploaded_by = auth.uid()
);
create policy "agreement_documents project insert" on public.agreement_documents
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
);
create policy "agreement_documents project update" on public.agreement_documents
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
);

create policy "ai_project_study project read" on public.ai_project_study
for select using (workspace_id is not null and public.can_access_project(workspace_id, project_id));
create policy "ai_project_study project insert" on public.ai_project_study
for insert with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));
create policy "ai_project_study project update" on public.ai_project_study
for update using (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));

drop policy if exists "project_boq read" on public.project_boq;
create policy "project_boq read" on public.project_boq
for select using (
  exists (select 1 from public.projects p where p.id = project_boq.project_id and p.owner_id = auth.uid())
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_boq.project_id
      and public.can_access_project(pa.workspace_id, pa.project_id)
  )
);

drop policy if exists "project_boq insert" on public.project_boq;
create policy "project_boq insert" on public.project_boq
for insert with check (
  exists (select 1 from public.projects p where p.id = project_boq.project_id and p.owner_id = auth.uid())
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_boq.project_id
      and public.is_project_field_user(pa.workspace_id, pa.project_id)
  )
);

drop policy if exists "project_boq update" on public.project_boq;
create policy "project_boq update" on public.project_boq
for update using (
  exists (select 1 from public.projects p where p.id = project_boq.project_id and p.owner_id = auth.uid())
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_boq.project_id
      and public.is_project_field_user(pa.workspace_id, pa.project_id)
  )
) with check (
  exists (select 1 from public.projects p where p.id = project_boq.project_id and p.owner_id = auth.uid())
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_boq.project_id
      and public.is_project_field_user(pa.workspace_id, pa.project_id)
  )
);

create policy "boq_items project read" on public.boq_items
for select using (
  (workspace_id is not null and project_id is not null and public.can_access_project(workspace_id, project_id))
  or exists (
    select 1
    from public.project_boq pb
    where pb.id = boq_items.boq_id
      and (
        exists (select 1 from public.projects p where p.id = pb.project_id and p.owner_id = auth.uid())
        or exists (
          select 1 from public.project_assignments pa
          where pa.project_id = pb.project_id and public.can_access_project(pa.workspace_id, pa.project_id)
        )
      )
  )
);
create policy "boq_items project insert" on public.boq_items
for insert with check (
  (workspace_id is not null and project_id is not null and public.is_project_field_user(workspace_id, project_id))
  or exists (
    select 1
    from public.project_boq pb
    where pb.id = boq_items.boq_id
      and (
        exists (select 1 from public.projects p where p.id = pb.project_id and p.owner_id = auth.uid())
        or exists (
          select 1 from public.project_assignments pa
          where pa.project_id = pb.project_id and public.is_project_field_user(pa.workspace_id, pa.project_id)
        )
      )
  )
);
create policy "boq_items project update" on public.boq_items
for update using (
  (workspace_id is not null and project_id is not null and public.is_project_field_user(workspace_id, project_id))
  or exists (
    select 1
    from public.project_boq pb
    where pb.id = boq_items.boq_id
      and (
        exists (select 1 from public.projects p where p.id = pb.project_id and p.owner_id = auth.uid())
        or exists (
          select 1 from public.project_assignments pa
          where pa.project_id = pb.project_id and public.is_project_field_user(pa.workspace_id, pa.project_id)
        )
      )
  )
) with check (
  (workspace_id is not null and project_id is not null and public.is_project_field_user(workspace_id, project_id))
  or exists (
    select 1
    from public.project_boq pb
    where pb.id = boq_items.boq_id
      and (
        exists (select 1 from public.projects p where p.id = pb.project_id and p.owner_id = auth.uid())
        or exists (
          select 1 from public.project_assignments pa
          where pa.project_id = pb.project_id and public.is_project_field_user(pa.workspace_id, pa.project_id)
        )
      )
  )
);

create policy "survey_level_entries project read" on public.survey_level_entries
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or entered_by = auth.uid()
);
create policy "survey_level_entries project insert" on public.survey_level_entries
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
);
create policy "survey_level_entries project update" on public.survey_level_entries
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
);

create policy "survey_quantity_calculations project read" on public.survey_quantity_calculations
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or calculated_by = auth.uid()
);
create policy "survey_quantity_calculations project insert" on public.survey_quantity_calculations
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or calculated_by = auth.uid()
);
create policy "survey_quantity_calculations project update" on public.survey_quantity_calculations
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or calculated_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or calculated_by = auth.uid()
);

create policy "material_advance_claims project read" on public.material_advance_claims
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or submitted_by = auth.uid()
  or contractor_id = auth.uid()
);
create policy "material_advance_claims project insert" on public.material_advance_claims
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
  or contractor_id = auth.uid()
);
create policy "material_advance_claims project update" on public.material_advance_claims
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
  or contractor_id = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or submitted_by = auth.uid()
  or contractor_id = auth.uid()
);

create policy "material_advance_documents project read" on public.material_advance_documents
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or uploaded_by = auth.uid()
);
create policy "material_advance_documents project insert" on public.material_advance_documents
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
);
create policy "material_advance_documents project update" on public.material_advance_documents
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or uploaded_by = auth.uid()
);

create policy "material_advance_ai_reviews project read" on public.material_advance_ai_reviews
for select using (workspace_id is not null and public.can_access_project(workspace_id, project_id));
create policy "material_advance_ai_reviews project insert" on public.material_advance_ai_reviews
for insert with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));
create policy "material_advance_ai_reviews project update" on public.material_advance_ai_reviews
for update using (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
with check (workspace_id is not null and public.is_project_field_user(workspace_id, project_id));

create policy "measurement_book_entries project read" on public.measurement_book_entries
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or entered_by = auth.uid()
  or checked_by = auth.uid()
);
create policy "measurement_book_entries project insert" on public.measurement_book_entries
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
);
create policy "measurement_book_entries project update" on public.measurement_book_entries
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
  or checked_by = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or entered_by = auth.uid()
  or checked_by = auth.uid()
);

create policy "ra_bill_items project read" on public.ra_bill_items
for select using (
  (workspace_id is not null and public.can_access_project(workspace_id, project_id))
  or contractor_id = auth.uid()
);
create policy "ra_bill_items project insert" on public.ra_bill_items
for insert with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or contractor_id = auth.uid()
);
create policy "ra_bill_items project update" on public.ra_bill_items
for update using (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or contractor_id = auth.uid()
) with check (
  (workspace_id is not null and public.is_project_field_user(workspace_id, project_id))
  or contractor_id = auth.uid()
);

create index if not exists idx_project_components_workspace_project on public.project_components(workspace_id, project_id);
create index if not exists idx_project_progress_workspace_project on public.project_progress_items(workspace_id, project_id, progress_date);
create index if not exists idx_project_boq_project on public.project_boq(project_id);
create index if not exists idx_boq_items_workspace_project on public.boq_items(workspace_id, project_id);
create index if not exists idx_boq_items_boq on public.boq_items(boq_id);
create index if not exists idx_agreement_documents_workspace_project on public.agreement_documents(workspace_id, project_id);
create index if not exists idx_survey_entries_workspace_project on public.survey_level_entries(workspace_id, project_id, entry_date);
create index if not exists idx_material_advance_workspace_project on public.material_advance_claims(workspace_id, project_id, status);
create index if not exists idx_mb_entries_workspace_project on public.measurement_book_entries(workspace_id, project_id, measurement_date);
create index if not exists idx_ra_bill_workspace_project on public.ra_bill_items(workspace_id, project_id, status);
