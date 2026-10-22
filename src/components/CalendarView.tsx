import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, Home, XCircle, Edit3 } from 'lucide-react';
import { AppSettings, DayData, PrayerName } from '../types';
import { PRAYER_ORDER, PRAYER_SOMALI_LABELS, getSomaliFormattedDate } from '../utils/prayerTimes';

interface CalendarViewProps {
  allDays: Record<string, DayData>;
  activeDateKey: string;
  todayKey: string;
  settings?: AppSettings;
  onSelectDate: (dateKey: string) => void;
  onNavigateToSalaad: (dateKey: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  allDays,
  activeDateKey,
  todayKey,
  settings,
  onSelectDate,
  onNavigateToSalaad,
}) => {
  const isSisterMode = settings?.gender === 'female';

  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = activeDateKey.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedCellKey, setSelectedCellKey] = useState<string>(activeDateKey);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const somaliMonths = [
    'Janaayo', 'Febraayo', 'Maarso', 'Abriil', 'Maajo', 'Juun',
    'Luuliyo', 'Ogosto', 'Sebteembar', 'Oktoobar', 'Nofeembar', 'Diseembar'
  ];
  const somaliDayNames = ['Axad', 'Isniin', 'Talaado', 'Arbaco', 'Khamiis', 'Jimco', 'Sabti'];

  // Month summary
  let monthMosque = 0;
  let monthHome = 0;
  let monthMissed = 0;
  let monthExcused = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = allDays[k];
    if (day && day.salaah) {
      for (const p of PRAYER_ORDER) {
        const s = day.salaah[p]?.status;
        if (s === 'mosque' || s === 'early_home') monthMosque++;
        else if (s === 'home') monthHome++;
        else if (s === 'missed') monthMissed++;
        else if (s === 'excused') monthExcused++;
      }
    }
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const selectedDayData = allDays[selectedCellKey];

  return (
    <div className="space-y-6">
      {/* Calendar Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] via-[#092e38] to-[#061d24] border border-teal-500/25 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-300" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Kalandarka Salaadaha
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Eeg rikoodhka salaadaha bishaan iyo maalin kasta xaaladdeeda
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-teal-500/30">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
            title="Bishii hore"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm sm:text-base text-teal-200 min-w-[130px] text-center">
            {somaliMonths[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
            title="Bisha dambe"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Month Totals Summary */}
      <div className={`grid ${isSisterMode ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3`}>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-teal-950/50 border border-emerald-500/25 text-center">
          <span className="text-xs font-bold text-emerald-400">
            {isSisterMode ? '🌟 Waqtiga Hore' : '🕌 Masaajid'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
            {monthMosque}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 to-orange-950/50 border border-amber-500/25 text-center">
          <span className="text-xs font-bold text-amber-400">🏠 Guriga</span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
            {monthHome}
          </div>
        </div>
        {isSisterMode && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/50 to-rose-950/50 border border-pink-500/25 text-center">
            <span className="text-xs font-bold text-pink-300">🌸 Fasax (Udhur)</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {monthExcused}
            </div>
          </div>
        )}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/50 to-red-950/50 border border-rose-500/25 text-center">
          <span className="text-xs font-bold text-rose-400">❌ Lama tukan</span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
            {monthMissed}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-md">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-teal-300/80 mb-2">
          {somaliDayNames.map((name) => (
            <div key={name} className="py-1">
              <span className="hidden sm:inline">{name}</span>
              <span className="sm:hidden">{name.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[55px] sm:min-h-[70px] rounded-xl opacity-20" />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedCellKey;

            const day = allDays[dateKey];
            let mosqueCount = 0;
            let homeCount = 0;
            let missedCount = 0;
            let excusedCount = 0;
            const isExcusedDay = !!(day && day.isExcusedDay);

            if (day && day.salaah) {
              for (const p of PRAYER_ORDER) {
                const s = day.salaah[p]?.status;
                if (s === 'mosque' || s === 'early_home') mosqueCount++;
                else if (s === 'home') homeCount++;
                else if (s === 'missed') missedCount++;
                else if (s === 'excused') excusedCount++;
              }
            }

            const totalDone = mosqueCount + homeCount + excusedCount;
            const isFullMosque = mosqueCount === 5;
            const isFullExcused = isExcusedDay || excusedCount === 5;
            const isAllPrayed = totalDone === 5;
            const hasMissed = missedCount > 0;

            let cellBg = 'bg-slate-800/40 border-white/5 text-slate-300';
            if (isFullExcused) {
              cellBg = 'bg-gradient-to-br from-pink-600/70 to-rose-700/70 border-pink-400/50 text-white shadow-md shadow-pink-950/40';
            } else if (isFullMosque) {
              cellBg = 'bg-gradient-to-br from-emerald-600/80 to-teal-700/80 border-emerald-400/50 text-white shadow-md shadow-emerald-950/40';
            } else if (hasMissed) {
              cellBg = 'bg-gradient-to-br from-rose-900/60 to-red-950/70 border-rose-500/40 text-rose-200';
            } else if (isAllPrayed) {
              cellBg = 'bg-gradient-to-br from-amber-600/70 to-orange-700/70 border-amber-400/50 text-white';
            } else if (totalDone > 0) {
              cellBg = 'bg-gradient-to-br from-teal-900/50 to-cyan-950/50 border-teal-500/30 text-teal-200';
            }

            return (
              <button
                key={dateKey}
                onClick={() => {
                  setSelectedCellKey(dateKey);
                  onSelectDate(dateKey);
                }}
                className={`min-h-[55px] sm:min-h-[70px] p-2 rounded-2xl border transition-all flex flex-col justify-between items-center text-center relative ${cellBg} ${
                  isSelected ? 'ring-2 ring-teal-400 scale-[1.03] z-10' : 'hover:scale-[1.01]'
                } ${isToday ? 'outline outline-2 outline-cyan-400' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-xs sm:text-sm">{dayNum}</span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>

                <div className="text-[10px] font-bold font-mono">
                  {isFullExcused ? (
                    <span>🌸 Fasax</span>
                  ) : totalDone > 0 || missedCount > 0 ? (
                    <span>{totalDone}/5</span>
                  ) : (
                    <span className="opacity-30">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300 mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>{isSisterMode ? '5 Waqtiga Hore' : '5 Masaajid'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>5 (Qaar Guriga)</span>
          </div>
          {isSisterMode && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              <span>🌸 Fasax (Udhur)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Lama Tukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-700" />
            <span>Qayb La Tukaday</span>
          </div>
        </div>
      </div>

      {/* Selected Day Breakdown */}
      {selectedCellKey && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] to-[#071922] border border-teal-500/25 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{getSomaliFormattedDate(selectedCellKey)}</span>
                {selectedDayData?.isExcusedDay && (
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-xs font-bold">
                    🌸 Maalin Fasax ah
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Faahfaahinta salaadaha maalintan</p>
            </div>

            <button
              onClick={() => onNavigateToSalaad(selectedCellKey)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-teal-500/20 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bedel / Buuxi Maalintan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PRAYER_ORDER.map((prayer) => {
              const rec = selectedDayData?.salaah?.[prayer];
              const st = rec?.status || 'none';

              return (
                <div
                  key={prayer}
                  className={`p-3.5 rounded-2xl border ${
                    st === 'mosque' || st === 'early_home'
                      ? 'bg-emerald-950/40 border-emerald-500/30'
                      : st === 'excused'
                      ? 'bg-pink-950/40 border-pink-500/30'
                      : st === 'home'
                      ? 'bg-amber-950/40 border-amber-500/30'
                      : st === 'missed'
                      ? 'bg-rose-950/40 border-rose-500/30'
                      : 'bg-slate-900/60 border-white/5'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-300">
                    {PRAYER_SOMALI_LABELS[prayer]}
                  </div>
                  <div className="text-sm font-extrabold text-white mt-1">
                    {st === 'mosque'
                      ? '🕌 Masaajidka'
                      : st === 'early_home'
                      ? '🌟 Waqtiga Hore'
                      : st === 'excused'
                      ? '🌸 Fasax (Udhur)'
                      : st === 'home'
                      ? '🏠 Guriga'
                      : st === 'missed'
                      ? '❌ Lama tukan'
                      : '— Lama qorin'}
                  </div>
                  {rec?.reason && (
                    <div className="text-[11px] text-slate-300 mt-1 italic">
                      Sabab: "{rec.reason}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Number(selectedDayData?.quran) > 0 && (
            <div className="text-xs text-amber-300 font-semibold pt-1">
              📖 Qur'aan: {selectedDayData?.quran} bog ayaa la akhriyay maalintan.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
