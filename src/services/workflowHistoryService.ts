import { supabase } from '../lib/supabase';

export async function getWorkflowHistory(workflowId: string) {
  const [{ data: instanceData, error: instanceError }, { data: stageData, error: stageError }, { data: actionData, error: actionError }, { data: attachmentData, error: attachmentError }, { data: contextData, error: contextError }, { data: auditData, error: auditError }] = await Promise.all([
    supabase.from('workflow_instances').select('*').eq('id', workflowId).maybeSingle(),
    supabase.from('workflow_stage_history').select('*').eq('workflow_id', workflowId).order('entered_at', { ascending: true }),
    supabase.from('workflow_actions').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true }),
    supabase.from('workflow_attachments').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true }),
    supabase.from('workflow_context').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true }),
    supabase.from('workflow_audit_logs').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true }),
  ]);

  if (instanceError) throw instanceError;
  if (stageError) throw stageError;
  if (actionError) throw actionError;
  if (attachmentError) throw attachmentError;
  if (contextError) throw contextError;
  if (auditError) throw auditError;

  return {
    instance: instanceData,
    stages: stageData || [],
    actions: actionData || [],
    attachments: attachmentData || [],
    context: contextData || [],
    audit: auditData || [],
  };
}
