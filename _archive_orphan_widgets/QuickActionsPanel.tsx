import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { useQuickActions } from '../../hooks/useQuickActions';
import { QuickActionGrid } from './QuickActionGrid';
import { QuickActionsSkeleton } from './QuickActionsSkeleton';

export function QuickActionsPanel() {
  const { actions, loading } = useQuickActions();

  return (
    <Card className="md:col-span-3 lg:col-span-4">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <QuickActionsSkeleton />
        ) : actions.length > 0 ? (
          <QuickActionGrid actions={actions} />
        ) : (
          <p className="text-sm text-muted-foreground">No quick actions available for this project stage.</p>
        )}
      </CardContent>
    </Card>
  );
}