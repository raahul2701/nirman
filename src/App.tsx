import { Suspense, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { AppRoutes } from './router/AppRoutes';
import { initializeDataServices } from './services/data/dataInitializer';
import { ActivityRouteTracker } from './components/ActivityRouteTracker';
import { pwaManager } from './services/pwa/pwaManager';

// Wrapper to initialize data services
function AppContent() {
  const [staleAssets, setStaleAssets] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    initializeDataServices().catch(err => console.error('Failed to initialize data services:', err));
    const showStaleAssets = () => setStaleAssets(true);
    window.addEventListener('nirman:stale-assets', showStaleAssets);
    const unsubscribe = pwaManager.onUpdate(showStaleAssets);

    return () => {
      window.removeEventListener('nirman:stale-assets', showStaleAssets);
      unsubscribe();
    };
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      {staleAssets && (
        <div className="fixed bottom-4 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4 shadow-lg">
          <p className="mb-3 text-sm font-semibold text-[#12332D]">A newer application version is available. Reload securely.</p>
          <button
            type="button"
            disabled={recovering}
            onClick={() => {
              setRecovering(true);
              void pwaManager.recoverFromStaleAssets();
            }}
            className="rounded-md bg-[#005F56] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {recovering ? 'Reloading...' : 'Reload securely'}
          </button>
        </div>
      )}
      <ActivityRouteTracker />
      <AppRoutes />
    </Suspense>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
