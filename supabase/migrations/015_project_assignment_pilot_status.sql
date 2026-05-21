-- Expand project assignment statuses for live pilot assignment workflow.
-- Existing statuses remain valid: active, locked, completed, archived.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'project_assignments'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%access_status%'
  loop
    execute format('alter table public.project_assignments drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

alter table public.project_assignments
  add constraint project_assignments_access_status_check
  check (access_status in ('active', 'pilot', 'paused', 'locked', 'completed', 'archived'))
  not valid;

do $$
begin
  if not exists (
    select 1
    from public.project_assignments
    where access_status not in ('active', 'pilot', 'paused', 'locked', 'completed', 'archived')
  ) then
    alter table public.project_assignments validate constraint project_assignments_access_status_check;
  end if;
end $$;
