import React, { useState, useEffect } from 'react';
import {
  AdhanVoice,
  AppSettings,
  CustomAlarm,
  DayData,
  PrayerName,
  SalaahRecord,
  SalaahStatus,
} from '../types';
import {
  PrayerTimesResult,
  PRAYER_SHORT_LABELS,
  formatTime12,
  getNextPrayerInfo,
  getActiveOrNextPrayerState,
} from '../utils/prayerTimes';
import { audioAlerts } from '../utils/audioAlerts';
import { SHEIKH_VOICES } from './AdhanView';
import {
  AMBIENT_SOUNDS,
  AMBIENT_PRESETS,
  AmbientSoundId,
  ambientSounds,
} from '../utils/ambientSoundService';

interface StitchSamplePreviewProps {
  onExitSample: () => void;
  dayData: DayData;
  prayerTimes: PrayerTimesResult;
  settings: AppSettings;
  streakDays: number;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdatePrayer: (prayer: PrayerName, record: Partial<SalaahRecord>) => void;
  onTriggerAdhaanOverlay: (prayer: PrayerName) => void;
  onOpenOriginalTab: (tab: string) => void;
}

type StitchScreenId =
  | 'hoyga'
  | 'aadaan'
  | 'alaarm'
  | 'quraan'
  | 'dabeecad'
  | 'adhkaar'
  | 'qibla';

const SAMPLE_ADHKAR_LIST = [
  {
    id: 1,
    category: 'subax',
    fadhil: 'Qofkii subaxdii iyo galabtii 3 jeer akhriya, wax dhib ah ma gaarayo...',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    translit:
      "Bismillaahil-ladhii laa yadurru ma'asmihi shay'un fil-ardi wa laa fis-samaa'i wa huwas-samii'ul-'aliim.",
    somali:
      'Magaca Alle ee aan wax dhib ahi la jirin waxna dhibi karin dhulka iyo samadaba, waana kan maqlaya ee og.',
    target: 3,
  },
  {
    id: 2,
    category: 'subax',
    fadhil: ' Aayatul Kursi — Qofkii subaxdii akhriya wuxuu ku jiraa ilaalinta Alle ilaa galabtii.',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    translit: 'Allaahu laa ilaaha illaa Huwal-Hayyul-Qayyuum, laa ta’khudhuhuu sinatun wa laa nawm...',
    somali: 'Allaah ma jiro Ilaah xaq lagu caabudo Isaga mooyee, waa Noolaha joogtada ah, ma qabato lulmo iyo hurdo toona.',
    target: 1,
  },
  {
    id: 3,
    category: 'galab',
    fadhil: 'Qofkii galabtii 3 jeer yiraahda, Alle wuxuu ka ilaaliyaa wixii uu ka cabsado.',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    translit: "A'uudhu bikalimaatillaahit-taammaati min sharri maa khalaq.",
    somali: 'Waxaan magan galayaa kalimadaha Alle ee dhammaystiran sharka wixii Uu abuuray.',
    target: 3,
  },
];

const SAMPLE_KAHF_AYAHS = [
  {
    num: 9,
    arabic: 'أَمْ حَسِبْتَ أَنَّ أَصْحَابَ الْكَهْفِ وَالرَّقِيمِ كَانُوا مِنْ آيَاتِنَا عَجَبًا ﴿٩﴾',
    somali:
      'Mase waxaad u haysatay inay asxaabtii godka iyo qoraalku ahaayeen kuwo la yaab leh oo ka mid ah aayaadkayaga?',
  },
  {
    num: 10,
    arabic:
      'إِذْ أَوَى الْفِتْيَةُ إِلَى الْكَهْفِ فَقَالُوا رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا ﴿١٠﴾',
    somali:
      'Xusuusso markii dhalinyaradu u dhuumatay godkii, oo ay yiraahdeen: Rabbigow, naga sii xaggaaga naxariis, noona diyaari amarkayaga mid toosan.',
  },
  {
    num: 11,
    arabic: 'فَضَرَبْنَا عَلَىٰ آذَانِهِمْ فِي الْكَهْفِ سِنِينَ عَدَدًا ﴿١١﴾',
    somali: 'Markaasannu ku daboolnay dhegahooda (hurdo) godka dhexdiisa sannado tiro badan.',
  },
];

export const StitchSamplePreview: React.FC<StitchSamplePreviewProps> = ({
  onExitSample,
  dayData,
  prayerTimes,
  settings,
  streakDays,
  onUpdateSettings,
  onUpdatePrayer,
  onTriggerAdhaanOverlay,
  onOpenOriginalTab,
}) => {
  const [activeScreen, setActiveScreen] = useState<StitchScreenId>('hoyga');
  const [viewMode, setViewMode] = useState<'interactive' | 'raw_html'>('interactive');
  const [nowDate, setNowDate] = useState<Date>(() => new Date());

  // Adhan voice preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<AdhanVoice | null>(null);

  // Tasbeeh & Adhkaar state
  const [tasbeehCount, setTasbeehCount] = useState<number>(33);
  const [lifetimeTasbeeh, setLifetimeTasbeeh] = useState<number>(4820);
  const [tasbeehPhrase, setTasbeehPhrase] = useState<string>('Subhaanallaah');
  const [adhkarTab, setAdhkarTab] = useState<'subax' | 'galab'>('subax');
  const [adhkarIdx, setAdhkarIdx] = useState<number>(0);
  const [adhkarTapCount, setAdhkarTapCount] = useState<number>(2);

  // Quran sample audio state
  const [quranTab, setQuranTab] = useState<'quraan' | 'tafsiir'>('quraan');
  const [selectedAyahNum, setSelectedAyahNum] = useState<number>(10);
  const [isQuranPlaying, setIsQuranPlaying] = useState<boolean>(false);
  const [quranAudioEl] = useState<HTMLAudioElement | null>(() =>
    typeof Audio !== 'undefined' ? new Audio() : null
  );

  // Ambient state
  const [, setAmbientTick] = useState<number>(0);

  // Alarm bottom sheet state
  const [showAlarmSheet, setShowAlarmSheet] = useState<boolean>(true);
  const [alarmHour, setAlarmHour] = useState<number>(4);
  const [alarmMin, setAlarmMin] = useState<number>(30);
  const [alarmAmPm, setAlarmAmPm] = useState<'AM' | 'PM'>('AM');
  const [alarmDays, setAlarmDays] = useState<number[]>([0, 1, 2, 3, 4, 6]);
  const [alarmVoice, setAlarmVoice] = useState<AdhanVoice>(settings.adhanVoice || 'alijaber');

  // Qadaa missed prayers state
  const [missedCount, setMissedCount] = useState<number>(4);

  useEffect(() => {
    const t = setInterval(() => setNowDate(new Date()), 1000);
    const unsub = ambientSounds.subscribe(() => setAmbientTick((n) => n + 1));
    return () => {
      clearInterval(t);
      unsub();
      if (quranAudioEl) {
        quranAudioEl.pause();
      }
    };
  }, [quranAudioEl]);

  // Calculate live active prayer or next prayer countdown
  const activeOrNext = getActiveOrNextPrayerState(prayerTimes, nowDate, settings.customSchedule);
  const nextInfo = getNextPrayerInfo(prayerTimes, nowDate);
  const nextPrayerKey = activeOrNext.isActive ? activeOrNext.currentPrayer! : activeOrNext.nextPrayer;
  const nextPrayerLabel = activeOrNext.isActive
    ? activeOrNext.currentPrayerLabel
    : (PRAYER_SHORT_LABELS[nextPrayerKey] || nextPrayerKey);

  const totalSecs = activeOrNext.isActive
    ? (activeOrNext.isBeforeIqama ? activeOrNext.secondsToIqama : 0)
    : activeOrNext.secondsToNextPrayer;

  const cHours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const cMins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const cSecs = String(totalSecs % 60).padStart(2, '0');
  const ambientState = ambientSounds.getState();
  const activeAmbientCount = Object.values(ambientState.activeSounds).filter(Boolean).length;

  // Digital clock formatting
  const rawH = nowDate.getHours();
  const ampmStr = rawH >= 12 ? 'PM' : 'AM';
  const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
  const digitalClockStr = `${String(h12).padStart(2, '0')}:${String(
    nowDate.getMinutes()
  ).padStart(2, '0')}:${String(nowDate.getSeconds()).padStart(2, '0')}`;

  // Prayed count today
  const fivePrayers: { key: PrayerName; label: string; icon: string }[] = [
    { key: 'Fajr', label: 'Subax (Fajr)', icon: '🌅' },
    { key: 'Duhur', label: 'Duhur', icon: '☀️' },
    { key: 'Casar', label: 'Casar', icon: '🌤️' },
    { key: 'Maqrib', label: 'Magrib', icon: '🌇' },
    { key: 'Cishe', label: 'Cisha', icon: '🌙' },
  ];

  const prayedCount = fivePrayers.filter((p) => {
    const st = dayData.salaah[p.key]?.status;
    return st === 'mosque' || st === 'home' || st === 'early_home' || st === 'excused';
  }).length;

  const handleToggleVoicePreview = (voiceId: AdhanVoice) => {
    audioAlerts.unlockAudio();
    if (playingVoiceId === voiceId) {
      audioAlerts.stopAdhan();
      setPlayingVoiceId(null);
    } else {
      audioAlerts.stopAdhan();
      setPlayingVoiceId(voiceId);
      audioAlerts.playAdhan(
        voiceId === 'fajr',
        () => setPlayingVoiceId(null),
        voiceId,
        true
      );
    }
  };

  const handleSelectMasterSheikh = (voiceId: AdhanVoice) => {
    onUpdateSettings({
      adhanVoice: voiceId,
      prayerVoices: {
        Fajr: voiceId,
        Duhur: voiceId,
        Casar: voiceId,
        Maqrib: voiceId,
        Cishe: voiceId,
      },
    });
  };

  const handleToggleSampleQuranAudio = () => {
    if (!quranAudioEl) return;
    if (isQuranPlaying) {
      quranAudioEl.pause();
      setIsQuranPlaying(false);
    } else {
      quranAudioEl.src = 'https://everyayah.com/data/Ali_Jaber_64kbps/018010.mp3';
      quranAudioEl.onended = () => setIsQuranPlaying(false);
      quranAudioEl
        .play()
        .then(() => setIsQuranPlaying(true))
        .catch(() => setIsQuranPlaying(false));
    }
  };

  const handleCyclePrayerStatus = (prayer: PrayerName) => {
    const current = dayData.salaah[prayer]?.status || 'none';
    const next: SalaahStatus =
      current === 'none'
        ? 'mosque'
        : current === 'mosque'
        ? 'home'
        : current === 'home'
        ? 'early_home'
        : 'none';
    onUpdatePrayer(prayer, { status: next });
  };

  const handleSaveSampleAlarm = () => {
    let h24 = alarmHour % 12;
    if (alarmAmPm === 'PM') h24 += 12;
    const time24 = `${String(h24).padStart(2, '0')}:${String(alarmMin).padStart(2, '0')}`;
    const existingAlarms: CustomAlarm[] = Array.isArray(settings.alarms) ? settings.alarms : [];
    const newAlarm: CustomAlarm = {
      id: `stitch_alarm_${Date.now()}`,
      time: time24,
      label: 'Alaarmka Salaadda & Xusuusinta',
      enabled: true,
      sound: 'adhan',
      selectedVoice: alarmVoice,
      days: alarmDays,
      createdAt: Date.now(),
    };
    onUpdateSettings({ alarms: [newAlarm, ...existingAlarms] });
    setShowAlarmSheet(false);
  };

  const currentMasterVoiceId = settings.adhanVoice || 'alijaber';
  const currentMasterSheikh =
    SHEIKH_VOICES.find((v) => v.id === currentMasterVoiceId) || SHEIKH_VOICES[0];

  const screensList: { id: StitchScreenId; label: string; icon: string; htmlPath: string }[] = [
    { id: 'hoyga', label: '1. Hoyga', icon: '🏠', htmlPath: '/stitch/tuko_hoyga/code.html' },
    { id: 'aadaan', label: '2. Codadka Aadaanka', icon: '🔊', htmlPath: '/stitch/tuko_codadka_aadaanka/code.html' },
    { id: 'alaarm', label: '3. Alaarmka', icon: '⏰', htmlPath: '/stitch/tuko_alaarmka_toosidda/code.html' },
    { id: 'quraan', label: '4. Quraanka', icon: '📖', htmlPath: '/stitch/tuko_maktabadda_quraanka_kariimka_tafsiirka/code.html' },
    { id: 'dabeecad', label: '5. Dabeecadda', icon: '🌧️', htmlPath: '/stitch/tuko_codadka_dabeecadda/code.html' },
    { id: 'adhkaar', label: '6. Adhkaarta', icon: '📿', htmlPath: '/stitch/tuko_adhkaarta_subaxa_galabta_tasbiixda/code.html' },
    { id: 'qibla', label: '7. Qiblada & Zako', icon: '🧭', htmlPath: '/stitch/tuko_qiblada_masaajidda/code.html' },
  ];

  const activeScreenObj = screensList.find((s) => s.id === activeScreen) || screensList[0];

  return (
    <div className="min-h-screen w-full bg-[#16130c] text-[#e9e1d6] font-sans pb-28 selection:bg-[#ffde82]/30 selection:text-[#ffde82]">
      {/* ===================================================================== */}
      {/* STICKY SAFETY BAR: 1-TAP RETURN TO ORIGINAL DESIGN + SCREEN SWITCHER  */}
      {/* ===================================================================== */}
      <div className="sticky top-0 z-50 bg-[#110e08]/95 backdrop-blur-xl border-b border-[#E5C158]/30 px-3 py-2.5 shadow-2xl">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  viewMode === 'interactive'
                    ? 'bg-[#2DD4BF] text-[#003730] shadow'
                    : 'bg-[#221f18] text-[#d0c5b1] border border-[#E5C158]/25'
                }`}
              >
                ⚡ Shaqaynaya (Interactive)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw_html')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  viewMode === 'raw_html'
                    ? 'bg-[#ffde82] text-[#241a00] shadow'
                    : 'bg-[#221f18] text-[#d0c5b1] border border-[#E5C158]/25'
                }`}
              >
                🖼️ Asalka Stitch (1:1 HTML)
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                audioAlerts.stopAdhan();
                onExitSample();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffde82] to-[#e5c158] text-[#241a00] font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>↩️ Naqshaddii Hore</span>
            </button>
          </div>

          {/* 7-Screen Horizontal Pill Switcher so user can inspect all 7 Stitch screens */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {screensList.map((sc) => {
              const isAct = activeScreen === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScreen(sc.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isAct
                      ? 'bg-[#ffde82] text-[#241a00] shadow-[0_0_12px_rgba(255,222,130,0.35)] font-black'
                      : 'bg-[#221f18] text-[#d0c5b1] border border-[#E5C158]/20 hover:border-[#E5C158]/50'
                  }`}
                >
                  <span>{sc.icon}</span>
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === 'raw_html' ? (
        <div className="max-w-lg mx-auto w-full h-[calc(100vh-140px)] bg-[#16130c]">
          <iframe
            key={activeScreenObj.htmlPath}
            src={activeScreenObj.htmlPath}
            title={activeScreenObj.label}
            className="w-full h-full border-0 rounded-b-2xl"
          />
        </div>
      ) : (
        <>

      {/* ===================================================================== */}
      {/* STITCH TOP HEADER BAR (TUKO • MUQDISHO • STREAK • BELL • PROFILE)     */}
      {/* ===================================================================== */}
      <header className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-wider text-[#E5C158]">TUKO</span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#38342c]/60 border border-[#E5C158]/25">
            <span className="text-xs text-[#E5C158]">📍</span>
            <span className="text-xs font-medium text-[#e9e1d6]">{settings.cityName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#38342c]/60 border border-[#E5C158]/25">
            <span className="text-xs">🔥</span>
            <span className="text-xs font-bold text-[#ffde82]">{streakDays || 14}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('aadaan')}
            className="w-9 h-9 rounded-full bg-[#221f18] border border-[#E5C158]/20 flex items-center justify-center text-[#d0c5b1] hover:text-[#ffde82] cursor-pointer"
          >
            🔔
          </button>
          <div className="w-8 h-8 rounded-full bg-[#ffde82] text-[#3d2f00] font-black text-xs flex items-center justify-center">
            👤
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN MOBILE CONTAINER (480px MAX WIDTH FOR AUTHENTIC STITCH LOOK)     */}
      {/* ===================================================================== */}
      <main className="max-w-lg mx-auto px-4 pt-2 space-y-5">
        {/* =================================================================== */}
        {/* SCREEN 1: HOYGA (HOME DASHBOARD & SALAAH TRACKER)                   */}
        {/* =================================================================== */}
        {activeScreen === 'hoyga' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Hero Next Prayer Countdown Card (Mihrab-inspired) */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-5 shadow-2xl">
              {/* Geometric Arabesque SVG Watermark */}
              <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full text-[#E5C158]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  <path d="M20 20 L80 80 M80 20 L20 80" stroke="currentColor" strokeWidth="0.4" />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center gap-1.5 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-bold tracking-wider uppercase ${
                    activeOrNext.isActive
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-[#e5c158]/10 border-[#E5C158]/30 text-[#E5C158]'
                  }`}
                >
                  <span>{activeOrNext.isActive ? '🟢' : '🕌'}</span>
                  <span>
                    {activeOrNext.isActive
                      ? `WAQTIGII SALAADDA • ${activeOrNext.currentPrayerLabel.toUpperCase()} (LAGU JIRAA)`
                      : `SALAADDA XIGTA • ${nextPrayerLabel.toUpperCase()}`}
                  </span>
                </span>

                <div className="font-serif text-xl text-[#E5C158] mt-1">
                  وَأَقِمِ الصَّلَاةَ لِذِكْرِي
                </div>

                <div className="my-1 font-mono text-4xl font-extrabold tracking-widest text-[#ffde82] drop-shadow-[0_0_15px_rgba(229,193,88,0.35)]">
                  {activeOrNext.isActive && !activeOrNext.isBeforeIqama ? (
                    <span className="text-2xl sm:text-3xl text-emerald-300">WAA WAQTIGII SALAADDA</span>
                  ) : (
                    `${cHours} : ${cMins} : ${cSecs}`
                  )}
                </div>

                <p className="text-xs text-[#d0c5b1]">
                  {activeOrNext.isActive
                    ? activeOrNext.isBeforeIqama
                      ? `Ka dhiman Aqinka • Waqtiga: ${activeOrNext.activeIqamaTimeStr}`
                      : 'Waa xilligii cibaadada & gudashada salaadda'
                    : `Waqtiga ka dhiman inta laga gaarayo ${nextPrayerLabel} (${activeOrNext.nextPrayerTimeString})`}
                </p>
              </div>

              {/* 5 Horizontal Mini Prayer Pills */}
              <div className="relative z-10 grid grid-cols-5 gap-1.5 pt-3 border-t border-[#E5C158]/20">
                {fivePrayers.map((p) => {
                  const st = dayData.salaah[p.key]?.status;
                  const isPrayed =
                    st === 'mosque' || st === 'home' || st === 'early_home' || st === 'excused';
                  const isNext = nextPrayerKey === p.key;
                  const t12 = formatTime12(prayerTimes[p.key]).replace(/\s?(AM|PM)/i, '');

                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onTriggerAdhaanOverlay(p.key)}
                      className={`flex flex-col items-center p-1.5 rounded-xl transition cursor-pointer ${
                        isNext
                          ? 'bg-[#ffde82]/20 border border-[#ffde82] text-[#ffde82] shadow-[0_0_10px_rgba(255,222,130,0.2)]'
                          : 'bg-[#38342c]/40 text-[#e9e1d6]/75 hover:bg-[#38342c]/70'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold">
                        {p.key === 'Fajr' ? 'Subax' : p.key === 'Maqrib' ? 'Magrib' : p.key === 'Cishe' ? 'Cisha' : p.key}
                      </span>
                      <span className="text-[11px] font-mono font-semibold">{t12}</span>
                      <span className="text-xs mt-0.5">
                        {isPrayed ? '✅' : isNext ? '🕒' : '⚪'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Bento Grid (4 Glass Tiles) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#e9e1d6]">Adeegyada Muhiimka ah</h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('adhkaar')}
                  className="text-xs font-semibold text-[#E5C158] cursor-pointer"
                >
                  Wax badan →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveScreen('quraan')}
                  className="group relative overflow-hidden rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 text-left flex flex-col justify-between hover:border-[#ffde82] transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38342c]/80 border border-[#E5C158]/30 flex items-center justify-center text-lg mb-3">
                    📖
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e9e1d6] group-hover:text-[#ffde82]">
                      Quraanka Kariimka
                    </h4>
                    <p className="text-xs text-[#d0c5b1] mt-0.5">
                      114 Suuradood &amp; Tafsiir Soomaali ah
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen('aadaan')}
                  className="group relative overflow-hidden rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 text-left flex flex-col justify-between hover:border-[#4fdbc8] transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38342c]/80 border border-[#E5C158]/30 flex items-center justify-center text-lg mb-3">
                    🔊
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e9e1d6] group-hover:text-[#4fdbc8]">
                      Aadaanka &amp; Alaarmka
                    </h4>
                    <p className="text-xs text-[#d0c5b1] mt-0.5">
                      12 Imaam oo caan ah &amp; Ogeysiisyo
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen('dabeecad')}
                  className="group relative overflow-hidden rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 text-left flex flex-col justify-between hover:border-[#a8c8ff] transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38342c]/80 border border-[#E5C158]/30 flex items-center justify-center text-lg mb-3">
                    🌧️
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e9e1d6] group-hover:text-[#a8c8ff]">
                      Codadka Dabeecadda
                    </h4>
                    <p className="text-xs text-[#d0c5b1] mt-0.5">
                      Roob, Shimbiraha &amp; Dabka
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen('qibla')}
                  className="group relative overflow-hidden rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 text-left flex flex-col justify-between hover:border-[#ffde82] transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38342c]/80 border border-[#E5C158]/30 flex items-center justify-center text-lg mb-3">
                    🧭
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e9e1d6] group-hover:text-[#ffde82]">
                      Qiblada &amp; Masaajidda
                    </h4>
                    <p className="text-xs text-[#d0c5b1] mt-0.5">
                      Compass-ka Tooska ah &amp; GPS
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Daily 5-Prayer Tracker List ("Raadraaca Salaadda Maanta") */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#e9e1d6]">Raadraaca Salaadda Maanta</h3>
                  <p className="text-xs text-[#d0c5b1]">Diiwaangeli oo hel dhibco ajir ah</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#4fdbc8]/10 text-[#4fdbc8] text-xs font-bold border border-[#E5C158]/25">
                  {prayedCount}/5 La tukaday
                </span>
              </div>

              <div className="space-y-2">
                {fivePrayers.map((p) => {
                  const st = dayData.salaah[p.key]?.status || 'none';
                  const isCurrent = nextPrayerKey === p.key;
                  const timeFormatted = formatTime12(prayerTimes[p.key]);

                  return (
                    <div
                      key={p.key}
                      className={`flex items-center justify-between p-3 rounded-2xl bg-[#0B2933] transition ${
                        isCurrent
                          ? 'border-2 border-[#ffde82] shadow-[0_0_15px_rgba(255,222,130,0.15)]'
                          : 'border border-[#E5C158]/25'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${
                            isCurrent ? 'bg-[#ffde82]/20 text-[#ffde82]' : 'bg-[#38342c] text-[#E5C158]'
                          }`}
                        >
                          {p.icon}
                        </div>
                        <div>
                          <div
                            className={`font-bold text-sm flex items-center gap-1.5 ${
                              isCurrent ? 'text-[#ffde82]' : 'text-[#e9e1d6]'
                            }`}
                          >
                            <span>{p.label}</span>
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-[#ffde82] animate-ping" />
                            )}
                          </div>
                          <div className="text-xs text-[#d0c5b1]">
                            {timeFormatted} •{' '}
                            {st === 'mosque'
                              ? 'Masaajidka'
                              : st === 'home' || st === 'early_home'
                              ? 'Waqtigeeda'
                              : isCurrent
                              ? 'Soo socota'
                              : 'Guji si aad u qorto'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCyclePrayerStatus(p.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            st === 'mosque'
                              ? 'bg-[#04b4a2]/30 text-[#4fdbc8] border-[#E5C158]/30'
                              : st === 'home' || st === 'early_home'
                              ? 'bg-[#ffde82]/20 text-[#E5C158] border-[#E5C158]/30'
                              : isCurrent
                              ? 'bg-[#ffde82]/20 text-[#ffde82] border-[#E5C158]/30'
                              : 'bg-[#38342c] text-[#d0c5b1] border-transparent'
                          }`}
                        >
                          {st === 'mosque'
                            ? '🕌 Masjid'
                            : st === 'home' || st === 'early_home'
                            ? '🏠 Guri'
                            : isCurrent
                            ? '⏳ Sugaya'
                            : 'Diiwaangeli'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            st === 'none'
                              ? onUpdatePrayer(p.key, { status: 'mosque' })
                              : onTriggerAdhaanOverlay(p.key)
                          }
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-[#ffde82] text-[#3d2f00]'
                              : 'bg-[#38342c] text-[#E5C158] hover:bg-[#4d4636]'
                          }`}
                          title="Diiwaangeli ama Fur Adhkaarta"
                        >
                          {isCurrent ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Adhkaar Quick Counter Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#041116] to-[#071E26] border border-[#E5C158]/30 p-4 flex items-center justify-between shadow-xl">
              <div>
                <span className="text-[11px] font-bold text-[#E5C158] uppercase tracking-wider">
                  TASBIIXDA MAANTA
                </span>
                <h4 className="text-base font-bold text-[#e9e1d6]">{tasbeehPhrase}</h4>
                <p className="text-xs text-[#d0c5b1] mt-0.5">Taabo si aad u tiriso</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTasbeehCount((c) => c + 1);
                  setLifetimeTasbeeh((l) => l + 1);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#ffde82] text-[#3d2f00] font-extrabold text-base flex items-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <span>📿</span>
                <span>{tasbeehCount}</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 2: CODADKA AADAANKA (SHEIKH SELECTION & DAAR / DAMI)         */}
        {/* =================================================================== */}
        {activeScreen === 'aadaan' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveScreen('hoyga')}
                  className="w-9 h-9 rounded-full bg-[#38342c]/60 flex items-center justify-center text-[#e9e1d6] cursor-pointer"
                >
                  ←
                </button>
                <div>
                  <h1 className="text-lg font-bold text-[#e9e1d6]">Codadka Aadaanka</h1>
                  <p className="text-xs text-[#d0c5b1]">Doorashada Shiiqa &amp; Codadka</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveScreen('alaarm')}
                className="px-3 py-1.5 rounded-xl bg-[#38342c]/60 border border-[#E5C158]/30 text-xs font-bold text-[#E5C158] cursor-pointer"
              >
                ⏰ Alaarmka
              </button>
            </div>

            {/* Master Voice Selector Card */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0B2933] p-4 border border-[#E5C158]/30 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#e5c158]/20 border border-[#E5C158]/30 flex items-center justify-center text-2xl">
                    🎙️
                  </div>
                  <div>
                    <span className="text-[11px] text-[#E5C158] uppercase tracking-wider font-bold">
                      CODKA MASTER-KA
                    </span>
                    <h2 className="text-base font-bold text-[#e9e1d6]">
                      {currentMasterSheikh.name}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-[#4fdbc8]/20 px-2.5 py-1 rounded-full border border-[#4fdbc8]/30">
                  <span className="w-2 h-2 rounded-full bg-[#4fdbc8] animate-pulse" />
                  <span className="text-xs text-[#4fdbc8] font-bold">Live</span>
                </div>
              </div>

              <p className="text-xs text-[#d0c5b1] leading-relaxed">
                Dhammaan Salaadaha waxaa loogu yeeri doonaa codkan haddii aan si gooni ah loo beddelin.
              </p>

              <div className="flex items-center justify-between pt-2.5 border-t border-[#E5C158]/20">
                <div className="flex items-center gap-1 h-6">
                  <span className="w-1 h-3 bg-[#E5C158] rounded-full animate-bounce" />
                  <span className="w-1 h-5 bg-[#E5C158] rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1 h-4 bg-[#E5C158] rounded-full animate-bounce [animation-delay:0.3s]" />
                  <span className="w-1 h-5 bg-[#E5C158] rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="text-xs text-[#d0c5b1] ml-1.5">Cod saafi ah</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleVoicePreview(currentMasterVoiceId)}
                  className="px-4 py-2 rounded-xl bg-[#ffde82] text-[#3d2f00] font-bold text-xs shadow-lg hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{playingVoiceId === currentMasterVoiceId ? '⏹ Dami' : '▷ Daar / Dooro'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Sheikh Selection List Panel */}
            <div className="space-y-2.5">
              <div>
                <h2 className="text-base font-bold text-[#e9e1d6]">Dooro Shiiqa</h2>
                <p className="text-xs text-[#d0c5b1]">
                  Riix Daar si aad u maqasho, Dami si aad u joojiso
                </p>
              </div>

              <div className="space-y-2.5">
                {SHEIKH_VOICES.map((sh) => {
                  const isSelected = currentMasterVoiceId === sh.id;
                  const isPlaying = playingVoiceId === sh.id;

                  return (
                    <div
                      key={sh.id}
                      className={`rounded-2xl bg-[#0B2933] p-3.5 border transition ${
                        isSelected
                          ? 'border-[#ffde82]/70 bg-gradient-to-r from-[#ffde82]/10 to-transparent shadow-lg'
                          : 'border-[#E5C158]/25 hover:border-[#ffde82]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 ${
                              isSelected
                                ? 'bg-[#ffde82] text-[#3d2f00]'
                                : 'bg-[#38342c] text-[#d0c5b1]'
                            }`}
                          >
                            {sh.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="text-[10px] text-[#ffde82] font-black uppercase">
                                  XULAN •
                                </span>
                              )}
                              <span className="text-xs text-[#d0c5b1] truncate">
                                {sh.location} ({sh.country})
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[#e9e1d6] truncate">{sh.name}</h3>
                            {isPlaying && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="w-1 h-3 bg-[#4fdbc8] rounded-full animate-pulse" />
                                <span className="w-1 h-4 bg-[#4fdbc8] rounded-full animate-pulse [animation-delay:0.2s]" />
                                <span className="w-1 h-2.5 bg-[#4fdbc8] rounded-full animate-pulse [animation-delay:0.4s]" />
                                <span className="text-[10px] text-[#4fdbc8] font-bold ml-1">
                                  Wuu socdaa...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleVoicePreview(sh.id)}
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                              isPlaying
                                ? 'bg-[#ffb4ab] text-[#690005] shadow'
                                : 'bg-[#38342c] text-[#e9e1d6] hover:bg-[#4d4636]'
                            }`}
                          >
                            <span>{isPlaying ? '⏹ Dami' : '▷ Daar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectMasterSheikh(sh.id)}
                            className={`px-3 py-2 rounded-xl font-bold text-xs border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#4fdbc8] text-[#003731] border-[#4fdbc8]'
                                : 'bg-[#38342c]/50 text-[#E5C158] border-[#E5C158]/30 hover:bg-[#38342c]'
                            }`}
                          >
                            {isSelected ? '✓ Xulan' : 'Dooro'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Prayer Customization Cards */}
            <div className="space-y-3 pt-2">
              <div>
                <h2 className="text-base font-bold text-[#e9e1d6]">
                  Qoondeynta Salaadaha Gaarka ah
                </h2>
                <p className="text-xs text-[#d0c5b1]">Salaad kasta iyo shiiqa u xulan</p>
              </div>

              {fivePrayers.map((p) => {
                const vId = settings.prayerVoices?.[p.key] || currentMasterVoiceId;
                const sh = SHEIKH_VOICES.find((v) => v.id === vId) || SHEIKH_VOICES[0];
                const isPl = playingVoiceId === vId;
                return (
                  <div
                    key={p.key}
                    className="rounded-2xl bg-[#0B2933] p-4 border border-[#E5C158]/25 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#e5c158]/15 border border-[#E5C158]/30 flex items-center justify-center text-lg">
                          {p.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#e9e1d6]">{p.label}</h3>
                          <span className="text-xs text-[#E5C158] font-medium">{sh.name}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onExitSample();
                          onOpenOriginalTab('adhan');
                        }}
                        className="px-3 py-1 rounded-full bg-[#38342c]/70 border border-[#E5C158]/25 text-xs text-[#d0c5b1] cursor-pointer"
                      >
                        ⏰ {formatTime12(prayerTimes[p.key])}{' '}
                        <span className="text-[#E5C158] font-bold">• Beddel</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleVoicePreview(vId)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ffde82] to-[#e7c35a] text-[#3d2f00] font-bold text-xs shadow hover:brightness-105 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🎧</span>
                      <span>
                        {isPl ? '⏹ Dami Codka Shiiqa' : 'Daar / Dhagayso Codka Shiiqa'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 3: ALAARMKA TOOSIDDA (SMART ALARMS & TIME PICKER SHEET)      */}
        {/* =================================================================== */}
        {activeScreen === 'alaarm' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-[#e9e1d6]">Alaarmka Toosidda</h1>
                <p className="text-xs text-[#d0c5b1]">Maaraynta &amp; Xusuusinta Salaadaha</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAlarmSheet(true)}
                className="px-4 py-2 rounded-full bg-[#ffde82] text-[#3d2f00] font-bold text-xs shadow cursor-pointer"
              >
                + Cusub
              </button>
            </div>

            {/* Live Digital Clock Hero Banner */}
            <div className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-5 text-center space-y-2 shadow-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#221f18] border border-[#E5C158]/25 text-xs font-bold text-[#ffde82]">
                🌅 Waqtiga Hadda
              </span>
              <div className="font-mono text-3xl font-extrabold text-[#ffde82] tracking-wider">
                {digitalClockStr} <span className="text-[#4fdbc8]">{ampmStr}</span>
              </div>
              <p className="text-xs text-[#d0c5b1]">Waqtiga {settings.cityName}, Soomaaliya</p>
              <button
                type="button"
                onClick={() => handleToggleVoicePreview(alarmVoice)}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#221f18] border border-[#E5C158]/30 text-xs font-semibold text-[#4fdbc8] cursor-pointer"
              >
                <span>⚡</span>
                <span>+1 Daqiiqo Tijaabi Codka</span>
              </button>
            </div>

            {/* Active Alarms List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#e9e1d6] flex items-center gap-1.5">
                <span>⏰</span>
                <span>Alaarmiyadaada ({(settings.alarms || []).length || 2})</span>
              </h3>

              {(settings.alarms && settings.alarms.length > 0
                ? settings.alarms.slice(0, 3)
                : [
                    {
                      id: 'sample_1',
                      time: '04:15',
                      label: 'Toosidda Salaadda Subax & Tahajud',
                      enabled: true,
                      sound: 'adhan' as const,
                      selectedVoice: 'alijaber' as AdhanVoice,
                      days: [],
                      createdAt: 1,
                    },
                    {
                      id: 'sample_2',
                      time: '12:00',
                      label: 'Xusuusinta Salaadda Duhur',
                      enabled: true,
                      sound: 'adhan' as const,
                      selectedVoice: 'badralturki' as AdhanVoice,
                      days: [],
                      createdAt: 2,
                    },
                  ]
              ).map((al) => {
                const vName =
                  SHEIKH_VOICES.find((v) => v.id === (al.selectedVoice || 'alijaber'))?.name ||
                  'Sh. Cali Jaabir';
                return (
                  <div
                    key={al.id}
                    className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl font-extrabold text-[#e9e1d6]">
                        {al.time}
                      </span>
                      <div className="w-11 h-6 rounded-full bg-[#4fdbc8] p-0.5 flex items-center justify-end">
                        <div className="w-5 h-5 rounded-full bg-white shadow" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#e9e1d6]">{al.label}</h4>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#221f18] text-[11px] text-[#E5C158]">
                        🕌 Aadaanka ({vName}) • Maalin walba
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E5C158]/15 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVoicePreview(al.selectedVoice || 'alijaber')
                        }
                        className="flex-1 py-2 rounded-xl bg-[#221f18] text-[#4fdbc8] text-xs font-bold cursor-pointer"
                      >
                        🔔 Tijaabi
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAlarmSheet(true)}
                        className="flex-1 py-2 rounded-xl bg-[#221f18] text-[#e9e1d6] text-xs font-bold cursor-pointer"
                      >
                        ✏️ Beddel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Sheet Preview ("Wax ka beddel Alaarm-ka") */}
            {showAlarmSheet && (
              <div className="rounded-3xl bg-[#221f18] border border-[#E5C158]/35 p-4 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#e9e1d6]">Wax ka beddel Alaarm-ka</h3>
                  <button
                    type="button"
                    onClick={() => setShowAlarmSheet(false)}
                    className="w-7 h-7 rounded-full bg-[#38342c] text-xs text-[#d0c5b1] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* 3-Column Scroll Wheel Time Picker */}
                <div className="rounded-2xl bg-[#110e08] p-4 flex items-center justify-center gap-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-[#99907d] uppercase block">Saacad</span>
                    <button
                      type="button"
                      onClick={() => setAlarmHour((h) => (h === 1 ? 12 : h - 1))}
                      className="block w-14 py-1 rounded-lg bg-[#221f18] text-xs text-[#99907d] cursor-pointer"
                    >
                      {String(alarmHour === 1 ? 12 : alarmHour - 1).padStart(2, '0')}
                    </button>
                    <div className="w-14 py-2 rounded-xl bg-[#ffde82] text-[#241a00] font-mono text-lg font-extrabold">
                      {String(alarmHour).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlarmHour((h) => (h === 12 ? 1 : h + 1))}
                      className="block w-14 py-1 rounded-lg bg-[#221f18] text-xs text-[#99907d] cursor-pointer"
                    >
                      {String(alarmHour === 12 ? 1 : alarmHour + 1).padStart(2, '0')}
                    </button>
                  </div>

                  <span className="text-xl font-bold text-[#ffde82] mt-4">:</span>

                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-[#99907d] uppercase block">Daqiiqad</span>
                    <button
                      type="button"
                      onClick={() => setAlarmMin((m) => (m === 0 ? 59 : m - 1))}
                      className="block w-14 py-1 rounded-lg bg-[#221f18] text-xs text-[#99907d] cursor-pointer"
                    >
                      {String(alarmMin === 0 ? 59 : alarmMin - 1).padStart(2, '0')}
                    </button>
                    <div className="w-14 py-2 rounded-xl bg-[#ffde82] text-[#241a00] font-mono text-lg font-extrabold">
                      {String(alarmMin).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlarmMin((m) => (m === 59 ? 0 : m + 1))}
                      className="block w-14 py-1 rounded-lg bg-[#221f18] text-xs text-[#99907d] cursor-pointer"
                    >
                      {String(alarmMin === 59 ? 0 : alarmMin + 1).padStart(2, '0')}
                    </button>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    {(['AM', 'PM'] as const).map((per) => (
                      <button
                        key={per}
                        type="button"
                        onClick={() => setAlarmAmPm(per)}
                        className={`block px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          alarmAmPm === per
                            ? 'bg-[#4fdbc8] text-[#00201c]'
                            : 'bg-[#221f18] text-[#99907d]'
                        }`}
                      >
                        {per}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days of week */}
                <div>
                  <span className="text-xs text-[#d0c5b1] block mb-1.5">Maalmaha Todobaadka</span>
                  <div className="grid grid-cols-7 gap-1.5">
                    {['Ax', 'Is', 'Ta', 'Ar', 'Kh', 'Ji', 'Sa'].map((d, idx) => {
                      const sel = alarmDays.includes(idx);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setAlarmDays((prev) =>
                              sel ? prev.filter((x) => x !== idx) : [...prev, idx]
                            )
                          }
                          className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                            sel
                              ? 'bg-[#ffde82] text-[#241a00]'
                              : 'bg-[#38342c] text-[#d0c5b1]'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sheikh voice selector with Daar / Dooro */}
                <div className="space-y-2">
                  <span className="text-xs text-[#d0c5b1] block">
                    Codka Aadaanka / Xusuusinta
                  </span>
                  {SHEIKH_VOICES.slice(0, 4).map((v) => {
                    const isSel = alarmVoice === v.id;
                    const isPl = playingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-[#16130c] border border-[#E5C158]/25 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#e9e1d6]">{v.name}</p>
                          <p className="text-[10px] text-[#4fdbc8]">
                            {isSel ? 'La Doortay' : v.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleVoicePreview(v.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#38342c] text-xs font-bold text-[#e9e1d6] cursor-pointer"
                          >
                            {isPl ? '⏹ Dami' : '▷ Daar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlarmVoice(v.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              isSel
                                ? 'bg-[#4fdbc8] text-[#00201c]'
                                : 'bg-[#221f18] text-[#d0c5b1]'
                            }`}
                          >
                            {isSel ? '✓ Dooro' : 'Dooro'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleSaveSampleAlarm}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#04b4a2] via-[#4fdbc8] to-[#ffde82] text-[#00201c] font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  KEYDI ALAARM-KA ✓
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 4: MAKTABADDA QURAANKA KARIIMKA & TAFSIIRKA                  */}
        {/* =================================================================== */}
        {activeScreen === 'quraan' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Surah Header Banner */}
            <div className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/30 p-5 text-center space-y-1.5 shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#E5C158]">
                MAKTABADDA QURAANKA KARIIMKA
              </span>
              <h1 className="text-xl font-extrabold text-white">
                Suuradda Al-Kahf <span className="text-[#E5C158]">(18)</span>
              </h1>
              <div className="font-serif text-2xl text-[#E5C158]">سُورَةُ الكهف</div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#221f18] text-[11px] text-[#d0c5b1]">
                  110 Aayadood
                </span>
                <span>•</span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#221f18] text-[11px] text-[#d0c5b1]">
                  Makki
                </span>
              </div>
            </div>

            {/* Reciter & Offline Pills */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveScreen('aadaan')}
                className="w-full p-3 rounded-xl bg-[#0B2933] border border-[#E5C158]/25 flex items-center justify-between text-xs font-bold text-white cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[#E5C158]">🎙️</span>
                  <span>{currentMasterSheikh.name}</span>
                </span>
                <span className="text-[#E5C158]">▾</span>
              </button>

              <div className="w-full py-2 px-3 rounded-xl bg-[#0B2933]/80 border border-[#4fdbc8]/30 text-center text-xs font-bold text-[#4fdbc8]">
                ☁️ 100% Offline Waa Diyaar ✓
              </div>
            </div>

            {/* Dual-Tab Audio Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0B2933] border border-[#E5C158]/25">
              <button
                type="button"
                onClick={() => setQuranTab('quraan')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quranTab === 'quraan'
                    ? 'bg-[#ffde82] text-[#241a00] shadow font-black'
                    : 'text-[#d0c5b1]'
                }`}
              >
                🎧 Dhagaysiga Quraanka
              </button>
              <button
                type="button"
                onClick={() => setQuranTab('tafsiir')}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quranTab === 'tafsiir'
                    ? 'bg-[#ffde82] text-[#241a00] shadow font-black'
                    : 'text-[#d0c5b1]'
                }`}
              >
                📚 Tafsiirka Soomaaliga
              </button>
            </div>

            {/* Ayah Cards */}
            <div className="space-y-3">
              {SAMPLE_KAHF_AYAHS.map((ay) => {
                const isAct = selectedAyahNum === ay.num;
                return (
                  <div
                    key={ay.num}
                    onClick={() => setSelectedAyahNum(ay.num)}
                    className={`rounded-2xl p-4 transition cursor-pointer space-y-3 ${
                      isAct
                        ? 'bg-[#0B2933] border-2 border-[#E5C158] shadow-[0_0_20px_rgba(229,193,88,0.15)]'
                        : 'bg-[#1e1b14] border border-[#E5C158]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[#38342c] border border-[#E5C158]/40 text-xs font-bold text-[#ffde82]">
                        ☆ Aayadda {ay.num}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSampleQuranAudio();
                          }}
                          className="w-8 h-8 rounded-full bg-[#38342c] text-[#ffde82] flex items-center justify-center text-xs cursor-pointer"
                        >
                          🔊
                        </button>
                      </div>
                    </div>

                    <p
                      dir="rtl"
                      className="font-serif text-2xl leading-loose text-right text-white"
                    >
                      {ay.arabic}
                    </p>

                    <div className="pt-2 border-t border-[#E5C158]/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5C158] block">
                        MACNAHA SOOMAALIGA
                      </span>
                      <p className="text-xs text-[#e9e1d6] leading-relaxed">{ay.somali}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Glass Bottom Audio Player Deck */}
            <div className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/35 p-3.5 shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[#d0c5b1]">01:12</span>
                <span className="font-bold text-[#ffde82]">
                  Aayadda {selectedAyahNum}aad • Al-Kahf
                </span>
                <span className="font-mono text-[#d0c5b1]">05:45</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#221f18] text-xs font-bold text-[#d0c5b1]">
                  1.0x
                </span>
                <button
                  type="button"
                  onClick={handleToggleSampleQuranAudio}
                  className="w-12 h-12 rounded-full bg-[#ffde82] text-[#241a00] font-black text-base flex items-center justify-center shadow-lg cursor-pointer"
                >
                  {isQuranPlaying ? '⏸' : '▶'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExitSample();
                    onOpenOriginalTab('salaad');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#221f18] border border-[#E5C158]/30 text-xs font-bold text-[#ffde82] cursor-pointer"
                >
                  📖 Fur 114 Suuradood
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 5: CODADKA DABEECADDA & NASASHADA (24/7 FOCUS MIXER)         */}
        {/* =================================================================== */}
        {activeScreen === 'dabeecad' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Hero Banner */}
            <div className="rounded-2xl bg-[#1e1b14] border border-[#E5C158]/25 p-5 space-y-3 shadow-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5C158]">
                🎧 TUKO • FOCUS MIXER
              </span>
              <h1 className="text-xl font-extrabold text-white">
                🌧️ Codadka Dabeecadda &amp; Nasashada
              </h1>
              <p className="text-xs text-[#4fdbc8] font-semibold">(24/7 Background)</p>
              <p className="text-xs text-[#d0c5b1] leading-relaxed">
                Isku dar codka roobka, shimbiraha, dabka iyo badda xilliga aad akhrinayso Quraanka,
                Adhkaarta ama hurdada.
              </p>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="px-3 py-1 rounded-full bg-[#0B2933] border border-[#4fdbc8]/40 text-xs font-bold text-[#4fdbc8]">
                  ● {activeAmbientCount} Cod Waa Shidan Yihiin
                </span>
                <button
                  type="button"
                  onClick={() => ambientSounds.stopAll()}
                  className="px-3 py-1 rounded-full bg-[#93000a]/60 border border-[#ffb4ab]/30 text-xs font-bold text-[#ffb4ab] cursor-pointer"
                >
                  ⏹ Jooji Dhammaan
                </button>
              </div>

              {/* Sleep Timer Pills */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-xs text-[#d0c5b1] mr-1">Timer:</span>
                {[
                  { label: '⏱️ 15d', mins: 15 },
                  { label: '⏱️ 30d', mins: 30 },
                  { label: '⏱️ 60d', mins: 60 },
                  { label: '♾️ 24/7', mins: null },
                ].map((tm) => (
                  <button
                    key={tm.label}
                    type="button"
                    onClick={() => ambientSounds.setSleepTimer(tm.mins)}
                    className="px-2.5 py-1 rounded-full bg-[#38342c] hover:bg-[#4fdbc8] hover:text-[#00201c] text-xs font-bold text-[#e9e1d6] transition cursor-pointer"
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#E5C158] uppercase tracking-wider">
                ✨ Presets-ka Degdegga ah
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {AMBIENT_PRESETS.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => ambientSounds.applyPreset(pr)}
                    className="px-3.5 py-2 rounded-xl bg-[#0B2933] border border-[#E5C158]/25 text-xs font-bold text-white whitespace-nowrap shrink-0 hover:border-[#ffde82] cursor-pointer"
                  >
                    {pr.icon} {pr.nameSo}
                  </button>
                ))}
              </div>
            </div>

            {/* 8 Sound Mixer Cards */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#e9e1d6]">
                ||| Mixer-ka Codadka (8 Qeybood)
              </h3>
              {AMBIENT_SOUNDS.map((snd) => {
                const isAct = !!ambientState.activeSounds[snd.id as AmbientSoundId];
                const vol = Math.round(
                  (ambientState.volumes[snd.id as AmbientSoundId] ?? snd.defaultVolume) * 100
                );

                return (
                  <div
                    key={snd.id}
                    className={`rounded-2xl p-4 border transition space-y-3 ${
                      isAct
                        ? 'bg-[#0B2933] border-2 border-[#4fdbc8] shadow-[0_0_15px_rgba(79,219,200,0.15)]'
                        : 'bg-[#1e1b14] border-[#E5C158]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#38342c] flex items-center justify-center text-lg">
                          {snd.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{snd.nameSo}</h4>
                          <p className="text-xs text-[#4fdbc8]">{snd.subtitleSo}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => ambientSounds.toggleSound(snd.id as AmbientSoundId)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isAct
                            ? 'bg-[#4fdbc8]/20 border border-[#4fdbc8] text-[#4fdbc8]'
                            : 'bg-[#38342c] text-[#E5C158]'
                        }`}
                      >
                        {isAct ? '⏹ Dami' : '▷ Daar'}
                      </button>
                    </div>

                    {isAct && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs">🔊</span>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          value={vol}
                          onChange={(e) =>
                            ambientSounds.setSoundVolume(
                              snd.id as AmbientSoundId,
                              Number(e.target.value) / 100
                            )
                          }
                          className="flex-1 accent-[#4fdbc8] cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-[#4fdbc8] w-9 text-right">
                          {vol}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 6: ADHKAARTA SUBAXA, GALABTA & TASBIIXDA                     */}
        {/* =================================================================== */}
        {activeScreen === 'adhkaar' && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h1 className="text-lg font-bold text-[#E5C158]">Adhkaarta &amp; Tasbiixda</h1>
              <p className="text-xs text-[#d0c5b1]">Xusuusta Alle &amp; حصن المسلم</p>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdhkarTab('subax');
                  setAdhkarIdx(0);
                  setAdhkarTapCount(0);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
                  adhkarTab === 'subax'
                    ? 'bg-[#ffde82] text-[#241a00] font-black'
                    : 'bg-[#221f18] text-[#d0c5b1] border border-[#E5C158]/25'
                }`}
              >
                🌅 Adhkaarta Subaxa
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdhkarTab('galab');
                  setAdhkarIdx(2);
                  setAdhkarTapCount(0);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
                  adhkarTab === 'galab'
                    ? 'bg-[#ffde82] text-[#241a00] font-black'
                    : 'bg-[#221f18] text-[#d0c5b1] border border-[#E5C158]/25'
                }`}
              >
                🌙 Adhkaarta Galabta
              </button>
            </div>

            {/* Interactive Dhikr Card */}
            {(() => {
              const item = SAMPLE_ADHKAR_LIST[adhkarIdx] || SAMPLE_ADHKAR_LIST[0];
              return (
                <div className="rounded-3xl bg-[#0B2933] border border-[#E5C158]/30 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E5C158]">
                      ADHKAARTA {adhkarIdx + 1} / {SAMPLE_ADHKAR_LIST.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#221f18] border border-[#4fdbc8]/30 text-[11px] text-[#4fdbc8]">
                      ✨ Fadli leh
                    </span>
                  </div>

                  <p className="text-xs italic text-[#d0c5b1]">{item.fadhil}</p>

                  <div className="rounded-2xl bg-[#110e08] border border-[#E5C158]/20 p-4 space-y-3">
                    <p
                      dir="rtl"
                      className="font-serif text-xl leading-loose text-center text-[#E5C158]"
                    >
                      {item.arabic}
                    </p>
                    <hr className="border-[#E5C158]/15" />
                    <p className="text-xs italic text-[#d0c5b1]">{item.translit}</p>
                    <p className="text-xs text-white leading-relaxed">{item.somali}</p>
                  </div>

                  {/* Giant Tactile Gold Counter Ring */}
                  <div className="flex flex-col items-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (adhkarTapCount + 1 >= item.target) {
                          setAdhkarTapCount(0);
                          setAdhkarIdx((i) => (i + 1) % SAMPLE_ADHKAR_LIST.length);
                        } else {
                          setAdhkarTapCount((c) => c + 1);
                        }
                      }}
                      className="w-28 h-28 rounded-full bg-[#221f18] border-4 border-[#E5C158] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(229,193,88,0.25)] active:scale-95 transition cursor-pointer"
                    >
                      <span className="text-2xl font-extrabold text-[#ffde82]">
                        {adhkarTapCount}
                      </span>
                      <span className="text-xs text-[#d0c5b1]">/ {item.target} jeer</span>
                    </button>
                    <span className="text-xs text-[#d0c5b1] mt-2">👆 Riix si aad u tiriso</span>
                  </div>
                </div>
              );
            })()}

            {/* Digital Tasbeeh Widget Below */}
            <div className="rounded-3xl bg-[#221f18] border border-[#E5C158]/25 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#e9e1d6]">♾️ Tasbiixda Dijitaalka ah</h3>
                <span className="px-2.5 py-1 rounded-full bg-[#110e08] border border-[#E5C158]/30 text-xs font-bold text-[#E5C158]">
                  Wadarta: {lifetimeTasbeeh.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['Subhaanallaah', 'Alxamdulillaah', 'Allaahu Akbar'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => setTasbeehPhrase(ph)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                      tasbeehPhrase === ph
                        ? 'bg-[#ffde82] text-[#241a00]'
                        : 'bg-[#110e08] text-[#d0c5b1]'
                    }`}
                  >
                    {ph} (33)
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-[#110e08] p-5 flex flex-col items-center space-y-4">
                <div className="w-36 h-36 rounded-full border-4 border-dashed border-[#E5C158]/60 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-[#ffde82]">{tasbeehCount}</span>
                  <span className="text-xs text-[#d0c5b1]">Hadafka: 33</span>
                </div>

                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTasbeehCount(0)}
                    className="px-4 py-3 rounded-xl bg-[#221f18] text-xs font-bold text-[#d0c5b1] cursor-pointer"
                  >
                    ↺ Dib u deji
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTasbeehCount((c) => c + 1);
                      setLifetimeTasbeeh((l) => l + 1);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#ffde82] text-[#241a00] font-extrabold text-xs shadow-lg active:scale-95 transition cursor-pointer"
                  >
                    📿 Riix Tasbiixda
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 7: QIBLADA, MASAAJIDDA, SOONKA & ZAKADA                      */}
        {/* =================================================================== */}
        {activeScreen === 'qibla' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h1 className="text-lg font-bold text-[#E5C158]">
                Jiheeyaha Qiblada &amp; Cibaadada
              </h1>
              <p className="text-xs text-[#d0c5b1]">
                Goobta saxda ah &amp; Adeegyada Cibaadada
              </p>
            </div>

            {/* 3D Gold & Emerald Qibla Compass Card */}
            <div className="rounded-3xl bg-[#0B2933] border border-[#E5C158]/30 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#E5C158]">🧭 294° NW</span>
                <span className="px-2.5 py-1 rounded-full bg-[#110e08] text-[11px] text-[#4fdbc8]">
                  Makkah Al-Mukarramah
                </span>
              </div>

              <div className="flex justify-center py-2">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-[#E5C158]/40 flex items-center justify-center relative bg-[#110e08]/80 shadow-inner">
                  <span className="absolute top-2 text-xs font-bold text-white">N</span>
                  <span className="absolute bottom-2 text-xs font-bold text-white">S</span>
                  <span className="absolute left-2 text-xs font-bold text-white">W</span>
                  <span className="absolute right-2 text-xs font-bold text-white">E</span>
                  <div className="w-24 h-1 bg-gradient-to-r from-[#4fdbc8] to-[#ffde82] -rotate-45 rounded-full flex items-center justify-start">
                    <span className="text-base -ml-2">🕋</span>
                  </div>
                </div>
              </div>

              <div className="py-2 px-3 rounded-xl bg-[#110e08]/70 border border-[#4fdbc8]/30 text-center text-xs font-bold text-[#4fdbc8]">
                ✓ Waad ku toosan tahay Kacbada!
              </div>

              <div className="flex items-center justify-between text-xs text-[#d0c5b1]">
                <span>📍 {settings.cityName} → Makkah</span>
                <span className="font-bold text-white">1,945 km</span>
              </div>
            </div>

            {/* Fasting & Qadaa Tracker Card */}
            <div className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Raadraaca Soonka &amp; Qallaha</h3>
                  <p className="text-xs text-[#d0c5b1]">Sunnah &amp; Qadaa Tracker</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#221f18] text-xs font-bold text-[#4fdbc8]">
                  2/3 Maalmood
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#110e08]/60 border border-[#E5C158]/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Tirada Qallaha (Missed)</p>
                  <p className="text-[11px] text-[#d0c5b1]">Salaadaha lagu leeyahay</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMissedCount((m) => Math.max(0, m - 1))}
                    className="w-8 h-8 rounded-lg bg-[#38342c] text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-sm font-bold text-[#ffde82] w-5 text-center">
                    {missedCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMissedCount((m) => m + 1)}
                    className="w-8 h-8 rounded-lg bg-[#ffde82] text-[#241a00] font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Zakat Calculator Summary Card */}
            <div className="rounded-2xl bg-[#0B2933] border border-[#E5C158]/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Xisaabiyaha Zakada</h3>
                  <p className="text-xs text-[#d0c5b1]">Gold, Silver &amp; Cash Nisab</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#4fdbc8]/15 text-xs font-bold text-[#4fdbc8]">
                  Nisabka buuxaa ✓
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#110e08]/60 border border-[#E5C158]/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#d0c5b1]">Zakada sanadkan la bixinayo</p>
                  <p className="text-base font-extrabold text-[#ffde82]">$45.50 USD</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onExitSample();
                    onOpenOriginalTab('zakat');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#ffde82] text-[#241a00] font-bold text-xs cursor-pointer"
                >
                  Xisaabi Zako
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* STITCH FLOATING GLASS BOTTOM NAVIGATION BAR                           */}
      {/* ===================================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#16130c]/95 backdrop-blur-xl border-t border-[#E5C158]/25 pb-safe">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          {[
            { id: 'hoyga' as StitchScreenId, label: 'Hoyga', icon: '🏠' },
            { id: 'aadaan' as StitchScreenId, label: 'Aadaan', icon: '🕌' },
            { id: 'quraan' as StitchScreenId, label: 'Quraan', icon: '📖' },
            { id: 'dabeecad' as StitchScreenId, label: 'Dabeecad', icon: '🌧️' },
            { id: 'adhkaar' as StitchScreenId, label: 'Adhkaar', icon: '📿' },
            { id: 'qibla' as StitchScreenId, label: 'Qibla', icon: '🧭' },
          ].map((nav) => {
            const isAct = activeScreen === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveScreen(nav.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  isAct
                    ? 'bg-[#3d3930]/60 text-[#ffde82] font-bold'
                    : 'text-[#d0c5b1] hover:text-white'
                }`}
              >
                <span className="text-base">{nav.icon}</span>
                <span className="text-[10px]">{nav.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      </>
      )}
    </div>
  );
};
