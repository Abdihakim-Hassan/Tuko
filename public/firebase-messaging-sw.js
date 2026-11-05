// Firebase Cloud Messaging Service Worker for Tuko App
// Handles background push notifications when screen is locked or app is closed
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "tuko-8a4e3",
  appId: "1:666798962687:web:8179dffcb62cbabed219ca",
  apiKey: "AIzaSyCq2hrFvDuDPOgI69aaAVRGujPpe5D5R_Q",
  authDomain: "tuko-8a4e3.firebaseapp.com",
  storageBucket: "tuko-8a4e3.firebasestorage.app",
  messagingSenderId: "666798962687",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || '🕌 Waqtigii Salaadda (Aadaan)';
  const notificationOptions = {
    body: payload.notification?.body || 'Waa waqtigii salaadda. U kac xuska Alle iyo cibaadada!',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'tuko-prayer-adhan',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 600],
    data: {
      url: payload.data?.url || '/?action=play_adhan',
    },
    actions: [
      { action: 'play', title: '📢 Shid Aadaanka' },
      { action: 'open', title: '🕌 Fur App-ka' },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/?action=play_adhan';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'PLAY_ADHAN_NOW' });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
