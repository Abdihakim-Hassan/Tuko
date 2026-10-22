/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Volume2 } from 'lucide-react';
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
import { audioAlerts, sendBrowserNotification } from './utils/audioAlerts';
import { logEvent } from './utils/firebase';

// Lazy-load secondary tabs so initial boot & reload are instantaneous (<150ms)
const AdhanView = lazy(() => import('./components/AdhanView').then((m) => ({ default: m.AdhanView })));
const AdhkaarView = lazy(() => import('./components/AdhkaarView').then((m) => ({ default: m.AdhkaarView })));
const QiblaView = lazy(() => import('./components/QiblaView').then((m) => ({ default: m.QiblaView })));
const TasbeehView = lazy(() => import('./components/TasbeehView').then((m) => ({ default: m.TasbeehView })));
const SoonView = lazy(() => import('./components/SoonView').then((m) => ({ default: m.SoonView })));
const QuranView = lazy(() => import('./components/QuranView').then((m) => ({ default: m.QuranView })));
const CalendarView = lazy(() => import('./components/CalendarView').then((m) => ({ default: m.CalendarView })));
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));
const ToDoView = lazy(() => import('./components/ToDoView').then((m) => ({ default: m.ToDoView })));
import { AppSettings, AppUserProfile, CustomAlarm, CustomDua, DayData, PrayerName, SalaahRecord, SalaahStatus, TodoItem } from './types';
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
  updateUserProfile,
} from './utils/firebase';
import {
  pushSyncToServer,
  fetchSyncFromServer,
  subscribeCrossDeviceSync,
  CrossDeviceSyncState,
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
  const [reloadPhase, setReloadPhase] = useState<'spinning' | 'finishing' | 'hidden'>('spinning');
  const reloadTimersRef = useRef<{ finish?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({});

  const triggerReloadVisual = useCallback(() => {
    if (reloadTimersRef.current.finish) clearTimeout(reloadTimersRef.current.finish);
    if (reloadTimersRef.current.hide) clearTimeout(reloadTimersRef.current.hide);
    setReloadPhase('spinning');
    reloadTimersRef.current.finish = setTimeout(() => {
      setReloadPhase('finishing');
    }, 520);
    reloadTimersRef.current.hide = setTimeout(() => {
      setReloadPhase('hidden');
    }, 800);
  }, []);

  useEffect(() => {
    triggerReloadVisual();
    return () => {
      if (reloadTimersRef.current.finish) clearTimeout(reloadTimersRef.current.finish);
      if (reloadTimersRef.current.hide) clearTimeout(reloadTimersRef.current.hide);
    };
  }, [triggerReloadVisual]);

  const [newDayAlert, setNewDayAlert] = useState<string | null>(null);
  const [accountActionAlert, setAccountActionAlert] = useState<{
    message: string;
    type: 'success' | 'logout';
  } | null>(null);

  // Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showMobileInstall, setShowMobileInstall] = useState<boolean>(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(false);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [showAllSectionsModal, setShowAllSectionsModal] = useState<boolean>(false);
  const [showVideoTourModal, setShowVideoTourModal] = useState<boolean>(false);
  const [isFirstVisitPrompt, setIsFirstVisitPrompt] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('tuko_onboarding_completed');
    } catch {
      return false;
    }
  });

  // Prompt onboarding for first-time visitors after brief delay
  useEffect(() => {
    if (isFirstVisitPrompt && !currentUser) {
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisitPrompt, currentUser]);

  // Prompt notification permission when user enters the app if not yet enabled
  useEffect(() => {
    const checkNotificationOnEntry = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const hasSeenPrompt = sessionStorage.getItem('tuko_notif_prompt_seen');
          if (!hasSeenPrompt && !isFirstVisitPrompt) {
            const timer = setTimeout(() => {
              setShowNotificationPrompt(true);
              sessionStorage.setItem('tuko_notif_prompt_seen', 'true');
            }, 1200);
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
  }, [isFirstVisitPrompt]);

  const handleDismissFirstVisit = useCallback(() => {
    try {
      localStorage.setItem('tuko_onboarding_completed', 'true');
    } catch (e) {
      console.error(e);
    }
    setIsFirstVisitPrompt(false);
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

  const activeSyncScope = useMemo(() => {
    if (currentUser) {
      const isAdmin = currentUser.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      return isAdmin ? 'default_shared' : `user_${currentUser.uid}`;
    }
    try {
      if (localStorage.getItem('tuko_logged_out') === 'true') {
        return 'guest_logged_out';
      }
    } catch {}
    return 'default_shared';
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
            const remoteTs = Number(rDay.updatedAt) || 0;
            const localTs = Number(localDay?.updatedAt) || 0;

            if (!localDay || remoteTs >= localTs) {
              if (JSON.stringify(localDay) !== JSON.stringify(rDay)) {
                merged[dKey] = rDay;
                changed = true;
              }
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
            const nextSettings: AppSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...remoteSettings,
              useCustomSchedule: true,
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

  // Manual 1-tap Sync Trigger in Header
  const handleManualSync = useCallback(async () => {
    triggerReloadVisual();
    setSyncStatus('syncing');
    const remote = await fetchSyncFromServer(activeSyncScope);
    if (remote && (Object.keys(remote.days || {}).length > 0 || remote.settings)) {
      applyRemoteSyncState(remote, false);
    } else {
      await pushSyncToServer({
        scope: activeSyncScope,
        isExplicitAction: true,
        days: allDays,
        settings,
        todos,
        customDuas,
      });
    }
    setSyncStatus('connected');
    setSnoozeMessage('🔄 Mobile & Tablet si toos ah ayaa la isugu waafajiyay (Live Synced)!');
    setTimeout(() => setSnoozeMessage(null), 3500);
  }, [activeSyncScope, allDays, applyRemoteSyncState, customDuas, settings, todos, triggerReloadVisual]);

  // Real-Time Firestore onSnapshot Listeners when signed in (deferred 800ms after boot so reload is instant)
  useEffect(() => {
    if (!currentUser) return;
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
              const cloudTs = Number(cDay.updatedAt) || 0;
              const localTs = Number(localDay?.updatedAt) || 0;
              if (!localDay || cloudTs > localTs) {
                if (JSON.stringify(localDay) !== JSON.stringify(cDay)) {
                  merged[dKey] = cDay;
                  changed = true;
                }
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
          const cloudTs = Number((cloudSettings as any)?.updatedAtMs || cloudSettings.updatedAt) || 0;
          const localTs = Number(prev.updatedAt) || 0;
          if (cloudTs > localTs) {
            const merged: AppSettings = {
              ...DEFAULT_SETTINGS,
              ...prev,
              ...cloudSettings,
              useCustomSchedule: true,
              customSchedule: {
                ...DEFAULT_USER_PRAYER_SCHEDULE,
                ...(prev.customSchedule || {}),
                ...(cloudSettings.customSchedule || {}),
              },
              updatedAt: cloudTs,
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

  // Firebase Auth state listener — 0ms instant local hydration + non-blocking background Cloud Sync
  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }

      if (user) {
        try {
          localStorage.removeItem('tuko_logged_out');
        } catch {}

        // 1. Immediately hydrate from user-scoped localStorage in 0ms so reload never waits on network
        setActiveStorageUser(user.uid);
        const cachedDays = loadAllDays(user.uid);
        const cachedSettings = loadSettings(user.uid);
        const cachedTodos = loadAllTodos(user.uid);
        const cachedDuas = loadCustomDuas(user.uid);

        if (Object.keys(cachedDays).length > 0) {
          setAllDays(cachedDays);
        }
        setSettings(cachedSettings);
        setTodos(cachedTodos);
        setCustomDuas(cachedDuas);

        const isAdminAccount =
          user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const userScope = isAdminAccount ? 'default_shared' : `user_${user.uid}`;

        // 2. Defer network Firestore sync by 450ms so initial page render & reload are 100% lag-free
        syncTimer = setTimeout(async () => {
          let syncedProfile: AppUserProfile | null = null;
          try {
            syncedProfile = await syncUserProfile(user);
            setUserProfile(syncedProfile);
          } catch (err) {
            console.error('Error syncing profile:', err);
          }

          try {
            const [cloudDays, cloudSettings, cloudTodos, cloudDuas] = await Promise.all([
              loadUserDaysFromFirestore(user.uid),
              loadUserSettingsFromFirestore(user.uid),
              loadUserTodosFromFirestore(user.uid),
              loadUserCustomDuasFromFirestore(user.uid),
            ]);

            if (cloudTodos !== null) {
              setTodos(cloudTodos);
              saveAllTodos(cloudTodos, user.uid);
            } else {
              const localUserTodos = loadAllTodos(user.uid);
              saveTodosToFirestore(user.uid, localUserTodos).catch(() => {});
            }

            if (cloudDuas !== null) {
              setCustomDuas(cloudDuas);
              saveCustomDuas(cloudDuas, user.uid);
            }

            const welcomeSessionKey = `tuko_welcomed_session_${user.uid}`;
            const alreadyWelcomedThisSession = (() => {
              try {
                return sessionStorage.getItem(welcomeSessionKey) === 'true';
              } catch {
                return true;
              }
            })();

            if (cloudDays && Object.keys(cloudDays).length > 0) {
              setAllDays((prev) => {
                const merged = { ...prev, ...cloudDays };
                saveAllDays(merged, user.uid);
                return merged;
              });
              if (!alreadyWelcomedThisSession) {
                try {
                  sessionStorage.setItem(welcomeSessionKey, 'true');
                } catch {}
                setAccountActionAlert({
                  message: `Ku soo dhowow koontadaada gaarka ah, ${user.displayName || 'Cibaadeyste'}! Dhammaan xogtaadii hore si buuxda ayaa Cloud-ka lagaga soo celiyay.`,
                  type: 'success',
                });
              }
            } else if (isAdminAccount) {
              const adminDays = applyUserRequestedQuranConfig(
                loadAllDays(user.uid),
                getTodayKey()
              );
              setAllDays(adminDays);
              saveAllDays(adminDays, user.uid);
              pushSyncToServer({ scope: userScope, days: adminDays });
              Object.entries(adminDays).forEach(([dKey, dVal]) => {
                saveDayToFirestore(user.uid, dKey, dVal).catch(() => {});
              });
            } else if (Object.keys(cachedDays).length === 0) {
              const currentToday = getTodayKey();
              const zeroDay = { ...createEmptyDay(), updatedAt: Date.now() };
              const freshDays: Record<string, DayData> = { [currentToday]: zeroDay };
              setAllDays(freshDays);
              saveAllDays(freshDays, user.uid);
              saveDayToFirestore(user.uid, currentToday, zeroDay).catch(() => {});
              if (!alreadyWelcomedThisSession) {
                try {
                  sessionStorage.setItem(welcomeSessionKey, 'true');
                } catch {}
                setAccountActionAlert({
                  message: `Ku soo dhowow Tuko, ${user.displayName || 'Cibaadeyste'}! Koontadaada cusub waxay si nadiif ah uga bilaabatay 0 (Eber / Fresh Start).`,
                  type: 'success',
                });
              }
            }

            const localConfirmedGender = localStorage.getItem(
              `tuko_gender_confirmed_${user.uid}`
            ) as 'male' | 'female' | null;
            const resolvedGender =
              localConfirmedGender || syncedProfile?.gender || cloudSettings?.gender;

            if (cloudSettings) {
              const cloudTs =
                Number((cloudSettings as any)?.updatedAtMs || cloudSettings.updatedAt) || 0;
              const merged: AppSettings = {
                ...DEFAULT_SETTINGS,
                ...cloudSettings,
                gender: resolvedGender || 'male',
                genderConfirmed: !!resolvedGender || !!cloudSettings.genderConfirmed,
                startingStreakOffset: cloudSettings.startingStreakOffset ?? 0,
                useCustomSchedule: true,
                customSchedule: {
                  ...DEFAULT_USER_PRAYER_SCHEDULE,
                  ...(cloudSettings.customSchedule || {}),
                },
                alarms: Array.isArray(cloudSettings.alarms) ? cloudSettings.alarms : DEFAULT_ALARMS,
                updatedAt: cloudTs,
              };
              setSettings(merged);
              saveSettings(merged, user.uid);
              if (!resolvedGender && !cloudSettings.genderConfirmed) {
                setShowGenderModal(true);
              }
            } else {
              const freshUserSettings: AppSettings = {
                ...DEFAULT_SETTINGS,
                gender: resolvedGender || 'male',
                genderConfirmed: !!resolvedGender,
                startingStreakOffset: 0,
                useCustomSchedule: true,
                customSchedule: { ...DEFAULT_USER_PRAYER_SCHEDULE },
                alarms: DEFAULT_ALARMS,
                updatedAt: Date.now(),
              };
              setSettings(freshUserSettings);
              saveSettings(freshUserSettings, user.uid);
              saveSettingsToFirestore(user.uid, freshUserSettings).catch(() => {});
              if (!resolvedGender) {
                setShowGenderModal(true);
              }
            }
          } catch (err) {
            console.error('Error synchronizing with Firestore:', err);
          }
        }, 450);
      } else {
        setActiveStorageUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      unsubscribe();
    };
  }, []);

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

  // Check for Adhaan time & Custom Alarms periodically with sleep recovery and visibility detection
  useEffect(() => {
    const checkScheduleAndAlarms = () => {
      const now = new Date();
      const currentDecimalHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const currentDayOfWeek = now.getDay();

      // ALWAYS calculate today's resolved prayer times using the actual current moment
      const todayResolvedPrayers = getResolvedPrayerTimes(settings, now);

      // 1. Check Prayer Adhans (0 to 5 minute tolerance window for sleep/background throttle)
      PRAYER_ORDER.forEach((p) => {
        const prayerDecimalHour = todayResolvedPrayers[p];
        if (prayerDecimalHour != null) {
          const diffInMinutes = (currentDecimalHour - prayerDecimalHour) * 60;
          const notificationKey = `${todayKey}_${p}`;
          
          // Debugging
          if (diffInMinutes >= -1 && diffInMinutes < 5.0) {
              console.log(`Checking prayer ${p}: now=${currentDecimalHour}, prayer=${prayerDecimalHour}, diff=${diffInMinutes}, notified=${notifiedPrayersRef.current[notificationKey]}`);
          }

          if (diffInMinutes >= 0 && diffInMinutes < 5.0 && !notifiedPrayersRef.current[notificationKey]) {
            console.log(`Triggering prayer ${p}!`);
            notifiedPrayersRef.current[notificationKey] = true;

            // 1. Play authentic Adhan sound for this prayer's chosen voice (enabled by default)
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

            // 3. Open takeover overlay
            setActiveAdhaanOverlayPrayer(p);
          }
        }
      });

      // 2. Check Custom Alarms with smart sleep recovery window
      const userAlarms = Array.isArray(settings.alarms) ? settings.alarms : DEFAULT_ALARMS;
      const currentTotalMin = now.getHours() * 60 + now.getMinutes();

      userAlarms.forEach((alarm) => {
        if (!alarm.enabled || !alarm.time) return;

        const matchesDay = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDayOfWeek);
        if (!matchesDay) return;

        const [aH, aM] = alarm.time.split(':').map(Number);
        if (!Number.isFinite(aH) || !Number.isFinite(aM)) return;
        const alarmTotalMin = aH * 60 + aM;
        const diffAlarmMin = currentTotalMin - alarmTotalMin;

        // If alarm was created/edited AFTER today's alarm minute already passed (diffAlarmMin > 0),
        // it is meant for tomorrow, not a missed sleep alarm from earlier today!
        const alarmTodayEpoch = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          aH,
          aM,
          59,
          999
        ).getTime();
        const wasCreatedAfterAlarmTimeToday =
          diffAlarmMin > 0 && Number(alarm.createdAt) > alarmTodayEpoch;

        if (diffAlarmMin >= 0 && diffAlarmMin < 5 && !wasCreatedAfterAlarmTimeToday) {
          const alarmKey = `${todayKey}_alarm_${alarm.id}_${alarm.time}_${alarm.createdAt || 0}`;
          if (!notifiedAlarmsRef.current[alarmKey]) {
            notifiedAlarmsRef.current[alarmKey] = true;

            // Start playing alarm audio immediately
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

        if (diffTodoMin === 0) {
          const todoKey = `${todayKey}_todo_${todo.id}_${todo.dueTime}`;
          if (!notifiedAlarmsRef.current[todoKey]) {
            notifiedAlarmsRef.current[todoKey] = true;
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

    // Run initial check immediately
    checkScheduleAndAlarms();

    const interval = setInterval(checkScheduleAndAlarms, 2000);

    // Re-check immediately when screen wakes or tab becomes visible
    const handleWakeOrFocus = () => {
      audioAlerts.unlockAudio();
      checkScheduleAndAlarms();
    };

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
    };
  }, [todayKey, settings, todos]);

  // Snooze handler for Adhan
  const handleSnooze = useCallback((minutes: number, prayer: PrayerName) => {
    setActiveAdhaanOverlayPrayer(null);
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
    audioAlerts.stopAlarm();
  }, []);

  const handleSnoozeAlarm = useCallback((minutes = 5) => {
    const alarmToSnooze = activeRingingAlarm;
    setActiveRingingAlarm(null);
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
  const handleResetAllData = useCallback(() => {
    if (
      window.confirm(
        'DIGNIIN: Ma hubtaa inaad tirtirto dhammaan xogta salaadaha, diiwaanka, iyo ducooyinka? Tallaabadan dib looma celin karo.'
      )
    ) {
      localStorage.clear();
      const emptyDays = { [todayKey]: { ...createEmptyDay(), updatedAt: Date.now() } };
      const freshDuas = loadCustomDuas();
      const freshSettings = { ...loadSettings(), updatedAt: Date.now() };
      const freshTodos = INITIAL_TODOS.map((t) => ({ ...t, completed: false }));
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
      setSnoozeMessage('🗑️ Dhammaan xogtii dib baa loo bilaabay.');
      setTimeout(() => setSnoozeMessage(null), 4000);
    }
  }, [activeSyncScope, todayKey]);

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
        className="min-h-screen bg-gradient-to-br from-[#051419] via-[#071c23] to-[#041014] text-slate-100 flex flex-col selection:bg-teal-500/30 selection:text-teal-200 pb-safe"
      >
      {/* Decorative ambient radial glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Spinning Tuko Logo Reload & Completion Overlay */}
      <TukoReloadOverlay phase={reloadPhase} />

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
          setCurrentTab('adhan');
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenMobileInstall={() => setShowMobileInstall(true)}
        onOpenNotificationModal={() => setShowNotificationPrompt(true)}
        onOpenStreakModal={() => setShowStreakModal(true)}
        onOpenAllSectionsModal={() => setShowAllSectionsModal(true)}
      />

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
          onClose={() => setActiveAdhaanOverlayPrayer(null)}
          onMarkPrayed={handleMarkPrayed}
          onSnooze={handleSnooze}
          onComplete={() => {
            handleMarkPrayed(activeAdhaanOverlayPrayer, settings.gender === 'female' ? 'early_home' : 'mosque');
          }}
        />
      )}

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
              cityName={settings.cityName}
              initialSubTab={adhanInitialSubTab}
              subTabTrigger={adhanSubTabTrigger}
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
                setAllDays(importedDays);
                setCustomDuas(importedDuas);
                setSettings(importedSettings);
                pushSyncToServer({
                  scope: activeSyncScope,
                  isExplicitAction: true,
                  days: importedDays,
                  settings: importedSettings,
                  customDuas: importedDuas,
                });
              }}
              onResetAllData={handleResetAllData}
              currentUser={currentUser}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}
        </Suspense>
      </RNScrollView>

      {/* Cloud Authentication & Database Sync Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          if (isFirstVisitPrompt) {
            handleDismissFirstVisit();
          } else {
            setShowAuthModal(false);
          }
        }}
        currentUser={currentUser}
        userProfile={userProfile}
        currentGender={settings.gender}
        onGenderChange={(gender) => {
          handleUpdateSettings({ gender, genderConfirmed: true });
          if (currentUser) {
            localStorage.setItem(`tuko_gender_confirmed_${currentUser.uid}`, gender);
          }
        }}
        isFirstVisitPrompt={isFirstVisitPrompt && !currentUser}
        onSkipFirstVisit={handleDismissFirstVisit}
        onLoginSuccess={(user, profile, selectedGender, isNewRegistration) => {
          handleDismissFirstVisit();
          setActiveStorageUser(user.uid);
          setCurrentUser(user);
          if (profile) setUserProfile(profile);
          if (selectedGender) {
            localStorage.setItem(`tuko_gender_confirmed_${user.uid}`, selectedGender);
          }
          const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
          const newScope = isAdmin ? 'default_shared' : `user_${user.uid}`;

          if (isNewRegistration) {
            const zeroDay = { ...createEmptyDay(), updatedAt: Date.now() };
            const freshDays = { [todayKey]: zeroDay };
            setAllDays(freshDays);
            saveAllDays(freshDays, user.uid);
            saveDayToFirestore(user.uid, todayKey, zeroDay).catch(console.error);

            const freshSettings: AppSettings = {
              ...DEFAULT_SETTINGS,
              gender: selectedGender || 'male',
              genderConfirmed: true,
              startingStreakOffset: 0,
              useCustomSchedule: true,
              customSchedule: { ...DEFAULT_USER_PRAYER_SCHEDULE },
              updatedAt: Date.now(),
            };
            setSettings(freshSettings);
            saveSettings(freshSettings, user.uid);
            saveSettingsToFirestore(user.uid, freshSettings).catch(console.error);

            pushSyncToServer({
              scope: newScope,
              resetAll: true,
              isExplicitAction: true,
              days: freshDays,
              settings: freshSettings,
            });

            if (selectedGender) {
              updateUserProfile(user.uid, { gender: selectedGender }).catch(console.error);
            }
          } else if (selectedGender) {
            handleUpdateSettings({ gender: selectedGender, genderConfirmed: true });
          }
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
      />

      {/* Footer */}
      <footer className="w-full border-t border-teal-500/10 py-6 text-center text-xs text-slate-400 relative z-10 backdrop-blur-md">
        <p>
          Tuko – Dhawr-Salaad &amp; Adkaar •{' '}
          {currentUser
            ? `Ku xiran koontada: ${currentUser.email} (Firebase Cloud Database)`
            : 'Xogtaadu waxay si sugan ugu kaydsantahay qalabkaaga iyo Cloud Database-ka'}
        </p>
      </footer>
      </div>
    </LanguageProvider>
  );
}
