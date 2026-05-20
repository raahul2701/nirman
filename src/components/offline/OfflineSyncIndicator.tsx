// Offline sync status indicator
import React from 'react';
import { useSyncStatus } from '../../hooks/useDataServices';
import { AlertCircle, CheckCircle, Clock, WifiOff } from 'lucide-react';

export function OfflineSyncIndicator() {
  const status = useSyncStatus();
  const { pending, syncing, synced, failed } = status;

  if (pending === 0 && syncing === 0 && failed === 0) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded text-xs">
        <CheckCircle size={14} />
        <span>All synced</span>
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs">
        <AlertCircle size={14} />
        <span>{failed} failed to sync</span>
      </div>
    );
  }

  if (syncing > 0 || pending > 0) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded text-xs animate-pulse">
        <Clock size={14} />
        <span>{syncing > 0 ? `${syncing} syncing` : `${pending} pending`}</span>
      </div>
    );
  }

  return null;
}

// Offline banner (show when no network)
export function OfflineBanner() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 max-w-sm bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
      <WifiOff size={18} />
      <div>
        <p className="font-medium">You're offline</p>
        <p className="text-sm text-gray-300">Changes will sync when you're back online</p>
      </div>
    </div>
  );
}
