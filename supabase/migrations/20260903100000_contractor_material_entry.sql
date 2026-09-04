begin;

-- ===========================================================================
-- Contractor Material Entry — additive reuse of the LIVE production inventory
-- model
-- ---------------------------------------------------------------------------
-- Production is the source of truth. The live tables are:
--   materials:          id, site_id, material_name (NOT NULL), category,
--                       unit, current_quantity, threshold_quantity,
--                       unit_price, supplier_id, barcode, qr_code,
--                       last_updated, created_at
--   stock_transactions: id, material_id, site_id, transaction_type (NOT NULL),
--                       quantity, unit_price, total_amount, done_by, notes,
--                       transaction_date
-- Both tables are EMPTY and RLS-enabled with ZERO policies on production, so
-- the contractor policies in section 3 are the FIRST policies on these
-- tables. No owner policies exist on production and none are assumed here.
--
-- This migration only ADDS: four nullable contractor-scope columns per table,
-- one FK + one CHECK per table, two indexes, five RLS policies and one
-- SECURITY DEFINER RPC (written against the live column names above). No
-- existing column, constraint, policy, trigger, function or data is dropped
-- or replaced. `material_advance_claims`, `maintenance_logs`, `sites`,
-- `daily_reports` and `project_assignments` are NOT modified.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. materials — scope columns (nullable so legacy owner rows are untouched)
-- ---------------------------------------------------------------------------
alter table public.materials
  add column if not exists workspace_id uuid,
  add column if not exists project_id uuid,
  add column if not exists project_table text,
  add column if not exists contractor_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.materials'::regclass
      and conname = 'materials_contractor_id_fkey'
  ) then
    alter table public.materials
      add constraint materials_contractor_id_fkey
      foreign key (contractor_id) references public.profiles(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.materials'::regclass
      and conname = 'materials_project_table_check'
  ) then
    alter table public.materials
      add constraint materials_project_table_check
      check (project_table is null or project_table in ('projects', 'gov_projects'));
  end if;
end $$;

create index if not exists materials_contractor_scope_idx
  on public.materials (workspace_id, project_id, project_table, contractor_id);

-- ---------------------------------------------------------------------------
-- 2. stock_transactions — same four nullable scope columns
-- ---------------------------------------------------------------------------
alter table public.stock_transactions
  add column if not exists workspace_id uuid,
  add column if not exists project_id uuid,
  add column if not exists project_table text,
  add column if not exists contractor_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_transactions'::regclass
      and conname = 'stock_transactions_contractor_id_fkey'
  ) then
    alter table public.stock_transactions
      add constraint stock_transactions_contractor_id_fkey
      foreign key (contractor_id) references public.profiles(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_transactions'::regclass
      and conname = 'stock_transactions_project_table_check'
  ) then
    alter table public.stock_transactions
      add constraint stock_transactions_project_table_check
      check (project_table is null or project_table in ('projects', 'gov_projects'));
  end if;
end $$;

create index if not exists stock_transactions_contractor_scope_idx
  on public.stock_transactions (workspace_id, project_id, project_table, contractor_id);
-- ---------------------------------------------------------------------------
-- 3. Contractor RLS policies — the FIRST policies on these production tables
-- ---------------------------------------------------------------------------
-- Production has ZERO pre-existing policies on materials/stock_transactions,
-- so nothing is dropped or merged; these policies grant ONLY the contractor
-- behavior the feature needs:
--   materials:          scoped SELECT / INSERT / UPDATE for the assigned
--                       contractor
--   stock_transactions: scoped SELECT / INSERT — the ledger is IMMUTABLE for
--                       contractors (no UPDATE/DELETE policy is created)
-- Every policy is gated by the existing scope guard
-- `can_manage_contractor_project_scope(workspace_id, project_id, project_table,
-- contractor_id)` which enforces: authenticated contractor role, active
-- workspace membership, an `access_status IN ('active','pilot')`
-- project_assignment for auth.uid(), and contractor_id = auth.uid().
-- Rows with NULL scope (none exist today) are never exposed to contractors.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'materials'
      and policyname = 'contractor scoped materials select'
  ) then
    create policy "contractor scoped materials select"
      on public.materials for select to authenticated
      using (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'materials'
      and policyname = 'contractor scoped materials insert'
  ) then
    create policy "contractor scoped materials insert"
      on public.materials for insert to authenticated
      with check (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'materials'
      and policyname = 'contractor scoped materials update'
  ) then
    create policy "contractor scoped materials update"
      on public.materials for update to authenticated
      using (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ))
      with check (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_transactions'
      and policyname = 'contractor scoped stock transactions select'
  ) then
    create policy "contractor scoped stock transactions select"
      on public.stock_transactions for select to authenticated
      using (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ));
  end if;

  -- stock_transactions is immutable for contractors: NO update policy.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_transactions'
      and policyname = 'contractor scoped stock transactions insert'
  ) then
    create policy "contractor scoped stock transactions insert"
      on public.stock_transactions for insert to authenticated
      with check (public.can_manage_contractor_project_scope(
        workspace_id, project_id, project_table, contractor_id
      ));
  end if;
end $$;
-- ---------------------------------------------------------------------------
-- 4. Atomic material entry RPC — written against the LIVE production columns
-- ---------------------------------------------------------------------------
-- Single-transaction SECURITY DEFINER function. Performs auth + role +
-- workspace + assignment verification, forces contractor_id = auth.uid(),
-- finds/creates the project-scoped material master, inserts one
-- stock_transactions row and atomically increments materials.current_quantity.
-- Uses the live production columns: materials.material_name /
-- current_quantity / last_updated and stock_transactions.transaction_type /
-- transaction_date / total_amount. supplier_id and done_by stay NULL: there
-- is no contractor supplier flow on production, and done_by FKs to
-- user_profiles which contractors are not guaranteed to have a row in
-- (attribution is carried by the contractor_id scope column instead).
create or replace function public.contractor_record_material_entry(
  p_workspace_id uuid,
  p_project_id uuid,
  p_project_table text,
  p_material_name text,
  p_quantity numeric,
  p_unit text default 'unit',
  p_unit_price numeric default null,
  p_entry_date date default current_date,
  p_notes text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contractor_id uuid;
  v_profile_role text;
  v_material_id uuid;
  v_transaction_id uuid;
  v_current_quantity numeric;
begin
  -- 0. Input validation.
  if p_material_name is null or btrim(p_material_name) = '' then
    raise exception 'Material name is required.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive number.';
  end if;

  -- 1. Authenticate using auth.uid().
  v_contractor_id := auth.uid();
  if v_contractor_id is null then
    raise exception 'Your session has expired. Please sign in again.';
  end if;

  -- 2. Verify the authenticated user is a contractor.
  select role into v_profile_role
  from public.profiles
  where id = v_contractor_id;
  if v_profile_role is null or v_profile_role <> 'contractor' then
    raise exception 'Field material entries are available only to contractor accounts.';
  end if;

  -- 3. Verify the contractor is an active contractor member of the workspace.
  if not exists (
    select 1 from public.workspace_users wu
    where wu.workspace_id = p_workspace_id
      and wu.user_id = v_contractor_id
      and wu.role = 'contractor'
      and wu.active = true
  ) then
    raise exception 'Contractor is not an active member of the requested workspace.';
  end if;

  -- 4+5+7. Verify the exact project assignment (active or pilot) including
  --        the project_table, scoped to the authenticated contractor.
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

  -- 6. Force contractor_id = auth.uid(): v_contractor_id IS auth.uid() and is
  --    used for every write below; the client never supplies the contractor id.

  -- 5. Find/create the project-scoped material master (dedupe by scope +
  --    normalized material_name). No unique constraint is added so existing
  --    production data is never endangered.
  select id into v_material_id
  from public.materials
  where workspace_id = p_workspace_id
    and project_id = p_project_id
    and project_table = p_project_table
    and contractor_id = v_contractor_id
    and lower(btrim(material_name)) = lower(btrim(p_material_name))
  limit 1;

  if v_material_id is null then
    insert into public.materials (
      workspace_id, project_id, project_table, contractor_id,
      material_name, category, unit,
      current_quantity, threshold_quantity, unit_price, last_updated
    ) values (
      p_workspace_id, p_project_id, p_project_table, v_contractor_id,
      btrim(p_material_name), 'other',
      coalesce(nullif(btrim(coalesce(p_unit, '')), ''), 'unit'),
      p_quantity, 0,
      coalesce(p_unit_price, 0),
      now()
    )
    returning id into v_material_id;
    v_current_quantity := p_quantity;
  else
    update public.materials
      set current_quantity = current_quantity + p_quantity,
          unit = case when btrim(coalesce(p_unit, '')) = '' then unit else p_unit end,
          unit_price = case
            when p_unit_price is not null and p_unit_price > 0 then p_unit_price
            else unit_price
          end,
          last_updated = now()
    where id = v_material_id
    returning current_quantity into v_current_quantity;
  end if;

  -- 6. Insert exactly one stock_transactions row (the movement ledger entry).
  --    transaction_type / transaction_date are the live column names;
  --    total_amount is derived server-side when a unit price is supplied;
  --    supplier_id and done_by stay NULL (see function header).
  insert into public.stock_transactions (
    material_id,
    workspace_id, project_id, project_table, contractor_id,
    transaction_type, quantity, unit_price, total_amount,
    transaction_date, notes
  ) values (
    v_material_id,
    p_workspace_id, p_project_id, p_project_table, v_contractor_id,
    'in', p_quantity, coalesce(p_unit_price, 0),
    case when p_unit_price is not null and p_unit_price > 0
         then p_quantity * p_unit_price else null end,
    p_entry_date::timestamptz,
    coalesce(p_notes, '')
  )
  returning id into v_transaction_id;

  -- 7. All steps run in one transaction. Return identifiers and the
  --    resulting quantity.
  return json_build_object(
    'material_id', v_material_id,
    'transaction_id', v_transaction_id,
    'current_quantity', v_current_quantity
  );
end;
$$;

revoke all on function public.contractor_record_material_entry(
  uuid, uuid, text, text, numeric, text, numeric, date, text
) from public;
grant execute on function public.contractor_record_material_entry(
  uuid, uuid, text, text, numeric, text, numeric, date, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
