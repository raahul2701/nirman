// Mobile-friendly UI hooks for upload progress
import React, { useEffect, useState } from 'react';
import { mobileUploadManager, type UploadSession } from '../services/mobile/mobileUploadManager';

export function useUploadProgress(sessionId?: string) {
  const [sessions, setSessions] = useState<UploadSession[]>([]);

  useEffect(() => {
    if (sessionId) {
      const session = mobileUploadManager.getSession(sessionId);
      if (session) setSessions([session]);
    } else {
      setSessions(mobileUploadManager.getAllSessions());
    }

    const unsubscribe = mobileUploadManager.subscribe(session => {
      if (sessionId && session.id !== sessionId) return;
      setSessions(prev =>
        prev.map(s => (s.id === session.id ? session : s)).concat(
          prev.some(s => s.id === session.id) ? [] : [session]
        )
      );
    });

    return unsubscribe;
  }, [sessionId]);

  return { sessions, activeCount: sessions.filter(s => s.status === 'uploading').length };
}

// Skeleton loaders for mobile
export function UploadProgressSkeleton() {
  return React.createElement(
    'div',
    { className: 'space-y-2' },
    React.createElement('div', { className: 'h-3 bg-gray-700 rounded animate-pulse w-3/4' }),
    React.createElement('div', { className: 'h-2 bg-gray-600 rounded animate-pulse w-1/2' })
  );
}

export function AIAnalysisSkeleton() {
  return React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement('div', { className: 'h-4 bg-gray-700 rounded animate-pulse w-5/6' }),
    React.createElement('div', { className: 'h-4 bg-gray-700 rounded animate-pulse w-4/6' }),
    React.createElement('div', { className: 'h-4 bg-gray-700 rounded animate-pulse w-5/6' })
  );
}
