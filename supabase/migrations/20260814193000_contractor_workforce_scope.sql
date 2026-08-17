begin;

-- Keep the existing workforce shape intact. Scope fields are deliberately nullable
-- so legacy rows are not reinterpreted or backfilled.
alter table public.workers
  add column if not exists workspace_id uuid,
  add column if not exists project_id uuid,
  add column if not exists project_table text,
  add column if not exists contractor_id uuid,
  add column if not exists email text,
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workers'::regclass
      and conname = 'workers_contractor_id_fkey'
  ) then
    alter table public.workers
      add constraint workers_contractor_id_fkey
      foreign key (contractor_id) references public.profiles(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workers'::regclass
      and conname = 'workers_auth_user_id_fkey'
  ) then
    alter table public.workers
      add constraint workers_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workers'::regclass
      and conname = 'workers_project_table_check'
  ) then
    alter table public.workers
      add constraint workers_project_table_check
      check (project_table is null or project_table in ('projects', 'gov_projects'));
  end if;
end;
$$;

create index if not exists workers_contractor_scope_idx
  on public.workers (workspace_id, project_id, project_table, contractor_id);

create unique index if not exists workers_auth_user_id_unique
  on public.workers (auth_user_id)
  where auth_user_id is not null;

-- The live preflight found that this relation can already exist as a genuine,
-- zero-column table. CREATE TABLE IF NOT EXISTS would silently leave that
-- relation unusable, so initialize it explicitly. A relation with columns is
-- never altered here: it must already meet this migration's exact contract.
do $$
declare
  subcontractors_relid oid;
  user_column_count integer;
  expected_column_count constant integer := 16;
begin
  select c.oid
    into subcontractors_relid
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'subcontractors';

  if subcontractors_relid is null then
    create table public.subcontractors (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null,
      project_id uuid not null,
      project_table text not null constraint subcontractors_project_table_check
        check (project_table in ('projects', 'gov_projects')),
      contractor_id uuid not null constraint subcontractors_contractor_id_fkey
        references public.profiles(id) on delete restrict,
      company_name text not null,
      contact_person text,
      phone text,
      email text,
      work_type text,
      work_description text,
      status text not null default 'active' constraint subcontractors_status_check
        check (status in ('active', 'inactive', 'completed')),
      start_date date,
      end_date date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  else
    if not exists (
      select 1
      from pg_class
      where oid = subcontractors_relid
        and relkind = 'r'
    ) then
      raise exception 'public.subcontractors exists but is not an ordinary table';
    end if;

    select count(*)
      into user_column_count
    from pg_attribute
    where attrelid = subcontractors_relid
      and attnum > 0
      and not attisdropped;

    if user_column_count = 0 then
      alter table public.subcontractors
        add column id uuid primary key default gen_random_uuid(),
        add column workspace_id uuid not null,
        add column project_id uuid not null,
        add column project_table text not null constraint subcontractors_project_table_check
          check (project_table in ('projects', 'gov_projects')),
        add column contractor_id uuid not null constraint subcontractors_contractor_id_fkey
          references public.profiles(id) on delete restrict,
        add column company_name text not null,
        add column contact_person text,
        add column phone text,
        add column email text,
        add column work_type text,
        add column work_description text,
        add column status text not null default 'active' constraint subcontractors_status_check
          check (status in ('active', 'inactive', 'completed')),
        add column start_date date,
        add column end_date date,
        add column created_at timestamptz not null default now(),
        add column updated_at timestamptz not null default now();
    else
      if user_column_count <> expected_column_count
         or exists (
           select 1
           from (
             values
               ('id', 'uuid', true),
               ('workspace_id', 'uuid', true),
               ('project_id', 'uuid', true),
               ('project_table', 'text', true),
               ('contractor_id', 'uuid', true),
               ('company_name', 'text', true),
               ('contact_person', 'text', false),
               ('phone', 'text', false),
               ('email', 'text', false),
               ('work_type', 'text', false),
               ('work_description', 'text', false),
               ('status', 'text', true),
               ('start_date', 'date', false),
               ('end_date', 'date', false),
               ('created_at', 'timestamp with time zone', true),
               ('updated_at', 'timestamp with time zone', true)
           ) as expected(column_name, column_type, is_not_null)
           full join (
             select attname, format_type(atttypid, atttypmod), attnotnull
             from pg_attribute
             where attrelid = subcontractors_relid
               and attnum > 0
               and not attisdropped
           ) as actual(column_name, column_type, is_not_null)
             using (column_name)
           where actual.column_name is null
              or expected.column_name is null
              or actual.column_type <> expected.column_type
              or actual.is_not_null <> expected.is_not_null
         )
         or not exists (
           select 1
           from pg_attrdef d
           join pg_attribute a
             on a.attrelid = d.adrelid and a.attnum = d.adnum
           where d.adrelid = subcontractors_relid
             and a.attname = 'id'
             and pg_get_expr(d.adbin, d.adrelid) = 'gen_random_uuid()'
         )
         or not exists (
           select 1
           from pg_attrdef d
           join pg_attribute a
             on a.attrelid = d.adrelid and a.attnum = d.adnum
           where d.adrelid = subcontractors_relid
             and a.attname = 'status'
             and pg_get_expr(d.adbin, d.adrelid) = '''active''::text'
         )
         or not exists (
           select 1
           from pg_attrdef d
           join pg_attribute a
             on a.attrelid = d.adrelid and a.attnum = d.adnum
           where d.adrelid = subcontractors_relid
             and a.attname = 'created_at'
             and pg_get_expr(d.adbin, d.adrelid) = 'now()'
         )
         or not exists (
           select 1
           from pg_attrdef d
           join pg_attribute a
             on a.attrelid = d.adrelid and a.attnum = d.adnum
           where d.adrelid = subcontractors_relid
             and a.attname = 'updated_at'
             and pg_get_expr(d.adbin, d.adrelid) = 'now()'
         )
         or (select count(*) from pg_attrdef where adrelid = subcontractors_relid) <> 4
         or (select count(*) from pg_constraint where conrelid = subcontractors_relid) <> 4
         or not exists (
           select 1
           from pg_constraint
           where conrelid = subcontractors_relid
             and contype = 'p'
             and conkey = array[
               (select attnum from pg_attribute where attrelid = subcontractors_relid and attname = 'id')
             ]::smallint[]
         )
         or not exists (
           select 1
           from pg_constraint
           where conrelid = subcontractors_relid
             and contype = 'f'
             and conkey = array[
               (select attnum from pg_attribute where attrelid = subcontractors_relid and attname = 'contractor_id')
             ]::smallint[]
             and confrelid = 'public.profiles'::regclass
             and confkey = array[
               (select attnum from pg_attribute where attrelid = 'public.profiles'::regclass and attname = 'id')
             ]::smallint[]
             and confdeltype = 'r'
             and confupdtype = 'a'
             and convalidated
         )
         or not exists (
           select 1
           from pg_constraint
           where conrelid = subcontractors_relid
             and contype = 'c'
             and conkey = array[
               (select attnum from pg_attribute where attrelid = subcontractors_relid and attname = 'project_table')
             ]::smallint[]
             and convalidated
             and lower(regexp_replace(
               pg_get_constraintdef(oid), '[[:space:]]+', '', 'g'
             )) = 'check((project_table=any(array[''projects''::text,''gov_projects''::text])))'
         )
         or not exists (
           select 1
           from pg_constraint
           where conrelid = subcontractors_relid
             and contype = 'c'
             and conkey = array[
               (select attnum from pg_attribute where attrelid = subcontractors_relid and attname = 'status')
             ]::smallint[]
             and convalidated
             and lower(regexp_replace(
               pg_get_constraintdef(oid), '[[:space:]]+', '', 'g'
             )) = 'check((status=any(array[''active''::text,''inactive''::text,''completed''::text])))'
         )
         or exists (
           select 1
           from pg_class index_class
           join pg_index index_definition on index_definition.indexrelid = index_class.oid
           where index_class.relname = 'subcontractors_contractor_scope_idx'
             and index_definition.indrelid = subcontractors_relid
             and (
               not index_definition.indisvalid
               or index_definition.indisunique
               or index_definition.indpred is not null
               or pg_get_indexdef(index_definition.indexrelid) not like
                 '%(workspace_id, project_id, project_table, contractor_id)%'
             )
         ) then
        raise exception 'public.subcontractors has columns but does not satisfy the required workforce migration contract';
      end if;
    end if;
  end if;
end;
$$;

create index if not exists subcontractors_contractor_scope_idx
  on public.subcontractors (workspace_id, project_id, project_table, contractor_id);

-- SECURITY DEFINER is required because this predicate must safely inspect the
-- membership and assignment records protected by RLS. It grants no hierarchy
-- management capability; every condition is tied to the authenticated contractor.
create or replace function public.can_manage_contractor_project_scope(
  target_workspace_id uuid,
  target_project_id uuid,
  target_project_table text,
  target_contractor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    target_workspace_id is not null
    and target_project_id is not null
    and target_project_table in ('projects', 'gov_projects')
    and target_contractor_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'contractor'
    )
    and exists (
      select 1
      from public.workspace_users wu
      where wu.workspace_id = target_workspace_id
        and wu.user_id = auth.uid()
        and wu.role = 'contractor'
        and wu.active = true
    )
    and exists (
      select 1
      from public.project_assignments pa
      where pa.workspace_id = target_workspace_id
        and pa.project_id = target_project_id
        and pa.project_table = target_project_table
        and pa.contractor_id = auth.uid()
        and pa.access_status in ('active', 'pilot')
    ),
    false
  );
$$;

revoke all on function public.can_manage_contractor_project_scope(uuid, uuid, text, uuid) from public;
grant execute on function public.can_manage_contractor_project_scope(uuid, uuid, text, uuid)
  to authenticated, service_role;

-- Do not silently layer these policies over an unknown existing workers policy:
-- any such policy could bypass contractor scope and must be reviewed explicitly.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname not in (
        'contractor scoped workers select',
        'contractor scoped workers insert',
        'contractor scoped workers update',
        'worker own record select'
      )
  loop
    raise exception 'unexpected existing workers policy: %', existing_policy.policyname;
  end loop;

  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subcontractors'
      and policyname not in (
        'contractor scoped subcontractors select',
        'contractor scoped subcontractors insert',
        'contractor scoped subcontractors update'
      )
  loop
    raise exception 'unexpected existing subcontractors policy: %', existing_policy.policyname;
  end loop;
end;
$$;

alter table public.workers enable row level security;
alter table public.subcontractors enable row level security;

drop policy if exists "contractor scoped workers select" on public.workers;
create policy "contractor scoped workers select"
  on public.workers for select to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

drop policy if exists "contractor scoped workers insert" on public.workers;
create policy "contractor scoped workers insert"
  on public.workers for insert to authenticated
  with check (
    auth_user_id is null
    and public.can_manage_contractor_project_scope(
      workspace_id, project_id, project_table, contractor_id
    )
  );

drop policy if exists "contractor scoped workers update" on public.workers;
create policy "contractor scoped workers update"
  on public.workers for update to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ))
  with check (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

drop policy if exists "worker own record select" on public.workers;
create policy "worker own record select"
  on public.workers for select to authenticated
  using (auth_user_id = auth.uid());

create or replace function public.prevent_authenticated_worker_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.workspace_id is distinct from old.workspace_id
       or new.project_id is distinct from old.project_id
       or new.project_table is distinct from old.project_table
       or new.contractor_id is distinct from old.contractor_id
       or new.auth_user_id is distinct from old.auth_user_id
     ) then
    raise exception 'authenticated users cannot change worker scope or auth link';
  end if;
  return new;
end;
$$;

drop trigger if exists workers_prevent_authenticated_scope_change on public.workers;
create trigger workers_prevent_authenticated_scope_change
  before update on public.workers
  for each row execute function public.prevent_authenticated_worker_scope_change();

drop policy if exists "contractor scoped subcontractors select" on public.subcontractors;
create policy "contractor scoped subcontractors select"
  on public.subcontractors for select to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

drop policy if exists "contractor scoped subcontractors insert" on public.subcontractors;
create policy "contractor scoped subcontractors insert"
  on public.subcontractors for insert to authenticated
  with check (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

drop policy if exists "contractor scoped subcontractors update" on public.subcontractors;
create policy "contractor scoped subcontractors update"
  on public.subcontractors for update to authenticated
  using (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ))
  with check (public.can_manage_contractor_project_scope(
    workspace_id, project_id, project_table, contractor_id
  ));

create or replace function public.prevent_authenticated_subcontractor_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.workspace_id is distinct from old.workspace_id
       or new.project_id is distinct from old.project_id
       or new.project_table is distinct from old.project_table
       or new.contractor_id is distinct from old.contractor_id
     ) then
    raise exception 'authenticated users cannot change subcontractor scope';
  end if;
  return new;
end;
$$;

drop trigger if exists subcontractors_prevent_authenticated_scope_change on public.subcontractors;
create trigger subcontractors_prevent_authenticated_scope_change
  before update on public.subcontractors
  for each row execute function public.prevent_authenticated_subcontractor_scope_change();

notify pgrst, 'reload schema';

commit;
