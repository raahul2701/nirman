-- Lightweight user activity tracking for pilot monitoring.

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text not null check (event_type in ('login_success', 'page_visit', 'logout', 'pilot_started', 'assignment_created')),
  page_path text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_activity_logs enable row level security;

drop policy if exists "users insert own activity logs" on public.user_activity_logs;
create policy "users insert own activity logs" on public.user_activity_logs
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "users read own activity logs" on public.user_activity_logs;
create policy "users read own activity logs" on public.user_activity_logs
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admins read activity logs" on public.user_activity_logs;
create policy "admins read activity logs" on public.user_activity_logs
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'project_manager')
  )
);

create index if not exists idx_user_activity_logs_created_at
on public.user_activity_logs(created_at desc);

create index if not exists idx_user_activity_logs_user_id
on public.user_activity_logs(user_id);

create index if not exists idx_user_activity_logs_email
on public.user_activity_logs(email);

create index if not exists idx_user_activity_logs_event_type
on public.user_activity_logs(event_type);

create index if not exists idx_user_activity_logs_page_path
on public.user_activity_logs(page_path);
