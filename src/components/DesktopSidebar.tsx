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
  MapPin,
  Star,
  Wifi,
  WifiOff,
  RotateCcw,
  CloudRain,
} from 'lucide-react';
import { TukoLogo } from './TukoLogo';
import { AppSettings } from '../types';
import { useLanguage } from '../utils/i18n';

interface DesktopSidebarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  onOpenAllSections: () => void;
  settings: AppSettings;
  streakDays: number;
  todayPrayedCount?: number;
  syncStatus?: 'connected' | 'syncing' | 'offline';
  isReloading?: boolean;
  onManualSync?: () => void;
}

interface SidebarNavItem {
  id: string;
  labelSo: string;
  labelEn: string;
  shortSo: string;
  shortEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarGroup {
  titleSo: string;
  titleEn: string;
  items: SidebarNavItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    titleSo: 'Tiirka Salaadda',
    titleEn: 'Daily Prayers',
    items: [
      {
        id: 'salaad',
        labelSo: 'Salaad & Diiwaan',
        labelEn: 'Prayers & Log',
        shortSo: 'Salaad',
        shortEn: 'Prayers',
        icon: Compass,
      },
      {
        id: 'adhan',
        labelSo: 'Aadaanka Salaadda',
        labelEn: 'Adhan & Schedule',
        shortSo: 'Aadaan',
        shortEn: 'Adhan',
        icon: Volume2,
      },
      {
        id: 'alarm',
        labelSo: 'Alaarm & Saacad',
        labelEn: 'Alarms & Clock',
        shortSo: 'Alaarm',
        shortEn: 'Alarm',
        icon: Bell,
      },
      {
        id: 'qibla',
        labelSo: 'Jihada Qiblada',
        labelEn: 'Qibla Compass',
        shortSo: 'Qibla',
        shortEn: 'Qibla',
        icon: Navigation,
      },
    ],
  },
  {
    titleSo: 'Kalaamka & Xuska',
    titleEn: "Qur'an & Dhikr",
    items: [
      {
        id: 'quran',
        labelSo: "Qur'aanka Kariimka",
        labelEn: "Noble Qur'an",
        shortSo: "Qur'aan",
        shortEn: "Qur'an",
        icon: BookOpen,
        badge: '114',
      },
      {
        id: 'adhkaar',
        labelSo: 'Adhkaar & Duco',
        labelEn: 'Adhkaar & Duas',
        shortSo: 'Adhkaar',
        shortEn: 'Adhkaar',
        icon: Sparkles,
      },
      {
        id: 'tasbeeh',
        labelSo: 'Tusbah & Xus',
        labelEn: 'Digital Tasbeeh',
        shortSo: 'Tasbiix',
        shortEn: 'Tasbeeh',
        icon: Flame,
      },
      {
        id: 'ambient',
        labelSo: 'Codadka Dabeecadda',
        labelEn: 'Nature Sounds',
        shortSo: 'Dabeecad',
        shortEn: 'Nature',
        icon: CloudRain,
        badge: '🌿',
      },
    ],
  },
  {
    titleSo: 'Soonka & Sakada',
    titleEn: 'Fasting & Zakat',
    items: [
      {
        id: 'soon',
        labelSo: 'Soon & Xisaab Sako',
        labelEn: 'Fasting & Zakat',
        shortSo: 'Soon',
        shortEn: 'Fasting',
        icon: Moon,
      },
    ],
  },
  {
    titleSo: 'Qorshaha & Xogta',
    titleEn: 'Planning & Stats',
    items: [
      {
        id: 'todo',
        labelSo: 'Qorshaha Maalinta',
        labelEn: 'Daily To-Do',
        shortSo: 'To-Do',
        shortEn: 'To-Do',
        icon: CheckSquare,
      },
      {
        id: 'calendar',
        labelSo: 'Kalandarka Hijriga',
        labelEn: 'Hijri Calendar',
        shortSo: 'Kalandar',
        shortEn: 'Calendar',
        icon: Calendar,
      },
      {
        id: 'stats',
        labelSo: 'Tirakoobka Guud',
        labelEn: 'Analytics & Stats',
        shortSo: 'Tirakoob',
        shortEn: 'Stats',
        icon: BarChart3,
      },
      {
        id: 'settings',
        labelSo: 'Dejinta App-ka',
        labelEn: 'App Settings',
        shortSo: 'Dejin',
        shortEn: 'Settings',
        icon: Settings,
      },
    ],
  },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenAllSections,
  settings,
  streakDays,
  todayPrayedCount = 0,
  syncStatus = 'connected',
  isReloading = false,
  onManualSync,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <aside
      aria-label="Tablet and Desktop App Navigation"
      className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 md:w-20 lg:w-64 xl:w-72 bg-[#04141a]/95 border-r border-teal-500/20 backdrop-blur-2xl select-none shadow-[8px_0_30px_rgba(0,0,0,0.5)] transition-all duration-200"
    >
      {/* Top Brand & Location Header */}
      <div className="p-3 lg:px-5 lg:py-4 border-b border-teal-500/15 flex items-center justify-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onManualSync?.()}
            title="Cusboonaysii Xogta"
            className="shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <TukoLogo
              className="w-10 h-10 lg:w-10 lg:h-10 shadow-lg"
              spinning={isReloading || syncStatus === 'syncing'}
            />
          </button>

          {/* Desktop Only: City & Offline Ready Status */}
          <div className="hidden lg:block min-w-0">
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className="flex items-center gap-1.5 text-xs font-black text-white hover:text-teal-300 transition truncate cursor-pointer"
              title="Bedel Magaalada"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{settings.cityName.split('(')[0].trim()}</span>
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
              )}
              <span className="text-[10px] font-bold text-emerald-300/90 truncate">
                {isOnline ? '100% Offline Diyaar' : 'Habka Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Quick Sync Icon */}
        {onManualSync && (
          <button
            type="button"
            onClick={onManualSync}
            className="hidden lg:flex p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-teal-500/25 text-teal-300 transition active:scale-95 cursor-pointer"
            title="Sync Cloud"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}
      </div>

      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 lg:px-3.5 space-y-4 scrollbar-none">
        {SIDEBAR_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {/* Group Header (Desktop Only) */}
            <div className="hidden lg:flex items-center justify-between px-2.5 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400/75">
                {isEn ? group.titleEn : group.titleSo}
              </span>
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={isEn ? item.labelEn : item.labelSo}
                  className={`w-full relative flex flex-col lg:flex-row items-center lg:justify-between gap-1 lg:gap-3 px-2 lg:px-3 py-2 lg:py-2.5 rounded-2xl transition-all duration-150 cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/20 via-emerald-500/15 to-teal-500/5 border border-teal-400/40 text-white shadow-lg shadow-teal-950/50'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-teal-300 to-emerald-400 rounded-r-full shadow-md shadow-teal-400/50" />
                  )}

                  <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-xl transition-colors shrink-0 ${
                        isActive
                          ? 'bg-teal-500/25 text-teal-300'
                          : 'bg-slate-900/60 text-slate-400 group-hover:text-teal-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 lg:w-4 lg:h-4" />
                    </div>

                    {/* Tablet Compact Label */}
                    <span className="lg:hidden text-[9px] font-bold leading-tight text-center truncate max-w-[64px]">
                      {isEn ? item.shortEn : item.shortSo}
                    </span>

                    {/* Desktop Full Label */}
                    <span
                      className={`hidden lg:inline text-xs truncate ${
                        isActive ? 'font-black text-white' : 'font-semibold text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {isEn ? item.labelEn : item.labelSo}
                    </span>
                  </div>

                  {/* Right Badge on Desktop */}
                  {item.id === 'salaad' ? (
                    <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {todayPrayedCount}/5
                    </span>
                  ) : item.badge ? (
                    <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-teal-500/15 text-teal-300 border border-teal-400/25">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Footer inside Sidebar: Pinned Favorites Launcher & Streak Summary */}
      <div className="p-2.5 lg:p-3.5 border-t border-teal-500/15 bg-slate-950/60 space-y-2">
        <button
          type="button"
          onClick={onOpenAllSections}
          className="w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-1 lg:gap-2 px-2 lg:px-3.5 py-2 lg:py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 hover:from-amber-500/25 border border-amber-400/35 text-amber-200 transition cursor-pointer active:scale-95"
          title="Dhammaan 12-ka Qeybood & Xulashada"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <span className="hidden lg:inline text-xs font-black text-amber-200">
              Dhammaan 12 Qeybood
            </span>
          </div>
          <span className="lg:hidden text-[9px] font-black text-amber-300">12 Qeyb</span>
          <span className="hidden lg:inline text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
            Grid
          </span>
        </button>

        {/* Desktop Streak Summary */}
        <div className="hidden lg:flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
            <span>Taxanaha Cibaadada:</span>
          </div>
          <span className="font-mono font-black text-amber-300">{streakDays} maalmood</span>
        </div>
      </div>
    </aside>
  );
};
