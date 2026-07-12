import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { EmptyState } from '../../../../../components/dashboard/EmptyState';
import { useTodaysWork } from '../../hooks/useTodaysWork';
import { TodaysWorkContent } from './TodaysWorkContent';
import { TodaysWorkSkeleton } from './TodaysWorkSkeleton';
import { TODAYS_WORK_STRINGS } from '../../constants/todays-work.constants';

export function TodaysWorkWidget() {
  // TODO: Consume projectId and userId from context
  const { tasks, loading, error, refresh } = useTodaysWork('mock-project-id', 'mock-user-id');

  return (
    <Card className="md:col-span-3 lg:col-span-4">
      <CardHeader>
        <CardTitle>Today's Work</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TodaysWorkSkeleton />
        ) : error ? (
          <EmptyState description={error} onRetry={refresh} />
        ) : tasks.length > 0 ? (
          <TodaysWorkContent tasks={tasks} />
        ) : (
          <EmptyState description={TODAYS_WORK_STRINGS.NO_DATA} />
        )}
      </CardContent>
    </Card>
  );
}