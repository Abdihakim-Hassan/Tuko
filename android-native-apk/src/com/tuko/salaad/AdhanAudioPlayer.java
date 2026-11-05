package com.tuko.salaad;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Vibrator;
import android.util.Log;

public class AdhanAudioPlayer {
    private static final String TAG = "TukoAdhanPlayer";
    private static MediaPlayer activePlayer = null;
    private static Vibrator activeVibrator = null;

    public static synchronized void play(Context context, String prayerName, String voice) {
        playWithSoundType(context, prayerName, voice, "adhan", false);
    }

    public static synchronized void playWithSoundType(
            Context context,
            String title,
            String voice,
            String soundType,
            boolean loopUntilStopped
    ) {
        stop();

        try {
            // Ensure STREAM_ALARM volume is audible (at least 75% if currently muted/too low)
            try {
                AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                    int curVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                    if (curVol < (maxVol / 3)) {
                        am.setStreamVolume(AudioManager.STREAM_ALARM, Math.max(1, (maxVol * 3) / 4), 0);
                    }
                }
            } catch (Exception ignored) {
            }

            // Start vibration pattern
            try {
                Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null && vib.hasVibrator()) {
                    long[] pattern = new long[]{0, 600, 300, 600, 300, 900};
                    vib.vibrate(pattern, loopUntilStopped ? 0 : -1);
                    activeVibrator = vib;
                }
            } catch (Exception ignored) {
            }

            MediaPlayer player = new MediaPlayer();

            if (Build.VERSION.SDK_INT >= 21) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                player.setAudioAttributes(attributes);
            } else {
                player.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            boolean dataSourceSet = false;

            // If user selected a non-adhan alarm tone (e.g., beep, chime, classic, digital), try system alarm tone first
            if (soundType != null && !soundType.isEmpty() && !"adhan".equalsIgnoreCase(soundType)) {
                try {
                    Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    if (alarmUri == null) {
                        alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                    }
                    if (alarmUri != null) {
                        player.setDataSource(context, alarmUri);
                        dataSourceSet = true;
                        loopUntilStopped = true;
                    }
                } catch (Exception ignored) {
                    dataSourceSet = false;
                }
            }

            if (!dataSourceSet) {
                String assetName = resolveAssetForVoice(title, voice);
                AssetFileDescriptor afd = null;
                try {
                    afd = context.getAssets().openFd(assetName);
                } catch (Exception e) {
                    afd = context.getAssets().openFd("adhan_makkah.mp3");
                }
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            }

            player.setLooping(loopUntilStopped);
            player.setVolume(1.0f, 1.0f);
            player.prepare();
            player.start();

            player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    if (!mp.isLooping()) {
                        stop();
                    }
                }
            });

            activePlayer = player;
            Log.d(TAG, "Native playback started for: " + title + " (voice=" + voice + ", sound=" + soundType + ")");
        } catch (Exception e) {
            Log.e(TAG, "Failed to play native audio: " + e.getMessage(), e);
        }
    }

    private static String resolveAssetForVoice(String title, String voice) {
        String v = voice != null ? voice.toLowerCase().trim() : "makkah";
        String t = title != null ? title.toLowerCase().trim() : "";

        if (t.contains("fajr") || t.contains("subax") || "fajr".equals(v)) {
            return "adhan_fajr.mp3";
        }
        if ("afasy".equals(v)) return "adhan_afasy.mp3";
        if ("abdulbasit".equals(v)) return "adhan_abdulbasit.mp3";
        if ("minshawi".equals(v)) return "adhan_minshawi.mp3";
        if ("qatami".equals(v)) return "adhan_qatami.mp3";
        if ("zahrani".equals(v)) return "adhan_zahrani.mp3";
        return "adhan_makkah.mp3";
    }

    public static synchronized void stop() {
        if (activeVibrator != null) {
            try {
                activeVibrator.cancel();
            } catch (Exception ignored) {
            }
            activeVibrator = null;
        }
        if (activePlayer != null) {
            try {
                if (activePlayer.isPlaying()) {
                    activePlayer.stop();
                }
                activePlayer.release();
            } catch (Exception ignored) {
            }
            activePlayer = null;
            Log.d(TAG, "Native playback stopped");
        }
    }

    public static synchronized boolean isPlaying() {
        try {
            return activePlayer != null && activePlayer.isPlaying();
        } catch (Exception e) {
            return false;
        }
    }
}
