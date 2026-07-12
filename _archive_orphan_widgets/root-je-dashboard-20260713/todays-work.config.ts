import type { LucideIcon } from 'lucide-react';
import { WorkflowStatus } from '../../../../types/status';

export type TodaysTaskType = 'INSPECTION' | 'DPR' | 'MB_PREPARATION' | 'MATERIAL_VERIFICATION' | 'SURVEY' | 'SITE_VISIT';
export type TodaysTaskPriority = 'high' | 'medium' | 'low';

/**
 * Data Transfer Object (DTO) for a single task for today.
 */
export type TodaysWorkDTO = {
  id: string;
  taskType: TodaysTaskType;
  title: string;
  dueTime: string; // ISO 8601 string
  status: WorkflowStatus;
  priority: TodaysTaskPriority;
  actionLabel: string;
  workflowId: string;
  entityId: string;
};

/**
 * View Model for a single task, shaped for the UI.
 */
export interface TodaysWorkViewModel extends Omit<TodaysWorkDTO, 'dueTime' | 'workflowId' | 'entityId'> {
  formattedTime: string;
  href: string;
  icon: LucideIcon;
  priority: { name: TodaysTaskPriority; className: string };
}