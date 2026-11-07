import React, { useState, useRef } from 'react';
import {
  Settings,
  MapPin,
  Compass,
  Download,
  Upload,
  Volume2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Radio,
  Smartphone,
  Bell,
  Play,
  Square,
  Sparkles,
  Clock,
  RotateCcw,
  Flame,
  Film,
  Globe,
  Crown,
} from 'lucide-react';
import { AppSettings, AdhanVoice, CustomPrayerSchedule, PrayerName } from '../types';
import { SOMALIA_CITIES, DEFAULT_USER_PRAYER_SCHEDULE } from '../utils/somaliaCities';
import { exportBackupData, importBackupData } from '../utils/storage';
import { sendBrowserNotification, audioAlerts } from '../utils/audioAlerts';
import { MobileInstallModal } from './MobileInstallModal';
import { CustomTimePickerModal } from './CustomTimePickerModal';
import { AppUpdateSection } from './AppUpdateSection';
import { User } from 'firebase/auth';
import { Cloud, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onDataImported: () => void;
  onResetAllData: () => void;
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
  onOpenVideoTour?: () => void;
  onOpenAdminDashboard?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDataImported,
  onResetAllData,
  currentUser,
  onOpenAuthModal,
  onOpenVideoTour,
  onOpenAdminDashboard,
}) => {
  const { language, setLanguage } = useLanguage();
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [customLat, setCustomLat] = useState(settings.lat.toString());
  const [customLon, setCustomLon] = useState(settings.lon.toString());
  const [importStatus, setImportStatus] = useState<string>('');
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [activeTimePickerSlot, setActiveTimePickerSlot] = useState<{
    prayerKey: string;
    field: 'adhan' | 'iqama';
    label: string;
    currentTime: string;
  } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAdhanPreview = (voice: AdhanVoice = settings.adhanVoice || 'makkah') => {
    if (isPlayingAdhan) {
      audioAlerts.stopAdhan();
      setIsPlayingAdhan(false);
      return;
    }

    setIsPlayingAdhan(true);
    audioAlerts.playAdhan(voice === 'fajr', () => setIsPlayingAdhan(false), voice);
  };

  const handleRequestNotification = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          onUpdateSettings({ notificationsEnabled: true });
          sendBrowserNotification('Tuko', 'Ogeysiisyada salaadda si guul leh ayaa loo furay!');
          setNotificationMsg('✓ Ogeysiisyada browser-ka si guul leh ayaa loo furay!');
        } else {
          setNotificationMsg('Ogeysiisyada browser-ka lama oggolaan. Fadlan settings-ka browser-ka ka fur.');
        }
      } catch {
        setNotificationMsg('Khalad ayaa dhacay xilligii fasaxa ogeysiisyada.');
      }
    } else {
      setNotificationMsg('Browser-kani ma taageero Web Notifications.');
    }
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleCityChange = (cityId: string) => {
    const selected = SOMALIA_CITIES.find((c) => c.id === cityId);
    if (selected) {
      onUpdateSettings({
        cityId: selected.id,
        cityName: `${selected.name} (${selected.region})`,
        lat: selected.lat,
        lon: selected.lon,
        useCustomSchedule: false,
      });
      setCustomLat(selected.lat.toString());
      setCustomLon(selected.lon.toString());
    }
  };

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setGpsStatus('❌ Browser-kan ma taageero helitaanka GPS-ka.');
      return;
    }
    setGpsStatus('⏳ Waa la raadinayaa location-kaaga...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));

        onUpdateSettings({
          cityId: 'custom_gps',
          cityName: `GPS: ${lat}, ${lon}`,
          lat,
          lon,
          useCustomSchedule: false,
        });
        setCustomLat(lat.toString());
        setCustomLon(lon.toString());
        setGpsStatus('✅ Location-kaaga si toos ah ayaa loo helay oo loo qaatay!');
      },
      (err) => {
        setGpsStatus(`❌ Lama helin: ${err.message}`);
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const handleManualCoordsSave = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      alert('Fadlan geli lambarro sax ah oo Latitude (-90 ilaa 90) iyo Longitude (-180 ilaa 180) ah.');
      return;
    }
    onUpdateSettings({
      cityId: 'custom_manual',
      cityName: `Gacanta: ${lat}, ${lon}`,
      lat,
      lon,
      useCustomSchedule: false,
    });
    alert('✅ Isku-duwayaasha cusub waa la keydiyay!');
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salaadaha-soomaali-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupData(content);
      if (success) {
        setImportStatus('✅ Xogtii hore si guul leh ayaa loo soo celiyay!');
        onDataImported();
      } else {
        setImportStatus('❌ Faylka ma saxna ama waa xumaaday.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* 1. Compact Mobile Settings Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-300 shrink-0" />
          <h2 className="text-lg font-black text-white tracking-tight">
            Dejinta App-ka
          </h2>
        </div>

        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-xs hover:brightness-110 shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{currentUser && !currentUser.isAnonymous ? 'Koontada ✓' : 'Gal / Cloud'}</span>
          </button>
        )}
      </div>

      {/* 2. Quick Preferences Card: Language, Gender Mode & Streak Offset */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0c2834] via-[#09222c] to-[#061820] border border-teal-500/25 shadow-xl space-y-3.5">
        {/* Row A: App Language */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10" data-no-translate="true">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-white">Luqadda App-ka</span>
          </div>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-teal-500/30">
            <button
              type="button"
              onClick={() => {
                setLanguage('so');
                onUpdateSettings({ language: 'so' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                language === 'so'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇸🇴 Soomaali
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                onUpdateSettings({ language: 'en' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                language === 'en'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Row B: Gender Mode (Wiil / Gabar) */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-base">🕌</span>
            <span className="text-xs sm:text-sm font-extrabold text-white">Qaybta Cibaadada</span>
          </div>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-teal-500/30">
            <button
              type="button"
              onClick={() => onUpdateSettings({ gender: 'male' })}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                (settings.gender || 'male') === 'male'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🕌 Wiil
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ gender: 'female' })}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                settings.gender === 'female'
                  ? 'bg-pink-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌸 Gabar
            </button>
          </div>
        </div>

        {/* Row C: Starting Streak Offset */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-white">Bilowga Streak-ga</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="3650"
              value={settings.startingStreakOffset ?? 0}
              onChange={(e) =>
                onUpdateSettings({
                  startingStreakOffset: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-20 bg-slate-950 border border-teal-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold text-center focus:ring-1 focus:ring-teal-400"
            />
            <span className="text-xs text-teal-300 font-bold">Maalmood</span>
          </div>
        </div>

        {/* Row D: App Theme (Emerald / OLED Black / Makkah Gold) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <span className="text-xs sm:text-sm font-extrabold text-white">Muuqaalka App-ka (Theme)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-teal-500/30">
            {[
              { id: 'emerald', label: '🌲 Emerald' },
              { id: 'oled', label: '🌑 OLED Madow' },
              { id: 'gold', label: '✨ Dahabi' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onUpdateSettings({ appTheme: th.id as AppSettings['appTheme'] })}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  (settings.appTheme || 'emerald') === th.id
                    ? th.id === 'gold'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : th.id === 'oled'
                      ? 'bg-slate-200 text-slate-950 shadow'
                      : 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row E: Arabic Font Scale */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-arabic text-amber-300">ع</span>
            <span className="text-xs sm:text-sm font-extrabold text-white">Farta Carabiga</span>
          </div>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-teal-500/30">
            {[
              { id: 'normal', label: 'Caadi' },
              { id: 'large', label: 'A+ Weyn' },
              { id: 'xlarge', label: 'A++ Aad u Weyn' },
            ].map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => onUpdateSettings({ arabicFontScale: sz.id as AppSettings['arabicFontScale'] })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  (settings.arabicFontScale || 'normal') === sz.id
                    ? 'bg-teal-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Compact Location & Calculation Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/20 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="font-extrabold text-sm text-white">Magaalada &amp; Goobtaada</h3>
          </div>
          <button
            type="button"
            onClick={handleGpsDetect}
            className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-black text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>Hel GPS 📍</span>
          </button>
        </div>

        {gpsStatus && (
          <div className="text-xs font-semibold text-teal-300">{gpsStatus}</div>
        )}

        <select
          value={settings.cityId}
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          {SOMALIA_CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.region}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-bold uppercase text-teal-300 mb-1">
              Habka Xisaabinta
            </label>
            <select
              value={settings.method}
              onChange={(e) =>
                onUpdateSettings({
                  method: e.target.value as AppSettings['method'],
                })
              }
              className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-2.5 py-2 text-xs text-white"
            >
              <option value="MWL">MWL (Soomaaliya)</option>
              <option value="UMQ">Umm Al-Qura (Makkah)</option>
              <option value="EGY">Egyptian Authority</option>
              <option value="KAR">Karachi</option>
              <option value="ISNA">ISNA</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-teal-300 mb-1">
              Mad-habka Casarka
            </label>
            <select
              value={settings.asrMethod}
              onChange={(e) =>
                onUpdateSettings({
                  asrMethod: Number(e.target.value) as 1 | 2,
                })
              }
              className="w-full bg-slate-900 border border-teal-500/30 rounded-xl px-2.5 py-2 text-xs text-white"
            >
              <option value={1}>Shaafi&apos;i (Standard)</option>
              <option value={2}>Xanafi</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Compact Adhan & Notification Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0c2834] to-[#061c25] border border-teal-500/25 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white">Codka Aadaanka &amp; Digniinta</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.adhanSound !== false}
              onChange={(e) => onUpdateSettings({ adhanSound: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex gap-2">
          <select
            value={settings.adhanVoice || 'makkah'}
            onChange={(e) =>
              onUpdateSettings({
                adhanVoice: e.target.value as AdhanVoice,
              })
            }
            className="flex-1 min-w-0 bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="makkah">🕋 Sheikh Cali Mulla (Makkah)</option>
            <option value="madinah">🕌 Aadaanka Madiina</option>
            <option value="afasy">🇰🇼 Sheikh Mishari Al-Cafaasi</option>
            <option value="abdulbasit">🇪🇬 Sheikh Cabdulbaasit</option>
            <option value="zahrani">🇸🇦 Sheikh Mansoor Az-Zahrani</option>
            <option value="qatami">🇸🇦 Sheikh Naasir Al-Qataami</option>
            <option value="minshawi">🇪🇬 Sheikh Al-Minshaawi</option>
            <option value="fajr">🌅 Aadaanka Fajr (Subaxa)</option>
          </select>

          <button
            type="button"
            onClick={() => playAdhanPreview(settings.adhanVoice || 'makkah')}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer ${
              isPlayingAdhan
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-teal-500/20 text-teal-200 border-teal-400/40'
            }`}
          >
            {isPlayingAdhan ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlayingAdhan ? 'Jooji' : 'Tijaabi'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <select
            value={settings.prePrayerAlertMinutes ?? 10}
            onChange={(e) =>
              onUpdateSettings({
                prePrayerAlertMinutes: Number(e.target.value),
              })
            }
            className="flex-1 bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value={0}>Xasuusin ka hor: Maya</option>
            <option value={5}>5 daqiiqo ka hor salaadda</option>
            <option value={10}>10 daqiiqo ka hor (Weeso)</option>
            <option value={15}>15 daqiiqo ka hor</option>
          </select>

          <button
            onClick={handleRequestNotification}
            className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
            <span>Oggolow 🔔</span>
          </button>
        </div>

        {notificationMsg && (
          <div className="text-xs font-semibold text-teal-200">{notificationMsg}</div>
        )}
      </div>

      {/* 5. Personal Prayer Timetable Card (Aadaan & Aqinka) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400 shrink-0" />
            <h3 className="font-extrabold text-sm text-white">Jadwalka Aadaanka &amp; Aqinka</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  useCustomSchedule: !settings.useCustomSchedule,
                  customSchedule: settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE,
                })
              }
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                settings.useCustomSchedule === true
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              {settings.useCustomSchedule === true ? '✓ Gaar ah' : 'Magaalada'}
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  useCustomSchedule: false,
                  customSchedule: DEFAULT_USER_PRAYER_SCHEDULE,
                })
              }
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Dib ugu celi waqtiga dhabta ah ee magaalada"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              { key: 'Fajr', label: 'Subax', icon: '🌅' },
              { key: 'Sunrise', label: 'Qorrax', icon: '☀️' },
              { key: 'Duhur', label: 'Duhur', icon: '☀️' },
              { key: 'Casar', label: 'Casar', icon: '🌤️' },
              { key: 'Maqrib', label: 'Maqrib', icon: '🌇' },
              { key: 'Cishe', label: 'Cishe', icon: '🌙' },
            ] as const
          ).map((p) => {
            const currentSchedule = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
            const slot = currentSchedule[p.key as keyof CustomPrayerSchedule] || {
              adhan: '00:00',
              iqama: '00:00',
            };

            return (
              <div
                key={p.key}
                className="p-2.5 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-1.5"
              >
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTimePickerSlot({
                        prayerKey: p.key,
                        field: 'adhan',
                        label: `${p.label} — Aadaanka`,
                        currentTime: slot.adhan,
                      })
                    }
                    className="bg-[#051419] border border-teal-500/30 rounded-lg py-1 font-mono font-bold text-teal-300 text-center cursor-pointer"
                  >
                    {slot.adhan || '00:00'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTimePickerSlot({
                        prayerKey: p.key,
                        field: 'iqama',
                        label: `${p.label} — Aqinka`,
                        currentTime: slot.iqama,
                      })
                    }
                    className="bg-[#051419] border border-amber-500/30 rounded-lg py-1 font-mono font-bold text-amber-300 text-center cursor-pointer"
                  >
                    {slot.iqama || '00:00'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Hubi Update-ka (Check for Updates) */}
      <AppUpdateSection onOpenMobileInstall={() => setShowMobileModal(true)} />

      {/* 7. Compact Backup, Install & Reset Row */}
      <div className="p-4 rounded-3xl bg-slate-900/75 border border-teal-500/20 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setShowMobileModal(true)}
            className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>Install App</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="p-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Backup</span>
          </button>

          <label className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Soo Celi</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={onResetAllData}
            className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Reset</span>
          </button>
        </div>

        {importStatus && (
          <div className="text-xs font-semibold text-teal-300">{importStatus}</div>
        )}

        {currentUser?.email?.toLowerCase() === 'ccakiincasan@gmail.com' && onOpenAdminDashboard && (
          <button
            onClick={onOpenAdminDashboard}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>Fur Admin Dashboard-ka</span>
          </button>
        )}
      </div>

      {/* Mobile Install Guide Modal */}
      <MobileInstallModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
      />

      {/* Custom Time Picker Modal with explicit Save Button for Prayer Schedule */}
      {activeTimePickerSlot && (
        <CustomTimePickerModal
          isOpen={!!activeTimePickerSlot}
          onClose={() => setActiveTimePickerSlot(null)}
          initialTime24={activeTimePickerSlot.currentTime || '05:00'}
          onSaveTime={(time24) => {
            if (activeTimePickerSlot) {
              const currentSchedule = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
              const slot = currentSchedule[activeTimePickerSlot.prayerKey as keyof CustomPrayerSchedule] || {
                adhan: '00:00',
                iqama: '00:00',
              };
              const updated: CustomPrayerSchedule = {
                ...currentSchedule,
                [activeTimePickerSlot.prayerKey]: {
                  ...slot,
                  [activeTimePickerSlot.field]: time24,
                },
              };
              onUpdateSettings({
                useCustomSchedule: true,
                customSchedule: updated,
              });
              setActiveTimePickerSlot(null);
            }
          }}
          title={activeTimePickerSlot.label}
          subtitle="Dooro saacadda, kadibna riix Keydi Waqtigan"
          allowClear={false}
        />
      )}
    </div>
  );
};
