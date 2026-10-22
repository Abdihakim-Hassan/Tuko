import React, { useState } from 'react';
import { Sparkles, BookOpen, Heart, CheckCircle2, RotateCcw } from 'lucide-react';
import { DayData } from '../types';

interface FridaySpecialCardProps {
  dayData: DayData;
  onUpdateDay: (updates: Partial<DayData>) => void;
}

export const FridaySpecialCard: React.FC<FridaySpecialCardProps> = ({
  dayData,
  onUpdateDay,
}) => {
  const [salawatLocalCount, setSalawatLocalCount] = useState<number>(
    dayData.fridaySalawatCount || 0
  );
  const [showKahfInfo, setShowKahfInfo] = useState(false);

  const isKahfRead = !!dayData.fridayKahfRead;

  const handleToggleKahf = () => {
    const nextVal = !isKahfRead;
    onUpdateDay({ fridayKahfRead: nextVal });
    if (navigator.vibrate) navigator.vibrate(35);
  };

  const handleIncrementSalawat = (amount = 1) => {
    const nextVal = salawatLocalCount + amount;
    setSalawatLocalCount(nextVal);
    onUpdateDay({ fridaySalawatCount: nextVal });
    if (navigator.vibrate) navigator.vibrate(25);
  };

  const handleResetSalawat = () => {
    setSalawatLocalCount(0);
    onUpdateDay({ fridaySalawatCount: 0 });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2e28] via-[#0a2723] to-[#071c18] border border-emerald-400/40 p-5 sm:p-6 shadow-2xl text-white">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <span className="text-xl">🕌</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                Sayidka Maalmaha • Jimce Mubaarak
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              Hab-ka Gaarka ah ee Jimcaha
            </h3>
          </div>
        </div>

        <div className="text-xs text-emerald-200/90 font-medium bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-400/30">
          ✨ Nuur u dhexeeya labada Jimco
        </div>
      </div>

      {/* Main Content Grid: Suuratul Kahf & Saliga Nabiga */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* CARD 1: Suuratul Al-Kahf Tracker */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isKahfRead
            ? 'bg-gradient-to-br from-emerald-950/60 to-teal-950/40 border-emerald-400/50 shadow-md'
            : 'bg-slate-900/60 border-white/10 hover:border-emerald-400/30'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Akhriska Suuratul Al-Kahf</h4>
                <p className="text-xs text-emerald-300/80">Sunno mu’akada ah maalinta Jimcaha</p>
              </div>
            </div>

            <button
              onClick={handleToggleKahf}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                isKahfRead
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isKahfRead ? 'Waan Akhriyay ✓' : 'Ma Akhriyay?'}</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-300 text-[11px]">
              {isKahfRead ? 'Alxamdulillah! Nuurka Jimcaha ayaad xaqiijisay.' : 'Ha moogaanin ajaraka weyn ee Suuratul Kahf maanta.'}
            </span>
            <button
              onClick={() => setShowKahfInfo(!showKahfInfo)}
              className="text-[11px] text-emerald-300 hover:underline shrink-0"
            >
              {showKahfInfo ? 'Qari' : 'Fadliga'}
            </button>
          </div>

          {showKahfInfo && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed animate-in fade-in">
              Rasuulku (SCW) wuxuu yidhi: <em>“Qofkii akhriya Suuradda Al-Kahf maalinta Jimcaha, waxaa u ifaya nuur u dhexeeya labada Jimco.”</em> (Saxiix Al-Jaamic)
            </div>
          )}
        </div>

        {/* CARD 2: Saliga Nabiga (NNKH) Counter */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ku Saliga Nabiga (SCW)</h4>
                <p className="text-[11px] text-amber-300/80">Ugu yaraan 100 jeer maanta</p>
              </div>
            </div>

            <span className="font-mono text-xl font-black text-amber-300 bg-amber-950/50 px-3 py-1 rounded-xl border border-amber-500/30">
              {salawatLocalCount}
            </span>
          </div>

          {/* Arabic phrase */}
          <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-white/5 text-center font-arabic text-sm text-emerald-200">
            اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => handleIncrementSalawat(1)}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            >
              <span>+1 Sali</span>
            </button>
            <button
              onClick={() => handleIncrementSalawat(10)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-white/10 active:scale-95 transition"
            >
              +10
            </button>
            <button
              onClick={() => handleIncrementSalawat(33)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-white/10 active:scale-95 transition"
            >
              +33
            </button>
            {salawatLocalCount > 0 && (
              <button
                onClick={handleResetSalawat}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Dib u bilaab tirada"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
