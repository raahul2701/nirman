import { RecentActivityViewModel } from '../../config/recent-activity.config';
import { ActivityTimelineItem } from './ActivityTimelineItem';

interface ActivityTimelineProps {
  activities: RecentActivityViewModel[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-3 top-0 h-full w-0.5 bg-border" />
      <div className="space-y-6">
        {activities.map((activity) => (
          <ActivityTimelineItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}