import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Package, Book } from 'lucide-react';
import { WorkflowStatus } from '../../../../types/status';

export type PENDING_ACTION_PRIORITY = 'high' | 'medium' | 'low';

/**
 * Data Transfer Object (DTO) for a single pending action from the API.
 */
export type PENDING_ACTION_TYPE = {
  id: string;
  title: string;
  module: string;
  icon: LucideIcon;
  workflowStage: string;
  status: WorkflowStatus;
  priority: PENDING_ACTION_PRIORITY;
  dueDate: string; // ISO string
  actionLabel: string;
  workflowId: string;
  entityId: string;
};

export interface PendingActionViewModel extends PENDING_ACTION_TYPE {
  isOverdue: boolean;
  formattedDueDate: string;
  href: string;
}

const today = new Date();
const yesterday = new Date(new Date().setDate(today.getDate() - 1));
const tomorrow = new Date(new Date().setDate(today.getDate() + 1));

export const mockPendingActions: PENDING_ACTION_TYPE[] = [
  {
    id: 'dpr-1',
    title: 'Review DPR for yesterday',
    module: 'Daily Progress',
    icon: ClipboardList,
    workflowStage: 'Review',
    status: 'pending',
    priority: 'high',
    dueDate: today.toISOString(),
    actionLabel: 'Review',
    workflowId: 'dpr-review',
    entityId: 'dpr-xyz-123',
  },
  {
    id: 'mat-1',
    title: 'Verify Material Receipt #MRN-123',
    module: 'Material',
    icon: Package,
    workflowStage: 'Verification',
    status: 'requires_action',
    priority: 'medium',
    dueDate: yesterday.toISOString(),
    actionLabel: 'Verify',
    workflowId: 'material-verification',
    entityId: 'mrn-abc-456',
  },
  {
    id: 'mb-1',
    title: 'Prepare MB for Slab Casting',
    module: 'Measurement Book',
    icon: Book,
    workflowStage: 'Preparation',
    status: 'pending',
    priority: 'medium',
    dueDate: tomorrow.toISOString(),
    actionLabel: 'Prepare',
    workflowId: 'mb-preparation',
    entityId: 'mb-def-789',
  },
];