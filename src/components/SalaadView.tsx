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
import { useLanguage } from '../utils/i18n';

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
  const { language } = useLanguage();
  const isEn = language === 'en';

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

  const countdownParts = useMemo(() => {
    const h = Math.floor(liveCountdownSecs / 3600);
    const m = Math.floor((liveCountdownSecs % 3600) / 60);
    const s = liveCountdownSecs % 60;
    return { h, m, s };
  }, [liveCountdownSecs]);

  const countdownSummaryText = useMemo(() => {
    if (liveCountdownSecs <= 0) {
      return isEn ? "It's time for prayer!" : 'Waa waqtigii salaadda!';
    }
    const { h, m, s } = countdownParts;
    if (isEn) {
      if (h > 0) {
        return `${h} ${h === 1 ? 'hr' : 'hrs'}, ${m} min & ${s} sec left`;
      }
      return `${m} min & ${s} sec left`;
    } else {
      if (h > 0) {
        return `${h} saac, ${m} daqiiqo iyo ${s} ilbiriqsi`;
      }
      return `${m} daqiiqo iyo ${s} ilbiriqsi`;
    }
  }, [liveCountdownSecs, countdownParts, isEn]);

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

    // Automatically collapse the editor into the sleek 1-line saved pill
    setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: false }));

    setSavedFeedback((prev) => ({ ...prev, [prayer]: true }));
    setTimeout(() => {
      setSavedFeedback((prev) => ({ ...prev, [prayer]: false }));
    }, 2200);
  };

  const handleClearReason = (prayer: PrayerName) => {
    onUpdatePrayer(prayer, {
      reason: '',
      reasonSavedAt: undefined,
    });
    setReasonInputs((prev) => ({ ...prev, [prayer]: '' }));
    setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: false }));
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

      {/* 2. Unified Mobile App Hero Card: Next Prayer + Streak Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2731] via-[#093540] to-[#052129] border border-teal-500/35 p-4 sm:p-5 shadow-2xl shadow-teal-950/60 space-y-4">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        {/* Top Row: Next Prayer Name + Countdown */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                Salaadda Xigta
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 flex-wrap leading-tight">
              <span>{PRAYER_SOMALI_LABELS[nextInfo.nextPrayer]}</span>
              {isFriday && nextInfo.nextPrayer === 'Duhur' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Jumcah 🕌
                </span>
              )}
            </h2>

            <p className="text-xs text-teal-200/85 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
              <span>Aadaanka:</span>
              <span className="font-mono tabular-nums font-black text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-lg">
                {nextInfo.timeString}
              </span>
            </p>
          </div>

          {/* Compact Digital Countdown Box */}
          <div className="shrink-0 text-right" data-no-translate="true">
            {liveCountdownSecs <= 0 ? (
              <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-sm font-black text-amber-300">
                {isEn ? "🕌 Prayer Time!" : '🕌 Waqtigii!'}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-2xl bg-slate-950/60 border border-teal-400/35 text-center shadow-inner">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-teal-300 mb-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-300" />
                  <span>{isEn ? 'Remaining' : 'Ka dhiman'}</span>
                </div>
                <div className="flex items-center justify-center gap-1 font-mono tabular-nums text-lg sm:text-xl font-black text-white leading-none">
                  <span>{String(countdownParts.h).padStart(2, '0')}</span>
                  <span className="text-cyan-400">:</span>
                  <span>{String(countdownParts.m).padStart(2, '0')}</span>
                  <span className="text-cyan-400">:</span>
                  <span className="text-amber-300">{String(countdownParts.s).padStart(2, '0')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row inside Hero: Today's Progress + Streak + Adhkaar Trigger */}
        <div className="pt-3 border-t border-teal-500/20 flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Streak Pill (opens Streak Modal) */}
            <button
              type="button"
              onClick={() => setShowStreakModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-extrabold transition active:scale-95 cursor-pointer"
              title="Taxanaha (Streak) — Riix si aad u dejiso"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />
              <span className="font-mono tabular-nums font-black">{streakDays}</span>
              <span className="text-[11px] text-amber-200/90">Maalmood</span>
            </button>

            {/* Today Stats Summary Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/50 border border-teal-500/25 text-[11px] font-bold text-slate-200">
              <span className="text-emerald-400 font-black">{stats.mosque}</span>
              <span className="text-slate-500">/</span>
              <span className="text-amber-400 font-black">{stats.home}</span>
              <span className="text-slate-500">/</span>
              <span className="text-rose-400 font-black">{stats.missed}</span>
              <span className="text-[10px] text-slate-400 ml-0.5">({totalPrayed}/5)</span>
            </div>

            {streakDays > 0 && (
              <button
                type="button"
                onClick={handleShareStreaks}
                className="p-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white transition active:scale-95 cursor-pointer"
                title="La wadaag guushaada WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onTriggerAdhaanOverlay(nextInfo.nextPrayer)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-md shadow-teal-500/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{isEn ? 'Adhkaar' : 'Adhkaarta'}</span>
          </button>
        </div>
      </div>

      {/* 3. Friday / Jumcah Special Card (Auto visible on Fridays) */}
      {isFriday && onUpdateDay && (
        <FridaySpecialCard dayData={dayData} onUpdateDay={onUpdateDay} />
      )}

      {/* 4. Compact App Section Header: Shanta Salaadood + Quick Actions */}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-white tracking-tight">
            Shanta Salaadood
          </h3>
          <span className="text-[11px] font-black font-mono tabular-nums px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
            {totalPrayed}/5
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isSisterMode && onUpdateDay && (
            <button
              type="button"
              onClick={() => onUpdateDay({ isExcusedDay: !isExcusedDay })}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                isExcusedDay
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                  : 'bg-pink-950/75 hover:bg-pink-900/80 text-pink-200 border border-pink-500/35'
              }`}
              title="Maalmaha Fasaxa Dabiiciga ah (Cudur Sharci)"
            >
              <Heart className="w-3 h-3 shrink-0" />
              <span>{isExcusedDay ? 'Fasax ✓' : 'Fasax'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onBulkUpdate(isSisterMode ? 'early_home' : 'mosque')}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1 active:scale-95 cursor-pointer"
            title={isSisterMode ? 'Calaamadee dhammaan Waqtiga Hore' : 'Calaamadee dhammaan Masaajid'}
          >
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>{isSisterMode ? 'Dhammaan Hore' : 'Dhammaan 🕌'}</span>
          </button>

          {totalPrayed > 0 && (
            <button
              type="button"
              onClick={() => onBulkUpdate('none')}
              className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition active:scale-95 cursor-pointer"
              title="Dib u bilaab dhammaan salaadaha maanta"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isSisterMode && isExcusedDay && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-950/60 to-rose-950/60 border border-pink-500/30 text-pink-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-pink-300 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Maalin Fasax ah (Cudur Sharci):</strong> Salaaddu ma waajibayso maanta, taxanahaaguna (Streak 🔥) sidii buu kuu xafidan yahay!
          </div>
        </div>
      )}

      {/* 5. Individual Prayer Cards (1-Col on Mobile, 2-Col on Tablet, 3-Col on Wide Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 items-start">
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

          // Editor is open ONLY when user explicitly opened it or just tapped Guriga/Dhaaftay without a saved reason
          const isReasonBoxVisible = !isSunrise && !!expandedReasonPrayers[prayer];

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
              <div className="p-3.5 sm:p-4 space-y-3">
                {/* Top Row: Prayer Icon + Name + Time + Audio/Reason Quick Icons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shrink-0 ${
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
                      ) : isSunrise ? (
                        '☀️'
                      ) : (
                        '•'
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                          {somaliName}
                        </h3>
                        {isNext && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/25 border border-teal-400/40 text-cyan-200 uppercase tracking-wider">
                            Xiga
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                        <span className="font-mono tabular-nums font-bold text-teal-300">
                          {timeFormatted}
                        </span>
                        {iqamaFormatted && (
                          <span className="text-[11px] text-amber-300/90 font-mono tabular-nums">
                            • Aqinka: {iqamaFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side of Top Row: Sunrise note OR Audio & Note icon buttons */}
                  {isSunrise ? (
                    <span className="text-[11px] text-amber-300 font-semibold px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      Waqtiga Duha
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Sababta / Note Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleReasonBox(prayer)}
                        className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                          record.reason
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-400/50'
                            : isReasonBoxVisible
                            ? 'bg-slate-700 text-white border border-teal-400/30'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/10'
                        }`}
                        title={record.reason ? 'Fiiri ama beddel sababta' : 'Qor sababta'}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {record.reason && <span className="text-[10px]">✓</span>}
                      </button>

                      {/* Dhageyso Aadaanka Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAdhanSound(prayer)}
                        className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                          isAdhanPlayingThis
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30 animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-teal-500/20'
                        }`}
                        title={isAdhanPlayingThis ? 'Jooji Aadaanka' : 'Dhageyso Aadaanka'}
                      >
                        {isAdhanPlayingThis ? (
                          <Square className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Segmented Control Row for Prayer Status (Only for the 5 prayers) */}
                {!isSunrise && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {isSisterMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = status === 'early_home' ? 'none' : 'early_home';
                          onUpdatePrayer(prayer, { status: next });
                          setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: false }));
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                          status === 'early_home'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25 font-black'
                            : 'bg-slate-900/80 text-pink-200/90 hover:text-white border border-pink-500/20'
                        }`}
                      >
                        <span>🌸 Hore</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdatePrayer(prayer, {
                            status: status === 'mosque' ? 'none' : 'mosque',
                          });
                          setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: false }));
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                          status === 'mosque'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/25'
                            : 'bg-slate-900/80 text-slate-300 hover:text-white border border-white/10'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Masaajid</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const next = status === 'home' ? 'none' : 'home';
                        onUpdatePrayer(prayer, { status: next });
                        setExpandedReasonPrayers((prev) => ({
                          ...prev,
                          [prayer]: next === 'home' && !record.reason,
                        }));
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                        status === 'home'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                          : 'bg-slate-900/80 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5 shrink-0" />
                      <span>Guriga</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = status === 'missed' ? 'none' : 'missed';
                        onUpdatePrayer(prayer, { status: next });
                        setExpandedReasonPrayers((prev) => ({
                          ...prev,
                          [prayer]: next === 'missed' && !record.reason,
                        }));
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                        status === 'missed'
                          ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-black shadow-md shadow-rose-500/25'
                          : 'bg-slate-900/80 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Dhaaftay</span>
                    </button>
                  </div>
                )}

                {/* Sleek 1-Line Saved Reason Pill (When a reason is saved & editor is closed) */}
                {!isSunrise && record.reason && !isReasonBoxVisible && (
                  <div className="pt-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-teal-500/25 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleReasonBox(prayer)}
                      className="flex items-center gap-1.5 min-w-0 text-left flex-1 cursor-pointer group"
                      title="Taabo si aad u beddesho sababta"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-400 font-medium text-[11px] shrink-0">Sababta:</span>
                      <span className="text-amber-200 font-bold truncate group-hover:underline">
                        {record.reason}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleReasonBox(prayer)}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-teal-300 text-[10px] font-bold transition cursor-pointer"
                      >
                        Bedel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearReason(prayer)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        title="Tirtir sababta"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Collapsible Reason Picker (Only visible when actively choosing/editing a reason) */}
              {isReasonBoxVisible && (
                <div
                  className={`px-3.5 pb-3.5 pt-2.5 border-t animate-in fade-in transition-all space-y-2 ${
                    status === 'missed'
                      ? 'border-rose-500/25 bg-rose-950/15'
                      : 'border-amber-500/25 bg-amber-950/15'
                  }`}
                >
                  {/* Compact Header + Close Button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-amber-200/90">
                      {status === 'missed'
                        ? 'Dooro ama qor sababta ay kuugu dhaaftay:'
                        : 'Dooro ama qor sababta aad Guriga ugu tukatay:'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReasonPrayers((prev) => ({ ...prev, [prayer]: false }))
                      }
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Xir"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Compact 1-Tap Chips (Tapping any chip saves & collapses immediately!) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(status === 'missed' ? MISSED_REASON_CHIPS : HOME_REASON_CHIPS).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSaveReasonWithText(prayer, chip)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl transition border cursor-pointer active:scale-95 ${
                          currentReasonText === chip
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                            : 'bg-slate-900/90 text-slate-200 hover:text-white hover:border-amber-400/40 border-white/10'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Single-Row Custom Input + Save Icon Button */}
                  <div className="flex items-center gap-1.5">
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
                      placeholder="Ama qor sabab gaar ah..."
                      className="flex-1 min-w-0 bg-slate-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveReasonWithText(prayer)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Keydi</span>
                    </button>
                  </div>
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
