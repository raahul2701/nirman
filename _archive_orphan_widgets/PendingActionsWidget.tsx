import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { usePendingActions } from '../../hooks/usePendingActions';
import { PendingActionsSkeleton } from './PendingActionsSkeleton';
import { PendingActionItem } from './PendingActionItem';
import { EmptyState } from '../../../../../components/dashboard/EmptyState';
import { useAuth } from '../../../../../contexts/useAuth';

export function PendingActionsWidget() {
  const { user } = useAuth();
  // TODO: Replace 'mock-user-id' with the actual user ID from auth context
  const { actions, loading, error, refresh } = usePendingActions(user?.id);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Pending Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !user ? (
          <PendingActionsSkeleton />
        ) : error ? (
          <EmptyState description={error} onRetry={refresh} />
        ) : actions.length > 0 ? (
          <div className="space-y-4">
            {actions.map(action => (
              <PendingActionItem key={action.id} action={action} />
            ))}
          </div>
        ) : (
          <EmptyState description="No pending actions. You're all caught up!" />
        )}
      </CardContent>
    </Card>
  );
}