import { AppSettings, CustomDua, DayData, PrayerName, SalaahStatus, TodoItem } from '../types';
import { INITIAL_CUSTOM_DUAS } from './defaultAdhkar';
import { DEFAULT_SETTINGS, DEFAULT_USER_PRAYER_SCHEDULE } from './somaliaCities';
import { getTodayKey } from './prayerTimes';

const STORAGE_DAYS_KEY = 'salaad_soomaali_days_v3';
const STORAGE_SETTINGS_KEY = 'salaad_soomaali_settings_v3';
const STORAGE_CUSTOM_DUAS_KEY = 'salaad_soomaali_custom_duas_v3';
const STORAGE_TODOS_KEY = 'salaad_soomaali_todos_v3';
const ACTIVE_USER_UID_KEY = 'tuko_active_user_uid';
const SAVED_AUTH_USER_KEY = 'tuko_persisted_auth_user_v1';

export interface PersistedAuthUserSnapshot {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function savePersistedAuthUser(
  user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  } | null
): void {
  try {
    if (!user || !user.uid) {
      localStorage.removeItem(SAVED_AUTH_USER_KEY);
      return;
    }
    const snapshot: PersistedAuthUserSnapshot = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
    };
    localStorage.setItem(SAVED_AUTH_USER_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error('Error saving persisted auth user:', err);
  }
}

export function loadPersistedAuthUser(): PersistedAuthUserSnapshot | null {
  try {
    if (localStorage.getItem('tuko_logged_out') === 'true') return null;
    const raw = localStorage.getItem(SAVED_AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.uid === 'string' && parsed.uid.trim() && parsed.uid !== 'guest') {
      return parsed as PersistedAuthUserSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

let currentStorageUid: string = (() => {
  try {
    const persistedUser = loadPersistedAuthUser();
    if (persistedUser?.uid) return persistedUser.uid;
    return localStorage.getItem(ACTIVE_USER_UID_KEY) || 'guest';
  } catch {
    return 'guest';
  }
})();

export function setActiveStorageUser(uid: string | null): void {
  const nextUid = uid && uid.trim() ? uid.trim() : 'guest';
  currentStorageUid = nextUid;
  try {
    localStorage.setItem(ACTIVE_USER_UID_KEY, nextUid);
  } catch (err) {
    console.error('Error setting active storage user:', err);
  }
}

export function getActiveStorageUser(): string {
  return currentStorageUid;
}

function getScopedKey(baseKey: string, explicitUid?: string): string {
  const scope = explicitUid || currentStorageUid || 'guest';
  return `${baseKey}_${scope}`;
}

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo-kahf',
    task: 'Akhrinta Suuratul Kahf (Jumcaha)',
    completed: false,
    priority: 'high',
    category: 'diini',
    details: 'Waa sunno weyn oo iftiin kuu noqota inta u dhaxeysa labada Jimco.',
    dueDate: getTodayKey(),
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'todo-salawat',
    task: '100 Salawaat ku sali Nabiga Muxammad ﷺ',
    completed: false,
    priority: 'high',
    category: 'diini',
    details: 'Allaahumma salli calaa Muxammad wa calaa aali Muxammad.',
    dueDate: getTodayKey(),
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'todo-wardi',
    task: 'Adhkaarta & Wardiga Subaxa & Galabta',
    completed: false,
    priority: 'medium',
    category: 'diini',
    details: 'Xasilloonida qalbiyada iyo ilaalinta Alle.',
    dueDate: getTodayKey(),
    createdAt: Date.now() - 10800000,
  },
  {
    id: 'todo-family',
    task: 'Wicitaan & Salaan Waalidiinta ama Qaraabada',
    completed: false,
    priority: 'medium',
    category: 'guriga',
    details: 'Xiriirinta qaraabada (Silatul Raxim) waxay kordhisaa risiqa iyo cimriga barakeysan.',
    dueDate: getTodayKey(),
    createdAt: Date.now() - 14400000,
  },
];

export function loadAllTodos(explicitUid?: string): TodoItem[] {
  try {
    const raw = localStorage.getItem(getScopedKey(STORAGE_TODOS_KEY, explicitUid));
    if (!raw) return INITIAL_TODOS.map((item) => ({ ...item, completed: false }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_TODOS.map((item) => ({ ...item, completed: false }));
  } catch (err) {
    console.error('Error loading todos:', err);
    return INITIAL_TODOS.map((item) => ({ ...item, completed: false }));
  }
}

export function saveAllTodos(todos: TodoItem[], explicitUid?: string): void {
  try {
    localStorage.setItem(getScopedKey(STORAGE_TODOS_KEY, explicitUid), JSON.stringify(todos));
  } catch (err) {
    console.error('Error saving todos:', err);
  }
}

export function createEmptyDay(): DayData {
  const defaultSalaah = (['Fajr', 'Sunrise', 'Duhur', 'Casar', 'Maqrib', 'Cishe'] as PrayerName[]).reduce(
    (acc, prayer) => {
      acc[prayer] = { status: 'none', reason: '' };
      return acc;
    },
    {} as Record<PrayerName, { status: SalaahStatus; reason?: string; reasonSavedAt?: number }>
  );

  return {
    salaah: defaultSalaah,
    adhkar: {},
    customDuasCompleted: {},
    quran: 0,
    quranSurahs: [],
    soon: false,
    tasbeehCount: 0,
    fridayKahfRead: false,
    fridaySalawatCount: 0,
    isExcusedDay: false,
  };
}

export function loadAllDays(explicitUid?: string): Record<string, DayData> {
  try {
    const raw = localStorage.getItem(getScopedKey(STORAGE_DAYS_KEY, explicitUid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    console.error('Error loading days from storage:', err);
    return {};
  }
}

export function saveAllDays(days: Record<string, DayData>, explicitUid?: string): void {
  try {
    localStorage.setItem(getScopedKey(STORAGE_DAYS_KEY, explicitUid), JSON.stringify(days));
  } catch (err) {
    console.error('Error saving days to storage:', err);
  }
}

export function getDayData(dateKey: string, allDays: Record<string, DayData>): DayData {
  if (allDays[dateKey]) {
    const existing = allDays[dateKey];
    // Ensure all properties exist
    if (!existing.salaah) existing.salaah = createEmptyDay().salaah;
    if (!existing.adhkar) existing.adhkar = {};
    if (!existing.customDuasCompleted) existing.customDuasCompleted = {};
    if (existing.quran == null) existing.quran = 0;
    if (!Array.isArray(existing.quranSurahs)) existing.quranSurahs = [];
    return existing;
  }
  return createEmptyDay();
}

/**
 * Applies the user's specific Quran journey:
 * 1. Today: exactly 15 pages and surahs 49-53
 * 2. Total all-time: exactly 66 surahs spanning 49 through 114
 */
export function applyUserRequestedQuranConfig(
  allDays: Record<string, DayData>,
  todayKey: string
): Record<string, DayData> {
  const nextDays = { ...allDays };
  const today = getDayData(todayKey, nextDays);

  // 1. Set today's data: exactly 15 pages and surahs 49-53
  nextDays[todayKey] = {
    ...today,
    quran: 15,
    quranSurahs: [49, 50, 51, 52, 53],
  };

  // 2. Set remaining surahs (54 to 114 = 61 surahs) across past dates from Sept 22 onwards
  const remainingSurahs = Array.from({ length: 61 }, (_, i) => 54 + i); // 54..114
  const pastDates: string[] = [];
  const baseDate = new Date(todayKey + 'T12:00:00');
  for (let i = 1; i <= 9; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    pastDates.push(d.toISOString().slice(0, 10));
  }

  // Chunk remaining surahs into past dates so 49-114 are all accounted for
  const chunkSize = Math.ceil(remainingSurahs.length / pastDates.length);
  pastDates.forEach((pDate, idx) => {
    const pastDay = getDayData(pDate, nextDays);
    const slice = remainingSurahs.slice(idx * chunkSize, (idx + 1) * chunkSize);
    if (slice.length > 0) {
      nextDays[pDate] = {
        ...pastDay,
        quran: Math.max(Number(pastDay.quran) || 0, Math.ceil(slice.length * 1.5)),
        quranSurahs: slice,
      };
    }
  });

  return nextDays;
}

export function loadSettings(explicitUid?: string): AppSettings {
  try {
    const raw = localStorage.getItem(getScopedKey(STORAGE_SETTINGS_KEY, explicitUid));
    if (!raw) return { ...DEFAULT_SETTINGS, startingStreakOffset: 0, useCustomSchedule: false };
    const parsed = JSON.parse(raw);

    const mergedSchedule = {
      ...DEFAULT_SETTINGS.customSchedule,
      ...(parsed.customSchedule || {}),
    };

    // If customSchedule is untouched from the static default template,
    // do not force custom schedule so the user gets accurate astronomical times for their selected city!
    const isScheduleDefault =
      !parsed.customSchedule ||
      (parsed.customSchedule.Fajr?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan &&
        parsed.customSchedule.Duhur?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan &&
        parsed.customSchedule.Casar?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan &&
        parsed.customSchedule.Maqrib?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan &&
        parsed.customSchedule.Cishe?.adhan === DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan);

    const effectiveUseCustom = Boolean(parsed.useCustomSchedule === true && !isScheduleDefault);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      startingStreakOffset: parsed.startingStreakOffset ?? 0,
      useCustomSchedule: effectiveUseCustom,
      customSchedule: mergedSchedule,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, startingStreakOffset: 0, useCustomSchedule: false };
  }
}

export function saveSettings(settings: AppSettings, explicitUid?: string): void {
  try {
    localStorage.setItem(getScopedKey(STORAGE_SETTINGS_KEY, explicitUid), JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to storage:', err);
  }
}

export function loadCustomDuas(explicitUid?: string): CustomDua[] {
  try {
    const raw = localStorage.getItem(getScopedKey(STORAGE_CUSTOM_DUAS_KEY, explicitUid));
    if (!raw) {
      saveCustomDuas(INITIAL_CUSTOM_DUAS, explicitUid);
      return INITIAL_CUSTOM_DUAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CUSTOM_DUAS;
  } catch {
    return INITIAL_CUSTOM_DUAS;
  }
}

export function saveCustomDuas(duas: CustomDua[], explicitUid?: string): void {
  try {
    localStorage.setItem(getScopedKey(STORAGE_CUSTOM_DUAS_KEY, explicitUid), JSON.stringify(duas));
  } catch (err) {
    console.error('Error saving custom duas:', err);
  }
}

export interface StreakResult {
  currentMosqueStreak: number;
  bestMosqueStreak: number;
  currentAllStreak: number;
  bestAllStreak: number;
  todayCount: number;
  todayMosque: number;
  todayHome: number;
  todayMissed: number;
}

export function calculateStreaks(
  allDays: Record<string, DayData>,
  activeDateKey: string,
  settings?: AppSettings
): StreakResult {
  const mainPrayers: PrayerName[] = ['Fajr', 'Duhur', 'Casar', 'Maqrib', 'Cishe'];
  const baselineOffset = Math.max(0, settings?.startingStreakOffset || 0);

  const getDayPrayedCounts = (dateKey: string) => {
    const day = allDays[dateKey];
    let mosque = 0;
    let home = 0;
    let earlyHome = 0;
    let missed = 0;
    let excused = 0;
    const isExcusedDay = !!(day && day.isExcusedDay);

    if (day && day.salaah) {
      for (const p of mainPrayers) {
        const st = day.salaah[p]?.status;
        if (st === 'mosque') mosque++;
        else if (st === 'early_home') {
          earlyHome++;
          mosque++; // counts as top-tier excellence for sisters
          home++;
        } else if (st === 'home') home++;
        else if (st === 'missed') missed++;
        else if (st === 'excused') excused++;
      }
    }

    const totalPrayed = mosque + home - earlyHome; // actual distinct prayers completed
    const isFullyCovered = isExcusedDay || (totalPrayed >= 5) || (totalPrayed + excused >= 5);
    const isTopCovered = isExcusedDay || (mosque >= 5) || (mosque + excused >= 5);

    return {
      mosque,
      home: home - earlyHome,
      earlyHome,
      missed,
      excused,
      total: totalPrayed,
      isFullyCovered,
      isTopCovered,
      isExcusedDay,
    };
  };

  const todayCounts = getDayPrayedCounts(activeDateKey);

  // Helper to step date by offset in days (YYYY-MM-DD)
  const getOffsetDateKey = (baseKey: string, offsetDays: number): string => {
    const [y, m, d] = baseKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offsetDays);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  };

  // 1. Calculate Current Streak for All 5 Prayers (Mosque or Home)
  let currentAllStreak = 0;
  if (todayCounts.isFullyCovered) {
    currentAllStreak = 1;
    let offset = -1;
    while (offset >= -365) {
      const prevKey = getOffsetDateKey(activeDateKey, offset);
      const prevCounts = getDayPrayedCounts(prevKey);
      if (prevCounts.isFullyCovered) {
        currentAllStreak++;
        offset--;
      } else {
        break;
      }
    }
  } else {
    // If today is in progress, check yesterday's active streak
    let offset = -1;
    let pastStreak = 0;
    while (offset >= -365) {
      const prevKey = getOffsetDateKey(activeDateKey, offset);
      const prevCounts = getDayPrayedCounts(prevKey);
      if (prevCounts.isFullyCovered) {
        pastStreak++;
        offset--;
      } else {
        break;
      }
    }
    // If user has prayed prayers today (even 1 or more), streak is active today!
    if (todayCounts.total > 0) {
      currentAllStreak = pastStreak + 1;
    } else {
      currentAllStreak = pastStreak;
    }
  }

  // 2. Calculate Current Mosque / Excellence Streak
  let currentMosqueStreak = 0;
  if (todayCounts.isTopCovered) {
    currentMosqueStreak = 1;
    let offset = -1;
    while (offset >= -365) {
      const prevKey = getOffsetDateKey(activeDateKey, offset);
      const prevCounts = getDayPrayedCounts(prevKey);
      if (prevCounts.isTopCovered) {
        currentMosqueStreak++;
        offset--;
      } else {
        break;
      }
    }
  } else {
    let offset = -1;
    let pastMosqueStreak = 0;
    while (offset >= -365) {
      const prevKey = getOffsetDateKey(activeDateKey, offset);
      const prevCounts = getDayPrayedCounts(prevKey);
      if (prevCounts.isTopCovered) {
        pastMosqueStreak++;
        offset--;
      } else {
        break;
      }
    }
    if (todayCounts.mosque > 0) {
      currentMosqueStreak = pastMosqueStreak + 1;
    } else {
      currentMosqueStreak = pastMosqueStreak;
    }
  }

  // 3. Calculate Best Streaks Across Recorded History
  const allRecordedKeys = Object.keys(allDays).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
  if (!allRecordedKeys.includes(activeDateKey)) {
    allRecordedKeys.push(activeDateKey);
  }
  allRecordedKeys.sort();

  let bestAllStreak = currentAllStreak;
  let bestMosqueStreak = currentMosqueStreak;

  if (allRecordedKeys.length > 0) {
    const firstKey = allRecordedKeys[0];
    const lastKey = allRecordedKeys[allRecordedKeys.length - 1];

    let runAll = 0;
    let runMosque = 0;

    let curKey = firstKey;
    let guard = 0;
    while (guard < 1000) {
      guard++;
      const counts = getDayPrayedCounts(curKey);

      if (counts.isFullyCovered) {
        runAll++;
        if (runAll > bestAllStreak) bestAllStreak = runAll;
      } else {
        runAll = 0;
      }

      if (counts.isTopCovered) {
        runMosque++;
        if (runMosque > bestMosqueStreak) bestMosqueStreak = runMosque;
      } else {
        runMosque = 0;
      }

      if (curKey === lastKey) break;
      curKey = getOffsetDateKey(curKey, 1);
    }
  }

  const finalCurrentAll = currentAllStreak + baselineOffset;
  const finalBestAll = Math.max(bestAllStreak + baselineOffset, finalCurrentAll);

  return {
    currentMosqueStreak,
    bestMosqueStreak: Math.max(bestMosqueStreak, currentMosqueStreak),
    currentAllStreak: finalCurrentAll,
    bestAllStreak: finalBestAll,
    todayCount: todayCounts.total,
    todayMosque: todayCounts.mosque,
    todayHome: todayCounts.home,
    todayMissed: todayCounts.missed,
  };
}

export function exportBackupData(): string {
  const payload = {
    app: 'Salaad & Adhkaar Soomaali',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    days: loadAllDays(),
    settings: loadSettings(),
    customDuas: loadCustomDuas(),
    todos: loadAllTodos(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.days && typeof parsed.days === 'object' && !Array.isArray(parsed.days)) {
      const safeDays: Record<string, DayData> = {};
      for (const [k, v] of Object.entries(parsed.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
          safeDays[k] = v as DayData;
        }
      }
      saveAllDays(safeDays);
    }
    if (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)) {
      saveSettings(parsed.settings);
    }
    if (Array.isArray(parsed.customDuas)) {
      saveCustomDuas(parsed.customDuas);
    }
    if (Array.isArray(parsed.todos)) {
      saveAllTodos(parsed.todos);
    }
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}

export function hasDayMeaningfulActivity(day?: DayData | null): boolean {
  if (!day || typeof day !== 'object') return false;
  if ((Number(day.quran) || 0) > 0) return true;
  if (Array.isArray(day.quranSurahs) && day.quranSurahs.length > 0) return true;
  if ((Number(day.tasbeehCount) || 0) > 0) return true;
  if ((Number(day.fridaySalawatCount) || 0) > 0) return true;
  if (day.soon || day.fridayKahfRead || day.isExcusedDay) return true;
  if (day.adhkar && Object.values(day.adhkar).some(Boolean)) return true;
  if (day.customDuasCompleted && Object.values(day.customDuasCompleted).some(Boolean)) return true;
  if (day.salaah) {
    for (const rec of Object.values(day.salaah)) {
      if (rec && rec.status && rec.status !== 'none') return true;
      if (rec && rec.reason && rec.reason.trim()) return true;
    }
  }
  return false;
}

export function mergeTwoDayRecords(local: DayData | undefined, remote: DayData): DayData {
  if (!local) return remote;
  if (!remote) return local;

  const parseTs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? Number(val) || 0 : parsed;
  };

  const localTs = parseTs(local.updatedAt);
  const remoteTs = parseTs(remote.updatedAt);

  const mergedSalaah: Record<string, any> = { ...(local.salaah || {}) };
  for (const [prayer, rec] of Object.entries(remote.salaah || {})) {
    const localRec = mergedSalaah[prayer];
    if (!localRec || localRec.status === 'none') {
      mergedSalaah[prayer] = rec;
    } else if (rec && rec.status !== 'none') {
      // If both have a non-none status, prefer the more recently updated record (or keep reason if present)
      if (remoteTs >= localTs) {
        mergedSalaah[prayer] = {
          ...localRec,
          ...rec,
          reason: rec.reason || localRec.reason || '',
        };
      } else if (!localRec.reason && rec.reason) {
        mergedSalaah[prayer] = {
          ...localRec,
          reason: rec.reason,
          reasonSavedAt: rec.reasonSavedAt || localRec.reasonSavedAt,
        };
      }
    }
  }

  const mergedAdhkar = { ...(local.adhkar || {}) };
  for (const [k, v] of Object.entries(remote.adhkar || {})) {
    if (v) mergedAdhkar[k] = true;
  }

  const mergedCustomDuas = { ...(local.customDuasCompleted || {}) };
  for (const [k, v] of Object.entries(remote.customDuasCompleted || {})) {
    if (v) mergedCustomDuas[k] = true;
  }

  const quran = Math.max(Number(local.quran) || 0, Number(remote.quran) || 0);
  const quranSurahs = Array.from(
    new Set([...(local.quranSurahs || []), ...(remote.quranSurahs || [])])
  ).sort((a, b) => a - b);
  const tasbeehCount = Math.max(Number(local.tasbeehCount) || 0, Number(remote.tasbeehCount) || 0);
  const fridaySalawatCount = Math.max(
    Number(local.fridaySalawatCount) || 0,
    Number(remote.fridaySalawatCount) || 0
  );

  return {
    ...local,
    ...remote,
    salaah: mergedSalaah as DayData['salaah'],
    adhkar: mergedAdhkar,
    customDuasCompleted: mergedCustomDuas,
    quran,
    quranSurahs,
    soon: !!(local.soon || remote.soon),
    tasbeehCount,
    fridayKahfRead: !!(local.fridayKahfRead || remote.fridayKahfRead),
    fridaySalawatCount,
    isExcusedDay: !!(local.isExcusedDay || remote.isExcusedDay),
    updatedAt: Math.max(localTs || 0, remoteTs || 0, Date.now()),
  };
}

export function loadAndRecoverUserDays(uid: string): Record<string, DayData> {
  const userDays = loadAllDays(uid);
  const merged: Record<string, DayData> = { ...userDays };
  let recoveredAny = false;

  // Also check if any meaningful activity was recorded under 'guest' or legacy unscoped key
  // (e.g. before login or if a reload briefly switched to guest)
  try {
    const guestDays = loadAllDays('guest');
    for (const [dKey, gDay] of Object.entries(guestDays)) {
      if (hasDayMeaningfulActivity(gDay)) {
        const prev = merged[dKey];
        const next = mergeTwoDayRecords(prev, gDay);
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          merged[dKey] = next;
          recoveredAny = true;
        }
      }
    }

    const legacyRaw = localStorage.getItem(STORAGE_DAYS_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && typeof legacyParsed === 'object') {
        for (const [dKey, lDay] of Object.entries(legacyParsed as Record<string, DayData>)) {
          if (hasDayMeaningfulActivity(lDay)) {
            const prev = merged[dKey];
            const next = mergeTwoDayRecords(prev, lDay);
            if (JSON.stringify(prev) !== JSON.stringify(next)) {
              merged[dKey] = next;
              recoveredAny = true;
            }
          }
        }
      }
    }
  } catch {}

  if (recoveredAny) {
    saveAllDays(merged, uid);
  }
  return merged;
}

export function clearUserDataOnLogout(): void {
  try {
    localStorage.setItem('tuko_logged_out', 'true');
    savePersistedAuthUser(null);
    // Switch storage scope to guest and clear guest workspace so screen starts at 0
    setActiveStorageUser(null);
    localStorage.removeItem(getScopedKey(STORAGE_DAYS_KEY, 'guest'));
    localStorage.removeItem(getScopedKey(STORAGE_SETTINGS_KEY, 'guest'));
    localStorage.removeItem(getScopedKey(STORAGE_TODOS_KEY, 'guest'));
    localStorage.removeItem(getScopedKey(STORAGE_CUSTOM_DUAS_KEY, 'guest'));
  } catch (err) {
    console.error('Error clearing user data on logout:', err);
  }
}
