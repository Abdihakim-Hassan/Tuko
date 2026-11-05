import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Type,
  Languages,
  BookOpen,
  ChevronDown,
  Repeat,
  Share2,
  Check,
  Sparkles,
  ArrowLeft,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Headphones,
  Radio,
  Download,
} from 'lucide-react';
import { QURAN_SURAHS, SurahInfo } from '../utils/quranData';
import {
  QURAN_RECITERS,
  Reciter,
  SurahDetails,
  AyahDetail,
  fetchSurahWithTranslation,
  getAyahAudioUrl,
  resolvePlayableAudioSrc,
  isAudioUrlCachedOffline,
  downloadAudioUrlForOffline,
  isSurahRecitationCachedOffline,
  downloadSurahRecitationOffline,
} from '../utils/quranAudioService';
import {
  TAFSIR_SCHOLARS,
  getSomaliTafsirAudio,
  TafsirScholar,
} from '../utils/somaliTafsirService';

interface QuranReaderModalProps {
  initialSurahNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onReopen?: () => void;
  arabicFontScale?: 'normal' | 'large' | 'xlarge';
  onAddPagesRead?: (pages: number) => void;
}

export const QuranReaderModal: React.FC<QuranReaderModalProps> = ({
  initialSurahNumber,
  isOpen,
  onClose,
  onReopen,
  arabicFontScale = 'normal',
  onAddPagesRead,
}) => {
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(initialSurahNumber);
  const [surahData, setSurahData] = useState<SurahDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio & playback state
  const [selectedReciterId, setSelectedReciterId] = useState<string>('alafasy');
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<'surah' | 'ayah' | 'off'>('surah');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Appearance & display preferences
  const [showSomaliTranslation, setShowSomaliTranslation] = useState<boolean>(true);
  const [arabicFontSize, setArabicFontSize] = useState<number>(() =>
    arabicFontScale === 'xlarge' ? 34 : arabicFontScale === 'large' ? 30 : 26
  ); // in px

  useEffect(() => {
    setArabicFontSize(arabicFontScale === 'xlarge' ? 34 : arabicFontScale === 'large' ? 30 : 26);
  }, [arabicFontScale]);
  const [showSurahDropdown, setShowSurahDropdown] = useState<boolean>(false);
  const [showReciterDropdown, setShowReciterDropdown] = useState<boolean>(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState<string>('');
  const [copiedAyahNumber, setCopiedAyahNumber] = useState<number | null>(null);
  const [pagesAddedNotice, setPagesAddedNotice] = useState<string | null>(null);
  const [audioOfflineNotice, setAudioOfflineNotice] = useState<string | null>(null);

  // Somali Tafsir Audio state (Default: Tafsiir Kooban oo Suuradda Kaliya ah)
  const [selectedTafsirScholarId, setSelectedTafsirScholarId] = useState<string>('sheikh_cabdulqaadir');
  const [isTafsirPlaying, setIsTafsirPlaying] = useState<boolean>(false);
  const [isTafsirBuffering, setIsTafsirBuffering] = useState<boolean>(false);
  const [tafsirCurrentTime, setTafsirCurrentTime] = useState<number>(0);
  const [tafsirDuration, setTafsirDuration] = useState<number>(0);
  const [tafsirSpeed, setTafsirSpeed] = useState<number>(1);
  const [showTafsirScholarDropdown, setShowTafsirScholarDropdown] = useState<boolean>(false);

  // Offline Audio Caching states
  const [isTafsirCached, setIsTafsirCached] = useState<boolean>(false);
  const [isDownloadingTafsir, setIsDownloadingTafsir] = useState<boolean>(false);
  const [isRecitationCached, setIsRecitationCached] = useState<boolean>(false);
  const [recitationDownloadProgress, setRecitationDownloadProgress] = useState<string | null>(null);

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tafsirAudioRef = useRef<HTMLAudioElement | null>(null);
  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Sync initialSurahNumber when prop changes
  useEffect(() => {
    if (initialSurahNumber && initialSurahNumber >= 1 && initialSurahNumber <= 114) {
      setSelectedSurahNumber(initialSurahNumber);
    }
  }, [initialSurahNumber]);

  // Load Surah data whenever selectedSurahNumber changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setCurrentAyahIndex(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    if (tafsirAudioRef.current) {
      tafsirAudioRef.current.pause();
      tafsirAudioRef.current.src = '';
    }
    setIsTafsirPlaying(false);
    setTafsirCurrentTime(0);
    setTafsirDuration(0);

    fetchSurahWithTranslation(selectedSurahNumber)
      .then((data) => {
        if (isMounted) {
          setSurahData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message || 'Cilad ayaa dhacday xilliga soo dejinta suuradda.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSurahNumber]);

  // Audio setup and handlers
  const currentSurahMeta: SurahInfo | undefined = QURAN_SURAHS.find(
    (s) => s.number === selectedSurahNumber
  );

  const activeReciter =
    QURAN_RECITERS.find((r) => r.id === selectedReciterId) || QURAN_RECITERS[0];

  const currentAyah: AyahDetail | undefined = surahData?.ayahs[currentAyahIndex];

  // Auto-scroll to currently playing ayah
  useEffect(() => {
    if (autoScroll && currentAyah && ayahRefs.current[currentAyah.numberInSurah]) {
      ayahRefs.current[currentAyah.numberInSurah]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentAyahIndex, autoScroll, currentAyah]);

  // Play audio for specific ayah index (resolves local blob: URL from CacheStorage for 100% offline playback!)
  const playAyah = useCallback(
    async (ayahIndex: number) => {
      if (!surahData || !surahData.ayahs[ayahIndex]) return;

      const targetAyah = surahData.ayahs[ayahIndex];
      const audioUrl = getAyahAudioUrl(
        selectedReciterId,
        surahData.number,
        targetAyah.numberInSurah
      );

      // Pause Somali Tafsir audio if playing
      if (tafsirAudioRef.current && isTafsirPlaying) {
        tafsirAudioRef.current.pause();
        setIsTafsirPlaying(false);
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      setIsBuffering(true);
      setCurrentAyahIndex(ayahIndex);

      const playableSrc = await resolvePlayableAudioSrc(audioUrl);
      const audio = audioRef.current;
      audio.src = playableSrc;
      audio.playbackRate = playbackSpeed;

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setHasActiveSession(true);
          setCurrentAyahIndex(ayahIndex);
        })
        .catch((err) => {
          console.warn('Audio play error:', err);
          setIsPlaying(false);
          setIsBuffering(false);
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setAudioOfflineNotice(
              "Codkan weli laguma keydin Offline. Marka internet-ku jiro taabo '📥 Kaydi Codka Offline' si aad bilaa internet ugu dhageysato. (Qoraalka & Macnaha 114 Suuradood waa Offline buuxa!)"
            );
            setTimeout(() => setAudioOfflineNotice(null), 5000);
          }
        });
    },
    [surahData, selectedReciterId, playbackSpeed, isTafsirPlaying]
  );

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current || !audioRef.current.src) {
      playAyah(currentAyahIndex);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback error:', e);
          playAyah(currentAyahIndex);
        });
    }
  };

  // Next Ayah
  const playNextAyah = () => {
    if (!surahData) return;
    if (currentAyahIndex < surahData.ayahs.length - 1) {
      playAyah(currentAyahIndex + 1);
    } else if (repeatMode === 'surah') {
      // Loop back to beginning of surah
      playAyah(0);
    } else {
      setIsPlaying(false);
    }
  };

  // Previous Ayah
  const playPreviousAyah = () => {
    if (!surahData) return;
    if (currentAyahIndex > 0) {
      playAyah(currentAyahIndex - 1);
    } else {
      playAyah(0);
    }
  };

  // Attach audio element listeners
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleEnded = () => {
      if (repeatMode === 'ayah') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextAyah();
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, [repeatMode, currentAyahIndex, surahData]);

  // Adjust playback speed
  const cyclePlaybackSpeed = () => {
    const speeds = [1, 1.25, 1.5, 0.85];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Copy Ayah text to clipboard
  const handleCopyAyah = (ayah: AyahDetail) => {
    const shareText = `« ${ayah.textArabic} »\n\n${
      showSomaliTranslation ? `Macnaha: ${ayah.textSomali}\n\n` : ''
    }[Suuradda ${currentSurahMeta?.nameSomali || surahData?.nameEnglish}: Aayadda ${ayah.numberInSurah}] - Tuko App`;

    navigator.clipboard?.writeText(shareText);
    setCopiedAyahNumber(ayah.numberInSurah);
    setTimeout(() => {
      setCopiedAyahNumber(null);
    }, 2000);
  };

  // Filtered surahs for switcher
  const filteredSurahs = QURAN_SURAHS.filter(
    (s) =>
      s.nameSomali.toLowerCase().includes(surahSearchQuery.toLowerCase()) ||
      s.nameArabic.includes(surahSearchQuery) ||
      String(s.number) === surahSearchQuery.trim()
  );

  // Tafsir Scholar metadata & file lookup
  const tafsirData = getSomaliTafsirAudio(selectedSurahNumber, selectedTafsirScholarId);
  const activeScholar: TafsirScholar =
    TAFSIR_SCHOLARS.find((s) => s.id === selectedTafsirScholarId) || TAFSIR_SCHOLARS[0];

  const clipStart = tafsirData.startTime || 0;
  const expectedClipDuration =
    tafsirData.endTime && tafsirData.endTime > clipStart
      ? tafsirData.endTime - clipStart
      : tafsirDuration;

  const formatAudioTime = (sec: number): string => {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check if current Surah's Tafsir & Recitation audio are already cached for offline listening
  useEffect(() => {
    let active = true;
    if (tafsirData.available && tafsirData.audioUrl) {
      isAudioUrlCachedOffline(tafsirData.audioUrl).then((cached) => {
        if (active) setIsTafsirCached(cached);
      });
    } else {
      setIsTafsirCached(false);
    }

    const totalAyahs = surahData?.numberOfAyahs || currentSurahMeta?.verses || 7;
    isSurahRecitationCachedOffline(selectedReciterId, selectedSurahNumber, totalAyahs).then(
      (cached) => {
        if (active) setIsRecitationCached(cached);
      }
    );

    return () => {
      active = false;
    };
  }, [selectedSurahNumber, selectedReciterId, selectedTafsirScholarId, tafsirData.available, tafsirData.audioUrl, surahData?.numberOfAyahs, currentSurahMeta?.verses]);

  const handleDownloadTafsirOffline = async () => {
    if (!tafsirData.available || !tafsirData.audioUrl || isDownloadingTafsir) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAudioOfflineNotice('Fadlan shid internet-ka si aad codka tafsiirka ugu keydiso Offline.');
      setTimeout(() => setAudioOfflineNotice(null), 4000);
      return;
    }
    setIsDownloadingTafsir(true);
    const ok = await downloadAudioUrlForOffline(tafsirData.audioUrl);
    setIsDownloadingTafsir(false);
    if (ok) {
      setIsTafsirCached(true);
      setPagesAddedNotice('✓ Codka Tafsiirka Suuraddan waa lagu keydiyay Offline!');
      setTimeout(() => setPagesAddedNotice(null), 3500);
    }
  };

  const handleDownloadRecitationOffline = async () => {
    if (recitationDownloadProgress) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAudioOfflineNotice("Fadlan shid internet-ka si aad codka Qiraa'ada ugu keydiso Offline.");
      setTimeout(() => setAudioOfflineNotice(null), 4000);
      return;
    }
    const totalAyahs = surahData?.numberOfAyahs || currentSurahMeta?.verses || 7;
    setRecitationDownloadProgress(`0/${totalAyahs}`);
    const ok = await downloadSurahRecitationOffline(
      selectedReciterId,
      selectedSurahNumber,
      totalAyahs,
      (done, total) => setRecitationDownloadProgress(`${done}/${total}`)
    );
    setRecitationDownloadProgress(null);
    if (ok) {
      setIsRecitationCached(true);
      setPagesAddedNotice(`✓ Codka Qiraa'ada (${activeReciter.name.split(' ')[0]}) waa lagu keydiyay Offline!`);
      setTimeout(() => setPagesAddedNotice(null), 3500);
    }
  };

  const handleToggleTafsirPlay = async () => {
    if (!tafsirData.available || !tafsirData.audioUrl) return;

    if (!tafsirAudioRef.current) {
      tafsirAudioRef.current = new Audio();
    }

    const audio = tafsirAudioRef.current;

    if (isTafsirPlaying) {
      audio.pause();
      setIsTafsirPlaying(false);
      return;
    }

    const startSec = tafsirData.startTime || 0;
    const endSec = tafsirData.endTime || 0;

    // Attach clip-aware listeners so only this Surah's segment plays
    audio.ontimeupdate = () => {
      if (endSec > startSec && audio.currentTime >= endSec) {
        audio.pause();
        audio.currentTime = startSec;
        setIsTafsirPlaying(false);
        setTafsirCurrentTime(0);
        return;
      }
      const relTime = Math.max(0, audio.currentTime - startSec);
      setTafsirCurrentTime(relTime);
      const rawDur = audio.duration || 0;
      const effectiveDur =
        endSec > startSec
          ? endSec - startSec
          : Math.max(0, rawDur - startSec);
      if (effectiveDur > 0) {
        setTafsirDuration(effectiveDur);
      }
    };
    audio.onloadedmetadata = () => {
      if (startSec > 0 && audio.currentTime < startSec) {
        audio.currentTime = startSec;
      }
      const rawDur = audio.duration || 0;
      const effectiveDur =
        endSec > startSec
          ? endSec - startSec
          : Math.max(0, rawDur - startSec);
      if (effectiveDur > 0) {
        setTafsirDuration(effectiveDur);
      }
    };
    audio.onwaiting = () => setIsTafsirBuffering(true);
    audio.onplaying = () => {
      setIsTafsirBuffering(false);
      setIsTafsirPlaying(true);
    };
    audio.onpause = () => setIsTafsirPlaying(false);
    audio.onended = () => {
      setIsTafsirPlaying(false);
      setTafsirCurrentTime(0);
    };
    audio.onerror = () => {
      setIsTafsirBuffering(false);
      setIsTafsirPlaying(false);
    };

    // Pause Quran reciter if it's currently playing
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setIsTafsirBuffering(true);
    const playableTafsirUrl = await resolvePlayableAudioSrc(tafsirData.audioUrl);
    const isNewSource = audio.src !== playableTafsirUrl;
    if (isNewSource) {
      audio.src = playableTafsirUrl;
      audio.playbackRate = tafsirSpeed;
      audio.load();
    }

    if (
      isNewSource ||
      audio.currentTime < startSec ||
      (endSec > startSec && audio.currentTime >= endSec)
    ) {
      try {
        audio.currentTime = startSec;
      } catch {}
    }
    if (endSec > startSec) {
      setTafsirDuration(endSec - startSec);
    }

    audio
      .play()
      .then(() => {
        if (startSec > 0 && audio.currentTime < startSec) {
          try {
            audio.currentTime = startSec;
          } catch {}
        }
        setIsTafsirPlaying(true);
        setIsTafsirBuffering(false);
        setHasActiveSession(true);
      })
      .catch((err) => {
        console.warn('Tafsir playback warning:', err);
        setIsTafsirBuffering(false);
        setIsTafsirPlaying(false);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setAudioOfflineNotice(
            "Codka tafsiirkan weli laguma keydin Offline. Marka internet-ku jiro taabo '📥 Kaydi Offline' si aad bilaa internet ugu dhageysato."
          );
          setTimeout(() => setAudioOfflineNotice(null), 5000);
        }
      });
  };

  // Minimize modal while keeping audio alive in background Mini-Player
  const handleMinimizeOrClose = () => {
    if (isPlaying || isTafsirPlaying) {
      setHasActiveSession(true);
      onClose();
    } else {
      handleStopAndClose();
    }
  };

  // Stop all audio and close completely
  const handleStopAndClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (tafsirAudioRef.current) {
      tafsirAudioRef.current.pause();
      tafsirAudioRef.current.src = '';
    }
    setIsPlaying(false);
    setIsTafsirPlaying(false);
    setHasActiveSession(false);
    onClose();
  };

  // Mark pages read in tracker
  const handleMarkSurahRead = () => {
    if (!currentSurahMeta || !onAddPagesRead) return;
    // Estimate page span for this surah
    const pageSpan = Math.max(1, Math.ceil(currentSurahMeta.verses / 20));
    onAddPagesRead(pageSpan);
    setPagesAddedNotice(`Waxaa lagu daray +${pageSpan} bog xisaabtaada maanta!`);
    setTimeout(() => setPagesAddedNotice(null), 3000);
  };

  // Floating Mini-Player when modal is closed/minimized while audio session is active
  if (!isOpen) {
    if (!isPlaying && !isTafsirPlaying && !hasActiveSession) return null;

    const activeTafsirScholar =
      TAFSIR_SCHOLARS.find((s) => s.id === selectedTafsirScholarId) || TAFSIR_SCHOLARS[0];

    return (
      <div className="fixed bottom-[70px] md:bottom-4 left-1/2 md:left-[calc(50%+2.5rem)] lg:left-[calc(50%+8rem)] -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#092b22]/95 via-[#072029]/95 to-[#05151c]/95 border border-emerald-400/40 shadow-2xl shadow-black/80 backdrop-blur-xl flex items-center justify-between gap-2.5">
          {/* Left: Tap to reopen full Quran Reader */}
          <button
            type="button"
            onClick={() => onReopen && onReopen()}
            className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer active:scale-[0.99] transition"
            title="Taabo si aad u furto bogga akhriska"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 relative">
              <Headphones className={`w-5 h-5 ${isPlaying || isTafsirPlaying ? 'animate-pulse text-emerald-300' : 'text-slate-400'}`} />
              {(isPlaying || isTafsirPlaying) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white truncate">
                  {selectedSurahNumber}. {currentSurahMeta?.nameSomali || 'Suurad'}
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                  {isTafsirPlaying ? 'Tafsiir' : `Aayadda ${currentAyah?.numberInSurah || 1}`}
                </span>
              </div>
              <p className="text-[11px] text-teal-300/90 truncate">
                {isTafsirPlaying ? activeTafsirScholar.name : activeReciter.name} • <span className="underline text-amber-300">Fur Bogga</span>
              </p>
            </div>
          </button>

          {/* Right: Play/Pause, Next, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isTafsirPlaying || (tafsirAudioRef.current && tafsirAudioRef.current.currentTime > 0 && !isPlaying)) {
                  handleToggleTafsirPlay();
                } else {
                  togglePlayPause();
                }
              }}
              className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md active:scale-95 transition"
              title={isPlaying || isTafsirPlaying ? 'Hakad' : 'Shid'}
            >
              {isBuffering || isTafsirBuffering ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying || isTafsirPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {!isTafsirPlaying && (
              <button
                type="button"
                onClick={playNextAyah}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition active:scale-95"
                title="Aayadda Xigta"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={handleStopAndClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 transition active:scale-95"
              title="Jooji oo xir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md shadow-md">
        {/* Left: Back / Minimize & Surah Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleMinimizeOrClose}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
            title="Ku noqo (Codku wuu sii soconayaa)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Surah Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSurahDropdown(!showSurahDropdown);
                setShowReciterDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs sm:text-sm transition-all"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>
                {selectedSurahNumber}. {currentSurahMeta?.nameSomali || `Surah ${selectedSurahNumber}`}
              </span>
              <span className="font-arabic text-emerald-200 font-normal">
                ({currentSurahMeta?.nameArabic})
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Surah Dropdown Popover */}
            {showSurahDropdown && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 max-h-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-slate-800">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Raadi Suurad (magac ama tiro)..."
                      value={surahSearchQuery}
                      onChange={(e) => setSurahSearchQuery(e.target.value)}
                      className="w-full bg-slate-800/90 text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
                  {filteredSurahs.map((surah) => (
                    <button
                      key={surah.number}
                      type="button"
                      onClick={() => {
                        setSelectedSurahNumber(surah.number);
                        setShowSurahDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-colors ${
                        surah.number === selectedSurahNumber
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-center font-mono text-xs opacity-60">
                          {surah.number}
                        </span>
                        <span>{surah.nameSomali}</span>
                        <span className="text-[10px] opacity-70">
                          ({surah.verses} ayadood)
                        </span>
                      </div>
                      <span className="font-arabic text-sm">{surah.nameArabic}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Controls: Reciter, Somali Toggle, Font Size, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reciter Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowReciterDropdown(!showReciterDropdown);
                setShowSurahDropdown(false);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm transition-all"
              title="Dooro Shiikha Akhriya"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline max-w-[120px] truncate">
                {activeReciter.name.split(' ')[0]}
              </span>
              <span className="md:hidden text-xs font-medium">Shiikh</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Reciter Dropdown Popover */}
            {showReciterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dooro Codka Quraanka (Mishary, Maher, Minshawi...)
                </div>
                <div className="space-y-1">
                  {QURAN_RECITERS.map((reciter) => (
                    <button
                      key={reciter.id}
                      type="button"
                      onClick={() => {
                        setSelectedReciterId(reciter.id);
                        setShowReciterDropdown(false);
                        // If currently playing, restart with new reciter
                        if (isPlaying) {
                          playAyah(currentAyahIndex);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                        reciter.id === selectedReciterId
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-white'
                          : 'text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-xs sm:text-sm text-slate-100">
                          {reciter.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{reciter.description}</p>
                      </div>
                      <span className="font-arabic text-xs text-amber-300">
                        {reciter.arabicName.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Somali Translation Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSomaliTranslation(!showSomaliTranslation)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
              showSomaliTranslation
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={showSomaliTranslation ? 'Dami Macnaha Soomaaliga' : 'Shid Macnaha Soomaaliga'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {showSomaliTranslation ? 'Soomaali: Shidan' : 'Soomaali: Bakhtisan'}
            </span>
            <span className="sm:hidden font-mono text-[11px]">SO</span>
          </button>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setArabicFontSize((s) => Math.max(18, s - 2))}
              className="px-2 py-1 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Yaree Farta"
            >
              A-
            </button>
            <span className="text-[10px] text-slate-400 px-1 font-mono">{arabicFontSize}</span>
            <button
              type="button"
              onClick={() => setArabicFontSize((s) => Math.min(42, s + 2))}
              className="px-2 py-1 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Weynee Farta"
            >
              A+
            </button>
          </div>

          {/* Minimize / Background Play button */}
          <button
            type="button"
            onClick={() => {
              setHasActiveSession(true);
              onClose();
            }}
            className="px-2.5 py-1.5 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            title="Yaree daaqadda si aad App-ka u dhex wareegto adigoo dhagaysanaya"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="hidden sm:inline">Yaree</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={handleStopAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Jooji oo xir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Audio Offline Notice Toast */}
      {audioOfflineNotice && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fadeIn shrink-0 shadow-md">
          <span>⚠️ {audioOfflineNotice}</span>
          <button
            type="button"
            onClick={() => setAudioOfflineNotice(null)}
            className="p-0.5 hover:bg-black/20 rounded ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Reading Canvas */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-6 max-w-4xl mx-auto w-full pb-36">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 font-medium text-sm">
              Waxaa la soo dejinayaa aayadaha iyo qoraalka Suuradda {currentSurahMeta?.nameSomali}...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm">
              {errorMsg}
            </div>
            <button
              type="button"
              onClick={() => setSelectedSurahNumber(selectedSurahNumber)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Isku day mar kale
            </button>
          </div>
        ) : surahData ? (
          <div className="space-y-6">
            {/* Surah Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 text-center shadow-xl">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentSurahMeta?.type === 'Madani' ? 'Madaniyyah' : 'Makkiyyah'} •{' '}
                  {surahData.numberOfAyahs} Aayadood • Juz {currentSurahMeta?.juz || 1}
                </span>

                <h1 className="text-3xl sm:text-4xl font-arabic font-bold text-amber-200 tracking-wide pt-2">
                  {surahData.nameArabic}
                </h1>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Suuradda {currentSurahMeta?.nameSomali || surahData.nameEnglish}
                </h2>

                <p className="text-xs sm:text-sm text-emerald-300/90 font-medium">
                  Macnaha: "{currentSurahMeta?.meaningSomali || surahData.nameEnglish}"
                </p>
              </div>

              {/* Bismillah Decoration (for surahs other than At-Tawbah) */}
              {surahData.bismillahPre && (
                <div className="pt-6 pb-2">
                  <div className="inline-block px-6 py-2.5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 shadow-inner">
                    <p className="font-arabic text-xl sm:text-2xl text-amber-200/90 tracking-wider">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Somali Audio Tafsir Player Bar & Scholar Selection */}
            <div className="rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/80 border border-teal-500/30 p-4 sm:p-5 shadow-xl relative overflow-visible">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
                    <Headphones className="w-5 h-5 text-teal-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                        Tafsiirka Af-Soomaaliga ee Qur'aanka
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Cod
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Suuradda {currentSurahMeta?.nameSomali || surahData.nameEnglish} • {activeScholar.name}
                    </p>
                  </div>
                </div>

                {/* Scholar Switcher Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTafsirScholarDropdown(!showTafsirScholarDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-teal-500/40 text-teal-200 text-xs font-semibold transition-all shadow-sm"
                  >
                    <span>🎙️ {activeScholar.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showTafsirScholarDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-teal-500/40 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                        Dooro Culimada Tafsiirka
                      </div>
                      <div className="space-y-1">
                        {TAFSIR_SCHOLARS.map((scholar) => (
                          <button
                            key={scholar.id}
                            type="button"
                            onClick={() => {
                              setSelectedTafsirScholarId(scholar.id);
                              setShowTafsirScholarDropdown(false);
                              if (tafsirAudioRef.current) {
                                tafsirAudioRef.current.pause();
                                tafsirAudioRef.current.src = '';
                              }
                              setIsTafsirPlaying(false);
                              setTafsirCurrentTime(0);
                            }}
                            className={`w-full flex flex-col p-2.5 rounded-xl text-left transition-colors ${
                              scholar.id === selectedTafsirScholarId
                                ? 'bg-teal-600/30 border border-teal-500 text-white'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="font-semibold text-xs text-slate-100">{scholar.name}</span>
                            <span className="text-[11px] text-teal-300">{scholar.coverage}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{scholar.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Controls & Scrubber */}
              <div className="pt-3.5 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleTafsirPlay}
                    disabled={!tafsirData.available}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all shrink-0 ${
                      !tafsirData.available
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isTafsirPlaying
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-teal-500 text-slate-950 hover:bg-teal-400 hover:scale-105'
                    }`}
                    title={isTafsirPlaying ? 'Hakad geli Tafsiirka' : 'Dhageyso Tafsiirka'}
                  >
                    {isTafsirBuffering ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : isTafsirPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-mono text-teal-300 font-semibold">
                        {formatAudioTime(tafsirCurrentTime)}
                      </span>
                      <span className="truncate px-2">
                        {isTafsirPlaying ? (
                          <span className="text-teal-400 font-semibold animate-pulse">
                            ● {tafsirData.clipLabel || `Tafsiirka Suuradda ${currentSurahMeta?.nameSomali}`}
                          </span>
                        ) : (
                          <span className="text-emerald-300/90 font-semibold">
                            ✓ {tafsirData.clipLabel || `Suuradda ${currentSurahMeta?.nameSomali} oo keliya`}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-amber-300 font-bold">
                        {expectedClipDuration > 0 ? formatAudioTime(expectedClipDuration) : '--:--'}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={expectedClipDuration || 100}
                      value={tafsirCurrentTime}
                      onChange={(e) => {
                        const target = Number(e.target.value);
                        setTafsirCurrentTime(target);
                        if (tafsirAudioRef.current) {
                          tafsirAudioRef.current.currentTime = clipStart + target;
                        }
                      }}
                      className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {tafsirData.available && (
                      <button
                        type="button"
                        onClick={handleDownloadTafsirOffline}
                        disabled={isTafsirCached || isDownloadingTafsir}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          isTafsirCached
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 cursor-pointer'
                        }`}
                        title={
                          isTafsirCached
                            ? 'Tafsiirka suuraddan waa Offline'
                            : 'Ku keydi codka tafsiirka suuraddan Offline'
                        }
                      >
                        {isDownloadingTafsir ? (
                          <div className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                        ) : isTafsirCached ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Download className="w-3 h-3 text-teal-300" />
                        )}
                        <span>{isTafsirCached ? 'Offline' : isDownloadingTafsir ? '...' : 'Offline'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const speeds = [1, 1.25, 1.5, 1.75, 2];
                        const next = speeds[(speeds.indexOf(tafsirSpeed) + 1) % speeds.length];
                        setTafsirSpeed(next);
                        if (tafsirAudioRef.current) tafsirAudioRef.current.playbackRate = next;
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-mono font-semibold"
                      title="Xawaaraha Tafsiirka"
                    >
                      {tafsirSpeed}x
                    </button>
                  </div>
                </div>

                {!tafsirData.available && (
                  <p className="text-xs text-amber-300/90 italic">
                    ⚠️ {tafsirData.message || 'Tafsiirka suuraddan codkeeda lama helin.'}
                  </p>
                )}
              </div>
            </div>

            {/* Verses List */}
            <div className="space-y-3 sm:space-y-4">
              {surahData.ayahs.map((ayah, index) => {
                const isCurrentAyah = currentAyahIndex === index && isPlaying;
                const isSelected = currentAyahIndex === index;

                return (
                  <div
                    key={ayah.numberInSurah}
                    ref={(el) => {
                      ayahRefs.current[ayah.numberInSurah] = el;
                    }}
                    className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
                      isCurrentAyah
                        ? 'bg-emerald-950/40 border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/20'
                        : isSelected
                        ? 'bg-slate-900/90 border border-emerald-500/40'
                        : 'bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80'
                    }`}
                  >
                    {/* Top row: Ayah number + quick actions */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
                      <div className="flex items-center gap-2">
                        {/* Ayah number badge */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                            isCurrentAyah
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40'
                              : 'bg-slate-800 text-emerald-300 border border-slate-700'
                          }`}
                        >
                          {ayah.numberInSurah}
                        </div>

                        {/* Playing audio status */}
                        {isCurrentAyah && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold animate-pulse">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>La Dhagaysanayaa...</span>
                          </div>
                        )}
                      </div>

                      {/* Right Ayah Actions: Play this specific ayah, copy */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrentAyah) {
                              togglePlayPause();
                            } else {
                              playAyah(index);
                            }
                          }}
                          className={`p-1.5 rounded-xl transition-all ${
                            isCurrentAyah
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                          }`}
                          title={`Dhagayso aayadda ${ayah.numberInSurah}`}
                        >
                          {isCurrentAyah ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyAyah(ayah)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                          title="Koobi aayadda iyo macnaha"
                        >
                          {copiedAyahNumber === ayah.numberInSurah ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Arabic Verse Text */}
                    <p
                      dir="rtl"
                      style={{ fontSize: `${arabicFontSize}px`, lineHeight: 1.9 }}
                      className="font-arabic font-normal text-right text-slate-100 select-text transition-all tracking-normal"
                    >
                      {ayah.textArabic}
                      <span className="inline-flex items-center justify-center w-7 h-7 mx-2 text-xs font-arabic text-amber-400 border border-amber-400/30 rounded-full select-none bg-amber-400/5 align-middle">
                        {ayah.numberInSurah}
                      </span>
                    </p>

                    {/* Somali Translation Text (if toggled on) */}
                    {showSomaliTranslation && (
                      <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal flex-1">
                          <span className="text-teal-400 font-semibold mr-1">Macnaha:</span>
                          {ayah.textSomali}
                        </p>
                        <button
                          type="button"
                          onClick={handleToggleTafsirPlay}
                          className="self-start sm:self-center shrink-0 px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                          title="Dhageyso Tafsiirka Codka ah ee Suuraddan"
                        >
                          <Headphones className="w-3 h-3 text-teal-400" />
                          <span>{isTafsirPlaying ? 'Hakad geli Tafsiirka' : 'Dhageyso Tafsiirka'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Khatmah Page Tracking and Next Surah */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs text-slate-400">
                  Dhammaadkii Suuradda {currentSurahMeta?.nameSomali} ({surahData.numberOfAyahs}{' '}
                  aayadood)
                </p>
                {pagesAddedNotice && (
                  <p className="text-xs text-emerald-400 font-bold mt-1 animate-bounce">
                    {pagesAddedNotice}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onAddPagesRead && (
                  <button
                    type="button"
                    onClick={handleMarkSurahRead}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Ku dar Xisaabtaada Maanta
                  </button>
                )}

                {selectedSurahNumber < 114 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSurahNumber((n) => Math.min(114, n + 1))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all"
                  >
                    Suuradda Xigta
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Sticky Bottom Audio Player Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-xl px-4 py-3 sm:py-3.5 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Active Surah & Ayah badge */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                  {currentSurahMeta?.nameSomali || 'Qur\'aanka'} • Aayadda{' '}
                  <span className="text-emerald-400 font-mono">
                    {currentAyah ? currentAyah.numberInSurah : 1}
                  </span>{' '}
                  / {surahData?.numberOfAyahs || currentSurahMeta?.verses || 7}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeReciter.name} ({activeReciter.arabicName})
                </p>
              </div>
            </div>

            {/* Mobile Offline Download, Speed & Auto-scroll controls */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadRecitationOffline}
                disabled={isRecitationCached || !!recitationDownloadProgress}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                  isRecitationCached
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                }`}
                title="Ku keydi codka Qiraa'ada Suuraddan Offline"
              >
                {recitationDownloadProgress ? (
                  <span className="font-mono text-[10px]">{recitationDownloadProgress}</span>
                ) : isRecitationCached ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Offline</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 text-amber-300" />
                    <span>Offline</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={cyclePlaybackSpeed}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-semibold"
              >
                {playbackSpeed}x
              </button>
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-lg text-xs ${
                  autoScroll ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
                title="Raacitaanka shaashadda"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Playback Controls (Prev, Play/Pause, Next) */}
          <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={playPreviousAyah}
              disabled={currentAyahIndex <= 0}
              className="p-2 text-slate-300 hover:text-white disabled:opacity-40 rounded-xl hover:bg-slate-800 transition-colors"
              title="Aayaddii Hore"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isBuffering}
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
              title={isPlaying ? 'Hakad' : 'Shid'}
            >
              {isBuffering ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={playNextAyah}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Aayadda Xigta"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Right: Repeat mode, Speed, AutoScroll (Desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Repeat Mode */}
            <button
              type="button"
              onClick={() => {
                if (repeatMode === 'surah') setRepeatMode('ayah');
                else if (repeatMode === 'ayah') setRepeatMode('off');
                else setRepeatMode('surah');
              }}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors ${
                repeatMode !== 'off'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={
                repeatMode === 'ayah'
                  ? 'Kusoo celi aayaddan oo keliya'
                  : repeatMode === 'surah'
                  ? 'Kusoo celi suuradda oo dhan'
                  : 'Ha ku celin'
              }
            >
              <Repeat className="w-4 h-4" />
              <span className="text-[11px] font-semibold">
                {repeatMode === 'ayah' ? '1 Aayad' : repeatMode === 'surah' ? 'Suuradda' : 'Off'}
              </span>
            </button>

            {/* Playback speed */}
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors"
              title="Xawaaraha Akhriska"
            >
              {playbackSpeed}x
            </button>

            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                autoScroll
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Shaashaddu ha la socoto aayadda la akhrinayo"
            >
              Auto-Scroll: {autoScroll ? 'Shidan' : 'Off'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
