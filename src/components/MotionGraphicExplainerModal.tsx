import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Film,
  X,
  Compass,
  BookOpen,
  Clock,
  Flame,
  Calendar,
  CheckSquare,
  Download,
  Users,
  Bell,
  Navigation,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Tv,
} from 'lucide-react';

interface MotionGraphicExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMobileInstall?: () => void;
}

interface Scene {
  id: number;
  title: string;
  shortTitle: string;
  badge: string;
  duration: number; // in seconds
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  voiceoverText: string;
  captionText: string;
  keyPoints: string[];
}

const SCENES: Scene[] = [
  {
    id: 1,
    title: 'Hordhac & Soo Dhawaynta Tuko',
    shortTitle: 'Hordhac',
    badge: 'Bilowga',
    duration: 8,
    color: 'from-emerald-500 to-teal-400',
    icon: Sparkles,
    voiceoverText:
      "Kusoo dhawoow Tuko – App-ka casriga ah ee Soomaaliyeed ee loogu talagalay ilaalinta shanta salaadood, akhriska Qur'aanka, adkaarta subax iyo galab, iyo maareynta cibaadooyinkaaga!",
    captionText: '🌟 TUKO: App-ka Casriga ah ee Ilaalinta Salaadda, Adkaarta & Qur’aanka',
    keyPoints: [
      'Waqtiyo toos ah oo ku saleysan magaalooyinka Soomaaliya',
      'Codadka 8 Shiiq oo caan ah oo Aadaanka ku aqriya',
      'Isku-xirnaan toos ah oo Mobile, Tablet iyo Laptop ah',
    ],
  },
  {
    id: 2,
    title: 'Diiwaangelinta & Xulashada Jinsiga',
    shortTitle: 'Diiwaangelin',
    badge: 'Xogtaada 0',
    duration: 8,
    color: 'from-cyan-500 to-blue-500',
    icon: Users,
    voiceoverText:
      'Marka aad app-ka soo gasho, waxaad ku samaynaysaa diiwaangelin degdeg ah. Xogtaadu waxay ka bilaabanaysaa eber (0), waxaadna dooranaysaa Wiil ama Gabar si app-ku kuugu habeeyo cibaadooyinka gaarka kuu ah!',
    captionText: '👤 Xogtaadu waa 100% mid gaar kuu ah oo ku keydsan Cloud Database',
    keyPoints: [
      'Qof kasta xogtiisa waa gooni oo qof kale kuma dhex qasanto',
      'Xulashada Wiil / Gabar oo habaynaysa cibaadadaada',
      'Waxaad kala socon kartaa qalab kasta oo aad gasho',
    ],
  },
  {
    id: 3,
    title: 'Shanta Salaadood & Aadaanka Tooska ah',
    shortTitle: 'Salaadaha',
    badge: '5-ta Salaadood',
    duration: 9,
    color: 'from-teal-500 to-emerald-400',
    icon: Compass,
    voiceoverText:
      'Ka eego waqtiyada saxda ah ee Fajr, Duhur, Casar, Maghrib iyo Cishaa. App-ku wuxuu si toos ah kuu siinayaa tirada daqiiqadaha kaaga dhiman salaad kasta, waxaadna ku dhagaysan kartaa Aadaanka nool.',
    captionText: '🕌 Waqtiyada rasmiga ah ee Muqdisho, Hargeysa, Garoowe, Kismaayo & magaalooyin kale',
    keyPoints: [
      'Xisaabinta tooska ah ee daqiiqadaha salaadda xigta',
      'Aadaanka oo toos uga dhacaya taleefankaaga',
      'Xaqiijinta salaadda aad tukatay (Jameeco, Kaligaa ama Qadaa)',
    ],
  },
  {
    id: 4,
    title: 'Qadaa Tracker & 30-Day Khatm Planner',
    shortTitle: 'Qadaa & Khatm',
    badge: 'Cusub',
    duration: 9,
    color: 'from-amber-500 to-orange-400',
    icon: Calendar,
    voiceoverText:
      'Miyaa salaad ama soon ku dhaafay? Tuko waxay kuu xisaabinaysaa tirada maalmaha soonka ama salaadaha qadaada ah ee kugu waajibay, gaar ahaan gabdhaha bisha Ramadaan kadib. Sidoo kale waxaad helaysaa jadwalka 30-ka maalmood ee Khatinka Qur’aanka!',
    captionText: '📿 Qadaa Tracker: La soco soonka & salaadaha kugu dhaafay oo qalleey',
    keyPoints: [
      'Qadaa Salaad & Soonka Ramadaan oo leh xisaabiye (+ / -)',
      'Jadwalka Khatinka Qur’aanka (30-Day Khatm Planner)',
      'Inta bog ee aad salaad kasta kadib akhrinayso',
    ],
  },
  {
    id: 5,
    title: 'Adkaarta, Tasbiixda & Jiheeyaha Qiblada',
    shortTitle: 'Adkaar & Qibla',
    badge: 'Dikriga',
    duration: 8,
    color: 'from-purple-500 to-pink-500',
    icon: Navigation,
    voiceoverText:
      'Akhriso adkaarta subax iyo galab oo Carabi iyo Soomaali fasiraad ah wata, isticmaal Tasbiixda casriga ah ee gariirka leh, oo soo saar Jiheeyaha Qiblada ee 3D-ga ah si aad u ogaato jihada saxda ah ee Kacbada.',
    captionText: '🧭 Qibla Compass toos ah & Tasbeeh Dijitaal ah oo gariiraya',
    keyPoints: [
      'Adkaarta subax, galab iyo hurdada oo micno buuxa leh',
      'Tasbeeh taabasho leh oo gariiraya markaad 33 ama 100 gaarto',
      'Jiheeyaha Qiblada ee tooska ah meel kasta oo aad joogto',
    ],
  },
  {
    id: 6,
    title: 'To-Do List-ka & Alaarm-ka Mobile-ka',
    shortTitle: 'Hawlaha & Alaarm',
    badge: 'Abaabulka',
    duration: 9,
    color: 'from-indigo-500 to-teal-400',
    icon: CheckSquare,
    voiceoverText:
      'Qorsheyso hawlahaaga maalinlaha ah adigoo adeegsanaya To-Do List-ka casriga ah. Ku dar saacadda xusuusinta (Due Time), sawirro, tags gaar ah, oo daji Alaarm-ka Mobile-ka si aadan u seegin Salaadda Tahajjudka ama Fajarka!',
    captionText: '⏰ To-Do List & Alaarm Mobile leh 12-Hour AM/PM picker iyo Timer',
    keyPoints: [
      'To-Do List leh saacadda hawsha (Due Time ⏰) iyo xusuusin',
      'Alaarmyo gaar ah oo leh codadka adhaanka iyo digtoonaan',
      'Xulashada saacadda 12-Hour AM/PM iyo Countdown Timer',
    ],
  },
  {
    id: 7,
    title: 'Soo Degsashada & Isku-xirka Qalabka',
    shortTitle: 'Soo Degso',
    badge: 'PWA Install',
    duration: 9,
    color: 'from-emerald-400 to-cyan-400',
    icon: Download,
    voiceoverText:
      'Tuko uma baahna Play Store ama lacag bixin! Kaliya ka fur link-ga Google Chrome ama Safari, riix "Soo Dagso App-ka" ama "Add to Home Screen", wuxuuna kuugu degayaa taleefankaaga sidii app caadi ah!',
    captionText: '📲 Toos ugu shubo Android ama iPhone adigoo adeegsanaya 1 Gujis!',
    keyPoints: [
      'Bilaash 100% – wax lacag ah ama xayaysiis dhib leh kuma jiraan',
      'Kuma xirna Play Store / App Store – toos ayuu kuugu degayaa',
      'Xogtu si toos ah ayay isugu waafaqaysaa Mobile & Tablet',
    ],
  },
];

export const MotionGraphicExplainerModal: React.FC<MotionGraphicExplainerModalProps> = ({
  isOpen,
  onClose,
  onOpenMobileInstall,
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sceneProgress, setSceneProgress] = useState<number>(0); // 0 to 100
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'phone' | 'widescreen'>('phone');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const activeScene = SCENES[currentSceneIndex] || SCENES[0];
  const audioContextRef = useRef<AudioContext | null>(null);

  // Export and download real HD video using canvas and MediaRecorder
  const handleExportVideo = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(5);
    setDownloadSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      const isReel = viewMode === 'phone';
      canvas.width = isReel ? 720 : 1280;
      canvas.height = isReel ? 1280 : 720;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof MediaRecorder === 'undefined') {
        throw new Error('Canvas or MediaRecorder not supported');
      }

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm';
      let fileExt = 'webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
          fileExt = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          fileExt = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
          fileExt = 'webm';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
          fileExt = 'webm';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tuko_Muuqaalka_Sharraxaadda_Appka_${isReel ? '9x16_Reel' : '16x9_HD'}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        setIsExporting(false);
        setExportProgress(100);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 9000);
      };

      recorder.start();

      const fps = 30;
      const secondsPerScene = 1.2;
      const totalFrames = SCENES.length * secondsPerScene * fps;
      let frame = 0;

      const renderLoop = () => {
        if (frame >= totalFrames) {
          recorder.stop();
          return;
        }

        const sceneIndex = Math.min(SCENES.length - 1, Math.floor(frame / (secondsPerScene * fps)));
        const scene = SCENES[sceneIndex];
        const W = canvas.width;
        const H = canvas.height;

        // Background
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#021815');
        grad.addColorStop(0.5, '#04221d');
        grad.addColorStop(1, '#010c0a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Header
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold ' + (isReel ? '28px' : '24px') + ' sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("☪ TUKO APP — HAGAHA MUUQAALKA", W / 2, isReel ? 65 : 45);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 ' + (isReel ? '18px' : '15px') + ' sans-serif';
        ctx.fillText(`QAYBTA ${scene.id} ee ${SCENES.length}: ${scene.title.toUpperCase()}`, W / 2, isReel ? 100 : 72);

        // Card
        const padX = isReel ? 40 : 180;
        const cardY = isReel ? 140 : 100;
        const cardW = W - padX * 2;
        const cardH = isReel ? H - 360 : H - 220;

        ctx.fillStyle = 'rgba(6, 38, 33, 0.9)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(padX, cardY, cardW, cardH, 20);
        else ctx.rect(padX, cardY, cardW, cardH);
        ctx.fill();
        ctx.stroke();

        // Scene Title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold ' + (isReel ? '36px' : '30px') + ' sans-serif';
        ctx.fillText(scene.title, W / 2, cardY + (isReel ? 110 : 75));

        // Key points
        const bulletStartY = cardY + (isReel ? 180 : 130);
        const bulletGap = isReel ? 65 : 50;
        scene.keyPoints.forEach((point, pIdx) => {
          const by = bulletStartY + pIdx * bulletGap;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(padX + 24, by, cardW - 48, isReel ? 48 : 40, 10);
          else ctx.rect(padX + 24, by, cardW - 48, isReel ? 48 : 40);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold ' + (isReel ? '20px' : '16px') + ' sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText("✓", padX + 40, by + (isReel ? 30 : 25));

          ctx.fillStyle = '#f1f5f9';
          ctx.font = '600 ' + (isReel ? '18px' : '15px') + ' sans-serif';
          ctx.fillText(point, padX + 68, by + (isReel ? 30 : 25));
        });

        // Bottom Box
        const subY = H - (isReel ? 180 : 100);
        ctx.fillStyle = 'rgba(2, 20, 17, 0.95)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(30, subY, W - 60, isReel ? 140 : 80, 16);
        else ctx.rect(30, subY, W - 60, isReel ? 140 : 80);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold ' + (isReel ? '18px' : '15px') + ' sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(scene.captionText, W / 2, subY + (isReel ? 40 : 30));

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 ' + (isReel ? '14px' : '12px') + ' sans-serif';
        ctx.fillText(scene.voiceoverText.slice(0, 75) + '...', W / 2, subY + (isReel ? 80 : 55));

        frame++;
        setExportProgress(Math.round((frame / totalFrames) * 100));
        setTimeout(renderLoop, 1000 / fps);
      };

      renderLoop();
    } catch {
      setIsExporting(false);
      const a = document.createElement('a');
      a.href = '/tuko_motion_graphic_video.html';
      a.download = 'tuko_motion_graphic_video.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Play subtle futuristic chime when scene changes
  const playSceneChime = () => {
    if (isMuted || !audioEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Audio autoplay restrictions gracefully handled
    }
  };

  // Speak voiceover text if SpeechSynthesis is supported
  const speakSceneVoiceover = (text: string) => {
    if (isMuted || !audioEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playbackSpeed * 0.95;
        utterance.pitch = 1.0;
        // Check for Somali / Arabic / English voice fallbacks
        const voices = window.speechSynthesis.getVoices();
        const somaliVoice = voices.find((v) => v.lang.startsWith('so'));
        const arabicVoice = voices.find((v) => v.lang.startsWith('ar'));
        if (somaliVoice) utterance.voice = somaliVoice;
        else if (arabicVoice) utterance.voice = arabicVoice;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  // Timer loop for auto-playing scenes
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    playSceneChime();
    speakSceneVoiceover(activeScene.voiceoverText);

    if (!isPlaying) return;

    setSceneProgress(0);
    const intervalMs = 100;
    const totalSteps = (activeScene.duration * 1000) / intervalMs / playbackSpeed;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      const progress = Math.min(100, (step / totalSteps) * 100);
      setSceneProgress(progress);

      if (step >= totalSteps) {
        clearInterval(timer);
        // Move to next scene or loop
        if (currentSceneIndex < SCENES.length - 1) {
          setCurrentSceneIndex((prev) => prev + 1);
        } else {
          // Finished all scenes, loop back to start
          setCurrentSceneIndex(0);
        }
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, currentSceneIndex, isPlaying, playbackSpeed, isMuted, audioEnabled]);

  // Handle scene navigation
  const goToNextScene = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentSceneIndex < SCENES.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else {
      setCurrentSceneIndex(0);
    }
    setSceneProgress(0);
  };

  const goToPrevScene = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
    } else {
      setCurrentSceneIndex(SCENES.length - 1);
    }
    setSceneProgress(0);
  };

  const handleCopyFullScript = () => {
    const fullScript = SCENES.map((scene, idx) => {
      return `【 SCENE ${idx + 1}: ${scene.title.toUpperCase()} 】 (${scene.duration} ilbiriqsi)\n` +
        `• Cinwaanka: ${scene.captionText}\n` +
        `• Waxa shaashadda ka muuqanaya:\n  - ${scene.keyPoints.join('\n  - ')}\n` +
        `• Codka aad ku hadlayso (Voiceover Script):\n"${scene.voiceoverText}"\n`;
    }).join('\n=========================================\n\n');

    const formattedOutput = `🎬 TUKO APP – MOTION GRAPHIC VIDEO SCRIPT & STORYBOARD 🎬\n\n` +
      `Muddada Guud ee Muuqaalka: ~60 Ilbiriqsi (Ku habboon TikTok, Reels, Shorts & WhatsApp)\n` +
      `Link-ga App-ka: https://ais-pre-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app\n\n` +
      `=========================================\n\n` +
      fullScript;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(formattedOutput);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    }
  };

  const handleShareApp = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-zathqh3ckbj7oz5llab6vx-688840257301.europe-west2.run.app';
    const text = '🌟 Daawo oo soo degso App-ka casriga ah ee Tuko (Salaadaha, Adkaarta & Qur’aanka): ' + shareUrl;
    if (navigator.share) {
      navigator.share({ title: 'Tuko App Tour', text, url: shareUrl }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-gradient-to-br from-[#021f1b] via-[#042823] to-[#011412] border border-emerald-500/35 p-3 sm:p-6 text-white shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-500/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-slate-950 font-black">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                  Muuqaalka Sharraxaadda App-ka
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    Motion Graphic
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                Sida app-ku u shaqeeyo • Muuqaal toos ah oo 7 qeybood ka kooban
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle: Phone Reel (9:16) vs Landscape (16:9) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('phone')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-bold ${
                  viewMode === 'phone'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Muuqaalka Taleefanka (TikTok / Reels 9:16)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Reel (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('widescreen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-bold ${
                  viewMode === 'widescreen'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Muuqaalka Ballaran (Widescreen 16:9)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Ballaaran (16:9)</span>
              </button>
            </div>

            {/* Download Video Button */}
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 transition active:scale-95 cursor-pointer disabled:opacity-60"
              title="Soo degso muuqaalka oo buuxa (HD MP4 / WebM)"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isExporting ? `Duubayaa (${exportProgress}%)...` : 'Soo Degso Video'}</span>
            </button>

            {/* Standalone Player External Link */}
            <a
              href="/tuko_motion_graphic_video.html"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
              title="Ka fur daaqad cusub oo buuxda"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </a>

            {/* Copy Script Button */}
            <button
              type="button"
              onClick={handleCopyFullScript}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-950/70 hover:bg-teal-900 border border-teal-500/30 text-teal-300 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Nuqul ka qaad qoraalka muuqalka (Copy Voiceover Script)"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedScript ? 'Waa la guuriyay!' : 'Nuqul Script'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                onClose();
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
              aria-label="Xir"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Direct Download & Device Save Bar */}
        <div className="mt-2.5 mb-1.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-900/60 to-slate-900 border-2 border-emerald-400/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div>
              <p className="text-xs font-black text-emerald-200">
                Toos ugu shubo Taleefanka / Kumbuyuutarka (Video HD):
              </p>
              <p className="text-[11px] text-teal-200/80">
                Muuqaalka Sharraxaadda oo buuxa ku degso 1 gujis — wuxuu toos ugu dhacayaa Gallery-ga / Downloads-kaaga!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-60 ring-2 ring-emerald-300/50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isExporting ? `Duubayaa Video-ga (${exportProgress}%)...` : '⬇️ SOO DEGSO VIDEO-GA BUUXA EE SHARRAXAADDA'}</span>
            </button>
          </div>
        </div>

        {/* Download Success Confirmation Toast */}
        {downloadSuccess && (
          <div className="mb-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Guul!</strong> Muuqaalku wuxuu toos ugu degay faylashaada (Downloads/Gallery). Waxaad hadda toos u gelin kartaa CapCut ama TikTok!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadSuccess(false)}
              className="text-emerald-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Video Stage Area */}
        <div className="relative flex-1 overflow-y-auto min-h-0 my-3 flex flex-col items-center justify-center">
          {/* Active Scene Display Container */}
          <div
            className={`w-full transition-all duration-300 flex flex-col items-center justify-center ${
              viewMode === 'phone' ? 'max-w-md' : 'max-w-3xl'
            }`}
          >
            {/* Phone Screen Mockup Wrapper */}
            <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-900 via-[#031d19] to-slate-950 border-4 border-slate-700/60 shadow-2xl overflow-hidden p-3 sm:p-5 flex flex-col justify-between min-h-[340px] sm:min-h-[420px]">
              {/* Phone Speaker Notch & Live Indicator */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>QAYBTA {activeScene.id} / {SCENES.length}</span>
                </div>
                {/* Simulated Phone Notch */}
                <div className="w-20 h-3 rounded-full bg-slate-800/80 mx-auto" />
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-teal-300">{activeScene.shortTitle}</span>
                </div>
              </div>

              {/* Dynamic Animated Content Per Scene */}
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-2">
                {/* Scene 1: Welcome & Brand Logo */}
                {activeScene.id === 1 && (
                  <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-1 flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-3 animate-pulse">
                      <div className="w-full h-full rounded-[22px] bg-[#021f1b] flex items-center justify-center">
                        <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 mb-1">
                      TUKO
                    </h3>
                    <p className="text-xs sm:text-sm text-teal-200 font-semibold mb-3">
                      App-ka Casriga ah ee Ilaalinta Salaadaha &amp; Adkaarta
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                        ✓ Waqtiyada Soomaaliya
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
                        ✓ 8 Cod Aadaan
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                        ✓ Cloud Database
                      </span>
                    </div>
                  </div>
                )}

                {/* Scene 2: Auth & Gender Selection */}
                {activeScene.id === 2 && (
                  <div className="animate-in fade-in-50 duration-500 flex flex-col items-center w-full max-w-sm">
                    <div className="flex items-center gap-4 mb-4">
                      {/* Wiil Card */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-950/80 to-blue-900/40 border-2 border-blue-400/50 flex flex-col items-center shadow-lg transform -rotate-2 hover:rotate-0 transition">
                        <span className="text-3xl mb-1">👦</span>
                        <span className="text-xs font-bold text-blue-300">Wiil</span>
                        <span className="text-[10px] text-blue-200/70">Jameeco &amp; Masjid</span>
                      </div>
                      {/* Gabar Card */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-pink-950/80 to-pink-900/40 border-2 border-pink-400/60 flex flex-col items-center shadow-lg transform rotate-2 hover:rotate-0 transition">
                        <span className="text-3xl mb-1">🧕</span>
                        <span className="text-xs font-bold text-pink-300">Gabar</span>
                        <span className="text-[10px] text-pink-200/70">Soon &amp; Qadaa</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-left w-full text-xs">
                      <div className="flex items-center justify-between text-cyan-300 font-bold mb-1">
                        <span>Diiwaangelin Cusub</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Eber (0) ka bilaabata</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        Xogtaadu waa mid sugan oo gaar ah, qof kale xogtiisana ma dhex gasho.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scene 3: Salaadaha & Aadaanka */}
                {activeScene.id === 3 && (
                  <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center w-full max-w-sm">
                    <div className="grid grid-cols-5 gap-1.5 w-full mb-3">
                      {[
                        { name: 'Fajr', time: '04:30', active: false },
                        { name: 'Duhur', time: '11:48', active: true },
                        { name: 'Casar', time: '15:10', active: false },
                        { name: 'Maghrib', time: '17:52', active: false },
                        { name: 'Cishaa', time: '19:02', active: false },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className={`p-2 rounded-xl flex flex-col items-center text-center transition ${
                            item.active
                              ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 font-bold scale-105 shadow-lg shadow-emerald-500/30'
                              : 'bg-slate-900/80 border border-white/5 text-slate-300'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold">{item.name}</span>
                          <span className="text-xs font-extrabold">{item.time}</span>
                          {item.active && <span className="text-[9px] bg-slate-950/20 px-1 rounded mt-0.5">Hadda</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 w-full text-left">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Bell className="w-4 h-4 animate-bounce" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-300">Codadka Aadaanka (8 Shiiq)</div>
                        <div className="text-[11px] text-slate-300">Makkah, Madinah, Qudus, Al-Afasy &amp; Fajr gaar ah</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scene 4: Qadaa Tracker & 30-Day Khatm */}
                {activeScene.id === 4 && (
                  <div className="animate-in fade-in-50 duration-500 flex flex-col items-center w-full max-w-sm">
                    <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
                      {/* Qadaa Counter Mockup */}
                      <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-left">
                        <div className="text-[11px] font-bold text-amber-300 mb-1 flex items-center justify-between">
                          <span>Qadaa Soon</span>
                          <span className="px-1.5 py-0.5 bg-amber-500/20 rounded text-[9px]">Gabdho &amp; Guud</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-2xl font-black text-white">4</span>
                          <div className="flex items-center gap-1">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                              -
                            </span>
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
                              +
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">Maalmood baa kuu dhiman</span>
                      </div>

                      {/* Khatm 30-Day Planner */}
                      <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/40 text-left">
                        <div className="text-[11px] font-bold text-teal-300 mb-1 flex items-center justify-between">
                          <span>30-Day Khatm</span>
                          <span className="px-1.5 py-0.5 bg-teal-500/20 rounded text-[9px]">Qur'aan</span>
                        </div>
                        <div className="text-2xl font-black text-white mt-2">4 Bog</div>
                        <span className="text-[10px] text-slate-400">Salaad kasta kadib akhriso</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-900/80 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 text-center">
                      Ka faa'iideyso qorsheynta saxda ah si aad ugu dhammeysato bisha!
                    </div>
                  </div>
                )}

                {/* Scene 5: Adkaar, Tasbeeh & Qibla */}
                {activeScene.id === 5 && (
                  <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center w-full max-w-sm">
                    <div className="flex items-center justify-around w-full mb-3">
                      {/* Rotating Compass Icon */}
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border-2 border-purple-400/50 flex items-center justify-center shadow-lg relative">
                          <Navigation className="w-7 h-7 text-purple-300 transform -rotate-45 animate-pulse" />
                        </div>
                        <span className="text-[11px] font-bold text-purple-300 mt-1">Qibla 3D</span>
                      </div>

                      {/* Digital Tasbeeh Counter */}
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white font-black text-base cursor-pointer transform hover:scale-110 active:scale-95 transition">
                          33
                        </div>
                        <span className="text-[11px] font-bold text-pink-300 mt-1">Tasbeeh</span>
                      </div>

                      {/* Adkaar Book */}
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-teal-950/70 border-2 border-teal-400/50 flex items-center justify-center shadow-lg">
                          <BookOpen className="w-7 h-7 text-teal-300" />
                        </div>
                        <span className="text-[11px] font-bold text-teal-300 mt-1">Adkaarta</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      Subax, Galab iyo Hurdo • Carabi &amp; Af-Soomaali • Jiheeyaha Kacbada
                    </p>
                  </div>
                )}

                {/* Scene 6: To-Do List & Mobile Alarm */}
                {activeScene.id === 6 && (
                  <div className="animate-in fade-in-50 duration-500 flex flex-col items-center w-full max-w-sm">
                    {/* Simulated To-Do item with due time & alarm */}
                    <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950/60 border border-teal-500/30 text-left mb-2.5 shadow-md">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-slate-950">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-xs font-bold text-white line-through opacity-70">
                            Akhrinta Suuratul Mulk
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">Diini</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-teal-200 mt-2">
                        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-lg border border-teal-500/20">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          09:30 PM (Alaarm)
                        </span>
                        <span className="text-slate-400">• Caawa</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300">
                      <span className="font-semibold text-teal-300">Alaarm-ka Mobile-ka:</span>
                      <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        12-Hour AM/PM + Timer
                      </span>
                    </div>
                  </div>
                )}

                {/* Scene 7: Cross-Device Sync & PWA Install */}
                {activeScene.id === 7 && (
                  <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center w-full max-w-sm">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-400/40 text-center">
                        <Smartphone className="w-8 h-8 text-emerald-300 mx-auto mb-1 animate-bounce" />
                        <span className="text-[10px] font-bold text-emerald-200">Mobile</span>
                      </div>
                      <div className="text-emerald-400 font-bold text-lg">⇄</div>
                      <div className="p-3 rounded-2xl bg-teal-950/80 border border-teal-400/40 text-center">
                        <Monitor className="w-8 h-8 text-teal-300 mx-auto mb-1" />
                        <span className="text-[10px] font-bold text-teal-200">Tablet &amp; PC</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenMobileInstall) onOpenMobileInstall();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/40 hover:brightness-110 active:scale-95 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Hadda Soo Degso (Install Tuko)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Caption & Voiceover Text Box */}
              <div className="mt-auto pt-2 border-t border-white/10 text-left">
                <div className="text-xs sm:text-sm font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <activeScene.icon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="line-clamp-1">{activeScene.captionText}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {activeScene.voiceoverText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div className="mt-auto pt-3 border-t border-emerald-500/20 shrink-0 space-y-2.5">
          {/* Progress Bar per Scene */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
              <span className="text-emerald-300 font-bold">{activeScene.title}</span>
              <span>
                {Math.round((activeScene.duration * sceneProgress) / 100)}s / {activeScene.duration}s
              </span>
            </div>
            {/* Timeline Multi-segment bar */}
            <div className="grid grid-cols-7 gap-1.5 w-full h-2 rounded-full overflow-hidden bg-black/40 p-0.5">
              {SCENES.map((scene, idx) => {
                let fillPercent = 0;
                if (idx < currentSceneIndex) fillPercent = 100;
                else if (idx === currentSceneIndex) fillPercent = sceneProgress;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setCurrentSceneIndex(idx);
                      setSceneProgress(0);
                    }}
                    className="relative w-full h-full rounded-full bg-white/10 overflow-hidden cursor-pointer hover:bg-white/20 transition"
                    title={`Qaybta ${scene.id}: ${scene.shortTitle}`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-100"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left Controls: Prev, Play/Pause, Next, Replay */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={goToPrevScene}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95"
                title="Qaybtii hore"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isPlaying) {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  } else {
                    speakSceneVoiceover(activeScene.voiceoverText);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black transition active:scale-95 shadow-md shadow-emerald-500/30"
                title={isPlaying ? 'Jooji (Pause)' : 'Daar (Play)'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
              </button>

              <button
                type="button"
                onClick={goToNextScene}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95"
                title="Qaybta xigta"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentSceneIndex(0);
                  setSceneProgress(0);
                  setIsPlaying(true);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95"
                title="Dib uga bilow (Replay All)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: Sound Narration & Speed */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-xl border transition active:scale-95 flex items-center gap-1 text-xs font-bold ${
                  !isMuted
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
                title="Codka Sharraxaadda & Dhawaaqa"
              >
                {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">{!isMuted ? 'Codka: Furan' : 'Codka: Xiran'}</span>
              </button>

              {/* Speed Switcher */}
              <button
                type="button"
                onClick={() => {
                  const speeds = [1, 1.25, 1.5];
                  const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                  setPlaybackSpeed(speeds[nextIdx]);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition"
                title="Xawaaraha Muuqaalka"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Right: Download Video & Share */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 text-xs font-black transition active:scale-95 shadow-md shadow-emerald-500/30 cursor-pointer disabled:opacity-60"
                title="Soo degso Video-ga (HD WebM / MP4)"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isExporting ? `${exportProgress}%` : 'Soo Degso Video'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-bold transition active:scale-95"
                title="La wadaag WhatsApp / Social Media"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Wadaag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
