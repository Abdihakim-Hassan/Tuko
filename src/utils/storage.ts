import { AppSettings, CustomDua, DayData, PrayerName, SalaahStatus, TodoItem } from '../types';
import { INITIAL_CUSTOM_DUAS } from './defaultAdhkar';
import { DEFAULT_SETTINGS } from './somaliaCities';
import { getTodayKey } from './prayerTimes';

const STORAGE_DAYS_KEY = 'salaad_soomaali_days_v3';
const STORAGE_SETTINGS_KEY = 'salaad_soomaali_settings_v3';
const STORAGE_CUSTOM_DUAS_KEY = 'salaad_soomaali_custom_duas_v3';
const STORAGE_TODOS_KEY = 'salaad_soomaali_todos_v3';
const ACTIVE_USER_UID_KEY = 'tuko_active_user_uid';

let currentStorageUid: string = (() => {
  try {
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
    if (!raw) return { ...DEFAULT_SETTINGS, startingStreakOffset: 0 };
    const parsed = JSON.parse(raw);

    const mergedSchedule = {
      ...DEFAULT_SETTINGS.customSchedule,
      ...(parsed.customSchedule || {}),
    };

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      startingStreakOffset: parsed.startingStreakOffset ?? 0,
      useCustomSchedule: true,
      customSchedule: mergedSchedule,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, startingStreakOffset: 0 };
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
  };
  return JSON.stringify(payload, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.days && typeof parsed.days === 'object') {
      saveAllDays(parsed.days);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveSettings(parsed.settings);
    }
    if (Array.isArray(parsed.customDuas)) {
      saveCustomDuas(parsed.customDuas);
    }
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}

export function clearUserDataOnLogout(): void {
  try {
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
