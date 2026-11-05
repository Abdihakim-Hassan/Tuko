import React, { useState } from 'react';
import {
  Compass,
  Volume2,
  Navigation,
  Flame,
  CheckSquare,
  Sparkles,
  Moon,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  X,
  Cloud,
  Check,
  Star,
  RotateCcw,
} from 'lucide-react';

export interface SectionItem {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  category: 'cibaado' | 'quran' | 'qorshe' | 'dejin';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  color: string;
}

export const ALL_SECTIONS: SectionItem[] = [
  {
    id: 'salaad',
    title: 'Salaad & Diiwaan',
    shortTitle: 'Salaad',
    subtitle: '5-ta Salaadood & Waqtiyada',
    category: 'cibaado',
    icon: Compass,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'quran',
    title: "Qur'aan Kariim",
    shortTitle: "Qur'aan",
    subtitle: '114 Suuradood, Codad & Khatam',
    category: 'quran',
    icon: BookOpen,
    color: 'from-emerald-400 to-green-600',
  },
  {
    id: 'adhkaar',
    title: 'Adhkaar & Duco',
    shortTitle: 'Adhkaar',
    subtitle: 'Subax, Galab & Salaadda kadib',
    category: 'quran',
    icon: Sparkles,
    color: 'from-cyan-400 to-teal-500',
  },
  {
    id: 'adhan',
    title: 'Aadaanka Salaadda',
    shortTitle: 'Aadaan',
    subtitle: '8 Shiiq & Jadwalka Salaadda',
    category: 'cibaado',
    icon: Volume2,
    badge: '8 Cod',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    id: 'todo',
    title: 'To-Do & Hawlo',
    shortTitle: 'To-Do',
    subtitle: 'Hawlaha maalinlaha ah',
    category: 'qorshe',
    icon: CheckSquare,
    color: 'from-teal-400 to-emerald-500',
  },
  {
    id: 'tasbeeh',
    title: 'Tasbeex Dijitaal',
    shortTitle: 'Tasbeex',
    subtitle: 'Tiro-koobka tasbeexda',
    category: 'quran',
    icon: Flame,
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'soon',
    title: 'Soon & Sakada',
    shortTitle: 'Soon & Sako',
    subtitle: 'Afur, Qadaa & Xisaabiyaha Sakada',
    category: 'cibaado',
    icon: Moon,
    badge: 'Sako',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'qibla',
    title: 'Jiheeyaha Qiblada',
    shortTitle: 'Qiblada',
    subtitle: 'Jihada Kacbada (Compass)',
    category: 'cibaado',
    icon: Navigation,
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'calendar',
    title: 'Kalandar',
    shortTitle: 'Kalandar',
    subtitle: 'Diiwaanka bisha oo dhan',
    category: 'qorshe',
    icon: Calendar,
    color: 'from-blue-400 to-indigo-500',
  },
  {
    id: 'stats',
    title: 'Tirakoob',
    shortTitle: 'Tirakoob',
    subtitle: 'Horumarkaaga & Streak',
    category: 'qorshe',
    icon: BarChart3,
    color: 'from-violet-400 to-fuchsia-500',
  },
  {
    id: 'settings',
    title: 'Dejinta App-ka',
    shortTitle: 'Dejinta',
    subtitle: 'Magaalada, Midabka & Luqadda',
    category: 'dejin',
    icon: Settings,
    color: 'from-slate-400 to-slate-600',
  },
  {
    id: 'alarm',
    title: 'Alaarm & Saacad',
    shortTitle: 'Alaarm',
    subtitle: 'Toosinta Salaadda & Timer',
    category: 'cibaado',
    icon: Bell,
    color: 'from-rose-400 to-amber-500',
  },
];

export const DEFAULT_FAVORITES = ['quran', 'todo', 'stats'];

interface AllSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenAuthModal?: () => void;
  currentUserEmail?: string | null;
  onOpenVideoTour?: () => void;
  favoriteIds?: string[];
  onUpdateFavorites?: (newIds: string[]) => void;
}

export const AllSectionsModal: React.FC<AllSectionsModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenAuthModal,
  currentUserEmail,
  favoriteIds,
  onUpdateFavorites,
}) => {
  const [internalFavoriteIds, setInternalFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tuko_favorite_sections');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_FAVORITES;
  });

  const activeFavIds = favoriteIds !== undefined ? favoriteIds : internalFavoriteIds;

  const updateFavoritesList = (newList: string[]) => {
    setInternalFavoriteIds(newList);
    try {
      localStorage.setItem('tuko_favorite_sections', JSON.stringify(newList));
    } catch {}
    if (onUpdateFavorites) {
      onUpdateFavorites(newList);
    }
  };

  const toggleFavorite = (id: string) => {
    if (activeFavIds.includes(id)) {
      updateFavoritesList(activeFavIds.filter((item) => item !== id));
    } else {
      updateFavoritesList([...activeFavIds, id]);
    }
  };

  const resetToDefaults = () => {
    updateFavoritesList(DEFAULT_FAVORITES);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] flex flex-col bg-gradient-to-b from-[#082029] via-[#061820] to-[#041117] rounded-t-3xl sm:rounded-3xl border border-teal-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle Pill for Mobile Bottom Sheet feel */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-teal-500/15 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Dhammaan Qaybaha App-ka</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                12 Qaybood
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Taabo qayb si aad u furto • Taabo <strong className="text-amber-300">⭐</strong> si aad bar-ka hoose ugu darto
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
            aria-label="Xir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Mobile App Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* 3-Column Mobile App Launcher Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {ALL_SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isFav = activeFavIds.includes(item.id);
              const isPinnedFixed = item.id === 'salaad';

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border p-3 transition-all flex flex-col items-center text-center justify-between group ${
                    isActive
                      ? 'bg-gradient-to-b from-teal-500/25 to-emerald-950/60 border-teal-400 shadow-lg shadow-teal-500/10 ring-1 ring-teal-400/40'
                      : 'bg-slate-900/75 hover:bg-slate-800/80 border-white/10'
                  }`}
                >
                  {/* Pin/Star Toggle in top-right corner */}
                  {!isPinnedFixed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className={`absolute top-1.5 right-1.5 p-1 rounded-lg transition active:scale-90 z-10 ${
                        isFav
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'text-slate-600 hover:text-slate-300'
                      }`}
                      title={isFav ? 'Ka saar bar-ka hoose' : 'Ku dar bar-ka hoose'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  )}

                  {isActive && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}

                  {/* Main Tap Area to Open Section */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className="w-full flex flex-col items-center pt-1 pb-0.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-slate-950 shadow-lg mb-2`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <span
                      className={`text-xs font-black leading-tight line-clamp-1 ${
                        isActive ? 'text-teal-200' : 'text-white'
                      }`}
                    >
                      {item.shortTitle}
                    </span>

                    <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pinned Bar Status Row */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-300 truncate">
                Bar-ka hoose waxaa ku xiran <strong className="text-amber-300">{activeFavIds.slice(0, 3).length}/3</strong> qaybood
              </span>
            </div>
            <button
              type="button"
              onClick={resetToDefaults}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Caadi</span>
            </button>
          </div>

          {/* Compact Cloud Account Bar */}
          {onOpenAuthModal && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/70 to-slate-900/90 border border-teal-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-black text-white truncate">
                    {currentUserEmail ? 'Kaydka Daruuraha Waa Shidan Yahay ✓' : 'Gal ama Sameyso Koonto'}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUserEmail || 'Xogtaada ku kaydi Cloud si aysan u lumin'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition shrink-0 active:scale-95"
              >
                {currentUserEmail ? 'Koontada' : 'Gal / Diiwaan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
