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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c242f] via-[#0b2b36] to-[#071d24] border border-teal-500/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-300" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Tirakoobka &amp; Xogta Cibaadada
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {isSisterMode
              ? 'Falanqeynta salaadaha Waqtiga Hore, Guriga, Maalmaha Fasaxa (Udhurka), iyo Qur’aanka'
              : 'Falanqeynta heerka ilaalinta salaadaha Masaajidka, Guriga, iyo sababaha la diiwaangeliyay'}
          </p>
        </div>
        <span
          className={`self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
            isSisterMode
              ? 'bg-pink-500/15 border-pink-400/40 text-pink-200'
              : 'bg-teal-500/15 border-teal-400/40 text-teal-200'
          }`}
        >
          {isSisterMode ? '🌸 Qaybta Gabdhaha' : '🕌 Qaybta Wiilasha'}
        </span>
      </div>

      {/* All-Time Big Stat Cards */}
      <div className={`grid grid-cols-1 ${isSisterMode ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
        {/* Mosque / Early Time */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#07261d] to-[#051c15] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              {isSisterMode ? 'Waqtiga Hore 🌟' : 'Masaajidka 🕌'}
            </span>
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono text-white">
            {allTimeMosque}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mt-2">
            <span>{mosquePercent}% wadarta guud</span>
          </div>
          <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
              style={{ width: `${mosquePercent}%` }}
            />
          </div>
        </div>

        {/* Home */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#261c07] to-[#1a1304] border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Guriga 🏠
            </span>
            <Home className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono text-white">
            {allTimeHome}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mt-2">
            <span>{homePercent}% wadarta guud</span>
          </div>
          <div className="w-full h-1.5 bg-amber-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
              style={{ width: `${homePercent}%` }}
            />
          </div>
        </div>

        {/* Sister Excused (Fasax) Card - Only for Sister Mode */}
        {isSisterMode && (
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#2b0b22] to-[#1a0614] border border-pink-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
                Fasax (Udhur) 🌸
              </span>
              <HeartHandshake className="w-5 h-5 text-pink-400" />
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono text-white">
              {allTimeExcused}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-pink-300 mt-2">
              <span>{allTimeExcusedDays} maalmood oo fasax ah</span>
            </div>
            <div className="w-full h-1.5 bg-pink-950 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full"
                style={{ width: allTimeExcused > 0 ? '100%' : '0%' }}
              />
            </div>
          </div>
        )}

        {/* Missed */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#290a0a] to-[#1c0606] border border-rose-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Lama Tukan ❌
            </span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono text-white">
            {allTimeMissed}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mt-2">
            <span>{missedPercent}% wadarta guud</span>
          </div>
          <div className="w-full h-1.5 bg-rose-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full"
              style={{ width: `${missedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7 Days Overview */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-300" />
          <span>7-dii Maalmood ee u Dambeeyay</span>
        </h3>

        <div className={`grid grid-cols-2 ${isSisterMode ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-center">
            <div className="text-xs text-emerald-400 font-bold">
              {isSisterMode ? 'Waqtiga Hore' : 'Masaajid'}
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{weekMosque}</div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-center">
            <div className="text-xs text-amber-400 font-bold">Guriga</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{weekHome}</div>
          </div>
          {isSisterMode && (
            <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/20 text-center">
              <div className="text-xs text-pink-300 font-bold">Fasax 🌸</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{weekExcused}</div>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-center">
            <div className="text-xs text-rose-400 font-bold">Lama Tukan</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{weekMissed}</div>
          </div>
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-center">
            <div className="text-xs text-cyan-400 font-bold">Qur'aan (Bog)</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{weekQuran}</div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SHAREABLE WEEKLY / MONTHLY PROGRESS CARD (WHATSAPP & IMAGE)    */}
      {/* ============================================================== */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-5 ${
          isSisterMode
            ? 'bg-gradient-to-br from-[#230b1c] via-[#171222] to-[#0a161e] border-pink-500/35'
            : 'bg-gradient-to-br from-[#07242e] via-[#0a2f3a] to-[#06181f] border-teal-500/35'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-300" />
              <h3 className="text-lg sm:text-xl font-black text-white">
                Warbixinta Todobaadlaha / Bisha (La Wadaag ama Soo Deji)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Kaar qurux badan oo muujinaya natiijada cibaadadaada (Salaadaha, Qur'aanka, Adhkaarta &amp; Streak-ga 🔥) oo aad sawir ahaan ula bixi karto ama WhatsApp-ka kula wadaagi karto
            </p>
          </div>

          {/* Period Switcher */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setReportPeriod('week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                reportPeriod === 'week'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Todobaadkan (7d)
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                reportPeriod === 'month'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bishan (30d)
            </button>
          </div>
        </div>

        {/* Visual Shareable Card Preview */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/75 border-2 border-amber-400/30 shadow-inner space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 block">
                TUKO – DHAWR-SALAAD &amp; ADKAAR
              </span>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                {reportPeriod === 'week'
                  ? '✨ Warbixinta Cibaadada Todobaadka'
                  : '✨ Warbixinta Cibaadada Bisha'}
              </h4>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-300/80">Taxanaha (Streak)</div>
                <div className="text-base font-black font-mono text-amber-300">
                  {streakDays} Maalmood
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-[11px] font-bold text-emerald-300 block">
                {isSisterMode ? '🌟 Waqtiga Hore' : '🕌 Masaajidka'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {periodMosque}
              </div>
              <span className="text-[10px] text-slate-400">Salaadood</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30">
              <span className="text-[11px] font-bold text-amber-300 block">
                {isSisterMode && periodExcused > 0 ? '🏠 Guriga & 🌸 Fasax' : '🏠 Guriga'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {periodHome + periodExcused}
              </div>
              <span className="text-[10px] text-slate-400">
                {isSisterMode && periodExcused > 0 ? `${periodHome} Guri • ${periodExcused} Fasax` : 'Salaadood'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
              <span className="text-[11px] font-bold text-cyan-300 block">📖 Qur'aanka</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {periodQuran}
              </div>
              <span className="text-[10px] text-slate-400">Bog la akhriyay</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
              <span className="text-[11px] font-bold text-purple-300 block">📿 Adhkaarta</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {periodAdhkar}
              </div>
              <span className="text-[10px] text-slate-400">Wardi la akhriyay</span>
            </div>
          </div>

          <div className="text-center text-xs italic text-slate-300 pt-1">
            « Camalka Eebbe agtiisa loogu jecel yahay waa kan joogtada ah haba yaraadee » • Wadarta Salaadaha: {periodPrayedTotal}
          </div>
        </div>

        {/* Share & Download Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadProgressImage}
              disabled={downloadingCard}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{downloadingCard ? 'Waa la diyaarinayaa...' : 'Soo Deji Sawir Ahaan (PNG Card)'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>La Wadaag WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 font-bold text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Waa la guuriyay!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Guuri Qoraalka</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Reasons Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reasons for praying at home */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] to-[#071922] border border-teal-500/20 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-300">
              Sababaha Guriga Lagu Tukaday
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Sababihii ugu badnaa ee aad dirtay markii aad guriga ku tukatay:
          </p>

          <div className="space-y-2 pt-2">
            {topHomeReasons.length > 0 ? (
              topHomeReasons.map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs"
                >
                  <span className="text-slate-200 font-medium italic">"{reason}"</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {count}x
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-4 text-center">
                Weli sabab lama qorin. Markaad guriga ku tukato, ku qor sababta sanduuqa salaadda!
              </div>
            )}
          </div>
        </div>

        {/* Reasons for missed prayers */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] to-[#071922] border border-teal-500/20 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-300">
              Sababaha Salaadda loo Seegay
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Sababihii ugu badnaa ee aad dirtay markii salaad la seegay:
          </p>

          <div className="space-y-2 pt-2">
            {topMissedReasons.length > 0 ? (
              topMissedReasons.map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs"
                >
                  <span className="text-slate-200 font-medium italic">"{reason}"</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    {count}x
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-4 text-center">
                Alxamdulillaah! Weli ma jiraan sababo la diiwaangeliyay.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
