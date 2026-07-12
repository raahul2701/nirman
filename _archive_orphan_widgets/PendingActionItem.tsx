import { Link } from 'react-router-dom';
import { PendingActionViewModel } from '../../config/pending-actions.config';
import { Button } from '../../../../../components/ui/Button';
import { cn } from '../../../../../lib/utils';
import { PriorityIcon } from '../../../../../components/common/PriorityIcon';
import { StatusBadge } from '../../../../../components/common/StatusBadge';

interface PendingActionItemProps {
  action: PendingActionViewModel;
}

export function PendingActionItem({ action }: PendingActionItemProps) {
  const { icon: Icon, title, formattedDueDate, isOverdue, priority, status, href, actionLabel } = action;

  return (
    <div className="flex items-center gap-3">
      <PriorityIcon icon={Icon} priority={priority} />
      <div className="flex-1">
        <p className="text-sm font-medium text-card-foreground flex items-center gap-2">
          <span>{title}</span>
          <StatusBadge status={status} />
        </p>
        <p className={cn("text-xs", isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
          Due: {formattedDueDate}
          {isOverdue && ' (Overdue)'}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}