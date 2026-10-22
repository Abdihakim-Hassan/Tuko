import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

// Standard React Native baseline dimensions (iPhone X / modern mobile baseline)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export type RNPlatformOS = 'ios' | 'android' | 'web';
export type RNBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type RNDeviceType = 'mobile' | 'tablet' | 'laptop';

export interface WindowDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isSmallPhone: boolean; // < 360px
  isMobile: boolean;     // < 768px
  isTablet: boolean;     // 768px - 1023px
  isDesktop: boolean;    // >= 1024px
  isLaptop: boolean;     // >= 1024px
  deviceType: RNDeviceType;
  containerClass: string;
  orientation: 'portrait' | 'landscape';
  breakpoint: RNBreakpoint;
  platform: RNPlatformOS;
  isStandalone: boolean;
}

function detectPlatformOS(): RNPlatformOS {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) {
    return 'android';
  }
  return 'web';
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  );
}

function getBreakpoint(width: number): RNBreakpoint {
  if (width < 360) return 'xs';
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  return 'xl';
}

function getDeviceType(width: number): RNDeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'laptop';
}

function getResponsiveContainerClass(deviceType: RNDeviceType): string {
  switch (deviceType) {
    case 'mobile':
      return 'w-full max-w-full px-3 sm:px-4 py-4 pb-24';
    case 'tablet':
      return 'w-full max-w-4xl mx-auto px-5 py-6 pb-24';
    case 'laptop':
      return 'w-full max-w-5xl xl:max-w-6xl mx-auto px-6 py-7 pb-24';
  }
}

function computeDimensions(): WindowDimensions {
  if (typeof window === 'undefined') {
    return {
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 1,
      isSmallPhone: false,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLaptop: false,
      deviceType: 'mobile',
      containerClass: getResponsiveContainerClass('mobile'),
      orientation: 'portrait',
      breakpoint: 'sm',
      platform: 'web',
      isStandalone: false,
    };
  }

  const width = Math.round(window.innerWidth || document.documentElement.clientWidth || 390);
  const height = Math.round(window.innerHeight || document.documentElement.clientHeight || 844);
  const dpr = window.devicePixelRatio || 1;

  // Fluid font scale for compact vs standard screens
  const fontScale = width < 350 ? 0.9 : width < 380 ? 0.95 : 1;
  const deviceType = getDeviceType(width);

  return {
    width,
    height,
    scale: dpr,
    fontScale,
    isSmallPhone: width < 360,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isLaptop: width >= 1024,
    deviceType,
    containerClass: getResponsiveContainerClass(deviceType),
    orientation: width > height ? 'landscape' : 'portrait',
    breakpoint: getBreakpoint(width),
    platform: detectPlatformOS(),
    isStandalone: detectStandalone(),
  };
}

/**
 * React Native Platform API equivalent
 */
export const Platform = {
  get OS(): RNPlatformOS {
    return detectPlatformOS();
  },
  get isIOS(): boolean {
    return detectPlatformOS() === 'ios';
  },
  get isAndroid(): boolean {
    return detectPlatformOS() === 'android';
  },
  get isWeb(): boolean {
    return detectPlatformOS() === 'web';
  },
  get isStandalone(): boolean {
    return detectStandalone();
  },
  select<T>(specifics: { ios?: T; android?: T; mobile?: T; tablet?: T; laptop?: T; web?: T; default: T }): T {
    const dims = computeDimensions();
    const os = dims.platform;
    if (dims.deviceType === 'tablet' && specifics.tablet !== undefined) return specifics.tablet;
    if (dims.deviceType === 'laptop' && specifics.laptop !== undefined) return specifics.laptop;
    if (dims.deviceType === 'mobile' && specifics.mobile !== undefined) return specifics.mobile;
    if (os === 'ios' && specifics.ios !== undefined) return specifics.ios;
    if (os === 'android' && specifics.android !== undefined) return specifics.android;
    if (os === 'web' && specifics.web !== undefined) return specifics.web;
    return specifics.default;
  },
};

/**
 * React Native PixelRatio API equivalent
 */
export const PixelRatio = {
  get(): number {
    return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2;
  },
  getFontScale(): number {
    return computeDimensions().fontScale;
  },
  getPixelSizeForLayoutSize(layoutSize: number): number {
    return Math.round(layoutSize * PixelRatio.get());
  },
  roundToNearestPixel(layoutSize: number): number {
    const ratio = PixelRatio.get();
    return Math.round(layoutSize * ratio) / ratio;
  },
};

/**
 * React Native responsive scaling helpers (react-native-size-matters standard)
 */
export function scale(size: number, currentWidth?: number): number {
  const w = currentWidth ?? (typeof window !== 'undefined' ? window.innerWidth : GUIDELINE_BASE_WIDTH);
  const clampedWidth = Math.min(Math.max(w, 320), 500);
  return PixelRatio.roundToNearestPixel((clampedWidth / GUIDELINE_BASE_WIDTH) * size);
}

export function verticalScale(size: number, currentHeight?: number): number {
  const h = currentHeight ?? (typeof window !== 'undefined' ? window.innerHeight : GUIDELINE_BASE_HEIGHT);
  const clampedHeight = Math.min(Math.max(h, 568), 960);
  return PixelRatio.roundToNearestPixel((clampedHeight / GUIDELINE_BASE_HEIGHT) * size);
}

export function moderateScale(size: number, factor = 0.5, currentWidth?: number): number {
  return PixelRatio.roundToNearestPixel(size + (scale(size, currentWidth) - size) * factor);
}

/**
 * React Native StyleSheet API equivalent
 */
export const StyleSheet = {
  create<T extends Record<string, React.CSSProperties>>(styles: T): T {
    return styles;
  },
  hairlineWidth: typeof window !== 'undefined' && window.devicePixelRatio >= 2 ? 0.5 : 1,
};

const RNResponsiveContext = createContext<WindowDimensions>(computeDimensions());

/**
 * React Native useWindowDimensions() hook
 */
export function useWindowDimensions(): WindowDimensions {
  return useContext(RNResponsiveContext);
}

/**
 * React Native SafeAreaView equivalent
 * Avoids overflow-x: hidden which traps vertical scrolling in mobile/tablet/iframe browsers.
 */
export const SafeAreaView: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const dims = useWindowDimensions();
  return (
    <div
      className={`rn-safe-area-root w-full min-h-dvh flex flex-col overflow-x-clip ${className}`}
      data-rn-os={dims.platform}
      data-rn-bp={dims.breakpoint}
      data-rn-device={dims.deviceType}
    >
      {children}
    </div>
  );
};

/**
 * React Native ScrollView with smooth Up/Down vertical scrolling across Mobile, Tablet, and Laptop.
 * Includes auto-scroll-to-top on tab switch and responsive container sizing.
 */
export const RNScrollView: React.FC<{
  children: React.ReactNode;
  activeTabKey?: string;
  className?: string;
  contentContainerClassName?: string;
}> = ({
  children,
  activeTabKey,
  className = '',
  contentContainerClassName = '',
}) => {
  const dims = useWindowDimensions();

  // Scroll to top smoothly when switching main tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTabKey]);

  return (
    <div
      className={`rn-scroll-view flex-1 w-full relative z-10 ${className}`}
      data-rn-device={dims.deviceType}
    >
      <main className={`${dims.containerClass} ${contentContainerClassName}`}>
        {children}
      </main>
    </div>
  );
};

/**
 * Global React Native Responsive Provider
 * Synchronizes viewport dimensions, CSS custom variables, and safe-area attributes
 * so all screens and components adapt seamlessly across Mobile, Tablet, and Laptop/Desktop
 * without ever blocking vertical scrolling.
 */
export const ReactNativeResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dims, setDims] = useState<WindowDimensions>(() => computeDimensions());

  useEffect(() => {
    let rafId: number | null = null;

    // Ensure vertical scroll is never locked by stale overflow styles
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'clip';
    document.body.style.overflowY = 'visible';
    document.body.style.overflowX = 'clip';

    const syncViewportVariables = () => {
      const next = computeDimensions();
      setDims((prev) => {
        // Ignore tiny mobile URL-bar height shifts (< 120px) when width hasn't changed,
        // preventing unnecessary re-renders during vertical touch scrolling.
        const widthChanged = prev.width !== next.width;
        const significantHeightChange = Math.abs(prev.height - next.height) > 120;
        if (
          !widthChanged &&
          !significantHeightChange &&
          prev.breakpoint === next.breakpoint &&
          prev.deviceType === next.deviceType &&
          prev.orientation === next.orientation
        ) {
          return prev;
        }
        return next;
      });

      const root = document.documentElement;
      root.style.setProperty('--rn-vw', `${next.width}px`);
      root.style.setProperty('--rn-vh', `${next.height}px`);
      root.style.setProperty('--rn-font-scale', String(next.fontScale));
      root.dataset.rnBreakpoint = next.breakpoint;
      root.dataset.rnDevice = next.deviceType;
      root.dataset.rnPlatform = next.platform;
      root.dataset.rnOrientation = next.orientation;
    };

    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncViewportVariables);
    };

    syncViewportVariables();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const contextValue = useMemo(() => dims, [dims]);

  return (
    <RNResponsiveContext.Provider value={contextValue}>
      <SafeAreaView>{children}</SafeAreaView>
    </RNResponsiveContext.Provider>
  );
};

