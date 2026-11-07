package com.tuko.salaad;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class AdhanForegroundService extends Service {
    private static final String TAG = "TukoFgService";
    private static final String CHANNEL_ID = "tuko_247_guard_channel";
    private static final int FG_NOTIFICATION_ID = 2002;

    private Handler handler;
    private Runnable checkRunnable;
    private PowerManager.WakeLock serviceWakeLock;

    public static void startServiceSafely(Context context) {
        if (context == null) return;
        try {
            // Cancel any legacy persistent guard notification (ID 2002) and delete its channel
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(FG_NOTIFICATION_ID);
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.deleteNotificationChannel(CHANNEL_ID);
                }
            }
            Intent serviceIntent = new Intent(context, AdhanForegroundService.class);
            context.startService(serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Could not start background service: " + e.getMessage());
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        clearLegacyGuardNotification();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                serviceWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Tuko::Service247WakeLock");
                serviceWakeLock.setReferenceCounted(false);
                serviceWakeLock.acquire();
            }
        } catch (Exception ignored) {
        }

        handler = new Handler(Looper.getMainLooper());
        checkRunnable = new Runnable() {
            @Override
            public void run() {
                try {
                    checkScheduledAlarmsNow();
                } catch (Exception e) {
                    Log.e(TAG, "Error in 5s alarm check loop: " + e.getMessage());
                }
                if (handler != null) {
                    handler.postDelayed(this, 5000L);
                }
            }
        };
        handler.post(checkRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        clearLegacyGuardNotification();
        checkScheduledAlarmsNow();
        return START_STICKY;
    }

    private void clearLegacyGuardNotification() {
        try {
            stopForeground(true);
        } catch (Exception ignored) {
        }
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(FG_NOTIFICATION_ID);
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.deleteNotificationChannel(CHANNEL_ID);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void checkScheduledAlarmsNow() {
        if (AdhanAudioPlayer.isPlaying()) return;

        SharedPreferences prefs = getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
        String currentHHmm = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(now));
        String stoppedMinKey = prefs.getString("stopped_minute_key", "");
        if ((today + "_" + currentHHmm).equals(stoppedMinKey)) return;

        String json = prefs.getString("schedule_json", "[]");
        if (json == null || json.length() <= 2) return;

        Calendar cal = Calendar.getInstance();
        int jsDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sunday .. 6 = Saturday

        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                String itemId = item.optString("id", "");
                String title = item.optString("prayer", "Salaad");
                long timestamp = item.optLong("timestamp", 0L);
                String voice = item.optString("voice", "makkah");
                String soundType = item.optString("soundType", "adhan");
                String itemType = item.optString("type", "adhan");
                String time24 = item.optString("time24", "");

                if (itemId.isEmpty()) {
                    itemId = itemType + "_" + title + "_" + time24;
                }

                // Check 1: Exact timestamp match (within 0 to 60 seconds window)
                boolean timestampMatch = (timestamp > 0L && now >= timestamp && (now - timestamp) <= 60_000L);

                // Check 2: HH:mm clock match ONLY for today's items (never tomorrow's _1 items)
                boolean clockMatch = false;
                if (!timestampMatch && !itemId.endsWith("_1") && !time24.isEmpty() && time24.equals(currentHHmm)) {
                    JSONArray daysArr = item.optJSONArray("days");
                    if (daysArr == null || daysArr.length() == 0) {
                        clockMatch = true;
                    } else {
                        for (int d = 0; d < daysArr.length(); d++) {
                            if (daysArr.optInt(d, -1) == jsDayOfWeek) {
                                clockMatch = true;
                                break;
                            }
                        }
                    }
                }

                if (timestampMatch || clockMatch) {
                    AdhanAlarmReceiver.triggerAdhanOrAlarmNow(
                            getApplicationContext(),
                            itemId,
                            title,
                            voice,
                            soundType,
                            itemType,
                            time24.isEmpty() ? currentHHmm : time24
                    );
                    break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed parsing schedule_json in service: " + e.getMessage());
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // If user swipes app from recents, keep service alive and reschedule AlarmManager
        try {
            TukoNativeBridge.rescheduleFromPrefs(getApplicationContext());
            Intent restartIntent = new Intent(getApplicationContext(), AdhanForegroundService.class);
            int flags = PendingIntent.FLAG_ONE_SHOT;
            if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getService(getApplicationContext(), 99, restartIntent, flags);
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + 1500L, pi);
            }
        } catch (Exception ignored) {
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (handler != null && checkRunnable != null) {
            handler.removeCallbacks(checkRunnable);
        }
        if (serviceWakeLock != null && serviceWakeLock.isHeld()) {
            try {
                serviceWakeLock.release();
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
