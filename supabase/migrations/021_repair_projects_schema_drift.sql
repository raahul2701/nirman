-- Repair production schema drift for the legacy public.projects table.
-- This migration is additive only: it does not drop, recreate, or remove data.

create extension if not exists "pgcrypto";

alter table public.projects
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text default '',
  add column if not exists description text default '',
  add column if not exists owner_id uuid,
  add column if not exists company text default '',
  add column if not exists status text default 'active',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists budget numeric default 0,
  add column if not exists progress_percent integer default 0,
  add column if not exists location text default '',
  add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_owner_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_owner_id_fkey
      foreign key (owner_id)
      references public.profiles(id)
      on delete cascade
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_status_check'
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (status in ('active', 'completed', 'on_hold', 'cancelled'))
      not valid;
  end if;
end $$;

alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can view own projects'
  ) then
    create policy "Users can view own projects"
      on public.projects
      for select
      to authenticated
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can insert own projects'
  ) then
    create policy "Users can insert own projects"
      on public.projects
      for insert
      to authenticated
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can update own projects'
  ) then
    create policy "Users can update own projects"
      on public.projects
      for update
      to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

notify pgrst, 'reload schema';
