import { createWorkflowInstance, recordWorkflowAction } from '../../services/workflowService';
import type { Json } from '../../types/database';

export type ApprovalRequestParams = {
  workspaceId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  title?: string | null;
  stageCode?: string | null;
  assignedTo?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ApprovalActionParams = {
  workflowId: string;
  actorId: string;
  actionType: 'approve' | 'reject' | 'return' | 'comment' | 'submit' | 'cancel';
  fromStatus?: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'returned' | 'cancelled' | null;
  toStatus?: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'returned' | 'cancelled' | null;
  remarks?: string;
  metadata?: Record<string, unknown> | null;
};

export async function createApprovalRequest(params: ApprovalRequestParams) {
  return createWorkflowInstance({
    workspaceId: params.workspaceId,
    projectId: params.projectId,
    entityType: params.entityType,
    entityId: params.entityId,
    title: params.title ?? null,
    stageCode: params.stageCode ?? 'submitted',
    status: 'submitted',
    assignedTo: params.assignedTo ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });
}

export async function recordApprovalAction(params: ApprovalActionParams) {
  return recordWorkflowAction({
    workflowId: params.workflowId,
    actorId: params.actorId,
    actorRole: 'any',
    actionType: params.actionType,
    fromStatus: params.fromStatus ?? null,
    toStatus: params.toStatus ?? null,
    remarks: params.remarks ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });
}