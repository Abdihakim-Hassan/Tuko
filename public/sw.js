// Tuko Service Worker v80 — 100% Full Offline Mode Across All 12 Sections & All 114 Surahs
const CACHE_NAME = 'tuko-pwa-v80';
const QURAN_DATA_CACHE = 'tuko-quran-data-v1';
const QURAN_AUDIO_CACHE = 'tuko-audio-cache-v2';

const CORE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
];

const ADHAN_AUDIO_ASSETS = [
  '/audio/adhan.mp3',
  '/audio/adhan_fajr.mp3',
  '/audio/adhan_makkah.mp3',
  '/audio/adhan_afasy.mp3',
  '/audio/adhan_abdulbasit.mp3',
  '/audio/adhan_minshawi.mp3',
  '/audio/adhan_qatami.mp3',
  '/audio/adhan_zahrani.mp3',
  '/audio/adhan_alijaber.mp3',
  '/audio/adhan_umar.mp3',
  '/audio/adhan_ayyub.mp3',
  '/audio/adhan_badralturki.mp3',
];

// All 114 Surahs (Uthmani Arabic + Somali Translation) built into /data/quran/{1..114}.json
const ALL_114_QURAN_JSONS = Array.from({ length: 114 }, (_, i) => `/data/quran/${i + 1}.json`);

async function cacheUrlsResiliently(cacheName, urls, batchSize = 10) {
  try {
    const cache = await caches.open(cacheName);
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (url) => {
          const existing = await cache.match(url);
          if (!existing) {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res && res.status === 200) {
              await cache.put(url, res);
            }
          }
        })
      );
    }
  } catch (err) {
    console.warn('SW resilient cache notice:', err);
  }
}

async function discoverAndCacheBuildBundles(cache) {
  try {
    const res = await fetch('/index.html', { cache: 'no-cache' });
    if (!res || res.status !== 200) return;
    const html = await res.clone().text();
    await cache.put('/index.html', res.clone());
    await cache.put('/', res);

    // Extract all Vite hashed /assets/*.js and /assets/*.css from index.html
    const assetMatches = html.match(/\/assets\/[^\s"'<>]+/g) || [];
    const uniqueAssets = Array.from(new Set(assetMatches));
    await Promise.allSettled(
      uniqueAssets.map(async (assetUrl) => {
        const assetRes = await fetch(assetUrl);
        if (assetRes && assetRes.status === 200) {
          await cache.put(assetUrl, assetRes);
        }
      })
    );
  } catch (err) {
    console.warn('SW bundle discovery notice:', err);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 1. Precache core shell & auto-discover Vite JS/CSS bundles immediately
      await Promise.allSettled(
        CORE_SHELL_ASSETS.map(async (url) => {
          const res = await fetch(url);
          if (res && res.status === 200) {
            await cache.put(url, res);
          }
        })
      );
      await discoverAndCacheBuildBundles(cache);

      // 2. Kick off background precaching of all 114 Surahs & Adhan voices without delaying SW activation
      cacheUrlsResiliently(QURAN_DATA_CACHE, ALL_114_QURAN_JSONS, 12);
      cacheUrlsResiliently(CACHE_NAME, ADHAN_AUDIO_ASSETS, 4);

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  const KEEP_CACHES = new Set([CACHE_NAME, QURAN_DATA_CACHE, QURAN_AUDIO_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!KEEP_CACHES.has(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => {
        // Ensure all 114 surahs are cached on activate as well
        cacheUrlsResiliently(QURAN_DATA_CACHE, ALL_114_QURAN_JSONS, 12);
        return self.clients.claim();
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PRECACHE_ALL_OFFLINE') {
    cacheUrlsResiliently(QURAN_DATA_CACHE, ALL_114_QURAN_JSONS, 12);
    cacheUrlsResiliently(CACHE_NAME, ADHAN_AUDIO_ASSETS, 4);
  }
});

// 100% Offline-First Fetch Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore Firebase Firestore / Auth live RPC & OAuth popup calls, version checks, and direct APK installer downloads
  if (
    url.pathname.endsWith('.apk') ||
    url.pathname === '/version.json' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('apis.google.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.pathname.startsWith('/__/auth') ||
    url.pathname.startsWith('/__/firebase') ||
    url.pathname.startsWith('/api/sync')
  ) {
    return;
  }

  // 1. Navigation requests (App Shell — works 100% offline on reload or deep link)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, clone.clone());
                cache.put('/index.html', clone);
              })
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'))
          );
        })
    );
    return;
  }

  // 2. Local 114 Quran Surah JSON files (/data/quran/*.json): Cache-First from QURAN_DATA_CACHE
  if (url.origin === self.location.origin && url.pathname.startsWith('/data/quran/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches
              .open(QURAN_DATA_CACHE)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2b. Local Adhan & Alarm MP3s (/audio/*.mp3): Network-first when online (prevents Range/206 or SPA-fallback HTML cache issues), Cache fallback when offline
  if (url.origin === self.location.origin && url.pathname.startsWith('/audio/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const ct = (networkResponse && networkResponse.headers.get('content-type')) || '';
          if (networkResponse && networkResponse.status === 200 && ct.includes('audio')) {
            const clone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(url.pathname, clone))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          return (
            (await caches.match(url.pathname)) ||
            (await caches.match(event.request, { ignoreSearch: true })) ||
            new Response('', { status: 503, statusText: 'Offline' })
          );
        })
    );
    return;
  }

  // 3. Same-origin assets (JS, CSS, Icons): Cache-First with background update
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, networkResponse))
                  .catch(() => {});
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(async () => {
            if (event.request.destination === 'document') {
              return (await caches.match('/index.html')) || (await caches.match('/'));
            }
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 4. Google Fonts (Amiri Arabic & Plus Jakarta Sans): Cache-First for crisp offline typography
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const clone = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 200 }));
      })
    );
    return;
  }

  // 5. External Quran Recitation & Somali Tafsir Audio (everyayah.com, archive.org, alquran.cloud)
  if (
    url.hostname.includes('everyayah.com') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('alquran.cloud') ||
    url.hostname.includes('islamic.network')
  ) {
    event.respondWith(
      caches.match(event.request.url).then((cachedResponse) => {
        if (cachedResponse && cachedResponse.status === 200) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches
                .open(QURAN_AUDIO_CACHE)
                .then((cache) => cache.put(event.request.url, clone))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            if (url.hostname.includes('alquran.cloud')) {
              return new Response('{"code":503,"status":"Offline"}', {
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return new Response('', { status: 503, statusText: 'Offline Audio' });
          });
      })
    );
  }
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  let title = '🕌 Waqtigii Salaadda (Aadaan)';
  let options = {
    body: 'Waa waqtigii salaadda. U kac xuska Alle iyo cibaadada!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'tuko-prayer-adhan',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 600],
    data: { url: '/' },
    actions: [
      { action: 'play', title: '📢 Shid Aadaanka' },
      { action: 'open', title: '🕌 Fur App-ka' },
    ],
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        title = payload.notification.title || title;
        options.body = payload.notification.body || options.body;
        if (payload.notification.icon) options.icon = payload.notification.icon;
      }
      if (payload.data) {
        options.data = payload.data;
      }
    } catch {
      const text = event.data.text();
      if (text) options.body = text;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = '/?action=play_adhan';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'PLAY_ADHAN_NOW' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
