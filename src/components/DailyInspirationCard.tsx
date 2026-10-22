import React, { useState } from 'react';
import { Sparkles, Share2, Check, Bookmark } from 'lucide-react';
import { DailyInspiration } from '../types';

interface DailyInspirationCardProps {
  inspiration: DailyInspiration;
}

export const DailyInspirationCard: React.FC<DailyInspirationCardProps> = ({ inspiration }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `📖 Xigmadda Maalinta (Tuko):\n\n"${inspiration.arabic}"\n\n${inspiration.somali}\n— ${inspiration.source}\n\nKu dhawr salaadahaaga Tuko: https://ais-pre-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-emerald-950/40 border border-teal-500/25 p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
            <Bookmark className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-teal-300">
            Aayadda &amp; Xadiiska Maalinta
          </span>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-teal-200 transition active:scale-95"
          title="Nuqul ka qaad / Wadaag"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Nuqul baa la qaaday!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3 h-3 text-cyan-300" />
              <span>Wadaag</span>
            </>
          )}
        </button>
      </div>

      {/* Arabic scripture */}
      <p className="font-arabic text-base sm:text-lg text-emerald-200 text-right leading-loose tracking-wide">
        {inspiration.arabic}
      </p>

      {/* Somali translation & Source */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <p className="text-slate-300 italic font-medium leading-relaxed">
          "{inspiration.somali}"
        </p>
        <span className="text-[11px] font-bold text-teal-400 shrink-0 sm:ml-4">
          — {inspiration.source}
        </span>
      </div>
    </div>
  );
};
