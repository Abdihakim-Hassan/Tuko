import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Plus, Minus, RotateCcw, Sparkles } from 'lucide-react';

interface CustomTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime24?: string; // e.g. "10:45" or ""
  onSaveTime: (time24: string) => void;
  title?: string;
  subtitle?: string;
  allowClear?: boolean;
}

export function parse24To12(time24?: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!time24 || !time24.includes(':')) {
    const now = new Date();
    let h = now.getHours();
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    // round minute to nearest 5
    const m = Math.round(now.getMinutes() / 5) * 5 % 60;
    return { hour12: h, minute: m, ampm };
  }
  const [rawH, rawM] = time24.split(':').map(Number);
  const h24 = Number.isFinite(rawH) ? Math.min(23, Math.max(0, rawH)) : 10;
  const minute = Number.isFinite(rawM) ? Math.min(59, Math.max(0, rawM)) : 0;
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

export function format12To24(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (ampm === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getSomaliPeriod(hour12: number, ampm: 'AM' | 'PM'): string {
  if (ampm === 'AM') {
    if (hour12 === 12 || hour12 < 4) return 'Habeen Dambe (Habeenimo)';
    if (hour12 < 6) return 'Waaberi / Fajr';
    return 'Subaxnimo';
  } else {
    if (hour12 === 12 || hour12 < 3) return 'Duhurnimo';
    if (hour12 < 6) return 'Casirnimo';
    if (hour12 < 8) return 'Maqrib / Fiid';
    return 'Habeenimo';
  }
}

export const CustomTimePickerModal: React.FC<CustomTimePickerModalProps> = ({
  isOpen,
  onClose,
  initialTime24,
  onSaveTime,
  title = 'Dooro Saacadda & Daqiiqadda',
  subtitle = 'Xulo waqtiga, kadibna riix Keydi Waqtigan',
  allowClear = true,
}) => {
  const [hour12, setHour12] = useState<number>(10);
  const [minute, setMinute] = useState<number>(45);
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (isOpen) {
      const parsed = parse24To12(initialTime24);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setAmPm(parsed.ampm);
    }
  }, [isOpen, initialTime24]);

  if (!isOpen) return null;

  const handleIncrementHour = () => {
    setHour12((prev) => (prev % 12) + 1);
  };

  const handleDecrementHour = () => {
    setHour12((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const handleIncrementMinute = (amount: number = 1) => {
    setMinute((prev) => (prev + amount) % 60);
  };

  const handleDecrementMinute = (amount: number = 1) => {
    setMinute((prev) => (prev - amount < 0 ? 60 + (prev - amount) : prev - amount));
  };

  const handleSave = () => {
    const time24 = format12To24(hour12, minute, ampm);
    onSaveTime(time24);
    onClose();
  };

  const handleClear = () => {
    onSaveTime('');
    onClose();
  };

  const handlePreset = (presetH12: number, presetM: number, presetAmPm: 'AM' | 'PM') => {
    setHour12(presetH12);
    setMinute(presetM);
    setAmPm(presetAmPm);
  };

  const somaliPeriod = getSomaliPeriod(hour12, ampm);
  const formattedDisplay = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-[#07242c] via-[#09323c] to-[#041920] border-2 border-teal-400/60 shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED HEADER: Never scrolls away, has immediate top Save & Close buttons */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-900/80 border-b border-teal-500/30 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white truncate">{title}</h3>
              <p className="text-[11px] text-teal-200/80 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Quick Top Save button for instant tap */}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
              title="Keydi waqtigan hadda"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Keydi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Xir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY: Touch clock controls, direct hour chips, minute jumps & presets */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
          {/* Big Interactive Digital Clock Display */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/70 border-2 border-teal-500/40 text-center space-y-2 shadow-inner">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {/* Hour Block */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleIncrementHour}
                  className="w-12 h-8 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-300 flex items-center justify-center font-black active:scale-95 transition cursor-pointer border border-teal-400/30"
                  title="Ku dar saacad (+1)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight my-1 select-none">
                  {String(hour12).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={handleDecrementHour}
                  className="w-12 h-8 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-300 flex items-center justify-center font-black active:scale-95 transition cursor-pointer border border-teal-400/30"
                  title="Ka jar saacad (-1)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Saacad</span>
              </div>

              {/* Colon */}
              <span className="font-mono text-3xl font-black text-amber-400 self-center mb-5 animate-pulse">
                :
              </span>

              {/* Minute Block */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleIncrementMinute(5)}
                  className="w-12 h-8 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-300 flex items-center justify-center font-black active:scale-95 transition cursor-pointer border border-teal-400/30"
                  title="Ku dar 5 daqiiqo (+5)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="font-mono text-4xl sm:text-5xl font-black text-amber-300 tracking-tight my-1 select-none">
                  {String(minute).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleDecrementMinute(5)}
                  className="w-12 h-8 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-300 flex items-center justify-center font-black active:scale-95 transition cursor-pointer border border-teal-400/30"
                  title="Ka jar 5 daqiiqo (-5)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Daqiiqad</span>
              </div>

              {/* AM / PM Segmented Selector */}
              <div className="flex flex-col gap-2 self-center mb-5 ml-1 sm:ml-2">
                <button
                  type="button"
                  onClick={() => setAmPm('AM')}
                  className={`px-3 py-2 rounded-xl font-mono text-xs font-black transition active:scale-95 cursor-pointer ${
                    ampm === 'AM'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-2 ring-amber-300'
                      : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  AM (Subax)
                </button>
                <button
                  type="button"
                  onClick={() => setAmPm('PM')}
                  className={`px-3 py-2 rounded-xl font-mono text-xs font-black transition active:scale-95 cursor-pointer ${
                    ampm === 'PM'
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-md shadow-teal-500/40 ring-2 ring-teal-300'
                      : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  PM (Galab)
                </button>
              </div>
            </div>

            {/* Live Period Banner */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs font-bold">
              <span>⏰ Waqtiga: {formattedDisplay} {ampm}</span>
              <span className="text-slate-400">·</span>
              <span className="text-amber-300">{somaliPeriod}</span>
            </div>
          </div>

          {/* Quick Direct 1-Tap Hour Selector (1-12) */}
          <div>
            <span className="text-[10px] font-bold text-teal-300 uppercase block mb-1.5 tracking-wider">
              Dooro Saacadda Toos ah (1 ilaa 12):
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour12(h)}
                  className={`py-2 rounded-xl font-mono text-xs font-black transition active:scale-95 cursor-pointer ${
                    hour12 === h
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Minute Jumps */}
          <div>
            <span className="text-[10px] font-bold text-teal-300 uppercase block mb-1.5 tracking-wider">
              Daqiiqadaha Degdegga ah:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 15, 30, 45, 5, 10, 20, 50].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={`py-1.5 rounded-xl font-mono text-xs font-bold transition active:scale-95 cursor-pointer ${
                    minute === m
                      ? 'bg-teal-400 text-slate-950 font-black shadow'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prayer/Routine Presets */}
          <div>
            <span className="text-[10px] font-bold text-teal-300 uppercase block mb-1.5 tracking-wider">
              Waqtiyo Diyaar ah (Prayer / Daily Presets):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Tahajjud 04:00 AM', h: 4, m: 0, ap: 'AM' as const },
                { label: 'Fajr 04:45 AM', h: 4, m: 45, ap: 'AM' as const },
                { label: 'Subax 06:30 AM', h: 6, m: 30, ap: 'AM' as const },
                { label: 'Duhur 12:15 PM', h: 12, m: 15, ap: 'PM' as const },
                { label: 'Casar 03:30 PM', h: 3, m: 30, ap: 'PM' as const },
                { label: 'Maghrib 06:00 PM', h: 6, m: 0, ap: 'PM' as const },
                { label: 'Cishaa 07:30 PM', h: 7, m: 30, ap: 'PM' as const },
                { label: 'Habeen 09:30 PM', h: 9, m: 30, ap: 'PM' as const },
                { label: 'Hadda (Now)', h: parse24To12().hour12, m: parse24To12().minute, ap: parse24To12().ampm },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.h, p.m, p.ap)}
                  className="py-1.5 px-1 rounded-xl bg-white/5 hover:bg-teal-500/20 border border-white/10 hover:border-teal-400 text-[10px] font-semibold text-slate-200 transition truncate text-center active:scale-95 cursor-pointer"
                  title={p.label}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FIXED STICKY FOOTER: Pinned to bottom, ALWAYS visible on every mobile screen */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t-2 border-teal-500/40 space-y-2 shrink-0 shadow-2xl">
          {/* Main Primary Glowing Green Save Button with the currently selected time */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer ring-2 ring-emerald-300/60"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>KEYDI WAQTIGAN: {formattedDisplay} {ampm} ✓</span>
          </button>

          {/* Secondary Buttons: Cancel and Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition active:scale-95 cursor-pointer text-center"
            >
              Ka Laabo (Cancel)
            </button>

            {allowClear && (
              <button
                type="button"
                onClick={handleClear}
                className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition active:scale-95 cursor-pointer"
                title="Tirtir waqtiga"
              >
                Nadiifi (Clear)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
