import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  Plus,
  Trash2,
  CheckCheck,
  Sparkles,
  Compass,
  CheckCircle2,
  Pencil,
  Save,
  XCircle,
} from 'lucide-react';
import { CustomDua, DayData, PrayerName } from '../types';
import { BASE_ADHKAR, AdhkarDefinition } from '../utils/defaultAdhkar';
import {
  PrayerTimesResult,
  PRAYER_SOMALI_LABELS,
  getCurrentPrayer,
} from '../utils/prayerTimes';

interface AdhkaarViewProps {
  dayData: DayData;
  prayerTimes?: PrayerTimesResult;
  customDuas: CustomDua[];
  onToggleAdhkar: (adhkarId: string, value: boolean) => void;
  onToggleCustomDua: (duaId: string, value: boolean) => void;
  onAddCustomDua: (dua: Omit<CustomDua, 'id' | 'createdAt'>) => void;
  onEditCustomDua?: (duaId: string, updates: Partial<Omit<CustomDua, 'id' | 'createdAt'>>) => void;
  onDeleteCustomDua: (duaId: string) => void;
  onMarkAllRead: (adhkarIds: string[], customDuaIds: string[]) => void;
  onClearAll: (adhkarIds: string[], customDuaIds: string[]) => void;
}

interface BaseAdhkarOverride {
  label?: string;
  arabic?: string;
  translit?: string;
  somali?: string;
  count?: number;
}

const BASE_ADHKAR_OVERRIDES_KEY = 'tuko_base_adhkar_overrides_v1';
const PRAYER_LIST: PrayerName[] = ['Fajr', 'Duhur', 'Casar', 'Maqrib', 'Cishe'];

export const AdhkaarView: React.FC<AdhkaarViewProps> = ({
  dayData,
  prayerTimes,
  customDuas,
  onToggleAdhkar,
  onToggleCustomDua,
  onAddCustomDua,
  onEditCustomDua,
  onDeleteCustomDua,
  onMarkAllRead,
  onClearAll,
}) => {
  // Determine current active prayer (e.g. Casar, Maqrib, Fajr...)
  const currentPrayer: PrayerName = useMemo(() => {
    if (prayerTimes) {
      return getCurrentPrayer(prayerTimes, new Date());
    }
    return 'Fajr';
  }, [prayerTimes]);

  // Default active filter to the prayer currently taking place
  const [activeFilter, setActiveFilter] = useState<'all' | PrayerName | 'custom'>(() => {
    if (prayerTimes) {
      return getCurrentPrayer(prayerTimes, new Date());
    }
    return 'Fajr';
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'read' | 'unread' | 'edit' } | null>(null);

  // New Dua Form State
  const [newTitle, setNewTitle] = useState('');
  const [newArabic, setNewArabic] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [newCategory, setNewCategory] = useState<'fajr' | 'casar' | 'general' | 'duco'>('duco');

  // Editing Custom Dua State
  const [editingDuaId, setEditingDuaId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArabic, setEditArabic] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [editCount, setEditCount] = useState(1);
  const [editCategory, setEditCategory] = useState<'fajr' | 'casar' | 'general' | 'duco'>('duco');

  // Editing Base Adhkar Overrides State
  const [baseOverrides, setBaseOverrides] = useState<Record<string, BaseAdhkarOverride>>(() => {
    try {
      const raw = localStorage.getItem(BASE_ADHKAR_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [editBaseLabel, setEditBaseLabel] = useState('');
  const [editBaseArabic, setEditBaseArabic] = useState('');
  const [editBaseTranslit, setEditBaseTranslit] = useState('');
  const [editBaseSomali, setEditBaseSomali] = useState('');
  const [editBaseCount, setEditBaseCount] = useState(1);

  useEffect(() => {
    try {
      localStorage.setItem(BASE_ADHKAR_OVERRIDES_KEY, JSON.stringify(baseOverrides));
    } catch {}
  }, [baseOverrides]);

  // Effective prayer target when on a prayer tab or all
  const targetPrayer: PrayerName =
    activeFilter === 'all' || activeFilter === 'custom' ? currentPrayer : activeFilter;

  // Resolved Base Adhkar with any user-edited text/counts applied
  const resolvedBaseAdhkar = useMemo(() => {
    return BASE_ADHKAR.map((item) => {
      const ov = baseOverrides[item.id];
      if (!ov) return item;
      return {
        ...item,
        label: ov.label ?? item.label,
        arabic: ov.arabic ?? item.arabic,
        translit: ov.translit ?? item.translit,
        somali: ov.somali ?? item.somali,
        count: ov.count ?? item.count,
      };
    });
  }, [baseOverrides]);

  // Filter base adhkar for currently selected view
  const filteredBase = useMemo(() => {
    return resolvedBaseAdhkar.filter((item) => {
      if (activeFilter === 'custom') return false;
      if (activeFilter === 'all') return true;
      return item.prayer === 'all' || item.prayer === activeFilter;
    });
  }, [resolvedBaseAdhkar, activeFilter]);

  // Filter custom duas for currently selected view
  const filteredCustom = useMemo(() => {
    return customDuas.filter((dua) => {
      if (activeFilter === 'all' || activeFilter === 'custom') return true;
      if (activeFilter === 'Fajr' && (dua.category === 'fajr' || dua.category === 'general' || dua.category === 'duco')) return true;
      if (activeFilter === 'Casar' && (dua.category === 'casar' || dua.category === 'general' || dua.category === 'duco')) return true;
      return dua.category === 'general' || dua.category === 'duco';
    });
  }, [customDuas, activeFilter]);

  // Tri-state status for Base Adhkar: 'read' (Sax ✓) | 'not_read' (Qalad ✕) | 'none'
  const getAdhkarStatus = (item: AdhkarDefinition, p: PrayerName): 'read' | 'not_read' | 'none' => {
    const prayerKey = `${p}:${item.id}`;
    if (dayData.adhkar?.[prayerKey] === true) return 'read';
    if (dayData.adhkar?.[prayerKey] === false) return 'not_read';
    if (dayData.adhkar?.[item.id] === true) return 'read';
    return 'none';
  };

  // Tri-state status for Custom Dua: 'read' (Sax ✓) | 'not_read' (Qalad ✕) | 'none'
  const getCustomDuaStatus = (duaId: string, p: PrayerName): 'read' | 'not_read' | 'none' => {
    const prayerKey = `${p}:${duaId}`;
    if (dayData.customDuasCompleted?.[prayerKey] === true) return 'read';
    if (dayData.customDuasCompleted?.[prayerKey] === false) return 'not_read';
    if (dayData.customDuasCompleted?.[duaId] === true) return 'read';
    if (dayData.customDuasCompleted?.[duaId] === false) return 'not_read';
    return 'none';
  };

  // Calculate stats for each prayer tab individually
  const prayerStats = useMemo(() => {
    const stats: Record<PrayerName, { completed: number; total: number; isDone: boolean }> = {
      Fajr: { completed: 0, total: 0, isDone: false },
      Sunrise: { completed: 0, total: 0, isDone: false },
      Duhur: { completed: 0, total: 0, isDone: false },
      Casar: { completed: 0, total: 0, isDone: false },
      Maqrib: { completed: 0, total: 0, isDone: false },
      Cishe: { completed: 0, total: 0, isDone: false },
    };

    PRAYER_LIST.forEach((p) => {
      const pItems = resolvedBaseAdhkar.filter((item) => item.prayer === 'all' || item.prayer === p);
      const done = pItems.filter((item) => getAdhkarStatus(item, p) === 'read').length;
      stats[p] = {
        completed: done,
        total: pItems.length,
        isDone: done === pItems.length && pItems.length > 0,
      };
    });

    return stats;
  }, [dayData.adhkar, resolvedBaseAdhkar]);

  // Current view completed and total counts
  const currentViewStats = useMemo(() => {
    if (activeFilter === 'custom') {
      const completed = filteredCustom.filter((c) => getCustomDuaStatus(c.id, currentPrayer) === 'read').length;
      return { completed, total: filteredCustom.length };
    }
    if (activeFilter === 'all') {
      const baseDone = filteredBase.filter((b) => {
        const p = b.prayer !== 'all' ? b.prayer : currentPrayer;
        return getAdhkarStatus(b, p) === 'read';
      }).length;
      const customDone = filteredCustom.filter((c) => getCustomDuaStatus(c.id, currentPrayer) === 'read').length;
      return {
        completed: baseDone + customDone,
        total: filteredBase.length + filteredCustom.length,
      };
    }
    // Specific prayer tab
    const pStat = prayerStats[activeFilter];
    const customDone = filteredCustom.filter((c) => getCustomDuaStatus(c.id, activeFilter) === 'read').length;
    return {
      completed: pStat.completed + customDone,
      total: pStat.total + filteredCustom.length,
    };
  }, [activeFilter, filteredBase, filteredCustom, prayerStats, currentPrayer, dayData]);

  // Toggle single adhkar item for the selected prayer (Sax ✓ = true, Qalad ✕ = false)
  const handleToggleItem = (item: AdhkarDefinition, value: boolean) => {
    const prayer =
      activeFilter === 'all' ? (item.prayer !== 'all' ? item.prayer : currentPrayer) : targetPrayer;
    const prayerKey = `${prayer}:${item.id}`;
    onToggleAdhkar(prayerKey, value);
  };

  // Toggle single custom dua (Sax ✓ = true, Qalad ✕ = false)
  const handleToggleCustom = (duaId: string, value: boolean) => {
    const prayerKey = `${targetPrayer}:${duaId}`;
    onToggleCustomDua(prayerKey, value);
    onToggleCustomDua(duaId, value);
  };

  // BULK MARK ALL READ: "Waan Akhriyay Dhammaan ✓"
  const handleMarkAllVisibleRead = () => {
    const prayerToMark = targetPrayer;
    const prayerLabel =
      activeFilter === 'custom'
        ? 'Ducooyinkaaga Gaarka ah'
        : activeFilter === 'all'
        ? 'Dhammaan Adhkaarta & Ducooyinka'
        : `Salaadda ${PRAYER_SOMALI_LABELS[prayerToMark]}`;

    const baseKeysToMark =
      activeFilter === 'custom'
        ? []
        : filteredBase.map((item) => {
            const p =
              activeFilter === 'all' ? (item.prayer !== 'all' ? item.prayer : currentPrayer) : prayerToMark;
            return `${p}:${item.id}`;
          });

    const customKeysToMark: string[] = [];
    filteredCustom.forEach((dua) => {
      customKeysToMark.push(`${prayerToMark}:${dua.id}`);
      customKeysToMark.push(dua.id);
    });

    onMarkAllRead(baseKeysToMark, customKeysToMark);

    setActionNotice({
      text: `✓ Masha'Allah! Waan Akhriyay Dhammaan (${prayerLabel}) waa la calaamadeeyay (Sax ✓).`,
      type: 'read',
    });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // BULK MARK ALL NOT READ: "Ma Akhrinin Dhammaan ✕"
  const handleMarkAllVisibleNotRead = () => {
    const prayerToClear = targetPrayer;
    const prayerLabel =
      activeFilter === 'custom'
        ? 'Ducooyinkaaga Gaarka ah'
        : activeFilter === 'all'
        ? 'Dhammaan Adhkaarta & Ducooyinka'
        : `Salaadda ${PRAYER_SOMALI_LABELS[prayerToClear]}`;

    const baseKeysToClear =
      activeFilter === 'custom'
        ? []
        : filteredBase.map((item) => {
            const p =
              activeFilter === 'all' ? (item.prayer !== 'all' ? item.prayer : currentPrayer) : prayerToClear;
            return `${p}:${item.id}`;
          });

    const customKeysToClear: string[] = [];
    filteredCustom.forEach((dua) => {
      customKeysToClear.push(`${prayerToClear}:${dua.id}`);
      customKeysToClear.push(dua.id);
    });

    onClearAll(baseKeysToClear, customKeysToClear);

    setActionNotice({
      text: `✕ Ma Akhrinin Dhammaan (${prayerLabel}) waa lagu calaamadeeyay (Qalad ✕).`,
      type: 'unread',
    });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCreateDua = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddCustomDua({
      title: newTitle.trim(),
      arabic: newArabic.trim() || undefined,
      meaning: newMeaning.trim() || undefined,
      targetCount: Math.max(1, Number(newCount) || 1),
      category: newCategory,
    });

    setNewTitle('');
    setNewArabic('');
    setNewMeaning('');
    setNewCount(1);
    setShowAddForm(false);
    setActionNotice({
      text: '✨ Ducada cusub si guul leh ayaa loogu daray liiskaaga!',
      type: 'edit',
    });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Start editing a Custom Dua
  const startEditingCustomDua = (dua: CustomDua) => {
    setEditingBaseId(null);
    setEditingDuaId(dua.id);
    setEditTitle(dua.title);
    setEditArabic(dua.arabic || '');
    setEditMeaning(dua.meaning || '');
    setEditCount(dua.targetCount || 1);
    setEditCategory(dua.category || 'duco');
  };

  // Save edited Custom Dua
  const handleSaveCustomDuaEdit = (e: React.FormEvent, duaId: string) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    if (onEditCustomDua) {
      onEditCustomDua(duaId, {
        title: editTitle.trim(),
        arabic: editArabic.trim() || undefined,
        meaning: editMeaning.trim() || undefined,
        targetCount: Math.max(1, Number(editCount) || 1),
        category: editCategory,
      });
    }
    setEditingDuaId(null);
    setActionNotice({
      text: '✏️ Qoraalka iyo tirada ducada si guul leh ayaa wax looga beddelay!',
      type: 'edit',
    });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Start editing a Base Adhkar item
  const startEditingBaseItem = (item: AdhkarDefinition) => {
    setEditingDuaId(null);
    setEditingBaseId(item.id);
    setEditBaseLabel(item.label || item.translit);
    setEditBaseArabic(item.arabic || '');
    setEditBaseTranslit(item.translit || '');
    setEditBaseSomali(item.somali || '');
    setEditBaseCount(item.count || 1);
  };

  // Save edited Base Adhkar item
  const handleSaveBaseItemEdit = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    setBaseOverrides((prev) => ({
      ...prev,
      [itemId]: {
        label: editBaseLabel.trim() || undefined,
        arabic: editBaseArabic.trim() || undefined,
        translit: editBaseTranslit.trim() || undefined,
        somali: editBaseSomali.trim() || undefined,
        count: Math.max(1, Number(editBaseCount) || 1),
      },
    }));
    setEditingBaseId(null);
    setActionNotice({
      text: '✏️ Qoraalka iyo tirada dikriga si guul leh ayaa wax looga beddelay!',
      type: 'edit',
    });
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] via-[#0b2b36] to-[#071f26] border border-teal-500/25 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">📿</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Adhkaar &amp; Ducooyin
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-teal-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Salaadda Hadda: <strong>{PRAYER_SOMALI_LABELS[currentPrayer]}</strong>
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
            Daba-gal adhkaarta iyo ducooyinkaaga. Mid kasta waxaad saari kartaa{' '}
            <strong className="text-emerald-300">Sax (✓ Waan Akhriyay)</strong> ama{' '}
            <strong className="text-rose-300">Qalad (✕ Ma Akhrinin)</strong>, sidoo kalena duco kasta waxaad ka beddeli kartaa{' '}
            <strong className="text-amber-300">Qoraalka iyo Tirada (Edit ✏️)</strong>.
          </p>
        </div>

        {/* Progress & Add Custom Dua Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-400/30 text-teal-200">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 block">
              {activeFilter === 'all'
                ? 'Salaadda Hadda'
                : activeFilter === 'custom'
                ? 'Ducooyinka'
                : PRAYER_SOMALI_LABELS[activeFilter]}
            </span>
            <span className="text-xl font-black font-mono tabular-nums">
              {currentViewStats.completed} / {currentViewStats.total}
            </span>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-teal-500/25 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Ku dar Duco</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg animate-in fade-in ${
            actionNotice.type === 'unread'
              ? 'bg-gradient-to-r from-rose-950/90 to-red-950/90 border-rose-400/50 text-rose-200'
              : actionNotice.type === 'edit'
              ? 'bg-gradient-to-r from-amber-950/90 to-teal-950/90 border-amber-400/50 text-amber-200'
              : 'bg-gradient-to-r from-teal-950 to-emerald-950 border-teal-400/40 text-teal-200'
          }`}
        >
          {actionNotice.type === 'unread' ? (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Prayer-by-Prayer Selector Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider text-teal-300/90 text-[11px]">
            Dooro Salaadda ama Ducooyinka aad rabto:
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Salaad kasta waxay leedahay diiwaan u gaar ah
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {PRAYER_LIST.map((p) => {
            const pStat = prayerStats[p];
            const isCurrent = p === currentPrayer;
            const isSelected = activeFilter === p;

            return (
              <button
                key={p}
                onClick={() => setActiveFilter(p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap active:scale-95 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20 font-black'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-teal-500/20'
                }`}
              >
                <span>{PRAYER_SOMALI_LABELS[p]}</span>

                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-slate-950 text-teal-300'
                      : pStat.isDone
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {pStat.isDone ? '✓ Dhan' : `${pStat.completed}/${pStat.total}`}
                </span>

                {isCurrent && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Waqtiga Hadda" />
                )}
              </button>
            );
          })}

          {/* Custom Duas Tab */}
          <button
            onClick={() => setActiveFilter('custom')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap active:scale-95 border cursor-pointer ${
              activeFilter === 'custom'
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-300 shadow-md font-black'
                : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-teal-500/20'
            }`}
          >
            ⭐ Ducooyinkayga ({customDuas.length})
          </button>

          {/* All Prayers Tab */}
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap active:scale-95 border cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-teal-500/20'
            }`}
          >
            Dhammaan
          </button>
        </div>
      </div>

      {/* Bulk Action Bar: "Waan Akhriyay Dhammaan" & "Ma Akhrinin Dhammaan" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-200">
            Qeybta Hadda:{' '}
            <strong className="text-teal-300 font-black">
              {activeFilter === 'all'
                ? `Dhammaan (${PRAYER_SOMALI_LABELS[currentPrayer]})`
                : activeFilter === 'custom'
                ? 'Ducooyinkaaga Gaarka ah'
                : `Salaadda ${PRAYER_SOMALI_LABELS[activeFilter]}`}
            </strong>
          </span>
        </div>

        {/* Two Primary Bulk Action Buttons: Waan Akhriyay Dhammaan & Ma Akhrinin Dhammaan */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllVisibleRead}
            className="text-xs font-black px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition border border-emerald-400/50 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            title="Calaamadee inaad akhrisay dhammaan (Sax ✓)"
          >
            <CheckCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Waan Akhriyay Dhammaan ✓</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllVisibleNotRead}
            className="text-xs font-black px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white transition border border-rose-400/50 flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
            title="Calaamadee inaadan akhrinin dhammaan (Qalad ✕)"
          >
            <X className="w-4 h-4 stroke-[3] shrink-0" />
            <span>Ma Akhrinin Dhammaan ✕</span>
          </button>
        </div>
      </div>

      {/* Add Custom Dua Form Modal / Panel */}
      {showAddForm && (
        <form
          onSubmit={handleCreateDua}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2e3b] to-[#071f28] border border-teal-500/35 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-teal-500/20">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Ku dar Duco ama Dikri Cusub</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
            >
              ✕ Xir
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1">
                Magaca ama Ujeeddada Ducada *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tusaale: Ducada waxbarashada, Ducada safarka..."
                className="w-full bg-slate-900/90 border border-teal-500/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1">
                Qeybta (Category)
              </label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as 'fajr' | 'casar' | 'general' | 'duco')
                }
                className="w-full bg-slate-900/90 border border-teal-500/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="duco">Duco Guud</option>
                <option value="fajr">Adhkaarta Subaxa</option>
                <option value="casar">Adhkaarta Galabta</option>
                <option value="general">Salaadaha Kadib</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1">
              Qoraalka Carabiga (Ikhtiyaari)
            </label>
            <input
              type="text"
              dir="rtl"
              value={newArabic}
              onChange={(e) => setNewArabic(e.target.value)}
              placeholder="اللَّهُمَّ إِنِّي أَسْأَلُكَ..."
              className="w-full font-arabic text-lg bg-slate-900/90 border border-teal-500/30 rounded-xl px-3.5 py-2 text-amber-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1">
                Macnaha ama Qoraalka Ducada (Soomaali)
              </label>
              <input
                type="text"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Qoraalka ducada ama macnaheeda..."
                className="w-full bg-slate-900/90 border border-teal-500/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1">
                Tirada (Jeer)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={newCount}
                onChange={(e) => setNewCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-900/90 border border-teal-500/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Ka Noqo
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:brightness-110 shadow-lg shadow-teal-500/25 cursor-pointer"
            >
              Keydi Ducada Cusub
            </button>
          </div>
        </form>
      )}

      {/* Main List of Adhkar & Ducooyin */}
      <div className="space-y-3.5">
        {/* Base Adhkar Items */}
        {filteredBase.map((item) => {
          const itemPrayer =
            activeFilter === 'all' ? (item.prayer !== 'all' ? item.prayer : currentPrayer) : targetPrayer;
          const status = getAdhkarStatus(item, itemPrayer);
          const isEditingThisBase = editingBaseId === item.id;

          return (
            <div
              key={`${itemPrayer}_${item.id}`}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                status === 'read'
                  ? 'bg-gradient-to-r from-[#07241e] via-[#092b23] to-[#06201b] border-emerald-500/45 shadow-lg shadow-emerald-950/40'
                  : status === 'not_read'
                  ? 'bg-gradient-to-r from-[#240b12] via-[#2b0d16] to-[#1d080e] border-rose-500/45 shadow-lg shadow-rose-950/40'
                  : 'bg-gradient-to-r from-[#091e26] to-[#071920] border-teal-500/15 hover:border-teal-500/30'
              }`}
            >
              {isEditingThisBase ? (
                <form
                  onSubmit={(e) => handleSaveBaseItemEdit(e, item.id)}
                  className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-amber-400/40"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      Wax ka beddel Qoraalka &amp; Tirada
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingBaseId(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                    >
                      ✕ Xir
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-teal-300 mb-1">
                        Cinwaanka / Magaca Dikriga
                      </label>
                      <input
                        type="text"
                        required
                        value={editBaseLabel}
                        onChange={(e) => setEditBaseLabel(e.target.value)}
                        className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Tirada (Jeer)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={editBaseCount}
                        onChange={(e) => setEditBaseCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-slate-900 border border-amber-400/40 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[1, 3, 7, 10, 33, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEditBaseCount(preset)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              editBaseCount === preset
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                            }`}
                          >
                            {preset}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-teal-300 mb-1">
                      Qoraalka Carabiga
                    </label>
                    <textarea
                      dir="rtl"
                      rows={2}
                      value={editBaseArabic}
                      onChange={(e) => setEditBaseArabic(e.target.value)}
                      className="w-full font-arabic text-base sm:text-lg bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 mb-1">
                        Qoraalka Dhawaaqa (Transliteration)
                      </label>
                      <input
                        type="text"
                        value={editBaseTranslit}
                        onChange={(e) => setEditBaseTranslit(e.target.value)}
                        className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 mb-1">
                        Macnaha / Qoraalka Soomaaliga
                      </label>
                      <input
                        type="text"
                        value={editBaseSomali}
                        onChange={(e) => setEditBaseSomali(e.target.value)}
                        className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingBaseId(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Ka Noqo
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Keydi Isbeddelka</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-white">
                        {item.label || item.translit}
                      </h3>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/35">
                        {item.count}x
                      </span>
                      {item.prayer !== 'all' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                          {PRAYER_SOMALI_LABELS[item.prayer] || item.prayer}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {PRAYER_SOMALI_LABELS[itemPrayer]}
                        </span>
                      )}

                      {status === 'read' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                          ✓ Waan Akhriyay
                        </span>
                      )}
                      {status === 'not_read' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-400/40">
                          ✕ Ma Akhrinin
                        </span>
                      )}
                    </div>

                    {item.arabic && (
                      <div
                        className="text-lg sm:text-xl font-arabic leading-relaxed text-amber-200 text-right pr-2"
                        dir="rtl"
                      >
                        {item.arabic}
                      </div>
                    )}

                    {item.translit && <p className="text-xs text-slate-300 italic">{item.translit}</p>}
                    {item.somali && <p className="text-xs text-slate-400">{item.somali}</p>}
                  </div>

                  {/* Actions: Sax (✓) / Qalad (✕) / Edit (✏️) */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {/* Sax (Mark Read) */}
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item, true)}
                      className={`px-3 h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition shadow-sm active:scale-95 cursor-pointer ${
                        status === 'read'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 ring-2 ring-emerald-400/60 shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-emerald-300 hover:bg-slate-700 border border-white/10'
                      }`}
                      title={`Sax: Waan akhriyay (${PRAYER_SOMALI_LABELS[itemPrayer]})`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Sax</span>
                    </button>

                    {/* Qalad (Mark Not Read) */}
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item, false)}
                      className={`px-3 h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition shadow-sm active:scale-95 cursor-pointer ${
                        status === 'not_read'
                          ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white ring-2 ring-rose-400/60 shadow-rose-600/25'
                          : 'bg-slate-800 text-slate-300 hover:text-rose-300 hover:bg-slate-700 border border-white/10'
                      }`}
                      title={`Qalad: Ma akhrinin (${PRAYER_SOMALI_LABELS[itemPrayer]})`}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>Qalad</span>
                    </button>

                    {/* Edit Text & Count */}
                    <button
                      type="button"
                      onClick={() => startEditingBaseItem(item)}
                      className="px-2.5 h-9 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center gap-1 text-xs font-bold transition active:scale-95 cursor-pointer"
                      title="Wax ka beddel qoraalka iyo tirada (Edit)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Custom Duas Section ("Ducooyinka uu qofka soo gashaday") */}
        {filteredCustom.length > 0 && (
          <div className="pt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Ducooyinka Gaarka ah ({filteredCustom.length})
              </span>
              <div className="flex-1 h-[1px] bg-teal-500/20" />
            </div>

            <div className="space-y-3">
              {filteredCustom.map((dua) => {
                const status = getCustomDuaStatus(dua.id, targetPrayer);
                const isEditingThisDua = editingDuaId === dua.id;

                return (
                  <div
                    key={dua.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                      status === 'read'
                        ? 'bg-gradient-to-r from-[#07241e] via-[#092b23] to-[#06201b] border-emerald-500/45 shadow-lg shadow-emerald-950/40'
                        : status === 'not_read'
                        ? 'bg-gradient-to-r from-[#240b12] via-[#2b0d16] to-[#1d080e] border-rose-500/45 shadow-lg shadow-rose-950/40'
                        : 'bg-gradient-to-r from-[#0a1e28] to-[#071922] border-teal-500/15 hover:border-teal-500/30'
                    }`}
                  >
                    {isEditingThisDua ? (
                      <form
                        onSubmit={(e) => handleSaveCustomDuaEdit(e, dua.id)}
                        className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-amber-400/40"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5" />
                            Wax ka beddel Ducada (Qoraalka &amp; Tirada)
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingDuaId(null)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                          >
                            ✕ Xir
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-teal-300 mb-1">
                              Magaca ama Cinwaanka Ducada *
                            </label>
                            <input
                              type="text"
                              required
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-300 mb-1">
                              Tirada (Jeer) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              value={editCount}
                              onChange={(e) => setEditCount(Math.max(1, Number(e.target.value) || 1))}
                              className="w-full bg-slate-900 border border-amber-400/40 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {[1, 3, 7, 10, 33, 100].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setEditCount(preset)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                    editCount === preset
                                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                                      : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                                  }`}
                                >
                                  {preset}x
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-teal-300 mb-1">
                            Qoraalka Carabiga
                          </label>
                          <textarea
                            dir="rtl"
                            rows={2}
                            value={editArabic}
                            onChange={(e) => setEditArabic(e.target.value)}
                            placeholder="اللَّهُمَّ..."
                            className="w-full font-arabic text-base sm:text-lg bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-teal-300 mb-1">
                              Qoraalka Ducada / Macnaha (Soomaali)
                            </label>
                            <textarea
                              rows={2}
                              value={editMeaning}
                              onChange={(e) => setEditMeaning(e.target.value)}
                              placeholder="Qoraalka ducada ama macnaheeda..."
                              className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-teal-300 mb-1">
                              Qeybta (Category)
                            </label>
                            <select
                              value={editCategory}
                              onChange={(e) =>
                                setEditCategory(e.target.value as 'fajr' | 'casar' | 'general' | 'duco')
                              }
                              className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            >
                              <option value="duco">Duco Guud</option>
                              <option value="fajr">Adhkaarta Subaxa</option>
                              <option value="casar">Adhkaarta Galabta</option>
                              <option value="general">Salaadaha Kadib</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingDuaId(null)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                          >
                            Ka Noqo
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Keydi Isbeddelka</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm sm:text-base text-white">
                              {dua.title}
                            </h4>
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/35">
                              {dua.targetCount}x
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                              Gaar
                            </span>

                            {status === 'read' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                                ✓ Waan Akhriyay
                              </span>
                            )}
                            {status === 'not_read' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-400/40">
                                ✕ Ma Akhrinin
                              </span>
                            )}
                          </div>

                          {dua.arabic && (
                            <div
                              className="text-lg sm:text-xl font-arabic leading-relaxed text-amber-200 text-right pr-2"
                              dir="rtl"
                            >
                              {dua.arabic}
                            </div>
                          )}

                          {dua.meaning && (
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{dua.meaning}</p>
                          )}
                        </div>

                        {/* Actions: Sax (✓) / Qalad (✕) / Edit (✏️) / Delete (🗑️) */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleCustom(dua.id, true)}
                            className={`px-3 h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition shadow-sm active:scale-95 cursor-pointer ${
                              status === 'read'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 ring-2 ring-emerald-400/60 shadow-emerald-500/20'
                                : 'bg-slate-800 text-slate-300 hover:text-emerald-300 hover:bg-slate-700 border border-white/10'
                            }`}
                            title="Sax (Waan akhriyay)"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Sax</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCustom(dua.id, false)}
                            className={`px-3 h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition shadow-sm active:scale-95 cursor-pointer ${
                              status === 'not_read'
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white ring-2 ring-rose-400/60 shadow-rose-600/25'
                                : 'bg-slate-800 text-slate-300 hover:text-rose-300 hover:bg-slate-700 border border-white/10'
                            }`}
                            title="Qalad (Ma akhrinin)"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                            <span>Qalad</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditingCustomDua(dua)}
                            className="px-2.5 h-9 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center gap-1 text-xs font-bold transition active:scale-95 cursor-pointer"
                            title="Wax ka beddel qoraalka iyo tirada ducadan (Edit)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteCustomDua(dua.id)}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-white/5 flex items-center justify-center transition active:scale-95 cursor-pointer"
                            title="Tirtir ducadan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
