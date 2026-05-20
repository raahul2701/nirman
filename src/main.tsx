import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { pwaManager } from './services/pwa/pwaManager';
import { trackCrash } from './services/observability/diagnostics';
import { offlineSyncService } from './services/offline/offlineSyncService';
import { reportEnvironmentStatus } from './lib/environment';
import { productionMonitor } from './services/monitoring/productionMonitor';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  const registerSW = () => {
    void navigator.serviceWorker.register('/sw.js');
  };

  if (typeof globalThis !== 'undefined') {
    const globalScope = globalThis as unknown as {
      addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
      requestIdleCallback?: (callback: FrameRequestCallback) => number;
    };

    if (typeof globalScope.requestIdleCallback === 'function') {
      globalScope.requestIdleCallback!(registerSW);
    } else if (typeof globalScope.addEventListener === 'function') {
      globalScope.addEventListener('load', registerSW);
    }
  }
}

pwaManager.init();
const environmentStatus = reportEnvironmentStatus();
window.addEventListener('error', (event) => trackCrash(event.error, { source: 'window.error' }));
window.addEventListener('unhandledrejection', (event) => trackCrash(event.reason, { source: 'unhandledrejection' }));
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'NIRMAN_BACKGROUND_SYNC') {
    void offlineSyncService.syncAll();
  }
});

if (environmentStatus.ok) {
  productionMonitor.start();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
