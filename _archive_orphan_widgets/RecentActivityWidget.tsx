import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { EmptyState } from '../../../../../components/dashboard/EmptyState';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import { ActivityTimeline } from './ActivityTimeline';
import { RecentActivitySkeleton } from './RecentActivitySkeleton';

export function RecentActivityWidget() {
  // TODO: Consume projectId from a ProjectContext
  const { activities, loading, error, refresh } = useRecentActivity('mock-project-id');

  return (
    <Card className="md:col-span-3 lg:col-span-4">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RecentActivitySkeleton />
        ) : error ? (
          <EmptyState description={error} onRetry={refresh} />
        ) : activities.length > 0 ? (
          <ActivityTimeline activities={activities} />
        ) : (
          <EmptyState description="No recent activity for this project." />
        )}
      </CardContent>
    </Card>
  );
}