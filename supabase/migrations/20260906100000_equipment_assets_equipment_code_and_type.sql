begin;

-- ===========================================================================
-- Equipment Assets — approved design alignment (ADDITIVE CORRECTION)
-- ---------------------------------------------------------------------------
-- Canonical approved design (Design Lock):
--   * equipment_assets.equipment_code  text NOT NULL
--       - unique per workspace      -> UNIQUE (workspace_id, equipment_code)
--       - canonical format EQ-###   -> "EQ-" + exactly 3 digits (e.g. EQ-014),
--         enforced by a DATABASE CHECK constraint (not only app validation)
--   * equipment_type text NOT NULL  (canonical; asset_type is RENAMED, not
--     duplicated — no parallel type field exists after this migration)
-- Safety strategy (fail-loud, never silent):
--   * Hard-fails BEFORE any DDL if public.equipment_assets does not exist,
--     if it is not empty, or if the starting schema is not the expected
--     (asset_type XOR equipment_type) state.
--   * The empty-table precondition makes the NOT NULL add and the unique
--     constraint safe with zero backfill and zero data-loss paths.
--   * asset_type -> equipment_type is a single atomic RENAME COLUMN, which
--     preserves the existing NOT NULL and DEFAULT 'other' semantics.
--   * Idempotent: every step is a conditional no-op if the target state
--     already exists; a full re-run against the corrected schema succeeds
--     without modifying anything.
--   * Final-shape assertions verify the postconditions before commit.
--   * ONE transaction — any failure rolls back the entire script.
-- Explicitly UNCHANGED: RPC security model, RLS/policies, grants, all
-- triggers, project_equipment_assignments, equipment_execution_logs,
-- maintenance module, supabase_migrations.schema_migrations.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Preconditions — abort before ANY DDL on anything unexpected.
-- ---------------------------------------------------------------------------
do $$
declare
  v_asset_type_cols     int;
  v_equipment_type_cols int;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'equipment_assets'
  ) then
    raise exception 'PRECONDITION FAILED: public.equipment_assets does not exist.';
  end if;

  if exists (select 1 from public.equipment_assets) then
    raise exception 'PRECONDITION FAILED: public.equipment_assets is not empty; manual reconciliation is required before applying this correction.';
  end if;

  select count(*) into v_asset_type_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'equipment_assets'
     and column_name = 'asset_type';

  select count(*) into v_equipment_type_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'equipment_assets'
     and column_name = 'equipment_type';

  if (v_asset_type_cols + v_equipment_type_cols) <> 1 then
    raise exception 'PRECONDITION FAILED: expected exactly one of asset_type/equipment_type on equipment_assets (asset_type=%, equipment_type=%); unexpected starting schema.', v_asset_type_cols, v_equipment_type_cols;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. equipment_code — text NOT NULL with the canonical EQ-### format check.
-- ---------------------------------------------------------------------------
alter table public.equipment_assets
  add column if not exists equipment_code text;

alter table public.equipment_assets
  alter column equipment_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.equipment_assets'::regclass
      and conname = 'equipment_assets_equipment_code_format_check'
  ) then
    execute 'alter table public.equipment_assets
               add constraint equipment_assets_equipment_code_format_check
               check (equipment_code ~ ''^EQ-[0-9]{3}$'')';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Uniqueness per workspace.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.equipment_assets'::regclass
      and conname = 'equipment_assets_workspace_equipment_code_key'
  ) then
    execute 'alter table public.equipment_assets
               add constraint equipment_assets_workspace_equipment_code_key
               unique (workspace_id, equipment_code)';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. asset_type -> equipment_type — single atomic rename; NOT NULL and the
--    existing DEFAULT 'other' are preserved unchanged.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'equipment_assets'
      and column_name = 'asset_type'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'equipment_assets'
        and column_name = 'equipment_type'
    ) then
      raise exception 'UNEXPECTED STATE: asset_type and equipment_type both exist on equipment_assets.';
    end if;
    execute 'alter table public.equipment_assets rename column asset_type to equipment_type';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Final-shape assertions — must hold exactly before commit.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'equipment_assets'
      and column_name = 'asset_type'
  ) then
    raise exception 'POSTCONDITION FAILED: asset_type is still present on equipment_assets.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'equipment_assets'
      and column_name = 'equipment_type'
      and data_type = 'text' and is_nullable = 'NO'
  ) then
    raise exception 'POSTCONDITION FAILED: equipment_type (text NOT NULL) is missing.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'equipment_assets'
      and column_name = 'equipment_code'
      and data_type = 'text' and is_nullable = 'NO'
  ) then
    raise exception 'POSTCONDITION FAILED: equipment_code (text NOT NULL) is missing.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.equipment_assets'::regclass
      and conname = 'equipment_assets_equipment_code_format_check'
  ) then
    raise exception 'POSTCONDITION FAILED: equipment_code EQ-### CHECK constraint is missing.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.equipment_assets'::regclass
      and conname = 'equipment_assets_workspace_equipment_code_key'
      and contype = 'u'
  ) then
    raise exception 'POSTCONDITION FAILED: (workspace_id, equipment_code) uniqueness is missing.';
  end if;

  if exists (select 1 from public.equipment_assets) then
    raise exception 'POSTCONDITION FAILED: equipment_assets is no longer empty.';
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
