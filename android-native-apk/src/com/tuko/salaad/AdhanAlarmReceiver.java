package com.tuko.salaad;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class AdhanAlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_PLAY_ADHAN = "com.tuko.salaad.PLAY_ADHAN";
    public static final String ACTION_STOP_ADHAN = "com.tuko.salaad.STOP_ADHAN";
    public static final String CHANNEL_ID = "tuko_adhan_alarm_v2";
    public static final String PREFS_NAME = "tuko_native_alarms";
    private static final int NOTIFICATION_ID = 1001;
    private static final String TAG = "TukoAlarmReceiver";

    public static synchronized void stopAndSilenceCurrentMinute(Context context) {
        AdhanAudioPlayer.stop();
        if (context == null) return;
        try {
            long now = System.currentTimeMillis();
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
            String currentHHmm = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(now));
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .remove("stopped_until_ms")
                    .putString("stopped_minute_key", today + "_" + currentHHmm)
                    .apply();

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
            Log.d(TAG, "User stopped Adhan/Alarm — silenced minute " + today + "_" + currentHHmm);
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP_ADHAN.equals(action)) {
            stopAndSilenceCurrentMinute(context);
            return;
        }

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            Log.d(TAG, "Boot or package update received — starting AdhanForegroundService & rescheduling alarms");
            AdhanForegroundService.startServiceSafely(context);
            TukoNativeBridge.rescheduleFromPrefs(context);
            return;
        }

        String itemId = intent != null && intent.getStringExtra("itemId") != null
                ? intent.getStringExtra("itemId")
                : "";
        String prayerName = intent != null && intent.getStringExtra("prayerName") != null
                ? intent.getStringExtra("prayerName")
                : "Salaad";
        String voice = intent != null && intent.getStringExtra("voice") != null
                ? intent.getStringExtra("voice")
                : "makkah";
        String soundType = intent != null && intent.getStringExtra("soundType") != null
                ? intent.getStringExtra("soundType")
                : "adhan";
        String itemType = intent != null && intent.getStringExtra("itemType") != null
                ? intent.getStringExtra("itemType")
                : "adhan";
        String time24 = intent != null && intent.getStringExtra("time24") != null
                ? intent.getStringExtra("time24")
                : "";

        triggerAdhanOrAlarmNow(context, itemId, prayerName, voice, soundType, itemType, time24);
    }

    public static synchronized void triggerAdhanOrAlarmNow(
            Context context,
            String itemId,
            String title,
            String voice,
            String soundType,
            String itemType,
            String time24
    ) {
        try {
            long now = System.currentTimeMillis();
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
            String currentHHmm = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(now));
            String effectiveTime = (time24 != null && !time24.isEmpty()) ? time24 : currentHHmm;
            String rawId = (itemId != null && !itemId.isEmpty()) ? itemId : title;
            // Strip dayOffset suffix (_0 or _1) so today and tomorrow entries share the same base ID
            String effectiveId = rawId.replaceAll("_[01]$", "");

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            // 1. If user explicitly pressed Stop (Jooji) for this exact minute, NEVER re-trigger!
            String stoppedMinKey = prefs.getString("stopped_minute_key", "");
            if ((today + "_" + effectiveTime).equals(stoppedMinKey) || (today + "_" + currentHHmm).equals(stoppedMinKey)) {
                Log.d(TAG, "Suppressed re-trigger because user already pressed Stop for " + effectiveTime);
                return;
            }

            // 2. If audio is already playing right now, do not start a second overlapping player
            if (AdhanAudioPlayer.isPlaying()) {
                Log.d(TAG, "Audio is already playing — skipping duplicate trigger");
                return;
            }

            // 3. Deduplicate by both item ID and minute key so only ONE alarm/adhan fires per minute
            String dedupKey = "fired_" + today + "_" + effectiveId + "_" + effectiveTime;
            String minuteDedupKey = "fired_min_" + today + "_" + effectiveTime;
            long lastFiredAt = prefs.getLong(dedupKey, 0L);
            long lastMinFiredAt = prefs.getLong(minuteDedupKey, 0L);
            if ((lastFiredAt > 0 && (now - lastFiredAt) < 300_000L) || (lastMinFiredAt > 0 && (now - lastMinFiredAt) < 120_000L)) {
                Log.d(TAG, "Skipping duplicate alarm trigger for " + dedupKey);
                return;
            }

            prefs.edit()
                    .putLong(dedupKey, now)
                    .putLong(minuteDedupKey, now)
                    .apply();
        } catch (Exception ignored) {
        }

        Log.d(TAG, "Triggering Native Adhan/Alarm NOW: " + title + " (type=" + itemType + ", voice=" + voice + ", sound=" + soundType + ")");

        // 1. Acquire WakeLock so phone wakes up and stays awake during Adhan/Alarm
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            try {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                        "Tuko:AdhanAlarmWakeLock"
                );
                wakeLock.acquire(210_000L);
            } catch (Exception ignored) {
            }
        }

        // 2. Ensure Foreground Service is alive
        AdhanForegroundService.startServiceSafely(context);

        // 3. Play native audio (loop if custom alarm)
        boolean isAlarm = "alarm".equalsIgnoreCase(itemType);
        AdhanAudioPlayer.playWithSoundType(context, title, voice, soundType, isAlarm);

        // 4. Show High-Priority Heads-Up / Full-Screen Notification with Stop & Open buttons
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (Build.VERSION.SDK_INT >= 26) {
                    NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            "Aadaanka & Alaarmka Tuko",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Ogeysiiska Aadaanka Salaadda iyo Alaarmka 24/7");
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 600, 300, 600, 300, 800});
                    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                    nm.createNotificationChannel(channel);
                }

                Intent openIntent = new Intent(context, MainActivity.class);
                openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent openPending = PendingIntent.getActivity(context, 10, openIntent, flags);

                Intent stopIntent = new Intent(context, AdhanAlarmReceiver.class);
                stopIntent.setAction(ACTION_STOP_ADHAN);
                PendingIntent stopPending = PendingIntent.getBroadcast(context, 11, stopIntent, flags);

                Notification.Builder builder;
                if (Build.VERSION.SDK_INT >= 26) {
                    builder = new Notification.Builder(context, CHANNEL_ID);
                } else {
                    builder = new Notification.Builder(context);
                }

                String notifTitle = isAlarm
                        ? ("⏰ Alaarm-ka Tuko: " + title)
                        : ("🕌 Waa Waqtigii Salaadda: " + title);
                String notifBody = isAlarm
                        ? ("Waqtigii aad qabsatay (" + (time24 != null && !time24.isEmpty() ? time24 : "Hadda") + ") wuu galay! Taabo si aad u joojiso.")
                        : "Kac oo tuko, weeso qaado oo dhowr salaaddaada.";

                builder.setContentTitle(notifTitle)
                        .setContentText(notifBody)
                        .setSmallIcon(R.drawable.ic_launcher)
                        .setContentIntent(openPending)
                        .setFullScreenIntent(openPending, true)
                        .setAutoCancel(true)
                        .setOngoing(true)
                        .setCategory(Notification.CATEGORY_ALARM)
                        .setVisibility(Notification.VISIBILITY_PUBLIC)
                        .setPriority(Notification.PRIORITY_MAX);

                if (Build.VERSION.SDK_INT >= 20) {
                    Notification.Action stopAction = new Notification.Action.Builder(
                            R.drawable.ic_launcher,
                            "🛑 Jooji Codka",
                            stopPending
                    ).build();
                    builder.addAction(stopAction);
                }

                nm.notify(NOTIFICATION_ID, builder.build());
            }
        } catch (Exception e) {
            Log.e(TAG, "Notification error: " + e.getMessage(), e);
        }
    }
}
