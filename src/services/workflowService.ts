import { supabase } from '../lib/supabase';
import { recordAuditLog } from './auditLogService';
import { getConfiguredTransition, getWorkflowDefinitionById, getWorkflowDefinitionByKey } from './workflowConfigurationService';
import type { Json } from '../types/database';

export type WorkflowStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'returned' | 'cancelled';
export type WorkflowActionType = 'submit' | 'approve' | 'return' | 'reject' | 'cancel' | 'comment';
export type WorkflowNotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export type CreateWorkflowInstanceInput = {
  workspaceId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  workflowDefinitionId?: string | null;
  workflowDefinitionKey?: string | null;
  title?: string | null;
  stageCode?: string | null;
  status?: WorkflowStatus | null;
  assignedTo?: string | null;
  metadata?: Json | null;
};

export type RecordWorkflowActionInput = {
  workflowId: string;
  actorId?: string | null;
  actorRole: string;
  actionType: WorkflowActionType;
  fromStatus?: WorkflowStatus | null;
  toStatus?: WorkflowStatus | null;
  stageCode?: string | null;
  remarks?: string | null;
  metadata?: Json | null;
  requiresSignature?: boolean | null;
  requiresAttachment?: boolean | null;
  requiresRemarks?: boolean | null;
};

export type CreateWorkflowAttachmentInput = {
  workflowId: string;
  fileName: string;
  storagePath: string;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  uploadedBy?: string | null;
  metadata?: Json | null;
};

export type CreateWorkflowNotificationInput = {
  workflowId: string;
  recipientId: string;
  channel?: WorkflowNotificationChannel | null;
  subject?: string | null;
  body: string;
  status?: 'pending' | 'sent' | 'failed' | null;
  metadata?: Json | null;
};

export type CreateWorkflowRevisionInput = {
  workflowId: string;
  revisionNumber: number;
  changedBy?: string | null;
  summary?: string | null;
  payload?: Json | null;
};

type CreateWorkflowStageInput = {
  workflowId: string;
  stageCode: string;
  stageName?: string | null;
  status?: WorkflowStatus | null;
  assignedTo?: string | null;
  remarks?: string | null;
  metadata?: Json | null;
};

async function getCurrentUserId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) throw new Error('Authenticated user is required.');
  return authData.user.id;
}

async function createWorkflowStage(input: CreateWorkflowStageInput) {
  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const { data, error } = await supabase
    .from('workflow_stage_history')
    .insert({
      workflow_id: input.workflowId,
      workspace_id: workflowRecord?.workspace_id ?? null,
      project_id: workflowRecord?.project_id ?? null,
      stage_code: input.stageCode,
      stage_name: input.stageName ?? input.stageCode,
      status: input.status ?? 'submitted',
      assigned_to: input.assignedTo ?? null,
      remarks: input.remarks ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select()
    .single();

  if (error) throw new Error(`[Workflow] Failed to create stage: ${error.message}`);
  return data;
}

export async function createWorkflowInstance(input: CreateWorkflowInstanceInput): Promise<Json> {
  const userId = await getCurrentUserId();

  const resolvedDefinition = input.workflowDefinitionId
    ? await getWorkflowDefinitionById(input.workflowDefinitionId)
    : input.workflowDefinitionKey
      ? await getWorkflowDefinitionByKey(input.workflowDefinitionKey)
      : null;

  const { data, error } = await supabase
    .from('workflow_instances')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      workflow_definition_id: resolvedDefinition?.id ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      title: input.title ?? null,
      current_stage_code: input.stageCode ?? 'submitted',
      status: input.status ?? 'submitted',
      created_by: userId,
      assigned_to: input.assignedTo ?? null,
      context: (input.metadata ?? {}) as Json,
    })
    .select()
    .single();

  if (error) throw new Error(`[Workflow] Failed to create instance: ${error.message}`);

  await createWorkflowStage({
    workflowId: data.id,
    stageCode: input.stageCode ?? 'submitted',
    stageName: input.title ?? resolvedDefinition?.display_name ?? 'Workflow initiated',
    status: input.status ?? 'submitted',
    assignedTo: input.assignedTo ?? null,
    remarks: 'Workflow created',
    metadata: input.metadata ?? {},
  });

  await recordAuditLog({
    action: 'workflow_created',
    userId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    tableName: 'workflow_instances',
    recordId: String(data.id),
    newValues: data as Json,
  });

  return data;
}

export async function recordWorkflowAction(input: RecordWorkflowActionInput): Promise<Json> {
  const actorId = input.actorId?.trim() || (await getCurrentUserId());

  const { data: workflowData, error: workflowError } = await supabase
    .from('workflow_instances')
    .select('id, workflow_definition_id, current_stage_code, status')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowError) throw workflowError;
  if (!workflowData) throw new Error('[Workflow] Instance not found.');

  const transition = workflowData.workflow_definition_id
    ? await getConfiguredTransition({
        workflowDefinitionId: workflowData.workflow_definition_id,
        fromState: workflowData.current_stage_code,
        actionType: input.actionType,
        actorRole: input.actorRole,
      })
    : null;

  if (!transition) throw new Error('[Workflow] No configured transition matches the supplied action and role.');

  const metadata = (input.metadata ?? {}) as Record<string, unknown>;
  if (transition.requires_attachment && !metadata.attachment_id) {
    throw new Error('This transition requires an attachment.');
  }

  if (transition.requires_remarks && !input.remarks) {
    throw new Error('This transition requires remarks.');
  }

  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const resolvedToStatus: WorkflowStatus = input.toStatus ?? (
    input.actionType === 'approve'
      ? 'approved'
      : input.actionType === 'reject'
        ? 'rejected'
        : input.actionType === 'return'
          ? 'returned'
          : input.actionType === 'cancel'
            ? 'cancelled'
            : input.actionType === 'submit'
              ? 'submitted'
              : 'in_review'
  );

  const { data, error } = await supabase
    .from('workflow_actions')
    .insert({
      workflow_id: input.workflowId,
      workspace_id: workflowRecord?.workspace_id ?? null,
      project_id: workflowRecord?.project_id ?? null,
      actor_id: actorId,
      action_type: input.actionType,
      from_status: input.fromStatus ?? null,
      to_status: resolvedToStatus,
      remarks: input.remarks ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select()
    .single();

  if (error) throw new Error(`[Workflow] Failed to record action: ${error.message}`);

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    current_stage_code: transition.to_state,
    status: resolvedToStatus,
    latest_transition_id: transition.id,
  };

  const { error: updateError } = await supabase.from('workflow_instances').update(updatePayload).eq('id', input.workflowId);
  if (updateError) throw updateError;

  await createWorkflowStage({
    workflowId: input.workflowId,
    stageCode: transition.to_state,
    stageName: transition.to_state,
    status: resolvedToStatus,
    assignedTo: null,
    remarks: input.remarks ?? null,
    metadata: input.metadata ?? {},
  });

  await recordAuditLog({
    action: 'workflow_action_recorded',
    userId: actorId,
    workspaceId: workflowRecord?.workspace_id ?? null,
    projectId: workflowRecord?.project_id ?? null,
    tableName: 'workflow_actions',
    recordId: String(data.id),
    newValues: data as Json,
  });

  return data;
}

export async function createWorkflowAttachment(input: CreateWorkflowAttachmentInput): Promise<Json> {
  const actorId = await getCurrentUserId();
  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const { data, error } = await supabase.from('workflow_attachments').insert({
    workflow_id: input.workflowId,
    workspace_id: workflowRecord?.workspace_id ?? null,
    project_id: workflowRecord?.project_id ?? null,
    file_name: input.fileName,
    storage_path: input.storagePath,
    content_type: input.contentType ?? null,
    file_size_bytes: input.fileSizeBytes ?? null,
    uploaded_by: input.uploadedBy ?? actorId,
    metadata: (input.metadata ?? {}) as Json,
  }).select().single();

  if (error) throw new Error(`[Workflow] Failed to create attachment: ${error.message}`);
  return data;
}

export async function createWorkflowNotification(input: CreateWorkflowNotificationInput): Promise<Json> {
  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const { data, error } = await supabase.from('workflow_notifications').insert({
    workflow_id: input.workflowId,
    workspace_id: workflowRecord?.workspace_id ?? null,
    project_id: workflowRecord?.project_id ?? null,
    recipient_id: input.recipientId,
    channel: input.channel ?? 'in_app',
    subject: input.subject ?? null,
    body: input.body,
    status: input.status ?? 'pending',
    metadata: (input.metadata ?? {}) as Json,
  }).select().single();

  if (error) throw new Error(`[Workflow] Failed to create notification: ${error.message}`);
  return data;
}

export async function createWorkflowRevision(input: CreateWorkflowRevisionInput): Promise<Json> {
  const actorId = await getCurrentUserId();
  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const { data, error } = await supabase.from('workflow_revisions').insert({
    workflow_id: input.workflowId,
    workspace_id: workflowRecord?.workspace_id ?? null,
    project_id: workflowRecord?.project_id ?? null,
    revision_number: input.revisionNumber,
    changed_by: input.changedBy ?? actorId,
    summary: input.summary ?? null,
    payload: (input.payload ?? {}) as Json,
  }).select().single();

  if (error) throw new Error(`[Workflow] Failed to create revision: ${error.message}`);
  return data;
}

export async function addWorkflowContextValue(input: { workflowId: string; keyName: string; value: Json }): Promise<Json> {
  const { data: workflowRecord, error: workflowLookupError } = await supabase
    .from('workflow_instances')
    .select('workspace_id, project_id')
    .eq('id', input.workflowId)
    .maybeSingle();

  if (workflowLookupError) throw workflowLookupError;

  const { data, error } = await supabase.from('workflow_context').insert({
    workflow_id: input.workflowId,
    workspace_id: workflowRecord?.workspace_id ?? null,
    project_id: workflowRecord?.project_id ?? null,
    key_name: input.keyName,
    value_json: input.value,
  }).select().single();

  if (error) throw new Error(`[Workflow] Failed to add context: ${error.message}`);
  return data;
}
