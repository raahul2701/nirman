import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

export function DashboardCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#12332D]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-[#6C7568]">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}
