import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  Headphones,
  BookOpen,
  Sparkles,
  StopCircle,
  Check,
  Search,
  Play,
  Zap,
  ListChecks,
} from 'lucide-react';
import {
  QURAN_RECITERS,
  OFFLINE_PRESET_FAST_16,
  OFFLINE_PRESET_DAILY_SURAHS,
  OFFLINE_PRESET_JUZ_AMMA,
  OFFLINE_PRESET_ALL_114,
  batchDownloadQuranOffline,
  BatchDownloadProgress,
  getCachedSurahsCount,
  getMarkedOfflineSurahs,
} from '../utils/quranAudioService';
import { QURAN_SURAHS } from '../utils/quranData';

interface QuranOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReader?: (surahNumber: number) => void;
}

type PresetType = 'fast_16' | 'juz_amma' | 'daily' | 'custom' | 'all_114';

export const QuranOfflineModal: React.FC<QuranOfflineModalProps> = ({
  isOpen,
  onClose,
  onOpenReader,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('fast_16');
  const [customSelectedSurahs, setCustomSelectedSurahs] = useState<number[]>([1, 36, 67, 112, 113, 114]);
  const [customSearch, setCustomSearch] = useState<string>('');
  const [selectedReciterId, setSelectedReciterId] = useState<string>('alafasy');
  const [includeRecitation, setIncludeRecitation] = useState<boolean>(true);
  const [includeTafsir, setIncludeTafsir] = useState<boolean>(false);
  const [selectedTafsirScholarId] = useState<string>('sheikh_cabdulqaadir');

  // Download runner states
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<BatchDownloadProgress | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [offlineReadySet, setOfflineReadySet] = useState<Set<number>>(() =>
    getMarkedOfflineSurahs('alafasy')
  );

  // Abort controller reference for cancelling download
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeSurahs = useMemo(() => {
    switch (selectedPreset) {
      case 'fast_16':
        return OFFLINE_PRESET_FAST_16;
      case 'juz_amma':
        return OFFLINE_PRESET_JUZ_AMMA;
      case 'daily':
        return OFFLINE_PRESET_DAILY_SURAHS;
      case 'custom':
        return customSelectedSurahs.length > 0 ? [...customSelectedSurahs].sort((a, b) => a - b) : [1];
      case 'all_114':
        return OFFLINE_PRESET_ALL_114;
    }
  }, [selectedPreset, customSelectedSurahs]);

  // Refresh cached count when modal opens or preset/reciter changes
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      setOfflineReadySet(getMarkedOfflineSurahs(selectedReciterId));
      getCachedSurahsCount(activeSurahs, selectedReciterId).then((cnt) => {
        if (isMounted) {
          setCachedCount(cnt);
          setOfflineReadySet(getMarkedOfflineSurahs(selectedReciterId));
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, activeSurahs, selectedReciterId]);

  if (!isOpen) return null;

  const toggleCustomSurah = (surahNum: number) => {
    setCustomSelectedSurahs((prev) =>
      prev.includes(surahNum) ? prev.filter((n) => n !== surahNum) : [...prev, surahNum]
    );
  };

  const handleStartDownload = async () => {
    if (isDownloading || activeSurahs.length === 0) return;

    setIsDownloading(true);
    setDownloadSuccess(false);
    setProgress({
      currentSurahIndex: 1,
      totalSurahs: activeSurahs.length,
      currentSurahNumber: activeSurahs[0],
      currentSurahName: 'Bilaabid...',
      percent: 2,
      isDone: false,
      statusText: 'Waxaa la bilaabayaa soo dejinta codadka...',
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await batchDownloadQuranOffline(activeSurahs, {
        reciterId: selectedReciterId,
        downloadRecitation: includeRecitation,
        downloadTafsir: includeTafsir,
        tafsirScholarId: selectedTafsirScholarId,
        signal: controller.signal,
        onProgress: (p) => {
          setProgress(p);
          setOfflineReadySet(getMarkedOfflineSurahs(selectedReciterId));
        },
      });

      if ((result.success || result.completedCount > 0) && !controller.signal.aborted) {
        setDownloadSuccess(true);
        const latestCount = await getCachedSurahsCount(activeSurahs, selectedReciterId);
        setCachedCount(Math.max(latestCount, result.completedCount));
        setOfflineReadySet(getMarkedOfflineSurahs(selectedReciterId));
      }
    } catch (err) {
      console.warn('Batch download notice:', err);
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
  };

  const filteredCustomSurahs = QURAN_SURAHS.filter((s) => {
    if (!customSearch.trim()) return true;
    const q = customSearch.toLowerCase().trim();
    return (
      s.nameSomali.toLowerCase().includes(q) ||
      s.nameArabic.includes(q) ||
      String(s.number) === q
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#0a232c] via-[#06171d] to-[#041014] border-2 border-teal-500/40 shadow-2xl shadow-teal-950/80 overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-teal-500/20 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/25 shrink-0">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Keydka Dhageysiga Offline</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ✓ {offlineReadySet.size} Suuro Diyaar
                </span>
              </h2>
              <p className="text-[11px] text-teal-300/80 truncate">
                Ku kaydi codadka Qur&apos;aanka taleefankaaga si aad bilaa internet ugu dhagaysato
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Quran Text & Translation Status Box (Always 100% Offline) */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block">
                  Qoraalka &amp; Fasiraadda 114-ka Suuro
                </span>
                <span className="text-[10px] text-slate-400">
                  Carabiga &amp; Af-Soomaaliga mar horeba waa 100% Offline
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 font-black text-[11px] shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>114/114 Diyaar</span>
            </span>
          </div>

          {/* 2. Selection Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-teal-200 text-xs uppercase tracking-wider">
                1. Dooro Suuradaha aad rabto inaad Codkooda Keydiso:
              </label>
              <span className="text-[10px] font-bold text-emerald-300">
                {cachedCount}/{activeSurahs.length} waa ku jiraan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Preset 1: Fast 16 Daily Surahs */}
              <button
                type="button"
                onClick={() => setSelectedPreset('fast_16')}
                disabled={isDownloading}
                className={`p-3 rounded-2xl text-left border transition relative cursor-pointer ${
                  selectedPreset === 'fast_16'
                    ? 'bg-gradient-to-br from-teal-950 to-emerald-950 border-teal-400 shadow-md shadow-teal-500/20 ring-1 ring-teal-400'
                    : 'bg-slate-900/70 border-white/10 hover:border-teal-500/30 text-slate-300'
                }`}
              >
                <div className="absolute top-2 right-2">
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Aad u Dhakhso Badan
                  </span>
                </div>
                <div className="font-extrabold text-white text-xs mb-0.5">
                  16-ka Suuro ee Maalinlaha
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Al-Faatixa, Yaa-Siin, Al-Mulk + 13-ka suuro ee ugu dambeeya (102–114)
                </div>
                <div className="mt-1.5 text-[10px] font-mono font-bold text-teal-300">
                  ⚡ ~10 ilbiriqsi gudahood
                </div>
              </button>

              {/* Preset 2: Custom Select Surahs */}
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                disabled={isDownloading}
                className={`p-3 rounded-2xl text-left border transition relative cursor-pointer ${
                  selectedPreset === 'custom'
                    ? 'bg-gradient-to-br from-teal-950 to-emerald-950 border-teal-400 shadow-md shadow-teal-500/20 ring-1 ring-teal-400'
                    : 'bg-slate-900/70 border-white/10 hover:border-teal-500/30 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-white text-xs mb-0.5 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-teal-400" />
                  <span>Dooro Suurado Gaar ah</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Calaamadee suuradaha aad adigu rabto oo keliya ({customSelectedSurahs.length} la doortay)
                </div>
                <div className="mt-1.5 text-[10px] font-mono font-bold text-amber-300">
                  🎯 Adiga ayaa dooranaya
                </div>
              </button>

              {/* Preset 3: Juz Amma Only */}
              <button
                type="button"
                onClick={() => setSelectedPreset('juz_amma')}
                disabled={isDownloading}
                className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                  selectedPreset === 'juz_amma'
                    ? 'bg-gradient-to-br from-teal-950 to-emerald-950 border-teal-400 shadow-md shadow-teal-500/20 ring-1 ring-teal-400'
                    : 'bg-slate-900/70 border-white/10 hover:border-teal-500/30 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-white text-xs mb-0.5">Juz Camma oo Dhan</div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Suuradaha 78 ilaa 114 (37 Suuro)
                </div>
                <div className="mt-1.5 text-[10px] font-mono font-bold text-teal-300">
                  37 Suurood
                </div>
              </button>

              {/* Preset 4: Daily + Juz Amma (43 Surahs) */}
              <button
                type="button"
                onClick={() => setSelectedPreset('daily')}
                disabled={isDownloading}
                className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                  selectedPreset === 'daily'
                    ? 'bg-gradient-to-br from-teal-950 to-emerald-950 border-teal-400 shadow-md shadow-teal-500/20 ring-1 ring-teal-400'
                    : 'bg-slate-900/70 border-white/10 hover:border-teal-500/30 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-white text-xs mb-0.5">
                  Maalinlaha + Juz Camma
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Faatixa, Kahf, Yaasiin, Raxmaan, Waaqica, Mulk + 78–114
                </div>
                <div className="mt-1.5 text-[10px] font-mono font-bold text-teal-300">
                  43 Suurood
                </div>
              </button>
            </div>

            {/* All 114 button */}
            <button
              type="button"
              onClick={() => setSelectedPreset('all_114')}
              disabled={isDownloading}
              className={`w-full p-2.5 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${
                selectedPreset === 'all_114'
                  ? 'bg-gradient-to-r from-teal-950 to-emerald-950 border-teal-400 ring-1 ring-teal-400'
                  : 'bg-slate-900/60 border-white/10 hover:border-teal-500/30 text-slate-300'
              }`}
            >
              <div>
                <span className="font-extrabold text-white text-xs">🕋 Dhammaan 114-ka Suuro ee Qur&apos;aanka</span>
                <span className="text-[10px] text-slate-400 block">Waxay u baahan tahay khad Wi-Fi oo xooggan</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
                114 Suuro
              </span>
            </button>

            {/* Custom Surah Checklist when 'custom' is selected */}
            {selectedPreset === 'custom' && (
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-teal-500/30 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customSearch}
                      onChange={(e) => setCustomSearch(e.target.value)}
                      placeholder="Raadi magaca ama lambarka suuradda..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-[11px] focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomSelectedSurahs(
                        customSelectedSurahs.length > 10 ? [1] : OFFLINE_PRESET_FAST_16
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[10px] font-bold text-teal-300 shrink-0 cursor-pointer"
                  >
                    {customSelectedSurahs.length > 10 ? 'Nadiifi' : 'Dooro 16'}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 pr-1">
                  {filteredCustomSurahs.map((s) => {
                    const isChecked = customSelectedSurahs.includes(s.number);
                    const isSaved = offlineReadySet.has(s.number);
                    return (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => toggleCustomSurah(s.number)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-900/50 border-teal-400/60 text-white'
                            : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-1.5">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-teal-400 text-slate-950'
                                : 'bg-slate-800 border border-white/20'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-[11px] font-bold truncate">
                            {s.number}. {s.nameSomali}
                          </span>
                        </div>
                        {isSaved && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0"
                            title="Waa lagu keydiyay Offline"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Audio & Scholar Options */}
          <div className="space-y-2 pt-1 border-t border-teal-500/20">
            <label className="font-extrabold text-teal-200 text-xs uppercase tracking-wider block">
              2. Dooro Shiikha &amp; Nooca Codka:
            </label>

            {/* Reciter Selector */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-teal-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-teal-400" />
                  <span>Shiikha Akhriska (Reciter):</span>
                </span>
                <span className="text-[10px] text-teal-300 font-bold">
                  {QURAN_RECITERS.length} Shiikh
                </span>
              </div>

              <select
                value={selectedReciterId}
                onChange={(e) => setSelectedReciterId(e.target.value)}
                disabled={isDownloading}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-teal-500/30 text-white font-bold text-xs focus:outline-none focus:border-teal-400 cursor-pointer"
              >
                {QURAN_RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.arabicName})
                  </option>
                ))}
              </select>
            </div>

            {/* Checkboxes for Recitation & Tafsir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer select-none ${
                  includeRecitation
                    ? 'bg-teal-950/50 border-teal-400/50 text-white'
                    : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeRecitation}
                  onChange={(e) => setIncludeRecitation(e.target.checked)}
                  disabled={isDownloading}
                  className="rounded accent-teal-400 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-bold block">Codka Akhriska Aayadaha</span>
                  <span className="text-[9px] text-teal-300/80">Dhakhso badan &amp; Offline buuxa</span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer select-none ${
                  includeTafsir
                    ? 'bg-teal-950/50 border-teal-400/50 text-white'
                    : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeTafsir}
                  onChange={(e) => setIncludeTafsir(e.target.checked)}
                  disabled={isDownloading}
                  className="rounded accent-teal-400 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-bold block">Tafsiirka Af-Soomaaliga</span>
                  <span className="text-[9px] text-slate-400">Ikhtiyaari (Cajaladaha Tafsiirka)</span>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Live Progress Card when Downloading */}
          {isDownloading && progress && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950 via-[#07242e] to-slate-950 border-2 border-teal-400/60 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-teal-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping inline-block" />
                  <span>Waxaa lagu keydinayaa taleefankaaga...</span>
                </span>
                <span className="text-amber-300 font-mono text-sm">{progress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden border border-teal-500/30 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 transition-all duration-300 shadow-md shadow-teal-400/50"
                  style={{ width: `${Math.max(progress.percent, 3)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-bold text-white truncate max-w-[72%]">
                  {progress.statusText}
                </span>
                <span className="font-mono font-bold text-teal-300">
                  Suuradda {progress.currentSurahIndex}/{progress.totalSurahs}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCancelDownload}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>Jooji Keydinta (Cancel)</span>
              </button>
            </div>
          )}

          {/* 5. Already Cached Surahs Quick-Play Chips */}
          {offlineReadySet.size > 0 && !isDownloading && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Suuradaha hadda Offline diyaar kuugu ah ({offlineReadySet.size} Suurood):
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">Taabo si aad u dhagaysato</span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {Array.from(offlineReadySet)
                  .sort((a, b) => a - b)
                  .map((sNum) => {
                    const meta = QURAN_SURAHS.find((s) => s.number === sNum);
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => {
                          if (onOpenReader) {
                            onClose();
                            onOpenReader(sNum);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-[10px] flex items-center gap-1 transition active:scale-95 cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>
                          {sNum}. {meta?.nameSomali || `Suuradda ${sNum}`}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 6. Success Banner */}
          {downloadSuccess && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-400/60 text-emerald-200 space-y-2 shadow-xl animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-sm text-white">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                <span>Guul! Codadka &amp; Suuradaha waa lagu keydiyay taleefankaaga 🎉</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                Hadda xitaa haddii aad xirto Wi-Fi iyo Mobile Data, suuradahaas kor ku xusan waxay si
                toos ah uga yeerayaan gudaha taleefankaaga (100% Offline)!
              </p>
              {onOpenReader && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReader(activeSurahs[0] || 1);
                  }}
                  className="mt-1 py-2 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Fur oo Dhagayso Hadda (Offline)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 border-t border-teal-500/20 bg-slate-950/60 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 font-medium">
            La doortay: <strong className="text-white">{activeSurahs.length} Suurood</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloading}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Xir
            </button>

            {!isDownloading && (
              <button
                type="button"
                onClick={handleStartDownload}
                disabled={(!includeRecitation && !includeTafsir) || activeSurahs.length === 0}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-teal-500/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Bilaaw Keydinta ({activeSurahs.length} Suurood)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
