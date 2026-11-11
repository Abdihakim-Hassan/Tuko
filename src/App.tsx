/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Volume2, Sparkles, X } from 'lucide-react';
import { checkForAppUpdate, applyAppUpdate, AppUpdateCheckResult } from './utils/appUpdateService';
import { Header } from './components/Header';
import { TukoLogo, TukoReloadOverlay } from './components/TukoLogo';
import { SalaadView } from './components/SalaadView';
import { AdhkaarOverlay } from './components/AdhkaarOverlay';
import { AuthModal } from './components/AuthModal';
import { MobileInstallModal } from './components/MobileInstallModal';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import { StreakInfoModal } from './components/StreakInfoModal';
import { AllSectionsModal } from './components/AllSectionsModal';
import { AlarmRingModal } from './components/AlarmRingModal';
import { GenderModal } from './components/GenderModal';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { OnboardingFlow } from './components/OnboardingFlow';
import { HelpModal } from './components/HelpModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { QuranReaderModal } from './components/QuranReaderModal';
import { SOMALIA_CITIES } from './utils/somaliaCities';
import { audioAlerts, sendBrowserNotification } from './utils/audioAlerts';
import { logEvent } from './utils/firebase';
import { listenToActiveAnnouncements } from './utils/adminService';
import { ensureAll114SurahsCachedOffline } from './utils/quranAudioService';

// Import all 11 sections statically so every single tab works 100% offline with zero network chunk requests
import { AdhanView } from './components/AdhanView';
import { AdhkaarView } from './components/AdhkaarView';
import { QiblaView } from './components/QiblaView';
import { TasbeehView } from './components/TasbeehView';
import { SoonView } from './components/SoonView';
import { QuranView } from './components/QuranView';
import { CalendarView } from './components/CalendarView';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { ToDoView } from './components/ToDoView';
import { AmbientSoundsView, AmbientMiniPlayer } from './components/AmbientSoundsView';
import { StitchSamplePreview } from './components/StitchSamplePreview';
import { ambientSounds } from './utils/ambientSoundService';
import { AppSettings, AppUserProfile, AppAnnouncement, CustomAlarm, CustomDua, DayData, PrayerName, SalaahRecord, SalaahStatus, TodoItem } from './types';
import {
  calculateStreaks,
  clearUserDataOnLogout,
  createEmptyDay,
  getDayData,
  loadAllDays,
  loadAllTodos,
  loadCustomDuas,
  loadSettings,
  saveAllDays,
  saveAllTodos,
  saveCustomDuas,
  saveSettings,
  setActiveStorageUser,
  applyUserRequestedQuranConfig,
  INITIAL_TODOS,
  savePersistedAuthUser,
  loadPersistedAuthUser,
  hasDayMeaningfulActivity,
  mergeTwoDayRecords,
  loadAndRecoverUserDays,
} from './utils/storage';
import {
  calculatePrayerTimes,
  getResolvedPrayerTimes,
  getTodayKey,
  PRAYER_ORDER,
  PRAYER_SOMALI_LABELS,
} from './utils/prayerTimes';
import { DEFAULT_ALARMS, DEFAULT_SETTINGS, DEFAULT_USER_PRAYER_SCHEDULE } from './utils/somaliaCities';
import {
  auth,
  ADMIN_EMAIL,
  saveDayToFirestore,
  saveSettingsToFirestore,
  saveTodosToFirestore,
  saveCustomDuasToFirestore,
  loadUserDaysFromFirestore,
  loadUserSettingsFromFirestore,
  loadUserTodosFromFirestore,
  loadUserCustomDuasFromFirestore,
  subscribeToUserDays,
  subscribeToUserSettings,
  subscribeToUserTodos,
  subscribeToUserCustomDuas,
  syncUserProfile,
  initFCM,
  updateUserProfile,
  resetUserCloudDataInFirestore,
} from './utils/firebase';
import {
  pushSyncToServer,
  fetchSyncFromServer,
  subscribeCrossDeviceSync,
  CrossDeviceSyncState,
  getSyncDeviceId,
} from './utils/crossDeviceSync';
import { useWindowDimensions, RNScrollView } from './utils/reactNative';
import { LanguageProvider } from './utils/i18n';

export default function App() {
  const rnDimensions = useWindowDimensions();
  const [todayKey, setTodayKey] = useState<string>(() => getTodayKey());
  const [activeDateKey, setActiveDateKey] = useState<string>(() => getTodayKey());
  const [currentTab, setCurrentTab] = useState<string>('salaad');
  const [adhanInitialSubTab, setAdhanInitialSubTab] = useState<'prayers' | 'clock_alarm' | 'schedule'>('clock_alarm');
  const [adhanSubTabTrigger, setAdhanSubTabTrigger] = useState<number>(0);
  const [allDays, setAllDays] = useState<Record<string, DayData>>(() => loadAllDays());
  const [customDuas, setCustomDuas] = useState<CustomDua[]>(() => loadCustomDuas());
  const [todos, setTodos] = useState<TodoItem[]>(() => loadAllTodos());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [reloadPhase, setReloadPhase] = useState<'spinning' | 'finishing' | 'hidden'>('hidden');
  const reloadTimersRef = useRef<{ finish?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({});

  const triggerReloadVisual = useCallback(() => {
    if (reloadTimersRef.current.finish) clearTimeout(reloadTimersRef.current.finish);
    if (reloadTimersRef.current.hide) clearTimeout(reloadTimersRef.current.hide);
    setReloadPhase('spinning');
    reloadTimersRef.current.finish = setTimeout(() => {
      setReloadPhase('finishing');
    }, 400);
    reloadTimersRef.current.hide = setTimeout(() => {
      setReloadPhase('hidden');
    }, 650);
  }, []);

  useEffect(() => {
    // Background pre-cache all 114 Surahs & Adhan voices so the entire app works 100% offline
    const offlineTimer = setTimeout(() => {
      ensureAll114SurahsCachedOffline().catch(() => {});
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_ALL_OFFLINE' });
      }
    }, 1000);
    return () => {
      clearTimeout(offlineTimer);
      if (reloadTimersRef.current.finish) clearTimeout(reloadTimersRef.current.finish);
      if (reloadTimersRef.current.hide) clearTimeout(reloadTimersRef.current.hide);
    };
  }, []);

  const [newDayAlert, setNewDayAlert] = useState<string | null>(null);
  const [pendingAppUpdate, setPendingAppUpdate] = useState<AppUpdateCheckResult | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateCheckTimer = setTimeout(async () => {
      try {
        const res = await checkForAppUpdate();
        if (res.isUpdateAvailable) {
          setPendingAppUpdate(res);
        }
      } catch {}
    }, 2000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          checkForAppUpdate().then((res) => {
            if (res.isUpdateAvailable) setPendingAppUpdate(res);
          }).catch(() => {});
        }
      });
    }

    return () => clearTimeout(updateCheckTimer);
  }, []);
  const [accountActionAlert, setAccountActionAlert] = useState<{
    message: string;
    type: 'success' | 'logout';
  } | null>(null);

  // Authentication & Cloud Sync State — Hydrated synchronously on reload so session never drops
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      return auth.currentUser;
    }
    const persisted = loadPersistedAuthUser();
    if (persisted?.uid) {
      setActiveStorageUser(persisted.uid);
      return {
        uid: persisted.uid,
        email: persisted.email,
        displayName: persisted.displayName,
        photoURL: persisted.photoURL,
        isAnonymous: false,
      } as unknown as User;
    }
    return null;
  });
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showMobileInstall, setShowMobileInstall] = useState<boolean>(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(false);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [showAllSectionsModal, setShowAllSectionsModal] = useState<boolean>(false);
  const [showVideoTourModal, setShowVideoTourModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);
  const [isStitchSampleMode, setIsStitchSampleMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('stitch=1');
    }
    return false;
  });
  const [quranReaderState, setQuranReaderState] = useState<{ isOpen: boolean; surahNumber: number }>({
    isOpen: false,
    surahNumber: 1,
  });
  const [activeAnnouncements, setActiveAnnouncements] = useState<AppAnnouncement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [favoriteSectionIds, setFavoriteSectionIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tuko_favorite_sections');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['quran', 'todo', 'stats'];
  });

  const handleUpdateFavorites = useCallback((newIds: string[]) => {
    setFavoriteSectionIds(newIds);
    try {
      localStorage.setItem('tuko_favorite_sections', JSON.stringify(newIds));
    } catch {}
  }, []);

  // Subscribe to real-time broadcast announcements from Firestore
  useEffect(() => {
    const unsub = listenToActiveAnnouncements((list) => {
      setActiveAnnouncements(list);
    });
    return () => unsub();
  }, []);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('tuko_onboarding_completed');
    } catch {
      return false;
    }
  });

  const handleCompleteOnboarding = useCallback((cityId: string, gender: 'male' | 'female' = 'male') => {
    const foundCity = SOMALIA_CITIES.find((c) => c.id === cityId);
    handleUpdateSettings({
      ...(foundCity
        ? {
            cityId: foundCity.id,
            cityName: `${foundCity.name} (${foundCity.region})`,
            lat: foundCity.lat,
            lon: foundCity.lon,
          }
        : {}),
      gender,
      genderConfirmed: true,
    });
    if (currentUser) {
      localStorage.setItem(`tuko_gender_confirmed_${currentUser.uid}`, gender);
      updateUserProfile(currentUser.uid, { gender }).catch(console.error);
      setUserProfile((prev) => (prev ? { ...prev, gender } : prev));
    } else {
      localStorage.setItem('tuko_gender_confirmed_guest', gender);
    }
    setShowGenderModal(false);
    setShowOnboarding(false);
  }, [currentUser]);

  // Prompt notification permission when user enters the app if not yet enabled
  useEffect(() => {
    const checkNotificationOnEntry = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const hasSeenPrompt = sessionStorage.getItem('tuko_notif_prompt_seen');
          if (!hasSeenPrompt && !showOnboarding) {
            const timer = setTimeout(() => {
              setShowNotificationPrompt(true);
              sessionStorage.setItem('tuko_notif_prompt_seen', 'true');
            }, 3500);
            return () => clearTimeout(timer);
          }
        }
      }
    };
    checkNotificationOnEntry();

    // Unlock browser audio context on any first touch or click
    const unlockUserAudio = () => {
      audioAlerts.unlockAudio();
    };
    window.addEventListener('click', unlockUserAudio, { once: true });
    window.addEventListener('touchstart', unlockUserAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockUserAudio);
      window.removeEventListener('touchstart', unlockUserAudio);
    };
  }, [showOnboarding]);

  const handleDismissFirstVisit = useCallback(() => {
    try {
      localStorage.setItem('tuko_onboarding_completed', 'true');
    } catch (e) {
      console.error(e);
    }
    setShowOnboarding(false);
    setShowAuthModal(false);
  }, []);

  // Full-screen Adhaan / Adhkaar Takeover state
  const [activeAdhaanOverlayPrayer, setActiveAdhaanOverlayPrayer] = useState<PrayerName | null>(null);
  const [activeRingingAlarm, setActiveRingingAlarm] = useState<CustomAlarm | null>(null);
  const [showGenderModal, setShowGenderModal] = useState<boolean>(false);
  const [snoozeMessage, setSnoozeMessage] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);

  useEffect(() => {
    return audioAlerts.subscribeAutoplayBlocked(setIsAutoplayBlocked);
  }, []);

  const notifiedPrayersRef = useRef<Record<string, boolean>>({});
  const notifiedAlarmsRef = useRef<Record<string, boolean>>({});
  const snoozeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alarmSnoozeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appVisibleSinceRef = useRef<number>(Date.now());
  const isAppHiddenRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.visibilityState !== 'visible' : false
  );
  const lastVisibleTickRef = useRef<number>(Date.now());

  // Load persisted notified events & suppress prayers that already passed (> 5 min ago) on initial mount
  useEffect(() => {
    try {
      const storedPrayers = localStorage.getItem(`tuko_notified_prayers_${todayKey}`);
      if (storedPrayers) {
        notifiedPrayersRef.current = JSON.parse(storedPrayers);
      }
      const storedAlarms = localStorage.getItem(`tuko_notified_alarms_${todayKey}`);
      if (storedAlarms) {
        notifiedAlarmsRef.current = JSON.parse(storedAlarms);
      }
    } catch {}

    const now = new Date();
    const currentDecimalHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const todayResolvedPrayers = getResolvedPrayerTimes(settings, now);
    let updatedPrayers = false;
    let updatedAlarms = false;

    PRAYER_ORDER.forEach((p) => {
      const prayerDecimalHour = todayResolvedPrayers[p];
      if (prayerDecimalHour != null) {
        const diffInMinutes = (currentDecimalHour - prayerDecimalHour) * 60;
        const schedMin = Math.round(prayerDecimalHour * 60);
        const notificationKey = `${todayKey}_${p}_${schedMin}`;
        if (diffInMinutes >= 0 && !notifiedPrayersRef.current[notificationKey]) {
          notifiedPrayersRef.current[notificationKey] = true;
          updatedPrayers = true;
        }
      }
    });

    const userAlarms = Array.isArray(settings.alarms) ? settings.alarms : DEFAULT_ALARMS;
    userAlarms.forEach((alarm) => {
      if (!alarm.enabled || !alarm.time) return;
      const [aH, aM] = alarm.time.split(':').map(Number);
      if (!Number.isFinite(aH) || !Number.isFinite(aM)) return;
      const alarmTotalMin = aH * 60 + aM;
      const diffAlarmMin = currentTotalMin - alarmTotalMin;
      const alarmMinuteStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), aH, aM, 0, 0).getTime();
      const createdBeforeMinuteStart = !alarm.createdAt || alarm.createdAt < alarmMinuteStartMs;
      if (diffAlarmMin > 0 || (diffAlarmMin === 0 && createdBeforeMinuteStart && now.getSeconds() >= 3)) {
        const alarmKey = `${todayKey}_alarm_${alarm.id}_${alarm.time}`;
        if (!notifiedAlarmsRef.current[alarmKey]) {
          notifiedAlarmsRef.current[alarmKey] = true;
          updatedAlarms = true;
        }
      }
    });

    if (updatedPrayers) {
      try {
        localStorage.setItem(`tuko_notified_prayers_${todayKey}`, JSON.stringify(notifiedPrayersRef.current));
      } catch {}
    }
    if (updatedAlarms) {
      try {
        localStorage.setItem(`tuko_notified_alarms_${todayKey}`, JSON.stringify(notifiedAlarmsRef.current));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  // Handle Adhan playback when opened from a lock-screen Push Notification or Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerIncomingAdhan = (targetPrayer?: PrayerName) => {
      const now = new Date();
      const currentDecimal = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const todayResolved = getResolvedPrayerTimes(settings, now);

      let matchedPrayer: PrayerName = targetPrayer || 'Duhur';
      let minDiff = Infinity;
      PRAYER_ORDER.forEach((p) => {
        const pDec = todayResolved[p];
        if (pDec != null) {
          const diff = Math.abs(currentDecimal - pDec) * 60;
          if (diff < minDiff) {
            minDiff = diff;
            matchedPrayer = p;
          }
        }
      });

      // Guard: If not an explicit targeted prayer, only play if actual prayer time is within 3.0 minutes!
      if (!targetPrayer && minDiff > 3.0) {
        console.debug('triggerIncomingAdhan skipped because prayer time is not right now (minDiff:', minDiff, ')');
        return;
      }

      const isFajr = matchedPrayer === 'Fajr';
      const prayerVoice = settings.prayerVoices?.[matchedPrayer] || settings.adhanVoice || 'makkah';

      // 1. Instantly open full-screen Takeover Overlay with prayer details
      setActiveAdhaanOverlayPrayer(matchedPrayer);

      // 2. Unlock & play authentic Sheikh Adhan
      audioAlerts.unlockAudio();
      audioAlerts.playAdhan(isFajr, undefined, prayerVoice);
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_ADHAN_NOW') {
        triggerIncomingAdhan();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'play_adhan') {
        triggerIncomingAdhan();
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [settings]);

  const activeSyncScope = useMemo(() => {
    if (currentUser) {
      return `user_${currentUser.uid}`;
    }
    return `guest_${getSyncDeviceId()}`;
  }, [currentUser]);

  // Initial load for current active storage scope
  useEffect(() => {
    const days = loadAllDays();
    const duas = loadCustomDuas();
    const sett = loadSettings();
    const loadedTodos = loadAllTodos();

    setAllDays(days);
    setCustomDuas(duas);
    setSettings(sett);
    setTodos(loadedTodos);
  }, [todayKey]);

  // Apply incoming remote state from Mobile/Tablet/Desktop cross-device sync
  const applyRemoteSyncState = useCallback(
    (remoteState: CrossDeviceSyncState, isInitial: boolean) => {
      if (remoteState.days && Object.keys(remoteState.days).length > 0) {
        setAllDays((prev) => {
          const merged: Record<string, DayData> = { ...prev };
          let changed = false;

          for (const [dKey, rDay] of Object.entries(remoteState.days)) {
            if (!rDay) continue;
            const localDay = prev[dKey];
            const mergedDay = mergeTwoDayRecords(localDay, rDay);
            if (JSON.stringify(localDay) !== JSON.stringify(mergedDay)) {
              merged[dKey] = mergedDay;
              changed = true;
            }
          }

          if (changed) {
            saveAllDays(merged, currentUser?.uid);
            return merged;
          }
          return prev;
        });
      } else if (isInitial) {
        // Server has no days yet; seed server with our non-empty local days so other devices get them
        const localDays = loadAllDays(currentUser?.uid);
        if (Object.keys(localDays).length > 0) {
          pushSyncToServer({
            scope: activeSyncScope,
            days: localDays,
            settings: loadSettings(currentUser?.uid),
            todos: loadAllTodos(currentUser?.uid),
            customDuas: loadCustomDuas(currentUser?.uid),
          });
        }
      }

      if (remoteState.settings) {
        const remoteSettings = remoteState.settings;
        setSettings((prev) => {
          const remoteTs = Number(remoteSettings.updatedAt) || 0;
          const localTs = Number(prev.updatedAt) || 0;
          if (remoteTs >= localTs) {
            const isRemoteDefaultSchedule =
              !remoteSettings.customSchedule ||
              (remoteSettings.customSchedule.Fajr?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan &&
                remoteSettings.customSchedule.Duhur?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan &&
                remoteSettings.customSchedule.Casar?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan &&
                remoteSettings.customSchedule.Maqrib?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan &&
                remoteSettings.customSchedule.Cishe?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan);
            const resolvedUseCustom =
              remoteSettings.useCustomSchedule === true && !isRemoteDefaultSchedule;

            const nextSettings: AppSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...remoteSettings,
              useCustomSchedule: resolvedUseCustom,
              customSchedule: {
                ...DEFAULT_USER_PRAYER_SCHEDULE,
                ...(prev.customSchedule || {}),
                ...(remoteSettings.customSchedule || {}),
              },
            };
            if (JSON.stringify(prev) !== JSON.stringify(nextSettings)) {
              saveSettings(nextSettings, currentUser?.uid);
              return nextSettings;
            }
          }
          return prev;
        });

        if (remoteSettings.genderConfirmed) {
          setShowGenderModal(false);
        }
      }

      if (Array.isArray(remoteState.todos)) {
        setTodos((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteState.todos)) {
            saveAllTodos(remoteState.todos!, currentUser?.uid);
            return remoteState.todos!;
          }
          return prev;
        });
      }

      if (Array.isArray(remoteState.customDuas) && remoteState.customDuas.length > 0) {
        setCustomDuas((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteState.customDuas)) {
            saveCustomDuas(remoteState.customDuas!, currentUser?.uid);
            return remoteState.customDuas!;
          }
          return prev;
        });
      }
    },
    [activeSyncScope, currentUser?.uid]
  );

  // Real-time Cross-Device Sync Subscription (SSE + Fast Poll for Mobile & Tablet)
  useEffect(() => {
    if (activeSyncScope === 'guest_logged_out') return;
    const unsubscribe = subscribeCrossDeviceSync(
      activeSyncScope,
      (state, isInitial) => {
        applyRemoteSyncState(state, isInitial);
      },
      (status) => {
        setSyncStatus(status);
      }
    );
    return () => unsubscribe();
  }, [activeSyncScope, applyRemoteSyncState]);

  // Robust helper to merge local and remote day data without losing marked prayers
  const parseTs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? (Number(val) || 0) : parsed;
  };

  const mergeDayData = useCallback((local: DayData | undefined, remote: DayData): DayData => {
    return mergeTwoDayRecords(local, remote);
  }, []);

  // Manual 1-tap Sync Trigger in Header — Synchronizes directly with Cloud Firestore
  const handleManualSync = useCallback(async () => {
    triggerReloadVisual();
    setSyncStatus('syncing');

    if (currentUser && !currentUser.isAnonymous) {
      try {
        const [cloudDays, cloudSettings, cloudTodos, cloudDuas] = await Promise.all([
          loadUserDaysFromFirestore(currentUser.uid),
          loadUserSettingsFromFirestore(currentUser.uid),
          loadUserTodosFromFirestore(currentUser.uid),
          loadUserCustomDuasFromFirestore(currentUser.uid),
        ]);

        if (cloudDays && Object.keys(cloudDays).length > 0) {
          setAllDays((prev) => {
            const merged: Record<string, DayData> = { ...prev };
            for (const [dKey, cDay] of Object.entries(cloudDays)) {
              merged[dKey] = mergeDayData(prev[dKey], cDay);
            }
            saveAllDays(merged, currentUser.uid);
            return merged;
          });
        }

        if (cloudSettings) {
          setSettings((prev) => {
            const next = { ...prev, ...cloudSettings };
            saveSettings(next, currentUser.uid);
            return next;
          });
        }

        if (cloudTodos) {
          setTodos(cloudTodos);
          saveAllTodos(cloudTodos, currentUser.uid);
        }

        if (cloudDuas) {
          setCustomDuas(cloudDuas);
          saveCustomDuas(cloudDuas, currentUser.uid);
        }

        // Also push any local days to Firestore if missing in cloud
        for (const [dKey, dVal] of Object.entries(allDays)) {
          if (!cloudDays[dKey]) {
            saveDayToFirestore(currentUser.uid, dKey, dVal).catch(() => {});
          }
        }

        setSyncStatus('connected');
        setSnoozeMessage('🔄 Xogtaada Cloud-ka (Firestore) si toos ah ayaa la isugu waafajiyay!');
      } catch (err) {
        console.error('Firestore manual sync error:', err);
        setSyncStatus('connected');
        setSnoozeMessage('⚠️ Cillad ayaa ku timid isku-xirka Cloud-ka. Fadlan hubi internet-ka.');
      }
    } else {
      setSyncStatus('connected');
      setShowAuthModal(true);
      setSnoozeMessage('⚠️ Fadlan gal koontadaada Google si aad qalabka badan isugu xirto.');
    }
    setTimeout(() => setSnoozeMessage(null), 3500);
  }, [allDays, currentUser, mergeDayData, triggerReloadVisual]);

  // Real-Time Firestore onSnapshot Listeners when signed in (deferred 400ms after boot so reload is instant)
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;
    const uid = currentUser.uid;
    let unsubDays: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let unsubTodos: (() => void) | null = null;
    let unsubDuas: (() => void) | null = null;

    const timer = setTimeout(() => {
      unsubDays = subscribeToUserDays(uid, (cloudDays) => {
        if (Object.keys(cloudDays).length > 0) {
          setAllDays((prev) => {
            const merged: Record<string, DayData> = { ...prev };
            let changed = false;

            for (const [dKey, cDay] of Object.entries(cloudDays)) {
              const localDay = prev[dKey];
              const mergedDay = mergeDayData(localDay, cDay);
              if (JSON.stringify(localDay) !== JSON.stringify(mergedDay)) {
                merged[dKey] = mergedDay;
                changed = true;
              }
            }
            if (changed) {
              saveAllDays(merged, uid);
              return merged;
            }
            return prev;
          });
        }
      });

      unsubSettings = subscribeToUserSettings(uid, (cloudSettings) => {
        setSettings((prev) => {
          const parseTs = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return isNaN(val) ? 0 : val;
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? (Number(val) || 0) : parsed;
          };
          const cloudTs = parseTs((cloudSettings as any)?.updatedAtMs || cloudSettings.updatedAt);
          const localTs = parseTs(prev.updatedAt);
          if (cloudTs >= localTs) {
            const isCloudDefaultSchedule =
              !cloudSettings.customSchedule ||
              (cloudSettings.customSchedule.Fajr?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan &&
                cloudSettings.customSchedule.Duhur?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan &&
                cloudSettings.customSchedule.Casar?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan &&
                cloudSettings.customSchedule.Maqrib?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan &&
                cloudSettings.customSchedule.Cishe?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan);
            const resolvedUseCustom =
              cloudSettings.useCustomSchedule === true && !isCloudDefaultSchedule;

            const merged: AppSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...cloudSettings,
              useCustomSchedule: resolvedUseCustom,
              customSchedule: {
                ...DEFAULT_USER_PRAYER_SCHEDULE,
                ...(prev.customSchedule || {}),
                ...(cloudSettings.customSchedule || {}),
              },
              updatedAt: cloudTs || Date.now(),
            };
            if (JSON.stringify(prev) !== JSON.stringify(merged)) {
              saveSettings(merged, uid);
              return merged;
            }
          }
          return prev;
        });
      });

      unsubTodos = subscribeToUserTodos(uid, (cloudTodos) => {
        setTodos((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(cloudTodos)) {
            saveAllTodos(cloudTodos, uid);
            return cloudTodos;
          }
          return prev;
        });
      });

      unsubDuas = subscribeToUserCustomDuas(uid, (cloudDuas) => {
        setCustomDuas((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(cloudDuas)) {
            saveCustomDuas(cloudDuas, uid);
            return cloudDuas;
          }
          return prev;
        });
      });
    }, 800);

    return () => {
      clearTimeout(timer);
      unsubDays?.();
      unsubSettings?.();
      unsubTodos?.();
      unsubDuas?.();
    };
  }, [currentUser]);

  // Unified Account Hydration & Cloud Recovery (0ms local restore + immediate Firestore pull/merge)
  const restoreAndSyncUserAccount = useCallback(
    async (
      user: User,
      options?: { isNewRegistration?: boolean; selectedGender?: 'male' | 'female' }
    ) => {
      if (!user || user.isAnonymous) return;

      try {
        localStorage.removeItem('tuko_logged_out');
      } catch {}

      // 1. Persist user snapshot & switch active storage scope immediately (0ms)
      savePersistedAuthUser(user);
      setActiveStorageUser(user.uid);
      setCurrentUser(user);

      // 2. Immediately recover & load user-scoped localStorage (including any guest activity before login)
      let localDays = loadAndRecoverUserDays(user.uid);
      const isAdminAccount =
        user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const userScope = isAdminAccount ? 'default_shared' : `user_${user.uid}`;

      if (
        isAdminAccount &&
        Object.values(localDays).filter((d) => hasDayMeaningfulActivity(d)).length <= 1
      ) {
        localDays = applyUserRequestedQuranConfig(localDays, getTodayKey());
        saveAllDays(localDays, user.uid);
      }

      if (Object.keys(localDays).length > 0) {
        setAllDays(localDays);
      }

      const localSettings = loadSettings(user.uid);
      const localTodos = loadAllTodos(user.uid);
      const localDuas = loadCustomDuas(user.uid);

      setSettings(localSettings);
      setTodos(localTodos);
      setCustomDuas(localDuas);

      // 3. Immediately fetch Firestore Cloud data & Profile in parallel (zero artificial delay!)
      try {
        const [syncedProfile, cloudDays, cloudSettings, cloudTodos, cloudDuas] =
          await Promise.all([
            syncUserProfile(
              user,
              undefined,
              undefined,
              options?.isNewRegistration ? options?.selectedGender : undefined
            ).catch(() => null),
            loadUserDaysFromFirestore(user.uid),
            loadUserSettingsFromFirestore(user.uid),
            loadUserTodosFromFirestore(user.uid),
            loadUserCustomDuasFromFirestore(user.uid),
          ]);

        if (syncedProfile) {
          setUserProfile(syncedProfile);
        }

        // Restore or sync Todos
        if (cloudTodos && cloudTodos.length > 0) {
          setTodos(cloudTodos);
          saveAllTodos(cloudTodos, user.uid);
        } else {
          saveTodosToFirestore(user.uid, localTodos).catch(() => {});
        }

        // Restore or sync Custom Duas
        if (cloudDuas && cloudDuas.length > 0) {
          setCustomDuas(cloudDuas);
          saveCustomDuas(cloudDuas, user.uid);
        } else {
          saveCustomDuasToFirestore(user.uid, localDuas).catch(() => {});
        }

        // Merge Local + Cloud Days without losing any recorded prayers, Quran pages, Surahs, or Adhkaar
        let mergedDays: Record<string, DayData> = { ...localDays };
        if (cloudDays && Object.keys(cloudDays).length > 0) {
          for (const [dKey, cDay] of Object.entries(cloudDays)) {
            mergedDays[dKey] = mergeTwoDayRecords(mergedDays[dKey], cDay);
          }
        }

        if (
          isAdminAccount &&
          Object.values(mergedDays).filter((d) => hasDayMeaningfulActivity(d)).length <= 1
        ) {
          mergedDays = applyUserRequestedQuranConfig(mergedDays, getTodayKey());
        }

        if (Object.keys(mergedDays).length === 0) {
          const currentToday = getTodayKey();
          mergedDays = {
            [currentToday]: { ...createEmptyDay(), updatedAt: Date.now() },
          };
        }

        setAllDays(mergedDays);
        saveAllDays(mergedDays, user.uid);

        // Push any local days with real activity that are missing or newer than Firestore back to Cloud
        for (const [dKey, dVal] of Object.entries(mergedDays)) {
          if (hasDayMeaningfulActivity(dVal)) {
            const cDay = cloudDays?.[dKey];
            if (!cDay || JSON.stringify(cDay) !== JSON.stringify(dVal)) {
              saveDayToFirestore(user.uid, dKey, dVal).catch(() => {});
            }
          }
        }

        pushSyncToServer({
          scope: userScope,
          days: mergedDays,
        });

        // Welcome banner once per session
        const welcomeSessionKey = `tuko_welcomed_session_${user.uid}`;
        const alreadyWelcomedThisSession = (() => {
          try {
            return sessionStorage.getItem(welcomeSessionKey) === 'true';
          } catch {
            return true;
          }
        })();

        if (!alreadyWelcomedThisSession) {
          try {
            sessionStorage.setItem(welcomeSessionKey, 'true');
          } catch {}
          const hasHistory = Object.values(mergedDays).some((d) =>
            hasDayMeaningfulActivity(d)
          );
          setAccountActionAlert({
            message: hasHistory
              ? `Ku soo dhowow koontadaada, ${user.displayName || 'Cibaadeyste'}! Dhammaan xogtaadii hore si buuxda ayaa laguu soo celiyay.`
              : `Ku soo dhowow Tuko, ${user.displayName || 'Cibaadeyste'}! Koontadaadu waa diyaar.`,
            type: 'success',
          });
        }

        // Restore or initialize Settings (never overwrite existing cloud settings with guest defaults!)
        const localConfirmedGender = localStorage.getItem(
          `tuko_gender_confirmed_${user.uid}`
        ) as 'male' | 'female' | null;
        const resolvedGender =
          (options?.isNewRegistration ? options?.selectedGender : undefined) ||
          cloudSettings?.gender ||
          syncedProfile?.gender ||
          localConfirmedGender ||
          options?.selectedGender;

        if (cloudSettings) {
          const cloudTs =
            Number((cloudSettings as any)?.updatedAtMs || cloudSettings.updatedAt) ||
            Date.now();
          const isCloudDefault =
            !cloudSettings.customSchedule ||
            (cloudSettings.customSchedule.Fajr?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan &&
              cloudSettings.customSchedule.Duhur?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan &&
              cloudSettings.customSchedule.Casar?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan &&
              cloudSettings.customSchedule.Maqrib?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan &&
              cloudSettings.customSchedule.Cishe?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan);
          const resolvedUseCustom = cloudSettings.useCustomSchedule === true && !isCloudDefault;

          const mergedSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...localSettings,
            ...cloudSettings,
            gender: resolvedGender || 'male',
            genderConfirmed:
              !!resolvedGender ||
              !!cloudSettings.genderConfirmed ||
              !!localSettings.genderConfirmed,
            startingStreakOffset:
              cloudSettings.startingStreakOffset ??
              localSettings.startingStreakOffset ??
              0,
            useCustomSchedule: resolvedUseCustom,
            customSchedule: {
              ...DEFAULT_USER_PRAYER_SCHEDULE,
              ...(localSettings.customSchedule || {}),
              ...(cloudSettings.customSchedule || {}),
            },
            alarms: Array.isArray(cloudSettings.alarms)
              ? cloudSettings.alarms
              : Array.isArray(localSettings.alarms)
              ? localSettings.alarms
              : DEFAULT_ALARMS,
            updatedAt: cloudTs,
          };
          setSettings(mergedSettings);
          saveSettings(mergedSettings, user.uid);
          if (resolvedGender) {
            localStorage.setItem(`tuko_gender_confirmed_${user.uid}`, resolvedGender);
          }
        } else {
          const isLocalDefault =
            !localSettings.customSchedule ||
            (localSettings.customSchedule.Fajr?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan &&
              localSettings.customSchedule.Duhur?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan &&
              localSettings.customSchedule.Casar?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan &&
              localSettings.customSchedule.Maqrib?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan &&
              localSettings.customSchedule.Cishe?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan);
          const resolvedLocalUseCustom = localSettings.useCustomSchedule === true && !isLocalDefault;

          const freshUserSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...localSettings,
            gender: resolvedGender || 'male',
            genderConfirmed: !!resolvedGender || !!localSettings.genderConfirmed,
            startingStreakOffset: localSettings.startingStreakOffset ?? 0,
            useCustomSchedule: resolvedLocalUseCustom,
            customSchedule: {
              ...DEFAULT_USER_PRAYER_SCHEDULE,
              ...(localSettings.customSchedule || {}),
            },
            alarms: Array.isArray(localSettings.alarms)
              ? localSettings.alarms
              : DEFAULT_ALARMS,
            updatedAt: Date.now(),
          };
          setSettings(freshUserSettings);
          saveSettings(freshUserSettings, user.uid);
          saveSettingsToFirestore(user.uid, freshUserSettings).catch(() => {});
          if (resolvedGender) {
            localStorage.setItem(`tuko_gender_confirmed_${user.uid}`, resolvedGender);
          } else {
            setShowGenderModal(true);
          }
        }
      } catch (err) {
        console.error('Error synchronizing with Firestore:', err);
      }
    },
    []
  );

  // Firebase Auth state listener — Wait for authStateReady so page reload NEVER logs out the user
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user && !user.isAnonymous) {
        await restoreAndSyncUserAccount(user);
      } else {
        // Wait for Firebase Auth IndexedDB persistence to finish initializing before acting on null
        try {
          if (typeof (auth as any).authStateReady === 'function') {
            await (auth as any).authStateReady();
          }
        } catch {}
        if (!isMounted) return;

        const latestUser = auth.currentUser;
        if (latestUser && !latestUser.isAnonymous) {
          await restoreAndSyncUserAccount(latestUser);
          return;
        }

        // Keep persisted user active across offline/fast reloads unless user explicitly logged out
        const persisted = loadPersistedAuthUser();
        const explicitlyLoggedOut =
          localStorage.getItem('tuko_logged_out') === 'true';

        if (!explicitlyLoggedOut && persisted?.uid) {
          setActiveStorageUser(persisted.uid);
          return;
        }

        setCurrentUser(null);
        setActiveStorageUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [restoreAndSyncUserAccount]);

  // Automatic midnight day-switch
  useEffect(() => {
    const checkMidnight = () => {
      const currentCalculatedToday = getTodayKey();
      if (currentCalculatedToday !== todayKey) {
        setTodayKey(currentCalculatedToday);
        setActiveDateKey((prev) => (prev === todayKey ? currentCalculatedToday : prev));
        setNewDayAlert(
          `🌅 Maalin cusub baa bilaabatay (${currentCalculatedToday}) — Salaadaha maanta si toos ah ayaa loo bilaabay!`
        );
        setTimeout(() => {
          setNewDayAlert(null);
        }, 8000);
      }
    };

    const interval = setInterval(checkMidnight, 5000);
    return () => clearInterval(interval);
  }, [todayKey]);

  // Current day data
  const currentDayData = useMemo(() => {
    return getDayData(activeDateKey, allDays);
  }, [activeDateKey, allDays]);

  // Prayer times for current date and location (supports user's custom schedule)
  const prayerTimes = useMemo(() => {
    const [y, m, d] = activeDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return getResolvedPrayerTimes(settings, dateObj);
  }, [activeDateKey, settings]);

  // Streak calculations (with user starting streak offset support)
  const streakStats = useMemo(() => {
    return calculateStreaks(allDays, todayKey, settings);
  }, [allDays, todayKey, settings]);

  // Register this device for server-sent Adhan push (works when phone is locked / app closed)
  const [notifPermissionTick, setNotifPermissionTick] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      // Re-check periodically in case the user grants permission later
      const t = setTimeout(() => setNotifPermissionTick((n) => n + 1), 15000);
      return () => clearTimeout(t);
    }

    if (!currentUser || currentUser.isAnonymous) {
      return;
    }

    const now = new Date();
    const times = getResolvedPrayerTimes(settings, now);
    const utcList = PRAYER_ORDER.map((p) => {
      const dec = times[p];
      if (dec == null || isNaN(dec)) return null;
      const h = Math.floor(dec);
      const m = Math.round((dec - h) * 60);
      const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    }).filter((x): x is string => !!x);
    const lang = settings.language === 'en' ? 'en' : 'so';
    initFCM(currentUser.uid, utcList, lang).catch(() => {});
  }, [currentUser, settings.customSchedule, settings.useCustomSchedule, settings.lat, settings.lon, settings.method, settings.language, todayKey, notifPermissionTick]);

  // 100% Native Exact Alarm Sync with Android OS AlarmManager (Prayers + Custom Alarms + To-Do Reminders)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).TukoNative?.schedulePrayerTimes) {
      try {
        const now = new Date();
        const pad2 = (n: number) => String(n).padStart(2, '0');
        const scheduleToSync: Array<{
          id: string;
          prayer: string;
          timestamp: number;
          time24: string;
          voice: string;
          soundType: string;
          type: 'adhan' | 'alarm';
          days?: number[];
        }> = [];

        // 1. Sync 5 Daily Prayer Adhans (Today & Tomorrow)
        if (settings.adhanSound !== false) {
          [0, 1].forEach((dayOffset) => {
            const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
            const resolved = getResolvedPrayerTimes(settings, targetDate);

            PRAYER_ORDER.forEach((p) => {
              const decHour = resolved[p];
              if (decHour != null && !isNaN(decHour)) {
                let h = Math.floor(decHour);
                let m = Math.round((decHour - h) * 60);
                if (m === 60) {
                  m = 0;
                  h += 1;
                }
                const dt = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), h, m, 0);
                const voice = settings.prayerVoices?.[p] || settings.adhanVoice || (p === 'Fajr' ? 'fajr' : 'makkah');
                const time24 = `${pad2(h)}:${pad2(m)}`;

                // Only sync upcoming prayers (at least 5s in the future) so past prayers are never scheduled
                if (dt.getTime() > now.getTime() + 5000) {
                  scheduleToSync.push({
                    id: `prayer_${p}_${dayOffset}`,
                    prayer: p,
                    timestamp: dt.getTime(),
                    time24,
                    voice,
                    soundType: 'adhan',
                    type: 'adhan',
                  });
                }
              }
            });
          });
        }

        // 2. Sync Custom Alarms (Today & Tomorrow)
        const userAlarms = Array.isArray(settings.alarms) ? settings.alarms : DEFAULT_ALARMS;
        userAlarms.forEach((alarm) => {
          if (!alarm.enabled || !alarm.time) return;
          const [aH, aM] = alarm.time.split(':').map(Number);
          if (!Number.isFinite(aH) || !Number.isFinite(aM)) return;
          const time24 = `${pad2(aH)}:${pad2(aM)}`;

          [0, 1].forEach((dayOffset) => {
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, aH, aM, 0);
            const dow = dt.getDay();
            if (Array.isArray(alarm.days) && alarm.days.length > 0 && !alarm.days.includes(dow)) return;

            if (dt.getTime() > now.getTime() + 5000) {
              scheduleToSync.push({
                id: `alarm_${alarm.id}_${dayOffset}`,
                prayer: alarm.label || 'Alaarm',
                timestamp: dt.getTime(),
                time24,
                voice: alarm.selectedVoice || settings.adhanVoice || 'makkah',
                soundType: alarm.sound || 'adhan',
                type: 'alarm',
                days: Array.isArray(alarm.days) ? alarm.days : [],
              });
            }
          });
        });

        // 3. Sync To-Do Reminders with dueTime
        todos.forEach((todo) => {
          if (todo.completed || !todo.dueTime) return;
          const [tH, tM] = todo.dueTime.split(':').map(Number);
          if (!Number.isFinite(tH) || !Number.isFinite(tM)) return;
          const time24 = `${pad2(tH)}:${pad2(tM)}`;
          const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tH, tM, 0);

          scheduleToSync.push({
            id: `todo_${todo.id}`,
            prayer: `Hawshaada: ${todo.task}`,
            timestamp: dt.getTime(),
            time24,
            voice: settings.adhanVoice || 'makkah',
            soundType: 'chime',
            type: 'alarm',
          });
        });

        (window as any).TukoNative.schedulePrayerTimes(JSON.stringify(scheduleToSync));
      } catch (err) {
        console.warn('Native exact alarm sync notice:', err);
      }
    }
  }, [
    settings.cityId,
    settings.cityName,
    settings.lat,
    settings.lon,
    settings.customSchedule,
    settings.useCustomSchedule,
    settings.prayerVoices,
    settings.adhanVoice,
    settings.adhanSound,
    settings.alarms,
    todos,
  ]);

  // Check for Adhaan time & Custom Alarms periodically with sleep recovery and visibility detection
  useEffect(() => {
    const userAlarmsList = Array.isArray(settings.alarms) ? settings.alarms : DEFAULT_ALARMS;

    // Reload notified maps from localStorage in case user updated a prayer schedule or alarm time
    try {
      const savedPrayers = localStorage.getItem(`tuko_notified_prayers_${todayKey}`);
      notifiedPrayersRef.current = savedPrayers ? JSON.parse(savedPrayers) : {};
    } catch {}
    try {
      const savedAlarms = localStorage.getItem(`tuko_notified_alarms_${todayKey}`);
      notifiedAlarmsRef.current = savedAlarms ? JSON.parse(savedAlarms) : {};
    } catch {}

    // Silently marks any custom alarm or todo that is currently in its trigger window
    // while the app is hidden in the background so returning from outside NEVER re-triggers it.
    const markCurrentWindowAsHandledSilently = (now: Date) => {
      const currentDecimalHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const currentDayOfWeek = now.getDay();
      const currentTotalMin = now.getHours() * 60 + now.getMinutes();
      const todayResolvedPrayers = getResolvedPrayerTimes(settings, now);
      let prayersUpdated = false;
      let alarmsUpdated = false;

      PRAYER_ORDER.forEach((p) => {
        const prayerDecimalHour = todayResolvedPrayers[p];
        if (prayerDecimalHour != null) {
          const diffInMinutes = (currentDecimalHour - prayerDecimalHour) * 60;
          const schedMin = Math.round(prayerDecimalHour * 60);
          const notificationKey = `${todayKey}_${p}_${schedMin}`;
          const preAlertMinutes = Number(settings.prePrayerAlertMinutes) || 0;
          const prePrayerKey = `${todayKey}_pre_${p}_${schedMin}`;

          if (
            preAlertMinutes > 0 &&
            diffInMinutes <= -preAlertMinutes &&
            diffInMinutes >= -(preAlertMinutes + 2.0) &&
            !notifiedPrayersRef.current[prePrayerKey]
          ) {
            notifiedPrayersRef.current[prePrayerKey] = true;
            prayersUpdated = true;
          }

          if (diffInMinutes >= 0 && diffInMinutes < 5.0 && !notifiedPrayersRef.current[notificationKey]) {
            notifiedPrayersRef.current[notificationKey] = true;
            prayersUpdated = true;
          }
        }
      });

      userAlarmsList.forEach((alarm) => {
        if (!alarm.enabled || !alarm.time) return;
        const matchesDay = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDayOfWeek);
        if (!matchesDay) return;
        const [aH, aM] = alarm.time.split(':').map(Number);
        if (!Number.isFinite(aH) || !Number.isFinite(aM)) return;
        const alarmTotalMin = aH * 60 + aM;
        const diffAlarmMin = currentTotalMin - alarmTotalMin;
        if (diffAlarmMin >= 0 && diffAlarmMin <= 2) {
          const alarmKey = `${todayKey}_alarm_${alarm.id}_${alarm.time}`;
          if (!notifiedAlarmsRef.current[alarmKey]) {
            notifiedAlarmsRef.current[alarmKey] = true;
            alarmsUpdated = true;
          }
        }
      });

      todos.forEach((todo) => {
        if (todo.completed || !todo.dueTime) return;
        if (todo.dueDate && todo.dueDate !== todayKey) return;
        const [tH, tM] = todo.dueTime.split(':').map(Number);
        if (!Number.isFinite(tH) || !Number.isFinite(tM)) return;
        const todoTotalMin = tH * 60 + tM;
        const diffTodoMin = currentTotalMin - todoTotalMin;
        if (diffTodoMin >= 0 && diffTodoMin < 5) {
          const todoKey = `${todayKey}_todo_${todo.id}_${todo.dueTime}`;
          if (!notifiedAlarmsRef.current[todoKey]) {
            notifiedAlarmsRef.current[todoKey] = true;
            alarmsUpdated = true;
          }
        }
      });

      if (prayersUpdated) {
        try {
          localStorage.setItem(`tuko_notified_prayers_${todayKey}`, JSON.stringify(notifiedPrayersRef.current));
        } catch {}
      }
      if (alarmsUpdated) {
        try {
          localStorage.setItem(`tuko_notified_alarms_${todayKey}`, JSON.stringify(notifiedAlarmsRef.current));
        } catch {}
      }
    };

    const checkScheduleAndAlarms = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const isCurrentlyHidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';

      // 0. If the user is OUTSIDE the app (hidden/background), Native Android (AdhanForegroundService / AlarmManager)
      // handles ringing and notifications outside the app. Never open in-app modals or trigger WebView audio while hidden!
      if (isCurrentlyHidden) {
        isAppHiddenRef.current = true;
        markCurrentWindowAsHandledSilently(now);
        return;
      }

      if (isAppHiddenRef.current) {
        isAppHiddenRef.current = false;
        appVisibleSinceRef.current = nowMs;
      }
      lastVisibleTickRef.current = nowMs;

      const currentDecimalHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const currentDayOfWeek = now.getDay();

      // ALWAYS calculate today's resolved prayer times using the actual current moment
      const todayResolvedPrayers = getResolvedPrayerTimes(settings, now);

      // 1. Check Prayer Adhans & Pre-Prayer Reminders
      PRAYER_ORDER.forEach((p) => {
        const prayerDecimalHour = todayResolvedPrayers[p];
        if (prayerDecimalHour != null) {
          const diffInMinutes = (currentDecimalHour - prayerDecimalHour) * 60;
          const schedMin = Math.round(prayerDecimalHour * 60);
          const pH = Math.floor(schedMin / 60);
          const pM = schedMin % 60;
          const pTime24 = `${String(pH).padStart(2, '0')}:${String(pM).padStart(2, '0')}`;
          const notificationKey = `${todayKey}_${p}_${schedMin}`;
          const preAlertMinutes = Number(settings.prePrayerAlertMinutes) || 0;
          const prePrayerKey = `${todayKey}_pre_${p}_${schedMin}`;

          // Pre-prayer alert: only when explicitly turned on in settings (> 0 min)
          if (
            preAlertMinutes > 0 &&
            settings.prePrayerSound !== false &&
            diffInMinutes <= -preAlertMinutes &&
            diffInMinutes >= -(preAlertMinutes + 2.0) &&
            !notifiedPrayersRef.current[prePrayerKey]
          ) {
            notifiedPrayersRef.current[prePrayerKey] = true;
            try {
              localStorage.setItem(`tuko_notified_prayers_${todayKey}`, JSON.stringify(notifiedPrayersRef.current));
            } catch {}
            audioAlerts.playPrePrayerChime();
            const somaliPrayerName = PRAYER_SOMALI_LABELS[p];
            sendBrowserNotification(
              'Diyaargarowga Salaadda',
              `⏳ Waxaa dhow waqtiga salaadda ${somaliPrayerName} (${preAlertMinutes} daqiiqo ka dib). Fadlan weeso qaado oo isu diyaari cibaadada.`
            );
            setSnoozeMessage(`⏳ ${preAlertMinutes} daqiiqo ayaa ka dhiman ${somaliPrayerName}. Fadlan weeso qaado!`);
            setTimeout(() => setSnoozeMessage(null), 6000);
          }

          // Real-time prayer Adhan alert: trigger ONLY within the first 60 seconds (1 minute) when prayer time arrives!
          if (diffInMinutes >= 0 && !notifiedPrayersRef.current[notificationKey]) {
            notifiedPrayersRef.current[notificationKey] = true;
            try {
              localStorage.setItem(`tuko_notified_prayers_${todayKey}`, JSON.stringify(notifiedPrayersRef.current));
            } catch {}

            // Only trigger audio, takeover overlay & notification if we are within the first 60 seconds!
            if (diffInMinutes < 1.0) {
              if (audioAlerts.isMinuteSilenced(pTime24)) {
                return;
              }

              // 1. Play authentic Adhan sound for this prayer's chosen voice (enabled by default)
              if (ambientSounds.getState().isAnyPlaying) {
                ambientSounds.pauseOrResumeAll();
              }
              if (settings.adhanSound !== false) {
                const prayerVoice = settings.prayerVoices?.[p] || settings.adhanVoice || 'makkah';
                audioAlerts.playAdhan(p === 'Fajr', undefined, prayerVoice);
              }

              // 2. Dispatch system notification to device
              const somaliPrayerName = PRAYER_SOMALI_LABELS[p];
              sendBrowserNotification(
                'Tuko',
                `🕌 Aadaanka ${somaliPrayerName} Wuu Galay!\nWaa waqtigii salaadda ${somaliPrayerName}. Kac oo dhowr salaaddaada oo u diyaar garow cibaadada.`
              );

              // 3. Open takeover overlay (Post-Prayer Dhikr & Adhan Screen)
              setActiveAdhaanOverlayPrayer(p);
            }
          }
        }
      });

      // 2. Check Custom Alarms
      const currentTotalMin = now.getHours() * 60 + now.getMinutes();

      userAlarmsList.forEach((alarm) => {
        if (!alarm.enabled || !alarm.time) return;

        const matchesDay = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDayOfWeek);
        if (!matchesDay) return;

        const [aH, aM] = alarm.time.split(':').map(Number);
        if (!Number.isFinite(aH) || !Number.isFinite(aM)) return;
        const alarmTotalMin = aH * 60 + aM;
        const diffAlarmMin = currentTotalMin - alarmTotalMin;
        const alarmTime24 = `${String(aH).padStart(2, '0')}:${String(aM).padStart(2, '0')}`;

        if (diffAlarmMin >= 0 && diffAlarmMin <= 2) {
          const alarmKey = `${todayKey}_alarm_${alarm.id}_${alarm.time}`;
          if (!notifiedAlarmsRef.current[alarmKey]) {
            notifiedAlarmsRef.current[alarmKey] = true;
            try {
              localStorage.setItem(`tuko_notified_alarms_${todayKey}`, JSON.stringify(notifiedAlarmsRef.current));
            } catch {}

            if (diffAlarmMin > 0 || audioAlerts.isMinuteSilenced(alarmTime24)) {
              return;
            }

            // Start playing alarm audio immediately
            if (ambientSounds.getState().isAnyPlaying) {
              ambientSounds.pauseOrResumeAll();
            }
            audioAlerts.playAlarm(alarm.sound, alarm.selectedVoice || 'makkah');

            // Trigger alarm overlay
            setActiveRingingAlarm(alarm);

            // Dispatch browser notification
            sendBrowserNotification(
              alarm.label || 'Alaarm-ka Tuko',
              `⏰ Waa waqtigii: ${alarm.label} (${alarm.time}).`
            );
          }
        }
      });

      // 3. Check To-Do List Task Reminders (dueTime for today)
      todos.forEach((todo) => {
        if (todo.completed || !todo.dueTime) return;
        if (todo.dueDate && todo.dueDate !== todayKey) return;

        const [tH, tM] = todo.dueTime.split(':').map(Number);
        if (!Number.isFinite(tH) || !Number.isFinite(tM)) return;
        const todoTotalMin = tH * 60 + tM;
        const diffTodoMin = currentTotalMin - todoTotalMin;
        const todoTime24 = `${String(tH).padStart(2, '0')}:${String(tM).padStart(2, '0')}`;

        if (diffTodoMin >= 0 && diffTodoMin < 5) {
          const todoKey = `${todayKey}_todo_${todo.id}_${todo.dueTime}`;
          if (!notifiedAlarmsRef.current[todoKey]) {
            notifiedAlarmsRef.current[todoKey] = true;
            try {
              localStorage.setItem(`tuko_notified_alarms_${todayKey}`, JSON.stringify(notifiedAlarmsRef.current));
            } catch {}

            if (diffTodoMin > 0 || audioAlerts.isMinuteSilenced(todoTime24)) {
              return;
            }

            const todoAlarm: CustomAlarm = {
              id: `todo_alarm_${todo.id}`,
              time: todo.dueTime,
              label: `📋 Hawshaada To-Do: ${todo.task}`,
              enabled: true,
              sound: 'chime',
              days: [],
              createdAt: Date.now(),
            };
            audioAlerts.playAlarm('chime', settings.adhanVoice || 'makkah');
            setActiveRingingAlarm(todoAlarm);
            sendBrowserNotification(
              'Xusuusinta Hawlaha (To-Do)',
              `📋 Waa waqtigii hawshaada: ${todo.task} (${todo.dueTime})`
            );
          }
        }
      });
    };

    const handleScheduleUpdatedEvent = () => {
      try {
        const savedPrayers = localStorage.getItem(`tuko_notified_prayers_${todayKey}`);
        notifiedPrayersRef.current = savedPrayers ? JSON.parse(savedPrayers) : {};
      } catch {}
      try {
        const savedAlarms = localStorage.getItem(`tuko_notified_alarms_${todayKey}`);
        notifiedAlarmsRef.current = savedAlarms ? JSON.parse(savedAlarms) : {};
      } catch {}
      checkScheduleAndAlarms();
    };

    // Run initial check immediately
    checkScheduleAndAlarms();

    const interval = setInterval(checkScheduleAndAlarms, 1500);

    // Un-throttled Background Web Worker Clock so minimized Desktop tabs never miss Adhan time
    let bgWorker: Worker | null = null;
    let bgWorkerUrl: string | null = null;
    try {
      const workerCode = `setInterval(function(){ postMessage('tick'); }, 1500);`;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      bgWorkerUrl = URL.createObjectURL(blob);
      bgWorker = new Worker(bgWorkerUrl);
      bgWorker.onmessage = () => {
        checkScheduleAndAlarms();
      };
    } catch {}

    // Handle visibility transitions: when leaving the app, silence in-app modals;
    // when returning from outside the app, mark current-window alarms as handled so they NEVER re-trigger!
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        isAppHiddenRef.current = true;
        markCurrentWindowAsHandledSilently(new Date());
      } else {
        const now = new Date();
        isAppHiddenRef.current = false;
        appVisibleSinceRef.current = now.getTime();
        lastVisibleTickRef.current = now.getTime();
        markCurrentWindowAsHandledSilently(now);
        setActiveRingingAlarm(null);
        audioAlerts.stopAlarm();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('tuko-schedule-updated', handleScheduleUpdatedEvent);

    return () => {
      clearInterval(interval);
      if (bgWorker) {
        try {
          bgWorker.terminate();
        } catch {}
      }
      if (bgWorkerUrl) {
        try {
          URL.revokeObjectURL(bgWorkerUrl);
        } catch {}
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('tuko-schedule-updated', handleScheduleUpdatedEvent);
    };
  }, [todayKey, settings, todos]);

  // Snooze handler for Adhan
  const handleSnooze = useCallback((minutes: number, prayer: PrayerName) => {
    setActiveAdhaanOverlayPrayer(null);
    audioAlerts.silenceCurrentMinuteInNative();
    audioAlerts.stopAlarm();
    if (snoozeTimeoutRef.current) clearTimeout(snoozeTimeoutRef.current);

    const message = `⏰ Xusuusin: Adhkaarta ${PRAYER_SOMALI_LABELS[prayer]} waxaa dib laguu soo xusuusin doonaa ${minutes} daqiiqo ka dib.`;
    setSnoozeMessage(message);

    snoozeTimeoutRef.current = setTimeout(() => {
      setActiveAdhaanOverlayPrayer(prayer);
      setSnoozeMessage(null);
    }, minutes * 60 * 1000);

    setTimeout(() => {
      setSnoozeMessage(null);
    }, 7000);
  }, []);

  // Alarm Ring Dismiss & Snooze Handlers
  const handleDismissAlarm = useCallback(() => {
    setActiveRingingAlarm(null);
    audioAlerts.silenceCurrentMinuteInNative();
    audioAlerts.stopAlarm();
  }, []);

  const handleSnoozeAlarm = useCallback((minutes = 5) => {
    const alarmToSnooze = activeRingingAlarm;
    setActiveRingingAlarm(null);
    audioAlerts.silenceCurrentMinuteInNative();
    audioAlerts.stopAlarm();
    if (alarmSnoozeTimeoutRef.current) clearTimeout(alarmSnoozeTimeoutRef.current);

    if (alarmToSnooze) {
      setSnoozeMessage(`⏰ Alaarm-ka "${alarmToSnooze.label}" waxaa dib laguu soo xusuusin doonaa ${minutes} daqiiqo ka dib.`);
      alarmSnoozeTimeoutRef.current = setTimeout(() => {
        setActiveRingingAlarm(alarmToSnooze);
      }, minutes * 60 * 1000);

      setTimeout(() => {
        setSnoozeMessage(null);
      }, 7000);
    }
  }, [activeRingingAlarm]);

  // Helper to sync a single day update across localStorage, Cross-Device Server, and Firestore
  const commitDayUpdate = useCallback(
    (dateKey: string, updatedDay: DayData, nextAllDays: Record<string, DayData>) => {
      saveAllDays(nextAllDays, currentUser?.uid);
      pushSyncToServer({
        scope: activeSyncScope,
        isExplicitAction: true,
        dayUpdate: { dateKey, dayData: updatedDay },
      });
      if (currentUser) {
        saveDayToFirestore(currentUser.uid, dateKey, updatedDay).catch(console.error);
      }
    },
    [activeSyncScope, currentUser]
  );

  // Update a single prayer in current day
  const handleUpdatePrayer = useCallback(
    (prayer: PrayerName, record: Partial<SalaahRecord>) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const existingRec = day.salaah[prayer] || { status: 'none', reason: '' };
        const updatedRec = { ...existingRec, ...record };

        const updatedDay: DayData = {
          ...day,
          salaah: {
            ...day.salaah,
            [prayer]: updatedRec,
          },
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Mark Prayed handler (Batoonka "Waan Tukaday")
  const handleMarkPrayed = useCallback(
    (prayer: PrayerName, status: SalaahStatus) => {
      audioAlerts.silenceCurrentMinuteInNative();
      audioAlerts.stopAlarm();
      handleUpdatePrayer(prayer, { status });
      logEvent('prayer_marked', { prayer, status });
      setActiveAdhaanOverlayPrayer(null);
      const label =
        status === 'early_home'
          ? 'Waqtigeeda Hore (Guriga 🌸)'
          : status === 'mosque'
          ? 'Masaajidka'
          : status === 'home'
          ? 'Guriga'
          : 'Lama tukan';
      setSnoozeMessage(
        `🕌 Masha'Allah! Salaadda ${PRAYER_SOMALI_LABELS[prayer]} waxaa loo diiwaangeliyay: ${label}.`
      );
      setTimeout(() => setSnoozeMessage(null), 5000);
    },
    [handleUpdatePrayer]
  );

  // Bulk update all 5 prayers for today
  const handleBulkUpdate = useCallback(
    (status: SalaahStatus) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedSalaah = { ...day.salaah };

        PRAYER_ORDER.forEach((p) => {
          updatedSalaah[p] = {
            ...updatedSalaah[p],
            status,
          };
        });

        const updatedDay: DayData = {
          ...day,
          salaah: updatedSalaah,
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Toggle single adhkar item
  const handleToggleAdhkar = useCallback(
    (adhkarId: string, value: boolean) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedAdhkar = { ...day.adhkar, [adhkarId]: value };

        const updatedDay: DayData = {
          ...day,
          adhkar: updatedAdhkar,
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Toggle single custom dua
  const handleToggleCustomDua = useCallback(
    (duaId: string, value: boolean) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedCustom = { ...day.customDuasCompleted, [duaId]: value };

        const updatedDay: DayData = {
          ...day,
          customDuasCompleted: updatedCustom,
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Mark all currently visible Adhkar and custom Duas as read
  const handleMarkAllRead = useCallback(
    (adhkarIds: string[], customDuaIds: string[]) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedAdhkar = { ...day.adhkar };
        const updatedCustom = { ...day.customDuasCompleted };

        adhkarIds.forEach((id) => {
          updatedAdhkar[id] = true;
        });

        customDuaIds.forEach((id) => {
          updatedCustom[id] = true;
        });

        const updatedDay: DayData = {
          ...day,
          adhkar: updatedAdhkar,
          customDuasCompleted: updatedCustom,
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Clear all currently visible Adhkar and custom Duas
  const handleClearAllAdhkar = useCallback(
    (adhkarIds: string[], customDuaIds: string[]) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedAdhkar = { ...day.adhkar };
        const updatedCustom = { ...day.customDuasCompleted };

        adhkarIds.forEach((id) => {
          updatedAdhkar[id] = false;
        });

        customDuaIds.forEach((id) => {
          updatedCustom[id] = false;
        });

        const updatedDay: DayData = {
          ...day,
          adhkar: updatedAdhkar,
          customDuasCompleted: updatedCustom,
          updatedAt: Date.now(),
        };

        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Add custom dua
  const handleAddCustomDua = useCallback(
    (newDuaData: Omit<CustomDua, 'id' | 'createdAt'>) => {
      const newDua: CustomDua = {
        ...newDuaData,
        id: `dua_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };

      setCustomDuas((prev) => {
        const next = [newDua, ...prev];
        saveCustomDuas(next, currentUser?.uid);
        pushSyncToServer({
          scope: activeSyncScope,
          isExplicitAction: true,
          customDuas: next,
        });
        if (currentUser) {
          saveCustomDuasToFirestore(currentUser.uid, next).catch(console.error);
        }
        return next;
      });
    },
    [activeSyncScope, currentUser]
  );

  // Edit custom dua (text & count)
  const handleEditCustomDua = useCallback(
    (duaId: string, updates: Partial<Omit<CustomDua, 'id' | 'createdAt'>>) => {
      setCustomDuas((prev) => {
        const next = prev.map((d) =>
          d.id === duaId
            ? {
                ...d,
                ...updates,
                targetCount: Math.max(1, Number(updates.targetCount ?? d.targetCount) || 1),
              }
            : d
        );
        saveCustomDuas(next, currentUser?.uid);
        pushSyncToServer({
          scope: activeSyncScope,
          isExplicitAction: true,
          customDuas: next,
        });
        if (currentUser) {
          saveCustomDuasToFirestore(currentUser.uid, next).catch(console.warn);
        }
        return next;
      });
    },
    [activeSyncScope, currentUser]
  );

  // Delete custom dua
  const handleDeleteCustomDua = useCallback(
    (duaId: string) => {
      setCustomDuas((prev) => {
        const next = prev.filter((d) => d.id !== duaId);
        saveCustomDuas(next, currentUser?.uid);
        pushSyncToServer({
          scope: activeSyncScope,
          isExplicitAction: true,
          customDuas: next,
        });
        if (currentUser) {
          saveCustomDuasToFirestore(currentUser.uid, next).catch(console.warn);
        }
        return next;
      });
    },
    [activeSyncScope, currentUser]
  );

  // Update Todos list (synced across Mobile & Tablet)
  const handleUpdateTodos = useCallback(
    (nextTodos: TodoItem[]) => {
      setTodos(nextTodos);
      saveAllTodos(nextTodos, currentUser?.uid);
      pushSyncToServer({
        scope: activeSyncScope,
        isExplicitAction: true,
        todos: nextTodos,
      });
      if (currentUser) {
        saveTodosToFirestore(currentUser.uid, nextTodos).catch(console.error);
      }
    },
    [activeSyncScope, currentUser]
  );

  // Update Quran pages
  const handleUpdateQuran = useCallback(
    (pages: number) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedDay: DayData = {
          ...day,
          quran: Math.max(0, pages),
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Deduct Quran pages from active day and/or ongoing Khatmah
  const handleDeductQuranPages = useCallback(
    (amountToDeduct: number) => {
      if (amountToDeduct <= 0) return;
      setAllDays((prev) => {
        let remaining = amountToDeduct;
        const nextAllDays = { ...prev };
        const updatedDaysForCloud: Array<{ dateKey: string; day: DayData }> = [];
        const now = Date.now();

        // 1. First deduct from active date
        const activeDay = getDayData(activeDateKey, nextAllDays);
        const currentActivePages = Number(activeDay.quran) || 0;
        if (currentActivePages > 0) {
          const deductFromActive = Math.min(currentActivePages, remaining);
          const updatedActiveDay: DayData = {
            ...activeDay,
            quran: currentActivePages - deductFromActive,
            updatedAt: now,
          };
          nextAllDays[activeDateKey] = updatedActiveDay;
          remaining -= deductFromActive;
          updatedDaysForCloud.push({ dateKey: activeDateKey, day: updatedActiveDay });
        }

        // 2. If remaining > 0, deduct from recent days (so Khatmah decreases!)
        if (remaining > 0) {
          const sortedDateKeys = Object.keys(nextAllDays)
            .filter((k) => k !== activeDateKey && Number(nextAllDays[k]?.quran) > 0)
            .sort((a, b) => b.localeCompare(a)); // most recent first

          for (const k of sortedDateKeys) {
            if (remaining <= 0) break;
            const pastDay = nextAllDays[k];
            const pastPages = Number(pastDay.quran) || 0;
            if (pastPages > 0) {
              const deductFromPast = Math.min(pastPages, remaining);
              const updatedPastDay: DayData = {
                ...pastDay,
                quran: pastPages - deductFromPast,
                updatedAt: now,
              };
              nextAllDays[k] = updatedPastDay;
              remaining -= deductFromPast;
              updatedDaysForCloud.push({ dateKey: k, day: updatedPastDay });
            }
          }
        }

        saveAllDays(nextAllDays, currentUser?.uid);
        pushSyncToServer({
          scope: activeSyncScope,
          isExplicitAction: true,
          days: nextAllDays,
        });

        if (currentUser && updatedDaysForCloud.length > 0) {
          updatedDaysForCloud.forEach(({ dateKey, day }) => {
            saveDayToFirestore(currentUser.uid, dateKey, day).catch(console.error);
          });
        }

        return nextAllDays;
      });
    },
    [activeDateKey, activeSyncScope, currentUser]
  );

  // Toggle single Quran surah (1-114) read today, with optional automatic page delta
  const handleToggleQuranSurah = useCallback(
    (surahNum: number, pageDelta?: number) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const currentSurahs = Array.isArray(day.quranSurahs) ? day.quranSurahs : [];
        const exists = currentSurahs.includes(surahNum);
        const updatedSurahs = exists
          ? currentSurahs.filter((n) => n !== surahNum)
          : [...currentSurahs, surahNum].sort((a, b) => a - b);

        const currentPages = Number(day.quran) || 0;
        let updatedPages = currentPages;
        if (pageDelta !== undefined) {
          updatedPages = Math.max(0, currentPages + pageDelta);
        }

        const updatedDay: DayData = {
          ...day,
          quran: updatedPages,
          quranSurahs: updatedSurahs,
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Set all Quran surahs or clear
  const handleSetQuranSurahs = useCallback(
    (surahs: number[]) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedDay: DayData = {
          ...day,
          quranSurahs: surahs,
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Apply user-requested Quran journey: today 15 pages & surahs 49-53, all-time 66 surahs (49-114)
  const handleApplyUserQuranJourney = useCallback(() => {
    setAllDays((prev) => {
      const updated = applyUserRequestedQuranConfig(prev, todayKey);
      const now = Date.now();
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], updatedAt: now };
      });
      saveAllDays(updated, currentUser?.uid);
      pushSyncToServer({
        scope: activeSyncScope,
        isExplicitAction: true,
        days: updated,
      });
      try {
        localStorage.setItem('tuko_user_quran_journey_v2', 'true');
      } catch (e) {
        console.error(e);
      }
      if (currentUser) {
        Object.entries(updated).forEach(([dKey, dVal]) => {
          saveDayToFirestore(currentUser.uid, dKey, dVal).catch(console.error);
        });
      }
      return updated;
    });
  }, [todayKey, activeSyncScope, currentUser]);

  // Update Tasbeeh Count for active day
  const handleUpdateTasbeeh = useCallback(
    (count: number) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedDay: DayData = {
          ...day,
          tasbeehCount: count,
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Toggle Fasting (Soon) for active day
  const handleToggleSoon = useCallback(
    (isFasting: boolean) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedDay: DayData = {
          ...day,
          soon: isFasting,
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Update DayData properties (such as fridayKahfRead, fridaySalawatCount, isExcusedDay)
  const handleUpdateDay = useCallback(
    (updates: Partial<DayData>) => {
      setAllDays((prev) => {
        const day = getDayData(activeDateKey, prev);
        const updatedSalaah = { ...day.salaah };

        if (updates.isExcusedDay === true) {
          PRAYER_ORDER.forEach((p) => {
            if (!updatedSalaah[p] || updatedSalaah[p].status === 'none') {
              updatedSalaah[p] = {
                ...(updatedSalaah[p] || { reason: '' }),
                status: 'excused',
              };
            }
          });
        } else if (updates.isExcusedDay === false) {
          PRAYER_ORDER.forEach((p) => {
            if (updatedSalaah[p]?.status === 'excused') {
              updatedSalaah[p] = {
                ...updatedSalaah[p],
                status: 'none',
              };
            }
          });
        }

        const updatedDay: DayData = {
          ...day,
          ...updates,
          salaah: updatedSalaah,
          updatedAt: Date.now(),
        };
        const nextAllDays = { ...prev, [activeDateKey]: updatedDay };
        commitDayUpdate(activeDateKey, updatedDay, nextAllDays);
        return nextAllDays;
      });
    },
    [activeDateKey, commitDayUpdate]
  );

  // Update App Settings
  const handleUpdateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated: AppSettings = {
          ...prev,
          ...newSettings,
          ...(newSettings.gender ? { genderConfirmed: true } : {}),
          updatedAt: Date.now(),
        };
        saveSettings(updated, currentUser?.uid);
        pushSyncToServer({
          scope: activeSyncScope,
          isExplicitAction: true,
          settings: updated,
        });

        if (currentUser) {
          saveSettingsToFirestore(currentUser.uid, updated).catch(console.error);
        }

        return updated;
      });
    },
    [activeSyncScope, currentUser]
  );

  // Reset all data
  const handleResetAllData = useCallback(async () => {
    if (
      window.confirm(
        'DIGNIIN: Ma hubtaa inaad tirtirto dhammaan xogta salaadaha, diiwaanka, iyo ducooyinka? Tallaabadan dib looma celin karo.'
      )
    ) {
      const activeUid = currentUser?.uid;
      const emptyDays = { [todayKey]: { ...createEmptyDay(), updatedAt: Date.now() } };
      const freshDuas = loadCustomDuas();
      const freshSettings = { ...loadSettings(), updatedAt: Date.now() };
      const freshTodos = INITIAL_TODOS.map((t) => ({ ...t, completed: false }));

      saveAllDays(emptyDays, activeUid);
      saveSettings(freshSettings, activeUid);
      saveAllTodos(freshTodos, activeUid);
      saveCustomDuas(freshDuas, activeUid);

      setAllDays(emptyDays);
      setCustomDuas(freshDuas);
      setSettings(freshSettings);
      setTodos(freshTodos);

      pushSyncToServer({
        scope: activeSyncScope,
        resetAll: true,
        isExplicitAction: true,
        days: emptyDays,
        settings: freshSettings,
        todos: freshTodos,
        customDuas: freshDuas,
      });

      if (currentUser) {
        await resetUserCloudDataInFirestore(
          currentUser.uid,
          todayKey,
          emptyDays[todayKey],
          freshSettings,
          freshTodos,
          freshDuas
        ).catch(console.error);
      }

      setSnoozeMessage('🗑️ Dhammaan xogtii dib baa loo bilaabay.');
      setTimeout(() => setSnoozeMessage(null), 4000);
    }
  }, [activeSyncScope, currentUser, todayKey]);

  // Handle user sign out with complete zero-reset of personal logs
  const handleLogout = useCallback(() => {
    try {
      clearUserDataOnLogout();
      const freshDays = { [todayKey]: { ...createEmptyDay(), updatedAt: Date.now() } };
      const freshSettings = loadSettings('guest');
      const freshTodos = loadAllTodos('guest');
      setAllDays(freshDays);
      saveAllDays(freshDays, 'guest');
      setSettings(freshSettings);
      setCustomDuas(loadCustomDuas('guest'));
      setTodos(freshTodos);
      setCurrentUser(null);
      setUserProfile(null);
      setAccountActionAlert({
        message:
          'Waad ka baxday koontadaadii si nabad ah. Dhammaan xogtaadii hore waxay si sugan ugu xafidan tahay Cloud Database-ka.',
        type: 'logout',
      });
      setTimeout(() => {
        setAccountActionAlert(null);
      }, 4500);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  }, [todayKey]);

  return (
    <LanguageProvider
      externalLanguage={settings.language}
      onLanguageChange={(lang) => handleUpdateSettings({ language: lang })}
    >
      <div
        data-rn-breakpoint={rnDimensions.breakpoint}
        data-rn-device={rnDimensions.deviceType}
        data-app-theme={settings.appTheme || 'emerald'}
        data-arabic-scale={settings.arabicFontScale || 'normal'}
        className={`min-h-screen text-slate-100 flex flex-col selection:bg-teal-500/30 selection:text-teal-200 pb-safe ${
          settings.appTheme === 'oled'
            ? 'bg-black'
            : settings.appTheme === 'gold'
            ? 'bg-gradient-to-br from-[#120e05] via-[#171207] to-[#0a0803]'
            : 'bg-gradient-to-br from-[#051419] via-[#071c23] to-[#041014]'
        }`}
      >
      {/* Decorative ambient radial glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Spinning Tuko Logo Reload & Completion Overlay */}
      <TukoReloadOverlay phase={reloadPhase} onDismiss={() => setReloadPhase('hidden')} />

      {/* Top Header & Nav */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeDateKey={activeDateKey}
        onDateChange={setActiveDateKey}
        todayKey={todayKey}
        settings={settings}
        streakDays={streakStats.currentAllStreak}
        currentUser={currentUser}
        userProfile={userProfile}
        syncStatus={syncStatus}
        isReloading={reloadPhase !== 'hidden'}
        onManualSync={handleManualSync}
        onOpenClockAlarm={() => {
          setAdhanInitialSubTab('clock_alarm');
          setAdhanSubTabTrigger((prev) => prev + 1);
          setCurrentTab('alarm');
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenMobileInstall={() => setShowMobileInstall(true)}
        onOpenNotificationModal={() => setShowNotificationPrompt(true)}
        onOpenStreakModal={() => setShowStreakModal(true)}
        onOpenAllSectionsModal={() => setShowAllSectionsModal(true)}
        onOpenHelpModal={() => setShowHelpModal(true)}
        onOpenAdminDashboard={() => setShowAdminDashboard(true)}
      />

      {/* Tablet Left Rail & Desktop Pro Sidebar (Hidden on Mobile <768px) */}
      <DesktopSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAllSections={() => setShowAllSectionsModal(true)}
        settings={settings}
        streakDays={streakStats.currentAllStreak}
        todayPrayedCount={
          currentDayData.isExcusedDay
            ? 5
            : PRAYER_ORDER.filter((p) => {
                const st = currentDayData.salaah[p]?.status;
                return st === 'mosque' || st === 'home' || st === 'early_home' || st === 'excused';
              }).length
        }
        syncStatus={syncStatus}
        isReloading={reloadPhase !== 'hidden'}
        onManualSync={handleManualSync}
      />

      {/* Offline Mode & Network Connection Status Banner */}
      <OfflineBanner />

      {/* Floating App Update Banner (Appears when new build/features are deployed) */}
      {pendingAppUpdate && (
        <div className="mx-auto max-w-4xl px-3 sm:px-4 pt-2">
          <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg border border-teal-300/30 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black block truncate">
                  Cusboonaysiin cusub baa diyaar ah (v{pendingAppUpdate.latestVersion || '3.0.3'})!
                </span>
                <span className="text-[10px] text-teal-100 hidden sm:inline">
                  Taabo badhanka si aad isla markiiba u hesho dhammaan isbeddellada cusub.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => applyAppUpdate()}
                className="px-3 py-1.5 rounded-xl bg-white text-teal-950 font-black text-xs hover:bg-slate-100 transition shadow active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <span>Cusboonaysii Hadda</span>
                <span>⚡</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingAppUpdate(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Xir"
                title="Xir"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Interactive Stitch Sample Preview Mode (when active, replaces view safely) */}
      {isStitchSampleMode && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#16130c]">
          <StitchSamplePreview
            onExitSample={() => setIsStitchSampleMode(false)}
            dayData={currentDayData}
            prayerTimes={prayerTimes}
            settings={settings}
            streakDays={streakStats.currentAllStreak}
            onUpdateSettings={handleUpdateSettings}
            onUpdatePrayer={handleUpdatePrayer}
            onTriggerAdhaanOverlay={(prayer) => setActiveAdhaanOverlayPrayer(prayer)}
            onOpenOriginalTab={(tab) => setCurrentTab(tab as any)}
          />
        </div>
      )}

      {/* Broadcast Announcements from Admin */}
      {activeAnnouncements
        .filter((ann) => {
          if (dismissedAnnouncements.includes(ann.id)) return false;
          if (ann.targetAudience === 'male' && settings.gender !== 'male') return false;
          if (ann.targetAudience === 'female' && settings.gender !== 'female') return false;
          return true;
        })
        .map((ann) => {
          const typeClasses: Record<string, string> = {
            info: 'from-blue-950/95 via-slate-900 to-slate-950 border-blue-500/40 text-blue-200',
            jumco: 'from-emerald-950/95 via-teal-950 to-slate-950 border-emerald-500/40 text-emerald-200',
            ramadan: 'from-amber-950/95 via-slate-900 to-slate-950 border-amber-500/40 text-amber-200',
            alert: 'from-red-950/95 via-slate-900 to-slate-950 border-red-500/40 text-red-200',
            update: 'from-purple-950/95 via-slate-900 to-slate-950 border-purple-500/40 text-purple-200',
          };
          return (
            <div key={ann.id} className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-3">
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border bg-gradient-to-r shadow-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-3 ${
                  typeClasses[ann.type] || typeClasses.info
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {ann.type === 'jumco'
                        ? '🕌'
                        : ann.type === 'ramadan'
                        ? '🌙'
                        : ann.type === 'alert'
                        ? '⚠️'
                        : ann.type === 'update'
                        ? '✨'
                        : '📢'}
                    </span>
                    <h4 className="font-black text-sm text-white tracking-tight">{ann.title}</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{ann.content}</p>
                </div>
                <button
                  onClick={() => setDismissedAnnouncements((prev) => [...prev, ann.id])}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
                  title="Xir wargelintan"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

      {/* Account Action Notification Toast (Logout / Login restored) */}
      {accountActionAlert && (
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-4">
          <div className="p-4 sm:p-5 rounded-3xl font-medium text-xs sm:text-sm shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 border bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-slate-900 text-teal-100 border-emerald-400/50 shadow-emerald-950/50">
            <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
              <span className="text-2xl shrink-0 p-2 rounded-2xl bg-white/10 mt-0.5 shadow-inner">
                {accountActionAlert.type === 'logout' ? '✓' : '✨'}
              </span>
              <div className="space-y-1 min-w-0">
                <h4 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                  <span>
                    {accountActionAlert.type === 'logout'
                      ? 'Waad Ka Baxday Koontada (Log Out)'
                      : 'Ku Soo Dhowow Koontadaada (Log In)'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                    Guul ✓
                  </span>
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                  {accountActionAlert.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
              <button
                onClick={() => setAccountActionAlert(null)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
                title="Xir farriinta"
              >
                <span>✕ Xir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autoplay / Audio Permission Needed Banner */}
      {isAutoplayBlocked && (
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-3">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <div className="p-2 bg-slate-950/15 rounded-xl shrink-0">
                <Volume2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm">
                  Codka Aadaanka &amp; Alaarm-ka wuxuu u baahan yahay ogolaansho hal-taabasho ah!
                </p>
                <p className="text-[11px] font-semibold text-slate-900/80">
                  Biraawsarku wuxuu xannibaa codka ilaa aad shaashadda taabato. Taabo badhankan si aad u tijaabiso oo u shido:
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                audioAlerts.testAudioPlayback();
                setIsAutoplayBlocked(false);
              }}
              className="px-4 py-2 bg-slate-950 text-amber-300 hover:text-white rounded-xl font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition shrink-0 shadow-lg cursor-pointer"
            >
              Shid Codka (Enable Audio)
            </button>
          </div>
        </div>
      )}

      {showGenderModal && (
        <GenderModal
          onSelect={(gender) => {
            handleUpdateSettings({ gender });
            if (currentUser) {
              localStorage.setItem(`tuko_gender_confirmed_${currentUser.uid}`, gender);
              updateUserProfile(currentUser.uid, { gender }).catch(console.error);
              setUserProfile((prev) => (prev ? { ...prev, gender } : prev));
            }
            setShowGenderModal(false);
          }}
        />
      )}

      {/* Automatic New Day Notification Toast */}
      {newDayAlert && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-bold text-sm shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
            <span>{newDayAlert}</span>
            <button
              onClick={() => setNewDayAlert(null)}
              className="text-xs bg-slate-950/20 hover:bg-slate-950/40 px-2 py-1 rounded-lg transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Snooze and Prayer status message */}
      {snoozeMessage && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
            <span>{snoozeMessage}</span>
            <button
              onClick={() => setSnoozeMessage(null)}
              className="text-xs bg-slate-950/20 hover:bg-slate-950/40 px-2 py-1 rounded-lg transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Active Ringing Alarm Overlay */}
      {activeRingingAlarm && (
        <AlarmRingModal
          alarm={activeRingingAlarm}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
        />
      )}

      {/* Fullscreen Adhaan & Adhkaar Takeover Overlay (Chrome full window) */}
      {activeAdhaanOverlayPrayer && (
        <AdhkaarOverlay
          prayer={activeAdhaanOverlayPrayer}
          isOpen={true}
          isSisterMode={settings.gender === 'female'}
          adhanVoice={settings.prayerVoices?.[activeAdhaanOverlayPrayer] || settings.adhanVoice}
          onClose={() => {
            audioAlerts.silenceCurrentMinuteInNative();
            audioAlerts.stopAlarm();
            setActiveAdhaanOverlayPrayer(null);
          }}
          onMarkPrayed={handleMarkPrayed}
          onSnooze={handleSnooze}
          onComplete={() => {
            audioAlerts.silenceCurrentMinuteInNative();
            audioAlerts.stopAlarm();
            handleMarkPrayed(activeAdhaanOverlayPrayer, settings.gender === 'female' ? 'early_home' : 'mosque');
          }}
        />
      )}

      {/* Global Background Ambient Nature Sounds Mini-Player Bar */}
      <AmbientMiniPlayer
        currentTab={currentTab}
        onOpenAmbientTab={() => setCurrentTab('ambient')}
      />

      {/* Main Content Area (React Native ScrollView + Responsive Container for Mobile, Tablet & Laptop) */}
      <RNScrollView activeTabKey={currentTab}>
        {currentTab === 'salaad' && (
          <SalaadView
            dayData={currentDayData}
            prayerTimes={prayerTimes}
            activeDateKey={activeDateKey}
            todayKey={todayKey}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onUpdateDay={handleUpdateDay}
            onUpdatePrayer={handleUpdatePrayer}
            onBulkUpdate={handleBulkUpdate}
            onTriggerAdhaanOverlay={(prayer) => setActiveAdhaanOverlayPrayer(prayer)}
            streakDays={streakStats.currentAllStreak}
            bestStreakDays={streakStats.bestAllStreak}
            cityName={settings.cityName}
            onOpenTab={(tab) => setCurrentTab(tab)}
          />
        )}

        <Suspense
          fallback={
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3.5 text-teal-300/90">
              <TukoLogo className="w-12 h-12 shadow-lg" spinning={true} />
              <p className="text-xs font-bold tracking-wide text-amber-300">Waa la soo furayaa...</p>
            </div>
          }
        >
          {currentTab === 'adhan' && (
            <AdhanView
              settings={settings}
              prayerTimes={prayerTimes}
              onUpdateSettings={handleUpdateSettings}
              onTriggerAdhaanOverlay={(prayer) => setActiveAdhaanOverlayPrayer(prayer)}
              onOpenInstallApp={() => setShowMobileInstall(true)}
              cityName={settings.cityName}
              initialSubTab="prayers"
              subTabTrigger={adhanSubTabTrigger}
              sectionMode="adhan"
            />
          )}

          {currentTab === 'alarm' && (
            <AdhanView
              settings={settings}
              prayerTimes={prayerTimes}
              onUpdateSettings={handleUpdateSettings}
              onTriggerAdhaanOverlay={(prayer) => setActiveAdhaanOverlayPrayer(prayer)}
              onOpenInstallApp={() => setShowMobileInstall(true)}
              cityName={settings.cityName}
              initialSubTab="clock_alarm"
              subTabTrigger={adhanSubTabTrigger}
              sectionMode="alarm"
            />
          )}

          {currentTab === 'todo' && (
            <ToDoView
              key={currentUser?.uid || 'guest'}
              todos={todos}
              onUpdateTodos={handleUpdateTodos}
              onNotify={(msg) => {
                setNewDayAlert(msg);
                setTimeout(() => setNewDayAlert(null), 4000);
              }}
            />
          )}

          {currentTab === 'adhkaar' && (
            <AdhkaarView
              dayData={currentDayData}
              prayerTimes={prayerTimes}
              customDuas={customDuas}
              onToggleAdhkar={handleToggleAdhkar}
              onToggleCustomDua={handleToggleCustomDua}
              onAddCustomDua={handleAddCustomDua}
              onEditCustomDua={handleEditCustomDua}
              onDeleteCustomDua={handleDeleteCustomDua}
              onMarkAllRead={handleMarkAllRead}
              onClearAll={handleClearAllAdhkar}
            />
          )}

          {currentTab === 'qibla' && <QiblaView settings={settings} />}

          {currentTab === 'tasbeeh' && (
            <TasbeehView dayData={currentDayData} onUpdateTasbeeh={handleUpdateTasbeeh} />
          )}

          {currentTab === 'ambient' && (
            <AmbientSoundsView onNavigateTab={(t) => setCurrentTab(t)} />
          )}

          {currentTab === 'soon' && (
            <SoonView
              dayData={currentDayData}
              allDays={allDays}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              prayerTimes={prayerTimes}
              activeDateKey={activeDateKey}
              onToggleSoon={handleToggleSoon}
            />
          )}

          {currentTab === 'quran' && (
            <QuranView
              dayData={currentDayData}
              allDays={allDays}
              activeDateKey={activeDateKey}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onUpdateQuran={handleUpdateQuran}
              onDeductPages={handleDeductQuranPages}
              onToggleSurah={handleToggleQuranSurah}
              onSetSurahs={handleSetQuranSurahs}
              onApplyUserQuranJourney={
                currentUser?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
                  ? handleApplyUserQuranJourney
                  : undefined
              }
              onOpenReaderModal={(surahNum) =>
                setQuranReaderState({ isOpen: true, surahNumber: surahNum })
              }
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarView
              allDays={allDays}
              activeDateKey={activeDateKey}
              todayKey={todayKey}
              settings={settings}
              onSelectDate={setActiveDateKey}
              onNavigateToSalaad={(dateKey) => {
                setActiveDateKey(dateKey);
                setCurrentTab('salaad');
              }}
            />
          )}

          {currentTab === 'stats' && (
            <StatsView
              allDays={allDays}
              settings={settings}
              streakDays={streakStats.currentAllStreak}
              bestStreakDays={streakStats.bestAllStreak}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onDataImported={() => {
                const importedDays = loadAllDays(currentUser?.uid);
                const importedDuas = loadCustomDuas(currentUser?.uid);
                const importedSettings = loadSettings(currentUser?.uid);
                const importedTodos = loadAllTodos(currentUser?.uid);
                setAllDays(importedDays);
                setCustomDuas(importedDuas);
                setSettings(importedSettings);
                setTodos(importedTodos);
                pushSyncToServer({
                  scope: activeSyncScope,
                  isExplicitAction: true,
                  days: importedDays,
                  settings: importedSettings,
                  customDuas: importedDuas,
                  todos: importedTodos,
                });
                if (currentUser) {
                  saveSettingsToFirestore(currentUser.uid, importedSettings).catch(console.error);
                  saveTodosToFirestore(currentUser.uid, importedTodos).catch(console.error);
                  saveCustomDuasToFirestore(currentUser.uid, importedDuas).catch(console.error);
                  Object.entries(importedDays).forEach(([dKey, dVal]) => {
                    saveDayToFirestore(currentUser.uid, dKey, dVal).catch(console.error);
                  });
                }
              }}
              onResetAllData={handleResetAllData}
              currentUser={currentUser}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onOpenAdminDashboard={() => setShowAdminDashboard(true)}
            />
          )}
        </Suspense>
      </RNScrollView>

      {/* Cloud Authentication & Database Sync Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        currentGender={settings.gender}
        onGenderChange={(gender) => {
          handleUpdateSettings({ gender, genderConfirmed: true });
          if (currentUser) {
            localStorage.setItem(`tuko_gender_confirmed_${currentUser.uid}`, gender);
          }
        }}
        isFirstVisitPrompt={false}
        onSkipFirstVisit={() => setShowAuthModal(false)}
        onLoginSuccess={(user, profile, selectedGender, isNewRegistration) => {
          handleDismissFirstVisit();
          if (profile) setUserProfile(profile);
          if (isNewRegistration && selectedGender) {
            localStorage.setItem(`tuko_gender_confirmed_${user.uid}`, selectedGender);
          }
          restoreAndSyncUserAccount(user, { isNewRegistration, selectedGender });
        }}
        onLogoutSuccess={() => {
          handleLogout();
        }}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        totalDaysSynced={Object.keys(allDays).length}
      />

      {/* Mobile App & QR Code Modal (Mounted at root level for flawless mobile responsiveness) */}
      <MobileInstallModal
        isOpen={showMobileInstall}
        onClose={() => setShowMobileInstall(false)}
      />

      {/* Adhan & Notification Prompt Modal */}
      <NotificationPromptModal
        isOpen={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
        prayerTimes={prayerTimes}
        settings={settings}
        onUpdateVoice={(voice) => handleUpdateSettings({ adhanVoice: voice })}
        onOpenOverlay={(prayer) => setActiveAdhaanOverlayPrayer(prayer)}
      />

      {/* Streak Info & Starting Streak Setup Modal */}
      <StreakInfoModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakDays={streakStats.currentAllStreak}
        bestStreakDays={streakStats.bestAllStreak}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* All 11 Sections Modal (Universal Menu for Mobile, Tablet, & Laptop) */}
      <AllSectionsModal
        isOpen={showAllSectionsModal}
        onClose={() => setShowAllSectionsModal(false)}
        currentTab={currentTab}
        onSelectTab={(tabId) => setCurrentTab(tabId)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        currentUserEmail={currentUser?.email}
        favoriteIds={favoriteSectionIds}
        onUpdateFavorites={handleUpdateFavorites}
      />

      {/* In-App Help & How-To Guide Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onOpenMobileInstall={() => setShowMobileInstall(true)}
        onOpenNotificationModal={() => setShowNotificationPrompt(true)}
      />

      {/* Admin Dashboard Console */}
      {showAdminDashboard && (
        <AdminDashboardView
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}

      {/* First-Time Visitor Friendly Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onComplete={handleCompleteOnboarding}
        onOpenAuth={() => setShowAuthModal(true)}
        currentCityId={settings.cityId}
        currentGender={settings.gender}
      />

      {/* Global Quran Reader & Floating Background Audio Mini-Player */}
      <QuranReaderModal
        isOpen={quranReaderState.isOpen}
        initialSurahNumber={quranReaderState.surahNumber}
        onClose={() => setQuranReaderState((prev) => ({ ...prev, isOpen: false }))}
        onReopen={() => setQuranReaderState((prev) => ({ ...prev, isOpen: true }))}
        arabicFontScale={settings.arabicFontScale}
        onAddPagesRead={(pages) => {
          const cur = Number(currentDayData.quran) || 0;
          handleUpdateQuran(cur + pages);
        }}
      />

      {/* Mobile Touch Bottom Navigation Bar (Dynamic 5-Tab Bar based on user-pinned sections) */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tabId) => setCurrentTab(tabId)}
        onOpenAllSections={() => setShowAllSectionsModal(true)}
        favoriteIds={favoriteSectionIds}
        isAllSectionsOpen={showAllSectionsModal}
      />
      </div>
    </LanguageProvider>
  );
}
