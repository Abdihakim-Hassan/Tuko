import React from 'react';
import {
  Compass,
  BookOpen,
  Sparkles,
  Volume2,
  Navigation,
  Moon,
  Flame,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Star,
  CloudRain,
} from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  onOpenAllSections: () => void;
  favoriteIds?: string[];
  isAllSectionsOpen?: boolean;
}

const SECTION_META: Record<
  string,
  { labelSo: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }
> = {
  salaad: { labelSo: 'Salaad', labelEn: 'Prayers', icon: Compass },
  quran: { labelSo: "Qur'aan", labelEn: "Qur'an", icon: BookOpen },
  adhkaar: { labelSo: 'Adhkaar', labelEn: 'Adhkaar', icon: Sparkles },
  adhan: { labelSo: 'Aadaan', labelEn: 'Adhan', icon: Volume2 },
  alarm: { labelSo: 'Alaarm', labelEn: 'Alarm', icon: Bell },
  qibla: { labelSo: 'Qibla', labelEn: 'Qibla', icon: Navigation },
  soon: { labelSo: 'Soon', labelEn: 'Fasting', icon: Moon },
  tasbeeh: { labelSo: 'Tasbiix', labelEn: 'Tasbeeh', icon: Flame },
  ambient: { labelSo: 'Dabeecad', labelEn: 'Nature', icon: CloudRain },
  todo: { labelSo: 'To-Do', labelEn: 'To-Do', icon: CheckSquare },
  calendar: { labelSo: 'Kalandar', labelEn: 'Calendar', icon: Calendar },
  stats: { labelSo: 'Tirakoob', labelEn: 'Stats', icon: BarChart3 },
  settings: { labelSo: 'Dejin', labelEn: 'Settings', icon: Settings },
};

const DEFAULT_POOL = ['quran', 'adhkaar', 'adhan'];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenAllSections,
  favoriteIds = [],
  isAllSectionsOpen = false,
}) => {
  const { language } = useLanguage();

  // Slot 1: Always Salaad (Primary Pillar)
  // Slots 2, 3, 4: Dynamic user-pinned favorites
  const userFavorites = favoriteIds.filter((id) => id !== 'salaad' && SECTION_META[id]);
  const chosenSlots: string[] = [];

  // Add user favorites first (up to 3 items)
  for (const favId of userFavorites) {
    if (chosenSlots.length < 3 && !chosenSlots.includes(favId)) {
      chosenSlots.push(favId);
    }
  }

  // Fill remaining slots from default pool if user pinned fewer than 3
  for (const fallbackId of DEFAULT_POOL) {
    if (chosenSlots.length < 3 && !chosenSlots.includes(fallbackId)) {
      chosenSlots.push(fallbackId);
    }
  }

  const navItems = [
    {
      id: 'salaad',
      label: language === 'en' ? 'Prayers' : 'Salaad',
      icon: Compass,
    },
    ...chosenSlots.map((slotId) => {
      const meta = SECTION_META[slotId] || {
        labelSo: slotId,
        labelEn: slotId,
        icon: Compass,
      };
      return {
        id: slotId,
        label: language === 'en' ? meta.labelEn : meta.labelSo,
        icon: meta.icon,
      };
    }),
  ];

  return (
    <nav
      aria-label="App Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#05151b]/95 border-t border-teal-500/20 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.75)] select-none touch-manipulation pb-safe-nav"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
      }}
    >
      <div className="grid grid-cols-5 max-w-xl mx-auto px-2 pt-2 pb-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !isAllSectionsOpen && currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] py-0.5 transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-teal-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full shadow-lg shadow-teal-500/50" />
              )}
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-teal-500/15 text-teal-300' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Button: Open Favorites / Xulashada Gaarka ah */}
        <button
          type="button"
          onClick={onOpenAllSections}
          title={language === 'en' ? 'Your Favorites' : 'Qaybaha aad ugu jeceshahay'}
          className={`relative flex flex-col items-center justify-center min-h-[44px] py-0.5 transition-all active:scale-95 cursor-pointer ${
            isAllSectionsOpen
              ? 'text-amber-300 font-bold'
              : 'text-amber-300/80 hover:text-amber-200'
          }`}
        >
          {isAllSectionsOpen && (
            <span className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full shadow-lg shadow-amber-500/50" />
          )}
          <div
            className={`p-1 rounded-xl transition-colors ${
              isAllSectionsOpen ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40' : ''
            }`}
          >
            <Star
              className={`w-5 h-5 stroke-[2.2] text-amber-400 transition-transform ${
                isAllSectionsOpen ? 'fill-amber-400 scale-110' : 'fill-amber-400/20'
              }`}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight mt-0.5 whitespace-nowrap font-bold text-amber-300">
            {language === 'en' ? 'Favorites' : 'Xulashada'}
          </span>
        </button>
      </div>
    </nav>
  );
};
