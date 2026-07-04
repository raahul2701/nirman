import { memo } from 'react';
import { cn } from '../../lib/utils';

type ProgressBarProps = {
  value: number;
  className?: string;
};

export const ProgressBar = memo(function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div
      className="h-2 w-full rounded-full bg-[#EFE8D4]"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-2 rounded-full bg-[#005F56]", className)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
});
