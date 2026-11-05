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
  Download,
} from 'lucide-react';
import { QuranReaderModal } from './QuranReaderModal';
import { QuranOfflineModal } from './QuranOfflineModal';
import { AppSettings, DayData } from '../types';
import { ensureAll114SurahsCachedOffline } from '../utils/quranAudioService';
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
  onOpenReaderModal?: (surahNumber: number) => void;
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
  onOpenReaderModal,
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
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineCachedCount, setOfflineCachedCount] = useState<number>(() => {
    try {
      return localStorage.getItem('tuko_all_114_quran_offline_ready') === 'true' ? 114 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    let active = true;
    ensureAll114SurahsCachedOffline((cached) => {
      if (active) setOfflineCachedCount(cached);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleOpenReader = (surahNumber: number = 1) => {
    if (onOpenReaderModal) {
      onOpenReaderModal(surahNumber);
    } else {
      setReaderSurahNumber(surahNumber);
      setIsReaderOpen(true);
    }
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

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 p-[2px] shadow-md shrink-0">
              <div className="w-full h-full bg-[#0a1e28] rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Qur'aanka Kariimka
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOfflineModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold transition active:scale-95 cursor-pointer shadow-sm"
                  title="Guji si aad codadka iyo suuradaha hal-mar offline ugu diyaarsato"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>
                    {offlineCachedCount >= 114
                      ? '114/114 Offline'
                      : `Offline ${offlineCachedCount}/114`}
                  </span>
                  <span className="text-[9px] px-1 rounded bg-teal-400/20 text-teal-200">
                    Hal-Mar Diyaari ⚡
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-teal-300/85 truncate">
                Khatmada: {currentCyclePages}/604 bog ({cyclePercent}%) • Qoraal & Macne Waa Offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {readingStreak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-300 text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />
                <span>{readingStreak}d</span>
              </div>
            )}

            <button
              onClick={() => setShowOpinionModal(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Talo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {lastActionMessage && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950 to-emerald-950 border border-teal-400/40 text-teal-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <span>{lastActionMessage}</span>
          {previousPagesState !== null && (
            <button
              onClick={handleUndo}
              className="px-2.5 py-1 rounded-xl bg-teal-400 text-slate-950 hover:bg-teal-300 font-extrabold text-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Ka noqo</span>
            </button>
          )}
        </div>
      )}

      {/* Unified Mobile App Quran Tracker Card (Today's Pages + Khatmah + Quick +/- Controls) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0a232d] to-[#071921] border border-teal-500/30 shadow-xl space-y-3.5">
        {/* Top 2x2 Compact Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Today's Pages Box */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-teal-500/25 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                Bogagga Maanta
              </span>
              <div className="text-2xl font-black font-mono text-cyan-300 leading-tight mt-0.5">
                {todayPages} <span className="text-xs font-normal text-slate-400">bog</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSubtractPages(1)}
                className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 font-black text-base flex items-center justify-center active:scale-90 cursor-pointer"
                title="Ka jar -1 bog"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleAddPages(1)}
                className="w-8 h-8 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 border border-teal-400/40 text-teal-200 font-black text-base flex items-center justify-center active:scale-90 cursor-pointer"
                title="Ku dar +1 bog"
              >
                +
              </button>
            </div>
          </div>

          {/* Khatmah Progress Box */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-amber-500/25 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Khatmada
              </span>
              <div className="text-xl font-black font-mono text-amber-300 leading-tight mt-0.5">
                {currentCyclePages}<span className="text-xs font-normal text-amber-400/60">/604</span>
              </div>
            </div>
            <span className="text-xs font-black font-mono px-2 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {cyclePercent}%
            </span>
          </div>
        </div>

        {/* Khatmah Progress Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${cyclePercent}%` }}
          />
        </div>

        {/* Fast Page Stepper Buttons (+1, +2, +4, +5, +10, +20) */}
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 4, 5, 10, 20].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => handleAddPages(cnt)}
              className="py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 font-black text-xs transition active:scale-95 cursor-pointer"
            >
              +{cnt}
            </button>
          ))}
        </div>

        {/* Compact Custom Number Input Row */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min="1"
            max="604"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Tiro bogag (t.e. 9)..."
            className="flex-1 min-w-0 bg-slate-950/80 border border-teal-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="button"
            onClick={(e) => handleCustomSubmit(e, 'add')}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            + Ku dar
          </button>
          <button
            type="button"
            onClick={(e) => handleCustomSubmit(e, 'subtract')}
            className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 font-black text-xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            - Ka jar
          </button>
          {todayPages > 0 && (
            <button
              type="button"
              onClick={handleResetPages}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-white/10 transition active:scale-95 shrink-0 cursor-pointer"
              title="Tirtir bogagga maanta (0)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* COMPACT MOBILE AUDIO & READER BAR                              */}
      {/* ============================================================== */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0c2a23] via-[#091f1a] to-[#04100c] border border-emerald-500/35 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate">
                Codadka &amp; Akhriska Qur&apos;aanka
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                5 Shiikh (Al-Afasy, Cabdulbaasid, Al-Sudais...) + Tafsiir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Hal-Mar Suuradaha Offline ugu Diyaari Dhageysiga"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline">Offline Diyaari</span>
              <span className="sm:hidden">Offline</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenReader(1)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4 fill-current" />
              <span>Fur Akhriska</span>
            </button>
          </div>
        </div>

        {/* 1-Click Offline Caching Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950/80 via-emerald-950/70 to-slate-950 border border-teal-400/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-400/20 border border-teal-400/35 flex items-center justify-center text-teal-300 shrink-0">
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white block truncate">
                Suuradaha Hal-Mar Offline ugu Diyaari Dhageysiga
              </span>
              <span className="text-[10px] text-teal-300/80 block truncate">
                Kaydi Maalinlaha, Juz Camma ama 114-ka Suuro adigoon mid mid u gelin
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOfflineModalOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[11px] shadow-md hover:brightness-110 active:scale-95 transition shrink-0 cursor-pointer"
          >
            Hal-Mar Keydi ⚡
          </button>
        </div>

        {/* Quick surah pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[10px] font-bold text-slate-400 shrink-0">Toos u fur:</span>
          {[
            { num: 1, label: '1. Al-Faatixa' },
            { num: 18, label: '18. Al-Kahf' },
            { num: 36, label: '36. Yaa-Siin' },
            { num: 67, label: '67. Al-Mulk' },
            { num: 112, label: '112. Al-Ikhlaas' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => handleOpenReader(s.num)}
              className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-emerald-950 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold whitespace-nowrap transition shrink-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 114 SURAHS OF THE QUR'AN - COMPACT MOBILE TRACKER             */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#0e212b] via-[#091a22] to-[#06141a] border border-teal-500/25 shadow-2xl space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xs">
              114
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                114-ka Suuradood ee Qur&apos;aanka
              </h3>
              <p className="text-[11px] text-slate-400">
                La akhriyay: <strong className="text-emerald-300">{allTimeSurahs.length}/114</strong> suuradood
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {todaySurahs.length > 0 && (
              <button
                type="button"
                onClick={handleResetSurahs}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-[11px] font-bold flex items-center gap-1 active:scale-95"
              >
                <X className="w-3 h-3" />
                <span>Nadiifi ({todaySurahs.length})</span>
              </button>
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
                title="Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-teal-500/30 text-teal-200'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Raadi suuradda (1-114) ama magaceeda..."
              className="w-full bg-slate-900/90 border border-teal-500/30 rounded-2xl pl-9 pr-9 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
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
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedFilter === 'all'
                  ? 'bg-teal-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-teal-500/20 text-slate-300'
              }`}
            >
              Dhammaan (114)
            </button>
            <button
              onClick={() => setSelectedFilter('today')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                selectedFilter === 'today'
                  ? 'bg-emerald-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span>🟢 Maanta ({todaySurahs.length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('allTime')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                selectedFilter === 'allTime'
                  ? 'bg-purple-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-purple-500/30 text-purple-300'
              }`}
            >
              <span>⭐ La Akhriyay ({allTimeSurahs.length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('remaining')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedFilter === 'remaining'
                  ? 'bg-slate-200 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-slate-700 text-slate-400'
              }`}
            >
              Dhiman ({remainingSurahs.length})
            </button>
            <button
              onClick={() => setSelectedFilter('recommended')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedFilter === 'recommended'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-teal-500/20 text-slate-300'
              }`}
            >
              ⭐ Maalinle (8)
            </button>
            <button
              onClick={() => setSelectedFilter('juz30')}
              className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedFilter === 'juz30'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 border border-teal-500/20 text-slate-300'
              }`}
            >
              Juz Camma
            </button>
          </div>
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

      {/* 1-Click Quran Offline Audio & Surah Downloader Modal */}
      <QuranOfflineModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        onOpenReader={(surahNum) => {
          setIsOfflineModalOpen(false);
          handleOpenReader(surahNum);
        }}
      />
    </div>
  );
};
