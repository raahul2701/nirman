import { memo } from 'react';
import { CheckCircle2 } from '../../lib/icons';

export const InsightsList = memo(function InsightsList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3 text-xs text-[#12332D]">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-[#005F56]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
});
