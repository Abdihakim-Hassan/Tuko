import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ChevronDown,
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
  onOpenHelpModal?: () => void;
  onOpenAdminDashboard?: () => void;
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
  onOpenHelpModal,
  onOpenAdminDashboard,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const { isSmallPhone, deviceType } = useWindowDimensions();
  const { language, toggleLanguage } = useLanguage();
  const isAdmin =
    currentUser?.email?.trim().toLowerCase() === 'ccakiincasan@gmail.com' ||
    userProfile?.role === 'admin';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Close profile/settings dropdown when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const checkScrollLimits = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    checkScrollLimits();
    el.addEventListener('scroll', checkScrollLimits, { passive: true });
    window.addEventListener('resize', checkScrollLimits);
    const timeout = setTimeout(checkScrollLimits, 250);
    return () => {
      clearTimeout(timeout);
      el.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, [checkScrollLimits, currentTab]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = navScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(200, Math.round(el.clientWidth * 0.5));
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

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

  const shiftDate = (daysDelta: number) => {
    const dt = new Date(activeDateKey + 'T12:00:00');
    dt.setDate(dt.getDate() + daysDelta);
    onDateChange(dt.toISOString().slice(0, 10));
  };

  return (
    <header
      data-rn-compact={isSmallPhone ? 'true' : 'false'}
      data-rn-device={deviceType}
      className="sticky top-0 z-30 w-full md:pl-20 lg:pl-64 xl:pl-72 backdrop-blur-xl bg-[#06181f]/95 border-b border-teal-500/15 pt-safe transition-all duration-200"
    >
      {/* Responsive Top Bar: Compact on Mobile (<768px), Pro Wide Bar on Tablet (md:) & Desktop (lg:) */}
      <div className="max-w-xl md:max-w-5xl lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-5 lg:px-8 py-2 md:py-2.5 flex items-center justify-between gap-2 md:gap-4">
        {/* Left: Logo Only (on Mobile) + Clean City Pill + Active Section Badge (on Tablet/Desktop) */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onManualSync?.()}
            title="Taabo Logo-da si aad dib ugu cusboonaysiiso"
            className="md:hidden shrink-0 cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <TukoLogo
              className="w-8 h-8 sm:w-9 sm:h-9"
              spinning={isReloading || syncStatus === 'syncing'}
            />
          </button>

          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl bg-slate-900/75 border border-teal-500/20 hover:border-teal-400/40 text-xs font-bold text-teal-200 hover:text-white transition truncate max-w-[125px] sm:max-w-[175px] md:max-w-[240px] cursor-pointer active:scale-95"
            title="Bedel Magaalada"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{settings.cityName.split('(')[0].trim()}</span>
          </button>

          {/* Tablet & Desktop Quick Date Stepper (Hidden on Mobile to keep Mobile Header super clean) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/85 border border-teal-500/20 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Maalintii Hore"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDateChange(todayKey)}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                isToday
                  ? 'bg-teal-500/20 text-teal-300'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              }`}
              title="Ku noqo Maanta"
            >
              {isToday ? 'Maanta' : activeDateKey}
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="Maalinta Xigta"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Clean App Indicators (Clock, Streak, Notification on Tablet/Desktop, Profile Menu) */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Tablet & Desktop Quick Notification Bell */}
          {onOpenNotificationModal && (
            <button
              type="button"
              onClick={onOpenNotificationModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/85 border border-teal-500/25 hover:border-teal-400/50 text-xs font-bold text-teal-200 transition cursor-pointer active:scale-95"
              title="Aadaanka & Ogaysiisyada"
            >
              {isNotificationGranted() ? (
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
              <span className="hidden xl:inline text-[11px]">Aadaan</span>
            </button>
          )}

          {/* 1. Compact Live Clock & Alarm Pill */}
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
            className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/25 hover:border-amber-400/50 transition active:scale-95 cursor-pointer"
            title="Saacadda & Alaarm-ka"
          >
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-mono tabular-nums text-xs font-black text-amber-200 md:hidden">
              {timeCore.slice(0, 5)}
            </span>
            <span className="font-mono tabular-nums text-xs font-black text-amber-200 hidden md:inline">
              {timeCore}
            </span>
            <span className="font-mono text-[9px] font-bold text-cyan-300">
              {timeAmPm}
            </span>
            {activeAlarmsCount > 0 && (
              <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1 py-0.2 rounded">
                ⏰{activeAlarmsCount}
              </span>
            )}
          </button>

          {/* 2. Compact Streak Pill */}
          <button
            type="button"
            onClick={onOpenStreakModal}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-black transition active:scale-95 cursor-pointer ${
              streakDays > 0
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                : 'bg-slate-900/80 border-white/10 text-slate-300'
            }`}
            title="Taxanaha Salaadda (Streak)"
          >
            <Flame className={`w-3.5 h-3.5 ${streakDays > 0 ? 'text-orange-400 fill-orange-400/30' : 'text-slate-400'}`} />
            <span className="font-mono tabular-nums">{streakDays}</span>
          </button>

          {/* 3. Unified Profile & App Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isMenuOpen
                  ? 'bg-teal-900 border-teal-400 text-white ring-2 ring-teal-400/30'
                  : currentUser && !currentUser.isAnonymous
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900 border-teal-500/30 text-teal-200'
              }`}
              title="Menu-ga & Koontada"
            >
              {currentUser && !currentUser.isAnonymous && currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              )}
              <span className="max-w-[65px] truncate hidden sm:inline">
                {currentUser && !currentUser.isAnonymous
                  ? currentUser.displayName?.split(' ')[0] || 'Koonto'
                  : 'Gal'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isMenuOpen ? 'rotate-180 text-teal-300' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-gradient-to-b from-[#09242f] via-[#061921] to-[#041117] border border-teal-500/35 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User Account Header inside Dropdown */}
                <div className="p-3.5 bg-slate-950/70 border-b border-teal-500/20 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-md overflow-hidden">
                      {currentUser && !currentUser.isAnonymous && currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (currentUser && !currentUser.isAnonymous && currentUser.displayName?.[0]?.toUpperCase()) || (
                          <UserIcon className="w-4 h-4 text-slate-950" />
                        )
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-xs sm:text-sm text-white truncate">
                          {currentUser && !currentUser.isAnonymous
                            ? currentUser.displayName || 'Cibaadeyste'
                            : 'Koontadaada Tuko'}
                        </p>
                        {isAdmin && (
                          <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-teal-300/80 truncate">
                        {currentUser && !currentUser.isAnonymous
                          ? currentUser.email || 'Waa lagugu xiray Cloud-ka'
                          : 'Gal ama Isku Diiwaangeli halkan'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAuthModal();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 text-[11px] font-black transition shrink-0 cursor-pointer shadow-sm"
                  >
                    {currentUser && !currentUser.isAnonymous ? 'Koontada' : 'Gal / Diiwaan'}
                  </button>
                </div>

                {/* Language Switcher Row inside Dropdown */}
                <div className="px-3.5 py-2.5 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Luqadda App-ka:</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    data-no-translate="true"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-teal-500/30 text-[10px] font-black cursor-pointer"
                  >
                    <span className={`px-1.5 py-0.5 rounded ${language === 'so' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      🇸🇴 SO
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>
                      🇬🇧 EN
                    </span>
                  </button>
                </div>

                {/* Quick Action Items */}
                <div className="p-2 space-y-1">
                  {/* 1. Admin Dashboard (Only for Admin) */}
                  {isAdmin && onOpenAdminDashboard && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAdminDashboard();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-slate-900/90 hover:from-amber-500/30 border border-amber-400/40 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-amber-200 group-hover:text-white truncate">
                            Maamulka (Admin Dashboard)
                          </p>
                          <p className="text-[10px] text-amber-300/75 truncate">
                            Kala soco isticmaalayaasha &amp; ogaysiisyada
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        Fur ➔
                      </span>
                    </button>
                  )}

                  {/* 2. Adhan & Notification Status */}
                  {onOpenNotificationModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenNotificationModal();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0">
                          {isNotificationGranted() ? (
                            <Bell className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-200 truncate">
                            Aadaanka &amp; Ogaysiisyada
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Codadka 8 Shiiq &amp; digniinta salaadda
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          isNotificationGranted()
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        }`}
                      >
                        {isNotificationGranted() ? 'Furan ✓' : 'Furo'}
                      </span>
                    </button>
                  )}

                  {/* 3. Cloud Sync */}
                  {onManualSync && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onManualSync();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 shrink-0">
                          <RotateCcw
                            className={`w-4 h-4 ${
                              syncStatus === 'syncing' ? 'animate-spin text-amber-400' : ''
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-cyan-200 truncate">
                            Isku-xirka Xogta (Sync)
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Cusboonaysii xogta Mobile &amp; PC
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-lg shrink-0">
                        {syncStatus === 'syncing' ? 'Socda...' : 'Sync'}
                      </span>
                    </button>
                  )}

                  {/* 4. Install Tuko App */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMenuOpen(false);
                      if (isInstallable && !isInstalled) {
                        const res = await install();
                        if (!res) onOpenMobileInstall();
                      } else {
                        onOpenMobileInstall();
                      }
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-xl bg-teal-500/15 text-teal-300 shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-teal-200 truncate">
                          Install Tuko (Soo Degso)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Ku shubo Android, iPhone ama PC
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded-lg shrink-0">
                      {isInstalled ? 'Rakiban ✓' : 'Install'}
                    </span>
                  </button>

                  {/* 5. Help & Guide */}
                  {onOpenHelpModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenHelpModal();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-300 shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-purple-200 truncate">
                            Caawimaad &amp; Tilmaamo
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Su&apos;aalaha &amp; sida app-ka loo isticmaalo
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-white shrink-0">➔</span>
                    </button>
                  )}

                  {/* 6. City & General Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTabChange('settings');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-xl bg-slate-800 text-cyan-400 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-cyan-200 truncate">
                          Magaalada &amp; Dejinta App-ka
                        </p>
                        <p className="text-[10px] text-teal-300/80 truncate">{settings.cityName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 group-hover:text-white shrink-0">➔</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
