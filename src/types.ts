export type SalaahStatus = 'none' | 'mosque' | 'home' | 'early_home' | 'missed' | 'excused';

export type PrayerName = 'Fajr' | 'Sunrise' | 'Duhur' | 'Casar' | 'Maqrib' | 'Cishe';

export interface SalaahRecord {
  status: SalaahStatus;
  reason?: string;
  reasonSavedAt?: number;
}

export interface CustomDua {
  id: string;
  title: string;
  arabic?: string;
  meaning?: string;
  targetCount: number;
  category: 'fajr' | 'casar' | 'general' | 'duco';
  createdAt: number;
}

export type AdhanVoice =
  | 'makkah'
  | 'madinah'
  | 'afasy'
  | 'abdulbasit'
  | 'zahrani'
  | 'qatami'
  | 'minshawi'
  | 'fajr';

export type UserRole = 'admin' | 'musallii' | 'mentor';
export type UserGoal = 'dhawre_masaajid' | 'xafide_quran' | 'soome_sunno' | 'guud';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  goal?: UserGoal;
  gender?: 'male' | 'female';
  createdAt: string;
  updatedAt: string;
}

export interface DayData {
  salaah: Record<PrayerName, SalaahRecord>;
  adhkar: Record<string, boolean>; // e.g. "Fajr:salam" -> true
  customDuasCompleted: Record<string, boolean>; // duaId -> true
  quran: number; // pages read
  quranSurahs?: number[]; // list of surah numbers (1-114) read
  soon?: boolean;
  tasbeehCount?: number;
  fridayKahfRead?: boolean;
  fridaySalawatCount?: number;
  isExcusedDay?: boolean; // For sisters in udhur / period - protects streaks
  updatedAt?: number;
}

export type TodoPriority = 'high' | 'medium' | 'low';
export type TodoDayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TodoCategory = 'diini' | 'shaqo' | 'guriga' | 'waxbarasho' | 'caafimaad' | 'guud';

export interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  priority: TodoPriority;
  day?: TodoDayOfWeek;
  category?: TodoCategory | string;
  tags?: string[];
  details?: string;
  imageUrl?: string; // Base64 or URL for uploaded task photos
  imageCaption?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  completedAt?: number;
  createdAt: number;
}

export interface PrayerTimeSlot {
  adhan: string; // e.g. "04:30"
  iqama: string; // e.g. "05:03"
}

export interface CustomPrayerSchedule {
  Fajr: PrayerTimeSlot;
  Sunrise: PrayerTimeSlot; // Duxa
  Duhur: PrayerTimeSlot;
  Casar: PrayerTimeSlot;
  Maqrib: PrayerTimeSlot;
  Cishe: PrayerTimeSlot;
}

export interface CustomAlarm {
  id: string;
  time: string; // HH:mm format, e.g. "05:30"
  label: string;
  enabled: boolean;
  sound: 'adhan' | 'chime' | 'soft_bell' | 'digital' | 'classic' | 'gentle_morning' | 'alarm_beep' | 'zen_bowl' | 'wave_soft' | 'morning_bird';
  selectedVoice?: AdhanVoice;
  days?: number[]; // [0,1,2,3,4,5,6] empty means everyday
  createdAt: number;
}

export type PrayerVoiceMap = Partial<Record<PrayerName, AdhanVoice>>;

export interface QadaaTrackerData {
  fastingOwed: number;
  fastingCompleted: number;
  prayersOwed: Record<PrayerName, number>;
  prayersCompleted: Record<PrayerName, number>;
  lastUpdated?: number;
}

export interface KhatmPlanData {
  targetDays: number; // e.g., 15, 30, 60, 90
  startDate: string; // YYYY-MM-DD
  startingPagesRead?: number;
}

export interface ZakatCalculatorData {
  cash: number;
  goldGrams: number;
  goldPricePerGram: number;
  silverGrams: number;
  silverPricePerGram: number;
  businessGoods: number;
  debtsOwed: number;
  familyMembers: number;
  fitrAmountPerPerson: number;
  lastCalculated?: number;
}

export interface AppSettings {
  cityId: string;
  cityName: string;
  lat: number;
  lon: number;
  method: 'MWL' | 'UMQ' | 'EGY' | 'KAR' | 'ISNA';
  asrMethod: 1 | 2; // 1 = Shafi/Maliki/Hanbali (default for Somalia), 2 = Hanafi
  adhanSound: boolean;
  adhanVoice?: AdhanVoice;
  prayerVoices?: PrayerVoiceMap;
  alarms?: CustomAlarm[];
  prePrayerAlertMinutes: number; // 0 = off, 5, 10, 15, 20
  prePrayerSound: boolean;
  notificationsEnabled?: boolean;
  gender?: 'male' | 'female';
  genderConfirmed?: boolean;
  haptic: boolean;
  ramadanMode: boolean;
  useCustomSchedule?: boolean;
  zakatCalculator?: ZakatCalculatorData;
  customSchedule?: CustomPrayerSchedule;
  startingStreakOffset?: number; // Custom baseline streak starting count
  qadaaTracker?: QadaaTrackerData;
  khatmPlan?: KhatmPlanData;
  language?: 'so' | 'en';
  updatedAt?: number;
}

export interface CityInfo {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export interface DikriItem {
  id: string;
  arabic: string;
  translit: string;
  somali: string;
  count: number;
}

export interface DailyInspiration {
  id: string;
  arabic: string;
  source: string;
  somali: string;
  category: 'salaad' | 'jumcah' | 'istighfaar' | 'dumar';
}
