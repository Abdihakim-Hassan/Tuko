import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle2,
  X,
  Sparkles,
  Smartphone,
  Play,
  Square,
  Clock,
  Sliders,
  Check,
  Radio,
} from 'lucide-react';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  audioAlerts,
  isNotificationGranted,
} from '../utils/audioAlerts';
import { TukoLogo } from './TukoLogo';
import { PrayerName, AppSettings, AdhanVoice } from '../types';
import { PRAYER_SOMALI_LABELS, formatTime12 } from '../utils/prayerTimes';

interface NotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  prayerTimes?: Record<PrayerName, number>;
  settings?: AppSettings;
  onUpdateVoice?: (voice: AdhanVoice) => void;
  onOpenOverlay?: (prayer: PrayerName) => void;
}

interface SheikhOption {
  id: AdhanVoice;
  name: string;
  location: string;
  badge: string;
  icon: string;
  description: string;
  isFajrOnly?: boolean;
}

const SHEIKHS_LIST: SheikhOption[] = [
  {
    id: 'makkah',
    name: 'Sheikh Cali Axmed Mulla (Ali Mulla)',
    location: 'Masjid al-Haram, Makkah',
    badge: 'Makkah',
    icon: '🕋',
    description: 'Mu’adinka caanka ah ee Masjid al-Haram ee loo yaqaan "Bilaalka Xaramka".',
  },
  {
    id: 'madinah',
    name: 'Aadaanka Madiina Al-Munawwarah',
    location: 'Masjid an-Nabawi, Madinah',
    badge: 'Madinah',
    icon: '🕌',
    description: 'Codka macaan ee deggan ee Masjidka Rasuulka ﷺ ee Madiina.',
  },
  {
    id: 'afasy',
    name: 'Sheikh Mishari Rashiid Al-Cafaasi',
    location: 'Kuwait',
    badge: 'Al-Afasy',
    icon: '🇰🇼',
    description: 'Codka khushuuca iyo qalbi-dejinta badan ee Sh. Mishari Al-Afasy.',
  },
  {
    id: 'abdulbasit',
    name: 'Sheikh Cabdulbaasit Cabdussamad',
    location: 'Masar (Egypt)',
    badge: 'Abdulbasit',
    icon: '🇪🇬',
    description: 'Aadaanka qadiimiga ah ee caalamka caanka ka noqday ee Sh. Abdulbasit.',
  },
  {
    id: 'zahrani',
    name: 'Sheikh Mansoor Az-Zahrani',
    location: 'Riyadh / Sacuudiga',
    badge: 'Zahrani',
    icon: '🇸🇦',
    description: 'Aadaan qiiro badan oo aad u sarreeya oo qalbiga taabanaya.',
  },
  {
    id: 'qatami',
    name: 'Sheikh Naasir Al-Qataami',
    location: 'Sacuudi Carabiya',
    badge: 'Al-Qatami',
    icon: '🇸🇦',
    description: 'Codka quruxda badan ee Sh. Nasser Al-Qatami.',
  },
  {
    id: 'minshawi',
    name: 'Sheikh Maxamed Sidiiq Al-Minshaawi',
    location: 'Masar (Egypt)',
    badge: 'Al-Minshawi',
    icon: '🇪🇬',
    description: 'Aadaanka taariikhiga ah ee qari’a weyn ee Maxamed Sidiiq Al-Minshaawi.',
  },
  {
    id: 'fajr',
    name: 'Aadaanka Fajr ee Subaxa',
    location: 'Makkah Al-Mukarramah',
    badge: 'Fajr',
    icon: '🌅',
    description: 'Aadaanka subaxeedka oo wata: "As-salaatu khayrum-minan-nawm".',
    isFajrOnly: true,
  },
];

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
  prayerTimes,
  settings,
  onUpdateVoice,
  onOpenOverlay,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'schedule' | 'permissions'>('player');
  const [selectedVoice, setSelectedVoice] = useState<AdhanVoice>(() => {
    return settings?.adhanVoice || 'makkah';
  });
  const [playingVoice, setPlayingVoice] = useState<AdhanVoice | null>(null);
  const [volume, setVolume] = useState<number>(100);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Pre-warm audio and preload voices into browser cache on mount
  useEffect(() => {
    if (isOpen) {
      audioAlerts.preloadVoices();
    }
  }, [isOpen]);

  useEffect(() => {
    audioAlerts.setVolume(volume / 100);
  }, [volume]);

  // Stop audio on close or unmount
  useEffect(() => {
    if (!isOpen) {
      audioAlerts.stopAdhan();
      setPlayingVoice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAlreadyGranted = isNotificationGranted();

  // Handle requesting notification permission from browser
  const handleEnableNotifications = async () => {
    setIsProcessing(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setStatusMessage('✓ Ogaysiisyada Aadaanka si guul leh ayaa loo furay!');
        sendBrowserNotification(
          'Tuko',
          '🕌 Aadaanka Waa Diyaar! Alxamdulillaah, waxaad hadda heli doontaa Aadaanka dhabta ah ee Shiiqyada kala duwan marka waqtigu galo.'
        );

        if (onPermissionGranted) onPermissionGranted();
        setTimeout(() => {
          setStatusMessage(null);
        }, 3000);
      } else {
        setStatusMessage(
          'Fadlan geli dejinta browser-kaaga oo ogolow "Notifications" si aadaanku kuugu soo dhaco.'
        );
      }
    } catch {
      setStatusMessage('Khalad ayaa dhacay marka ogaysiiska la furayay.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Instant Sheikh Playback Trigger
  const handleToggleSheikhPlayback = (voice: AdhanVoice) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25]);
      }
    } catch {}

    if (playingVoice === voice) {
      audioAlerts.stopAdhan();
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voice);
      setSelectedVoice(voice);
      if (onUpdateVoice) {
        onUpdateVoice(voice);
      }

      const isFajr = voice === 'fajr';
      audioAlerts.playAdhan(
        isFajr,
        () => {
          setPlayingVoice(null);
        },
        voice
      );
    }
  };

  const handleSelectDefaultVoice = (e: React.MouseEvent, voice: AdhanVoice) => {
    e.stopPropagation();
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([35]);
      }
    } catch {}

    setSelectedVoice(voice);
    if (onUpdateVoice) {
      onUpdateVoice(voice);
    }
    setStatusMessage(`✓ Waxaad doiratay: ${SHEIKHS_LIST.find((s) => s.id === voice)?.name}`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleModalClose = () => {
    audioAlerts.stopAdhan();
    setPlayingVoice(null);
    onClose();
  };

  const currentPlayingSheikh = SHEIKHS_LIST.find((s) => s.id === playingVoice);
  const prayersList: PrayerName[] = ['Fajr', 'Duhur', 'Casar', 'Maqrib', 'Cishe'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-br from-[#061c22] via-[#04151a] to-[#020b0e] border-2 border-teal-500/40 shadow-2xl p-4 sm:p-6 text-white space-y-3 overflow-y-auto overscroll-contain">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition z-10 cursor-pointer"
          title="Xir"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="relative shrink-0">
            <TukoLogo className="w-11 h-11 sm:w-12 sm:h-12 drop-shadow-md" />
            <span className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 rounded-full bg-amber-500 text-slate-950">
              <BellRing className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-bounce" />
            </span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="truncate">Aadaanka Shiiqyada Kala Duwan</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              Aadaanka &amp; Codadka Shiiqyada
            </h3>
          </div>
        </div>

        {/* Status Pill Indicator */}
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-950/70 border border-teal-500/25">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isAlreadyGranted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-xs font-bold text-slate-200 truncate">
              {isAlreadyGranted
                ? 'Ogaysiisyada Aadaanku Way Furan Yihiin (Active)'
                : 'Ogaysiisyadu Waa Xiran Yihiin (Lama Furo)'}
            </span>
          </div>

          {!isAlreadyGranted && (
            <button
              onClick={handleEnableNotifications}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black transition cursor-pointer shrink-0"
            >
              {isProcessing ? 'Furaya...' : 'Furo Hadda'}
            </button>
          )}
        </div>

        {/* Adhaan Control Tabs: [ Shiiqyada & Player ] | [ 5-ta Salaadood ] | [ Dejinta & Device ] */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950/70 border border-teal-500/20 text-xs font-bold">
          <button
            onClick={() => setActiveTab('player')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'player'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] truncate">Shiiqyada</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] truncate">5-ta Salaad</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'permissions'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] truncate">Taleefanka</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: SHIIQYADA & CODADKA AADAANKA (INSTANT PLAY!)
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'player' && (
          <div className="space-y-2.5 text-xs bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-teal-500/25 animate-in fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-teal-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Taabo Shiiq kasta si uu isla markiiba u yeero:</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                8 Shiiq ✓
              </span>
            </div>

            {/* Currently Playing Bar (Sticky Player Feedback) */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                playingVoice
                  ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-400/60 shadow-lg'
                  : 'bg-slate-950/70 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`p-1.5 rounded-lg ${
                    playingVoice ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-white/10 text-teal-300'
                  }`}
                >
                  {playingVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">
                    {currentPlayingSheikh ? currentPlayingSheikh.name : 'Dooro Shiiq aad dhagaysato'}
                  </p>
                  <p className="text-[10px] text-teal-300/80 truncate">
                    {playingVoice ? 'Hadda wuu yeerayaa (Playing)...' : 'Guji mid kasta si uu markiiba u shaqeeyo'}
                  </p>
                </div>
              </div>

              {playingVoice && (
                <button
                  onClick={() => {
                    audioAlerts.stopAdhan();
                    setPlayingVoice(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-black text-[11px] flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Jooji</span>
                </button>
              )}
            </div>

            {/* Volume Controller Card */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-teal-500/20 flex items-center gap-3">
              <Volume2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="text-[10px] font-bold text-slate-300 shrink-0">Codka:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="font-mono text-xs font-bold text-teal-300 w-8 text-right">{volume}%</span>
            </div>

            {/* List of 8 Famous Sheikhs (ENTIRE CARD IS CLICKABLE!) */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {SHEIKHS_LIST.map((sheikh) => {
                const isSelected = selectedVoice === sheikh.id;
                const isPlaying = playingVoice === sheikh.id;

                return (
                  <div
                    key={sheikh.id}
                    onClick={() => handleToggleSheikhPlayback(sheikh.id)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.98] select-none touch-manipulation ${
                      isPlaying
                        ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-400 shadow-lg shadow-teal-500/20 ring-2 ring-emerald-400/40'
                        : isSelected
                        ? 'bg-gradient-to-r from-teal-950/60 to-slate-950/80 border-teal-500/50'
                        : 'bg-slate-950/50 border-white/5 hover:border-teal-500/30 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-2xl shrink-0 p-1 rounded-xl bg-white/5 border border-white/10">
                        {sheikh.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-black text-xs sm:text-[13px] truncate ${isPlaying ? 'text-emerald-300' : 'text-white'}`}>
                            {sheikh.name}
                          </p>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                            {sheikh.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-teal-200/80 truncate mt-0.5">
                          {sheikh.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Equalizer Playing Indicator / Play Icon */}
                      <span
                        className={`p-2 rounded-xl text-xs font-black transition flex items-center justify-center ${
                          isPlaying
                            ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                        }`}
                      >
                        {isPlaying ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </span>

                      {/* Select Button */}
                      <button
                        type="button"
                        onClick={(e) => handleSelectDefaultVoice(e, sheikh.id)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
                        }`}
                        title="Ka dhig aadaankaaga rasmiga ah"
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Xulan</span>
                          </>
                        ) : (
                          <span>Dooro</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test Full Screen Overlay Button */}
            {onOpenOverlay && (
              <button
                onClick={() => {
                  handleModalClose();
                  onOpenOverlay(selectedVoice === 'fajr' ? 'Fajr' : 'Maqrib');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-300" />
                <span>Tijaabi Shaashadda Buuxda ee Aadaanka (Overlay Preview)</span>
              </button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: 5-TA SALAADOOD & WAQTIYADA AADAANKA (INSTANT PLAY!)
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <div className="space-y-3 text-xs bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-teal-500/25 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-teal-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Aadaanka 5-ta Salaadood ee Maanta:</span>
              </span>
              <span className="text-[10px] text-teal-300 font-bold">
                {settings?.cityName || 'Soomaaliya'}
              </span>
            </div>

            <div className="space-y-2">
              {prayersList.map((prayer) => {
                const somaliName = PRAYER_SOMALI_LABELS[prayer];
                const decHour = prayerTimes ? prayerTimes[prayer] : null;
                const timeString = decHour != null ? formatTime12(decHour) : '--:--';
                const isFajr = prayer === 'Fajr';
                const sheikhVoiceForPrayer: AdhanVoice = isFajr ? 'fajr' : selectedVoice;
                const isPlaying = playingVoice === sheikhVoiceForPrayer;

                return (
                  <div
                    key={prayer}
                    onClick={() => handleToggleSheikhPlayback(sheikhVoiceForPrayer)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer active:scale-[0.98] ${
                      isPlaying
                        ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-950/60 border-white/5 hover:border-teal-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-black">
                        {isFajr ? '🌅' : '🕌'}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs ${isPlaying ? 'text-emerald-300' : 'text-white'}`}>
                          {somaliName} {isPlaying && '• Wuu Socdaa...'}
                        </p>
                        <p className="text-[10px] text-slate-400">Aadaanku wuxuu gelayaa: {timeString}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                        {timeString}
                      </span>
                      <span
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isPlaying
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-teal-500/20 text-teal-200'
                        }`}
                      >
                        {isPlaying ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: DEJINTA TELEFOONKA & BACKGROUND-KA
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'permissions' && (
          <div className="space-y-3.5 text-xs bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-teal-500/25 animate-in fade-in">
            <div className="font-extrabold text-teal-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sida Aadaanku ugu yeeri karo Markaad Baxdo:</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
                <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
                  🍏
                </span>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-[13px]">
                    Apple iPhone (iOS):
                  </h4>
                  <p className="text-cyan-200/80 text-[11px] leading-snug">
                    Taleefankaaga iPhone, ku dar shaashadda (Safari ➔ Share ➔ <strong>"Add to Home Screen"</strong>). Noocyada iOS 16.4+ waxay si buuxda u taageeraan ogaysiisyada tooska ah ee Aadaanka.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30">
                <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                  🔋
                </span>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-[13px]">
                    Ilaalinta Batariga (Taleefan Kasta):
                  </h4>
                  <p className="text-amber-200/80 text-[11px] leading-snug">
                    Geli Dejinta taleefankaaga (Settings ➔ Apps ➔ Tuko ama Browser-kaaga ➔ Battery ➔ Dooro <strong>"Unrestricted"</strong>). Tani waxay ka hor istaagaysaa inuu taleefanku seexiyo aadaanka marka shaashaddu xiranto.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                  🌐
                </span>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-[13px]">
                    Dhammaan Biraawsarrada (Any Browser):
                  </h4>
                  <p className="text-emerald-200/80 text-[11px] leading-snug">
                    Ogolow ogaysiisyada biraawsar kasta oo aad isticmaasho (Chrome, Safari, Firefox, Edge, Brave, Opera, iwm.). Marka waqtigu galo, xitaa haddii shaashaddu xiran tahay, waxaa kuugu soo dhacaya magaca salaadda iyo aadaanka tooska ah.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Message Toast */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-teal-950/90 border border-teal-400/50 text-[11px] sm:text-xs text-teal-200 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="leading-snug">{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons in Footer */}
        <div className="space-y-2 pt-1">
          {isAlreadyGranted ? (
            <div className="w-full py-2.5 sm:py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs sm:text-sm font-black flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ogaysiisyada Aadaanka Way Furan Yihiin (ON) ✓</span>
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={isProcessing}
              className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-teal-500/30 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <BellRing className="w-4 h-4 shrink-0" />
              <span>
                {isProcessing ? 'Fasaxaya...' : 'Furo Aadaanka & Ogaysiisyada Hadda'}
              </span>
            </button>
          )}

          <button
            onClick={handleModalClose}
            className="w-full py-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            Waan Fahmay • Xir
          </button>
        </div>
      </div>
    </div>
  );
};
