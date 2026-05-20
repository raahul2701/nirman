create extension if not exists "pgcrypto";

create table if not exists public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_id text not null,
  workflow text not null,
  model text,
  status text not null check (status in ('queued', 'completed', 'failed', 'cancelled')),
  prompt_chars integer,
  tokens_used integer,
  duration_ms integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table if not exists public.admin_impersonation_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (admin_user_id <> target_user_id)
);

alter table public.ai_request_logs enable row level security;
alter table public.device_sessions enable row level security;
alter table public.admin_impersonation_events enable row level security;

drop policy if exists "ai logs user read own" on public.ai_request_logs;
create policy "ai logs user read own" on public.ai_request_logs
  for select using (auth.uid() = user_id);

drop policy if exists "device sessions own read" on public.device_sessions;
create policy "device sessions own read" on public.device_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "device sessions own upsert" on public.device_sessions;
create policy "device sessions own upsert" on public.device_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "device sessions own update" on public.device_sessions;
create policy "device sessions own update" on public.device_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "impersonation admin read" on public.admin_impersonation_events;
create policy "impersonation admin read" on public.admin_impersonation_events
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create index if not exists idx_ai_request_logs_user_created on public.ai_request_logs(user_id, created_at desc);
create index if not exists idx_ai_request_logs_request_id on public.ai_request_logs(request_id);
create index if not exists idx_device_sessions_user_seen on public.device_sessions(user_id, last_seen_at desc);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'upload_metadata') then
    alter table public.upload_metadata add column if not exists user_id uuid references auth.users(id) on delete set null;
    alter table public.upload_metadata add column if not exists bucket text;
    alter table public.upload_metadata add column if not exists path text;
    alter table public.upload_metadata add column if not exists file_hash text;
    alter table public.upload_metadata add column if not exists size_bytes bigint;
    alter table public.upload_metadata add column if not exists mime_type text;
    alter table public.upload_metadata add column if not exists status text not null default 'uploaded';
    alter table public.upload_metadata add column if not exists created_at timestamptz not null default now();
    alter table public.upload_metadata add column if not exists updated_at timestamptz not null default now();
    update public.upload_metadata
      set user_id = coalesce(user_id, uploaded_by),
          path = coalesce(path, storage_path),
          size_bytes = coalesce(size_bytes, size),
          mime_type = coalesce(mime_type, content_type),
          bucket = coalesce(bucket, 'project-files')
      where path is null or bucket is null;
    create unique index if not exists idx_upload_metadata_bucket_path on public.upload_metadata(bucket, path);
    create index if not exists idx_upload_metadata_hash on public.upload_metadata(file_hash) where file_hash is not null;
    create index if not exists idx_upload_metadata_status_updated on public.upload_metadata(status, updated_at);
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.upload_metadata enable row level security;

drop policy if exists "upload metadata owner read" on public.upload_metadata;
create policy "upload metadata owner read" on public.upload_metadata
  for select using (auth.uid() = user_id);

drop policy if exists "upload metadata owner insert" on public.upload_metadata;
create policy "upload metadata owner insert" on public.upload_metadata
  for insert with check (auth.uid() = user_id);

drop policy if exists "upload metadata owner update" on public.upload_metadata;
create policy "upload metadata owner update" on public.upload_metadata
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "authenticated users can upload project files" on storage.objects;
create policy "authenticated users can upload project files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('project-files', 'reports', 'field-uploads'));

drop policy if exists "owners can read project files" on storage.objects;
create policy "owners can read project files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('project-files', 'reports', 'field-uploads')
    and (owner = auth.uid() or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin', 'project_manager', 'gov_official')
    ))
  );

drop policy if exists "owners can update project files" on storage.objects;
create policy "owners can update project files" on storage.objects
  for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());
