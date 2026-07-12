import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { WorkflowStatus } from '../../types/status';
import { WORKFLOW_STATUS_CONFIG } from '../../modules/je/dashboard/constants/workflow-status.constants';

interface StatusBadgeProps {
  status: WorkflowStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = WORKFLOW_STATUS_CONFIG[status] || WORKFLOW_STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>{config.label}</Badge>
  );
}