package com.tuko.salaad;

import android.app.Activity;
import android.app.Dialog;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://tuko-8a4e3.web.app";
    private WebView webView;
    private PowerManager.WakeLock wakeLock;
    private Handler syncHandler;
    private Runnable syncRunnable;

    private static final String JS_EXTRACT_AND_SYNC_ALARMS =
            "(function(){" +
            "  try {" +
            "    if (!window.TukoNative || !window.TukoNative.schedulePrayerTimes) return;" +
            "    var uid = localStorage.getItem('tuko_active_user_uid') || 'guest';" +
            "    var raw = localStorage.getItem('salaad_soomaali_settings_v3_' + uid) || localStorage.getItem('salaad_soomaali_settings_v3');" +
            "    if (!raw) {" +
            "      for (var i = 0; i < localStorage.length; i++) {" +
            "        var k = localStorage.key(i);" +
            "        if (k && k.indexOf('salaad_soomaali_settings_v3') === 0) {" +
            "          raw = localStorage.getItem(k); break;" +
            "        }" +
            "      }" +
            "    }" +
            "    var s = raw ? JSON.parse(raw) : {};" +
            "    var now = new Date();" +
            "    var pad2 = function(n){ return (n < 10 ? '0' : '') + n; };" +
            "    var calcTimes = function(lat, lon, date, methodKey, asrFactor) {" +
            "      var METHODS = {" +
            "        MWL:{fajrAngle:18,ishaAngle:17}," +
            "        ISNA:{fajrAngle:15,ishaAngle:15}," +
            "        EGY:{fajrAngle:19.5,ishaAngle:17.5}," +
            "        KAR:{fajrAngle:18,ishaAngle:18}," +
            "        UMQ:{fajrAngle:18.5,ishaMinutes:90}" +
            "      };" +
            "      var tz = -date.getTimezoneOffset() / 60;" +
            "      var m = METHODS[methodKey] || METHODS.MWL;" +
            "      var r = Math.PI / 180;" +
            "      var y = date.getFullYear(), mo = date.getMonth() + 1, da = date.getDate();" +
            "      if (mo <= 2) { y -= 1; mo += 12; }" +
            "      var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);" +
            "      var jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + da + B - 1524.5 - lon / 360;" +
            "      var D = jd - 2451545.0;" +
            "      var g = (357.529 + 0.98560028 * D) % 360;" +
            "      var q = (280.459 + 0.98564736 * D) % 360;" +
            "      var L = (q + 1.915 * Math.sin(g * r) + 0.020 * Math.sin(2 * g * r)) % 360;" +
            "      var e = 23.439 - 0.00000036 * D;" +
            "      var dec = Math.asin(Math.sin(e * r) * Math.sin(L * r)) / r;" +
            "      var RA = ((Math.atan2(Math.cos(e * r) * Math.sin(L * r), Math.cos(L * r)) / r / 15 + 24) % 24);" +
            "      var eqt = q / 15 - RA;" +
            "      var noon = 12 - lon / 15 - eqt + tz;" +
            "      var tAngle = function(ang, morn) {" +
            "        var c = (-Math.sin(ang * r) - Math.sin(lat * r) * Math.sin(dec * r)) / (Math.cos(lat * r) * Math.cos(dec * r));" +
            "        if (c > 1 || c < -1) return null;" +
            "        var H = Math.acos(c) / r / 15;" +
            "        return morn ? noon - H : noon + H;" +
            "      };" +
            "      var fajr = tAngle(m.fajrAngle, true) || 5;" +
            "      var duhur = noon + 1/60;" +
            "      var asrAng = -Math.atan(1 / ((asrFactor || 1) + Math.tan((lat - dec) * r))) / r;" +
            "      var casar = tAngle(asrAng, false) || 15.5;" +
            "      var maqrib = tAngle(0.833, false) || 18.2;" +
            "      var cishe = m.ishaMinutes ? (maqrib + m.ishaMinutes / 60) : (tAngle(m.ishaAngle || 17, false) || (maqrib + 1.5));" +
            "      return {Fajr:fajr, Duhur:duhur, Casar:casar, Maqrib:maqrib, Cishe:cishe};" +
            "    };" +
            "    var getResolved = function(dObj) {" +
            "      var def = {Fajr:'05:00', Duhur:'12:15', Casar:'15:30', Maqrib:'18:10', Cishe:'19:30'};" +
            "      if (s.useCustomSchedule) {" +
            "        var cs = s.customSchedule || {};" +
            "        var res = {};" +
            "        ['Fajr','Duhur','Casar','Maqrib','Cishe'].forEach(function(p){" +
            "          var tStr = (cs[p] && cs[p].adhan) ? cs[p].adhan : def[p];" +
            "          var pts = tStr.split(':');" +
            "          res[p] = (parseInt(pts[0],10)||0) + (parseInt(pts[1],10)||0)/60;" +
            "        });" +
            "        return res;" +
            "      }" +
            "      var lat = (typeof s.lat === 'number' && !isNaN(s.lat)) ? s.lat : 2.0469;" +
            "      var lon = (typeof s.lon === 'number' && !isNaN(s.lon)) ? s.lon : 45.3182;" +
            "      return calcTimes(lat, lon, dObj, s.method || 'MWL', s.asrMethod || 1);" +
            "    };" +
            "    var list = [];" +
            "    if (s.adhanSound !== false) {" +
            "      [0, 1].forEach(function(dayOffset){" +
            "        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);" +
            "        var times = getResolved(d);" +
            "        ['Fajr','Duhur','Casar','Maqrib','Cishe'].forEach(function(p){" +
            "          var dec = times[p];" +
            "          if (dec != null && !isNaN(dec)) {" +
            "            var h = Math.floor(dec);" +
            "            var m = Math.round((dec - h) * 60);" +
            "            if (m === 60) { m = 0; h += 1; }" +
            "            var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);" +
            "            var t24 = pad2(h) + ':' + pad2(m);" +
            "            var voice = (s.prayerVoices && s.prayerVoices[p]) ? s.prayerVoices[p] : (s.adhanVoice || (p === 'Fajr' ? 'fajr' : 'makkah'));" +
            "            list.push({" +
            "              id: 'prayer_' + p + '_' + dayOffset," +
            "              prayer: p," +
            "              timestamp: dt.getTime()," +
            "              time24: (dayOffset === 0 ? t24 : '')," +
            "              voice: voice," +
            "              soundType: 'adhan'," +
            "              type: 'adhan'" +
            "            });" +
            "          }" +
            "        });" +
            "      });" +
            "    }" +
            "    var alarms = Array.isArray(s.alarms) ? s.alarms : [];" +
            "    alarms.forEach(function(al){" +
            "      if (!al || !al.enabled || !al.time) return;" +
            "      var pts = String(al.time).split(':');" +
            "      var ah = parseInt(pts[0], 10), am = parseInt(pts[1], 10);" +
            "      if (isNaN(ah) || isNaN(am)) return;" +
            "      var t24 = pad2(ah) + ':' + pad2(am);" +
            "      [0, 1].forEach(function(dayOffset){" +
            "        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, ah, am, 0);" +
            "        var dow = d.getDay();" +
            "        if (Array.isArray(al.days) && al.days.length > 0 && al.days.indexOf(dow) === -1) return;" +
            "        list.push({" +
            "          id: 'alarm_' + (al.id || t24) + '_' + dayOffset," +
            "          prayer: al.label || 'Alaarm'," +
            "          timestamp: d.getTime()," +
            "          time24: (dayOffset === 0 ? t24 : '')," +
            "          voice: al.selectedVoice || s.adhanVoice || 'makkah'," +
            "          soundType: al.sound || 'adhan'," +
            "          type: 'alarm'," +
            "          days: Array.isArray(al.days) ? al.days : []" +
            "        });" +
            "      });" +
            "    });" +
            "    var todosRaw = localStorage.getItem('salaad_soomaali_todos_v3_' + uid) || localStorage.getItem('salaad_soomaali_todos_v3');" +
            "    if (todosRaw) {" +
            "      var todos = JSON.parse(todosRaw);" +
            "      if (Array.isArray(todos)) {" +
            "        todos.forEach(function(td){" +
            "          if (!td || td.completed || !td.dueTime) return;" +
            "          var pts = String(td.dueTime).split(':');" +
            "          var th = parseInt(pts[0], 10), tm = parseInt(pts[1], 10);" +
            "          if (isNaN(th) || isNaN(tm)) return;" +
            "          var t24 = pad2(th) + ':' + pad2(tm);" +
            "          var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), th, tm, 0);" +
            "          list.push({" +
            "            id: 'todo_' + (td.id || t24)," +
            "            prayer: 'Hawshaada: ' + (td.task || 'To-Do')," +
            "            timestamp: d.getTime()," +
            "            time24: t24," +
            "            voice: s.adhanVoice || 'makkah'," +
            "            soundType: 'chime'," +
            "            type: 'alarm'" +
            "          });" +
            "        });" +
            "      }" +
            "    }" +
            "    window.TukoNative.schedulePrayerTimes(JSON.stringify(list));" +
            "  } catch(e) {}" +
            "})();";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Cancel any lingering legacy persistent/silent notifications and delete guard channel
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(2002);
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.deleteNotificationChannel("tuko_247_guard_channel");
                }
            }
        } catch (Exception ignored) {
        }

        // Start 24/7 Native Foreground Service safely so Adhan & Alarm work when exiting the app
        AdhanForegroundService.startServiceSafely(this);

        // Configure dark status bar & navigation bar matching Tuko theme (#041014)
        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
            window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= 21) {
                window.setStatusBarColor(Color.parseColor("#041014"));
                window.setNavigationBarColor(Color.parseColor("#041014"));
            }
        }

        // Request Android 13+ Notification Permission
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 101);
            }
        }

        // Acquire Partial WakeLock & request unrestricted battery usage
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Tuko::Adhan247WakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();

                if (Build.VERSION.SDK_INT >= 23 && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            }
        } catch (Exception ignored) {
        }

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.parseColor("#041014"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#041014"));
        configureWebView(webView);
        webView.addJavascriptInterface(new TukoNativeBridge(this), "TukoNative");

        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(rootLayout);

        webView.loadUrl(APP_URL);

        // Poll WebView localStorage every 3 seconds so any change to Alarms or Prayer Times is synced to Native AlarmManager
        syncHandler = new Handler(Looper.getMainLooper());
        syncRunnable = new Runnable() {
            @Override
            public void run() {
                injectAndSyncNativeAlarms();
                if (syncHandler != null) {
                    syncHandler.postDelayed(this, 3000L);
                }
            }
        };
        syncHandler.postDelayed(syncRunnable, 2000L);
    }

    private void injectAndSyncNativeAlarms() {
        if (webView == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 19) {
                webView.evaluateJavascript(JS_EXTRACT_AND_SYNC_ALARMS, null);
            } else {
                webView.loadUrl("javascript:" + JS_EXTRACT_AND_SYNC_ALARMS);
            }
        } catch (Exception ignored) {
        }
    }

    private void configureWebView(final WebView targetWebView) {
        WebSettings settings = targetWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        String defaultUa = settings.getUserAgentString();
        if (defaultUa != null) {
            String cleanUa = defaultUa.replace("; wv", "").replace("Version/4.0 ", "");
            settings.setUserAgentString(cleanUa + " TukoAndroidApp/2.9");
        }

        if (isNetworkAvailable()) {
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        } else {
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= 21) {
            cookieManager.setAcceptThirdPartyCookies(targetWebView, true);
        }

        targetWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectAndSyncNativeAlarms();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= 21 && request != null && request.getUrl() != null) {
                    String url = request.getUrl().toString();
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        return false;
                    }
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return false;
            }
        });

        targetWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= 21 && request != null) {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                final WebView popupWebView = new WebView(MainActivity.this);
                configureWebView(popupWebView);

                final Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_NoActionBar);
                dialog.setContentView(popupWebView);
                dialog.show();

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        try {
                            dialog.dismiss();
                            popupWebView.destroy();
                        } catch (Exception ignored) {
                        }
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkInfo info = cm.getActiveNetworkInfo();
                return info != null && info.isConnected();
            }
        } catch (Exception ignored) {
        }
        return true;
    }

    @Override
    protected void onPause() {
        // Sync all alarms & prayer times right as user leaves the app so AdhanForegroundService handles background ringing
        injectAndSyncNativeAlarms();
        AdhanForegroundService.startServiceSafely(this);
        super.onPause();
    }

    @Override
    protected void onStop() {
        injectAndSyncNativeAlarms();
        AdhanForegroundService.startServiceSafely(this);
        super.onStop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(2002);
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.deleteNotificationChannel("tuko_247_guard_channel");
                }
            }
        } catch (Exception ignored) {
        }
        if (webView != null) {
            webView.resumeTimers();
            try {
                // Only mark the current minute as silenced in WebView localStorage if Native Android already fired or silenced this minute outside the app!
                String silenceJs = "(function(){try{if(window.TukoNative&&typeof window.TukoNative.isMinuteSilencedOrFired==='function'&&window.TukoNative.isMinuteSilencedOrFired('')){var d=new Date();var hhmm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);localStorage.setItem('tuko_silenced_hhmm',hhmm);localStorage.setItem('tuko_silenced_ts',String(Date.now()));}}catch(e){}})();";
                if (Build.VERSION.SDK_INT >= 19) {
                    webView.evaluateJavascript(silenceJs, null);
                } else {
                    webView.loadUrl("javascript:" + silenceJs);
                }
            } catch (Exception ignored) {
            }
        }
        injectAndSyncNativeAlarms();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (syncHandler != null && syncRunnable != null) {
            syncHandler.removeCallbacks(syncRunnable);
        }
        AdhanForegroundService.startServiceSafely(this);
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }
}
