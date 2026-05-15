import { memo } from 'react';

export const LoadingFallback = memo(() => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
      <p className="text-[#606060] text-sm">Loading NIRMAN AI...</p>
    </div>
  </div>
));