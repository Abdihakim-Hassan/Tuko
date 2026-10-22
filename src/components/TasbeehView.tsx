import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Vibrate,
  Award,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { DayData } from '../types';

interface TasbeehViewProps {
  dayData: DayData;
  onUpdateTasbeeh: (count: number) => void;
}

interface DhikrPreset {
  id: string;
  arabic: string;
  translit: string;
  somali: string;
  defaultTarget: number;
}

const PRESET_DHIKRS: DhikrPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    translit: 'Subhaanallaah',
    somali: 'Ceebeysanaan Allaah baa ka fog',
    defaultTarget: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    translit: 'Alxamdulillaah',
    somali: 'Mahad iyo ammaan Allaah baa iska leh',
    defaultTarget: 33,
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    translit: 'Allaahu Akbar',
    somali: 'Allaah baa wax kasta ka weyn',
    defaultTarget: 33,
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    translit: 'Laa ilaaha illallaah',
    somali: 'Ilaah xaq lagu caabudo ma jiro Allaah mooyee',
    defaultTarget: 100,
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    translit: 'Astaghfirullaaha wa atoobu ilayh',
    somali: 'Waxaan dambi-dhaaf weydiisanayaa Allaah waana u toobad keenayaa',
    defaultTarget: 100,
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ',
    translit: 'Allaahumma salli \'alaa Muhammad wa \'alaa aali Muhammad',
    somali: 'Ilaahow u naxariiso Nabiga iyo reerkiisa',
    defaultTarget: 100,
  },
  {
    id: 'hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translit: 'Laa hawla wa laa quwwata illaa billaah',
    somali: 'Xoog iyo xeelad ma jirto Allaah mooyee',
    defaultTarget: 33,
  },
  {
    id: 'tasbeeh_bihamdih',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    translit: 'Subhaanallaahi wa bihamdihi, Subhaanallaahil-\'Adheem',
    somali: 'Labo kalimadood oo carabka u fudud, miizaankana ku culus',
    defaultTarget: 100,
  },
];

export const TasbeehView: React.FC<TasbeehViewProps> = ({ dayData, onUpdateTasbeeh }) => {
  const [selectedPreset, setSelectedPreset] = useState<DhikrPreset>(PRESET_DHIKRS[0]);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [target, setTarget] = useState<number>(33);
  const [laps, setLaps] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [celebration, setCelebration] = useState<boolean>(false);

  const totalToday = dayData.tasbeehCount || 0;

  // Sound generator
  const playClickSound = (isMilestone = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = isMilestone ? 880 : 540;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isMilestone ? 0.25 : 0.08));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (isMilestone ? 0.25 : 0.08));
    } catch {
      // Audio permission
    }
  };

  const handleIncrement = () => {
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 120);

    const nextCount = currentCount + 1;
    const isTargetHit = target > 0 && nextCount % target === 0;

    if (isTargetHit) {
      setLaps((prev) => prev + 1);
      setCelebration(true);
      setTimeout(() => setCelebration(false), 1500);

      playClickSound(true);
      if (vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([60, 50, 60, 50, 100]);
      }
    } else {
      playClickSound(false);
      if (vibrateEnabled && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }

    setCurrentCount(nextCount);
    onUpdateTasbeeh((dayData.tasbeehCount || 0) + 1);
  };

  const handleReset = () => {
    if (window.confirm('Ma hubtaa inaad dib u bilaabayso tirada hadda?')) {
      setCurrentCount(0);
      setLaps(0);
    }
  };

  const handleSelectPreset = (p: DhikrPreset) => {
    setSelectedPreset(p);
    setTarget(p.defaultTarget);
    setCurrentCount(0);
    setLaps(0);
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Top Banner & Dhikr Switcher */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c2633] via-[#092d3b] to-[#061d27] border border-teal-500/25 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📿</span>
            <div>
              <h2 className="text-lg font-black text-white">Tasbeex Dijitaal ah</h2>
              <span className="text-xs text-teal-300 font-semibold">
                Wadarta Maanta: <strong className="text-emerald-300 font-mono">{totalToday}</strong> jeer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs transition ${
                soundEnabled
                  ? 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                  : 'bg-slate-800 border-white/5 text-slate-500'
              }`}
              title="Codka Tasbeexda"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setVibrateEnabled(!vibrateEnabled)}
              className={`p-2 rounded-xl border text-xs transition ${
                vibrateEnabled
                  ? 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                  : 'bg-slate-800 border-white/5 text-slate-500'
              }`}
              title="Gariirka (Vibration)"
            >
              <Vibrate className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 transition"
              title="Dib u bilow"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dhikr Presets Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {PRESET_DHIKRS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                selectedPreset.id === p.id
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 border-teal-400 font-black shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-white/5'
              }`}
            >
              {p.translit}
            </button>
          ))}
        </div>
      </div>

      {/* Main Touch Area - Click Anywhere to Count */}
      <div
        onClick={handleIncrement}
        className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 border transition-all duration-150 cursor-pointer select-none flex flex-col items-center justify-between min-h-[360px] shadow-2xl active:scale-[0.98] ${
          isPressing
            ? 'bg-gradient-to-b from-[#0e3b4a] to-[#0a2732] border-cyan-400 scale-[0.99] shadow-cyan-500/20'
            : celebration
            ? 'bg-gradient-to-b from-[#093d31] to-[#06241d] border-emerald-400 shadow-emerald-500/30'
            : 'bg-gradient-to-b from-[#0a2530] via-[#081e28] to-[#05141b] border-teal-500/30 hover:border-teal-400/50'
        }`}
      >
        {/* Ambient Ring Wave */}
        <div className="absolute inset-0 bg-radial-gradient from-teal-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Top Info: Arabic & Meaning */}
        <div className="text-center space-y-2 z-10 w-full">
          <div className="text-2xl sm:text-3xl font-arabic text-amber-200 leading-relaxed drop-shadow-md">
            {selectedPreset.arabic}
          </div>
          <div className="text-xs sm:text-sm text-teal-200 font-semibold italic">
            {selectedPreset.translit}
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {selectedPreset.somali}
          </p>
        </div>

        {/* Center: Big Counter */}
        <div className="my-6 z-10 text-center flex flex-col items-center">
          <div className="relative">
            <span
              className={`font-black font-mono tracking-tight text-7xl sm:text-8xl drop-shadow-2xl transition-all ${
                celebration ? 'text-emerald-300 scale-110' : 'text-white'
              }`}
            >
              {currentCount}
            </span>

            {celebration && (
              <span className="absolute -top-6 -right-6 text-2xl animate-bounce">
                ✨
              </span>
            )}
          </div>

          {/* Progress to target */}
          {target > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs uppercase font-bold text-slate-400">
                Bartilmaameed:
              </span>
              <span className="text-sm font-black font-mono text-cyan-300">
                {currentCount % target} / {target}
              </span>
              {laps > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {laps} Wareeg (Lap)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Hint */}
        <div className="z-10 text-center text-xs text-slate-400 flex items-center gap-1.5 opacity-80">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Taabo meel kasta oo shaashadda ka mid ah si aad u tiriso</span>
        </div>
      </div>

      {/* Target Selector Buttons */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/60 border border-white/10">
        <span className="text-xs font-bold text-slate-300">Tirada (Target):</span>
        <div className="flex items-center gap-1.5">
          {[33, 99, 100, 1000, 0].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition border ${
                target === t
                  ? 'bg-teal-500 text-slate-950 border-teal-400'
                  : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
              }`}
            >
              {t === 0 ? 'Xad la\'aan' : t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
