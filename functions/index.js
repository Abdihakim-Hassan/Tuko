// Tuko Cloud Functions — server-sent Adhan push notifications
// Runs every minute, finds devices whose prayer time (stored as UTC "HH:MM") equals now,
// and sends a Web Push via FCM so the Adhan arrives even when the phone is locked / app closed.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const TEXT = {
  so: { title: '🕌 Waa Waqtigii Salaadda', body: 'Aadaanka waa la aadaamay. Kac oo tuko — Allaah ha kaa aqbalo.' },
  en: { title: '🕌 It is Prayer Time', body: 'The Adhan has been called. Rise and pray — may Allah accept it.' },
};

exports.sendAdhanPush = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Etc/UTC', region: 'europe-west1', memory: '256MiB' },
  async () => {
    const now = new Date();
    const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const db = getFirestore();

    const snap = await db
      .collectionGroup('fcmTokens')
      .where('prayerTimesUtc', 'array-contains', hhmm)
      .get();

    if (snap.empty) return;

    const staleRefs = [];
    const jobs = snap.docs
      .filter((d) => d.get('enabled') !== false && typeof d.get('token') === 'string')
      .map(async (d) => {
        const lang = d.get('lang') === 'en' ? 'en' : 'so';
        const t = TEXT[lang];
        try {
          await getMessaging().send({
            token: d.get('token'),
            notification: { title: t.title, body: t.body },
            webpush: {
              headers: { Urgency: 'high', TTL: '600' },
              notification: {
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'tuko-prayer-adhan',
                renotify: true,
                requireInteraction: true,
                vibrate: [400, 200, 400, 200, 600],
                actions: [
                  { action: 'play', title: '📢 Shid Aadaanka' },
                  { action: 'open', title: '🕌 Fur App-ka' },
                ],
              },
              fcmOptions: { link: 'https://tuko-8a4e3.web.app/?action=play_adhan' },
            },
            data: { url: '/?action=play_adhan', action: 'play_adhan' },
          });
        } catch (err) {
          const code = err && err.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleRefs.push(d.ref);
          }
        }
      });

    await Promise.all(jobs);
    await Promise.all(staleRefs.map((r) => r.delete().catch(() => {})));
  }
);
