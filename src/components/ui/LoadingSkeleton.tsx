import { memo } from 'react';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  width?: string;
  height?: string;
}

export const LoadingSkeleton = memo(({
  className = '',
  lines = 1,
  width = '100%',
  height = '1rem'
}: LoadingSkeletonProps) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-[#2A2A2A] rounded mb-2 last:mb-0"
          style={{
            width: lines === 1 ? width : `${Math.random() * 40 + 60}%`,
            height
          }}
        />
      ))}
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

export const CardSkeleton = memo(() => (
  <div className="bg-[#1A1A1A] rounded-lg p-6 animate-pulse">
    <LoadingSkeleton height="1.5rem" width="60%" className="mb-4" />
    <LoadingSkeleton lines={3} className="mb-4" />
    <div className="flex gap-2">
      <LoadingSkeleton width="80px" height="2rem" />
      <LoadingSkeleton width="60px" height="2rem" />
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

export const TableSkeleton = memo(({ rows = 5 }: { rows?: number }) => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="flex gap-4 mb-4">
      <LoadingSkeleton width="20%" height="1rem" />
      <LoadingSkeleton width="30%" height="1rem" />
      <LoadingSkeleton width="25%" height="1rem" />
      <LoadingSkeleton width="15%" height="1rem" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 mb-3">
        <LoadingSkeleton width="20%" height="0.875rem" />
        <LoadingSkeleton width="30%" height="0.875rem" />
        <LoadingSkeleton width="25%" height="0.875rem" />
        <LoadingSkeleton width="15%" height="0.875rem" />
      </div>
    ))}
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

export const ProgressSkeleton = memo(() => (
  <div className="animate-pulse">
    <div className="flex justify-between mb-2">
      <LoadingSkeleton width="40%" height="0.875rem" />
      <LoadingSkeleton width="20%" height="0.875rem" />
    </div>
    <div className="w-full bg-[#2A2A2A] rounded-full h-2">
      <div className="bg-[#FF6B00] h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
    </div>
  </div>
));

ProgressSkeleton.displayName = 'ProgressSkeleton';