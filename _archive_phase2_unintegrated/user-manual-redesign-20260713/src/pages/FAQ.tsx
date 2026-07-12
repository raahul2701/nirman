import React from 'react';
import { Card } from '@/components/ui/Card';
import type { FAQItem as FAQItemType } from '@/types/userManual';

export const FAQ = React.memo(({ q, a }: FAQItemType) => (
  <Card className="p-4">
    <p className="font-semibold text-foreground">{q}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a}</p>
  </Card>
));
