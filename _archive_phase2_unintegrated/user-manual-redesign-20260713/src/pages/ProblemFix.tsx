import React from 'react';
import { Card } from '@/components/ui/Card';
import type { ProblemFixItem as ProblemFixItemType } from '@/types/userManual';

export const ProblemFix = React.memo(({ problem, fix }: ProblemFixItemType) => (
  <Card className="p-4">
    <p className="font-semibold text-foreground">{problem}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{fix}</p>
  </Card>
));
