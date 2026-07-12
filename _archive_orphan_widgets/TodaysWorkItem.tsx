import { Link } from 'react-router-dom';
import { Button } from '../../../../../components/ui/Button';
import { TodaysWorkViewModel } from '../../config/todays-work.config';
import { cn } from '../../../../../lib/utils';
import { StatusBadge } from '../../../../../components/common/StatusBadge';

interface TodaysWorkItemProps {
  task: TodaysWorkViewModel;
}

export function TodaysWorkItem({ task }: TodaysWorkItemProps) {
  const { icon: Icon, title, formattedTime, status, href, actionLabel, priority } = task;

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
      <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md", priority.className)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-card-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{formattedTime}</p>
      </div>
      <StatusBadge status={status} />
      <Button asChild variant="outline" size="sm">
        <Link to={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}