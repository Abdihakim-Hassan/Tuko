import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Clock, Volume2, X, RotateCcw, Check } from 'lucide-react';
import { CustomAlarm } from '../types';
import { audioAlerts } from '../utils/audioAlerts';

interface AlarmRingModalProps {
  alarm: CustomAlarm;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({
  alarm,
  onDismiss,
  onSnooze,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    // Start ringing sound
    audioAlerts.playAlarm(alarm.sound, alarm.selectedVoice || 'makkah');

    // Trigger phone vibration if supported
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([600, 300, 600, 300, 1000]);
      } catch {}
    }

    const timer = setInterval(() => {
      setCurrentTimeStr(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    return () => {
      clearInterval(timer);
      audioAlerts.stopAlarm();
    };
  }, [alarm]);

  const handleDismiss = () => {
    audioAlerts.stopAlarm();
    onDismiss();
  };

  const handleSnooze = (minutes = 5) => {
    audioAlerts.stopAlarm();
    onSnooze(minutes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-[#07242e] via-[#093540] to-[#041a22] border-2 border-amber-400/50 p-6 sm:p-8 shadow-2xl shadow-amber-950/70 text-center space-y-6">
        {/* Pulsing glow background effect */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Shaking Bell Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/30 animate-bounce">
          <BellRing className="w-12 h-12 stroke-[2.5]" />
        </div>

        {/* Alarm Title & Details */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-black tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Alaarm-ku Wuu Dhacayaa!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {alarm.label || 'Alaarm-ka Tuko'}
          </h2>

          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-tight pt-1">
            {currentTimeStr}
          </div>

          <p className="text-xs text-teal-200/80">
            Codka:{' '}
            <span className="font-semibold text-white">
              {alarm.sound === 'adhan'
                ? `Aadaanka (${alarm.selectedVoice?.toUpperCase() || 'MAKKAH'})`
                : alarm.sound === 'chime'
                ? 'Dhawaaqa Chime'
                : alarm.sound === 'soft_bell'
                ? 'Dhawaaqa Soft Bell'
                : alarm.sound === 'digital'
                ? 'Dhawaaqa Digital'
                : alarm.sound === 'classic'
                ? 'Dhawaaqa Classic'
                : 'Dhawaaqa Gentle Morning'}
            </span>
          </p>
        </div>

        {/* Action Buttons: Dismiss & Snooze */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-base shadow-xl shadow-teal-500/30 flex items-center justify-center gap-2.5 transition active:scale-98 touch-manipulation cursor-pointer"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>Demi Alaarm-ka Hadda (Dismiss)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSnooze(5)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 touch-manipulation cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Dib u dhig 5 Daqiiqo (Snooze)</span>
          </button>

          <button
            type="button"
            onClick={() => audioAlerts.playAlarm(alarm.sound, alarm.selectedVoice || 'makkah')}
            className="inline-flex items-center gap-1.5 text-xs text-amber-300/90 hover:text-amber-200 underline underline-offset-4 font-semibold transition active:scale-95 pt-1"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Haddii biraawsarku aamusiyay, taabo halkan si aad u shido codka</span>
          </button>
        </div>
      </div>
    </div>
  );
};
