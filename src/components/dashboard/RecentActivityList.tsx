import { memo } from 'react';
import { Clock } from '../../lib/icons';

export const RecentActivityList = memo(function RecentActivityList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3">
          <Clock size={14} className="text-[#C89B3C]" />
          <p className="text-xs font-medium text-[#12332D]">{item}</p>
        </div>
      ))}
    </div>
  );
});
