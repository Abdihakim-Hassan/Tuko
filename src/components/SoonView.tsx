import React, { useState, useMemo, useEffect } from 'react';
import {
  Moon,
  Sun,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle,
  Share2,
  Copy,
  Check,
  HeartHandshake,
  Plus,
  Minus,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertCircle,
  Coins,
  DollarSign,
  Calculator,
  Info,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, DayData, PrayerName, QadaaTrackerData, ZakatCalculatorData } from '../types';
import {
  PrayerTimesResult,
  formatTime12,
  getHijriDate,
  PRAYER_ORDER,
  PRAYER_SOMALI_LABELS,
} from '../utils/prayerTimes';

interface SoonViewProps {
  dayData: DayData;
  allDays?: Record<string, DayData>;
  settings?: AppSettings;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  prayerTimes: PrayerTimesResult;
  activeDateKey: string;
  onToggleSoon: (isFasting: boolean) => void;
}

const DEFAULT_QADAA: QadaaTrackerData = {
  fastingOwed: 0,
  fastingCompleted: 0,
  prayersOwed: {
    Fajr: 0,
    Sunrise: 0,
    Duhur: 0,
    Casar: 0,
    Maqrib: 0,
    Cishe: 0,
  },
  prayersCompleted: {
    Fajr: 0,
    Sunrise: 0,
    Duhur: 0,
    Casar: 0,
    Maqrib: 0,
    Cishe: 0,
  },
};

export const SoonView: React.FC<SoonViewProps> = ({
  dayData,
  allDays = {},
  settings,
  onUpdateSettings,
  prayerTimes,
  activeDateKey,
  onToggleSoon,
}) => {
  const [copiedDua, setCopiedDua] = useState<string | null>(null);
  const [qadaaFeedback, setQadaaFeedback] = useState<string | null>(null);

  const isSisterMode = settings?.gender === 'female';
  const qadaa: QadaaTrackerData = useMemo(() => {
    const saved = settings?.qadaaTracker;
    return {
      fastingOwed: saved?.fastingOwed ?? 0,
      fastingCompleted: saved?.fastingCompleted ?? 0,
      prayersOwed: { ...DEFAULT_QADAA.prayersOwed, ...(saved?.prayersOwed || {}) },
      prayersCompleted: { ...DEFAULT_QADAA.prayersCompleted, ...(saved?.prayersCompleted || {}) },
      lastUpdated: saved?.lastUpdated,
    };
  }, [settings?.qadaaTracker]);

  // Count excused days and missed prayers from recorded allDays history
  const historyStats = useMemo(() => {
    let recordedExcusedDays = 0;
    const recordedMissedByPrayer: Record<PrayerName, number> = {
      Fajr: 0,
      Sunrise: 0,
      Duhur: 0,
      Casar: 0,
      Maqrib: 0,
      Cishe: 0,
    };
    let totalRecordedMissed = 0;

    Object.values(allDays).forEach((d) => {
      if (d?.isExcusedDay) {
        recordedExcusedDays++;
      }
      if (d?.salaah) {
        PRAYER_ORDER.forEach((p) => {
          if (d.salaah[p]?.status === 'missed') {
            recordedMissedByPrayer[p] = (recordedMissedByPrayer[p] || 0) + 1;
            totalRecordedMissed++;
          }
        });
      }
    });

    return {
      recordedExcusedDays,
      recordedMissedByPrayer,
      totalRecordedMissed,
    };
  }, [allDays]);

  const updateQadaa = (next: Partial<QadaaTrackerData>, feedbackMsg?: string) => {
    if (!onUpdateSettings) return;
    const updated: QadaaTrackerData = {
      ...qadaa,
      ...next,
      lastUpdated: Date.now(),
    };
    onUpdateSettings({ qadaaTracker: updated });
    if (feedbackMsg) {
      setQadaaFeedback(feedbackMsg);
      setTimeout(() => setQadaaFeedback(null), 3200);
    }
  };

  const handleFastingOwedDelta = (delta: number) => {
    const nextOwed = Math.max(0, qadaa.fastingOwed + delta);
    const nextCompleted = Math.min(qadaa.fastingCompleted, nextOwed);
    updateQadaa({ fastingOwed: nextOwed, fastingCompleted: nextCompleted });
  };

  const handlePayOneFast = () => {
    if (qadaa.fastingOwed <= 0) {
      updateQadaa({ fastingOwed: 1, fastingCompleted: 1 }, '✓ 1 Maalin oo Soon Qadaa ah ayaa lagu daray oo la guday!');
      return;
    }
    if (qadaa.fastingCompleted < qadaa.fastingOwed) {
      const nextComp = qadaa.fastingCompleted + 1;
      updateQadaa(
        { fastingCompleted: nextComp },
        `🎉 Alxamdulillaah! Waxaad gudatay 1 maalin oo Soon Qadaa ah (${nextComp}/${qadaa.fastingOwed}).`
      );
    }
  };

  const handleUndoOneFast = () => {
    if (qadaa.fastingCompleted > 0) {
      updateQadaa({ fastingCompleted: qadaa.fastingCompleted - 1 });
    }
  };

  const handleSyncExcusedDaysToFastingQadaa = () => {
    if (historyStats.recordedExcusedDays <= 0) return;
    const nextOwed = Math.max(qadaa.fastingOwed, historyStats.recordedExcusedDays);
    updateQadaa(
      { fastingOwed: nextOwed },
      `✓ ${historyStats.recordedExcusedDays} maalmood oo fasax (Udhur) ah ayaa lagu daray Qadaa-ga Soonka!`
    );
  };

  const handleSyncMissedPrayersToQadaa = () => {
    const nextPrayersOwed = { ...qadaa.prayersOwed };
    PRAYER_ORDER.forEach((p) => {
      nextPrayersOwed[p] = Math.max(nextPrayersOwed[p] || 0, historyStats.recordedMissedByPrayer[p] || 0);
    });
    updateQadaa(
      { prayersOwed: nextPrayersOwed },
      '✓ Salaadihii ku dhaafay ee diiwaanka ku jiray waxaa lagu soo daray Qadaa-ga Salaadaha!'
    );
  };

  const handlePrayerQadaaOwedDelta = (prayer: PrayerName, delta: number) => {
    const curOwed = qadaa.prayersOwed[prayer] || 0;
    const nextOwed = Math.max(0, curOwed + delta);
    const curComp = qadaa.prayersCompleted[prayer] || 0;
    updateQadaa({
      prayersOwed: { ...qadaa.prayersOwed, [prayer]: nextOwed },
      prayersCompleted: { ...qadaa.prayersCompleted, [prayer]: Math.min(curComp, nextOwed) },
    });
  };

  const handlePayOnePrayerQadaa = (prayer: PrayerName) => {
    const curOwed = qadaa.prayersOwed[prayer] || 0;
    const curComp = qadaa.prayersCompleted[prayer] || 0;
    if (curComp < curOwed) {
      updateQadaa(
        {
          prayersCompleted: { ...qadaa.prayersCompleted, [prayer]: curComp + 1 },
        },
        `✓ Alxamdulillaah! Waxaad soo qallaysay 1 salaad oo ${PRAYER_SOMALI_LABELS[prayer]} ah.`
      );
    }
  };

  const fastingRemaining = Math.max(0, qadaa.fastingOwed - qadaa.fastingCompleted);
  const fastingPercent =
    qadaa.fastingOwed > 0 ? Math.min(100, Math.round((qadaa.fastingCompleted / qadaa.fastingOwed) * 100)) : 0;

  const totalPrayersOwed = PRAYER_ORDER.reduce((sum, p) => sum + (qadaa.prayersOwed[p] || 0), 0);
  const totalPrayersCompleted = PRAYER_ORDER.reduce((sum, p) => sum + (qadaa.prayersCompleted[p] || 0), 0);
  const totalPrayersRemaining = Math.max(0, totalPrayersOwed - totalPrayersCompleted);

  const [activeSubTab, setActiveSubTab] = useState<'soon' | 'sakada'>('soon');

  // Live timer for real-time countdown ticking
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

  // Zakat Calculator State
  const defaultZakat: ZakatCalculatorData = useMemo(() => ({
    cash: 0,
    goldGrams: 0,
    goldPricePerGram: 80,
    silverGrams: 0,
    silverPricePerGram: 1,
    businessGoods: 0,
    debtsOwed: 0,
    familyMembers: 1,
    fitrAmountPerPerson: 3.5,
  }), []);

  const [zakatState, setZakatState] = useState<ZakatCalculatorData>(() => {
    return settings?.zakatCalculator || defaultZakat;
  });

  const [zakatSavedAlert, setZakatSavedAlert] = useState<string | null>(null);

  const handleUpdateZakatField = (field: keyof ZakatCalculatorData, value: number) => {
    const updated = { ...zakatState, [field]: value, lastCalculated: Date.now() };
    setZakatState(updated);
    if (onUpdateSettings) {
      onUpdateSettings({ zakatCalculator: updated });
    }
  };

  const handleResetZakat = () => {
    const resetData = { ...defaultZakat, lastCalculated: Date.now() };
    setZakatState(resetData);
    if (onUpdateSettings) {
      onUpdateSettings({ zakatCalculator: resetData });
    }
    setZakatSavedAlert('Xisaabinta Sakada dib ayaa loo bilaabay');
    setTimeout(() => setZakatSavedAlert(null), 3000);
  };

  // Calculations for Zakat
  const goldPrice = Number(zakatState.goldPricePerGram) || 80;
  const silverPrice = Number(zakatState.silverPricePerGram) || 1;
  const goldNisabThresholdUSD = 85 * goldPrice; // 85 grams of gold
  const silverNisabThresholdUSD = 595 * silverPrice; // 595 grams of silver

  const totalCashUSD = Number(zakatState.cash) || 0;
  const totalGoldValUSD = (Number(zakatState.goldGrams) || 0) * goldPrice;
  const totalSilverValUSD = (Number(zakatState.silverGrams) || 0) * silverPrice;
  const totalGoodsUSD = Number(zakatState.businessGoods) || 0;
  const totalDebtsUSD = Number(zakatState.debtsOwed) || 0;

  const grossAssetsUSD = totalCashUSD + totalGoldValUSD + totalSilverValUSD + totalGoodsUSD;
  const netZakatableWealth = Math.max(0, grossAssetsUSD - totalDebtsUSD);

  const reachesNisab = netZakatableWealth >= goldNisabThresholdUSD;
  const zakatDue = reachesNisab ? netZakatableWealth * 0.025 : 0;
  const zakatMissingFromNisab = reachesNisab ? 0 : Math.max(0, goldNisabThresholdUSD - netZakatableWealth);

  const totalFitrDue = (Number(zakatState.familyMembers) || 1) * (Number(zakatState.fitrAmountPerPerson) || 3.5);

  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  const fajrTime = prayerTimes.Fajr;
  const maqribTime = prayerTimes.Maqrib;

  // Afur countdown (until Maqrib)
  let afurMinutesRemaining = 0;
  if (currentHour < maqribTime && currentHour >= fajrTime) {
    afurMinutesRemaining = Math.max(0, Math.round((maqribTime - currentHour) * 60));
  }

  // Suxuur countdown (until Fajr)
  let suxuurMinutesRemaining = 0;
  if (currentHour >= maqribTime) {
    // until tomorrow's Fajr
    const toMidnight = (24 - currentHour) * 60;
    const fromMidnight = fajrTime * 60;
    suxuurMinutesRemaining = Math.max(0, Math.round(toMidnight + fromMidnight));
  } else if (currentHour < fajrTime) {
    suxuurMinutesRemaining = Math.max(0, Math.round((fajrTime - currentHour) * 60));
  }

  // Check if today is a recommended Sunnah fasting day
  const dayOfWeek = new Date(activeDateKey + 'T12:00:00').getDay();
  const isMonday = dayOfWeek === 1;
  const isThursday = dayOfWeek === 4;
  const isSunnahDay = isMonday || isThursday;

  const formatCountdown = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h} saac iyo ${m} daqiiqo`;
    }
    return `${m} daqiiqo`;
  };

  const handleCopyDua = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDua(id);
    setTimeout(() => setCopiedDua(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Sub-Tab Navigation: Soonka & Afurka vs Xisaabiyaha Sakada & Nisaabka */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-teal-500/25">
        <button
          type="button"
          onClick={() => setActiveSubTab('soon')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'soon'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Moon className="w-4 h-4 shrink-0" />
          <span>Soonka &amp; Afurka</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sakada')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'sakada'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>Xisaabiyaha Sakada &amp; Nisaabka 💰</span>
        </button>
      </div>

      {/* 1. SOONKA & AFURKA VIEW */}
      {activeSubTab === 'soon' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2633] via-[#092d3b] to-[#061d27] border border-teal-500/25 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">🌙</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Soonka, Afurka &amp; Qadaa-ga
              </h2>
              <span className="text-xs text-teal-300 font-semibold">
                {getHijriDate(now)}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            La soco xilliyada Suxuurta, Afurka, iyo Diiwaanka Qadaa-ga Soonka &amp; Salaadaha
          </p>
        </div>

        {/* Fasting Toggle Button */}
        <button
          onClick={() => onToggleSoon(!dayData.soon)}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95 ${
            dayData.soon
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
          }`}
        >
          <CheckCircle className={`w-4 h-4 ${dayData.soon ? 'stroke-[3]' : 'opacity-40'}`} />
          <span>{dayData.soon ? 'Maanta Waan Soomanahay ✓' : 'Maanta Ma Sooman Tahay?'}</span>
        </button>
      </div>

      {/* Sunnah Fasting Notice if Monday or Thursday */}
      {isSunnahDay && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-400/30 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold text-amber-300 block">
              Fadliga Soonka Maanta ({isMonday ? 'Isniin' : 'Khamiis'}):
            </span>
            <span className="text-slate-300">
              Waxaa sunno ah in la soomo maalmaha Isniinta iyo Khamiista, maadaama camallada loo bandhigo Allaah (SWT).
            </span>
          </div>
        </div>
      )}

      {/* Time Cards: Afur & Suxuur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Afur Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#12281e] via-[#0d261a] to-[#071911] border border-emerald-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base text-white">Waqtiga Afurka</h3>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              Maqrib
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-200">
            {formatTime12(maqribTime)}
          </div>

          <div className="text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
            {currentHour < maqribTime && currentHour >= fajrTime ? (
              <span className="text-emerald-300 font-semibold">
                Afurka waxaa ka dhiman: <strong>{formatCountdown(afurMinutesRemaining)}</strong>
              </span>
            ) : (
              <span className="text-slate-400">Waqtigii Afurka wuu dhaafay</span>
            )}
          </div>
        </div>

        {/* Suxuur Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c2430] via-[#09222c] to-[#06151c] border border-teal-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-base text-white">Waqtiga Suxuurta</h3>
            </div>
            <span className="text-xs font-bold font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30">
              Imsaak / Fajr
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-200">
            {formatTime12(fajrTime)}
          </div>

          <div className="text-xs text-slate-300 pt-2 border-t border-teal-500/20">
            <span className="text-cyan-300 font-semibold">
              Suxuurta waxaa ka dhiman: <strong>{formatCountdown(suxuurMinutesRemaining)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QADAA TRACKER: SOONKA & SALAADAHA (GAAR AHAAN GABDHAHA & GUUD) */}
      {/* ============================================================== */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-5 ${
          isSisterMode
            ? 'bg-gradient-to-br from-[#260d1f] via-[#1c0a18] to-[#120610] border-pink-500/35'
            : 'bg-gradient-to-br from-[#0c2430] via-[#091e28] to-[#06141b] border-teal-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <HeartHandshake className={`w-5 h-5 ${isSisterMode ? 'text-pink-400' : 'text-teal-300'}`} />
              <h3 className="text-lg sm:text-xl font-black text-white">
                Diiwaanka Qadaa-ga (Soonka &amp; Salaadaha)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isSisterMode
                ? '🌸 Qaybta Gabdhaha: La soco maalmaha Soonka Ramadaan ee kugu waajibay xilliga fasaxa (Udhurka) iyo salaadaha u baahan qallaynta. (Xusuusin: Salaadaha xilliga Udhurka laguma qalleeyo diinta Islaamka, keliya Soonka ayaa la qalleeyaa).'
                : 'La soco maalmaha Soonka iyo Salaadaha kaa tegay ee aad rabto inaad soo qallayso.'}
            </p>
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-xl text-xs font-extrabold border shrink-0 ${
              isSisterMode
                ? 'bg-pink-500/20 border-pink-400/40 text-pink-200'
                : 'bg-teal-500/20 border-teal-400/40 text-teal-200'
            }`}
          >
            {isSisterMode ? '🌸 Gaar u ah Gabdhaha & Qadaa' : '🕌 Xisaabiyaha Qadaa-ga'}
          </span>
        </div>

        {qadaaFeedback && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{qadaaFeedback}</span>
          </div>
        )}

        {/* 1. Fasting Qadaa Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/35 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>🌙 Qadaa-ga Soonka (Ramadaan / Waajib)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Geli tirada maalmaha lagugu leeyahay oo calaamadee maalin kasta oo aad soonto
              </p>
            </div>

            {isSisterMode && historyStats.recordedExcusedDays > 0 && (
              <button
                type="button"
                onClick={handleSyncExcusedDaysToFastingQadaa}
                className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-[11px] font-bold transition active:scale-95 self-start sm:self-auto"
              >
                🌸 Ka soo qaad maalmaha Fasaxa ({historyStats.recordedExcusedDays} maalmood)
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Guud ahaan Lagugu Leeyahay
              </span>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleFastingOwedDelta(-1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center active:scale-90"
                  title="Ka jar 1 maalin"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-2xl font-black font-mono text-white">
                  {qadaa.fastingOwed}
                </span>
                <button
                  type="button"
                  onClick={() => handleFastingOwedDelta(1)}
                  className="w-7 h-7 rounded-lg bg-teal-500/25 hover:bg-teal-500/40 border border-teal-400/40 text-teal-200 font-black flex items-center justify-center active:scale-90"
                  title="Ku dar 1 maalin"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                La Guday (La Soomay)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-300 mt-1.5">
                {qadaa.fastingCompleted}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Kugu Haray (Waxa ka dhiman Soonka)
              </span>
              <div className="text-2xl font-black font-mono text-amber-300 mt-1.5">
                {fastingRemaining}
              </div>
            </div>
          </div>

          {/* Progress Bar & Action Buttons */}
          <div className="space-y-2.5">
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${fastingPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-medium">
                {fastingRemaining === 0 && qadaa.fastingOwed > 0
                  ? '🎉 Alxamdulillaah! Waad dhammaystirtay dhammaan maalmaha Qadaa-ga Soonka!'
                  : `${fastingPercent}% waa la guday • ${fastingRemaining} maalmood ayaa dhiman`}
              </span>

              <div className="flex items-center gap-2">
                {qadaa.fastingCompleted > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoOneFast}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition active:scale-95"
                  >
                    -1 Ka noqo
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePayOneFast}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Maanta 1 Maalin Qadaa ah Waan Guday</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Missed Prayers Qadaa Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/35 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>🕌 Qadaa-ga Salaadaha Dhaafay ({totalPrayersRemaining} salaadood dhiman)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Salaad kasta oo kaa tagtay oo aad rabto inaad soo qallayso halkan ku xisaabi
              </p>
            </div>

            {historyStats.totalRecordedMissed > 0 && (
              <button
                type="button"
                onClick={handleSyncMissedPrayersToQadaa}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold transition active:scale-95 self-start sm:self-auto"
              >
                🔄 Soo gali {historyStats.totalRecordedMissed} salaadood oo diiwaanka ku jiray
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {PRAYER_ORDER.map((prayer) => {
              const owed = qadaa.prayersOwed[prayer] || 0;
              const comp = qadaa.prayersCompleted[prayer] || 0;
              const rem = Math.max(0, owed - comp);

              return (
                <div
                  key={prayer}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-2 text-center"
                >
                  <div>
                    <div className="text-xs font-extrabold text-teal-300">
                      {PRAYER_SOMALI_LABELS[prayer]}
                    </div>
                    <div className="text-xl font-black font-mono text-white mt-1">
                      {rem}
                      <span className="text-[10px] text-slate-400 font-normal block">
                        dhiman ({comp}/{owed})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePrayerQadaaOwedDelta(prayer, -1)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-xs font-bold"
                      title="Yaree tirada lagu leeyahay"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrayerQadaaOwedDelta(prayer, 1)}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-bold"
                      title="Ku dar 1 salaad oo kugu waajibtay"
                    >
                      +Deyn
                    </button>
                  </div>

                  {rem > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePayOnePrayerQadaa(prayer)}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 font-bold text-[11px] transition active:scale-95"
                    >
                      ✓ Gud 1
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Authentic Duas for Fasting */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-300">
          Ducooyinka Soonka &amp; Afurka ee Sunnada ah:
        </h3>

        {/* Dua 1: Afur */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300">1. Ducada Markaad Afurayso (Sunnah)</span>
            <button
              onClick={() =>
                handleCopyDua(
                  'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ - Dhahaba adh-dhama-u wabtallatil-\'urooq, wa thabatal-ajru in shaa Allaah',
                  'afur1'
                )
              }
              className="text-xs text-slate-400 hover:text-teal-200 flex items-center gap-1"
            >
              {copiedDua === 'afur1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDua === 'afur1' ? 'Waa la guuriyay' : 'Guuri'}</span>
            </button>
          </div>

          <div className="text-xl font-arabic text-amber-200 text-right leading-relaxed" dir="rtl">
            ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ
          </div>

          <p className="text-xs text-slate-300 italic">
            Dhahaba adh-dhama-u wabtallatil-\'urooq, wa thabatal-ajru in shaa Allaah.
          </p>
          <p className="text-xs text-slate-400">
            « Harraadkii wuu tagay, xididdadiina way qoyeen, ajarkuna wuu sugnaaday hadduu Allaah yiraahdo. » (Abu Daawuud).
          </p>
        </div>

        {/* Dua 2: Laka sumtu */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300">2. Ducada labaad ee Afurka</span>
            <button
              onClick={() =>
                handleCopyDua(
                  'اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ - Allaahumma innee laka sumtu, wa \'alaa rizqika aftartu',
                  'afur2'
                )
              }
              className="text-xs text-slate-400 hover:text-teal-200 flex items-center gap-1"
            >
              {copiedDua === 'afur2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDua === 'afur2' ? 'Waa la guuriyay' : 'Guuri'}</span>
            </button>
          </div>

          <div className="text-xl font-arabic text-amber-200 text-right leading-relaxed" dir="rtl">
            اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ
          </div>

          <p className="text-xs text-slate-300 italic">
            Allaahumma innee laka sumtu, wa \'alaa rizqika aftartu.
          </p>
          <p className="text-xs text-slate-400">
            « Ilaahow adiga dartaad ayaan u soomay, rizqigaagana waxaan ku afuray. »
          </p>
        </div>
      </div>
    </div>
  )}

  {/* ============================================================== */}
  {/* 2. XISAABIYAHA SAKADA & NISAABKA TAB */}
  {/* ============================================================== */}
  {activeSubTab === 'sakada' && (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1d1b09] via-[#241e0a] to-[#121005] border border-amber-500/35 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">💰</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Xisaabiyaha Sakada &amp; Nisaabka
              </h2>
              <span className="text-xs text-amber-300 font-semibold">
                Tiirka 3-aad ee Islaamka • Xisaabi Sakadaada Maalka &amp; Fitriga
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Geli hantidaada (lacag, dahab, badeeco) si aad u ogaato haddii ay Nisaabka gaartay iyo inta sako ee kugu waajibka ah.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetZakat}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Dib u bilow</span>
        </button>
      </div>

      {zakatSavedAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{zakatSavedAlert}</span>
        </div>
      )}

      {/* Primary Result & Nisab Comparison Banner */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 transition-all ${
          reachesNisab
            ? 'bg-gradient-to-br from-[#072418] via-[#093322] to-[#041a11] border-emerald-500/50'
            : 'bg-gradient-to-br from-[#261e0b] via-[#211a09] to-[#140f05] border-amber-500/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Xaaladda Nisaabka Hantidaada:
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white mt-0.5 flex items-center gap-2">
              {reachesNisab ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Hantidu waxay gaartay Nisaabka!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-amber-300">Hantidu weli ma gaarin Nisaabka</span>
                </>
              )}
            </h3>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Nisaabka Dahabka (85g):</span>
            <span className="font-mono text-sm font-black text-amber-200">
              ${goldNisabThresholdUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Zakatable Net Wealth */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Wadarta Hantidaada Sakada ku jirta
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
              ${netZakatableWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              (Caddaan + Dahab + Qalin + Badeeco - Deyn)
            </p>
          </div>

          {/* Zakat Due OR Zakat Missing (Sakada waxaa ka dhiman) */}
          <div
            className={`p-4 rounded-2xl border ${
              reachesNisab
                ? 'bg-emerald-950/60 border-emerald-400/50'
                : 'bg-amber-950/60 border-amber-400/50'
            }`}
          >
            {reachesNisab ? (
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 block">
                  Sakada Kugu Waajibka ah (2.5%)
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-200 mt-1">
                  ${zakatDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-emerald-300/80 mt-1">
                  Waa 2.5% (ama 1/40) ee hantidaada, marka ay sannad buuxa (Hawl) kuu joogto.
                </p>
              </>
            ) : (
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sakada waxaa ka dhiman:</span>
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-1">
                  ${zakatMissingFromNisab.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-amber-200/90 mt-1 font-medium">
                  Hantidaadu weli ma gaarin Nisaabka (${goldNisabThresholdUSD.toLocaleString()}). Waxaa ka dhiman lacagtan si ay sako kuugu waajabto.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input Cards: Wealth Breakdown */}
      <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-teal-500/25 space-y-4">
        <h3 className="font-extrabold text-base text-white flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-300" />
          <span>Geli Xisaabta Hantidaada:</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Cash */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              💵 Lacag Caddaan ah &amp; Bankiga ($)
            </label>
            <input
              type="number"
              min="0"
              value={zakatState.cash || ''}
              placeholder="0.00"
              onChange={(e) => handleUpdateZakatField('cash', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-400"
            />
            <span className="text-[10px] text-slate-400 block">
              Lacagta guriga, jeebka, xawaaladda ama bangiga kuu taalla
            </span>
          </div>

          {/* 2. Gold */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 block">
                🥇 Dahab (Garaam ahaan)
              </label>
              <span className="text-[10px] text-amber-300 font-mono">
                ${goldPrice}/g
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={zakatState.goldGrams || ''}
                placeholder="0 garaam"
                onChange={(e) => handleUpdateZakatField('goldGrams', Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-400"
              />
              <div className="text-xs font-mono font-bold text-amber-200 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30">
                =${totalGoldValUSD.toLocaleString()}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Dahabka kaydka ah ama ganacsiga (Nisaabku waa 85 garaam)
            </span>
          </div>

          {/* 3. Silver */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 block">
                🥈 Qalin / Silver (Garaam ahaan)
              </label>
              <span className="text-[10px] text-slate-300 font-mono">
                ${silverPrice}/g
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={zakatState.silverGrams || ''}
                placeholder="0 garaam"
                onChange={(e) => handleUpdateZakatField('silverGrams', Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-400"
              />
              <div className="text-xs font-mono font-bold text-slate-200 px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                =${totalSilverValUSD.toLocaleString()}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Qalinka kaydsan (Nisaabka qalinku waa 595 garaam)
            </span>
          </div>

          {/* 4. Business Goods */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              📦 Hantida Ganacsiga / Badeecada ($)
            </label>
            <input
              type="number"
              min="0"
              value={zakatState.businessGoods || ''}
              placeholder="0.00"
              onChange={(e) => handleUpdateZakatField('businessGoods', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-400"
            />
            <span className="text-[10px] text-slate-400 block">
              Qiimaha jumlad ahaan ee alaabta ganacsiga kuu taalla
            </span>
          </div>

          {/* 5. Deductible Debts */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/20 space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-rose-300 block">
              🧾 Deymaha lagugu leeyahay ee hadda bixintoodu joogto ($ laga jarayo)
            </label>
            <input
              type="number"
              min="0"
              value={zakatState.debtsOwed || ''}
              placeholder="0.00"
              onChange={(e) => handleUpdateZakatField('debtsOwed', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-rose-500/30 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-400"
            />
            <span className="text-[10px] text-slate-400 block">
              Deymaha dhabta ah ee laguugu leeyahay oo la rabo inaad degdeg u bixiso
            </span>
          </div>
        </div>
      </div>

      {/* Zakatul Fitr Calculator */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2633] via-[#092d3b] to-[#061d27] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-300" />
          <div>
            <h3 className="font-extrabold text-base text-white">
              Xisaabiyaha Zakaatul Fitriga (Sakada Soon-furka)
            </h3>
            <span className="text-[11px] text-cyan-200/90">
              Waa waajib qof kasta oo Muslim ah ka bixinayo naftiisa iyo dadka uu quudiyo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              Tirada Xubnaha Qoyska:
            </label>
            <input
              type="number"
              min="1"
              value={zakatState.familyMembers || 1}
              onChange={(e) => handleUpdateZakatField('familyMembers', Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              Qiimaha Qofkiiba ($):
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={zakatState.fitrAmountPerPerson || 3.5}
              onChange={(e) => handleUpdateZakatField('fitrAmountPerPerson', Math.max(1, parseFloat(e.target.value) || 3.5))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-400 block">
              Ama 2.5 kg oo raashinka magaalada ah (Bariis, Bur, iwm.)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
              Wadarta Zakaatul Fitriga:
            </span>
            <div className="text-2xl font-black font-mono text-cyan-200 mt-1">
              ${totalFitrDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-cyan-300/80">
              {zakatState.familyMembers} xubnood × ${(Number(zakatState.fitrAmountPerPerson) || 3.5).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Fiqh Guidance Note */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 space-y-2">
        <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Xusuusin Muhiim ah oo ku saabsan Sakada:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
          <li><strong>Nisaabka:</strong> Waa xaddiga ugu yar ee ay tahay in hantidu gaarto si ay sako ugu waajabto (85 garaam oo dahab ah).</li>
          <li><strong>Hawl (Sannad buuxa):</strong> Hantidu waa inay kuu joogtaa 1 sano oo Hijri ah (354 maalmood) iyadoo Nisaabka haysata.</li>
          <li><strong>Heerka Sakada:</strong> Waa 2.5% (ama 1/40) wadarta hantidaada saafiga ah.</li>
          <li><strong>Yaa la siiyaa:</strong> 8-da qaybood ee lagu xusay Suuradda At-Tawbah (Fuqarada, Masaakiinta, iwm).</li>
        </ul>
      </div>
    </div>
  )}
</div>
);
};
