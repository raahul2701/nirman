// Skeleton loaders for mobile - UI components
import React from 'react';

export function UploadProgressSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4" />
      <div className="h-2 bg-gray-600 rounded animate-pulse w-1/2" />
    </div>
  );
}

export function AIAnalysisSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6" />
      <div className="h-4 bg-gray-700 rounded animate-pulse w-4/6" />
      <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6" />
    </div>
  );
}
