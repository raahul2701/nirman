import { memo } from 'react';

export const DashboardSectionSkeleton = memo(() => (
  <div className="grid gap-4">
    <div className="rounded-2xl p-5 animate-pulse bg-slate-900" style={{ border: '1px solid #232323' }}>
      <div className="h-4 w-1/3 mb-4 rounded bg-slate-700" />
      <div className="h-36 rounded bg-slate-800" />
    </div>
    <div className="rounded-2xl p-5 animate-pulse bg-slate-900" style={{ border: '1px solid #232323' }}>
      <div className="h-4 w-1/4 mb-4 rounded bg-slate-700" />
      <div className="h-36 rounded bg-slate-800" />
    </div>
  </div>
));
