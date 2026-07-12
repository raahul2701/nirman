import React from 'react';
import { Card } from '@/components/ui/Card';

interface ManualSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const ManualSection = React.memo(({ id, title, icon, children }: ManualSectionProps) => (
  <section id={id} className="scroll-mt-24" aria-labelledby={`section-title-${id}`}>
    <Card className="mb-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">{icon}</div>
        <h2 id={`section-title-${id}`} className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </Card>
  </section>
));