import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  CheckCircle,
  RotateCcw,
  Volume2,
  Sparkles,
  ChevronLeft,
  Clock,
  Building2,
  Home,
  Plus,
} from 'lucide-react';
import { PrayerName, SalaahStatus, AdhanVoice } from '../types';
import { PRAYER_SOMALI_LABELS, formatTime12 } from '../utils/prayerTimes';
import { audioAlerts } from '../utils/audioAlerts';

interface AdhkaarOverlayProps {
  prayer: PrayerName;
  isOpen: boolean;
  onClose: () => void;
  onMarkPrayed: (prayer: PrayerName, status: SalaahStatus) => void;
  onSnooze: (minutes: number, prayer: PrayerName) => void;
  onComplete?: () => void;
  isSisterMode?: boolean;
  adhanVoice?: AdhanVoice;
}

interface AdhkaarStep {
  id: string;
  arabic: string;
  translit: string;
  somali: string;
  target: number;
}

export const AdhkaarOverlay: React.FC<AdhkaarOverlayProps> = ({
  prayer,
  isOpen,
  onClose,
  onMarkPrayed,
  onSnooze,
  onComplete,
  isSisterMode = false,
  adhanVoice = 'makkah',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState<boolean>(true);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState(false);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const beepCtxRef = useRef<AudioContext | null>(null);

  // Sync Adhan playback with audioAlerts and real HTMLAudioElement events
  useEffect(() => {
    if (!isOpen) return;

    const audioEl = audioAlerts.getCurrentAudio();
    const syncState = () => {
      if (audioEl) {
        setIsPlayingAdhan(!audioEl.paused && !audioEl.ended);
      } else {
        setIsPlayingAdhan(audioAlerts.isAdhanPlaying());
      }
    };

    if (audioEl) {
      audioEl.addEventListener('play', syncState);
      audioEl.addEventListener('pause', syncState);
      audioEl.addEventListener('ended', syncState);
    }

    if (audioAlerts.isAdhanPlaying()) {
      setIsPlayingAdhan(true);
    } else {
      audioAlerts
        .playAdhan(
          prayer === 'Fajr',
          () => {
            setIsPlayingAdhan(false);
          },
          adhanVoice
        )
        .then((started) => {
          setIsPlayingAdhan(started);
        });
    }

    return () => {
      audioAlerts.stopAdhan();
      if (audioEl) {
        audioEl.removeEventListener('play', syncState);
        audioEl.removeEventListener('pause', syncState);
        audioEl.removeEventListener('ended', syncState);
      }
    };
  }, [isOpen, prayer, adhanVoice]);

  const toggleAdhan = () => {
    if (isPlayingAdhan) {
      audioAlerts.stopAdhan();
      setIsPlayingAdhan(false);
    } else {
      audioAlerts
        .playAdhan(
          prayer === 'Fajr',
          () => {
            setIsPlayingAdhan(false);
          },
          adhanVoice
        )
        .then((started) => {
          setIsPlayingAdhan(started);
        });
    }
  };

  // Prayer atmospheric settings matching the reference design
  const prayerThemes: Record<
    PrayerName,
    {
      bgGradient: string;
      cardBg: string;
      accentGold: string;
      btnGold: string;
      titleEnglish: string;
      titleSomali: string;
      subtitle: string;
    }
  > = {
    Fajr: {
      bgGradient: 'from-[#081220] via-[#102236] to-[#16334a]',
      cardBg: 'bg-[#0b1c2d]/75 border-cyan-500/20',
      accentGold: '#48cae4',
      btnGold: 'from-[#64dfdf] via-[#48cae4] to-[#0096c7]',
      titleEnglish: 'Fajr',
      titleSomali: 'Subax (Fajr)',
      subtitle: 'As the dawn breaks, light fills the soul',
    },
    Sunrise: {
      bgGradient: 'from-[#221307] via-[#38200c] to-[#4f2d11]',
      cardBg: 'bg-[#291708]/75 border-amber-500/20',
      accentGold: '#d4af37',
      btnGold: 'from-[#e3b880] via-[#d4a373] to-[#b37d4e]',
      titleEnglish: 'Sunrise',
      titleSomali: 'Qorrax Soo-bax',
      subtitle: 'The golden rays bring morning blessings',
    },
    Duhur: {
      bgGradient: 'from-[#091b33] via-[#0d2a4f] to-[#12396b]',
      cardBg: 'bg-[#0c2242]/75 border-sky-500/20',
      accentGold: '#90e0ef',
      btnGold: 'from-[#90e0ef] via-[#00b4d8] to-[#0077b6]',
      titleEnglish: 'Dhuhr',
      titleSomali: 'Duhur',
      subtitle: 'Midday remembrance in the warmth of faith',
    },
    Casar: {
      bgGradient: 'from-[#221307] via-[#38200c] to-[#4f2d11]',
      cardBg: 'bg-[#2b1708]/75 border-amber-500/20',
      accentGold: '#d4af37',
      btnGold: 'from-[#e3b880] via-[#d4a373] to-[#b37d4e]',
      titleEnglish: 'Asr',
      titleSomali: 'Casar',
      subtitle: 'The golden hour of reflection and peace',
    },
    Maqrib: {
      bgGradient: 'from-[#1b1022] via-[#2d1b33] to-[#43233c]',
      cardBg: 'bg-[#2e1a33]/75 border-rose-500/20',
      accentGold: '#d4af37',
      btnGold: 'from-[#e3b880] via-[#d4a373] to-[#b37d4e]',
      titleEnglish: 'Maghrib',
      titleSomali: 'Magrib',
      subtitle: 'As the sun sets, gratitude rises',
    },
    Cishe: {
      bgGradient: 'from-[#0a0f1d] via-[#11192e] to-[#182340]',
      cardBg: 'bg-[#0f172a]/80 border-indigo-500/20',
      accentGold: '#a5b4fc',
      btnGold: 'from-[#c7d2fe] via-[#a5b4fc] to-[#818cf8]',
      titleEnglish: 'Isha',
      titleSomali: 'Cisha',
      subtitle: 'Under the tranquil night, peace descends',
    },
  };

  const currentTheme = prayerThemes[prayer] || prayerThemes.Maqrib;

  // Adhkaar sequence: Astaghfirullah 33, Subhanallah 33, Alhamdulillah 33, Allahu Akbar 33
  const steps: AdhkaarStep[] = [
    {
      id: 'istighfar',
      arabic: 'أَسْتَغْفِرُ اللَّهَ',
      translit: 'Astaghfirullah',
      somali: 'Waxaan dambi-dhaaf weydiisanayaa Allaah.',
      target: 33,
    },
    {
      id: 'subhanallah',
      arabic: 'سُبْحَانَ اللَّهِ',
      translit: 'Subhaanallaah',
      somali: 'Ceebeysanaan oo dhan Allaah baa ka fog.',
      target: 33,
    },
    {
      id: 'alhamdulillah',
      arabic: 'الْحَمْدُ لِلَّهِ',
      translit: 'Alxamdulillaah',
      somali: 'Mahad oo dhan Allaah ayaa iska leh.',
      target: 33,
    },
    {
      id: 'allahuakbar',
      arabic: 'اللَّهُ أَكْبَرُ',
      translit: 'Allaahu Akbar',
      somali: 'Allaah baa weyn wax kasta.',
      target: 33,
    },
  ];

  const currentStep = steps[currentStepIndex] || steps[0];
  const currentCount = counts[currentStep.id] || 0;
  const isCurrentStepDone = currentCount >= currentStep.target;
  const isAllDone = steps.every((s) => (counts[s.id] || 0) >= s.target);

  // Play subtle click sound ONLY when Adhan is NOT playing (so no beep/dhuud ever plays over the Adhan)
  const playBeep = (freq = 560) => {
    if (!audioEnabled || isPlayingAdhan || audioAlerts.isAdhanPlaying()) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!beepCtxRef.current) {
        beepCtxRef.current = new AudioCtx();
      }
      const audioCtx = beepCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Ignore
    }
  };

  // Automatic advance to next step when target is completed
  const triggerAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);

    if (currentStepIndex < steps.length - 1) {
      setAutoAdvanceNotice(true);
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
        setAutoAdvanceNotice(false);
      }, 350);
    }
  };

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, []);

  const handleIncrement = () => {
    if (currentCount < currentStep.target) {
      const newCount = currentCount + 1;
      setCounts((prev) => ({ ...prev, [currentStep.id]: newCount }));

      if (newCount === currentStep.target) {
        playBeep(680);
        if (navigator.vibrate) navigator.vibrate([35, 45, 35]);
        triggerAutoAdvance();
      } else {
        playBeep(560);
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
  };

  // Mark current step as read (Waan aqriyay)
  const handleMarkCurrentAsRead = () => {
    setCounts((prev) => ({ ...prev, [currentStep.id]: currentStep.target }));
    playBeep(680);
    if (navigator.vibrate) navigator.vibrate([30, 40]);
    triggerAutoAdvance();
  };

  const progressPercent = Math.min(
    100,
    Math.round((currentCount / currentStep.target) * 100)
  );

  const currentTimeFormatted = new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-y-auto overscroll-contain bg-slate-950 select-none animate-in fade-in duration-300">
      {/* Full atmospheric gradient background */}
      <div
        className={`fixed inset-0 pointer-events-none bg-gradient-to-b ${currentTheme.bgGradient} opacity-95`}
      />

      {/* Subtle radial center glow */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-full bg-amber-500/10 blur-[130px]" />
      </div>

      {/* Scrollable Inner Wrapper that fits Laptop & Mobile cleanly */}
      <div className="relative z-20 min-h-full w-full flex flex-col justify-between items-center gap-3 sm:gap-4 py-3 sm:py-5 px-4">
        {/* Top Floating Controls: Sound, Live Adhan Equalizer & Close */}
        <div className="w-full max-w-md flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-full border transition cursor-pointer ${
                audioEnabled
                  ? 'bg-white/10 border-white/20 text-white/80'
                  : 'bg-white/5 border-white/10 text-white/30'
              }`}
              title={audioEnabled ? 'Codka tasbeexda waa shidan yahay' : 'Codka tasbeexda waa dansan yahay'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Live Adhan sound status & control */}
            <button
              onClick={toggleAdhan}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
                isPlayingAdhan
                  ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 animate-pulse'
                  : 'bg-amber-500/15 border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
              }`}
              title={isPlayingAdhan ? 'Aamusii Aadaanka' : 'Daaro Aadaanka'}
            >
              <span className="flex items-center gap-0.5 h-2.5">
                <span className={`w-0.5 bg-amber-400 rounded-full transition-all ${isPlayingAdhan ? 'h-3 animate-bounce' : 'h-1'}`} />
                <span className={`w-0.5 bg-amber-400 rounded-full transition-all ${isPlayingAdhan ? 'h-2.5 animate-bounce delay-75' : 'h-1.5'}`} />
                <span className={`w-0.5 bg-amber-400 rounded-full transition-all ${isPlayingAdhan ? 'h-3.5 animate-bounce delay-150' : 'h-1'}`} />
              </span>
              <span className="text-[11px]">
                {isPlayingAdhan ? 'Aadaanku Wuu Yeerayaa' : '🔊 Daaro Aadaanka'}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              audioAlerts.stopAdhan();
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="Xir shaashadda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* TOP HEADER: Time, Prayer Title (Serif), and Poetic Subtitle */}
        <div className="text-center flex flex-col items-center shrink-0">
          <span className="text-xs font-medium tracking-widest uppercase text-white/60">
            {currentTimeFormatted}
          </span>
          <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal sm:font-medium tracking-tight leading-tight">
            {currentTheme.titleEnglish}
          </h1>
          <p className="font-serif-display italic text-xs text-white/60 mt-0.5 max-w-xs px-2">
            "{currentTheme.subtitle}"
          </p>
        </div>

        {/* CENTER CARD: Post-Prayer Dhikr (Compact, responsive, fits on laptop & phone!) */}
        <div
          className={`w-full max-w-[380px] rounded-[24px] ${currentTheme.cardBg} backdrop-blur-2xl border p-4 sm:p-5 shadow-2xl flex flex-col items-center text-center transition-all shrink-0`}
        >
          {/* Card Header Tag */}
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-1.5">
            POST-PRAYER DHIKR
          </span>

          {/* Arabic Text */}
          <div
            className={`font-arabic font-bold text-amber-100 leading-snug my-1 select-none ${
              currentStep.arabic.length > 50
                ? 'text-xl sm:text-2xl'
                : 'text-2xl sm:text-3xl'
            }`}
            dir="rtl"
          >
            {currentStep.arabic}
          </div>

          {/* Transliteration */}
          <p className="text-xs sm:text-sm font-medium italic text-white/90 mb-0.5 max-w-[300px] truncate">
            {currentStep.translit}
          </p>

          {/* Somali Translation */}
          <p className="text-[11px] sm:text-xs text-white/65 leading-relaxed max-w-[280px] mb-3 line-clamp-2">
            {currentStep.somali}
          </p>

          {/* Counter Widget: Circular + Button next to Big Number */}
          <div className="flex items-center justify-center gap-4 my-0.5">
            {/* Circular Increment Button */}
            <button
              onClick={handleIncrement}
              disabled={isCurrentStepDone}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-90 ${
                isCurrentStepDone
                  ? 'bg-emerald-500 text-slate-950 cursor-default'
                  : 'bg-gradient-to-br from-[#dfaf78] to-[#b37d4e] text-slate-950 hover:brightness-110 cursor-pointer'
              }`}
              title="Taabo si aad u tiriso"
            >
              {isCurrentStepDone ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : (
                <Plus className="w-6 h-6 stroke-[2.5]" />
              )}
            </button>

            {/* Big Number & Target */}
            <div className="flex flex-col items-start justify-center min-w-[65px]">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white/95 leading-none">
                {currentCount}
              </span>
              <span className="text-[11px] font-semibold text-white/60 mt-1 uppercase tracking-wider">
                of {currentStep.target}
              </span>
            </div>
          </div>

          {/* Thin progress bar */}
          <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-[#dfaf78] rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Dot Stepper Indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {steps.map((s, idx) => {
              const isDone = (counts[s.id] || 0) >= s.target;
              const isCurrent = idx === currentStepIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`transition-all cursor-pointer ${
                    isCurrent
                      ? 'w-5 h-1.5 rounded-full bg-[#dfaf78]'
                      : isDone
                      ? 'w-1.5 h-1.5 rounded-full bg-emerald-400'
                      : 'w-1.5 h-1.5 rounded-full bg-white/20'
                  }`}
                  title={s.translit}
                />
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: Big Golden "I've prayed, Wallahi" Button + Kan xiga + Remind Later (10 min / 30 min) */}
        <div className="w-full max-w-[380px] flex flex-col items-center gap-2 pb-2 shrink-0">
          {/* Prominent Golden Button */}
          <button
            onClick={() => {
              audioAlerts.stopAdhan();
              onMarkPrayed(prayer, isSisterMode ? 'early_home' : 'mosque');
            }}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#e3b880] via-[#dfaf78] to-[#c59357] hover:brightness-105 active:scale-98 text-[#2a1708] font-black text-sm sm:text-base shadow-xl shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {isSisterMode
                ? 'Waan Tukaday (Waqtigeeda Hore 🌸)'
                : "I've prayed, Wallahi (Waan tukaday)"}
            </span>
          </button>

          {/* Home option & Next Dhikr button */}
          <div className="flex items-center justify-between w-full px-1">
            <button
              onClick={() => {
                audioAlerts.stopAdhan();
                onMarkPrayed(prayer, 'home');
              }}
              className="text-xs font-semibold text-white/75 hover:text-white transition flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Guriga (Waqtiga dambe)</span>
            </button>

            <button
              onClick={handleMarkCurrentAsRead}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 transition py-1 px-2 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              Waan aqriyay (Kan xiga) →
            </button>
          </div>

          {/* REMIND ME LATER: 10 min & 30 min Dual Pills */}
          <div className="flex flex-col items-center gap-1 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              REMIND ME LATER (XUSUUSIN)
            </span>

            <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
              <button
                onClick={() => {
                  audioAlerts.stopAdhan();
                  onSnooze(10, prayer);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition cursor-pointer"
              >
                10 min
              </button>
              <div className="w-[1px] h-3.5 bg-white/20" />
              <button
                onClick={() => {
                  audioAlerts.stopAdhan();
                  onSnooze(30, prayer);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition cursor-pointer"
              >
                30 min
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
