import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { RouteInfoItem } from '@/types/userManual';
import { Checklist } from './Checklist';

export const RouteInfo = React.memo(({ route, purpose, users, data, steps, result }: RouteInfoItem) => (
  <Card className="p-4">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Badge color="green" variant="ghost" className="font-mono">{route}</Badge>
      <span className="text-sm font-semibold text-foreground">{purpose}</span>
    </div>
    <div className="grid grid-cols-1 gap-3 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
      <p><strong className="font-semibold text-foreground">Who should use it:</strong> {users}</p>
      <p><strong className="font-semibold text-foreground">Required data:</strong> {data}</p>
      <div>
        <p className="font-semibold text-foreground">Step-by-step usage:</p>
        <Checklist items={steps} />
      </div>
      <p><strong className="font-semibold text-foreground">Output/result:</strong> {result}</p>
    </div>
  </Card>
));
