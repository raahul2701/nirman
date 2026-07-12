import { cn } from '../../../../../lib/utils';
import { RecentActivityViewModel } from '../../config/recent-activity.config';

interface ActivityTimelineItemProps {
  activity: RecentActivityViewModel;
}

export function ActivityTimelineItem({ activity }: ActivityTimelineItemProps) {
  const { icon: Icon, title, description, time, color } = activity;
  return (
    <div className="relative flex items-start gap-4">
      <div className="absolute -left-9 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background">
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <div>
        <p className="text-sm font-medium text-card-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground/70">{time}</p>
      </div>
    </div>
  );
}