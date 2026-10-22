import React from 'react';

interface TukoLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  spinning?: boolean;
}

export const TukoLogo: React.FC<TukoLogoProps> = ({
  className = 'w-10 h-10',
  size,
  showText = false,
  spinning = false,
}) => {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <div className={`flex items-center gap-2.5 ${showText ? '' : 'shrink-0'}`}>
      <div
        className={`relative ${className} shrink-0 ${
          spinning ? 'animate-[spin_1.05s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]' : ''
        }`}
        {...dimensionProps}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Gradient */}
            <linearGradient id="tukoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#042f2e" />
              <stop offset="50%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* Gold / Amber Glow Gradient */}
            <linearGradient id="tukoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Cyan Accent Gradient */}
            <linearGradient id="tukoCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Border Stroke Gradient */}
            <linearGradient id="tukoBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
            </linearGradient>

            <filter id="tukoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Outer Badge with Royal Gold Border */}
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            rx="26"
            fill="url(#tukoBgGrad)"
            stroke="url(#tukoGoldGrad)"
            strokeWidth="2.8"
          />

          {/* Subtle Ambient Dome Glow */}
          <circle cx="50" cy="52" r="32" fill="#14b8a6" fillOpacity="0.12" />

          {/* Golden Crescent Moon (Symbol of Prayer timing & New Moon) */}
          <path
            d="M 58 22 C 40 22 28 35 28 52 C 28 68 41 80 58 80 C 65 80 72 77 77 72 C 60 74 46 62 46 50 C 46 38 58 27 75 29 C 70 24 64 22 58 22 Z"
            fill="url(#tukoGoldGrad)"
            filter="url(#tukoGlow)"
          />

          {/* Stylized Mihrab / Mosque Dome representing "Tuko" (Prayer) */}
          <path
            d="M 42 76 L 42 56 C 42 46 50 38 58 38 C 66 38 74 46 74 56 L 74 76 Z"
            fill="#ffffff"
            fillOpacity="0.95"
          />

          {/* Mihrab Arch Inner Cutout */}
          <path
            d="M 47 76 L 47 60 C 47 52 52 46 58 46 C 64 46 69 52 69 60 L 69 76 Z"
            fill="#083344"
          />

          {/* 5 Rays / Star of Devotion (Representing 5 Daily Prayers & Light) */}
          <circle cx="58" cy="32" r="3.5" fill="url(#tukoGoldGrad)" />
          <path
            d="M 58 24 L 58 28 M 58 36 L 58 40 M 52 32 L 48 32 M 64 32 L 68 32"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Subtle Prayer Beads dot (Tasbih/Adkaar) arc at the base */}
          <circle cx="34" cy="74" r="2.2" fill="#2dd4bf" />
          <circle cx="28" cy="67" r="2" fill="#2dd4bf" fillOpacity="0.8" />
          <circle cx="25" cy="58" r="1.8" fill="#2dd4bf" fillOpacity="0.6" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              Tuko
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300">
              Dhawr
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
            Salaad &amp; Adkaar
          </span>
        </div>
      )}
    </div>
  );
};

interface TukoReloadOverlayProps {
  phase: 'spinning' | 'finishing' | 'hidden';
}

export const TukoReloadOverlay: React.FC<TukoReloadOverlayProps> = ({ phase }) => {
  if (phase === 'hidden') return null;

  const isFinishing = phase === 'finishing';

  return (
    <div
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#03221e]/95 backdrop-blur-md transition-all duration-300 select-none ${
        isFinishing ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative w-28 h-28 flex items-center justify-center mb-4">
        {/* Outer counter-rotating golden & teal ring */}
        <svg
          viewBox="0 0 120 120"
          className="absolute -inset-1.5 w-[124px] h-[124px] animate-[spin_1.6s_linear_infinite_reverse]"
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(45, 212, 191, 0.2)"
            strokeWidth="3.5"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="95 245"
          />
        </svg>

        {/* Spinning Tuko Logo */}
        <TukoLogo className="w-20 h-20 shadow-2xl" spinning={true} />
      </div>

      <h2 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
        Tuko – Dhawr-Salaad &amp; Adkaar
      </h2>
      <p className="mt-1 text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
        <span>{isFinishing ? '✓ Reload-kii wuu dhammaystirmay!' : 'Waa la soo cusboonaysiinayaa...'}</span>
      </p>
    </div>
  );
};

