import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReactNativeResponsiveProvider } from './utils/reactNative';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ReactNativeResponsiveProvider>
        <App />
      </ReactNativeResponsiveProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Clean up any old caches or stuck service workers in idle time so page reloads are always instant
if (typeof window !== 'undefined') {
  const cleanupStaleWorkersAndCaches = () => {
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((key) => {
            caches.delete(key).catch(() => {});
          });
        })
        .catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            // Update or unregister any old intercepting service worker
            reg.update().catch(() => {});
          }
        })
        .catch(() => {});
    }
  };

  if (document.readyState === 'complete') {
    setTimeout(cleanupStaleWorkersAndCaches, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(cleanupStaleWorkersAndCaches, 2000), { once: true });
  }
}
