import React, { useState } from 'react';
import { Share2, Copy, Check, Sparkles, MessageCircle } from 'lucide-react';
import { getDailyWisdom } from '../utils/dailyWisdom';

interface DailyWisdomCardProps {
  activeDateKey: string;
}

export const DailyWisdomCard: React.FC<DailyWisdomCardProps> = ({ activeDateKey }) => {
  const [copied, setCopied] = useState(false);
  const wisdom = getDailyWisdom(activeDateKey);

  const shareText = `« ${wisdom.arabic} »\n\n${wisdom.somali}\n\n📖 Xigasho: ${wisdom.source}\n\n— Laga soo xigtay Tuko App`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aayadda / Xadiiska Maalinta',
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2e39] via-[#092933] to-[#061c24] border border-teal-500/25 shadow-xl relative overflow-hidden space-y-3.5">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-teal-300">
            {wisdom.type === 'aayad'
              ? 'Aayadda Maalinta'
              : wisdom.type === 'xadiis'
              ? 'Xadiiska Maalinta'
              : 'Ducada Maalinta'}
          </span>
        </div>

        {/* Action Buttons: WhatsApp & Copy */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            title="La wadaag WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition active:scale-95"
            title="Wadaag"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition active:scale-95"
            title="Guuri qoraalka"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Arabic Calligraphy Style Text */}
      <div
        className="text-lg sm:text-xl font-arabic text-amber-200 text-right leading-relaxed pr-2 drop-shadow-sm"
        dir="rtl"
      >
        {wisdom.arabic}
      </div>

      {/* Somali Translation */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
        {wisdom.somali}
      </p>

      {/* Source Reference Tag */}
      <div className="pt-2 border-t border-teal-500/20 flex items-center justify-between text-[11px] text-teal-300/80 font-semibold">
        <span>{wisdom.source}</span>
        <span className="text-slate-400">Tuko – Dhawr-Salaad</span>
      </div>
    </div>
  );
};
