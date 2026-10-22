import React from 'react';
import { Building2, HeartHandshake, Sparkles } from 'lucide-react';

interface GenderModalProps {
  onSelect: (gender: 'male' | 'female') => void;
}

export const GenderModal: React.FC<GenderModalProps> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#09222c] via-[#082935] to-[#05171d] border border-teal-500/40 p-6 shadow-2xl text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Su'aal Muhiim ah (Hal Mar Oo Keliya)</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Ma Wiil baad tahay mise Gabar?
          </h2>
          <p className="text-xs sm:text-sm text-teal-200/90 leading-relaxed">
            Fadlan dooro qaybtaada si aan u kala saarno xogta salaadaha{' '}
            <strong>Wiilasha (Masaajidka)</strong> iyo{' '}
            <strong>Gabdhaha (Guriga &amp; Maalmaha Fasaxa)</strong>:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => onSelect('male')}
            className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border-2 border-emerald-500/40 hover:border-emerald-400 text-emerald-200 hover:text-white transition active:scale-95 shadow-lg group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              🕌
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-base text-white block">
                Wiil (Walaal)
              </span>
              <span className="text-[11px] text-emerald-300/90 block font-semibold">
                Salaadda Masaajidka, Jamaacada &amp; Guriga
              </span>
            </div>
            <span className="mt-1 px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Dooro Wiil</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('female')}
            className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-pink-950/50 hover:bg-pink-900/60 border-2 border-pink-500/40 hover:border-pink-400 text-pink-200 hover:text-white transition active:scale-95 shadow-lg group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              🌸
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-base text-white block">
                Gabar (Walaashay)
              </span>
              <span className="text-[11px] text-pink-300/90 block font-semibold">
                Waqtiga Hore, Guriga &amp; Maalmaha Fasaxa (Udhur)
              </span>
            </div>
            <span className="mt-1 px-3 py-1 rounded-xl bg-pink-500 text-white font-black text-xs flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Dooro Gabar</span>
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          🔒 Doorashadaada waxaa lagu xafidayaa koontadaada gaarka ah, mar dambe laguma weydiin doono.
        </p>
      </div>
    </div>
  );
};

