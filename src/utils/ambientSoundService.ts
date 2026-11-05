// Studio-Grade Procedural & Background Ambient Nature Sound Engine for Tuko
// Works 100% Offline & Online with Multi-Track Mixing, Sleep Timer, and Auto-Pause on Adhan

export type AmbientSoundId =
  | 'rain'
  | 'thunder'
  | 'birds'
  | 'fire'
  | 'ocean'
  | 'stream'
  | 'wind'
  | 'night';

export interface AmbientSoundMeta {
  id: AmbientSoundId;
  nameSo: string;
  nameEn: string;
  subtitleSo: string;
  icon: string;
  color: string;
  borderGlow: string;
  defaultVolume: number;
}

export interface AmbientPreset {
  id: string;
  nameSo: string;
  descSo: string;
  icon: string;
  mix: Partial<Record<AmbientSoundId, number>>;
}

export const AMBIENT_SOUNDS: AmbientSoundMeta[] = [
  {
    id: 'rain',
    nameSo: 'Codka Roobka Degan',
    nameEn: 'Gentle Rain',
    subtitleSo: 'Roob raxmad leh oo si degan u da’aya',
    icon: '🌧️',
    color: 'from-cyan-500/25 via-sky-500/15 to-slate-900',
    borderGlow: 'border-cyan-400/60 shadow-cyan-500/20',
    defaultVolume: 0.75,
  },
  {
    id: 'birds',
    nameSo: 'Codka Shimbiraha',
    nameEn: 'Morning Birds',
    subtitleSo: 'Shimbiraha subaxdii oo ku luuqaynaya kaynta',
    icon: '🐦',
    color: 'from-emerald-500/25 via-teal-500/15 to-slate-900',
    borderGlow: 'border-emerald-400/60 shadow-emerald-500/20',
    defaultVolume: 0.7,
  },
  {
    id: 'fire',
    nameSo: 'Codka Dabka (Xaabo)',
    nameEn: 'Cozy Campfire',
    subtitleSo: 'Dab qoryo xaabo ah oo si diirran u shidan',
    icon: '🔥',
    color: 'from-amber-500/25 via-orange-500/15 to-slate-900',
    borderGlow: 'border-amber-400/60 shadow-amber-500/20',
    defaultVolume: 0.75,
  },
  {
    id: 'ocean',
    nameSo: 'Hirarka Badda & Xeebta',
    nameEn: 'Ocean Waves',
    subtitleSo: 'Hirarka badda oo xeebta ku soorogmanaya',
    icon: '🌊',
    color: 'from-blue-500/25 via-cyan-500/15 to-slate-900',
    borderGlow: 'border-blue-400/60 shadow-blue-500/20',
    defaultVolume: 0.7,
  },
  {
    id: 'stream',
    nameSo: 'Biyaha Durdurka / Webiga',
    nameEn: 'Flowing Stream',
    subtitleSo: 'Biyo nadiif ah oo dhagaxaan dhex qulqulaya',
    icon: '💧',
    color: 'from-teal-500/25 via-cyan-500/15 to-slate-900',
    borderGlow: 'border-teal-400/60 shadow-teal-500/20',
    defaultVolume: 0.65,
  },
  {
    id: 'thunder',
    nameSo: 'Roob & Onkod Fog',
    nameEn: 'Rain & Distant Thunder',
    subtitleSo: 'Roob culus iyo onkod daruuraha fog ka yeeraya',
    icon: '⛈️',
    color: 'from-indigo-500/25 via-purple-500/15 to-slate-900',
    borderGlow: 'border-indigo-400/60 shadow-indigo-500/20',
    defaultVolume: 0.7,
  },
  {
    id: 'wind',
    nameSo: 'Dabaysha Dhirta',
    nameEn: 'Soft Forest Breeze',
    subtitleSo: 'Neecaw qabow oo caleemaha dhirta ruxaysa',
    icon: '🍃',
    color: 'from-green-500/25 via-emerald-500/15 to-slate-900',
    borderGlow: 'border-green-400/60 shadow-green-500/20',
    defaultVolume: 0.6,
  },
  {
    id: 'night',
    nameSo: 'Habeen Degan & Xiddigo',
    nameEn: 'Peaceful Night',
    subtitleSo: 'Jawiga habeenka degan ee hurdada & adhkaarta',
    icon: '🌌',
    color: 'from-violet-500/25 via-fuchsia-500/15 to-slate-900',
    borderGlow: 'border-violet-400/60 shadow-violet-500/20',
    defaultVolume: 0.65,
  },
];

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'rain_fire',
    nameSo: 'Habeen Roob & Dab',
    descSo: 'Roob degan + Dab xaabo ah oo diirran',
    icon: '🌧️🔥',
    mix: { rain: 0.75, fire: 0.7 },
  },
  {
    id: 'morning_dhikr',
    nameSo: 'Subax & Adhkaar',
    descSo: 'Shimbiraha subaxdii + Biyaha durdurka',
    icon: '🌅🐦',
    mix: { birds: 0.8, stream: 0.55, wind: 0.35 },
  },
  {
    id: 'beach_breeze',
    nameSo: 'Xeebta & Neecawda',
    descSo: 'Hirarka badda + Dabayl qabow + Shimbiraha',
    icon: '🌊🍃',
    mix: { ocean: 0.8, wind: 0.45, birds: 0.4 },
  },
  {
    id: 'sleep_peace',
    nameSo: 'Hurdo & Nasasho Dheer',
    descSo: 'Roob & onkod fog + Jawiga habeenka',
    icon: '⛈️🌙',
    mix: { thunder: 0.75, night: 0.6 },
  },
];

interface ActiveTrackController {
  gainNode: GainNode;
  stop: () => void;
}

export interface AmbientStateSnapshot {
  activeSounds: Record<AmbientSoundId, boolean>;
  volumes: Record<AmbientSoundId, number>;
  masterVolume: number;
  isAnyPlaying: boolean;
  isPausedAll: boolean;
  sleepTimerRemainingSec: number | null;
}

type StateListener = (state: AmbientStateSnapshot) => void;

class AmbientSoundService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  private activeTracks: Partial<Record<AmbientSoundId, ActiveTrackController>> = {};
  private volumes: Record<AmbientSoundId, number> = {
    rain: 0.75,
    thunder: 0.7,
    birds: 0.7,
    fire: 0.75,
    ocean: 0.7,
    stream: 0.65,
    wind: 0.6,
    night: 0.65,
  };
  private masterVolume = 0.85;
  private isPausedAll = false;
  private savedActiveBeforePause: AmbientSoundId[] = [];

  private sleepTimerRemainingSec: number | null = null;
  private sleepInterval: ReturnType<typeof setInterval> | null = null;

  private bgKeepAliveAudio: HTMLAudioElement | null = null;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.loadSavedPreferences();
  }

  private loadSavedPreferences() {
    try {
      const savedVol = localStorage.getItem('tuko_ambient_volumes');
      if (savedVol) {
        this.volumes = { ...this.volumes, ...JSON.parse(savedVol) };
      }
      const savedMaster = localStorage.getItem('tuko_ambient_master');
      if (savedMaster != null) {
        const num = Number(savedMaster);
        if (Number.isFinite(num)) this.masterVolume = Math.max(0, Math.min(1, num));
      }
    } catch {}
  }

  private savePreferences() {
    try {
      localStorage.setItem('tuko_ambient_volumes', JSON.stringify(this.volumes));
      localStorage.setItem('tuko_ambient_master', String(this.masterVolume));
    } catch {}
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  public getState(): AmbientStateSnapshot {
    const activeSounds: Record<AmbientSoundId, boolean> = {
      rain: !!this.activeTracks.rain,
      thunder: !!this.activeTracks.thunder,
      birds: !!this.activeTracks.birds,
      fire: !!this.activeTracks.fire,
      ocean: !!this.activeTracks.ocean,
      stream: !!this.activeTracks.stream,
      wind: !!this.activeTracks.wind,
      night: !!this.activeTracks.night,
    };
    const isAnyPlaying = Object.values(activeSounds).some(Boolean);
    return {
      activeSounds,
      volumes: { ...this.volumes },
      masterVolume: this.masterVolume,
      isAnyPlaying,
      isPausedAll: this.isPausedAll,
      sleepTimerRemainingSec: this.sleepTimerRemainingSec,
    };
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.ensureNoiseBuffers(this.ctx);
    return this.ctx;
  }

  private ensureNoiseBuffers(ctx: AudioContext) {
    if (this.noiseBuffer && this.pinkNoiseBuffer && this.brownNoiseBuffer) return;

    const durationSeconds = 8;
    const length = ctx.sampleRate * durationSeconds;

    // 1. White Noise Buffer
    this.noiseBuffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = this.noiseBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    // 2. Pink Noise Buffer (Paul Kellet's refined method — warm natural rainfall & breeze spectrum)
    this.pinkNoiseBuffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = this.pinkNoiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }
    }

    // 3. Brown Noise Buffer (Deep warm rumble for ocean surf, campfire hearth & distant thunder)
    this.brownNoiseBuffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = this.brownNoiseBuffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.8;
      }
    }
  }

  private updateBackgroundKeepAlive() {
    const isAnyPlaying = Object.keys(this.activeTracks).length > 0;
    if (isAnyPlaying) {
      try {
        if (!this.bgKeepAliveAudio) {
          // Tiny silent WAV loop to keep mobile WebView/browser audio session active when screen locks
          const silentWav =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          this.bgKeepAliveAudio = new Audio(silentWav);
          this.bgKeepAliveAudio.loop = true;
          this.bgKeepAliveAudio.volume = 0.01;
        }
        this.bgKeepAliveAudio.play().catch(() => {});
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Codadka Dabeecadda & Deganaanshaha',
            artist: 'Tuko Salaad & Adhkaar',
            album: 'Jawiga Khushuuca & Nasashada',
          });
        }
      } catch {}
    } else {
      if (this.bgKeepAliveAudio) {
        try {
          this.bgKeepAliveAudio.pause();
        } catch {}
      }
    }
  }

  public toggleSound(id: AmbientSoundId) {
    if (this.activeTracks[id]) {
      this.stopSound(id);
    } else {
      this.startSound(id);
    }
  }

  public startSound(id: AmbientSoundId) {
    if (this.activeTracks[id]) return;
    this.isPausedAll = false;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    const targetVol = this.volumes[id] ?? 0.7;
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.exponentialRampToValueAtTime(Math.max(0.01, targetVol), ctx.currentTime + 0.6);
    trackGain.connect(this.masterGain);

    let cleanupFn: () => void = () => {};

    switch (id) {
      case 'rain':
        cleanupFn = this.buildRainEngine(ctx, trackGain, false);
        break;
      case 'thunder':
        cleanupFn = this.buildRainEngine(ctx, trackGain, true);
        break;
      case 'birds':
        cleanupFn = this.buildBirdsEngine(ctx, trackGain);
        break;
      case 'fire':
        cleanupFn = this.buildFireEngine(ctx, trackGain);
        break;
      case 'ocean':
        cleanupFn = this.buildOceanEngine(ctx, trackGain);
        break;
      case 'stream':
        cleanupFn = this.buildStreamEngine(ctx, trackGain);
        break;
      case 'wind':
        cleanupFn = this.buildWindEngine(ctx, trackGain);
        break;
      case 'night':
        cleanupFn = this.buildNightEngine(ctx, trackGain);
        break;
    }

    this.activeTracks[id] = {
      gainNode: trackGain,
      stop: () => {
        try {
          cleanupFn();
          trackGain.disconnect();
        } catch {}
      },
    };

    this.updateBackgroundKeepAlive();
    this.emit();
  }

  public stopSound(id: AmbientSoundId) {
    const track = this.activeTracks[id];
    if (!track) return;
    delete this.activeTracks[id];
    track.stop();
    if (Object.keys(this.activeTracks).length === 0) {
      this.clearSleepTimer();
    }
    this.updateBackgroundKeepAlive();
    this.emit();
  }

  public stopAll() {
    (Object.keys(this.activeTracks) as AmbientSoundId[]).forEach((id) => {
      const tr = this.activeTracks[id];
      if (tr) tr.stop();
      delete this.activeTracks[id];
    });
    this.isPausedAll = false;
    this.savedActiveBeforePause = [];
    this.clearSleepTimer();
    this.updateBackgroundKeepAlive();
    this.emit();
  }

  public pauseOrResumeAll() {
    const activeIds = Object.keys(this.activeTracks) as AmbientSoundId[];
    if (activeIds.length > 0) {
      this.savedActiveBeforePause = [...activeIds];
      activeIds.forEach((id) => {
        const tr = this.activeTracks[id];
        if (tr) tr.stop();
        delete this.activeTracks[id];
      });
      this.isPausedAll = true;
      this.updateBackgroundKeepAlive();
      this.emit();
    } else if (this.isPausedAll && this.savedActiveBeforePause.length > 0) {
      const toRestore = [...this.savedActiveBeforePause];
      this.isPausedAll = false;
      this.savedActiveBeforePause = [];
      toRestore.forEach((id) => this.startSound(id));
    }
  }

  public applyPreset(preset: AmbientPreset) {
    this.stopAll();
    Object.entries(preset.mix).forEach(([idStr, vol]) => {
      const id = idStr as AmbientSoundId;
      if (typeof vol === 'number') {
        this.volumes[id] = vol;
      }
      this.startSound(id);
    });
    this.savePreferences();
    this.emit();
  }

  public setSoundVolume(id: AmbientSoundId, vol: number) {
    const clamped = Math.max(0.01, Math.min(1, vol));
    this.volumes[id] = clamped;
    const track = this.activeTracks[id];
    if (track && this.ctx) {
      track.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.08);
    }
    this.savePreferences();
    this.emit();
  }

  public setMasterVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterVolume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.08);
    }
    this.savePreferences();
    this.emit();
  }

  public setSleepTimer(minutes: number | null) {
    if (this.sleepInterval) {
      clearInterval(this.sleepInterval);
      this.sleepInterval = null;
    }
    if (!minutes || minutes <= 0) {
      this.sleepTimerRemainingSec = null;
      this.emit();
      return;
    }

    this.sleepTimerRemainingSec = Math.round(minutes * 60);
    this.emit();

    this.sleepInterval = setInterval(() => {
      if (this.sleepTimerRemainingSec == null) return;
      this.sleepTimerRemainingSec -= 1;
      if (this.sleepTimerRemainingSec <= 0) {
        this.stopAll();
      } else {
        this.emit();
      }
    }, 1000);
  }

  public clearSleepTimer() {
    if (this.sleepInterval) {
      clearInterval(this.sleepInterval);
      this.sleepInterval = null;
    }
    this.sleepTimerRemainingSec = null;
    this.emit();
  }

  // ============================================================================
  // DSP SYNTHESIS ENGINES FOR EACH NATURAL SOUNDSCAPE
  // ============================================================================

  // 1 & 2. Gentle Rain + Optional Distant Thunder Engine
  private buildRainEngine(ctx: AudioContext, dest: AudioNode, withThunder: boolean): () => void {
    const srcPink = ctx.createBufferSource();
    srcPink.buffer = this.pinkNoiseBuffer!;
    srcPink.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = withThunder ? 1250 : 1050;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 180;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.72;

    srcPink.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(dest);
    srcPink.start();

    // Soft raindrop patter texture
    const srcWhite = ctx.createBufferSource();
    srcWhite.buffer = this.noiseBuffer!;
    srcWhite.loop = true;
    const patterFilter = ctx.createBiquadFilter();
    patterFilter.type = 'bandpass';
    patterFilter.frequency.value = 2600;
    patterFilter.Q.value = 2.0;

    const patterGain = ctx.createGain();
    patterGain.gain.value = 0.08;

    srcWhite.connect(patterFilter);
    patterFilter.connect(patterGain);
    patterGain.connect(dest);
    srcWhite.start();

    let thunderTimer: ReturnType<typeof setTimeout> | null = null;
    let isStopped = false;

    if (withThunder) {
      const triggerThunderRumble = () => {
        if (isStopped || !this.brownNoiseBuffer) return;
        try {
          const now = ctx.currentTime;
          const tSrc = ctx.createBufferSource();
          tSrc.buffer = this.brownNoiseBuffer;
          tSrc.loop = true;

          const tFilter = ctx.createBiquadFilter();
          tFilter.type = 'lowpass';
          tFilter.frequency.setValueAtTime(150, now);
          tFilter.frequency.exponentialRampToValueAtTime(55, now + 5.5);

          const tGain = ctx.createGain();
          tGain.gain.setValueAtTime(0.001, now);
          tGain.gain.linearRampToValueAtTime(0.85, now + 0.45);
          tGain.gain.exponentialRampToValueAtTime(0.35, now + 1.8);
          tGain.gain.linearRampToValueAtTime(0.55, now + 2.6);
          tGain.gain.exponentialRampToValueAtTime(0.001, now + 6.2);

          tSrc.connect(tFilter);
          tFilter.connect(tGain);
          tGain.connect(dest);

          tSrc.start(now);
          tSrc.stop(now + 6.4);
        } catch {}

        const nextDelay = 7000 + Math.random() * 9000;
        thunderTimer = setTimeout(triggerThunderRumble, nextDelay);
      };

      thunderTimer = setTimeout(triggerThunderRumble, 1800);
    }

    return () => {
      isStopped = true;
      if (thunderTimer) clearTimeout(thunderTimer);
      try {
        srcPink.stop();
        srcWhite.stop();
      } catch {}
    };
  }

  // 3. Morning Forest Birds Engine (Melodic Songbird Chirps + Gentle Forest Air)
  private buildBirdsEngine(ctx: AudioContext, dest: AudioNode): () => void {
    // Subtle forest leaf ambience
    const bgSrc = ctx.createBufferSource();
    bgSrc.buffer = this.pinkNoiseBuffer!;
    bgSrc.loop = true;

    const bgFilter = ctx.createBiquadFilter();
    bgFilter.type = 'bandpass';
    bgFilter.frequency.value = 520;
    bgFilter.Q.value = 1.4;

    const bgGain = ctx.createGain();
    bgGain.gain.value = 0.12;

    bgSrc.connect(bgFilter);
    bgFilter.connect(bgGain);
    bgGain.connect(dest);
    bgSrc.start();

    let isStopped = false;
    let birdTimer: ReturnType<typeof setTimeout> | null = null;

    // Synthesize a single realistic bird note with pitch slide & harmonic
    const playChirpNote = (startTime: number, startFreq: number, endFreq: number, dur: number, vol: number) => {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(startFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);

        g.gain.setValueAtTime(0.001, startTime);
        g.gain.linearRampToValueAtTime(vol, startTime + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(g);
        g.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + dur + 0.02);
      } catch {}
    };

    const scheduleBirdPhrase = () => {
      if (isStopped) return;
      const now = ctx.currentTime;
      const pattern = Math.floor(Math.random() * 4);
      const baseFreq = 2100 + Math.random() * 900;

      if (pattern === 0) {
        // Double sweet tweet (e.g. Robin)
        playChirpNote(now, baseFreq, baseFreq * 1.28, 0.11, 0.22);
        playChirpNote(now + 0.14, baseFreq * 1.05, baseFreq * 1.38, 0.13, 0.25);
      } else if (pattern === 1) {
        // 3-note melodic warble
        playChirpNote(now, baseFreq * 1.2, baseFreq * 0.92, 0.09, 0.2);
        playChirpNote(now + 0.11, baseFreq * 0.95, baseFreq * 1.3, 0.1, 0.22);
        playChirpNote(now + 0.23, baseFreq * 1.35, baseFreq * 1.1, 0.14, 0.18);
      } else if (pattern === 2) {
        // Fast songbird trill (4 quick notes)
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.085;
          playChirpNote(t, baseFreq + i * 90, baseFreq * 1.22 + i * 90, 0.07, 0.18);
        }
      } else {
        // Distant soft call + answer
        playChirpNote(now, 1850, 2350, 0.15, 0.16);
        playChirpNote(now + 0.22, 2400, 1980, 0.18, 0.14);
      }

      const nextMs = 1100 + Math.random() * 2200;
      birdTimer = setTimeout(scheduleBirdPhrase, nextMs);
    };

    birdTimer = setTimeout(scheduleBirdPhrase, 250);

    return () => {
      isStopped = true;
      if (birdTimer) clearTimeout(birdTimer);
      try {
        bgSrc.stop();
      } catch {}
    };
  }

  // 4. Cozy Campfire Engine (Warm Hearth Rumble + Flame Flicker + Wood Crackles)
  private buildFireEngine(ctx: AudioContext, dest: AudioNode): () => void {
    // Layer 1: Warm deep fire rumble
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = this.brownNoiseBuffer!;
    rumbleSrc.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 165;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.55;

    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(dest);
    rumbleSrc.start();

    // Layer 2: Soft flame hiss
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = this.pinkNoiseBuffer!;
    hissSrc.loop = true;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 850;
    hissFilter.Q.value = 0.9;

    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.18;

    hissSrc.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(dest);
    hissSrc.start();

    // Layer 3: Stochastic wood crackles & pops
    let isStopped = false;
    let crackleTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerCrackleCluster = () => {
      if (isStopped || !this.noiseBuffer) return;
      const now = ctx.currentTime;
      const popCount = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < popCount; i++) {
        try {
          const offset = i * (0.03 + Math.random() * 0.08);
          const popSrc = ctx.createBufferSource();
          popSrc.buffer = this.noiseBuffer;

          const popFilter = ctx.createBiquadFilter();
          popFilter.type = 'bandpass';
          popFilter.frequency.value = 1800 + Math.random() * 2400;
          popFilter.Q.value = 3.2;

          const popGain = ctx.createGain();
          const peak = 0.25 + Math.random() * 0.35;
          popGain.gain.setValueAtTime(0.001, now + offset);
          popGain.gain.linearRampToValueAtTime(peak, now + offset + 0.004);
          popGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.035);

          popSrc.connect(popFilter);
          popFilter.connect(popGain);
          popGain.connect(dest);

          popSrc.start(now + offset, Math.random() * 4, 0.05);
        } catch {}
      }

      const nextMs = 180 + Math.random() * 550;
      crackleTimer = setTimeout(triggerCrackleCluster, nextMs);
    };

    crackleTimer = setTimeout(triggerCrackleCluster, 150);

    return () => {
      isStopped = true;
      if (crackleTimer) clearTimeout(crackleTimer);
      try {
        rumbleSrc.stop();
        hissSrc.stop();
      } catch {}
    };
  }

  // 5. Ocean Waves Engine (Rhythmic Rolling Surf & Receding Foam)
  private buildOceanEngine(ctx: AudioContext, dest: AudioNode): () => void {
    const surfSrc = ctx.createBufferSource();
    surfSrc.buffer = this.brownNoiseBuffer!;
    surfSrc.loop = true;

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 380;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.45;

    // LFO for wave crest & recession (~9 second ocean wave cycle)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.11; // ~9 sec per wave

    const lfoFilterDepth = ctx.createGain();
    lfoFilterDepth.gain.value = 260; // sweeps filter from 120Hz to 640Hz
    lfo.connect(lfoFilterDepth);
    lfoFilterDepth.connect(waveFilter.frequency);

    const lfoGainDepth = ctx.createGain();
    lfoGainDepth.gain.value = 0.28;
    lfo.connect(lfoGainDepth);
    lfoGainDepth.connect(waveGain.gain);

    surfSrc.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(dest);

    surfSrc.start();
    lfo.start();

    return () => {
      try {
        surfSrc.stop();
        lfo.stop();
      } catch {}
    };
  }

  // 6. Flowing Water Stream / Babbling Brook Engine
  private buildStreamEngine(ctx: AudioContext, dest: AudioNode): () => void {
    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer!;
    src.loop = true;

    const freqs = [460, 820, 1380];
    const lfos: OscillatorNode[] = [];

    freqs.forEach((f, idx) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 2.8;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.6 + idx * 0.35;

      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = f * 0.18;
      lfo.connect(lfoDepth);
      lfoDepth.connect(bp.frequency);

      const bandGain = ctx.createGain();
      bandGain.gain.value = 0.28;

      src.connect(bp);
      bp.connect(bandGain);
      bandGain.connect(dest);

      lfo.start();
      lfos.push(lfo);
    });

    src.start();

    return () => {
      try {
        src.stop();
        lfos.forEach((l) => l.stop());
      } catch {}
    };
  }

  // 7. Soft Forest Wind & Breeze Engine
  private buildWindEngine(ctx: AudioContext, dest: AudioNode): () => void {
    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer!;
    src.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 2.6;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.55;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.085; // slow gentle wind gusts

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 180;
    lfo.connect(lfoDepth);
    lfoDepth.connect(windFilter.frequency);

    src.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(dest);

    src.start();
    lfo.start();

    return () => {
      try {
        src.stop();
        lfo.stop();
      } catch {}
    };
  }

  // 8. Peaceful Night Ambience (Gentle Night Air + Soothing Crickets)
  private buildNightEngine(ctx: AudioContext, dest: AudioNode): () => void {
    // Soft night air pad
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = this.brownNoiseBuffer!;
    airSrc.loop = true;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 220;

    const airGain = ctx.createGain();
    airGain.gain.value = 0.3;

    airSrc.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(dest);
    airSrc.start();

    // Gentle cricket chirps
    let isStopped = false;
    let cricketTimer: ReturnType<typeof setTimeout> | null = null;

    const playCricketPulse = () => {
      if (isStopped) return;
      try {
        const now = ctx.currentTime;
        for (let p = 0; p < 3; p++) {
          const t = now + p * 0.055;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 3950 + (p % 2) * 80;
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.06, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.042);
          osc.connect(g);
          g.connect(dest);
          osc.start(t);
          osc.stop(t + 0.045);
        }
      } catch {}

      const nextMs = 900 + Math.random() * 1400;
      cricketTimer = setTimeout(playCricketPulse, nextMs);
    };

    cricketTimer = setTimeout(playCricketPulse, 300);

    return () => {
      isStopped = true;
      if (cricketTimer) clearTimeout(cricketTimer);
      try {
        airSrc.stop();
      } catch {}
    };
  }
}

export const ambientSounds = new AmbientSoundService();
