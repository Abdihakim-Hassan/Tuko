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

// Register PWA Service Worker for Android/iOS/Desktop installability and clean up stale caches
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerPwaServiceWorker = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((key) => {
            if (key !== 'tuko-pwa-v62') {
              caches.delete(key).catch(() => {});
            }
          });
        })
        .catch(() => {});
    }
  };

  if (document.readyState === 'complete') {
    registerPwaServiceWorker();
  } else {
    window.addEventListener('load', registerPwaServiceWorker, { once: true });
  }
}
