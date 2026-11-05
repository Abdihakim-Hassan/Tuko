import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnectedAlert, setShowReconnectedAlert] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      setDismissed(false);
      const timer = setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedAlert) return null;
  if (dismissed && !showReconnectedAlert) return null;

  if (showReconnectedAlert) {
    return (
      <aside aria-label="Connection Status" className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl border border-emerald-400/40 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-emerald-200 shrink-0 animate-pulse" />
            <span>
              {language === 'en'
                ? 'Back Online — Your data is synced with the cloud.'
                : 'Internetku wuu soo noqday — Xogtaadii waa la isku xiray.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowReconnectedAlert(false)}
            className="p-1 hover:bg-white/20 rounded-lg transition"
            aria-label="Xir"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Connection Status" className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-md w-[94%] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-slate-950/95 text-emerald-200 shadow-2xl border border-emerald-500/40 text-[11px] sm:text-xs font-semibold backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">
            {language === 'en'
              ? 'Offline Mode Ready — All 11 sections & 114 Surahs work offline.'
              : 'Offline Waa Diyaar — Dhammaan 11-ka qeybood & 114 Suuradood si buuxda ayay u shaqeynayaan.'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-emerald-500/20 rounded-lg transition text-emerald-300 shrink-0"
          aria-label="Qari fariinta"
          title="Qari"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
