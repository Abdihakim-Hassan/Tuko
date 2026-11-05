// App Update & Version Checker Service for Tuko

export const CURRENT_APP_VERSION = '3.0.0';
export const CURRENT_BUILD_NUMBER = 79;

export interface RemoteVersionInfo {
  version: string;
  build: number;
  releaseDate: string;
  minSupportedVersion?: string;
  title?: string;
  changelog?: string[];
}

export interface AppUpdateCheckResult {
  isUpdateAvailable: boolean;
  currentVersion: string;
  currentBuild: number;
  latestVersion: string;
  latestBuild: number;
  releaseDate?: string;
  changelog?: string[];
  hasServiceWorkerWaiting: boolean;
  checkedAt: string;
  isOffline?: boolean;
}

/**
 * Format live Somali/English friendly time string
 */
function formatCheckedTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Fetch with strict timeout so network never hangs indefinitely
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core check implementation
 */
async function _performCheck(): Promise<AppUpdateCheckResult> {
  const checkedAt = formatCheckedTime();

  if (typeof window === 'undefined') {
    return {
      isUpdateAvailable: false,
      currentVersion: CURRENT_APP_VERSION,
      currentBuild: CURRENT_BUILD_NUMBER,
      latestVersion: CURRENT_APP_VERSION,
      latestBuild: CURRENT_BUILD_NUMBER,
      hasServiceWorkerWaiting: false,
      checkedAt,
    };
  }

  // If phone is offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      isUpdateAvailable: false,
      currentVersion: CURRENT_APP_VERSION,
      currentBuild: CURRENT_BUILD_NUMBER,
      latestVersion: CURRENT_APP_VERSION,
      latestBuild: CURRENT_BUILD_NUMBER,
      hasServiceWorkerWaiting: false,
      checkedAt,
      isOffline: true,
    };
  }

  let swWaiting = false;

  // 1. Check ServiceWorker registration with a 1.2s timeout so it never hangs
  if ('serviceWorker' in navigator) {
    try {
      const swPromise = (async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) swWaiting = true;
          await reg.update().catch(() => {});
          if (reg.waiting) swWaiting = true;
        }
      })();
      await Promise.race([
        swPromise,
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch (_) {}
  }

  // 2. Fetch live version.json from Firebase with strict 2.5s timeout
  try {
    const res = await fetchWithTimeout(`/version.json?_t=${Date.now()}`, 2500);
    if (res.ok) {
      const remoteInfo = (await res.json()) as RemoteVersionInfo;
      const remoteBuild = Number(remoteInfo.build) || CURRENT_BUILD_NUMBER;
      const isNewerBuild = remoteBuild > CURRENT_BUILD_NUMBER;
      const isNewerVersion = remoteInfo.version !== CURRENT_APP_VERSION && isNewerBuild;
      const isUpdateAvailable = isNewerBuild || isNewerVersion || swWaiting;

      try {
        localStorage.setItem('tuko_last_update_check', checkedAt);
      } catch (_) {}

      return {
        isUpdateAvailable,
        currentVersion: CURRENT_APP_VERSION,
        currentBuild: CURRENT_BUILD_NUMBER,
        latestVersion: remoteInfo.version || CURRENT_APP_VERSION,
        latestBuild: remoteBuild,
        releaseDate: remoteInfo.releaseDate,
        changelog: remoteInfo.changelog || [],
        hasServiceWorkerWaiting: swWaiting,
        checkedAt,
      };
    }
  } catch (err) {
    console.warn('Live version check notice:', err);
  }

  return {
    isUpdateAvailable: swWaiting,
    currentVersion: CURRENT_APP_VERSION,
    currentBuild: CURRENT_BUILD_NUMBER,
    latestVersion: CURRENT_APP_VERSION,
    latestBuild: CURRENT_BUILD_NUMBER,
    hasServiceWorkerWaiting: swWaiting,
    checkedAt,
  };
}

/**
 * Check if a newer version of Tuko is available on the server or in the ServiceWorker
 * Guaranteed to return within 3.5 seconds maximum — never hangs!
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  const fallbackCheckedAt = formatCheckedTime();
  const maxTimeout = new Promise<AppUpdateCheckResult>((resolve) => {
    setTimeout(() => {
      resolve({
        isUpdateAvailable: false,
        currentVersion: CURRENT_APP_VERSION,
        currentBuild: CURRENT_BUILD_NUMBER,
        latestVersion: CURRENT_APP_VERSION,
        latestBuild: CURRENT_BUILD_NUMBER,
        hasServiceWorkerWaiting: false,
        checkedAt: fallbackCheckedAt,
      });
    }, 3500);
  });

  return Promise.race([_performCheck(), maxTimeout]);
}

/**
 * Apply the update by purging stale app-shell caches (preserving offline Quran data/audio),
 * activating the waiting Service Worker, and performing a fresh cache-busted reload.
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
  } catch (_) {}

  // 1. Delete old app-shell caches (tuko-pwa-*) while keeping offline Quran data & audio caches
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith('tuko-pwa-')) {
            return caches.delete(k);
          }
          return Promise.resolve(false);
        })
      );
    } catch (_) {}
  }

  // 2. Update & activate waiting Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (_) {}
  }

  // 3. Reload with fresh cache-busting query parameter so WebView & Browser fetch latest index.html & JS
  setTimeout(() => {
    const cleanPath = window.location.pathname || '/';
    window.location.replace(`${cleanPath}?_updated=${Date.now()}`);
  }, 300);
}
