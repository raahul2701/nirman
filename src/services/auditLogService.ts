import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

export type AuditLogInput = {
  action: string;
  userId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  tableName?: string | null;
  recordId?: string | null;
  oldValues?: Json | null;
  newValues?: Json | null;
  metadata?: Json | null;
};

export async function recordAuditLog(input: AuditLogInput) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = input.userId ?? authData.user?.id ?? null;
  const { error } = await supabase.from('audit_logs').insert({
    action: input.action,
    user_id: userId,
    workspace_id: input.workspaceId ?? null,
    project_id: input.projectId ?? null,
    table_name: input.tableName ?? null,
    record_id: input.recordId ?? null,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) throw error;
}
