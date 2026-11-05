package com.tuko.salaad;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class TukoNativeBridge {
    private static final String TAG = "TukoNativeBridge";
    private final Context context;

    public TukoNativeBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    private void markCurrentMinuteFiredInPrefs() {
        try {
            long now = System.currentTimeMillis();
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
            String currentHHmm = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(now));
            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putLong("fired_min_" + today + "_" + currentHHmm, now).apply();
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }

    @JavascriptInterface
    public boolean isMinuteSilencedOrFired(String time24) {
        try {
            long now = System.currentTimeMillis();
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));
            String currentHHmm = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(now));
            String targetTime = (time24 != null && !time24.trim().isEmpty()) ? time24.trim() : currentHHmm;
            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);

            long stoppedUntil = prefs.getLong("stopped_until_ms", 0L);
            String stoppedMinKey = prefs.getString("stopped_minute_key", "");
            if (now < stoppedUntil || (today + "_" + targetTime).equals(stoppedMinKey)) {
                return true;
            }

            long lastMinFiredAt = prefs.getLong("fired_min_" + today + "_" + targetTime, 0L);
            if (lastMinFiredAt > 0 && (now - lastMinFiredAt) < 120_000L) {
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    @JavascriptInterface
    public void playAdhanNow(String prayerName, String voice) {
        Log.d(TAG, "playAdhanNow called via JS bridge: " + prayerName + ", voice: " + voice);
        markCurrentMinuteFiredInPrefs();
        AdhanAudioPlayer.playWithSoundType(context, prayerName, voice, "adhan", false);
    }

    @JavascriptInterface
    public void playAlarmNow(String title, String voice, String soundType) {
        Log.d(TAG, "playAlarmNow called via JS bridge: " + title + ", voice=" + voice + ", sound=" + soundType);
        markCurrentMinuteFiredInPrefs();
        AdhanAudioPlayer.playWithSoundType(context, title, voice, soundType, true);
    }

    @JavascriptInterface
    public void stopAdhan() {
        Log.d(TAG, "stopAdhan called via JS bridge");
        AdhanAlarmReceiver.stopAndSilenceCurrentMinute(context);
    }

    @JavascriptInterface
    public void schedulePrayerTimes(String jsonSchedule) {
        if (jsonSchedule == null || jsonSchedule.trim().isEmpty()) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            String previous = prefs.getString("schedule_json", "");
            prefs.edit().putString("schedule_json", jsonSchedule).apply();

            AdhanForegroundService.startServiceSafely(context);

            // Schedule with AlarmManager whenever the schedule changes or at least once per minute
            long lastScheduledAt = prefs.getLong("last_alarm_manager_sync", 0L);
            long now = System.currentTimeMillis();
            if (!jsonSchedule.equals(previous) || (now - lastScheduledAt) > 60_000L) {
                prefs.edit().putLong("last_alarm_manager_sync", now).apply();
                scheduleAllWithAlarmManager(context, jsonSchedule);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in schedulePrayerTimes: " + e.getMessage(), e);
        }
    }

    public static void rescheduleFromPrefs(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            String json = prefs.getString("schedule_json", "[]");
            if (json != null && json.length() > 2) {
                scheduleAllWithAlarmManager(context, json);
            }
        } catch (Exception e) {
            Log.e(TAG, "rescheduleFromPrefs error: " + e.getMessage());
        }
    }

    public static void scheduleAllWithAlarmManager(Context context, String jsonSchedule) {
        try {
            JSONArray arr = new JSONArray(jsonSchedule);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();

            Intent showAppIntent = new Intent(context, MainActivity.class);
            showAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int showFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) showFlags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent showPendingIntent = PendingIntent.getActivity(context, 50, showAppIntent, showFlags);

            int scheduledCount = 0;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                String itemId = item.optString("id", "item_" + i);
                String prayer = item.optString("prayer", "Salaad");
                long timestamp = item.optLong("timestamp", 0L);
                String voice = item.optString("voice", "makkah");
                String soundType = item.optString("soundType", "adhan");
                String itemType = item.optString("type", "adhan");
                String time24 = item.optString("time24", "");

                if (timestamp > (now - 15_000L)) {
                    long triggerAt = Math.max(now + 1000L, timestamp);

                    Intent intent = new Intent(context, AdhanAlarmReceiver.class);
                    intent.setAction(AdhanAlarmReceiver.ACTION_PLAY_ADHAN);
                    intent.putExtra("itemId", itemId);
                    intent.putExtra("prayerName", prayer);
                    intent.putExtra("voice", voice);
                    intent.putExtra("soundType", soundType);
                    intent.putExtra("itemType", itemType);
                    intent.putExtra("time24", time24);

                    int requestCode = Math.abs((itemId + "_" + (timestamp / 60000L)).hashCode());
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);

                    boolean scheduledExact = false;
                    if (Build.VERSION.SDK_INT >= 21) {
                        try {
                            AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAt, showPendingIntent);
                            alarmManager.setAlarmClock(clockInfo, pendingIntent);
                            scheduledExact = true;
                        } catch (Exception e) {
                            Log.w(TAG, "setAlarmClock fallback for " + prayer + ": " + e.getMessage());
                        }
                    }

                    if (!scheduledExact) {
                        try {
                            if (Build.VERSION.SDK_INT >= 23) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            } else if (Build.VERSION.SDK_INT >= 19) {
                                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            } else {
                                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            }
                        } catch (Exception fallbackEx) {
                            try {
                                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            } catch (Exception ignored) {
                            }
                        }
                    }
                    scheduledCount++;
                }
            }
            Log.d(TAG, "Scheduled " + scheduledCount + " native AlarmClock entries with Android OS.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule native alarms: " + e.getMessage(), e);
        }
    }
}
