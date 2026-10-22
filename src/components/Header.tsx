import React, { useEffect, useState, useRef } from 'react';
import {
  Compass,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  Flame,
  Smartphone,
  User as UserIcon,
  Cloud,
  Navigation,
  Moon,
  Crown,
  Download,
  Bell,
  BellRing,
  CheckSquare,
  RotateCcw,
  Volume2,
  LayoutGrid,
  Film,
  Globe,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppSettings, AppUserProfile } from '../types';
import { TukoLogo } from './TukoLogo';
import { usePWAInstall } from '../utils/usePWAInstall';
import { isNotificationGranted, audioAlerts } from '../utils/audioAlerts';
import { useWindowDimensions } from '../utils/reactNative';
import { useLanguage } from '../utils/i18n';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeDateKey: string;
  onDateChange: (dateKey: string) => void;
  todayKey: string;
  settings: AppSettings;
  streakDays: number;
  currentUser: User | null;
  userProfile?: AppUserProfile | null;
  syncStatus?: 'connected' | 'syncing' | 'offline';
  isReloading?: boolean;
  onManualSync?: () => void;
  onOpenClockAlarm?: () => void;
  onOpenAuthModal: () => void;
  onOpenMobileInstall: () => void;
  onOpenNotificationModal?: () => void;
  onOpenStreakModal?: () => void;
  onOpenAllSectionsModal?: () => void;
  onOpenVideoTour?: () => void;
}

function formatClock12Deterministic(date: Date): { time: string; ampm: string } {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  return { time: `${hStr}:${mStr}:${sStr}`, ampm };
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  activeDateKey,
  onDateChange,
  todayKey,
  settings,
  streakDays,
  currentUser,
  userProfile,
  syncStatus = 'connected',
  isReloading = false,
  onManualSync,
  onOpenClockAlarm,
  onOpenAuthModal,
  onOpenMobileInstall,
  onOpenNotificationModal,
  onOpenStreakModal,
  onOpenAllSectionsModal,
  onOpenVideoTour,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const { isSmallPhone, deviceType } = useWindowDimensions();
  const { language, toggleLanguage } = useLanguage();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeEl = tabRefs.current[currentTab];
    const container = navScrollRef.current;
    if (activeEl && container) {
      const targetLeft =
        activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [currentTab]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(new Date());
    const interval = setInterval(updateClock, 1000);
    document.addEventListener('visibilitychange', updateClock);
    window.addEventListener('focus', updateClock);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', updateClock);
      window.removeEventListener('focus', updateClock);
    };
  }, []);

  const { time: timeCore, ampm: timeAmPm } = formatClock12Deterministic(currentTime);
  const activeAlarmsCount = (settings.alarms || []).filter((a) => a.enabled).length;

  const isToday = activeDateKey === todayKey;

  const tabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    group: 'salaad' | 'dhikr' | 'soon' | 'qorshe' | 'dejin';
  }> = [
    // 1. Tiirka Salaadda, Waqtiga Aadaanka & Jihada Qiblada (Ugu muhiimsan & is-waafaqsan)
    { id: 'salaad', label: 'Salaad & Diiwaan', icon: Compass, group: 'salaad' },
    { id: 'adhan', label: 'Aadaan & Alaarm ⏰', icon: Volume2, badge: 'Cusub', group: 'salaad' },
    { id: 'qibla', label: 'Qibla', icon: Navigation, group: 'salaad' },

    // 2. Kalaamka Alle, Adhkaarta & Tasbeexda (Is-waafaqsan)
    { id: 'quran', label: "Qur'aan", icon: BookOpen, group: 'dhikr' },
    { id: 'adhkaar', label: 'Adhkaar & Duco', icon: Sparkles, group: 'dhikr' },
    { id: 'tasbeeh', label: 'Tasbeex', icon: Flame, group: 'dhikr' },

    // 3. Tiirarka Soonka & Sakada
    { id: 'soon', label: 'Soon & Sakada 💰', icon: Moon, group: 'soon' },

    // 4. Qorsheynta Maalinta, Kalandarka & Tirakoobka Horumarka (Is-waafaqsan)
    { id: 'todo', label: 'To-Do 📸', icon: CheckSquare, group: 'qorshe' },
    { id: 'calendar', label: 'Kalandar', icon: Calendar, group: 'qorshe' },
    { id: 'stats', label: 'Tirakoob', icon: BarChart3, group: 'qorshe' },

    // 5. Dejinta Guud ee App-ka
    { id: 'settings', label: 'Dejin', icon: Settings, group: 'dejin' },
  ];

  return (
    <header
      data-rn-compact={isSmallPhone ? 'true' : 'false'}
      data-rn-device={deviceType}
      className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#071a21]/90 border-b border-teal-500/15 shadow-lg shadow-teal-950/30 pt-safe"
    >
      {/* Top Bar with Brand, Live Clock, Streak & Auth */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Logo and Brand (Tap logo to trigger reload/sync with spinning logo animation) */}
        <button
          type="button"
          onClick={() => onManualSync?.()}
          title="Taabo Logo-da si aad dib ugu cusboonaysiiso (Reload / Sync)"
          className="flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer focus:outline-none"
        >
          <TukoLogo
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 transition-transform group-active:scale-95"
            spinning={isReloading || syncStatus === 'syncing'}
          />
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              Tuko <span className="text-xs sm:text-sm font-bold text-teal-300/90">– Dhawr-Salaad &amp; Adkaar</span>
            </h1>
            <p className="text-[11px] text-teal-300/75 font-medium hidden sm:block">
              Saaxiibkaaga Cibaadada Maalinlaha ah • Waqtiyada Salaadda Soomaaliya
            </p>
          </div>
        </button>

        {/* Right Status & Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 1. Interactive Live Clock & Alarm Pill */}
          <button
            type="button"
            onClick={() => {
              audioAlerts.unlockAudio();
              if (onOpenClockAlarm) {
                onOpenClockAlarm();
              } else {
                onTabChange('adhan');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-teal-950/90 border border-cyan-400/40 hover:border-amber-400/70 shadow-inner transition active:scale-95 cursor-pointer"
            title="Saacadda Nool & Alaarm-ka (Taabo si aad u furto Saacadda & Alaarm-ka)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span className="font-mono tabular-nums text-xs sm:text-sm font-black tracking-wider text-amber-200">
              {timeCore}
            </span>
            <span className="font-mono text-[10px] font-black text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded-md">
              {timeAmPm}
            </span>
            {activeAlarmsCount > 0 && (
              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 rounded-md">
                ⏰ {activeAlarmsCount}
              </span>
            )}
          </button>

          {/* 2. Streak Badge */}
          <button
            type="button"
            onClick={onOpenStreakModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ${
              streakDays > 0
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/35 text-amber-300 shadow-amber-500/10 hover:border-amber-400'
                : 'bg-slate-900/80 border-teal-500/25 text-slate-300 hover:text-amber-300 hover:border-amber-500/30'
            }`}
            title="Guji si aad u aragto sharaxaadda Taxanaha (Streak) ama aad u bilowdo!"
          >
            <Flame className={`w-3.5 h-3.5 ${streakDays > 0 ? 'text-orange-400 animate-bounce' : 'text-slate-400'}`} />
            <span className="font-mono tabular-nums font-black">
              {streakDays} {streakDays === 1 ? 'Maalin' : 'Maalmood'}
            </span>
          </button>

          {/* 3. Adhan & Notification Status Button */}
          {onOpenNotificationModal && (
            <button
              type="button"
              onClick={onOpenNotificationModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ${
                isNotificationGranted()
                  ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/35 text-emerald-300 hover:border-emerald-400/60'
                  : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/50 text-amber-300 hover:border-amber-300 animate-pulse'
              }`}
              title="Aadaanka & Ogaysiisyada Salaadda"
            >
              {isNotificationGranted() ? (
                <Bell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <BellRing className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span>{isNotificationGranted() ? 'Aadaanka (Furan)' : 'Furo Aadaanka'}</span>
            </button>
          )}

          {/* 4. User Account / Database Cloud Sync Button */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ${
              currentUser
                ? 'bg-gradient-to-r from-emerald-950/85 to-teal-950/85 border-emerald-400/40 text-emerald-300 hover:border-emerald-300'
                : 'bg-gradient-to-r from-teal-950/70 to-slate-900/90 border-teal-500/35 text-teal-200 hover:border-teal-400/60'
            }`}
            title="Gal Koontada / Keydka Database-ka"
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
            ) : currentUser ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            )}
            <span className="max-w-[110px] truncate">
              {currentUser ? currentUser.displayName?.split(' ')[0] || 'Koontada' : 'Gal Koontada'}
            </span>
            {userProfile?.role === 'admin' && (
              <span className="flex items-center text-[10px] text-amber-300 font-extrabold bg-amber-500/20 px-1.5 py-0.5 rounded-md border border-amber-400/40">
                <Crown className="w-2.5 h-2.5 mr-0.5" />
                Admin
              </span>
            )}
            {currentUser && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
          </button>

          {/* 5. City / Country Badge */}
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-950/60 to-slate-900/80 border border-teal-500/25 hover:border-teal-400/50 transition-all text-xs font-semibold text-teal-200 hover:text-teal-100 shadow-sm cursor-pointer"
            title="Bedel Magaalada ama Dejinta"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="max-w-[130px] truncate">{settings.cityName}</span>
          </button>

          {/* 6. Language Toggle: Af-Soomaali / English */}
          <button
            type="button"
            onClick={toggleLanguage}
            data-no-translate="true"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-teal-950/90 to-slate-900 border border-cyan-400/45 hover:border-amber-400/75 text-xs font-black transition shadow-sm active:scale-95 cursor-pointer"
            title={
              language === 'so'
                ? 'Switch language to English (Carabiga Qur\'aanka & Ducooyinka isma beddelayo)'
                : 'U beddel luqadda Af-Soomaali (Arabic Qur\'an & Duas stay in Arabic)'
            }
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition ${
                language === 'so'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇸🇴 SO
            </span>
            <span className="text-slate-600 font-normal">|</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition ${
                language === 'en'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 EN
            </span>
          </button>

          {/* 7. Install App / Mobile Guide Button */}
          {isInstallable && !isInstalled ? (
            <button
              type="button"
              onClick={async () => {
                const res = await install();
                if (!res) onOpenMobileInstall();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 text-xs font-black transition shadow-lg shadow-teal-500/30 hover:brightness-110 active:scale-95 cursor-pointer"
              title="Toos ugu shubo taleefankaaga / kombiyuutarkaaga"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="font-extrabold">Install Tuko</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMobileInstall}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/85 border border-emerald-500/35 hover:border-emerald-400/70 text-emerald-300 text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              title="Soo deji Mobile & PC ama ka dhig Online"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Soo Deji &amp; Online</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        ref={navScrollRef}
        className="max-w-6xl mx-auto px-3 sm:px-4 pb-2.5 overflow-x-auto scrollbar-none"
      >
        <nav className="flex items-center gap-1.5 min-w-max p-1 rounded-2xl bg-slate-950/75 border border-teal-500/15">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const prevGroup = index > 0 ? tabs[index - 1].group : tab.group;
            const showGroupDivider = index > 0 && prevGroup !== tab.group;

            return (
              <React.Fragment key={tab.id}>
                {showGroupDivider && (
                  <span
                    className="h-4 w-px bg-teal-500/20 mx-0.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <button
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative whitespace-nowrap shrink-0 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-teal-400/85'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && !isActive && (
                    <span className="text-[10px] bg-gradient-to-r from-teal-500/30 to-emerald-500/30 border border-teal-400/30 text-teal-300 px-1.5 py-0.5 rounded-full leading-none">
                      {tab.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          {onOpenAllSectionsModal && (
            <>
              <span
                className="h-4 w-px bg-teal-500/20 mx-0.5 shrink-0"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={onOpenAllSectionsModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-teal-500/25 via-emerald-500/20 to-teal-500/25 text-teal-200 border border-teal-400/40 hover:border-teal-300 hover:text-white shadow-sm shrink-0 active:scale-95 cursor-pointer"
                title="Arag dhammaan qaybaha app-ka"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>Qaybaha</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
