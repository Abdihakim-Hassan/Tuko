import { CityInfo, CustomAlarm, CustomPrayerSchedule } from '../types';

export const DEFAULT_USER_PRAYER_SCHEDULE: CustomPrayerSchedule = {
  Fajr: { adhan: '04:30', iqama: '05:03' },
  Sunrise: { adhan: '05:46', iqama: '05:56' }, // Duxa
  Duhur: { adhan: '11:49', iqama: '12:09' },
  Casar: { adhan: '14:57', iqama: '15:16' },
  Maqrib: { adhan: '17:52', iqama: '18:02' },
  Cishe: { adhan: '18:57', iqama: '19:17' },
};

export const DEFAULT_ALARMS: CustomAlarm[] = [
  {
    id: 'alarm_default_fajr',
    time: '04:45',
    label: 'Toosidda Salaadda Subax (Fajr)',
    enabled: true,
    sound: 'adhan',
    selectedVoice: 'fajr',
    days: [],
    createdAt: 1700000000000,
  },
  {
    id: 'alarm_default_quran',
    time: '09:00',
    label: 'Akhriska Qur’aanka Kariimka',
    enabled: false,
    sound: 'chime',
    days: [5], // Friday
    createdAt: 1700000000000,
  },
];

export const SOMALIA_CITIES: CityInfo[] = [
  { id: 'mogadishu', name: 'Muqdisho', region: 'Banaadir', lat: 2.0469, lon: 45.3182 },
  { id: 'hargeisa', name: 'Hargeysa', region: 'Maroodi Jeex', lat: 9.5600, lon: 44.0650 },
  { id: 'garowe', name: 'Garoowe', region: 'Nugaal', lat: 8.4021, lon: 48.4845 },
  { id: 'kismayo', name: 'Kismaayo', region: 'Jubbada Hoose', lat: -0.3582, lon: 42.5454 },
  { id: 'baidoa', name: 'Baydhabo', region: 'Baay', lat: 3.1138, lon: 43.6498 },
  { id: 'bosaso', name: 'Boosaaso', region: 'Bari', lat: 11.2842, lon: 49.1816 },
  { id: 'burao', name: 'Burco', region: 'Togdheer', lat: 9.5221, lon: 45.5336 },
  { id: 'beledweyne', name: 'Baladweyne', region: 'Hiiraan', lat: 4.7358, lon: 45.2036 },
  { id: 'galkayo', name: 'Gaalkacyo', region: 'Mudug', lat: 6.7697, lon: 47.4308 },
  { id: 'borama', name: 'Boorama', region: 'Awdal', lat: 9.9366, lon: 43.1783 },
  { id: 'jowhar', name: 'Jowhar', region: 'Shabeellaha Dhexe', lat: 2.7809, lon: 45.5005 },
  { id: 'merca', name: 'Marka', region: 'Shabeellaha Hoose', lat: 1.7159, lon: 44.7717 },
  { id: 'dhuusamareeb', name: 'Dhuusamareeb', region: 'Galguduud', lat: 5.5372, lon: 46.3869 },
  { id: 'las_anod', name: 'Laascaanood', region: 'Sool', lat: 8.4774, lon: 47.3597 },
  { id: 'erigavo', name: 'Ceerigaabo', region: 'Sanaag', lat: 10.6162, lon: 47.3679 },
  { id: 'berbera', name: 'Berbera', region: 'Saaxil', lat: 10.4396, lon: 45.0143 },
  { id: 'afgooye', name: 'Afgooye', region: 'Shabeellaha Hoose', lat: 2.1438, lon: 45.1206 },
  { id: 'qardho', name: 'Qardho', region: 'Karkaar', lat: 9.5053, lon: 49.0858 },
  { id: 'brava', name: 'Baraawe', region: 'Shabeellaha Hoose', lat: 1.1139, lon: 44.0298 },
  { id: 'beled_hawo', name: 'Beled Xaawo', region: 'Gedo', lat: 3.9288, lon: 41.8761 },
  { id: 'luuq', name: 'Luuq', region: 'Gedo', lat: 3.7956, lon: 42.5442 },
  { id: 'badhan', name: 'Badhan', region: 'Sanaag', lat: 10.7139, lon: 48.3378 },
  { id: 'hobyo', name: 'Hobyo', region: 'Mudug', lat: 5.3505, lon: 48.5268 },
  { id: 'bardaale', name: 'Bardaale', region: 'Baay', lat: 3.4000, lon: 43.1667 },
  { id: 'ceeldheer', name: 'Ceeldheer', region: 'Galguduud', lat: 3.8647, lon: 47.1786 },
];

export const DEFAULT_SETTINGS: {
  cityId: string;
  cityName: string;
  lat: number;
  lon: number;
  method: 'MWL' | 'UMQ' | 'EGY' | 'KAR' | 'ISNA';
  asrMethod: 1 | 2;
  adhanSound: boolean;
  prePrayerAlertMinutes: number;
  prePrayerSound: boolean;
  notificationsEnabled: boolean;
  gender: 'male' | 'female';
  haptic: boolean;
  ramadanMode: boolean;
  useCustomSchedule: boolean;
  customSchedule: CustomPrayerSchedule;
  alarms: CustomAlarm[];
} = {
  cityId: 'mogadishu',
  cityName: 'Muqdisho (Banaadir)',
  lat: 2.0469,
  lon: 45.3182,
  method: 'MWL',
  asrMethod: 1, // Shafi'i (Standard in Somalia)
  adhanSound: true,
  prePrayerAlertMinutes: 10,
  prePrayerSound: true,
  notificationsEnabled: false,
  gender: 'male',
  haptic: true,
  ramadanMode: false,
  useCustomSchedule: true, // Default to true using user's exact personal schedule
  customSchedule: DEFAULT_USER_PRAYER_SCHEDULE,
  alarms: DEFAULT_ALARMS,
};
