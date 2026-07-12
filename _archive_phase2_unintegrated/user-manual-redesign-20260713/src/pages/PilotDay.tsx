import React from 'react';
import { Card } from '@/components/ui/Card';
import type { PilotDayItem as PilotDayItemType } from '@/types/userManual';

export const PilotDay = React.memo(({ day, task, usage }: PilotDayItemType) => (
  <Card className="p-4">
    <p className="font-semibold text-foreground">
      {day}: {task}
    </p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{usage}</p>
  </Card>
));
