import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Bell,
  Clock,
  Check,
  RotateCcw,
  Sliders,
  CheckCircle,
  Radio,
  Plus,
  Trash2,
  Edit2,
  Timer,
  ChevronDown,
  Pause,
  Zap,
} from 'lucide-react';
import {
  AppSettings,
  AdhanVoice,
  CustomPrayerSchedule,
  PrayerName,
  CustomAlarm,
  PrayerVoiceMap,
} from '../types';
import { PrayerTimesResult, formatTime12, PRAYER_SOMALI_LABELS } from '../utils/prayerTimes';
import { DEFAULT_ALARMS, DEFAULT_USER_PRAYER_SCHEDULE } from '../utils/somaliaCities';
import {
  audioAlerts,
  isNotificationGranted,
  requestNotificationPermission,
} from '../utils/audioAlerts';
import { AlarmRingModal } from './AlarmRingModal';
import { CustomTimePickerModal } from './CustomTimePickerModal';

interface AdhanViewProps {
  settings: AppSettings;
  prayerTimes: PrayerTimesResult;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  onTriggerAdhaanOverlay: (prayer: PrayerName) => void;
  cityName: string;
  initialSubTab?: 'prayers' | 'clock_alarm' | 'schedule';
  subTabTrigger?: number;
}

export const SHEIKH_VOICES: {
  id: AdhanVoice;
  name: string;
  location: string;
  country: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'makkah',
    name: 'Sh. Cali Mulla',
    location: 'Masjid Al-Xaram',
    country: '🕋 Makkah',
    description: 'Codka caanka ah ee taariikhiga ah ee Kacbada sharafta leh.',
    icon: '🕋',
  },
  {
    id: 'madinah',
    name: 'Aadaanka Madiina',
    location: 'Masjid Nabawi',
    country: '🕌 Madinah',
    description: 'Cod degan oo qalbiga taabanaya oo ka baxa Masjidka Nabiga ﷺ.',
    icon: '🕌',
  },
  {
    id: 'afasy',
    name: 'Sh. Mishary Al-Afasy',
    location: 'Kuwait',
    country: '🇰🇼 Kuwait',
    description: 'Cod macaan oo aad looga yaqaan dhammaan caalamka Islaamka.',
    icon: '🌙',
  },
  {
    id: 'abdulbasit',
    name: 'Sh. Abdulbasit Abdussamad',
    location: 'Qaahira',
    country: '🇪🇬 Masar',
    description: 'Codkii caanka ahaa ee qarniga, dhawaaq xooggan oo xiiso gaar ah leh.',
    icon: '🎙️',
  },
  {
    id: 'zahrani',
    name: 'Sh. Naif Az-Zahrani',
    location: 'Riyadh',
    country: '🇸🇦 Sacuudi',
    description: 'Aadaan heer sare ah oo casri ah oo xasilooni badan.',
    icon: '✨',
  },
  {
    id: 'qatami',
    name: 'Sh. Nasser Al-Qatami',
    location: 'Riyadh',
    country: '🇸🇦 Sacuudi',
    description: 'Cod qiiro leh oo dhiirrigelinaya xaadiritaanka salaadda.',
    icon: '🕌',
  },
  {
    id: 'minshawi',
    name: 'Sh. Siddiq Al-Minshawi',
    location: 'Qaahira',
    country: '🇪🇬 Masar',
    description: 'Cod qadiimi ah oo leh xushmad iyo cabsi Eebbe oo qoto dheer.',
    icon: '📖',
  },
  {
    id: 'fajr',
    name: 'Aadaanka Subaxa (Fajr)',
    location: 'Subax Gaar ah',
    country: '🌅 Fajr',
    description: 'Waxaa ku jira: "As-Salaatu Khayrun Mina Al-Nawm" (Salaadda hurdo ayaa ka khayr badan).',
    icon: '🌅',
  },
];

const PRAYERS_LIST: { key: PrayerName; label: string; icon: string; defaultVoice: AdhanVoice }[] = [
  { key: 'Fajr', label: 'Subax (Fajr)', icon: '🌅', defaultVoice: 'fajr' },
  { key: 'Duhur', label: 'Duhur', icon: '🌞', defaultVoice: 'makkah' },
  { key: 'Casar', label: 'Casar', icon: '🌤️', defaultVoice: 'abdulbasit' },
  { key: 'Maqrib', label: 'Magrib', icon: '🌇', defaultVoice: 'madinah' },
  { key: 'Cishe', label: 'Cisha', icon: '🌙', defaultVoice: 'minshawi' },
];

const DAYS_NAMES = ['Ax', 'Is', 'Ta', 'Ar', 'Kh', 'Ji', 'Sa'];

// Deterministic 12-hour formatter for 24h strings like "04:45" or "17:30"
function format24To12Display(time24: string): { time12: string; ampm: 'AM' | 'PM'; periodSomali: string } {
  if (!time24 || !time24.includes(':')) {
    return { time12: '05:00', ampm: 'AM', periodSomali: 'Subax' };
  }
  const [rawH, rawM] = time24.split(':').map(Number);
  const h24 = Number.isFinite(rawH) ? rawH : 5;
  const m = Number.isFinite(rawM) ? rawM : 0;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const periodSomali =
    h24 >= 4 && h24 < 12
      ? 'Subax'
      : h24 >= 12 && h24 < 17
      ? 'Duhur / Galab'
      : h24 >= 17 && h24 < 20
      ? 'Fiid'
      : 'Habeen';
  return {
    time12: `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    ampm,
    periodSomali,
  };
}

// Convert 12h components to 24h "HH:MM"
function build24TimeFrom12(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (ampm === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Parse 24h "HH:MM" into 12h components
function parse24To12Parts(time24: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [rawH, rawM] = (time24 || '05:00').split(':').map(Number);
  const h24 = Number.isFinite(rawH) ? rawH : 5;
  const minute = Number.isFinite(rawM) ? rawM : 0;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

// Deterministic live clock display
function formatLiveDigitalClock(date: Date): { hms: string; ampm: string } {
  let h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return {
    hms: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    ampm,
  };
}

export const AdhanView: React.FC<AdhanViewProps> = ({
  settings,
  prayerTimes,
  onUpdateSettings,
  onTriggerAdhaanOverlay,
  cityName,
  initialSubTab = 'clock_alarm',
  subTabTrigger = 0,
}) => {
  // Navigation Sub-Tabs — default to 'clock_alarm' so mobile clock & alarms work immediately
  const [activeSubTab, setActiveSubTab] = useState<'prayers' | 'clock_alarm' | 'schedule'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, subTabTrigger]);

  // Currently playing preview voice
  const [playingVoiceId, setPlayingVoiceId] = useState<AdhanVoice | null>(null);
  const [volume, setVolume] = useState<number>(100);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Live Digital Clock State
  const [nowDate, setNowDate] = useState<Date>(() => new Date());

  // Alarm Management (synced with settings.alarms)
  const [alarms, setAlarms] = useState<CustomAlarm[]>(() => {
    if (Array.isArray(settings.alarms)) return settings.alarms;
    return DEFAULT_ALARMS;
  });

  useEffect(() => {
    if (Array.isArray(settings.alarms)) {
      setAlarms(settings.alarms);
    }
  }, [settings.alarms]);

  // Modal for creating/editing alarm
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [alarmFormTime, setAlarmFormTime] = useState('05:00');
  const [isAlarmTimePickerOpen, setIsAlarmTimePickerOpen] = useState(false);
  const [alarmFormLabel, setAlarmFormLabel] = useState('Toosidda Salaadda');
  const [alarmFormSound, setAlarmFormSound] = useState<CustomAlarm['sound']>('adhan');
  const [alarmFormVoice, setAlarmFormVoice] = useState<AdhanVoice>('makkah');
  const [alarmFormDays, setAlarmFormDays] = useState<number[]>([]);
  const [activeScheduleSlot, setActiveScheduleSlot] = useState<{
    prayerKey: string;
    field: 'adhan' | 'iqama';
    currentTime: string;
    label: string;
  } | null>(null);

  // Quick Countdown Timer (Saacadda Tirsiga ee Mobile-ka)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(300); // 5 mins default
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [customTimerMins, setCustomTimerMins] = useState<string>('5');

  // Testing alarm overlay
  const [testRingingAlarm, setTestRingingAlarm] = useState<CustomAlarm | null>(null);

  // Ticking timer for live clock & countdown timer
  useEffect(() => {
    const updateClock = () => setNowDate(new Date());
    const timer = setInterval(updateClock, 1000);
    document.addEventListener('visibilitychange', updateClock);
    window.addEventListener('focus', updateClock);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
      window.removeEventListener('focus', updateClock);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          const completedTimerAlarm: CustomAlarm = {
            id: `timer_done_${Date.now()}`,
            time: new Date().toTimeString().slice(0, 5),
            label: '⏰ Waqtigii Saacadda Tirsiga (Timer) Wuu Dhammaaday!',
            enabled: true,
            sound: 'adhan',
            selectedVoice: settings.adhanVoice || 'makkah',
            days: [],
            createdAt: Date.now(),
          };
          setTestRingingAlarm(completedTimerAlarm);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, settings.adhanVoice]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioAlerts.stopAlarm();
    };
  }, []);

  // Sync alarms to settings when changed
  const updateAlarmsState = (nextAlarms: CustomAlarm[]) => {
    setAlarms(nextAlarms);
    audioAlerts.unlockAudio();
    audioAlerts.requestWakeLock();
    if (onUpdateSettings) {
      onUpdateSettings({ alarms: nextAlarms });
    }
  };

  // Start quick countdown timer
  const handleStartPresetTimer = (minutes: number) => {
    audioAlerts.unlockAudio();
    audioAlerts.requestWakeLock();
    const secs = Math.max(1, Math.round(minutes * 60));
    setTimerTotalSeconds(secs);
    setTimerSecondsLeft(secs);
    setIsTimerRunning(true);
    setSaveSuccessMsg(`⏳ Saacadda Tirsiga (${minutes} daqiiqo) way bilaabatay!`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Toggle play preview for any voice
  const handleTogglePlayVoice = (voiceId: AdhanVoice) => {
    audioAlerts.unlockAudio();
    if (playingVoiceId === voiceId) {
      audioAlerts.stopAdhan();
      setPlayingVoiceId(null);
    } else {
      audioAlerts.stopAdhan();
      setPlayingVoiceId(voiceId);
      audioAlerts.setVolume(volume / 100);
      audioAlerts.playAdhan(
        voiceId === 'fajr',
        () => {
          setPlayingVoiceId(null);
        },
        voiceId
      );
    }
  };

  // Set prayer-specific voice
  const handleSelectPrayerVoice = (prayer: PrayerName, voiceId: AdhanVoice) => {
    const currentMap: PrayerVoiceMap = settings.prayerVoices || {};
    const updatedMap: PrayerVoiceMap = {
      ...currentMap,
      [prayer]: voiceId,
    };
    if (onUpdateSettings) {
      onUpdateSettings({ prayerVoices: updatedMap });
    }
    setSaveSuccessMsg(
      `Codka ${PRAYER_SOMALI_LABELS[prayer]} waxaa loo beddelay: ${
        SHEIKH_VOICES.find((v) => v.id === voiceId)?.name
      }!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Set master default voice for all prayers
  const handleApplyMasterVoiceToAll = (voiceId: AdhanVoice) => {
    const newMap: PrayerVoiceMap = {
      Fajr: voiceId,
      Duhur: voiceId,
      Casar: voiceId,
      Maqrib: voiceId,
      Cishe: voiceId,
    };
    if (onUpdateSettings) {
      onUpdateSettings({
        adhanVoice: voiceId,
        prayerVoices: newMap,
      });
    }
    setSaveSuccessMsg(
      `Dhammaan salaadaha waxaa loo xushay: ${SHEIKH_VOICES.find((v) => v.id === voiceId)?.name}!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioAlerts.setVolume(newVol / 100);
  };

  // Save or Edit Alarm
  const handleSaveAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmFormTime) return;
    audioAlerts.unlockAudio();
    audioAlerts.requestWakeLock();

    const { time12, ampm } = format24To12Display(alarmFormTime);

    if (editingAlarmId) {
      const nextAlarms = alarms.map((a) =>
        a.id === editingAlarmId
          ? {
              ...a,
              time: alarmFormTime,
              label: alarmFormLabel.trim() || 'Alaarm',
              sound: alarmFormSound,
              selectedVoice: alarmFormSound === 'adhan' ? alarmFormVoice : undefined,
              days: alarmFormDays,
              enabled: true,
              createdAt: Date.now(),
            }
          : a
      );
      updateAlarmsState(nextAlarms);
      setSaveSuccessMsg(`✓ Alaarm-ka (${time12} ${ampm}) waa la cusbooneysiiyay oo waa shidan yahay!`);
    } else {
      const newAlarm: CustomAlarm = {
        id: `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: alarmFormTime,
        label: alarmFormLabel.trim() || 'Alaarm Cusub',
        enabled: true,
        sound: alarmFormSound,
        selectedVoice: alarmFormSound === 'adhan' ? alarmFormVoice : undefined,
        days: alarmFormDays,
        createdAt: Date.now(),
      };
      updateAlarmsState([newAlarm, ...alarms]);
      setSaveSuccessMsg(`✓ Alaarm cusub (${time12} ${ampm}) ayaa lagu daray oo hadda waa shidan yahay!`);
    }

    setTimeout(() => setSaveSuccessMsg(null), 3500);
    setIsAlarmModalOpen(false);
    setEditingAlarmId(null);
  };

  // Helper to get time N minutes from now in "HH:MM"
  const getFutureTime24 = (addMinutes: number): string => {
    const d = new Date(Date.now() + addMinutes * 60000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleOpenAddAlarm = () => {
    audioAlerts.unlockAudio();
    setEditingAlarmId(null);
    setAlarmFormTime(getFutureTime24(2));
    setAlarmFormLabel('Toosidda Salaadda / Xusuusin');
    setAlarmFormSound('adhan');
    setAlarmFormVoice('makkah');
    setAlarmFormDays([]);
    setIsAlarmModalOpen(true);
  };

  // Instant 1-tap test alarm for +1 minute from now
  const handleQuickAdd1MinAlarm = () => {
    audioAlerts.unlockAudio();
    audioAlerts.requestWakeLock();
    const targetTime = getFutureTime24(1);
    const { time12, ampm } = format24To12Display(targetTime);
    const quickAlarm: CustomAlarm = {
      id: `alarm_${Date.now()}_quick`,
      time: targetTime,
      label: 'Alaarm Degdeg ah (1 Daqiiqo)',
      enabled: true,
      sound: 'adhan',
      selectedVoice: settings.adhanVoice || 'makkah',
      days: [],
      createdAt: Date.now(),
    };
    updateAlarmsState([quickAlarm, ...alarms]);
    setSaveSuccessMsg(
      `⏰ Alaarm tijaabo ah waxaa loo xiray ${time12} ${ampm} (1 daqiiqo ka dib wuu dhici doonaa)!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleOpenEditAlarm = (alarm: CustomAlarm) => {
    audioAlerts.unlockAudio();
    setEditingAlarmId(alarm.id);
    setAlarmFormTime(alarm.time);
    setAlarmFormLabel(alarm.label);
    setAlarmFormSound(alarm.sound);
    setAlarmFormVoice(alarm.selectedVoice || 'makkah');
    setAlarmFormDays(alarm.days || []);
    setIsAlarmModalOpen(true);
  };

  const handleDeleteAlarm = (id: string) => {
    const next = alarms.filter((a) => a.id !== id);
    updateAlarmsState(next);
    setSaveSuccessMsg('🗑️ Alaarm-ka waa la tirtiray.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleToggleAlarm = (id: string) => {
    audioAlerts.unlockAudio();
    const next = alarms.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled, createdAt: Date.now() } : a
    );
    updateAlarmsState(next);
  };

  const handleTestAlarmRing = (alarm: CustomAlarm) => {
    audioAlerts.unlockAudio();
    setTestRingingAlarm(alarm);
  };

  // Preview form sound inside modal
  const [isPreviewingFormSound, setIsPreviewingFormSound] = useState(false);
  const handleToggleFormPreview = () => {
    audioAlerts.unlockAudio();
    if (isPreviewingFormSound) {
      audioAlerts.stopAlarm();
      setIsPreviewingFormSound(false);
    } else {
      setIsPreviewingFormSound(true);
      audioAlerts.playAlarm(alarmFormSound, alarmFormVoice, () => {
        setIsPreviewingFormSound(false);
      });
    }
  };

  // Custom schedule actions
  const handleUpdateScheduleTime = (
    prayer: keyof CustomPrayerSchedule,
    field: 'adhan' | 'iqama',
    val: string
  ) => {
    const currentSchedule = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
    const updated: CustomPrayerSchedule = {
      ...currentSchedule,
      [prayer]: {
        ...currentSchedule[prayer],
        [field]: val,
      },
    };
    if (onUpdateSettings) {
      onUpdateSettings({ customSchedule: updated, useCustomSchedule: true });
    }
    setSaveSuccessMsg('Waqtiga waa la keydiyay!');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleResetSchedule = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        customSchedule: DEFAULT_USER_PRAYER_SCHEDULE,
        useCustomSchedule: false,
      });
    }
    setSaveSuccessMsg('Jadwalka waxaa dib loogu celiyay asalkii hore!');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Calculate upcoming alarm countdown
  const getNextAlarmCountdown = (): string | null => {
    const enabledAlarms = alarms.filter((a) => a.enabled);
    if (enabledAlarms.length === 0) return null;

    const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    let minDiff = Infinity;
    let nextAlarm: CustomAlarm | null = null;

    enabledAlarms.forEach((a) => {
      const [h, m] = a.time.split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return;
      const aMinutes = h * 60 + m;
      let diff = aMinutes - currentMinutes;
      if (diff <= 0) {
        diff += 24 * 60; // Next day
      }
      if (diff < minDiff) {
        minDiff = diff;
        nextAlarm = a;
      }
    });

    if (!nextAlarm) return null;
    const hours = Math.floor(minDiff / 60);
    const mins = minDiff % 60;
    const { time12, ampm } = format24To12Display((nextAlarm as CustomAlarm).time);
    return `${hours > 0 ? `${hours} saac iyo ` : ''}${mins} daqiiqo ka dib — ${time12} ${ampm} (${
      (nextAlarm as CustomAlarm).label
    })`;
  };

  const nextAlarmCountdown = getNextAlarmCountdown();
  const { hms: liveClockHms, ampm: liveClockAmPm } = formatLiveDigitalClock(nowDate);
  const { hour12: formHour12, minute: formMinute, ampm: formAmPm } = parse24To12Parts(alarmFormTime);

  const timerDisplayMins = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
  const timerDisplaySecs = String(timerSecondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in pb-16">
      {/* 1. Header Banner & Mobile-Friendly 3-Column Sub-Tabs Navigation */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#052329] via-[#083038] to-[#041d24] border border-teal-500/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/30 shrink-0">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Saacadda Nool, Alaarm-ka &amp; Aadaanka
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md">
                  Mobile &amp; Tablet Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-200/80 mt-0.5">
                Saacadda tooska ah, alaarmyo leh codka 8 Shiiq, saacadda tirsiga (Timer), iyo jadwalkaaga salaadda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => onTriggerAdhaanOverlay('Duhur')}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs transition flex items-center gap-1.5 shadow active:scale-95 touch-manipulation cursor-pointer"
              title="Tijaabi shaashadda weyn ee aadaanka"
            >
              <Bell className="w-4 h-4 fill-current" />
              <span>Tijaabi Aadaanka 🔔</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-teal-500/20">
          <button
            type="button"
            onClick={() => setActiveSubTab('clock_alarm')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'clock_alarm'
                ? 'bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400 text-slate-950 shadow-lg font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Saacadda &amp; Alaarm ⏰</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('prayers')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'prayers'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0" />
            <span>Codadka Salaadaha (5) 🕌</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('schedule')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'schedule'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Jadwalka Waqtiga</span>
          </button>
        </div>

        {/* Global Volume & Notifications Bar */}
        <div className="pt-2 border-t border-teal-500/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleVolumeChange(volume === 0 ? 100 : 0)}
              className="p-2 rounded-xl bg-black/40 text-teal-300 hover:text-white border border-teal-500/20 transition cursor-pointer"
              title="Codka xir ama fur"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <span className="text-slate-300 font-bold text-[11px] whitespace-nowrap">Codka Guud:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full sm:w-32 accent-teal-400 cursor-pointer"
              />
              <span className="font-mono text-teal-300 font-bold text-[11px] w-9 text-right">
                {volume}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-slate-300 text-[11px]">Digniinta Mobile-ka:</span>
            {isNotificationGranted() ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Waa Furan Tahay</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  audioAlerts.unlockAudio();
                  await requestNotificationPermission();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-bold text-[11px] transition cursor-pointer active:scale-95"
              >
                Furo Digniinta (Bell) 🔔
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: LIVE CLOCK, ALARMS & TIMER (SAACADDA & ALAARM-KA)        */}
      {/* ============================================================== */}
      {activeSubTab === 'clock_alarm' && (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in">
          {/* Big Live Mobile-Friendly Digital Clock Display */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07242e] via-[#093540] to-[#041a22] border-2 border-amber-400/40 p-5 sm:p-8 shadow-2xl text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[11px] sm:text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Saacadda Nool • {cityName}</span>
            </div>

            <div className="flex items-baseline justify-center gap-2 sm:gap-3 py-1 flex-wrap">
              <span className="font-mono tabular-nums text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 tracking-tight drop-shadow-md">
                {liveClockHms}
              </span>
              <span className="font-mono text-lg sm:text-2xl md:text-3xl font-black text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 rounded-2xl">
                {liveClockAmPm}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-teal-200 font-medium">
              {nowDate.toLocaleDateString('so-SO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            {/* Quick Action Buttons right inside the Clock Banner */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenAddAlarm}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-teal-500/25 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                <span>Ku Dar Alaarm Cusub ⏰</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAdd1MinAlarm}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-black text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="Xiro alaarm dhacaya 1 daqiiqo ka dib si aad u tijaabiso"
              >
                <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Alaarm +1 Daqiiqo (Tijaabi)</span>
              </button>
            </div>

            {/* Next Countdown Banner */}
            {nextAlarmCountdown && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/40 border border-amber-400/30 text-amber-300 text-xs font-bold mt-1 animate-in fade-in max-w-full">
                <Timer className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Alaarm-ka xiga: {nextAlarmCountdown}</span>
              </div>
            )}
          </div>

          {/* Mobile Quick Countdown Timer Card (Saacadda Tirsiga Degdegga ah) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#07222b] via-[#092b36] to-[#051a22] border border-cyan-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Saacadda Tirsiga Degdegga ah (Mobile Timer ⏳)
                  </h3>
                  <p className="text-xs text-teal-200/80">
                    Dooro daqiiqado go’an oo markay dhammaadaan kuugu dhawaaqaya Aadaan ama Alaarm.
                  </p>
                </div>
              </div>

              {timerSecondsLeft > 0 && (
                <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 bg-black/50 border border-amber-400/40 px-4 py-1.5 rounded-2xl text-center">
                  {timerDisplayMins}:{timerDisplaySecs}
                </div>
              )}
            </div>

            {/* Preset Timer Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: '1 Daqiiqo', mins: 1 },
                { label: '3 Daqiiqo', mins: 3 },
                { label: '5 Daqiiqo', mins: 5 },
                { label: '10 Daqiiqo', mins: 10 },
                { label: '15 Daqiiqo', mins: 15 },
                { label: '30 Daqiiqo', mins: 30 },
              ].map((preset) => (
                <button
                  key={preset.mins}
                  type="button"
                  onClick={() => handleStartPresetTimer(preset.mins)}
                  className="py-2.5 px-2 rounded-xl bg-black/40 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400 text-cyan-200 font-bold text-xs transition active:scale-95 touch-manipulation cursor-pointer"
                >
                  ⏳ {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Timer Input & Active Timer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-cyan-500/15">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Daqiiqado gaar ah:</span>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customTimerMins}
                  onChange={(e) => setCustomTimerMins(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const m = Number(customTimerMins);
                    if (m > 0) handleStartPresetTimer(m);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition active:scale-95 touch-manipulation cursor-pointer"
                >
                  Bilow ▶
                </button>
              </div>

              {timerSecondsLeft > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning((prev) => !prev)}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      isTimerRunning
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Hakad</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Sii Wad</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSecondsLeft(0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition active:scale-95 cursor-pointer"
                  >
                    Jooji ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alarms Management Card */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#061e27] border border-teal-500/25 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Liiska Alaarmyadaada (Alarms)</span>
                  <span className="text-xs font-bold text-emerald-300 px-2.5 py-0.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                    {alarms.filter((a) => a.enabled).length} Shidan
                  </span>
                </h3>
                <p className="text-xs text-teal-200/80">
                  U xiro alaarmyo saacado go’an oo aad ugu baahan tahay toosid, salaad, ama akhris.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAlarm}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-teal-500/20 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Ku Dar Alaarm Cusub</span>
              </button>
            </div>

            {/* List of Alarms (Mobile-Optimized Cards) */}
            {alarms.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/30 border border-dashed border-teal-500/30 text-center space-y-3">
                <Clock className="w-10 h-10 text-teal-400/60 mx-auto" />
                <h4 className="font-bold text-sm text-white">Weli Ma Jirto Alaarmyo</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Riix batoonka kore si aad ugu darto alaarm-kaaga ugu horreeya ee salaadda ama toosidda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {alarms.map((alarm) => {
                  const { time12, ampm, periodSomali } = format24To12Display(alarm.time);
                  return (
                    <div
                      key={alarm.id}
                      className={`p-4 rounded-3xl border transition-all space-y-3 ${
                        alarm.enabled
                          ? 'bg-[#08222b] border-teal-400/50 shadow-md'
                          : 'bg-black/40 border-teal-500/15 opacity-75'
                      }`}
                    >
                      {/* Top Row: Time + AM/PM + Toggle Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {time12}
                          </span>
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            {ampm} • {periodSomali}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              alarm.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700/40 text-slate-400'
                            }`}
                          >
                            {alarm.enabled ? 'Shidan ✓' : 'Daman'}
                          </span>
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleAlarm(alarm.id)}
                          aria-label={alarm.enabled ? 'Dami alaarm-ka' : 'Shid alaarm-ka'}
                          className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            alarm.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${
                              alarm.enabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Middle Row: Label & Details */}
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-100">
                          {alarm.label}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-teal-300/90 mt-1">
                          <span>
                            {alarm.sound === 'adhan'
                              ? `🕌 Aadaanka (${alarm.selectedVoice?.toUpperCase() || 'MAKKAH'})`
                              : alarm.sound === 'chime'
                              ? '🔔 Chime'
                              : alarm.sound === 'soft_bell'
                              ? '🛎️ Soft Bell'
                              : alarm.sound === 'digital'
                              ? '📟 Digital'
                              : alarm.sound === 'classic'
                              ? '⏰ Classic'
                              : '🌅 Gentle'}
                          </span>
                          <span>•</span>
                          <span>
                            {alarm.days && alarm.days.length > 0
                              ? alarm.days.map((d) => DAYS_NAMES[d]).join(', ')
                              : 'Maalin walba'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Mobile-Friendly Action Buttons */}
                      <div className="pt-2.5 border-t border-teal-500/15 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestAlarmRing(alarm)}
                          className="flex-1 py-2 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tijaabi Codka</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditAlarm(alarm)}
                          className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-teal-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Beddel</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAlarm(alarm.id)}
                          className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 touch-manipulation cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Tirtir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PER-PRAYER ADHAN VOICES SELECTION (SALAAD KASTA GOONI)  */}
      {/* ============================================================== */}
      {activeSubTab === 'prayers' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Info & Master Voice Selector */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#07242e] border border-teal-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Dooro Codka Salaad Kasta Gaarkeeda</span>
                <span className="text-xs font-normal text-teal-300/80">
                  (Fajr, Duhur, Casar, Magrib, Cisha)
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Qof walba wuxuu dooran karaa codka uu rabo salaad kasta. Tusaale ahaan, waxaad Fajr u xulan kartaa Sh. Afasy ama Aadaanka Subaxa, Duhurna Sh. Cali Mulla (Makkah), Casarna Sh. Abdulbasit.
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
              <span className="text-xs text-teal-200 font-bold whitespace-nowrap">
                Codka Master-ka:
              </span>
              <select
                value={settings.adhanVoice || 'makkah'}
                onChange={(e) => handleApplyMasterVoiceToAll(e.target.value as AdhanVoice)}
                className="bg-slate-900 border border-teal-500/40 text-white font-bold text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer"
              >
                {SHEIKH_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5 Prayers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRAYERS_LIST.map((p) => {
              const prayerVoiceId: AdhanVoice =
                settings.prayerVoices?.[p.key] || settings.adhanVoice || p.defaultVoice;
              const chosenSheikh = SHEIKH_VOICES.find((v) => v.id === prayerVoiceId) || SHEIKH_VOICES[0];
              const isVoicePlaying = playingVoiceId === prayerVoiceId;
              const prayerTimeFormatted = formatTime12(prayerTimes[p.key]);

              return (
                <div
                  key={p.key}
                  className={`p-5 rounded-3xl border transition-all space-y-4 relative overflow-hidden flex flex-col justify-between ${
                    isVoicePlaying
                      ? 'bg-gradient-to-br from-[#0c3740] to-[#07242a] border-cyan-400 shadow-xl shadow-cyan-950/60 ring-2 ring-cyan-400/50'
                      : 'bg-[#081e24] hover:bg-[#0c2830] border-teal-500/25 shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Prayer Name & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 rounded-2xl bg-black/40 border border-teal-500/20">
                          {p.icon}
                        </span>
                        <div>
                          <h4 className="font-black text-base text-white tracking-tight">
                            {p.label}
                          </h4>
                          <span className="text-[11px] font-mono text-teal-300 font-semibold">
                            Waqtiga: {prayerTimeFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Equalizer Waveform indicator if playing */}
                      {isVoicePlaying && (
                        <div className="flex items-center gap-1 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/40 text-cyan-300 text-[10px] font-black">
                          <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <span className="w-1.5 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                          <span className="ml-1">Wuu socdaa...</span>
                        </div>
                      )}
                    </div>

                    {/* Sheikh Selection Dropdown */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-teal-200/90 block">
                        Shiiqa Aadaamaya:
                      </label>
                      <div className="relative">
                        <select
                          value={prayerVoiceId}
                          onChange={(e) =>
                            handleSelectPrayerVoice(p.key, e.target.value as AdhanVoice)
                          }
                          className="w-full appearance-none bg-black/60 border border-teal-500/40 rounded-xl px-3 py-2.5 pr-8 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                        >
                          {SHEIKH_VOICES.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} — {v.country}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-teal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sheikh Description */}
                    <div className="p-2.5 rounded-xl bg-black/30 border border-teal-500/10 text-xs text-slate-300 leading-relaxed">
                      <p className="font-semibold text-teal-200 text-[11px] flex items-center gap-1.5">
                        <span>{chosenSheikh.icon}</span>
                        <span>{chosenSheikh.name}</span>
                        <span className="text-[10px] text-teal-300/70">({chosenSheikh.location})</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {chosenSheikh.description}
                      </p>
                    </div>
                  </div>

                  {/* Play & Preview Button */}
                  <div className="pt-2 border-t border-teal-500/15">
                    <button
                      type="button"
                      onClick={() => handleTogglePlayVoice(prayerVoiceId)}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer ${
                        isVoicePlaying
                          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 shadow-md shadow-teal-500/20'
                      }`}
                    >
                      {isVoicePlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Jooji Aadaanka Hadda</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Dhagayso Codka Shiiqa 🎧</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* All 8 Sheikh Showcase Catalog */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#061e27] border border-teal-500/25 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Dhammaan Shiiqyada Caanka ah ee La Heli Karo (8 Cod)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SHEIKH_VOICES.map((voice) => {
                const isSelectedMaster = (settings.adhanVoice || 'makkah') === voice.id;
                const isAudioActive = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                      isSelectedMaster
                        ? 'bg-teal-950/50 border-teal-400/60 ring-1 ring-teal-400/40'
                        : 'bg-black/30 border-teal-500/20 hover:border-teal-400/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{voice.icon}</span>
                        <div>
                          <h5 className="font-bold text-xs text-white">{voice.name}</h5>
                          <p className="text-[10px] text-teal-300">{voice.country}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-snug line-clamp-2">
                        {voice.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-teal-500/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePlayVoice(voice.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          isAudioActive
                            ? 'bg-rose-500 text-white'
                            : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-200'
                        }`}
                      >
                        {isAudioActive ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>{isAudioActive ? 'Jooji' : 'Dhagayso'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyMasterVoiceToAll(voice.id)}
                        className={`text-[10px] font-black px-2 py-1.5 rounded-lg transition ${
                          isSelectedMaster
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {isSelectedMaster ? '✓ Xulan' : 'U yeel Dhammaan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TIMETABLE & CUSTOM SCHEDULE (JADWALKA KHAASKA AH)       */}
      {/* ============================================================== */}
      {activeSubTab === 'schedule' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#051f26] via-[#072933] to-[#041a20] border border-teal-500/30 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-300 shrink-0">
                <Clock className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md">
                    Khaas Ah
                  </span>
                  <span className="text-xs text-teal-200 font-semibold">
                    Tafatireha Waqtiyadaada
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Jadwalkaaga Gaarka ah ee Aadaanka &amp; Aqinka
                </h3>
                <p className="text-xs text-teal-200/80">
                  Halkan toos uga beddel daqiiqad kasta oo Aadaan iyo Aqin ah adiga kuu gaar ah.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetSchedule}
              className="text-xs text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Dib ugu celi asalkii (4:30 AM)</span>
            </button>
          </div>

          {/* Interactive Schedule Grid: 6 Prayers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {[
              { key: 'Fajr', label: 'Subax (Fajr)', icon: '🌅' },
              { key: 'Sunrise', label: 'Duxa (Qorrax)', icon: '☀️' },
              { key: 'Duhur', label: 'Duhur', icon: '🌞' },
              { key: 'Casar', label: 'Casar', icon: '🌤️' },
              { key: 'Maqrib', label: 'Magrib', icon: '🌇' },
              { key: 'Cishe', label: 'Cisha', icon: '🌙' },
            ].map((item) => {
              const currentSchedule = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
              const slot = currentSchedule[item.key as keyof CustomPrayerSchedule] || {
                adhan: '00:00',
                iqama: '00:00',
              };

              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-2xl bg-black/40 border border-teal-500/25 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-extrabold text-sm text-white">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-teal-300 font-mono">
                      {format24To12Display(slot.adhan).time12} {format24To12Display(slot.adhan).ampm}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-300 block mb-1">
                        Aadaan (Waqtiga):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveScheduleSlot({
                            prayerKey: item.key,
                            field: 'adhan',
                            currentTime: slot.adhan,
                            label: `${item.label} - Aadaan`,
                          })
                        }
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-teal-500/50 hover:border-teal-400 rounded-xl px-2.5 py-2.5 text-xs text-white font-mono font-black flex items-center justify-between gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                        title="Dooro saacadda Aadaanka"
                      >
                        <span className="text-teal-300 font-bold">
                          {format24To12Display(slot.adhan).time12} {format24To12Display(slot.adhan).ampm}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">
                        Aqin (Iqaamo):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveScheduleSlot({
                            prayerKey: item.key,
                            field: 'iqama',
                            currentTime: slot.iqama,
                            label: `${item.label} - Aqin`,
                          })
                        }
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 rounded-xl px-2.5 py-2.5 text-xs text-white font-mono font-black flex items-center justify-between gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                        title="Dooro saacadda Iqamada"
                      >
                        <span className="text-amber-300 font-bold">
                          {format24To12Display(slot.iqama).time12} {format24To12Display(slot.iqama).ampm}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT ALARM (MOBILE-SCROLLABLE & 12H PICKER)        */}
      {/* ============================================================== */}
      {isAlarmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => {
            audioAlerts.stopAlarm();
            setIsAlarmModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#08222b] border border-teal-500/40 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-teal-500/20 sticky top-0 bg-[#08222b] z-10">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-white">
                  {editingAlarmId ? 'Wax ka beddel Alaarm-ka' : 'Ku Dar Alaarm Cusub'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioAlerts.stopAlarm();
                  setIsAlarmModalOpen(false);
                }}
                className="text-slate-300 hover:text-white p-1.5 rounded-xl bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAlarm} className="space-y-4">
              {/* Mobile-Friendly 12-Hour Interactive Selector (Hour, Minute, AM/PM) */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-400/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-200">
                    Dooro Saacadda &amp; Daqiiqadda:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAlarmTimePickerOpen(true)}
                    className="font-mono text-sm font-black text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-xl border border-amber-400/40 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                    title="Riix si aad u furto Custom Time Picker-ka"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{format24To12Display(alarmFormTime).time12} {format24To12Display(alarmFormTime).ampm}</span>
                    <span className="text-[10px] text-teal-300 ml-1">Dooro ⏰</span>
                  </button>
                </div>

                {/* Big Button to Open Dedicated Mobile Time Picker with Save Button */}
                <button
                  type="button"
                  onClick={() => setIsAlarmTimePickerOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-teal-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-teal-500/30 border border-amber-400/40 text-amber-200 font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Fur Time Picker-ka Weyn oo leh Badhan Keydin ⏰</span>
                </button>

                {/* 3 Touch Selectors: Hour (1-12), Minute (00-59), AM/PM */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Saacadda
                    </span>
                    <select
                      value={formHour12}
                      onChange={(e) =>
                        setAlarmFormTime(
                          build24TimeFrom12(Number(e.target.value), formMinute, formAmPm)
                        )
                      }
                      className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2.5 py-2.5 text-base font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Daqiiqadda
                    </span>
                    <select
                      value={formMinute}
                      onChange={(e) =>
                        setAlarmFormTime(
                          build24TimeFrom12(formHour12, Number(e.target.value), formAmPm)
                        )
                      }
                      className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-2.5 py-2.5 text-base font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Xilliga
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-teal-500/40">
                      {(['AM', 'PM'] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() =>
                            setAlarmFormTime(build24TimeFrom12(formHour12, formMinute, period))
                          }
                          className={`py-1.5 rounded-lg font-mono text-xs font-black transition cursor-pointer ${
                            formAmPm === period
                              ? 'bg-amber-400 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick 1-Tap Preset Times for Mobile */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-teal-300/80 uppercase block mb-1.5">
                    Dooro Waqti Degdeg ah:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '⚡ +1 Daqiiqo', time: getFutureTime24(1) },
                      { label: '🌅 04:30 AM (Fajr)', time: '04:30' },
                      { label: '🌞 12:30 PM (Duhur)', time: '12:30' },
                      { label: '🌤️ 03:30 PM (Casar)', time: '15:30' },
                      { label: '🌇 06:00 PM (Maqrib)', time: '18:00' },
                      { label: '🌙 07:45 PM (Cishe)', time: '19:45' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAlarmFormTime(preset.time)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          alarmFormTime === preset.time
                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Label Input */}
              <div>
                <label className="text-xs font-bold text-teal-200 block mb-1.5">
                  Magaca / Sababta Alaarm-ka:
                </label>
                <input
                  type="text"
                  placeholder="Tusaale: Toosidda Salaadda Subax"
                  value={alarmFormLabel}
                  onChange={(e) => setAlarmFormLabel(e.target.value)}
                  className="w-full bg-black/50 border border-teal-500/40 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Sound Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-200 block">
                  Codka Alaarm-ka:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'adhan', label: '🕌 Aadaan' },
                    { id: 'chime', label: '🔔 Chime' },
                    { id: 'soft_bell', label: '🛎️ Soft Bell' },
                    { id: 'digital', label: '📟 Digital' },
                    { id: 'classic', label: '⏰ Classic' },
                    { id: 'gentle_morning', label: '🌅 Gentle' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAlarmFormSound(s.id as CustomAlarm['sound'])}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        alarmFormSound === s.id
                          ? 'bg-teal-500 text-slate-950 border-teal-400 shadow font-black'
                          : 'bg-black/30 border-teal-500/20 text-slate-300 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* If Adhan, pick Sheikh */}
                {alarmFormSound === 'adhan' && (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Dooro Shiiqa Aadaanka:
                    </label>
                    <select
                      value={alarmFormVoice}
                      onChange={(e) => setAlarmFormVoice(e.target.value as AdhanVoice)}
                      className="w-full bg-black/60 border border-teal-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none cursor-pointer"
                    >
                      {SHEIKH_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.country})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preview sound button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleFormPreview}
                    className="px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-xs font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isPreviewingFormSound ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isPreviewingFormSound ? 'Jooji Codka' : 'Dhagayso / Tijaabi Codkan 🔊'}</span>
                  </button>
                </div>
              </div>

              {/* Day repeat picker */}
              <div>
                <label className="text-xs font-bold text-teal-200 block mb-1.5">
                  Maalmaha uu dhacayo (Haddii aad ka tagto, maalin walba ayuu dhacayaa):
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_NAMES.map((name, idx) => {
                    const isSelected = alarmFormDays.includes(idx);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAlarmFormDays(alarmFormDays.filter((d) => d !== idx));
                          } else {
                            setAlarmFormDays([...alarmFormDays, idx].sort());
                          }
                        }}
                        className={`h-9 rounded-xl font-bold text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-black shadow'
                            : 'bg-black/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit / Cancel Buttons - Sticky at the bottom so it's always accessible and visible on mobile screens */}
              <div className="sticky bottom-0 bg-[#08222b] pt-3 pb-2 -mx-5 -mb-5 px-5 sm:-mx-6 sm:-mb-6 sm:px-6 border-t-2 border-teal-500/40 flex items-center gap-2.5 z-20 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    audioAlerts.stopAlarm();
                    setIsAlarmModalOpen(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer active:scale-95 transition"
                >
                  Ka Laabo
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-teal-500/30 hover:brightness-110 cursor-pointer active:scale-95 transition ring-2 ring-emerald-300/50"
                >
                  {editingAlarmId ? 'KEYDI ISBEDDELKA ✓' : 'KEYDI ALAARM-KA ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Custom Time Picker Modal for Alarm with Big Save Button */}
      <CustomTimePickerModal
        isOpen={isAlarmTimePickerOpen}
        onClose={() => setIsAlarmTimePickerOpen(false)}
        initialTime24={alarmFormTime}
        onSaveTime={(time24) => setAlarmFormTime(time24)}
        title="Dooro Waqtiga Alaarm-ka"
        subtitle="Xulo saacadda iyo daqiiqadda, kadibna riix Keydi Waqtigan"
        allowClear={false}
      />

      {/* Dedicated Custom Time Picker Modal for Custom Prayer Schedule Slots */}
      {activeScheduleSlot && (
        <CustomTimePickerModal
          isOpen={!!activeScheduleSlot}
          onClose={() => setActiveScheduleSlot(null)}
          initialTime24={activeScheduleSlot.currentTime}
          onSaveTime={(time24) => {
            if (activeScheduleSlot) {
              handleUpdateScheduleTime(
                activeScheduleSlot.prayerKey as keyof CustomPrayerSchedule,
                activeScheduleSlot.field,
                time24
              );
              setActiveScheduleSlot(null);
            }
          }}
          title={`Dooro Saacadda: ${activeScheduleSlot.label}`}
          subtitle="Xulo saacadda adigoo isticmaalaya badhannada, kadibna riix Keydi Waqtigan"
          allowClear={false}
        />
      )}

      {/* ============================================================== */}
      {/* TEST / ACTIVE ALARM RING MODAL                                 */}
      {/* ============================================================== */}
      {testRingingAlarm && (
        <AlarmRingModal
          alarm={testRingingAlarm}
          onDismiss={() => {
            setTestRingingAlarm(null);
          }}
          onSnooze={(mins) => {
            setTestRingingAlarm(null);
            setSaveSuccessMsg(`Alaarm-ka waxaa dib loo dhigay ${mins} daqiiqo.`);
            setTimeout(() => setSaveSuccessMsg(null), 3000);
          }}
        />
      )}
    </div>
  );
};
