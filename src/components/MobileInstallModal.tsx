import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Download,
  X,
  Share2,
  Copy,
  Check,
  Monitor,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Laptop,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Apple,
  Cloud,
  Rocket,
  Server,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Known URLs
export const DEV_APP_URL = 'https://ais-dev-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app';
export const PREVIEW_APP_URL = 'https://ais-pre-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app';

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Master Category: 5 Tabs - 'mobile' vs 'browsers' vs 'pc' vs 'online' vs 'poster'
  const [mainCategory, setMainCategory] = useState<'mobile' | 'browsers' | 'pc' | 'online' | 'poster'>('mobile');

  // Sub-option inside Mobile: 'android' vs 'ios'
  const [mobileSubTab, setMobileSubTab] = useState<'android' | 'ios'>('android');

  // URL Target Selection: 'current' (Active URL) or 'custom'
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isEditingCustomUrl, setIsEditingCustomUrl] = useState<boolean>(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Compute active target URL - defaults to window.location.origin/href if available, else PREVIEW_APP_URL
  const activeTargetUrl = useMemo(() => {
    if (customUrl.trim()) {
      return customUrl.trim();
    }
    if (typeof window !== 'undefined') {
      const href = window.location.href;
      if (href && !href.includes('localhost') && !href.includes('127.0.0.1')) {
        return href;
      }
    }
    return PREVIEW_APP_URL;
  }, [customUrl]);

  // Detect user agent on open to recommend the right tab
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setMainCategory('mobile');
        setMobileSubTab('ios');
      } else if (/android/.test(ua)) {
        setMainCategory('mobile');
        setMobileSubTab('android');
      } else if (/mobile|phone/.test(ua)) {
        setMainCategory('mobile');
        setMobileSubTab('android');
      } else {
        setMainCategory('mobile');
      }
    }
  }, [isOpen]);

  const handleInstallClick = async () => {
    await install();
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeTargetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Tuko – Dhawr-Salaad & Adkaar',
          text: 'Ka baro oo ku dhowr salaadahaaga, adkaarta iyo Qur’aanka app-ka casriga ah ee Tuko!',
          url: activeTargetUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRefreshPage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40]);
      }
    } catch {}

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update().catch(() => {});
        }
      } catch {}
    }

    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-gradient-to-br from-[#082029] via-[#082833] to-[#05171d] border border-teal-500/40 p-4 sm:p-6 text-white shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer z-10"
          aria-label="Xir"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-3.5 pb-3 border-b border-teal-500/20">
          <div className="relative shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="Tuko App Logo"
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl shadow-xl border-2 border-amber-400/50 p-0.5 bg-[#042f2e] object-contain"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Tuko App
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PWA Rasmi ah ✓
              </span>
            </div>
            <p className="text-xs text-teal-300/90 font-medium truncate mt-0.5">
              Ku Shubo Taleefankaaga, PC ama Ka dhig mid Online ah
            </p>
          </div>
        </div>

        {/* Master Category Switcher: 5 Clean Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-teal-500/30 mb-3.5 text-xs font-bold">
          {/* Tab 1: Mobile */}
          <button
            onClick={() => setMainCategory('mobile')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
              mainCategory === 'mobile'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mobile 📱</span>
          </button>

          {/* Tab 2: Any Browsers */}
          <button
            onClick={() => setMainCategory('browsers')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
              mainCategory === 'browsers'
                ? 'bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                : 'text-cyan-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Browsers 🌐</span>
          </button>

          {/* Tab 3: PC Desktop */}
          <button
            onClick={() => setMainCategory('pc')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
              mainCategory === 'pc'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">PC Desktop 💻</span>
          </button>

          {/* Tab 4: Saar Online (Cusub) */}
          <button
            onClick={() => setMainCategory('online')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
              mainCategory === 'online'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                : 'text-emerald-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">Saar Online 🚀</span>
          </button>

          {/* Tab 5: Posters */}
          <button
            onClick={() => setMainCategory('poster')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer col-span-2 sm:col-span-1 ${
              mainCategory === 'poster'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                : 'text-amber-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Posters 🎨</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: QAYBTA MOBILE (Subtabs: Android & iOS - Bilaa QR)
           ═══════════════════════════════════════════════════════════ */}
        {mainCategory === 'mobile' && (
          <div className="space-y-3.5 animate-in fade-in">
            {/* Mobile Sub-tabs: Android vs iOS */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/70 border border-teal-500/20 text-xs font-bold">
              <button
                onClick={() => setMobileSubTab('android')}
                className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileSubTab === 'android'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>🤖 Android (Google Chrome)</span>
              </button>

              <button
                onClick={() => setMobileSubTab('ios')}
                className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileSubTab === 'ios'
                    ? 'bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>🍏 iOS (Apple iPhone &amp; iPad)</span>
              </button>
            </div>

            {/* 🤖 SUBTAB 1.1: ANDROID */}
            {mobileSubTab === 'android' && (
              <div className="space-y-3 text-xs bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-teal-500/30 animate-in fade-in">
                <div className="font-extrabold text-teal-200 uppercase tracking-wider flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Taleefannada Android:</span>
                  </span>
                  <span className="text-[10px] text-teal-300 font-bold bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-400/30">
                    Android Ready ✓
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  App-kan wuxuu si toos ah oo buuxda ugu shaqaynayaa taleefankaaga Android adigoo si toos ah ugu shuban kara shaashadda guriga (Home Screen).
                </p>

                {/* Direct 1-Click Install Button if supported */}
                {isInstallable && !isInstalled ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-teal-950/60 transition flex items-center justify-center gap-2 active:scale-95 animate-pulse cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Toos ugu Shubo Android (1-Click Install Now)</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-200 font-semibold">
                        App-ka waxaa toos loogu furi karaa biraawsarkaaga Chrome ama Android.
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Open & Share */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={activeTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Toos u Fur Hadda (Android)</span>
                  </a>

                  <button
                    onClick={handleShareLink}
                    className="py-3 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-300" />
                    <span>Wadaag Link-ga</span>
                  </button>
                </div>

                {/* 3 Steps Guide for Android */}
                <div className="space-y-2 pt-1.5 border-t border-teal-500/20">
                  <h4 className="font-black text-white text-xs">Sida loogu daro shaashadda taleefankaaga Android:</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-medium leading-relaxed text-[11px]">
                    <li>
                      <strong className="text-white">Fur Biraawsarka:</strong> Guji badhanka sare ee <strong>"Toos u Fur Hadda"</strong> si aad app-ka ugu furto Google Chrome.
                    </li>
                    <li>
                      <strong className="text-white">Add to Home screen:</strong> Biraawsarkaaga xagga sare ama hoose ka taabo saddexda dhibcood <strong>(⋮)</strong> ➔ Dooro <strong>"Install app"</strong> ama <strong>"Add to Home screen"</strong>.
                    </li>
                    <li>
                      <strong className="text-white">Dhammaystir:</strong> Guji <strong>Install</strong> ama <strong>Add</strong>. Astaanta Tuko waxay toos ugu soo dhacaysaa shaashaddaada Android sida app caadi ah!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* 🍏 SUBTAB 1.2: IOS (Apple iPhone & iPad) */}
            {mobileSubTab === 'ios' && (
              <div className="space-y-3 text-xs bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-sky-500/30 animate-in fade-in">
                <div className="font-extrabold text-sky-200 uppercase tracking-wider flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-sky-300" />
                    <span>Apple iPhone &amp; iPad (iOS):</span>
                  </span>
                  <span className="text-[10px] text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/30">
                    Safari Diyaar ah ✓
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Taleefannada Apple iPhone iyo iPad-ka, app-ka Tuko wuxuu si toos ah oo buuxda ugu shaqaynayaa biraawsarka rasmiga ah ee <strong>Apple Safari</strong>.
                </p>

                {/* Action Buttons for iOS */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={activeTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Toos ugu Fur Safari (iOS)</span>
                  </a>

                  <button
                    onClick={handleShareLink}
                    className="py-3 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-300" />
                    <span>Wadaag Link-ga iOS</span>
                  </button>
                </div>

                {/* 4 Steps Guide for iOS Safari */}
                <div className="space-y-2 pt-1.5 border-t border-sky-500/20">
                  <h4 className="font-black text-white text-xs">Sida loogu daro shaashadda iPhone/iPad (Safari):</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300 font-medium leading-relaxed text-[11px]">
                    <li>
                      <strong className="text-white">Safari ku Fur:</strong> Guji badhanka kore ee <strong>"Toos ugu Fur Safari"</strong> ama link-ga ku fur Safari.
                    </li>
                    <li>
                      <strong className="text-white">Share Icon-ka [ ↑ ]:</strong> Xagga hoose ee Safari ku dhufo astaanta Share-ka ee ah sanduuqa falaarta kor u haysa leh <strong>[ ↑ ]</strong>.
                    </li>
                    <li>
                      <strong className="text-white">Add to Home Screen:</strong> Hoos ugu deg liiska soo baxa, ka dibna dooro <strong>"Add to Home Screen"</strong> (Ku dar shaashadda guriga).
                    </li>
                    <li>
                      <strong className="text-white">Dhammaystir (Add):</strong> Xagga sare ee midig ku dhufo <strong>"Add"</strong>. Astaanta Tuko waxay toos uga soo dhex muuqan doontaa shaashaddaada iPhone sida App dhab ah!
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: ANY BROWSERS (Biraawsar Kasta oo Caalamka Jira)
           ═══════════════════════════════════════════════════════════ */}
        {mainCategory === 'browsers' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-teal-950/70 border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-300 shrink-0" />
                  <h4 className="font-extrabold text-white text-xs sm:text-sm">
                    Dhammaan Biraawsarrada Caalamka (Universal Browser Support)
                  </h4>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
                  Universal ✓
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                App-ka Tuko waxaa loogu talagalay inuu si degdeg ah oo toos ah ugu shaqeeyo biraawsar kasta oo taleefan ama kombiyuutar lagu isticmaalo.
              </p>

              {/* Supported Browsers Grid */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 pb-1">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🌐</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Chrome</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🍏</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Safari</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🦊</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Firefox</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🌊</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Edge</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🦁</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Brave</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🔴</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Opera</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">🦆</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">DuckDuckGo</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                  <span className="text-base block mb-0.5">⚡</span>
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Any Browser</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={activeTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Toos u Fur Browser-ka</span>
                </a>

                <button
                  onClick={handleShareLink}
                  className="py-3 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Wadaag Link-ga</span>
                </button>
              </div>

              {/* Universal 3-Step Guide */}
              <div className="space-y-1.5 pt-1.5 border-t border-indigo-500/20">
                <h4 className="font-black text-white text-xs">Tilmaamaha Guud ee Biraawsar Kasta:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-medium leading-relaxed text-[11px]">
                  <li>
                    <strong className="text-white">Fur Biraawsarkaaga:</strong> Fur biraawsar kasta oo aad ku shubatey (Chrome, Safari, Firefox, Edge, Opera, Brave, iwm.).
                  </li>
                  <li>
                    <strong className="text-white">Menu-ga Dooro:</strong> Biraawsarkaaga xagga sare ama hoose ka hel Menu-ga <strong>(⋮ saddexda dhibcood, ama ☰ saddexda xariiq, ama [↑] calaamadda Share-ka)</strong>.
                  </li>
                  <li>
                    <strong className="text-white">Ku Dar Shaashadda:</strong> Guji <strong>"Add to Home Screen"</strong>, <strong>"Install App"</strong>, ama <strong>"Create Shortcut"</strong> si uu si toos ah ugu shaqeeyo shaashaddaada!
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: QAYBTA PC / DESKTOP (Windows & Mac Desktop App)
           ═══════════════════════════════════════════════════════════ */}
        {mainCategory === 'pc' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="space-y-3 text-xs bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-cyan-500/30 animate-in fade-in">
              <div className="font-extrabold text-cyan-200 uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>Kombiyuutarkaaga ku Shubo (PC Desktop App):</span>
                </span>
                <span className="text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  Windows &amp; Mac ✓
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                App-ka Tuko waxaa si buuxda loogu shuban karaa kombiyuutarkaaga (Windows, MacOS, Chromebook, Linux) isagoo furmaya sida Desktop Application madax-bannaan.
              </p>

              {/* 1-Click Install Button for Desktop Chrome/Edge */}
              {isInstallable && !isInstalled ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-cyan-950/60 transition flex items-center justify-center gap-2 active:scale-95 animate-pulse cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Ku Shubo PC Desktop (1-Click Install Now)</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-teal-950/50 border border-teal-500/30 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-teal-200 font-medium">
                    App-kan waxaa toos loogu rakiban karaa Google Chrome ama Microsoft Edge ee kombiyuutarkaaga.
                  </span>
                </div>
              )}

              {/* Action Buttons for PC */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={activeTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Toos ugu Fur Daaqad Cusub</span>
                </a>

                <button
                  onClick={handleShareLink}
                  className="py-3 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Wadaag PC Link</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
                <p className="font-bold text-white text-xs">
                  Sida Chrome ama Edge loogu rakibo:
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ka eeg xagga sare ee browser-kaaga, meesha link-gu ku qoran yahay dhinaceeda midig:
                  Guji astaanta kombiyuutarka (<strong>Install Tuko</strong>) ama Menu <strong>(⋮)</strong> ➔ <strong>"Save and share"</strong> ➔ <strong>"Install Tuko..."</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: SAAR ONLINE (Hosting & Custom Domain Guide)
           ═══════════════════════════════════════════════════════════ */}
        {mainCategory === 'online' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/80 border border-emerald-500/40 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-black text-white text-sm">
                      Sida Website-ka loogu saaro Online (Hosting &amp; Domain)
                    </h4>
                    <p className="text-[10px] text-emerald-300">
                      Tallaabooyinka lagu helo link rasmi ah oo adduunka oo dhan laga galo
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                  Hagaha Rasmiga ah
                </span>
              </div>

              {/* Why 404 Happens Note */}
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-amber-200 font-bold text-xs block">Maxaa keenay Error 404 marka dibedda laga soo galo?</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Link-yada preview-ga ee AI Studio Build (sida <code className="text-amber-300 font-mono text-[10px]">ais-pre-...</code>) waa ku meel-gaar waxayna u baahan yihiin developer session. Si qof kasta oo caalamka jooga uu u galo, waa in website-ka la saaro hosting rasmi ah ama lagu xiro domain gaar ah.
                  </p>
                </div>
              </div>

              {/* 3 Best Free Hosting Options */}
              <div className="space-y-2 pt-1">
                <h5 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>3-da Hab ee ugu fiican uguna fudud ee bilaashka ah (Deploy Free):</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option 1: Vercel */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-xs">1. Vercel</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Ugu Fudud</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Ku xir koontadaada GitHub, 1-Click ku daabac, waxaadna helaysaa link bilaash ah (tusaale: <code className="text-teal-300 font-mono text-[9px]">tuko.vercel.app</code>) iyo SSL bilaash ah.
                    </p>
                    <a
                      href="https://vercel.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-300 hover:text-teal-200 pt-0.5"
                    >
                      <span>vercel.com</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Option 2: Netlify */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-xs">2. Netlify</span>
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Degdeg ah</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Toos ugu soo tuur folder-ka <code className="text-cyan-300 font-mono text-[9px]">dist/</code> (Drag &amp; Drop), waxaadna helaysaa link bilaash ah (tusaale: <code className="text-cyan-300 font-mono text-[9px]">tuko.netlify.app</code>).
                    </p>
                    <a
                      href="https://netlify.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 pt-0.5"
                    >
                      <span>netlify.com</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Option 3: Firebase Hosting */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-xs">3. Firebase</span>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Google Cloud</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Maadaama app-kan uu horay ugu xiran yahay Firebase, waxaad toos ugu daabaci kartaa Firebase Hosting adigoo isticmaalaya <code className="text-amber-300 font-mono text-[9px]">firebase deploy</code>.
                    </p>
                    <a
                      href="https://firebase.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 pt-0.5"
                    >
                      <span>firebase.google.com</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Custom Domain Section */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-teal-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Sida loogu xiro Domain Gaar ah (.SO ama .COM):</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Marka aad app-ka ku daabacdo Vercel ama Netlify, waxaad si toos ah ugu xiri kartaa domain-ka aad leedahay (tusaale: <strong>tuko.so</strong> ama <strong>tukosalaad.com</strong>) adigoo CNAME ama A-Record ku daraya shirkadda aad domain-ka ka iibsatay.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Waa la Koobiyeeyay Link-ga!' : 'Koobiyee Link-ga Hadda'}</span>
                </button>

                <button
                  onClick={handleShareLink}
                  className="py-3 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>Wadaag Link-ga</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 5: POSTERS-KA RASMIGA AH EE APP-KA (MARKETING POSTERS)
           ═══════════════════════════════════════════════════════════ */}
        {mainCategory === 'poster' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-teal-950/60 border border-amber-400/40 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="font-black text-amber-200 text-sm">
                  Posters-ka Rasmiga ah ee Tuko (Download &amp; Share)
                </h4>
              </div>
              <p className="text-[11px] text-teal-200/90 leading-relaxed">
                Halkan toos uga degso sawirrada xayeysiiska ee tayadoodu sarreyso (8K) si aad ugu dhigto WhatsApp Status, TikTok, Facebook, ama Instagram!
              </p>
            </div>

            {/* Poster 1: WhatsApp Status / Story (9:16) */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white">
                    1. WhatsApp Status &amp; Stories (9:16 - Shaashad Buuxda)
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Status Diyaar ah
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-teal-500/30 max-h-[300px] flex items-center justify-center bg-black/60">
                <img
                  src="/posters/tuko_launch_poster_story.jpg"
                  alt="Tuko Launch Poster Story"
                  className="w-full h-auto max-h-[290px] object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="/posters/tuko_launch_poster_story.jpg"
                  download="tuko_launch_poster_story.jpg"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Soo Dejiso (9:16)</span>
                </a>

                <button
                  onClick={handleShareLink}
                  className="py-2.5 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>Wadaag Link-ga</span>
                </button>
              </div>
            </div>

            {/* Poster 2: Feed / Social Media Post (1:1) */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white">
                    2. Facebook, Instagram &amp; X Post (1:1 - Labajibbaaran)
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Feed Post
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-teal-500/30 max-h-[260px] flex items-center justify-center bg-black/60">
                <img
                  src="/posters/tuko_launch_poster_feed.jpg"
                  alt="Tuko Launch Poster Feed"
                  className="w-full h-auto max-h-[250px] object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="/posters/tuko_launch_poster_feed.jpg"
                  download="tuko_launch_poster_feed.jpg"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Soo Dejiso (1:1)</span>
                </a>

                <button
                  onClick={() => {
                    const text = `🌙 Bishaaro! Waxaa soo baxay App-ka Tuko (Dhawr-Salaad & Adkaar) 🕌✨\n\nApp-kan wuxuu kuu hayaa:\n✅ 5-ta Salaadood & Aadaanka Makkah/Madinah & 8 Shiiq oo caan ah\n✅ Adhkaarta Subaxda, Galabta & Hurdada\n✅ Jiheeyaha Qiblada tooska ah\n✅ Qur'aanka Kariimka oo buuxa\n✅ Jadwalka Soonka & Afurka\n\nToos ugu shubo taleefankaaga:\n🔗 ${activeTargetUrl}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(text);
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2500);
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Waa la qaatay' : 'Koobiyee Qoraalka'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            DIRECT LINK BAR (NO QR CODE - 100% RELIABLE)
           ═══════════════════════════════════════════════════════════ */}
        <div className="mt-3.5 p-3 rounded-2xl bg-slate-950/90 border border-teal-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-teal-300">
            <span className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Link-ga Tooska ah ee App-ka (Direct Web Link):</span>
            </span>
            <button
              onClick={() => setIsEditingCustomUrl(!isEditingCustomUrl)}
              className="text-[9px] text-teal-300 hover:text-white underline cursor-pointer"
            >
              {isEditingCustomUrl ? 'Xir Edit-ka' : 'Gali Domain Gaar ah'}
            </button>
          </div>

          {/* Custom URL Input if editing */}
          {isEditingCustomUrl && (
            <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
              <input
                type="text"
                placeholder="https://tuko.so ama https://your-domain.com"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-slate-900 border border-teal-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
              />
            </div>
          )}

          {/* Active URL Display & Copy */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="text"
              readOnly
              value={activeTargetUrl}
              className="flex-1 bg-slate-900/90 border border-teal-500/30 rounded-xl px-3 py-2 text-[11px] text-teal-200 select-all truncate font-mono"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-teal-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
              title="Koobiyee Linkiga"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300">Qaatay</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Koobiyee</span>
                </>
              )}
            </button>

            <a
              href={activeTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 transition active:scale-95 shrink-0 cursor-pointer"
              title="Tijaabi furitaanka link-ga daaqad cusub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Footer Close & Fast Reload Action */}
        <div className="flex items-center justify-between pt-3 gap-2 flex-wrap">
          <button
            onClick={handleRefreshPage}
            className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer"
            title="Cusbooneysii App-ka"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-300" />
            <span>Hubi Nooca Cusub</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 ml-auto cursor-pointer"
          >
            Waan Fahmay • Xir
          </button>
        </div>
      </div>
    </div>
  );
};
