import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Flame,
  Plus,
  Minus,
  RotateCcw,
  Trophy,
  Sparkles,
  Search,
  Check,
  CheckCheck,
  LayoutGrid,
  List,
  Compass,
  Star,
  BookMarked,
  Filter,
  X,
  Undo2,
  Trash2,
  Headphones,
  Volume2,
} from 'lucide-react';
import { QuranReaderModal } from './QuranReaderModal';
import { AppSettings, DayData } from '../types';
import {
  QURAN_SURAHS,
  DAILY_RECOMMENDED_SURAHS,
  SurahInfo,
  getSurahPageRange,
  getSurahPageCount,
} from '../utils/quranData';

interface QuranViewProps {
  dayData: DayData;
  allDays: Record<string, DayData>;
  activeDateKey: string;
  settings?: AppSettings;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  onUpdateQuran: (pages: number) => void;
  onDeductPages?: (amount: number) => void;
  onToggleSurah: (surahNumber: number, pageDelta?: number) => void;
  onSetSurahs: (surahs: number[]) => void;
  onApplyUserQuranJourney?: () => void;
}

const QURAN_TOTAL_PAGES = 604;

export const QuranView: React.FC<QuranViewProps> = ({
  dayData,
  allDays,
  activeDateKey,
  settings,
  onUpdateSettings,
  onUpdateQuran,
  onDeductPages,
  onToggleSurah,
  onSetSurahs,
  onApplyUserQuranJourney,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [khatmDaysGoal, setKhatmDaysGoal] = useState<number>(() => settings?.khatmPlan?.targetDays || 30);

  const handleSelectKhatmDays = (days: number) => {
    setKhatmDaysGoal(days);
    if (onUpdateSettings) {
      onUpdateSettings({
        khatmPlan: {
          targetDays: days,
          startDate: settings?.khatmPlan?.startDate || activeDateKey,
        },
      });
    }
  };
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'allTime' | 'today' | 'previously' | 'remaining' | 'recommended' | 'makki' | 'madani' | 'juz30'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [previousPagesState, setPreviousPagesState] = useState<number | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerSurahNumber, setReaderSurahNumber] = useState(1);

  const handleOpenReader = (surahNumber: number = 1) => {
    setReaderSurahNumber(surahNumber);
    setIsReaderOpen(true);
  };

  // Read Surahs for today (1-114)
  const todaySurahs: number[] = useMemo(() => {
    return Array.isArray(dayData.quranSurahs) ? dayData.quranSurahs : [];
  }, [dayData.quranSurahs]);

  const todayPages = Number(dayData.quran) || 0;

  // Total pages across all recorded time
  const totalPagesAllTime = useMemo(() => {
    return Object.values(allDays).reduce(
      (sum, d) => sum + (Number(d?.quran) || 0),
      0
    );
  }, [allDays]);

  const currentCyclePages = totalPagesAllTime % QURAN_TOTAL_PAGES;
  const khatmahsCompleted = Math.floor(totalPagesAllTime / QURAN_TOTAL_PAGES);
  const cyclePercent = Math.min(
    100,
    Math.round((currentCyclePages / QURAN_TOTAL_PAGES) * 100)
  );

  // All unique surahs completed across all recorded days for this user
  const allTimeSurahs = useMemo(() => {
    const set = new Set<number>();
    Object.values(allDays).forEach((d) => {
      if (Array.isArray(d?.quranSurahs)) {
        d.quranSurahs.forEach((n) => set.add(n));
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [allDays]);

  // Previously read surahs (read in past days)
  const previouslyReadSurahs = useMemo(() => {
    return allTimeSurahs.filter((n) => !todaySurahs.includes(n));
  }, [allTimeSurahs, todaySurahs]);

  // Remaining unread surahs
  const remainingSurahs = useMemo(() => {
    return QURAN_SURAHS.map((s) => s.number).filter((n) => !allTimeSurahs.includes(n));
  }, [allTimeSurahs]);

  // Consecutive reading streak
  const readingStreak = useMemo(() => {
    let streak = 0;
    const cursorDate = new Date(activeDateKey + 'T12:00:00');
    while (true) {
      const key = cursorDate.toISOString().slice(0, 10);
      const entry = allDays[key];
      if (
        entry &&
        (Number(entry.quran) > 0 || (Array.isArray(entry.quranSurahs) && entry.quranSurahs.length > 0))
      ) {
        streak++;
        cursorDate.setDate(cursorDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [allDays, activeDateKey]);

  // Handlers for adding pages
  const handleAddPages = (amount: number, label?: string) => {
    setPreviousPagesState(todayPages);
    const newTotal = todayPages + amount;
    onUpdateQuran(newTotal);
    setLastActionMessage(
      `✓ Waxaa lagu daray +${amount} bog${label ? ` (${label})` : ''} • Wadarta maanta waa ${newTotal} bog.`
    );
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Handlers for subtracting/deleting pages (from both today AND ongoing Khatmah!)
  const handleSubtractPages = (amount: number, label?: string) => {
    if (totalPagesAllTime <= 0 && todayPages <= 0) {
      setLastActionMessage(
        '⚠️ Tirada Khatmada iyo Maantaba mar horeba waa 0 bog, lagama sii jari karo wax intaas ka yar.'
      );
      setTimeout(() => setLastActionMessage(null), 3500);
      return;
    }

    setPreviousPagesState(todayPages);

    if (onDeductPages) {
      onDeductPages(amount);
    } else {
      const newTotal = Math.max(0, todayPages - amount);
      onUpdateQuran(newTotal);
    }

    const newKhatmahCycle = Math.max(0, (totalPagesAllTime - amount) % QURAN_TOTAL_PAGES);
    setLastActionMessage(
      `✓ Waxaa laga jaray -${amount} bog${label ? ` (${label})` : ''} • Khatmada socota waxay hadda maraysaa ${newKhatmahCycle} / ${QURAN_TOTAL_PAGES} bog.`
    );
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Direct set
  const handleSetExactPages = (pages: number) => {
    setPreviousPagesState(todayPages);
    const safe = Math.max(0, Math.min(604, pages));
    onUpdateQuran(safe);
    setLastActionMessage(`✓ Bogagga maanta waxaa loo dejiyay ${safe} bog.`);
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Undo last action
  const handleUndo = () => {
    if (previousPagesState !== null) {
      const restored = previousPagesState;
      setPreviousPagesState(null);
      onUpdateQuran(restored);
      setLastActionMessage(`↩ Dib ayaa loogu celiyay ${restored} bog.`);
      setTimeout(() => setLastActionMessage(null), 3000);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent, mode: 'add' | 'subtract' | 'set') => {
    e.preventDefault();
    const rawVal = parseInt(customInput.trim(), 10);
    const hasNum = !isNaN(rawVal) && rawVal > 0;
    const val = hasNum ? rawVal : (mode === 'set' ? 20 : 1);

    if (mode === 'add') {
      handleAddPages(val);
    } else if (mode === 'subtract') {
      handleSubtractPages(val);
    } else {
      handleSetExactPages(val);
    }
    setCustomInput('');
  };

  const handleResetPages = () => {
    setPreviousPagesState(todayPages);
    onUpdateQuran(0);
    setLastActionMessage('✓ Dhammaan bogaggii maanta waa la eberiyay (0 bog).');
    setTimeout(() => setLastActionMessage(null), 3500);
  };

  const handleResetSurahs = () => {
    onSetSurahs([]);
    setLastActionMessage('✓ Dhammaan suuradihii maanta waa la saaray (0 suuradood).');
    setTimeout(() => setLastActionMessage(null), 3500);
  };

  const handleResetAllToday = () => {
    setPreviousPagesState(todayPages);
    onUpdateQuran(0);
    onSetSurahs([]);
    setLastActionMessage('✓ Wax walba oo maanta ku qornaa (bogag & suurado) waa la wada eberiyay (0)!');
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  const handleSetOnly49To53 = () => {
    setPreviousPagesState(todayPages);
    onSetSurahs([49, 50, 51, 52, 53]);
    onUpdateQuran(15);
    setLastActionMessage('✓ Maanta waxaa loo qoray: 15 bog iyo suuradaha 49 ilaa 53!');
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Mark surah as read (Sax ✓) and automatically add pages
  const handleMarkSurahSax = (surah: SurahInfo) => {
    const pageRange = getSurahPageRange(surah.number);
    setPreviousPagesState(todayPages);
    onToggleSurah(surah.number, pageRange.count);
    setLastActionMessage(
      `✓ Suuradda ${surah.nameSomali} waa la calaamadeeyay (+${pageRange.count} bog ayaa otomaatik ugu darsamay).`
    );
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Unmark surah as read (Qalad / Kabxis ✕) and automatically subtract pages
  const handleUnmarkSurahQalad = (surah: SurahInfo) => {
    const pageRange = getSurahPageRange(surah.number);
    setPreviousPagesState(todayPages);
    onToggleSurah(surah.number, -pageRange.count);
    setLastActionMessage(
      `✕ Suuradda ${surah.nameSomali} waa laga saaray (-${pageRange.count} bog ayaa otomaatik uga go'ay).`
    );
    setTimeout(() => setLastActionMessage(null), 4000);
  };

  // Add pages of a specific surah to daily total
  const handleAddSurahPages = (surah: SurahInfo) => {
    const pageRange = getSurahPageRange(surah.number);
    handleAddPages(pageRange.count, surah.nameSomali);
    // Also ensure surah is checked as read
    if (!todaySurahs.includes(surah.number)) {
      onToggleSurah(surah.number);
    }
  };

  // Subtract pages of a specific surah
  const handleSubtractSurahPages = (surah: SurahInfo) => {
    const pageRange = getSurahPageRange(surah.number);
    handleSubtractPages(pageRange.count, surah.nameSomali);
  };

  // Select recommended daily surahs
  const handleSelectDailyRecommended = () => {
    const recNumbers = DAILY_RECOMMENDED_SURAHS.map((s) => s.number);
    const combined = Array.from(new Set([...todaySurahs, ...recNumbers])).sort((a, b) => a - b);
    onSetSurahs(combined);
  };

  // Filtered surahs list
  const filteredSurahs = useMemo(() => {
    return QURAN_SURAHS.filter((surah) => {
      // Search matching
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchNum = surah.number.toString() === query;
        const matchSomali = surah.nameSomali.toLowerCase().includes(query);
        const matchArabic = surah.nameArabic.includes(query);
        const matchMeaning = surah.meaningSomali.toLowerCase().includes(query);
        if (!matchNum && !matchSomali && !matchArabic && !matchMeaning) {
          return false;
        }
      }

      // Tab filter
      if (selectedFilter === 'allTime') {
        return allTimeSurahs.includes(surah.number);
      }
      if (selectedFilter === 'today') {
        return todaySurahs.includes(surah.number);
      }
      if (selectedFilter === 'previously') {
        return previouslyReadSurahs.includes(surah.number);
      }
      if (selectedFilter === 'remaining') {
        return remainingSurahs.includes(surah.number);
      }
      if (selectedFilter === 'recommended') {
        return DAILY_RECOMMENDED_SURAHS.some((r) => r.number === surah.number);
      }
      if (selectedFilter === 'makki') {
        return surah.type === 'Makki';
      }
      if (selectedFilter === 'madani') {
        return surah.type === 'Madani';
      }
      if (selectedFilter === 'juz30') {
        return surah.juz === 30;
      }
      return true;
    });
  }, [searchQuery, selectedFilter, todaySurahs, allTimeSurahs, previouslyReadSurahs, remainingSurahs]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      {/* Header Banner - Responsive across mobile, tablet, laptop */}
      <div className="p-4 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#0c2738] via-[#093245] to-[#061c27] border border-teal-500/30 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 p-[2px] shadow-lg shadow-teal-500/20 shrink-0">
                <div className="w-full h-full bg-[#0a1e28] rounded-[14px] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-amber-300" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Diiwaanka Qur'aanka Kariimka
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Daba-gal bogagga aad maalin walba akhriso, tirtir ama jar waxaad ku dartay, arag tirada
              rasmiga ah ee bogagga suurad kasta, oo gaadh Khatmooyin barakaysan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {readingStreak > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-amber-300 shadow-md">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 animate-bounce" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-300/80">
                    Taxanaha
                  </div>
                  <div className="text-sm sm:text-base font-black leading-none">{readingStreak} Maalmood</div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowOpinionModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ra'yi &amp; Talo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Pages */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0c2530] to-[#071c24] border border-teal-500/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-teal-300">
              Bogagga Maanta
            </span>
            <BookMarked className="w-4 h-4 text-teal-400 opacity-60" />
          </div>
          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-cyan-300">
                {todayPages}
              </div>
              <span className="text-[11px] text-slate-400">
                {todayPages} bog ayaa la akhriyay maanta
              </span>
            </div>
            {/* Quick +/- stepper buttons */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAddPages(1)}
                className="w-8 h-8 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/40 text-teal-200 font-black text-base flex items-center justify-center transition active:scale-90 shadow cursor-pointer"
                title="Ku dar +1 bog"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleSubtractPages(1)}
                className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 font-black text-base flex items-center justify-center transition active:scale-90 shadow cursor-pointer"
                title="Ka jar -1 bog"
              >
                -
              </button>
            </div>
          </div>
          <div className="text-[10px] text-teal-400/80 font-medium">Hadafka maanta: 20 bog</div>
        </div>

        {/* Today's Surahs Count */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0d2a20] to-[#071d16] border border-emerald-500/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300">
              Suuradaha Maanta
            </span>
            <CheckCheck className="w-4 h-4 text-emerald-400 opacity-60" />
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-emerald-300">
              {todaySurahs.length}
              <span className="text-sm sm:text-base font-normal text-emerald-400/60 font-sans">
                {' '}
                / 114
              </span>
            </div>
            <span className="text-[11px] text-amber-300 font-bold block mt-0.5">
              {todaySurahs.length > 0
                ? `⭐ ${todaySurahs.length} Suuradood maanta`
                : 'Dooro suuradaha aad maanta akhriday'}
            </span>
          </div>
          <div className="text-[10px] text-emerald-400/80 font-medium">
            {todaySurahs.length} suuradood ayaa la dhammeeyay maanta
          </div>
        </div>

        {/* Current Khatmah Cycle */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1e2311] via-[#212d14] to-[#141d0b] border border-amber-500/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300">
              Khatmada Socota
            </span>
            <Compass className="w-4 h-4 text-amber-400 opacity-60" />
          </div>
          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-amber-300">
                {currentCyclePages}
                <span className="text-xs sm:text-sm font-normal text-amber-400/60">
                  {' '}
                  / {QURAN_TOTAL_PAGES}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{cyclePercent}% Dhammaystiran</span>
            </div>
            {/* Direct +/- buttons on Khatmah card */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAddPages(1, 'Khatmada')}
                className="w-8 h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 font-black text-base flex items-center justify-center transition active:scale-90 shadow cursor-pointer"
                title="Ku dar +1 bog Khatmada socota"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleSubtractPages(1, 'Khatmada')}
                className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 font-black text-base flex items-center justify-center transition active:scale-90 shadow cursor-pointer"
                title="Ka jar -1 bog Khatmada socota"
              >
                -
              </button>
            </div>
          </div>
          <div className="w-full bg-amber-950/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${cyclePercent}%` }}
            />
          </div>
        </div>

        {/* Total Surahs Read All-Time (User: 66 - Suuradaha 49-114) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1a122e] to-[#120a22] border border-purple-500/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-300">
              Suuradaha Guud ee La Akhriyay
            </span>
            <Trophy className="w-4 h-4 text-purple-400 opacity-60" />
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-purple-300 flex items-center gap-2">
              <span>{allTimeSurahs.length}</span>
              <span className="text-xs sm:text-sm font-normal text-purple-400/60 font-sans">
                / 114
              </span>
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 ml-auto" />
            </div>
            <span className="text-[11px] text-amber-300 font-bold block mt-0.5">
              {allTimeSurahs.length === 66
                ? '⭐ 66 Suuradood (49 ilaa 114)'
                : `${allTimeSurahs.length} suuradood la dhammeeyay`}
            </span>
          </div>
          <div className="text-[10px] text-purple-300/80 font-medium">
            Alxamdulillaah • Guud ahaan: {totalPagesAllTime} bog
          </div>
        </div>
      </div>

      {/* Progress Bar towards current Khatmah */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-300 mb-2.5">
          <span>Heerka Khatmada Hadda: {currentCyclePages} ee 604 bog</span>
          <span className="text-teal-300 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-500/30 self-start sm:self-auto">
            {cyclePercent}% Dhammaystiran ({604 - currentCyclePages} bog ayaa dhiman)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-[1px] shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${cyclePercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 mt-2">
          <span>Bogga 1 (Al-Faatixa)</span>
          <span className="hidden sm:inline">Bogga 302 (Al-Kahf / Dhexe)</span>
          <span>Bogga 604 (An-Naas)</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 30-DAY KHATM PLANNER (JADWALKA KHATINKA QUR'AANKA SALAAD KASTA) */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2633] via-[#092b38] to-[#061821] border border-amber-500/35 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-300" />
              <h3 className="text-base sm:text-lg font-black text-white">
                Jadwalka Khatinka Qur'aanka (30-Day Khatm Planner)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Dooro muddada aad rabto inaad ku dhammayso Qur'aanka Kariimka (604 bog) — xisaabiyuhu wuxuu kuu sheegayaa inta bog ee aad salaad kasta ka dib akhrinayso!
            </p>
          </div>

          {/* Goal Days Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto shrink-0">
            {[
              { days: 15, label: '15 Maalmood' },
              { days: 30, label: '30 Maalmood (Bil)' },
              { days: 60, label: '60 Maalmood' },
              { days: 90, label: '90 Maalmood' },
            ].map((plan) => (
              <button
                key={plan.days}
                type="button"
                onClick={() => handleSelectKhatmDays(plan.days)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                  khatmDaysGoal === plan.days
                    ? 'bg-gradient-to-r from-amber-400 to-teal-400 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {plan.label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const pagesPerDayGoal = Math.ceil(QURAN_TOTAL_PAGES / khatmDaysGoal);
          const pagesPerPrayerGoal = Math.max(1, Math.ceil(pagesPerDayGoal / 5));
          const pagesRemainingInKhatm = Math.max(0, QURAN_TOTAL_PAGES - currentCyclePages);
          const daysLeftAtTargetPace = Math.ceil(pagesRemainingInKhatm / pagesPerDayGoal);
          const todayGoalMet = todayPages >= pagesPerDayGoal;

          return (
            <div className="space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/25">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                    Hadafka Maalintii
                  </span>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {pagesPerDayGoal} <span className="text-xs font-normal text-slate-400">bog</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-teal-500/25">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                    Salaad Kasta Ka Dib
                  </span>
                  <div className="text-2xl font-black font-mono text-teal-300 mt-1">
                    {pagesPerPrayerGoal} <span className="text-xs font-normal text-slate-400">bog</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/25">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                    Maanta La Akhriyay
                  </span>
                  <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
                    {todayPages} / {pagesPerDayGoal}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/25">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                    Maalmaha Kuugu Haray
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
                    {daysLeftAtTargetPace} <span className="text-xs font-normal text-slate-400">maalmood</span>
                  </div>
                </div>
              </div>

              {/* 5 Daily Prayers Breakdown with 1-Click Log */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-teal-200">
                    🕌 Qorshaha 5-ta Salaadood ee Maanta (Riix salaad kasta markaad akhriso {pagesPerPrayerGoal} bog):
                  </span>
                  {todayGoalMet && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                      🎉 Hadafkii Maanta Waa La Gaaray!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { name: 'Subax (Fajr)', icon: '🌅', slot: 1 },
                    { name: 'Duhur', icon: '🌞', slot: 2 },
                    { name: 'Casar', icon: '🌤️', slot: 3 },
                    { name: 'Maqrib', icon: '🌇', slot: 4 },
                    { name: 'Cishe', icon: '🌙', slot: 5 },
                  ].map((item) => {
                    const slotDone = todayPages >= item.slot * pagesPerPrayerGoal;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleAddPages(pagesPerPrayerGoal, `Wirdiga ${item.name}`)}
                        className={`p-3 rounded-2xl border text-center transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                          slotDone
                            ? 'bg-gradient-to-br from-emerald-600/40 to-teal-700/40 border-emerald-400/60 text-white shadow-md'
                            : 'bg-slate-900/90 hover:bg-slate-800 border-white/10 text-slate-200'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-extrabold">{item.name}</span>
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                            slotDone
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          }`}
                        >
                          {slotDone ? `✓ +${pagesPerPrayerGoal} Bog` : `+${pagesPerPrayerGoal} Bog`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Action Feedback Banner */}
      {lastActionMessage && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950 to-emerald-950 border border-teal-400/40 text-teal-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <span>{lastActionMessage}</span>
          {previousPagesState !== null && (
            <button
              onClick={handleUndo}
              className="px-2.5 py-1 rounded-xl bg-teal-400 text-slate-950 hover:bg-teal-300 font-extrabold text-xs transition flex items-center gap-1 shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Ka noqo</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD & SUBTRACT / DELETE PAGES CONTROLS (TIRTIRID & JARID BOGAGGA) */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0a232d] to-[#071921] border border-teal-500/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-300">
              Maamul Bogagga Maanta (Ku dar • Ka jar • Tirtir)
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {previousPagesState !== null && (
              <button
                onClick={handleUndo}
                className="text-xs text-teal-300 hover:text-teal-100 flex items-center gap-1 transition px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20"
                title="Dib ugu noqo tiradii hore"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Ka noqo (Undo)</span>
              </button>
            )}

            {todayPages > 0 && (
              <button
                onClick={handleResetPages}
                className="text-xs text-rose-300 hover:text-rose-100 flex items-center gap-1 transition px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30"
                title="Tirtir dhammaan bogagga maanta oo ka dhig 0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tirtir Bogagga (0)</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Today & Khatmah Counter Bar */}
        <div className="p-3.5 rounded-2xl bg-[#061820] border border-teal-500/30 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookMarked className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <span className="text-[10px] text-amber-300/80 uppercase font-bold block">Khatmada Socota:</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                  {currentCyclePages} <span className="text-xs font-normal text-amber-400/60 font-sans">/ 604 bog</span>
                </span>
              </div>
              <div className="h-7 w-px bg-white/10 hidden sm:block" />
              <div>
                <span className="text-[10px] text-teal-300/80 uppercase font-bold block">Maanta La Akhriyay:</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                  {todayPages} <span className="text-xs font-normal text-slate-400 font-sans">bog</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleSubtractPages(1)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 font-black text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer shadow"
              title="Ka jar 1 bog Khatmada iyo Maanta"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              <span>-1 Bog</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPages(1)}
              className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/40 text-teal-200 font-black text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer shadow"
              title="Ku dar 1 bog Khatmada iyo Maanta"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+1 Bog</span>
            </button>
          </div>
        </div>

        {/* Section 1: Quick Add Buttons */}
        <div>
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Ku dar Bogag Maanta:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Riix si aad toos ugu darto</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { count: 1, label: '+1 Bog' },
              { count: 2, label: '+2 Bog' },
              { count: 5, label: '+5 Bog' },
              { count: 9, label: '+9 Bog' },
              { count: 10, label: '+10 Bog' },
              { count: 20, label: '+20 Bog' },
            ].map((item) => (
              <button
                key={item.count}
                type="button"
                onClick={() => handleAddPages(item.count)}
                className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-teal-500/15 to-emerald-500/15 hover:from-teal-500/30 hover:to-emerald-500/30 border border-teal-400/30 text-teal-200 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                title={`Ku dar +${item.count} bog`}
              >
                <Plus className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Quick Subtract/Delete Buttons (Laga tirtiri/jari karo) */}
        <div>
          <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Minus className="w-3.5 h-3.5" />
              <span>Ka jar / Tirtir Bogag Maanta (Haddii aad qaldantay):</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Riix si aad toos uga jarto</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { count: 1, label: '-1 Bog' },
              { count: 2, label: '-2 Bog' },
              { count: 5, label: '-5 Bog' },
              { count: 9, label: '-9 Bog' },
              { count: 10, label: '-10 Bog' },
              { count: 20, label: '-20 Bog' },
            ].map((item) => (
              <button
                key={item.count}
                type="button"
                onClick={() => handleSubtractPages(item.count)}
                className="py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 hover:text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                title={`Ka jar -${item.count} bog tirada maanta`}
              >
                <Minus className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Custom Input Form (Add, Subtract, or Set Exact) */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
            <span>Geli tiro gaar ah si aad toos ugu darto ama uga jarto bogagga:</span>
            <span className="text-[10px] text-amber-300/90 font-bold">
              {customInput.trim() && parseInt(customInput.trim(), 10) > 0
                ? `Tirada aad qortay: ${parseInt(customInput.trim(), 10)} bog`
                : 'Tusaale: qor 9 kaddib taabo "- Ka jar"'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              min="1"
              max="604"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomSubmit(e, 'subtract');
                }
              }}
              placeholder="Qor tirada bogagga aad rabto (tusaale: 9)..."
              className="flex-1 bg-slate-900/90 border border-teal-500/30 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => handleCustomSubmit(e, 'subtract')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 text-white font-black text-xs sm:text-sm transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer"
                title="Ka jar tiradan bogagga maanta"
              >
                <Minus className="w-4 h-4 stroke-[3]" />
                <span>
                  {customInput.trim() && parseInt(customInput.trim(), 10) > 0
                    ? `- ${parseInt(customInput.trim(), 10)} Ka jar`
                    : '- Ka jar'}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => handleCustomSubmit(e, 'add')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-teal-500/20 transition active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ku dar tiradan bogagga maanta"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>
                  {customInput.trim() && parseInt(customInput.trim(), 10) > 0
                    ? `+ ${parseInt(customInput.trim(), 10)} Ku dar`
                    : '+ Ku dar'}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => handleCustomSubmit(e, 'set')}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
                title="Toos u deji tiradan"
              >
                {customInput.trim() && parseInt(customInput.trim(), 10) > 0
                  ? `Deji ${parseInt(customInput.trim(), 10)}`
                  : 'Deji Toos'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QURAN AUDIO & FULL READER HERO BANNER (CODADKA & AKHRISKA)    */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2a23] via-[#091f1a] to-[#04100c] border-2 border-emerald-500/40 p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Title, Reciters badges, Description */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Headphones className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Cusub: Codadka & Akhriska Tooska ah (5 Shiikh oo Caan ah)</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Dhagayso Qur'aanka Kariimka adigoo Bogga Akhrinaya
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dhagayso suurad kasta oo aad doorato oo ay akhrinayaan <strong className="text-emerald-300">Mishary Al-Afasy, Cabdulbaasid, Al-Sudais, Al-Ghamdi, iyo Al-Minshawi</strong>. Aayadda hadda la akhrinayo ayaa kuu ifaysa (highlight), waxaadna shidi kartaa ama damin kartaa <strong className="text-teal-300">Macnaha Af-Soomaaliga</strong>.
            </p>

            {/* Reciters Avatars/Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-300">
              <span className="text-slate-400 font-semibold">Shiikhyada:</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-200">Mishary Al-Afasy</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-200">Cabdulbaasid</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-200">Al-Sudais</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-200">Al-Ghamdi</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-200">Al-Minshawi</span>
            </div>
          </div>

          {/* Right Column: Fast Launch Buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenReader(1)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 transition-transform active:scale-95"
            >
              <Volume2 className="w-5 h-5 fill-current" />
              <span>Fur Akhriska & Codadka (Suurad Kasta)</span>
            </button>

            {/* Quick surah pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center lg:justify-start">
              <span className="text-[11px] text-slate-400 mr-1">Toos u fur:</span>
              <button
                type="button"
                onClick={() => handleOpenReader(1)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
              >
                1. Al-Faatixa
              </button>
              <button
                type="button"
                onClick={() => handleOpenReader(36)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
              >
                36. Yaa-Siin
              </button>
              <button
                type="button"
                onClick={() => handleOpenReader(67)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
              >
                67. Al-Mulk
              </button>
              <button
                type="button"
                onClick={() => handleOpenReader(18)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
              >
                18. Al-Kahf
              </button>
              <button
                type="button"
                onClick={() => handleOpenReader(112)}
                className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
              >
                112. Al-Ikhlaas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 114 SURAHS OF THE QUR'AN - COMPREHENSIVE TRACKER & SELECTOR   */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#0e212b] via-[#091a22] to-[#06141a] border border-teal-500/25 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                114
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Dhammaan 114-ka Suuradood ee Qur'aanka Kariimka
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Suurad walba waxay leedahay tirada rasmiga ah ee bogagga ay tahay — waxaad ku dari
              kartaa ama ka jari kartaa 1-Click!
            </p>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectDailyRecommended}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold transition flex items-center gap-1 active:scale-95"
              title="Xulo Suuradaha Caanka ah (Kahf, Mulk, Yasin, Waaqicah, Ikhlaas, Falaq, Naas)"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Xulo Suuradaha Maalinlaha</span>
            </button>

            {todaySurahs.length > 0 && (
              <button
                type="button"
                onClick={handleResetSurahs}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow"
                title="Tirtir dhammaan suuradaha qaldan ee maanta loo calaamadeeyay"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nadiifi Suuradaha ({todaySurahs.length})</span>
              </button>
            )}

            {/* Quick 1-Click Fix Buttons */}
            <button
              type="button"
              onClick={handleResetAllToday}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Eber maanta wax kasta oo qaldan (0 bog & 0 suuro)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Nadiifi Maanta (Ebar 0)</span>
            </button>

            {onApplyUserQuranJourney && (
              <>
                <button
                  type="button"
                  onClick={handleSetOnly49To53}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-black transition flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="U deji maanta kaliya: 15 bog iyo suuradaha 49-53"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Deji Maanta: 15 Bog (49-53)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyUserQuranJourney();
                    setLastActionMessage('✓ Xogtaada waa la dejiyay: Maanta 15 bog (49-53) • Guud ahaan 66 suuradood (49-114)!');
                    setTimeout(() => setLastActionMessage(null), 4000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/25 via-teal-500/25 to-purple-500/25 hover:from-emerald-500/35 hover:to-purple-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-black transition flex items-center gap-1 active:scale-95 cursor-pointer shadow"
                  title="Diiwaangeli: Maanta 15 bog & 49-53 • Guud ahaan 66 suuradood (49-114)"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Qorshahaaga: Maanta 15 bog (49-53) • Guud ahaan 66 (49-114)</span>
                </button>
              </>
            )}

            {/* View Mode Toggle: Grid or List */}
            <div className="flex items-center bg-slate-900 border border-teal-500/25 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-teal-500/30 text-teal-200'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Muuqaalka Kaararka (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-teal-500/30 text-teal-200'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Muuqaalka Liiska (List)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Baadh lambarka suuradda (1-114), magaca Soomaaliga (Baqarah), micnaha, ama Carabiga..."
              className="w-full bg-slate-900/90 border border-teal-500/30 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                selectedFilter === 'all'
                  ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                  : 'bg-slate-900/80 border border-teal-500/25 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Dhammaan (114)
            </button>
            <button
              onClick={() => setSelectedFilter('allTime')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                selectedFilter === 'allTime'
                  ? 'bg-gradient-to-r from-emerald-400 to-purple-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900/80 border border-purple-500/40 text-purple-300 hover:bg-slate-800'
              }`}
            >
              <span>⭐ Wadarta Guud ee La Akhriyay</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-200 text-[10px] font-black">
                {allTimeSurahs.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedFilter('today')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                selectedFilter === 'today'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20'
                  : 'bg-slate-900/80 border border-emerald-500/35 text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <span>🟢 Maanta La Akhriyay</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-200 text-[10px] font-black">
                {todaySurahs.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedFilter('previously')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                selectedFilter === 'previously'
                  ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/20'
                  : 'bg-slate-900/80 border border-purple-500/35 text-purple-300 hover:bg-slate-800'
              }`}
            >
              <span>🟣 Horay Loo Akhriyay</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-200 text-[10px] font-black">
                {previouslyReadSurahs.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedFilter('remaining')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                selectedFilter === 'remaining'
                  ? 'bg-slate-200 text-slate-950 shadow-md'
                  : 'bg-slate-900/80 border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span>⚪ Aan Weli La Akhrin</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black">
                {remainingSurahs.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedFilter('recommended')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                selectedFilter === 'recommended'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900/80 border border-teal-500/25 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ⭐ Maalinle Caanka ah (8)
            </button>
            <button
              onClick={() => setSelectedFilter('makki')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                selectedFilter === 'makki'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                  : 'bg-slate-900/80 border border-teal-500/25 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🕋 Makki (86)
            </button>
            <button
              onClick={() => setSelectedFilter('madani')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                selectedFilter === 'madani'
                  ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                  : 'bg-slate-900/80 border border-teal-500/25 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🕌 Madani (28)
            </button>
            <button
              onClick={() => setSelectedFilter('juz30')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                selectedFilter === 'juz30'
                  ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/20'
                  : 'bg-slate-900/80 border border-teal-500/25 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Juz Camma (Juz 30)
            </button>
          </div>
        </div>

        {/* User's Quran Journey Summary Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-emerald-950/40 border border-purple-500/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
              <BookOpen className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-white">
                  Diiwaankaaga: {allTimeSurahs.length} Suuradood ayaa ku qoran
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-200 text-[10px] font-black border border-purple-400/30">
                  {allTimeSurahs.length} / 114 Suuradood
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-300 font-black">
                  🟢 Maanta: {todaySurahs.length} Suuradood &amp; {todayPages} bog
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-purple-300 font-black">
                  🟣 Horay Loo Akhriyay: {previouslyReadSurahs.length} Suuradood
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedFilter('previously')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                selectedFilter === 'previously'
                  ? 'bg-purple-500 text-white border-purple-400 shadow'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/30 text-purple-200'
              }`}
            >
              <span>🟣 Arag Kuwii Hore ({previouslyReadSurahs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('today')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                selectedFilter === 'today'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/30 text-emerald-200'
              }`}
            >
              <span>🟢 Arag Maanta ({todaySurahs.length})</span>
            </button>
          </div>
        </div>

        {/* Results Counter & Fast Stats */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Waxaa la helay <strong className="text-teal-300">{filteredSurahs.length}</strong>{' '}
            suuradood
          </span>
          <span className="text-[11px] text-teal-400/90 hidden sm:inline">
            Tirada bogagga ee suurad walba si toos ah ayaad ugu dari kartaa ama uga jari kartaa maanta
          </span>
        </div>

        {/* ================= SURAHS LIST / GRID VIEW ================= */}
        {filteredSurahs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-teal-500/20 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Wax natiijo ah laguma helin baadigoobkaaga "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500">
              Isku day inaad lambarka suuradda ama magaceeda si kale u qorto.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="text-xs text-teal-400 hover:underline pt-2 inline-block font-semibold"
            >
              Muuji dhammaan 114-ka Suuradood
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSurahs.map((surah) => {
              const isReadToday = todaySurahs.includes(surah.number);
              const isReadPreviously = !isReadToday && allTimeSurahs.includes(surah.number);
              const rec = DAILY_RECOMMENDED_SURAHS.find((r) => r.number === surah.number);
              const pageRange = getSurahPageRange(surah.number);

              return (
                <div
                  key={surah.number}
                  className={`p-3.5 rounded-2xl transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
                    isReadToday
                      ? 'bg-gradient-to-br from-[#0c3126] via-[#09261e] to-[#061a15] border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                      : isReadPreviously
                      ? 'bg-gradient-to-br from-[#1a1433] via-[#140e2b] to-[#0c081c] border-purple-500/40 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900/70 hover:bg-slate-900/95 border-teal-500/20 hover:border-teal-400/40'
                  }`}
                >
                  {/* Top Row: Number, Somali Name, Arabic Name, Checkbox */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {/* Surah Number Badge */}
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isReadToday
                            ? 'bg-emerald-400 text-slate-950 font-black'
                            : isReadPreviously
                            ? 'bg-purple-500 text-white font-black shadow-sm'
                            : 'bg-slate-800 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {surah.number}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`text-sm font-black ${
                              isReadToday
                                ? 'text-emerald-200'
                                : isReadPreviously
                                ? 'text-purple-200'
                                : 'text-white'
                            }`}
                          >
                            {surah.nameSomali}
                          </h4>
                          {isReadPreviously && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold">
                              Horay Loo Akhriyay
                            </span>
                          )}
                          {rec && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              {rec.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {surah.meaningSomali}
                        </p>
                      </div>
                    </div>

                    {/* Arabic Calligraphy & Sax / Qalad Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className="font-arabic text-sm sm:text-base text-amber-200/90 font-medium mr-1 hidden sm:inline">
                        {surah.nameArabic}
                      </span>

                      {isReadToday ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[11px] font-black flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Maanta ✓</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleUnmarkSurahQalad(surah)}
                            className="px-2 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 active:scale-95"
                            title={`Kabxis Sax / Qalad: Ka saar suuradda oo otomaatik uga jar -${pageRange.count} bog`}
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                            <span>Qalad</span>
                          </button>
                        </div>
                      ) : isReadPreviously ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded-xl bg-purple-500/25 border border-purple-400/50 text-purple-200 text-[11px] font-black flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Horay u Akhriday ✓</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleMarkSurahSax(surah)}
                            className="px-2 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold transition flex items-center gap-0.5 active:scale-95 shadow-sm"
                            title={`Maantana waan akhriyay (+ ku dar maanta +${pageRange.count} bog)`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Maanta ku dar</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkSurahSax(surah)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                          title={`U calaamadee Sax: Wuxuu otomaatik ugu darayaa +${pageRange.count} bog`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Sax</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle Meta: Exact Page Count & Location */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px] border border-amber-500/25">
                        {pageRange.count} {pageRange.count === 1 ? 'Bog' : 'Bogag'}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {pageRange.count === 1
                          ? `Bogga ${pageRange.start}`
                          : `Bogagga ${pageRange.start} - ${pageRange.end}`}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      {surah.verses} Ayadood • {surah.type}
                    </span>
                  </div>

                  {/* Bottom Action: Listen & Read + 1-Click Page Add/Subtract */}
                  <div className="mt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenReader(surah.number)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-[11px] font-black transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                      title={`Dhagayso oo akhri Suuradda ${surah.nameSomali}`}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Dhagayso & Akhri</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddSurahPages(surah)}
                      className="flex-1 text-[11px] py-1.5 px-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/30 text-teal-200 font-extrabold transition active:scale-95 flex items-center justify-center gap-1"
                      title={`Ku dar ${pageRange.count} bog diiwaanka maanta`}
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-300" />
                      <span>+{pageRange.count} Bog</span>
                    </button>

                    {todayPages >= pageRange.count && (
                      <button
                        type="button"
                        onClick={() => handleSubtractSurahPages(surah)}
                        className="text-[10px] py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold transition active:scale-95 flex items-center gap-0.5 shrink-0"
                        title={`Ka jar ${pageRange.count} bog tirada maanta`}
                      >
                        <Minus className="w-3 h-3 text-rose-300" />
                        <span>Ka jar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="divide-y divide-white/5 border border-teal-500/20 rounded-2xl overflow-hidden bg-slate-900/60">
            {filteredSurahs.map((surah) => {
              const isReadToday = todaySurahs.includes(surah.number);
              const isReadPreviously = !isReadToday && allTimeSurahs.includes(surah.number);
              const rec = DAILY_RECOMMENDED_SURAHS.find((r) => r.number === surah.number);
              const pageRange = getSurahPageRange(surah.number);

              return (
                <div
                  key={surah.number}
                  className={`p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-4 transition ${
                    isReadToday
                      ? 'bg-emerald-950/30'
                      : isReadPreviously
                      ? 'bg-purple-950/20'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isReadToday
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : isReadPreviously
                          ? 'bg-purple-500 text-white font-black'
                          : 'bg-slate-800 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {surah.number}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-sm font-black ${
                            isReadToday
                              ? 'text-emerald-200'
                              : isReadPreviously
                              ? 'text-purple-200'
                              : 'text-white'
                          }`}
                        >
                          {surah.nameSomali}
                        </span>
                        {isReadPreviously && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold">
                            Horay Loo Akhriyay
                          </span>
                        )}
                        {rec && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            {rec.badge}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/25">
                          {pageRange.count} {pageRange.count === 1 ? 'Bog' : 'Bogag'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {surah.meaningSomali} • {surah.verses} Ayadood •{' '}
                        {pageRange.count === 1
                          ? `Bogga ${pageRange.start}`
                          : `Bogagga ${pageRange.start}-${pageRange.end}`}{' '}
                        • {surah.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                    <span className="font-arabic text-base text-amber-200/90 font-medium hidden md:inline mr-1">
                      {surah.nameArabic}
                    </span>

                    {/* Dhagayso & Akhri Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenReader(surah.number)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                      title={`Dhagayso oo akhri Suuradda ${surah.nameSomali}`}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">Dhagayso &amp; Akhri</span>
                      <span className="sm:hidden">Dhagayso</span>
                    </button>

                    {/* Sax & Qalad Buttons */}
                    {isReadToday ? (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-xs font-black flex items-center gap-1 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Maanta ✓</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnmarkSurahQalad(surah)}
                          className="px-2 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition flex items-center gap-1 active:scale-95"
                          title={`Qalad: Ka saar maanta oo otomaatik uga jar -${pageRange.count} bog`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Qalad</span>
                        </button>
                      </div>
                    ) : isReadPreviously ? (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 rounded-xl bg-purple-500/25 border border-purple-400/50 text-purple-200 text-xs font-black flex items-center gap-1 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Horay u Akhriday ✓</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkSurahSax(surah)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                          title={`Maantana waan akhriyay (+ ku dar maanta +${pageRange.count} bog)`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Maanta ku dar</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkSurahSax(surah)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                        title={`U calaamadee Sax: Wuxuu otomaatik ugu darayaa +${pageRange.count} bog`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Sax</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddSurahPages(surah)}
                      className="text-[10px] sm:text-xs text-teal-200 hover:text-white bg-teal-500/20 hover:bg-teal-500/30 px-2.5 py-1.5 rounded-xl border border-teal-400/30 transition active:scale-95 font-bold flex items-center gap-1 hidden sm:flex"
                      title={`Ku dar +${pageRange.count} bog`}
                    >
                      <Plus className="w-3 h-3 text-amber-300" />
                      <span>+{pageRange.count} Bog</span>
                    </button>

                    {todayPages >= pageRange.count && (
                      <button
                        type="button"
                        onClick={() => handleSubtractSurahPages(surah)}
                        className="text-[10px] text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 px-2 py-1.5 rounded-xl border border-rose-500/30 transition active:scale-95 font-semibold hidden sm:flex"
                        title={`Ka jar ${pageRange.count} bog tirada maanta`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RA'YI & TALO / OPINION & GUIDANCE CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#121c2c] via-[#0d1e33] to-[#071320] border border-cyan-500/25 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <h4 className="text-sm sm:text-base font-extrabold text-white">
            Ra'yiga &amp; Fikradda Injineernimo ee Qaybta Qur'aanka (114 Suuradood &amp; Bogagga)
          </h4>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
          <p>
            <strong>Waa fikrad aad u qiimo badan oo barakeysan!</strong> Qofka muslimka ah maalin
            kasta ma aha oo kaliya inuu tirada bogagga la socdo, balse inuu ogaado{' '}
            <span className="text-teal-300 font-semibold">suuradaha gaarka ah</span> ee uu akhriyay.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-teal-500/20 text-xs">
              <strong className="text-teal-300 block mb-1">1. Xisaabinta Bogagga Tooska ah</strong>
              Suurad kasta (sida Al-Baqarah oo 48 bog ah ama Al-Kahf oo 12 bog ah) hal gujis ku dar
              ama ka jar bogaggeeda.
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-teal-500/20 text-xs">
              <strong className="text-teal-300 block mb-1">2. Tirtiridda &amp; Ka-jarista</strong>
              Haddii aad qaldanto ama aad wax dheeraad ah ku dartay, hadda waxaad haysataa badhamada
              -1, -2, -5, -10, -20 iyo badhanka tooska ah ee "Ka noqo" (Undo).
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-teal-500/20 text-xs">
              <strong className="text-teal-300 block mb-1">3. Keydka Cloud Database</strong>
              Xogtaadu hadda waxay ku xidhan tahay koontadaada Firebase Firestore, haddii aad
              qalab cusub gasho xogtaadu ma lumayso.
            </div>
          </div>
        </div>
      </div>

      {/* Opinion Modal */}
      {showOpinionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#0a232e] via-[#082a37] to-[#051c24] border border-teal-500/35 p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setShowOpinionModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 p-[1.5px]">
                <div className="w-full h-full bg-[#061e23] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-black">Ra'yiga &amp; Qorshaha Qur'aanka</h3>
                <p className="text-xs text-teal-300">Talooyinka ugu wanaagsan ee akhriska maalinlaha ah</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <p>
                <strong>Ra'yigeyga dhabta ah:</strong> In qofku maalin walba galo labadaba{' '}
                <em>(1) Tirada bogagga uu akhriyay</em> iyo <em>(2) Suuradaha uu gaarka u dhammeeyay</em>{' '}
                waa habka ugu fiican ee loo dhiso dabeecad joogto ah (consistent habit).
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-teal-200">
                <li>
                  <strong>Hadafka 20 Bog maalintii:</strong> 20 bog waxay u dhigantaa 1 Juz. Qofkii
                  akhriya 20 bog maalin walba wuxuu 30 maalmood ku dhammaynayaa hal Khatmo buuxda!
                </li>
                <li>
                  <strong>Tirada saxda ah ee suuradaha:</strong> Suurad kasta waxaan ku darnay inta bog
                  ee ay tahay, tusaale ahaan Al-Baqarah (48 bog), Aali-Cimraan (27 bog), An-Nisaa (29
                  bog), Yaa-Siin (6 bog), Al-Mulk (3 bog).
                </li>
                <li>
                  <strong>Maareynta khaladka:</strong> Waxaad si fudud u jari kartaa tiradii aad ku dartay
                  adigoo isticmaalaya badhamada laga jaro ama "Tirtir Bogagga".
                </li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowOpinionModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-xs"
              >
                Waan Fahmay • Mahadsanid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quran Reader & Audio Modal */}
      <QuranReaderModal
        isOpen={isReaderOpen}
        initialSurahNumber={readerSurahNumber}
        onClose={() => setIsReaderOpen(false)}
        onAddPagesRead={(pages) => {
          handleAddPages(pages, "Akhriska Qur'aanka");
        }}
      />
    </div>
  );
};
