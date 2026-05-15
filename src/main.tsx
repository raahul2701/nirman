import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
