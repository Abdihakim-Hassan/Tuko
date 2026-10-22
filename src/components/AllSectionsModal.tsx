import React from 'react';
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
  LayoutGrid,
  X,
  ChevronRight,
  Cloud,
  Check,
  Film,
  Download,
} from 'lucide-react';

export interface SectionItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'cibaado' | 'quran' | 'qorshe' | 'dejin';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  color: string;
}

export const ALL_SECTIONS: SectionItem[] = [
  // 1. Salaad & Cibaado (Tiirarka Salaadda, Aadaanka, Qiblada & Soonka/Sakada)
  {
    id: 'salaad',
    title: 'Salaad & Diiwaan',
    subtitle: '5-ta Salaadood, Waqtiyada, Xisaabinta & Diiwaangeli',
    category: 'cibaado',
    icon: Compass,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'adhan',
    title: 'Aadaan & Alaarm ⏰',
    subtitle: 'Codadka 8 Shiiq salaad kasta, Saacadda nool & Alaarmyo',
    category: 'cibaado',
    icon: Volume2,
    badge: 'Cusub',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'qibla',
    title: 'Jiheeyaha Qiblada',
    subtitle: 'Jiheeyaha tooska ah ee Kacbada Muxarramah',
    category: 'cibaado',
    icon: Navigation,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'soon',
    title: 'Soon, Afur & Sakada 💰',
    subtitle: 'Soonka Ramadaan, Xisaabiyaha Sakada & Nisaabka Dahabka',
    category: 'cibaado',
    icon: Moon,
    badge: 'Sakada',
    color: 'from-amber-500 to-yellow-600',
  },

  // 2. Qur'aanka, Adhkaarta & Tasbeexda (Kalaamka Alle & Xuska oo is-waafaqsan)
  {
    id: 'quran',
    title: "Qur'aan Kariim",
    subtitle: 'Akhriska 114 Suuradood, Khatam & Diiwaanka Bogagga',
    category: 'quran',
    icon: BookOpen,
    color: 'from-emerald-500 to-green-600',
  },
  {
    id: 'adhkaar',
    title: 'Adhkaar & Duco',
    subtitle: 'Subax, Galab, Salaadda dabadeed & Ducooyin gaar ah',
    category: 'quran',
    icon: Sparkles,
    color: 'from-cyan-400 to-teal-500',
  },
  {
    id: 'tasbeeh',
    title: 'Tasbeex Dijitaal',
    subtitle: 'Tiro koobka tasbeexda, Sujuud & Dhawaaq',
    category: 'quran',
    icon: Flame,
    color: 'from-amber-500 to-orange-500',
  },

  // 3. Qorsheynta, Kalandarka & Horumarka (Is-waafaqsan)
  {
    id: 'todo',
    title: 'To-Do & Hawlo 📸',
    subtitle: 'Hawlaha maalinlaha ah, Masawirrada caddeynta & Xasuusin',
    category: 'qorshe',
    icon: CheckSquare,
    badge: 'Kamarad',
    color: 'from-teal-400 to-emerald-500',
  },
  {
    id: 'calendar',
    title: 'Kalandar Hijri & Miladi',
    subtitle: 'Xilliyada bisha, maalmaha soonka & taariikhda',
    category: 'qorshe',
    icon: Calendar,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'stats',
    title: 'Tirakoob & Horumar',
    subtitle: 'Jaantusyada diiwaanka salaadda, streak & heerkaaga',
    category: 'qorshe',
    icon: BarChart3,
    color: 'from-violet-500 to-fuchsia-500',
  },

  // 4. Dejinta & Nidaamka
  {
    id: 'settings',
    title: 'Dejinta App-ka',
    subtitle: 'Bedel Magaalada, Codadka Aadaanka, Hab-ka Rag/Dumar',
    category: 'dejin',
    icon: Settings,
    color: 'from-slate-500 to-slate-700',
  },
];

interface AllSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenAuthModal?: () => void;
  currentUserEmail?: string | null;
  onOpenVideoTour?: () => void;
}

export const AllSectionsModal: React.FC<AllSectionsModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenAuthModal,
  currentUserEmail,
  onOpenVideoTour,
}) => {
  if (!isOpen) return null;

  const categories = [
    { key: 'cibaado', title: 'Salaad & Cibaado' },
    { key: 'quran', title: "Qur'aanka & Adhkaarta" },
    { key: 'qorshe', title: 'Qorsheynta & Horumarka' },
    { key: 'dejin', title: 'Dejinta & Nidaamka' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-gradient-to-b from-[#082029] via-[#061820] to-[#041117] rounded-t-3xl sm:rounded-3xl border border-teal-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-teal-500/20 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Dhammaan Qaybaha App-ka
                </h3>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  11 Qaybood
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Wax walba oo ku jira Mobile, Tablet iyo Laptop hal meel ka hel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95"
            aria-label="Xir daaqadda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable list divided by clear Somali categories */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-teal-500/20">
          {/* Featured Motion Graphic Video Tour Card */}
          {onOpenVideoTour && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-900/60 to-slate-900 border-2 border-emerald-400/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 shrink-0">
                  <Film className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Muuqaalka Sharraxaadda App-ka (Motion Graphic)
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      🎬 Daawo Hadda
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Daawo muuqaalka sharxaya dhammaan qaybaha Tuko (7 qeybood oo animated ah).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <a
                  href="/tuko_motion_graphic_video.html"
                  download="tuko_motion_graphic_video.html"
                  className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Soo degso faylka muuqaalka"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Degso</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVideoTour();
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs transition shadow-md shadow-teal-500/20 hover:brightness-110 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Daawo</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {categories.map((cat) => {
            const items = ALL_SECTIONS.filter((s) => s.category === cat.key);
            return (
              <div key={cat.key} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-400/90 px-1">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span>{cat.title}</span>
                  <span className="text-slate-500 font-normal">({items.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`group relative text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3 active:scale-[0.98] touch-manipulation ${
                          isActive
                            ? 'bg-gradient-to-r from-teal-500/25 via-emerald-500/20 to-teal-500/15 border-teal-400/60 shadow-lg shadow-teal-500/10 ring-1 ring-teal-400/30'
                            : 'bg-slate-900/60 hover:bg-slate-800/80 border-white/5 hover:border-teal-500/30'
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-slate-950 shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-sm font-black truncate ${
                                isActive ? 'text-teal-200' : 'text-white group-hover:text-teal-300'
                              }`}
                            >
                              {item.title}
                            </h4>
                            {isActive ? (
                              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-400/40">
                                <Check className="w-3 h-3" /> Furan
                              </span>
                            ) : item.badge ? (
                              <span className="shrink-0 text-[10px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md border border-amber-400/30">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 self-center shrink-0 transition-transform ${
                            isActive
                              ? 'text-teal-300'
                              : 'text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cloud Sync Account Banner at bottom of menu */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-950/70 to-slate-900/80 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Cloud className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-black text-white">
                  {currentUserEmail ? 'Cloud Database waa ku xiran tahay' : 'Ku xir Koontadaada Cloud Database'}
                </h5>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {currentUserEmail
                    ? `Xogtaada waxay toos ugu kaydsan tahay: ${currentUserEmail}`
                    : 'Si aad xogtaada uga hesho mobile, tablet iyo laptop isku mid ah, gal koontadaada'}
                </p>
              </div>
            </div>

            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition shadow-md shrink-0 active:scale-95"
              >
                {currentUserEmail ? 'Maamul Koontada' : 'Gal Koontada Hadda'}
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-teal-500/20 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="truncate">
            Tuko App • Mobile, Tablet &amp; Laptop waafaqsan
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition text-xs"
          >
            Xir
          </button>
        </div>
      </div>
    </div>
  );
};
