import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Navigation,
  MapPin,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  LocateFixed,
} from 'lucide-react';
import { AppSettings } from '../types';
import { calculateQiblaDirection, calculateDistanceToKaaba } from '../utils/qibla';

interface QiblaViewProps {
  settings: AppSettings;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ settings }) => {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [hasCompassSupport, setHasCompassSupport] = useState<boolean>(true);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>(settings.cityName);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);

  const activeLat = customCoords ? customCoords.lat : settings.lat;
  const activeLon = customCoords ? customCoords.lon : settings.lon;

  const qiblaAngle = calculateQiblaDirection(activeLat, activeLon);
  const distanceToKaaba = calculateDistanceToKaaba(activeLat, activeLon);

  // Angle difference between current device orientation and Qibla
  // If heading is 0 (North), and Qibla is 350, needle should point to 350 - heading
  const relativeAngle = deviceHeading !== null ? (qiblaAngle - deviceHeading + 360) % 360 : qiblaAngle;

  // Is phone pointed directly at Qibla (within +/- 5 degrees)?
  const isAligned = deviceHeading !== null && Math.abs((relativeAngle > 180 ? relativeAngle - 360 : relativeAngle)) <= 5;

  const hasVibratedRef = useRef(false);

  useEffect(() => {
    if (isAligned && !hasVibratedRef.current) {
      hasVibratedRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } else if (!isAligned) {
      hasVibratedRef.current = false;
    }
  }, [isAligned]);

  // Request Device Orientation
  const handleRequestCompass = async () => {
    setPermissionRequested(true);
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error - iOS specific API
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        // @ts-expect-error - iOS specific API
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          startCompassListener();
        } else {
          setHasCompassSupport(false);
        }
      } catch (err) {
        console.error('Permission error:', err);
        setHasCompassSupport(false);
      }
    } else {
      startCompassListener();
    }
  };

  const startCompassListener = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS compass
      // @ts-expect-error - webkitCompassHeading is iOS specific
      if (e.webkitCompassHeading != null) {
        // @ts-expect-error - webkitCompassHeading is iOS specific
        heading = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        // Standard Android/Web
        heading = 360 - e.alpha;
      }

      if (heading != null && !isNaN(heading)) {
        setDeviceHeading(Math.round(heading));
        setHasCompassSupport(true);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  };

  useEffect(() => {
    startCompassListener();
  }, []);

  // Request exact GPS from browser
  const handleGetExactGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Qalabkaagu ma taageerayo GPS-ka.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationName('Goobtaada Tooska ah (GPS)');
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsError('Lama heli karin goobtaada GPS-ka. Waxaa loo adeegsanayaa magaalada.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2633] via-[#092e3c] to-[#061d27] border border-teal-500/25 shadow-xl text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-500/10 border border-teal-400/20 text-teal-300 mb-2">
          <Compass className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Jiheeyaha Qiblada (Qibla Compass)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
          Tilmaamaha tooska ah ee jihada Kacbada Al-Musharrafah (Makkah)
        </p>

        {/* Current Location Badge */}
        <div className="flex items-center justify-center gap-2 mt-3.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-400/30 text-teal-200 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>{locationName}</span>
          </span>

          <button
            onClick={handleGetExactGps}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
            <span>{gpsLoading ? 'Baaraya GPS...' : 'Adeegso GPS-kaaga'}</span>
          </button>
        </div>

        {gpsError && (
          <p className="text-[11px] text-amber-300 mt-2 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{gpsError}</span>
          </p>
        )}
      </div>

      {/* Main Interactive Compass Display */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0b222c] to-[#07171e] border border-teal-500/30 shadow-2xl flex flex-col items-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
            isAligned
              ? 'bg-emerald-500/25 scale-110'
              : 'bg-cyan-500/10'
          }`}
        />

        {/* Alignment Status Banner */}
        <div
          className={`mb-6 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            isAligned
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-950/50 scale-105'
              : 'bg-slate-900/80 border-teal-500/20 text-slate-300'
          }`}
        >
          {isAligned ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Toos ayaad ugu jeeddaa Qiblada! (Alxamdullillaah)</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>
                {deviceHeading !== null
                  ? 'Qalabka wareeji si falladhu u toosto Kacbada'
                  : `Jihada Qiblada: ${qiblaAngle}°`}
              </span>
            </>
          )}
        </div>

        {/* Circular Compass Visual */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          {/* Outer dial / Ring */}
          <div
            className={`absolute inset-0 rounded-full border-4 transition-all duration-300 ${
              isAligned
                ? 'border-emerald-400 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                : 'border-teal-500/30 shadow-xl'
            } bg-gradient-to-b from-[#0b2b36]/60 to-[#071c24]/90`}
          >
            {/* Cardinal Direction Marks */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-black text-rose-400">
              N
            </span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-black text-slate-400">
              S
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
              E
            </span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
              W
            </span>

            {/* Inner Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <div
                key={deg}
                className="absolute w-full h-full flex justify-center items-start pt-1 pointer-events-none"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <div className={`w-0.5 ${deg % 90 === 0 ? 'h-3 bg-teal-300/60' : 'h-1.5 bg-slate-600'}`} />
              </div>
            ))}
          </div>

          {/* Rotating Qibla Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out pointer-events-none"
            style={{ transform: `rotate(${relativeAngle}deg)` }}
          >
            {/* Arrow Pointer to Kaaba */}
            <div className="absolute top-5 flex flex-col items-center">
              <div
                className={`p-2 rounded-full border shadow-lg transition-transform ${
                  isAligned
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-125 animate-bounce'
                    : 'bg-gradient-to-b from-teal-400 to-cyan-500 text-slate-950 border-white'
                }`}
              >
                <span className="text-sm font-black">🕋</span>
              </div>
              <div className="w-1.5 h-16 bg-gradient-to-b from-teal-400 via-emerald-400 to-transparent rounded-full mt-1" />
            </div>

            {/* Tail needle pointing South */}
            <div className="absolute bottom-6 flex flex-col items-center">
              <div className="w-1 h-12 bg-slate-600/40 rounded-full" />
            </div>
          </div>

          {/* Center Hub */}
          <div className="relative z-10 w-16 h-16 rounded-full bg-slate-950 border-2 border-teal-400/50 flex flex-col items-center justify-center shadow-lg">
            <span className="text-xs font-extrabold text-teal-300 font-mono">
              {qiblaAngle}°
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">
              Qibla
            </span>
          </div>
        </div>

        {/* Degree & Distance Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-5 border-t border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-teal-500/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Xagasha Qiblada (Bearing)
            </span>
            <span className="text-lg sm:text-xl font-black text-cyan-300 font-mono">
              {qiblaAngle}° Waqooyi-Galbeed
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-teal-500/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Masaafada Kacbada
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
              {distanceToKaaba.toLocaleString()} km
            </span>
          </div>
        </div>

        {/* iOS Compass Permission Request Button if not granted */}
        {deviceHeading === null && !permissionRequested && (
          <button
            onClick={handleRequestCompass}
            className="mt-5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 active:scale-95 flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Furo Dhaqdhaqaaqa Jiheeyaha (Enable Compass)</span>
          </button>
        )}
      </div>

      {/* Guide Note */}
      <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/20 text-xs text-slate-300 space-y-1 leading-relaxed">
        <div className="font-bold text-teal-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sida saxda ah ee loo adeegsado Jiheeyaha:</span>
        </div>
        <p>
          1. Dhig taleefankaaga meel siman (sida miiska ama sagxadda) adigoo ka fogeynaya biraha iyo magnet-ka.
        </p>
        <p>
          2. Wareeji taleefanka ilaa sumadda Kacbada 🕋 ay toos uga soo ifbaxdo xagga sare oo cagaar noqoto.
        </p>
      </div>
    </div>
  );
};
