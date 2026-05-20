// Mobile-friendly UI hooks for upload progress
import { useEffect, useState } from 'react';
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
