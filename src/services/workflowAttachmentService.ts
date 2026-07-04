import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

export type CreateWorkflowAttachmentInput = {
  workflowId: string;
  fileName: string;
  storagePath: string;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  uploadedBy?: string | null;
  metadata?: Json | null;
};

export async function createWorkflowAttachment(input: CreateWorkflowAttachmentInput) {
  const { data, error } = await supabase
    .from('workflow_attachments')
    .insert({
      workflow_id: input.workflowId,
      file_name: input.fileName,
      storage_path: input.storagePath,
      content_type: input.contentType ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
      uploaded_by: input.uploadedBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listWorkflowAttachments(workflowId: string) {
  const { data, error } = await supabase
    .from('workflow_attachments')
    .select('id,workflow_id,file_name,storage_path,content_type,file_size_bytes,uploaded_by,metadata,created_at')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
