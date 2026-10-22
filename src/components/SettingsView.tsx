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
} from 'lucide-react';
import { AppSettings, AdhanVoice, CustomPrayerSchedule, PrayerName } from '../types';
import { SOMALIA_CITIES, DEFAULT_USER_PRAYER_SCHEDULE } from '../utils/somaliaCities';
import { exportBackupData, importBackupData } from '../utils/storage';
import { sendBrowserNotification, audioAlerts } from '../utils/audioAlerts';
import { MobileInstallModal } from './MobileInstallModal';
import { CustomTimePickerModal } from './CustomTimePickerModal';
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
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDataImported,
  onResetAllData,
  currentUser,
  onOpenAuthModal,
  onOpenVideoTour,
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c242e] via-[#092d37] to-[#061d23] border border-teal-500/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-300 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-black text-white">
              Dejinta App-ka &amp; Goobta (Location)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Dooro magaaladaada Soomaaliya, dariiqa xisaabinta salaadaha, iyo soo dejinta xogta
          </p>
        </div>
      </div>

      {/* App Language Card: Af-Soomaali vs English */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0c2834] via-[#09222c] to-[#061820] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              Luqadda App-ka / App Language
            </h3>
          </div>
          <span
            data-no-translate="true"
            className="text-xs font-black text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30"
          >
            {language === 'so' ? '🇸🇴 Af-Soomaali' : '🇬🇧 English'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Dooro luqadda aad rabto in App-ka oo dhan ku shaqeeyo (Carabiga Qur&apos;aanka iyo Ducooyinka lama beddelayo).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-no-translate="true">
          <button
            type="button"
            onClick={() => {
              setLanguage('so');
              onUpdateSettings({ language: 'so' });
            }}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
              language === 'so'
                ? 'bg-gradient-to-r from-emerald-950/75 to-teal-950/60 border-emerald-400 text-white ring-1 ring-emerald-400 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-2xl">🇸🇴</span>
            <div>
              <div className="font-black text-sm text-white flex items-center gap-2">
                <span>Af-Soomaali</span>
                {language === 'so' && (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                    ✓ Xulan
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Dhammaan qaybaha App-ka ku akhri Af-Soomaali (Carabiga Qur&apos;aanka &amp; Ducooyinka waa sidiisa)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              onUpdateSettings({ language: 'en' });
            }}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
              language === 'en'
                ? 'bg-gradient-to-r from-amber-950/70 to-teal-950/60 border-amber-400 text-white ring-1 ring-amber-400 shadow-lg shadow-amber-950/50'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-2xl">🇬🇧</span>
            <div>
              <div className="font-black text-sm text-white flex items-center gap-2">
                <span>English</span>
                {language === 'en' && (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                    ✓ Active
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Switch the entire app interface to English (Arabic Qur&apos;an &amp; Duas remain in Arabic)
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Location Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
          <h3 className="font-extrabold text-sm sm:text-base text-white">
            Magaalada &amp; Goobtaada (Somalia &amp; Global)
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
            Dooro Magaaladaada Soomaaliya:
          </label>
          <select
            value={settings.cityId}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl px-3.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {SOMALIA_CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — Gobolka {c.region} (Lat: {c.lat}, Lon: {c.lon})
              </option>
            ))}
          </select>
        </div>

        {/* GPS Auto Detect */}
        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleGpsDetect}
            className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>📍 Hel Location-kayga Hadda (GPS)</span>
          </button>

          {gpsStatus && (
            <span className="text-xs font-semibold text-teal-300 text-center sm:text-left">{gpsStatus}</span>
          )}
        </div>

        {/* Manual Coordinates Option */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">
            Ama gacanta ku geli Latitude &amp; Longitude:
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              placeholder="Latitude (2.0469)"
              className="flex-1 bg-slate-900 border border-teal-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
            <input
              type="text"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              placeholder="Longitude (45.3182)"
              className="flex-1 bg-slate-900 border border-teal-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
            <button
              type="button"
              onClick={handleManualCoordsSave}
              className="px-5 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-xs font-black border border-teal-400/40 transition active:scale-95"
            >
              Keydi (OK)
            </button>
          </div>
        </div>
      </div>

      {/* Hab-ka Cibaadada: Rag ama Dumar (Sister/Brother Mode) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c2834] via-[#09222c] to-[#061820] border border-teal-500/25 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕌🌸</span>
            <h3 className="font-extrabold text-base text-white">
              Hab-ka Cibaadada &amp; Jinsiga (Gender Mode)
            </h3>
          </div>
          <span className="text-xs font-bold text-teal-300 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30">
            Dhaqan Islaami ah
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Diintu waxay dumarka u jideysay in salaadda guriga ku tukashadeedu ay leedahay ajar u dhigma ama ka khayr badan masaajidka ragga. Dooro qaabka kugu habboon si taxanahaagu (streaks) u noqdo mid sax ah:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ gender: 'male' })}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
              (settings.gender || 'male') === 'male'
                ? 'bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border-emerald-400 text-white ring-1 ring-emerald-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-2xl">👨</span>
            <div>
              <div className="font-bold text-sm text-white">Hab-ka Ragga (Masaajidka)</div>
              <div className="text-xs text-slate-400 mt-0.5">Xoogga saar salaadda jamaacada masaajidka</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ gender: 'female' })}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
              settings.gender === 'female'
                ? 'bg-gradient-to-r from-rose-950/60 to-pink-950/40 border-pink-400 text-white ring-1 ring-pink-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-2xl">👩🌸</span>
            <div>
              <div className="font-bold text-sm text-pink-200">Hab-ka Dumarka (Guriga / Sharaf)</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Waqtiga hore ee guriga wuxuu helayaa ajarka ugu sarreeya ee Taxanaha (Streaks), waxaana jira badhanka cudurka sharciga ah (udhur).
              </div>
            </div>
          </button>
        </div>

        {/* Starting Streak Setting */}
        <div className="mt-4 pt-4 border-t border-teal-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Bilow / Deji Taxanahaaga (Starting Streak Offset)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Haddii aad horey u tukanaysay maalmo badan, ku dar tirada si taxanahaagu halkan uga bilowdo.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              className="w-24 bg-slate-900 border border-teal-500/30 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:ring-1 focus:ring-teal-400"
            />
            <span className="text-xs text-teal-300 font-bold">Maalmood</span>
          </div>
        </div>
      </div>

      {/* Personal Custom Prayer Timetable Card (Aadaan & Aqinka) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Clock className="w-5 h-5 text-teal-400" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Jadwalkaaga Gaarka ah ee Aadaanka &amp; Aqinka
              </h3>
              <p className="text-xs text-slate-300">
                Waqtiyada saxda ah ee aadaanka iyo aqinka ee adiga kuu gaarka ah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  useCustomSchedule: !settings.useCustomSchedule,
                  customSchedule: settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE,
                })
              }
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                settings.useCustomSchedule !== false
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <span>{settings.useCustomSchedule !== false ? '✓ Jadwalka Gaarka ah (Shidan)' : 'Xisaabinta Magaalada'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  useCustomSchedule: true,
                  customSchedule: DEFAULT_USER_PRAYER_SCHEDULE,
                })
              }
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Dib ugu celi jadwalkaagii asalka ahaa ee 4:30 AM"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(
            [
              { key: 'Fajr', label: 'Subax (Fajr)', icon: '🌅' },
              { key: 'Sunrise', label: 'Duxa (Qorrax)', icon: '☀️' },
              { key: 'Duhur', label: 'Duhur', icon: '☀️' },
              { key: 'Casar', label: 'Casar', icon: '🌤️' },
              { key: 'Maqrib', label: 'Magrib', icon: '🌇' },
              { key: 'Cishe', label: 'Cisha', icon: '🌙' },
            ] as const
          ).map((p) => {
            const currentSchedule = settings.customSchedule || DEFAULT_USER_PRAYER_SCHEDULE;
            const slot = currentSchedule[p.key as keyof CustomPrayerSchedule] || {
              adhan: '00:00',
              iqama: '00:00',
            };

            const handleUpdateSlot = (field: 'adhan' | 'iqama', val: string) => {
              const updated: CustomPrayerSchedule = {
                ...currentSchedule,
                [p.key]: {
                  ...slot,
                  [field]: val,
                },
              };
              onUpdateSettings({
                useCustomSchedule: true,
                customSchedule: updated,
              });
            };

            return (
              <div
                key={p.key}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </span>
                  <span className="text-[10px] text-teal-300/80 font-mono font-bold uppercase">
                    {p.key}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-teal-400 mb-1">
                      Aadaanka
                    </label>
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
                      className="w-full bg-[#051419] hover:bg-teal-950/50 border border-teal-500/30 hover:border-teal-400 rounded-xl px-2 py-2 text-xs font-mono font-bold text-teal-300 text-center transition active:scale-95 cursor-pointer shadow-sm"
                      title="Guji si aad u doorato waqtiga"
                    >
                      {slot.adhan || '00:00'} ⏰
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                      Aqinka
                    </label>
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
                      className="w-full bg-[#051419] hover:bg-amber-950/50 border border-amber-500/30 hover:border-amber-400 rounded-xl px-2 py-2 text-xs font-mono font-bold text-amber-300 text-center transition active:scale-95 cursor-pointer shadow-sm"
                      title="Guji si aad u doorato waqtiga"
                    >
                      {slot.iqama || '00:00'} ⏰
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculation Methods Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h3 className="font-extrabold text-base text-white">
            Hababka Xisaabinta Salaadaha
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
              Habka Xisaabinta (Calculation Method):
            </label>
            <select
              value={settings.method}
              onChange={(e) =>
                onUpdateSettings({
                  method: e.target.value as AppSettings['method'],
                })
              }
              className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="MWL">Muslim World League (MWL - Soomaaliya)</option>
              <option value="UMQ">Umm Al-Qura (Makka Al-Mukarrama)</option>
              <option value="EGY">Egyptian General Authority</option>
              <option value="KAR">University of Karachi</option>
              <option value="ISNA">ISNA (North America)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
              Habka Casarka (Mad-hab):
            </label>
            <select
              value={settings.asrMethod}
              onChange={(e) =>
                onUpdateSettings({
                  asrMethod: Number(e.target.value) as 1 | 2,
                })
              }
              className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value={1}>Shaafi'i / Maaliki / Xanbali (Standard Soomaaliya)</option>
              <option value={2}>Xanafi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Adhan Sounds & Pre-Prayer Notifications Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c2834] via-[#092a37] to-[#061c25] border border-teal-500/25 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base text-white">
              Codadka Aadaanka &amp; Ogeysiisyada Salaadda
            </h3>
          </div>
          <span className="text-xs font-bold text-teal-300 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30">
            Awood Cusub
          </span>
        </div>

        {/* Master Adhan Sound Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-teal-500/20">
          <div>
            <h4 className="font-bold text-sm text-white">Dhawaaqa Aadaanka Tooska ah (Automatic Adhan Sound)</h4>
            <p className="text-xs text-teal-200/70">
              In codka aadaanka uu si toos ah u yeero marka salaad kasta la gaaro
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.adhanSound !== false}
              onChange={(e) => onUpdateSettings({ adhanSound: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Adhan Voice Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
              Codka Aadaanka (Adhan Voice):
            </label>
            <div className="flex gap-2">
              <select
                value={settings.adhanVoice || 'makkah'}
                onChange={(e) =>
                  onUpdateSettings({
                    adhanVoice: e.target.value as AdhanVoice,
                  })
                }
                className="flex-1 bg-slate-900 border border-teal-500/30 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="makkah">🕋 Sheikh Cali Axmed Mulla (Masjid al-Haram, Makkah)</option>
                <option value="madinah">🕌 Aadaanka Madiina Al-Munawwarah (Masjid an-Nabawi)</option>
                <option value="afasy">🇰🇼 Sheikh Mishari Rashiid Al-Cafaasi (Kuwait)</option>
                <option value="abdulbasit">🇪🇬 Sheikh Cabdulbaasit Cabdussamad (Masar)</option>
                <option value="zahrani">🇸🇦 Sheikh Mansoor Az-Zahrani (Khushuuc)</option>
                <option value="qatami">🇸🇦 Sheikh Naasir Al-Qataami</option>
                <option value="minshawi">🇪🇬 Sheikh Maxamed Sidiiq Al-Minshaawi</option>
                <option value="fajr">🌅 Aadaanka Fajr ee Subaxa (As-Salaatu Khayrun)</option>
              </select>

              {/* Preview Button */}
              <button
                type="button"
                onClick={() => playAdhanPreview(settings.adhanVoice || 'makkah')}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1 transition ${
                  isPlayingAdhan
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-teal-500/20 text-teal-200 border-teal-400/40 hover:bg-teal-500/30'
                }`}
                title={isPlayingAdhan ? 'Jooji Dhawaaqa' : 'Tijaabi Codka'}
              >
                {isPlayingAdhan ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isPlayingAdhan ? 'Jooji' : 'Tijaabi'}</span>
              </button>
            </div>
          </div>

          {/* Pre-prayer alert minutes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-300 mb-1.5">
              Xasuusinta Ka Hor Salaadda (Weeso Qaado):
            </label>
            <select
              value={settings.prePrayerAlertMinutes ?? 10}
              onChange={(e) =>
                onUpdateSettings({
                  prePrayerAlertMinutes: Number(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value={0}>Ma rabo xasuusin ka hor salaadda</option>
              <option value={5}>5 daqiiqo ka hor salaadda</option>
              <option value={10}>10 daqiiqo ka hor (Lagu taliyay: Weeso qaado)</option>
              <option value={15}>15 daqiiqo ka hor</option>
            </select>
          </div>
        </div>

        {/* Notifications Permission */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-300">
              Ogeysiisyada Browser-ka / Taleefanka (Web Notifications)
            </span>
          </div>

          <button
            onClick={handleRequestNotification}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs hover:brightness-110 transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Furo Ogeysiisyada (Allow Notifications)</span>
          </button>
        </div>

        {notificationMsg && (
          <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs font-semibold animate-in fade-in">
            {notificationMsg}
          </div>
        )}
      </div>

      {/* Cloud Database & Account Sync Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#072430] to-[#051821] border border-teal-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-teal-300" />
            <h3 className="font-extrabold text-base text-white">
              Koontada &amp; Keydka Xogta (Cloud Database)
            </h3>
          </div>
          {currentUser && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ku xiran</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300">
          {currentUser
            ? `Koontadaada ${currentUser.email} waxay si toos ah ugu xiran tahay Firebase Firestore Database. Xogta salaadahaaga, adkaartaada, iyo bogagga Qur'aanka waxay si toos ah ugu keydsan yihiin Cloud-ka.`
            : `Ku xidh xogtaada koontada Google, Facebook ama X (Twitter) si diiwaankaagu ugu kaydsamo Firebase Cloud Database. Haddii aad mobile-ka beddesho ama browser cusub gasho, xogtaadu ma lumayso!`}
        </p>

        {onOpenAuthModal && (
          <div className="pt-1">
            <button
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-teal-500/20 transition flex items-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              <span>{currentUser ? 'Maamul Koontada & Cloud Sync' : 'Gal Koontada (1-Click Sign In)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile App, PC & Any Browsers Installation Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c2e3a] to-[#071d24] border border-teal-500/25 shadow-xl space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-base text-white">
            Mobile (Android &amp; iOS), PC, Posters &amp; Any Browsers
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          Waxaad app-kan toos ugu shuban kartaa taleefankaaga gacanta (Android &amp; iOS iPhone), kombiyuutarkaaga (PC Desktop), ama biraawsar kasta oo caalamka ka jira (Any Browser) adigoo adeegsanaya QR Code-ka tooska ah.
        </p>

        <div className="pt-1">
          <button
            onClick={() => setShowMobileModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Fur Qaybaha Soo Dejinta (Mobile, PC, Posters &amp; Browsers)</span>
          </button>
        </div>
      </div>

      {/* Backup and Restore Data */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a232c] to-[#071920] border border-teal-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Download className="w-5 h-5 text-cyan-400" />
          <h3 className="font-extrabold text-base text-white">
            Kaydinta &amp; Soo Celinta Xogtaada (Backup &amp; Restore)
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          Xogtaada salaadaha, ducooyinka, iyo diiwaanka oo dhan waxay ku kaydsanyihiin browser-kaaga.
          Waxaad halkan kaga qaadan kartaa nuqul backup ah oo aad meel kasta ku shuban karto.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export */}
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Soo deji Backup (JSON)</span>
          </button>

          {/* Import */}
          <label className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-teal-200 font-bold text-xs sm:text-sm cursor-pointer transition flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Dib u soo celi Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div className="text-xs font-semibold text-teal-300 pt-1">
            {importStatus}
          </div>
        )}
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#240a0a] to-[#170505] border border-rose-500/25 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Tirtir Xogta App-ka</span>
        </div>
        <p className="text-xs text-slate-400">
          Haddii aad rabto inaad dib u bilowdo oo aad tirtirto dhammaan diiwaanka salaadaha iyo xogta kaydsan:
        </p>
        <button
          onClick={onResetAllData}
          className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Dib u bilow dhammaan xogta (Reset)</span>
        </button>
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
