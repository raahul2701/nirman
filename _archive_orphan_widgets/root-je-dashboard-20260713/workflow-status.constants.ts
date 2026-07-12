import { WorkflowStatus } from '../../../../types/status';

type StatusConfig = {
  label: string;
  className: string;
};

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, StatusConfig> = {
  pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  in_review: { label: 'In Review', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  requires_action: { label: 'Requires Action', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejected', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};