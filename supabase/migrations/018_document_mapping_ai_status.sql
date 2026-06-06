-- Document mapping and AI processing status hardening for execution modules.

alter table public.agreement_documents add column if not exists role text;
alter table public.agreement_documents add column if not exists document_type text not null default 'agreement';
alter table public.agreement_documents add column if not exists module_name text not null default 'agreement_boq';
alter table public.agreement_documents add column if not exists original_filename text;
alter table public.agreement_documents add column if not exists storage_provider text not null default 'supabase';
alter table public.agreement_documents add column if not exists supabase_path text;
alter table public.agreement_documents add column if not exists google_drive_file_id text;
alter table public.agreement_documents add column if not exists google_drive_folder_id text;
alter table public.agreement_documents add column if not exists google_drive_sync_status text not null default 'google_drive_sync_pending';
alter table public.agreement_documents add column if not exists drive_folder_path text;
alter table public.agreement_documents add column if not exists ai_processing_status text not null default 'uploaded';
alter table public.agreement_documents add column if not exists ai_error_message text;
alter table public.agreement_documents add column if not exists updated_at timestamptz not null default now();

update public.agreement_documents
set
  original_filename = coalesce(original_filename, file_name),
  supabase_path = coalesce(supabase_path, storage_path),
  ai_processing_status = case document_status
    when 'processing' then 'running'
    when 'extracted' then 'completed'
    when 'failed' then 'failed'
    else coalesce(ai_processing_status, 'uploaded')
  end
where original_filename is null
   or supabase_path is null
   or ai_processing_status is null;

alter table public.agreement_documents drop constraint if exists agreement_documents_storage_provider_check;
alter table public.agreement_documents add constraint agreement_documents_storage_provider_check
check (storage_provider in ('supabase', 'google_drive'));

alter table public.agreement_documents drop constraint if exists agreement_documents_google_drive_sync_status_check;
alter table public.agreement_documents add constraint agreement_documents_google_drive_sync_status_check
check (google_drive_sync_status in ('uploaded_to_supabase', 'google_drive_sync_pending', 'google_drive_synced', 'google_drive_sync_failed'));

alter table public.agreement_documents drop constraint if exists agreement_documents_ai_processing_status_check;
alter table public.agreement_documents add constraint agreement_documents_ai_processing_status_check
check (ai_processing_status in ('uploaded', 'pending', 'running', 'completed', 'failed'));

alter table public.material_advance_documents add column if not exists role text;
alter table public.material_advance_documents add column if not exists module_name text not null default 'material_advance';
alter table public.material_advance_documents add column if not exists original_filename text;
alter table public.material_advance_documents add column if not exists storage_provider text not null default 'supabase';
alter table public.material_advance_documents add column if not exists supabase_path text;
alter table public.material_advance_documents add column if not exists google_drive_file_id text;
alter table public.material_advance_documents add column if not exists google_drive_folder_id text;
alter table public.material_advance_documents add column if not exists google_drive_sync_status text not null default 'google_drive_sync_pending';
alter table public.material_advance_documents add column if not exists drive_folder_path text;
alter table public.material_advance_documents add column if not exists ai_processing_status text not null default 'uploaded';

update public.material_advance_documents
set
  original_filename = coalesce(original_filename, file_name),
  supabase_path = coalesce(supabase_path, storage_path)
where original_filename is null
   or supabase_path is null;

alter table public.material_advance_documents drop constraint if exists material_advance_documents_storage_provider_check;
alter table public.material_advance_documents add constraint material_advance_documents_storage_provider_check
check (storage_provider in ('supabase', 'google_drive'));

alter table public.material_advance_documents drop constraint if exists material_advance_documents_google_drive_sync_status_check;
alter table public.material_advance_documents add constraint material_advance_documents_google_drive_sync_status_check
check (google_drive_sync_status in ('uploaded_to_supabase', 'google_drive_sync_pending', 'google_drive_synced', 'google_drive_sync_failed'));

alter table public.material_advance_documents drop constraint if exists material_advance_documents_ai_processing_status_check;
alter table public.material_advance_documents add constraint material_advance_documents_ai_processing_status_check
check (ai_processing_status in ('uploaded', 'pending', 'running', 'completed', 'failed'));

alter table public.document_metadata add column if not exists module_name text;
alter table public.document_metadata add column if not exists role text;
alter table public.document_metadata add column if not exists original_filename text;
alter table public.document_metadata add column if not exists storage_provider text;
alter table public.document_metadata add column if not exists supabase_path text;
alter table public.document_metadata add column if not exists google_drive_file_id text;
alter table public.document_metadata add column if not exists google_drive_folder_id text;
alter table public.document_metadata add column if not exists file_url text;
alter table public.document_metadata add column if not exists ai_processing_status text;
alter table public.document_metadata add column if not exists google_drive_sync_status text;
alter table public.document_metadata add column if not exists drive_folder_path text;

create index if not exists idx_agreement_documents_ai_status on public.agreement_documents(workspace_id, project_id, ai_processing_status);
create index if not exists idx_document_metadata_module on public.document_metadata(workspace_id, project_id, module_name);
