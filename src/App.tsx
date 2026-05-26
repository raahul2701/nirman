import { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { AppRoutes } from './router/AppRoutes';
import { initializeDataServices } from './services/data/dataInitializer';
import { ActivityRouteTracker } from './components/ActivityRouteTracker';

// Wrapper to initialize data services
function AppContent() {
  useEffect(() => {
    initializeDataServices().catch(err => console.error('Failed to initialize data services:', err));

    return () => {
      // Cleanup on unmount (optional)
    };
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
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
