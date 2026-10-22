import { AppSettings, PrayerName } from '../types';
import { DEFAULT_USER_PRAYER_SCHEDULE } from './somaliaCities';

export interface PrayerTimesResult {
  Fajr: number;
  Sunrise: number;
  Duhur: number;
  Casar: number;
  Maqrib: number;
  Cishe: number;
}

export const PRAYER_SOMALI_LABELS: Record<PrayerName, string> = {
  Fajr: 'Subax (Fajr)',
  Sunrise: 'Duxa (Qorrax)',
  Duhur: 'Duhur',
  Casar: 'Casar',
  Maqrib: 'Magrib',
  Cishe: 'Cisha',
};

export const PRAYER_SHORT_LABELS: Record<PrayerName, string> = {
  Fajr: 'Subax',
  Sunrise: 'Duxa',
  Duhur: 'Duhur',
  Casar: 'Casar',
  Maqrib: 'Magrib',
  Cishe: 'Cisha',
};

export function timeStringToDecimal(timeStr: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h + m / 60;
}

export const PRAYER_ORDER: PrayerName[] = ['Fajr', 'Duhur', 'Casar', 'Maqrib', 'Cishe'];
export const ALL_DISPLAY_ORDER: PrayerName[] = ['Fajr', 'Sunrise', 'Duhur', 'Casar', 'Maqrib', 'Cishe'];

const METHODS = {
  MWL: { name: 'Muslim World League', fajrAngle: 18, ishaAngle: 17 },
  ISNA: { name: 'ISNA (North America)', fajrAngle: 15, ishaAngle: 15 },
  EGY: { name: 'Egyptian General Authority', fajrAngle: 19.5, ishaAngle: 17.5 },
  KAR: { name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 },
  UMQ: { name: 'Umm Al-Qura (Makkah)', fajrAngle: 18.5, ishaMinutes: 90 },
};

function julianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number): { dec: number; eqt: number } {
  const D = jd - 2451545.0;
  const r = Math.PI / 180;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * r) + 0.020 * Math.sin(2 * g * r)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const dec = Math.asin(Math.sin(e * r) * Math.sin(L * r)) / r;
  let RA = Math.atan2(Math.cos(e * r) * Math.sin(L * r), Math.cos(L * r)) / r;
  RA = ((RA / 15 + 24) % 24);
  return { dec, eqt: q / 15 - RA };
}

function timeForAngle(angle: number, lat: number, dec: number, noon: number, morning: boolean): number | null {
  const r = Math.PI / 180;
  const cosH = (-Math.sin(angle * r) - Math.sin(lat * r) * Math.sin(dec * r)) /
    (Math.cos(lat * r) * Math.cos(dec * r));
  if (cosH > 1 || cosH < -1) return null;
  const H = Math.acos(cosH) / r / 15;
  return morning ? noon - H : noon + H;
}

export function calculatePrayerTimes(
  lat: number,
  lon: number,
  date: Date,
  methodKey: keyof typeof METHODS = 'MWL',
  asrFactor: 1 | 2 = 1,
  timezoneOffsetHours?: number
): PrayerTimesResult {
  const tz = timezoneOffsetHours !== undefined ? timezoneOffsetHours : -date.getTimezoneOffset() / 60;
  const method = METHODS[methodKey] || METHODS.MWL;
  const r = Math.PI / 180;

  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lon / 360;
  const { dec, eqt } = sunPosition(jd);
  const noon = 12 - lon / 15 - eqt + tz;

  const fajr = timeForAngle(method.fajrAngle, lat, dec, noon, true) ?? 5;
  const sunrise = timeForAngle(0.833, lat, dec, noon, true) ?? 6;
  const duhur = noon + 1 / 60;

  // Asr angle
  const asrAngle = -Math.atan(1 / (asrFactor + Math.tan((lat - dec) * r))) / r;
  const casar = timeForAngle(asrAngle, lat, dec, noon, false) ?? 15.5;

  const maqrib = timeForAngle(0.833, lat, dec, noon, false) ?? 18.2;

  let cishe: number;
  if ('ishaMinutes' in method && method.ishaMinutes) {
    cishe = maqrib + method.ishaMinutes / 60;
  } else if ('ishaAngle' in method && method.ishaAngle) {
    cishe = timeForAngle(method.ishaAngle, lat, dec, noon, false) ?? 19.5;
  } else {
    cishe = maqrib + 1.5;
  }

  return {
    Fajr: fajr,
    Sunrise: sunrise,
    Duhur: duhur,
    Casar: casar,
    Maqrib: maqrib,
    Cishe: cishe,
  };
}

export function getResolvedPrayerTimes(
  settings: AppSettings,
  date: Date
): PrayerTimesResult {
  // Always respect and prioritize the user's exact prayer schedule:
  // Fajr: 04:30, Sunrise: 05:46, Duhur: 11:49, Casar: 14:57, Maqrib: 17:52, Cishe: 18:57
  const cs = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
  return {
    Fajr: timeStringToDecimal(cs.Fajr?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Fajr.adhan),
    Sunrise: timeStringToDecimal(cs.Sunrise?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Sunrise.adhan),
    Duhur: timeStringToDecimal(cs.Duhur?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Duhur.adhan),
    Casar: timeStringToDecimal(cs.Casar?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Casar.adhan),
    Maqrib: timeStringToDecimal(cs.Maqrib?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Maqrib.adhan),
    Cishe: timeStringToDecimal(cs.Cishe?.adhan || DEFAULT_USER_PRAYER_SCHEDULE.Cishe.adhan),
  };
}

export function formatTime12(decimalHour: number | null | undefined): string {
  if (decimalHour == null || isNaN(decimalHour)) return '--:--';
  let hours = Math.floor(decimalHour);
  let minutes = Math.round((decimalHour - hours) * 60);
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  hours = ((hours % 24) + 24) % 24;
  const isPM = hours >= 12;
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

export function formatTime24(decimalHour: number | null | undefined): string {
  if (decimalHour == null || isNaN(decimalHour)) return '--:--';
  let hours = Math.floor(decimalHour);
  let minutes = Math.round((decimalHour - hours) * 60);
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  hours = ((hours % 24) + 24) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getCurrentPrayer(times: PrayerTimesResult, currentDate: Date = new Date()): PrayerName {
  const currentHour = currentDate.getHours() + currentDate.getMinutes() / 60 + currentDate.getSeconds() / 3600;
  if (currentHour >= times.Cishe || currentHour < times.Fajr) {
    return 'Cishe';
  } else if (currentHour >= times.Maqrib) {
    return 'Maqrib';
  } else if (currentHour >= times.Casar) {
    return 'Casar';
  } else if (currentHour >= times.Duhur) {
    return 'Duhur';
  } else {
    return 'Fajr';
  }
}

export function getNextPrayerInfo(times: PrayerTimesResult, currentDate: Date): {
  nextPrayer: PrayerName;
  minutesRemaining: number;
  isPassed: boolean;
  timeString: string;
} {
  const currentHour = currentDate.getHours() + currentDate.getMinutes() / 60 + currentDate.getSeconds() / 3600;

  for (const prayer of PRAYER_ORDER) {
    const prayerTime = times[prayer];
    if (prayerTime > currentHour) {
      const minutesRemaining = Math.max(0, Math.round((prayerTime - currentHour) * 60));
      return {
        nextPrayer: prayer,
        minutesRemaining,
        isPassed: false,
        timeString: formatTime12(prayerTime),
      };
    }
  }

  // If all prayers passed today, next is tomorrow's Fajr
  const minutesUntilMidnight = Math.max(0, Math.round((24 - currentHour) * 60));
  const fajrMinutes = Math.round(times.Fajr * 60);
  return {
    nextPrayer: 'Fajr',
    minutesRemaining: minutesUntilMidnight + fajrMinutes,
    isPassed: true,
    timeString: formatTime12(times.Fajr),
  };
}

export function getHijriDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('so-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return '1448 Hijri';
    }
  }
}

export function getSomaliFormattedDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const somaliDays = ['Axad', 'Isniin', 'Talaado', 'Arbaco', 'Khamiis', 'Jimco', 'Sabti'];
    const somaliMonths = [
      'Janaayo', 'Febraayo', 'Maarso', 'Abriil', 'Maajo', 'Juun',
      'Luuliyo', 'Ogosto', 'Sebteembar', 'Oktoobar', 'Nofeembar', 'Diseembar'
    ];
    return `${somaliDays[date.getDay()]}, ${date.getDate()} ${somaliMonths[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function getTodayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
