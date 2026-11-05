import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Home,
  XCircle,
  BookOpen,
  Sparkles,
  MessageSquare,
  HeartHandshake,
  Share2,
  Download,
  Copy,
  Check,
  Flame,
  Award,
} from 'lucide-react';
import { AppSettings, DayData } from '../types';
import { PRAYER_ORDER } from '../utils/prayerTimes';

interface StatsViewProps {
  allDays: Record<string, DayData>;
  settings?: AppSettings;
  streakDays?: number;
  bestStreakDays?: number;
}

export const StatsView: React.FC<StatsViewProps> = ({
  allDays,
  settings,
  streakDays = 0,
  bestStreakDays = 0,
}) => {
  const isSisterMode = settings?.gender === 'female';
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  let allTimeMosque = 0;
  let allTimeEarlyHome = 0;
  let allTimeHome = 0;
  let allTimeMissed = 0;
  let allTimeExcused = 0;
  let allTimeExcusedDays = 0;
  let allTimeQuran = 0;
  let allTimeAdhkar = 0;

  const homeReasons: Record<string, number> = {};
  const missedReasons: Record<string, number> = {};

  // Last 7 days counters
  let weekMosque = 0;
  let weekEarlyHome = 0;
  let weekHome = 0;
  let weekMissed = 0;
  let weekExcused = 0;
  let weekQuran = 0;
  let weekAdhkar = 0;

  // Last 30 days counters
  let monthMosque = 0;
  let monthHome = 0;
  let monthMissed = 0;
  let monthExcused = 0;
  let monthQuran = 0;
  let monthAdhkar = 0;

  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);

  Object.entries(allDays).forEach(([dateStr, day]) => {
    const dayDate = new Date(dateStr + 'T12:00:00');
    const isWithinWeek = !isNaN(dayDate.getTime()) && dayDate >= weekAgo;
    const isWithinMonth = !isNaN(dayDate.getTime()) && dayDate >= monthAgo;

    if (day?.isExcusedDay) {
      allTimeExcusedDays++;
    }

    if (day && day.salaah) {
      PRAYER_ORDER.forEach((p) => {
        const rec = day.salaah[p];
        if (!rec) return;

        if (rec.status === 'mosque') {
          allTimeMosque++;
          if (isWithinWeek) weekMosque++;
          if (isWithinMonth) monthMosque++;
        } else if (rec.status === 'early_home') {
          allTimeEarlyHome++;
          allTimeMosque++; // counts as top-tier excellence
          if (isWithinWeek) {
            weekEarlyHome++;
            weekMosque++;
          }
          if (isWithinMonth) monthMosque++;
        } else if (rec.status === 'home') {
          allTimeHome++;
          if (isWithinWeek) weekHome++;
          if (isWithinMonth) monthHome++;
          if (rec.reason && rec.reason.trim()) {
            const r = rec.reason.trim();
            homeReasons[r] = (homeReasons[r] || 0) + 1;
          }
        } else if (rec.status === 'missed') {
          allTimeMissed++;
          if (isWithinWeek) weekMissed++;
          if (isWithinMonth) monthMissed++;
          if (rec.reason && rec.reason.trim()) {
            const r = rec.reason.trim();
            missedReasons[r] = (missedReasons[r] || 0) + 1;
          }
        } else if (rec.status === 'excused') {
          allTimeExcused++;
          if (isWithinWeek) weekExcused++;
          if (isWithinMonth) monthExcused++;
        }
      });
    }

    const q = Number(day.quran) || 0;
    allTimeQuran += q;
    if (isWithinWeek) weekQuran += q;
    if (isWithinMonth) monthQuran += q;

    if (day.adhkar) {
      const adhCount = Object.values(day.adhkar).filter(Boolean).length;
      allTimeAdhkar += adhCount;
      if (isWithinWeek) weekAdhkar += adhCount;
      if (isWithinMonth) monthAdhkar += adhCount;
    }
  });

  const periodMosque = reportPeriod === 'week' ? weekMosque : monthMosque;
  const periodHome = reportPeriod === 'week' ? weekHome : monthHome;
  const periodExcused = reportPeriod === 'week' ? weekExcused : monthExcused;
  const periodQuran = reportPeriod === 'week' ? weekQuran : monthQuran;
  const periodAdhkar = reportPeriod === 'week' ? weekAdhkar : monthAdhkar;
  const periodPrayedTotal = periodMosque + periodHome + periodExcused;

  const generateShareText = () => {
    const periodLabel = reportPeriod === 'week' ? '7-dii Maalmood ee u Dambeeyay' : '30-kii Maalmood ee Bisha';
    const topLabel = isSisterMode ? '🌟 Waqtiga Hore' : '🕌 Masaajidka';
    const fasaxLine = isSisterMode && periodExcused > 0 ? `\n🌸 Fasax (Udhur): ${periodExcused} salaadood` : '';
    return `✨ *Warbixintayda Cibaadada (Tuko App)* ✨\n📅 *Muddada:* ${periodLabel}\n\n🔥 *Taxanaha (Streak):* ${streakDays} Maalmood (Ugu sarreeyay: ${bestStreakDays})\n${topLabel}: ${periodMosque} salaadood\n🏠 *Guriga:* ${periodHome} salaadood${fasaxLine}\n📖 *Qur'aanka:* ${periodQuran} bog\n📿 *Adhkaarta:* ${periodAdhkar} jeer\n\nAlxamdulillaah! Ku dadaal ilaalinta salaadda iyo dikriga Eebbe.`;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2800);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadProgressImage = () => {
    setDownloadingCard(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Rich Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      if (isSisterMode) {
        grad.addColorStop(0, '#1f0919');
        grad.addColorStop(0.5, '#131b26');
        grad.addColorStop(1, '#07141a');
      } else {
        grad.addColorStop(0, '#07222b');
        grad.addColorStop(0.5, '#092c36');
        grad.addColorStop(1, '#041217');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Decorative Gold/Teal Border
      ctx.strokeStyle = isSisterMode ? 'rgba(244, 114, 182, 0.45)' : 'rgba(45, 212, 191, 0.45)';
      ctx.lineWidth = 6;
      ctx.strokeRect(48, 48, 984, 1254);

      // Header Title
      ctx.fillStyle = '#5eead4';
      ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TUKO – DHAWR-SALAAD & ADKAAR', 540, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 56px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        reportPeriod === 'week' ? 'WARBIXINTA TODOBAADKA' : 'WARBIXINTA BISHA',
        540,
        220
      );

      ctx.fillStyle = isSisterMode ? '#f9a8d4' : '#99f6e4';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        isSisterMode ? '🌸 Qaybta Gabdhaha • Natiijada Cibaadada' : '🕌 Qaybta Wiilasha • Natiijada Cibaadada',
        540,
        275
      );

      // Big Streak Highlight Box
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.fillRect(100, 330, 880, 190);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, 330, 880, 190);

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('🔥 TAXANAHA SALAADDA (STREAK)', 540, 395);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 72px monospace';
      ctx.fillText(`${streakDays} MAALMOOD`, 540, 480);

      // 4 Stat Boxes Grid
      const boxes = [
        {
          label: isSisterMode ? 'WAQTIGA HORE 🌟' : 'MASAAJIDKA 🕌',
          val: `${periodMosque}`,
          sub: 'Salaadood',
          color: '#34d399',
        },
        {
          label: 'GURIGA 🏠',
          val: `${periodHome}`,
          sub: isSisterMode && periodExcused > 0 ? `+ ${periodExcused} Fasax 🌸` : 'Salaadood',
          color: '#fbbf24',
        },
        {
          label: "QUR'AANKA KARIIMKA 📖",
          val: `${periodQuran}`,
          sub: 'Bog la akhriyay',
          color: '#38bdf8',
        },
        {
          label: 'ADHKAARTA & DUCADA 📿',
          val: `${periodAdhkar}`,
          sub: 'Wardi la dhammeeyay',
          color: '#c084fc',
        },
      ];

      boxes.forEach((b, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 100 + col * 455;
        const y = 565 + row * 265;
        const w = 425;
        const h = 235;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = b.color;
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillText(b.label, x + w / 2, y + 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 74px monospace';
        ctx.fillText(b.val, x + w / 2, y + 150);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.fillText(b.sub, x + w / 2, y + 200);
      });

      // Footer Inspiring Quote
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'italic 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        '« Camalka Eebbe agtiisa loogu jecel yahay waa kan joogtada ah haba yaraadee »',
        540,
        1175
      );

      ctx.fillStyle = '#2dd4bf';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Taariikhda: ${new Date().toISOString().slice(0, 10)} • Tuko App`, 540, 1245);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `tuko-warbixinta-${reportPeriod}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error generating progress card:', err);
    } finally {
      setTimeout(() => setDownloadingCard(false), 600);
    }
  };

  const allTimeTotalPrayers = allTimeMosque + allTimeHome + allTimeMissed;
  const mosquePercent = allTimeTotalPrayers
    ? Math.round((allTimeMosque / allTimeTotalPrayers) * 100)
    : 0;
  const homePercent = allTimeTotalPrayers
    ? Math.round((allTimeHome / allTimeTotalPrayers) * 100)
    : 0;
  const missedPercent = allTimeTotalPrayers
    ? Math.round((allTimeMissed / allTimeTotalPrayers) * 100)
    : 0;

  const topHomeReasons = Object.entries(homeReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topMissedReasons = Object.entries(missedReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* 1. Compact App Header & Period Switcher */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-300" />
          <h2 className="text-lg font-black text-white tracking-tight">
            Tirakoobka Cibaadada
          </h2>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-teal-500/25 shrink-0">
          <button
            type="button"
            onClick={() => setReportPeriod('week')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              reportPeriod === 'week'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            7 Maalin
          </button>
          <button
            type="button"
            onClick={() => setReportPeriod('month')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              reportPeriod === 'month'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            30 Maalin
          </button>
        </div>
      </div>

      {/* 2. Unified Mobile App Summary & Share Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-2xl space-y-4 ${
          isSisterMode
            ? 'bg-gradient-to-br from-[#230b1c] via-[#171222] to-[#0a161e] border-pink-500/35'
            : 'bg-gradient-to-br from-[#07242e] via-[#0a2f3a] to-[#06181f] border-teal-500/35'
        }`}
      >
        {/* Streak + Period Summary Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-300 block">
              {reportPeriod === 'week' ? 'Warbixinta Todobaadka' : 'Warbixinta Bisha'}
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              Wadarta: {periodPrayedTotal} Salaadood
            </h3>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/35">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400 shrink-0" />
            <div className="text-right">
              <div className="text-[9px] font-bold uppercase text-amber-300/80">Streak</div>
              <div className="text-sm font-black font-mono text-amber-300 leading-none">
                {streakDays}d
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 Clean App Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-center">
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-[11px] font-bold text-emerald-300 block">
              {isSisterMode ? '🌸 Waqtiga Hore' : '🕌 Masaajidka'}
            </span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              {periodMosque}
            </div>
            <span className="text-[10px] text-slate-400">Salaadood</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30">
            <span className="text-[11px] font-bold text-amber-300 block">
              {isSisterMode && periodExcused > 0 ? '🏠 Guriga & 🌸 Fasax' : '🏠 Guriga'}
            </span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              {periodHome + periodExcused}
            </div>
            <span className="text-[10px] text-slate-400">
              {isSisterMode && periodExcused > 0 ? `${periodHome} Guri • ${periodExcused} Fasax` : 'Salaadood'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
            <span className="text-[11px] font-bold text-cyan-300 block">📖 Qur'aanka</span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              {periodQuran}
            </div>
            <span className="text-[10px] text-slate-400">Bog la akhriyay</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30">
            <span className="text-[11px] font-bold text-purple-300 block">📿 Adhkaarta</span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              {periodAdhkar}
            </div>
            <span className="text-[10px] text-slate-400">Wardi la dhammeeyay</span>
          </div>
        </div>

        {/* Compact Share Actions Row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadProgressImage}
            disabled={downloadingCard}
            className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{downloadingCard ? 'Sug...' : 'Sawir PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="py-2.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Guuriyay</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Guuri</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. All-Time Progress Bar Card */}
      <div className="p-4 rounded-2xl bg-slate-900/75 border border-teal-500/20 space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-teal-300 uppercase tracking-wider">
          <span>Wadarta Guud (Tan iyo Bilowgii)</span>
          <span className="font-mono text-white">{allTimeTotalPrayers} Salaadood</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/25">
            <div className="text-[10px] font-bold text-emerald-400">
              {isSisterMode ? 'Waqtiga Hore' : 'Masaajid'}
            </div>
            <div className="text-lg font-black font-mono text-white mt-0.5">{allTimeMosque}</div>
            <div className="text-[10px] text-emerald-300/80 font-mono">{mosquePercent}%</div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/25">
            <div className="text-[10px] font-bold text-amber-400">Guriga</div>
            <div className="text-lg font-black font-mono text-white mt-0.5">{allTimeHome}</div>
            <div className="text-[10px] text-amber-300/80 font-mono">{homePercent}%</div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-950/35 border border-rose-500/25">
            <div className="text-[10px] font-bold text-rose-400">Dhaaftay</div>
            <div className="text-lg font-black font-mono text-white mt-0.5">{allTimeMissed}</div>
            <div className="text-[10px] text-rose-300/80 font-mono">{missedPercent}%</div>
          </div>
        </div>
      </div>

      {/* 4. Top Reasons Breakdown (Only shown if user has recorded reasons) */}
      {(topHomeReasons.length > 0 || topMissedReasons.length > 0) && (
        <div className="space-y-3">
          {topHomeReasons.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/75 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-amber-300">
                  Sababaha Guriga Lagu Tukaday
                </h3>
              </div>
              <div className="space-y-1.5">
                {topHomeReasons.map(([reason, count]) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-white/5 text-xs"
                  >
                    <span className="text-slate-200 font-medium italic">"{reason}"</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topMissedReasons.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/75 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-rose-300">
                  Sababaha Salaadda loo Seegay
                </h3>
              </div>
              <div className="space-y-1.5">
                {topMissedReasons.map(([reason, count]) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-white/5 text-xs"
                  >
                    <span className="text-slate-200 font-medium italic">"{reason}"</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
