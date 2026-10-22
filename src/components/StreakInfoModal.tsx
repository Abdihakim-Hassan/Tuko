import React, { useState } from 'react';
import {
  Flame,
  X,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Award,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { AppSettings } from '../types';

interface StreakInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  bestStreakDays: number;
  settings: AppSettings;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
}

export const StreakInfoModal: React.FC<StreakInfoModalProps> = ({
  isOpen,
  onClose,
  streakDays,
  bestStreakDays,
  settings,
  onUpdateSettings,
}) => {
  const [customStreakInput, setCustomStreakInput] = useState<string>(
    String(settings.startingStreakOffset || '')
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveStartingStreak = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customStreakInput.trim(), 10);
    const offset = isNaN(val) || val < 0 ? 0 : val;
    if (onUpdateSettings) {
      onUpdateSettings({ startingStreakOffset: offset });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    }
  };

  const handleResetStreak = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ startingStreakOffset: 0 });
      setCustomStreakInput('0');
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0c242e] via-[#091b22] to-[#06141a] border border-teal-500/30 p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition active:scale-95 touch-manipulation"
          title="Xir"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/30 border border-amber-400/30 text-amber-300">
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>Waa Maxay Taxanaha (Streak)?</span>
            </h3>
            <p className="text-xs text-teal-300/90 font-medium">
              Sidee buu u shaqeeyaa &amp; sideed ku bilaabi kartaa
            </p>
          </div>
        </div>

        {/* Current Active Badge */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-teal-950/40 border border-amber-500/30 mb-5 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
              Taxanahaaga Hadda
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono flex items-baseline gap-1.5">
              <span>{streakDays}</span>
              <span className="text-xs font-semibold text-slate-300">
                {streakDays === 1 ? 'Maalin taxane ah' : 'Maalmood xiriir ah'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-teal-300/80">Ugu Sarreeyay</span>
            <div className="text-base sm:text-lg font-bold text-teal-200">
              {bestStreakDays} {bestStreakDays === 1 ? 'maalin' : 'maalmood'}
            </div>
          </div>
        </div>

        {/* Clear Explanation Points */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm">
              <h4 className="font-bold text-white mb-0.5">Waa maxay Streak?</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Waa tirada maalmaha xiriirka ah ee aad <span className="text-emerald-300 font-semibold">5-taada salaadood</span> (Fajr, Duhur, Casar, Maqrib, Cishe) si joogto ah u wada tukatay adigoon hal salaadna ka tegin.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-300 shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm">
              <h4 className="font-bold text-white mb-0.5">Sidee buu u kordhaa?</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Maalin kasta oo aad 5-ta salaadood wada tukato (Masaajid ama Guriga, ama Dumarka udhurka ku jira), taxanahaagu wuxuu kordhayaa <span className="text-amber-300 font-bold">+1 maalin</span>.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm">
              <h4 className="font-bold text-white mb-0.5">Goorma ayuu bilaabmaa / dib u bilaabmaa?</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Haddii maalin dhan aadan 5-ta salaadood wada tukan, maalinta xigta taxanuhu wuxuu dib uga bilaabmaa 0. <span className="text-teal-200">Laakiin maalinta hadda socota</span> (sida Duhurka ama Casarka) ma jabiso taxanahaaga ilaa maalintu dhammaato!
              </p>
            </div>
          </div>
        </div>

        {/* Set Initial Starting Streak Form */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/60 to-slate-900/90 border border-teal-500/30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
            <Sliders className="w-4 h-4 text-teal-400" />
            <span>Bilow ama Sax Taxanahaaga (Starting Streak)</span>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            Haddii aad horey u tukanaysay maalmo badan ka hor inta aadan app-ka soo degsan (tusaale 10, 20 ama 30 maalmood), waxaad halkan toos uga bilaabi kartaa taxanahaaga:
          </p>

          <form onSubmit={handleSaveStartingStreak} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="3650"
                value={customStreakInput}
                onChange={(e) => setCustomStreakInput(e.target.value)}
                placeholder="Geli tirada maalmaha (tusaale: 14)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-teal-500/40 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-md active:scale-95 touch-manipulation"
              >
                Keydi &amp; Bilow
              </button>
            </div>

            {savedSuccess && (
              <div className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Taxanahaaga si guul leh ayaa loo bilaabay oo loo cusboonaysiiyay!</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Haddii aad rabto inaad eber ka bilowdo:</span>
              <button
                type="button"
                onClick={handleResetStreak}
                className="text-amber-300 hover:text-amber-200 underline font-semibold transition active:scale-95"
              >
                Dib ugu celi 0
              </button>
            </div>
          </form>
        </div>

        {/* Done Button */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95"
          >
            Waayahay, Waan Fahmay ✓
          </button>
        </div>
      </div>
    </div>
  );
};
