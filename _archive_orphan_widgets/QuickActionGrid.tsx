import { JE_QUICK_ACTION_TYPE } from '../../config/quick-actions.config';
import { QuickActionTile } from './QuickActionTile';

interface QuickActionGridProps {
  actions: JE_QUICK_ACTION_TYPE[];
}

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {actions.map((action) => (
        <QuickActionTile key={action.id} action={action} />
      ))}
    </div>
  );
}