import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Home,
  XCircle,
  Sparkles,
  Send,
  RotateCcw,
  Flame,
  Clock,
  Compass,
  Building2,
  Calendar,
  AlertCircle,
  Volume2,
  VolumeX,
  Bell,
  Heart,
  Share2,
  Check,
  MessageCircle,
  Edit3,
  Trash2,
  X,
  Play,
  Square,
  FileText,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  DayData,
  PrayerName,
  SalaahRecord,
  SalaahStatus,
  AppSettings,
  AdhanVoice,
} from '../types';
import {
  PRAYER_SOMALI_LABELS,
  PRAYER_ORDER,
  PrayerTimesResult,
  formatTime12,
  timeStringToDecimal,
  getNextPrayerInfo,
} from '../utils/prayerTimes';
import { DailyWisdomCard } from './DailyWisdomCard';
import { FridaySpecialCard } from './FridaySpecialCard';
import { audioAlerts } from '../utils/audioAlerts';
import { StreakInfoModal } from './StreakInfoModal';

interface SalaadViewProps {
  dayData: DayData;
  prayerTimes: PrayerTimesResult;
  activeDateKey: string;
  todayKey: string;
  settings: AppSettings;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  onUpdateDay?: (updates: Partial<DayData>) => void;
  onUpdatePrayer: (prayer: PrayerName, record: Partial<SalaahRecord>) => void;
  onBulkUpdate: (status: SalaahStatus) => void;
  onTriggerAdhaanOverlay: (prayer: PrayerName) => void;
  streakDays: number;
  bestStreakDays: number;
  cityName: string;
  onOpenTab?: (tab: string) => void;
}

// Quick suggested reasons for prayers
const HOME_REASON_CHIPS = [
  'Masaajidka oo fogaa',
  'Xanuun / Cudur',
  'Howlo shaqo / Mashquul',
  'Roob / Cimilo adag',
  'Jidka / Safar ayaan ku jiray',
  'Daryeelka qoyska / Carruurta',
];

const MISSED_REASON_CHIPS = [
  'Hurdo ayaa i qaadday',
  'Waqtiga ayaa iga baxay / I dhaafay',
  'Shaqo mashquul ah',
  'Jidka ayaan ku xannibnaa',
  'Ilaaway xilliga salaadda',
];

export const SalaadView: React.FC<SalaadViewProps> = ({
  dayData,
  prayerTimes,
  activeDateKey,
  todayKey,
  settings,
  onUpdateSettings,
  onUpdateDay,
  onUpdatePrayer,
  onBulkUpdate,
  onTriggerAdhaanOverlay,
  streakDays,
  bestStreakDays,
  cityName,
  onOpenTab,
}) => {
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const [expandedReasonPrayers, setExpandedReasonPrayers] = useState<Record<string, boolean>>({});
  const [savedFeedback, setSavedFeedback] = useState<Record<string, boolean>>({});
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [playingAdhanPrayer, setPlayingAdhanPrayer] = useState<PrayerName | null>(null);

  // Live real-time clock for continuous accurate countdown ticking
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    const interval = setInterval(updateTime, 1000);
    window.addEventListener('focus', updateTime);
    document.addEventListener('visibilitychange', updateTime);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTime);
      document.removeEventListener('visibilitychange', updateTime);
    };
  }, []);

  const nextInfo = useMemo(() => getNextPrayerInfo(prayerTimes, now), [prayerTimes, now]);

  // Exact real-time countdown with seconds
  const liveCountdownSecs = useMemo(() => {
    const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    for (const prayer of PRAYER_ORDER) {
      const prayerTime = prayerTimes[prayer];
      if (prayerTime > currentHour) {
        return Math.max(0, Math.round((prayerTime - currentHour) * 3600));
      }
    }
    // All prayers today passed -> Tomorrow's Fajr
    const secsToMidnight = Math.max(0, Math.round((24 - currentHour) * 3600));
    const fajrSecs = Math.round(prayerTimes.Fajr * 3600);
    return secsToMidnight + fajrSecs;
  }, [prayerTimes, now]);

  const formattedCountdown = useMemo(() => {
    if (liveCountdownSecs <= 0) return 'Waa Waqtigii!';
    const h = Math.floor(liveCountdownSecs / 3600);
    const m = Math.floor((liveCountdownSecs % 3600) / 60);
    const s = liveCountdownSecs % 60;
    if (h > 0) {
      return `${h}s ${m}d ${String(s).padStart(2, '0')}sek`;
    }
    return `${m} daqiiqo ${String(s).padStart(2, '0')} sek`;
  }, [liveCountdownSecs]);

  const isFriday = new Date(activeDateKey + 'T12:00:00').getDay() === 5;
  const isSisterMode = settings.gender === 'female';
  const isExcusedDay = !!dayData.isExcusedDay;

  // Calculate day totals
  const stats = PRAYER_ORDER.reduce(
    (acc, p) => {
      const st = dayData.salaah[p]?.status;
      if (st === 'mosque') acc.mosque++;
      else if (st === 'early_home') {
        acc.earlyHome++;
        acc.mosque++; // counts for excellence
      } else if (st === 'home') acc.home++;
      else if (st === 'missed') acc.missed++;
      else if (st === 'excused') acc.excused++;
      return acc;
    },
    { mosque: 0, home: 0, earlyHome: 0, missed: 0, excused: 0 }
  );

  const totalPrayed = isExcusedDay ? 5 : stats.mosque + stats.home;

  const handleReasonChange = (prayer: string, text: string) => {
    setReasonInputs((prev) => ({ ...prev, [prayer]: text }));
  };

  const handleSaveReasonWithText = (prayer: PrayerName, customText?: string) => {
    const rawText = customText !== undefined ? customText : (reasonInputs[prayer] ?? dayData.salaah[prayer]?.reason ?? '');
    const trimmed = rawText.trim();
    if (!trimmed) return;

    if (customText !== undefined) {
      setReasonInputs((prev) => ({ ...prev, [prayer]: customText }));
    }

    onUpdatePrayer(prayer, {
      reason: trimmed,
      reasonSavedAt: Date.now(),
    });

    setSavedFeedback((prev) => ({ ...prev, [prayer]: true }));
    setTimeout(() => {
      setSavedFeedback((prev) => ({ ...prev, [prayer]: false }));
    }, 2800);
  };

  const handleClearReason = (prayer: PrayerName) => {
    onUpdatePrayer(prayer, {
      reason: '',
      reasonSavedAt: undefined,
    });
    setReasonInputs((prev) => ({ ...prev, [prayer]: '' }));
  };

  const handleToggleReasonBox = (prayer: PrayerName) => {
    setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: !prev[prayer] }));
  };

  // WhatsApp / Social Share for Streaks
  const handleShareStreaks = () => {
    const modeLabel = isSisterMode ? '🌸 Dumar (Waqtigeeda Hore)' : '🕌 Rag (Masaajidka)';
    const msg = `🔥 Alxamdulillah! Waxaan ${streakDays} maalmood si buuxda u dhawray shantii salaadood ee maanta (${modeLabel}) addeegsiga Tuko App!\n\nKa dhawr salaadahaaga halkan: https://ais-pre-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app\n#Tuko #Salaad #Cibaado`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Pre-Adhaan alert calculation
  const alertThreshold = settings.prePrayerAlertMinutes ?? 10;
  const isPrePrayerAlertActive =
    !nextInfo.isPassed &&
    alertThreshold > 0 &&
    nextInfo.minutesRemaining > 0 &&
    nextInfo.minutesRemaining <= alertThreshold;

  const allPrayersWithSunrise: PrayerName[] = [
    'Fajr',
    'Sunrise',
    'Duhur',
    'Casar',
    'Maqrib',
    'Cishe',
  ];

  // Adhan sound listen handler
  const handleToggleAdhanSound = (prayer: PrayerName) => {
    if (playingAdhanPrayer === prayer) {
      audioAlerts.stopAdhan();
      setPlayingAdhanPrayer(null);
    } else {
      audioAlerts.stopAdhan();
      setPlayingAdhanPrayer(prayer);
      audioAlerts.playAdhan(
        prayer === 'Fajr',
        () => {
          setPlayingAdhanPrayer(null);
        },
        prayer === 'Fajr' ? 'fajr' : settings.adhanVoice
      );
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Pre-Adhaan Reminder Banner (Aadaanka Ka Hor) */}
      {isPrePrayerAlertActive && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-teal-500/20 border border-amber-400/50 p-4 shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/30 text-amber-300 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-md">
                  Digniin Aadaan
                </span>
                <span className="text-xs text-amber-100 font-semibold">
                  Isu Diyaari Salaadda
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                <span className="font-mono text-amber-300 font-black">
                  {nextInfo.minutesRemaining} daqiiqo
                </span>{' '}
                ayaa ka dhiman Salaadda{' '}
                <span className="text-cyan-300">
                  {PRAYER_SOMALI_LABELS[nextInfo.nextPrayer]}
                </span>
                !
              </h4>
              <p className="text-xs text-slate-300">
                Waa xilligii weesada, u diyaar-garowga jamaacada, ama salaadda waqtigeeda hore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => audioAlerts.playPrePrayerChime()}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
              title="Dhageyso dhawaaqa xasuusinta"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Dhageyso Chime 🔔</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Hero: Next Prayer Card & Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Prayer Countdown Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2731] via-[#093540] to-[#052129] border border-teal-500/35 p-5 sm:p-6 shadow-2xl shadow-teal-950/60 flex flex-col justify-between">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                  Salaadda Xigta
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 flex-wrap">
                <span>{PRAYER_SOMALI_LABELS[nextInfo.nextPrayer]}</span>
                {isFriday && nextInfo.nextPrayer === 'Duhur' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Jumcah 🕌
                  </span>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-teal-200/85 mt-1 font-medium">
                Waqtiga Aadaanka:{' '}
                <span className="font-mono tabular-nums font-black text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-lg">
                  {nextInfo.timeString}
                </span>{' '}
                • {cityName}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
              <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-400/40 text-cyan-200 text-center w-full sm:w-auto">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-200/90 flex items-center justify-center sm:justify-end gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-300 inline" />
                  <span>Salaadda waxaa ka dhiman</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white mt-0.5 tracking-tight">
                  {formattedCountdown}
                </div>
                <div className="text-[10px] text-teal-300/80 font-medium mt-0.5">
                  (Saacadda waxaa ka dhiman)
                </div>
              </div>

              {/* Shaashadda Aadaanka & Adhkaarta Buuxda */}
              <button
                type="button"
                onClick={() => onTriggerAdhaanOverlay(nextInfo.nextPrayer)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Fur Shaashadda Aadaanka & Adhkaarta oo dhan"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Fur Shaashadda Adhkaarta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Streaks & Today Stat Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#13232c] via-[#0e2c35] to-[#091f26] border border-teal-500/30 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-teal-300/90 mb-2">
              <span>Taxanaha (Streaks)</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono tabular-nums text-amber-300">
                  {streakDays}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {streakDays === 1 ? 'Maalin taxane ah' : 'Maalmood xiriir ah'}
                </span>
              </div>

              {/* Share Streak button */}
              {streakDays > 0 && (
                <button
                  type="button"
                  onClick={handleShareStreaks}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-sm active:scale-95"
                  title="La wadaag guushaada WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Wadaag</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ugu fiicnaa:{' '}
              <span className="text-teal-300 font-bold tabular-nums">
                {bestStreakDays} {bestStreakDays === 1 ? 'maalin' : 'maalmood'}
              </span>
            </p>
            {totalPrayed >= 5 && (
              <div className="mt-2 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-in fade-in">
                <span>
                  {isExcusedDay
                    ? '🌸 Maalmo Udhur (Cudur Sharci) — Ajarkaagu wuu socdaa!'
                    : '🔥 5/5 waa la wada tukaday! Taxanuhu waa badbaado.'}
                </span>
              </div>
            )}
            {/* Help / What is Streak & Setup triggers */}
            <div className="mt-2.5 pt-2 border-t border-teal-500/15 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1 transition active:scale-95"
                title="Waa maxay Taxanaha (Streak)? Riix si aad u akhriso"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Waa maxay Streak?</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-[11px] font-bold text-teal-300 flex items-center justify-center gap-1 transition active:scale-95"
                title="Bilow ama deji streak cusub"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Bilow / Deji</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-teal-500/15 grid grid-cols-3 gap-2 text-center mt-3">
            <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/25">
              <div className="text-[11px] text-emerald-400 font-bold truncate">
                {isSisterMode ? 'Waqtiga Hore' : 'Masaajid'}
              </div>
              <div className="text-base font-black font-mono tabular-nums text-white">
                {stats.mosque}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-500/25">
              <div className="text-[11px] text-amber-400 font-bold">Guriga</div>
              <div className="text-base font-black font-mono tabular-nums text-white">
                {stats.home}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-500/25">
              <div className="text-[11px] text-rose-400 font-bold">Dhaaftay</div>
              <div className="text-base font-black font-mono tabular-nums text-white">
                {stats.missed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Friday / Jumcah Special Card (Auto visible on Fridays) */}
      {isFriday && onUpdateDay && (
        <FridaySpecialCard dayData={dayData} onUpdateDay={onUpdateDay} />
      )}

      {/* 4. Fast Bulk Action Bar & Sister Excused Day (Fasax) Control */}
      <div className="p-4 rounded-2xl bg-slate-900/75 border border-teal-500/20 backdrop-blur-md space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Diiwaanka Maanta:
            </span>
            <span className="text-xs font-black font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/35">
              {totalPrayed} / 5 la tukaday
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isSisterMode
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isSisterMode ? '🌸 Qaybta Gabdhaha' : '🕌 Qaybta Wiilasha'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSisterMode && onUpdateDay && (
              <button
                type="button"
                onClick={() => onUpdateDay({ isExcusedDay: !isExcusedDay })}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                  isExcusedDay
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white ring-2 ring-pink-400/40'
                    : 'bg-pink-950/75 hover:bg-pink-900/80 text-pink-200 border border-pink-500/40'
                }`}
                title="Maalmaha Fasaxa Dabiiciga ah (Cudur Sharci) — salaaddu ma waajibto, taxanahaaguna ma jabo"
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isExcusedDay
                    ? '🌸 Maanta Waa Fasax ✓'
                    : '🌸 Maanta Fasax Waaye (Udhur)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onBulkUpdate(isSisterMode ? 'early_home' : 'mosque')}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white transition border border-emerald-400/35 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{isSisterMode ? 'Dhammaan Waqtiga Hore' : 'Dhammaan Masaajid'}</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkUpdate('home')}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600/75 to-orange-600/75 hover:from-amber-500 hover:to-orange-500 text-white transition border border-amber-400/35 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Dhammaan Guriga</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkUpdate('missed')}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-rose-700/75 to-red-700/75 hover:from-rose-600 hover:to-red-600 text-white transition border border-rose-400/35 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Dhammaan Dhaaftay</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkUpdate('none')}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-white/10 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Dib u bilaab dhammaan salaadaha maanta"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Dib u Bilaab</span>
            </button>
          </div>
        </div>

        {isSisterMode && isExcusedDay && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-pink-950/60 to-rose-950/60 border border-pink-500/30 text-pink-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-pink-300 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Fadliga Diinta Islaamka:</strong> Maanta waxaad calaamadisay{' '}
              <strong>Maalin Fasax ah (Cudur Sharci)</strong>. Salaaddu ma waajibayso maanta, taxanahaaguna (Streak 🔥) sidii buu kuu xafidan yahay!
            </div>
          </div>
        )}
      </div>

      {/* 5. Individual Prayer Cards */}
      <div className="space-y-3.5">
        {allPrayersWithSunrise.map((prayer) => {
          const record = dayData.salaah[prayer] || { status: 'none', reason: '' };
          const status = record.status;
          const timeFormatted = formatTime12(prayerTimes[prayer]);
          const isNext = nextInfo.nextPrayer === prayer;
          const isSunrise = prayer === 'Sunrise';

          // Extract custom iqama time if configured
          const iqamaRaw = settings.customSchedule?.[prayer]?.iqama;
          const iqamaFormatted = iqamaRaw ? formatTime12(timeStringToDecimal(iqamaRaw)) : null;

          const somaliName =
            isFriday && prayer === 'Duhur'
              ? 'Jumcah 🕌'
              : PRAYER_SOMALI_LABELS[prayer];

          const currentReasonText =
            reasonInputs[prayer] !== undefined
              ? reasonInputs[prayer]
              : record.reason || '';

          // Reason box is visible if status is home/missed/early_home, or if user toggled it open, or if a reason is already saved
          const isReasonBoxVisible =
            !isSunrise &&
            (status === 'home' ||
              status === 'early_home' ||
              status === 'missed' ||
              !!expandedReasonPrayers[prayer] ||
              !!record.reason);

          const isAdhanPlayingThis = playingAdhanPrayer === prayer;

          return (
            <div
              key={prayer}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isNext
                  ? 'bg-gradient-to-r from-[#0d2a36] via-[#0c303d] to-[#08222b] border-teal-400/60 shadow-xl shadow-teal-950/40 ring-1 ring-teal-400/30'
                  : 'bg-gradient-to-r from-[#0a1e26] to-[#081a21] border-teal-500/20 hover:border-teal-500/40'
              }`}
            >
              {/* Card Header & Primary Action Row */}
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Prayer Info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base transition-all shrink-0 ${
                      status === 'mosque' || status === 'early_home'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : status === 'home'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : status === 'missed'
                        ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20'
                        : status === 'excused'
                        ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                        : isNext
                        ? 'bg-gradient-to-br from-teal-400/30 to-cyan-400/30 text-teal-300 border border-teal-400/40'
                        : 'bg-slate-800 text-slate-400 border border-white/10'
                    }`}
                  >
                    {status === 'early_home' ? (
                      '🌸'
                    ) : status === 'mosque' ? (
                      '🕌'
                    ) : status === 'home' ? (
                      '🏠'
                    ) : status === 'excused' ? (
                      '🌸'
                    ) : status === 'missed' ? (
                      '✕'
                    ) : (
                      '•'
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base sm:text-lg text-white">
                        {somaliName}
                      </h3>
                      {isNext && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border border-teal-400/40 text-cyan-200">
                          Hadda / Xiga
                        </span>
                      )}
                      {status !== 'none' && !isSunrise && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            status === 'early_home'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : status === 'mosque'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : status === 'home'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : status === 'excused'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {status === 'early_home'
                            ? 'Waqtigeeda Hore'
                            : status === 'mosque'
                            ? 'Masaajidka'
                            : status === 'home'
                            ? 'Guriga'
                            : status === 'excused'
                            ? 'Cudur Sharci'
                            : 'Lama tukan'}
                        </span>
                      )}
                    </div>

                    {/* Aadaan & Aqinka Time Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-950/80 border border-teal-500/35 text-teal-200">
                        <span className="text-[10px] font-black uppercase text-teal-400">
                          Aadaan:
                        </span>
                        <span className="font-mono tabular-nums font-black text-white">
                          {timeFormatted}
                        </span>
                      </span>

                      {iqamaFormatted && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/35 text-amber-200">
                          <span className="text-[10px] font-black uppercase text-amber-400">
                            Aqinka:
                          </span>
                          <span className="font-mono tabular-nums font-black text-white">
                            {iqamaFormatted}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {isSunrise ? (
                    <div className="text-xs text-amber-300 font-semibold px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      ☀️ Waqtiga Salaadda Duha ayaa bilaabata
                    </div>
                  ) : (
                    <>
                      {isSisterMode ? (
                        <>
                          {/* Sister option: Early Home Prayer */}
                          <button
                            type="button"
                            onClick={() => {
                              const next = status === 'early_home' ? 'none' : 'early_home';
                              onUpdatePrayer(prayer, { status: next });
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                              status === 'early_home'
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30 font-black ring-2 ring-pink-400/40'
                                : 'bg-slate-800/90 text-pink-200 hover:text-white hover:bg-slate-700/80 border border-pink-500/25'
                            }`}
                            title="Waxaan ku tukaday Waqtigeeda Hore"
                          >
                            <span>🌸 Waqtiga Hore</span>
                          </button>

                          {/* Sister option: Fasax (Excused) */}
                          <button
                            type="button"
                            onClick={() => {
                              const next = status === 'excused' ? 'none' : 'excused';
                              onUpdatePrayer(prayer, { status: next });
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                              status === 'excused'
                                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30 font-black ring-2 ring-pink-400/40'
                                : 'bg-slate-800/90 text-pink-200 hover:text-white hover:bg-slate-700/80 border border-pink-500/25'
                            }`}
                            title="Fasax (Cudur Sharci — Ma tukan karo)"
                          >
                            <span>🌸 Fasax</span>
                          </button>
                        </>
                      ) : (
                        /* Brother option: Masaajid */
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePrayer(prayer, {
                              status: status === 'mosque' ? 'none' : 'mosque',
                            })
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                            status === 'mosque'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                              : 'bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border border-white/10'
                          }`}
                          title="Waxaan ku tukaday Masaajidka"
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Masaajid</span>
                        </button>
                      )}

                      {/* Button: Guriga (Sets Home AND Opens Reason Input) */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = status === 'home' ? 'none' : 'home';
                          onUpdatePrayer(prayer, { status: next });
                          if (next === 'home') {
                            setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: true }));
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          status === 'home'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40'
                            : 'bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border border-white/10'
                        }`}
                        title="Waxaan ku tukaday Guriga"
                      >
                        <Home className="w-3.5 h-3.5 shrink-0" />
                        <span>Guriga</span>
                      </button>

                      {/* Button: Lama tukan / Dhaaftay (Sets Missed AND Opens Reason Input) */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = status === 'missed' ? 'none' : 'missed';
                          onUpdatePrayer(prayer, { status: next });
                          if (next === 'missed') {
                            setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: true }));
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          status === 'missed'
                            ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-black shadow-md shadow-rose-500/30 ring-2 ring-rose-400/40'
                            : 'bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border border-white/10'
                        }`}
                        title="Lama tukan / Dhaaftay"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Dhaaftay</span>
                      </button>

                      {/* Button: Sababta / Qoraal (Toggles Reason Section Anytime) */}
                      <button
                        type="button"
                        onClick={() => handleToggleReasonBox(prayer)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          record.reason
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-400/50 shadow-sm font-black'
                            : isReasonBoxVisible
                            ? 'bg-slate-700 text-white border border-teal-400/30'
                            : 'bg-slate-800/85 text-slate-300 hover:text-white border border-white/10'
                        }`}
                        title={record.reason ? 'Fiiri ama beddel sababta' : 'Qor sababta aad guriga ugu tukatay ama kuugu dhaaftay'}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>{record.reason ? 'Sababta ✓' : 'Sababta'}</span>
                      </button>

                      {/* Button: Dhageyso Aadaanka */}
                      <button
                        type="button"
                        onClick={() => handleToggleAdhanSound(prayer)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          isAdhanPlayingThis
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 animate-pulse'
                            : 'bg-slate-800/85 hover:bg-slate-700 text-teal-300 border border-teal-500/25'
                        }`}
                        title={isAdhanPlayingThis ? 'Jooji Aadaanka' : 'Dhageyso Aadaanka'}
                      >
                        {isAdhanPlayingThis ? (
                          <>
                            <Square className="w-3.5 h-3.5 shrink-0" />
                            <span>Jooji</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Aadaan</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Sababta Guriga ama Dhaaftay (Interactive, Responsive & Permanent) */}
              {isReasonBoxVisible && (
                <div
                  className={`px-4 sm:px-5 pb-4 pt-3.5 border-t animate-in fade-in transition-all ${
                    status === 'missed'
                      ? 'border-rose-500/30 bg-rose-950/20'
                      : status === 'home' || status === 'early_home'
                      ? 'border-amber-500/30 bg-amber-950/20'
                      : 'border-teal-500/30 bg-teal-950/20'
                  }`}
                >
                  {/* Title & Close / Saved indicator */}
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs font-bold flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle
                        className={`w-4 h-4 shrink-0 ${
                          status === 'missed'
                            ? 'text-rose-400'
                            : status === 'home' || status === 'early_home'
                            ? 'text-amber-400'
                            : 'text-teal-400'
                        }`}
                      />
                      <span
                        className={
                          status === 'missed'
                            ? 'text-rose-200'
                            : status === 'home' || status === 'early_home'
                            ? 'text-amber-200'
                            : 'text-teal-200'
                        }
                      >
                        {status === 'missed'
                          ? 'Sababta Salaaddu kuugu dhaaftay (Dooro ama qor):'
                          : status === 'home' || status === 'early_home'
                          ? 'Sababta aad Guriga ugu tukatay (Dooro ama qor):'
                          : 'Qor sababta ama faallo ku saabsan salaaddan:'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.reason && (
                        <span className="text-[10px] text-teal-300 font-extrabold bg-teal-500/20 px-2 py-0.5 rounded-lg border border-teal-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Diiwaangashan</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleReasonBox(prayer)}
                        className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition"
                        title="Xir meeshan sababta"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 1-Tap Quick Suggestion Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    {(status === 'missed' ? MISSED_REASON_CHIPS : HOME_REASON_CHIPS).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSaveReasonWithText(prayer, chip)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl transition border touch-manipulation active:scale-95 ${
                          currentReasonText === chip
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-sm'
                            : 'bg-black/40 text-slate-300 hover:text-white hover:bg-slate-800 border-white/10'
                        }`}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>

                  {/* Custom Input + Save Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={currentReasonText}
                      onChange={(e) => handleReasonChange(prayer, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveReasonWithText(prayer);
                        }
                      }}
                      onBlur={() => {
                        if (currentReasonText.trim() && currentReasonText !== record.reason) {
                          handleSaveReasonWithText(prayer);
                        }
                      }}
                      placeholder={
                        status === 'missed'
                          ? 'Tusaale: Hurdo ayaa i qaadday, shaqo ayaan ku mashquulay, jidka ayaan ku jiray...'
                          : 'Tusaale: Xanuun/cudur, masaajidka oo fogaa, howlo shaqo, xaalad qoys...'
                      }
                      className={`flex-1 bg-slate-900 border rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                        status === 'missed'
                          ? 'border-rose-500/40 focus:ring-rose-400'
                          : 'border-amber-500/40 focus:ring-amber-400'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => handleSaveReasonWithText(prayer)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shadow-md shrink-0 touch-manipulation ${
                        status === 'missed'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Keydi Sababta</span>
                    </button>
                  </div>

                  {/* Immediate confirmation message */}
                  {savedFeedback[prayer] && (
                    <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>✓ Sababta waa la diray oo si guul leh ayaa loo keydiyay!</span>
                    </div>
                  )}

                  {/* Previously saved reason display with Delete button */}
                  {record.reason && !savedFeedback[prayer] && (
                    <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 font-semibold shrink-0">Sababta la keydiyay:</span>
                        <span className="text-emerald-200 italic font-medium truncate">"{record.reason}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClearReason(prayer)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 text-[10px] font-bold flex items-center gap-0.5 shrink-0"
                        title="Tirtir sababtan"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Tirtir</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Streak Info & Starting Streak Setup Modal */}
      <StreakInfoModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakDays={streakDays}
        bestStreakDays={bestStreakDays}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      {/* 9. Daily Wisdom Card (Aayadda / Xadiiska Maalinta & WhatsApp Share) */}
      <DailyWisdomCard activeDateKey={activeDateKey} />
    </div>
  );
};
