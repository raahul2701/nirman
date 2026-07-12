import type { PropsWithChildren } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface WidgetActions {
  refresh?: boolean;
  filter?: boolean;
  settings?: boolean;
  onRefresh?: () => void;
  onSettings?: () => void;
}

interface BaseWidgetProps {
  title: string;
  status?: string;
  priority?: string;
  isLoading?: boolean;
  actions?: WidgetActions;
  className?: string;
}

export function BaseWidget(props: PropsWithChildren<BaseWidgetProps>) {
  const {
    title,
    isLoading = false,
    actions,
    className = '',
    children
  } = props;

  return (
    <Card className={cn('lg:col-span-2', className)}>
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-base font-semibold text-[#12332D]">{title}</h3>
        {actions && (
          <div className="flex items-center gap-1">
            {actions.refresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8"
                onClick={actions.onRefresh}
                aria-label="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {actions.settings && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8"
                onClick={actions.onSettings}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        {isLoading ? <p>Loading...</p> : children}
      </div>
    </Card>
  );
}
