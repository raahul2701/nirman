import { Link } from 'react-router-dom';
import { JE_QUICK_ACTION_TYPE } from '../../config/quick-actions.config';
import { jeRouteMap } from '../../../config/route-map';
import { Badge } from '../../../../../components/ui/Badge';

interface QuickActionTileProps {
  action: JE_QUICK_ACTION_TYPE;
}

export function QuickActionTile({ action }: QuickActionTileProps) {
  const { id, label, icon: Icon, badge, badgeVariant = 'destructive', disabled } = action;
  const href = jeRouteMap[id] || '/je/dashboard';

  const content = (
    <>
      {badge && (
        <Badge variant={badgeVariant} className="absolute -top-2 -right-2 px-1.5 text-xs">{badge}</Badge>
      )}
      <Icon className="h-6 w-6 text-muted-foreground" />
      <span>{label}</span>
    </>
  );

  if (disabled) {
    return (
      <div className="relative flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 p-4 text-center text-sm font-medium text-muted-foreground/50 opacity-50 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className="relative flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-center text-sm font-medium text-card-foreground transition-colors hover:bg-muted/50"
    >
      {content}
    </Link>
  );
}