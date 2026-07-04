import { Bell } from '../../lib/icons';
import { EmptyState } from './EmptyState';

export function NotificationPanel() {
  // Future implementation will fetch and display real notifications.
  return <EmptyState icon={<Bell size={24} />} title="All caught up" description="No new notifications." />;
}