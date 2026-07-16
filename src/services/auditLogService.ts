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

type SupabaseRuntimeError = {
  code?: string | null;
  status?: number | string | null;
};

let auditUnavailable = false;
let auditWarningLogged = false;

function isAuditWriteUnavailable(error: unknown) {
  const info = typeof error === 'object' && error !== null ? error as SupabaseRuntimeError : {};
  return info.code === '42501' || String(info.status) === '401' || String(info.status) === '403';
}

function warnAuditUnavailableOnce(action: string, error: unknown) {
  if (auditWarningLogged || !import.meta.env.DEV) return;
  auditWarningLogged = true;
  const info = typeof error === 'object' && error !== null ? error as SupabaseRuntimeError : {};
  console.warn('[audit] browser audit logging is unavailable', { action, code: info.code || null, status: info.status || null });
}

export async function recordAuditLog(input: AuditLogInput) {
  if (auditUnavailable) return { success: false, unavailable: true };

  try {
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
    return { success: true, unavailable: false };
  } catch (error) {
    if (isAuditWriteUnavailable(error)) {
      auditUnavailable = true;
      warnAuditUnavailableOnce(input.action, error);
      return { success: false, unavailable: true };
    }
    const info = typeof error === 'object' && error !== null ? error as SupabaseRuntimeError : {};
    if (import.meta.env.DEV) {
      console.warn('[audit] audit log write failed', { action: input.action, code: info.code || null, status: info.status || null });
    }
    return { success: false, unavailable: false };
  }
}