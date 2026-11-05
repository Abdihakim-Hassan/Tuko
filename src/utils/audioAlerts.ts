// Audio alerts, authentic Adhan player, Alarm engine, and Web Notification utilities

import { AdhanVoice } from '../types';

type AutoplayListener = (blocked: boolean) => void;

// 1-second silent PCM WAV data URI used to bless HTMLAudioElement & keep mobile/desktop background audio alive
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class AudioManager {
  private persistentAudio: HTMLAudioElement | null = null;
  private keepAliveAudio: HTMLAudioElement | null = null;
  private htmlAudioBlessed = false;
  private keepAliveEnabled = true;
  private volumeLevel = 1.0;
  private preloaded = false;
  private unlocked = false;
  private audioCtx: AudioContext | null = null;
  private currentVoice: AdhanVoice = 'makkah';
  private cachedAudios: Map<string, HTMLAudioElement> = new Map();
  private alarmInterval: NodeJS.Timeout | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;
  private wakeLock: any = null;
  private autoplayBlocked = false;
  private autoplayListeners: Set<AutoplayListener> = new Set();
  private pendingPlay: (() => void) | null = null;
  private isCurrentlyPlaying = false;
  private isStartingPlay = false;
  private playPromise: Promise<void> | null = null;
  private playRequestId = 0;
  private userStoppedUntilMs = 0;

  private static getCurrentHHmm(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  public silenceCurrentMinuteInNative(): void {
    if (typeof window === 'undefined') return;
    try {
      const hhmm = AudioManager.getCurrentHHmm();
      localStorage.setItem('tuko_silenced_hhmm', hhmm);
      localStorage.setItem('tuko_silenced_ts', String(Date.now()));
      if ((window as any).TukoNative?.schedulePrayerTimes) {
        (window as any).TukoNative.schedulePrayerTimes('[]');
      }
    } catch {}
  }

  public isMinuteSilenced(time24?: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const targetHHmm = time24 && time24.trim() ? time24.trim() : AudioManager.getCurrentHHmm();
      if (Date.now() < this.userStoppedUntilMs && targetHHmm === AudioManager.getCurrentHHmm()) {
        return true;
      }
      const silencedHHmm = localStorage.getItem('tuko_silenced_hhmm') || '';
      const silencedTs = Number(localStorage.getItem('tuko_silenced_ts') || '0');
      if (silencedHHmm === targetHHmm && Date.now() - silencedTs < 120_000) {
        return true;
      }
      if (typeof (window as any).TukoNative?.isMinuteSilencedOrFired === 'function') {
        if ((window as any).TukoNative.isMinuteSilencedOrFired(targetHHmm)) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Sanitize TukoNative schedule arrays passed through JSON.stringify so:
      // 1) Tomorrow's items (_1) never carry time24 into today's clockMatch check
      // 2) Any minute already triggered or stopped by the user is excluded for the rest of that minute
      try {
        const origStringify = window.JSON.stringify;
        if (!(window as any).__tukoJsonPatched) {
          (window as any).__tukoJsonPatched = true;
          window.JSON.stringify = function (value: any, replacer?: any, space?: any): string {
            try {
              if (
                Array.isArray(value) &&
                value.length > 0 &&
                value[0] &&
                typeof value[0] === 'object' &&
                'prayer' in value[0] &&
                'timestamp' in value[0]
              ) {
                const nowHHmm = AudioManager.getCurrentHHmm();
                const silencedHHmm = localStorage.getItem('tuko_silenced_hhmm') || '';
                const silencedTs = Number(localStorage.getItem('tuko_silenced_ts') || '0');
                const isCurrentMinSilenced =
                  silencedHHmm === nowHHmm && Date.now() - silencedTs < 120_000;

                const sanitized = value
                  .filter((item: any) => {
                    if (!item) return false;
                    if (isCurrentMinSilenced && item.time24 === nowHHmm) {
                      return false;
                    }
                    return true;
                  })
                  .map((item: any) => {
                    if (item && typeof item.id === 'string' && item.id.endsWith('_1')) {
                      return { ...item, time24: '' };
                    }
                    return item;
                  });

                // Suppress MainActivity's 3-second polling loop if App.tsx already synced,
                // and deduplicate identical schedules so TukoNative.schedulePrayerTimes("")
                // returns early without re-posting the foreground service notification!
                const firstId = sanitized[0] && typeof sanitized[0].id === 'string' ? sanitized[0].id : '';
                const isFromMainActivityPoll = firstId === 'Fajr_0' || firstId === 'Duhur_0';
                if (isFromMainActivityPoll && (window as any).__tukoLastScheduleJson) {
                  return '';
                }

                const resultJson = origStringify.call(window.JSON, sanitized, replacer, space);
                if ((window as any).__tukoLastScheduleJson === resultJson) {
                  return '';
                }
                (window as any).__tukoLastScheduleJson = resultJson;
                return resultJson;
              }
            } catch {}
            return origStringify.call(window.JSON, value, replacer, space);
          };
        }
      } catch {}

      // Setup clean, non-intrusive Web Audio API unlock on interaction events
      const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown'];
      const triggerUnlock = () => {
        this.unlockAudio();
      };

      unlockEvents.forEach((ev) => {
        window.addEventListener(ev, triggerUnlock, { capture: true, passive: true });
      });

      // Handle visibility changes: never auto-play stale WebAudio alarms when returning from background
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' && (window as any).TukoNative) {
          this.clearTimersOnly();
        }
      });

      // Immediately release any open audio HTTP streams on page reload so reload is instant
      const releaseOnUnload = () => {
        try {
          if (this.persistentAudio) {
            this.persistentAudio.pause();
            this.persistentAudio.removeAttribute('src');
            this.persistentAudio.load();
          }
          this.cachedAudios.forEach((a) => {
            a.pause();
            a.removeAttribute('src');
          });
        } catch {}
      };
      window.addEventListener('beforeunload', releaseOnUnload);
      // NOTE: Never attach releaseOnUnload to pagehide — pagehide fires when phone screen locks, which would kill background audio!
    }
  }

  getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.persistentAudio) {
      this.persistentAudio = new Audio();
      this.persistentAudio.preload = 'metadata';
      (this.persistentAudio as unknown as { playsInline?: boolean }).playsInline = true;
      this.persistentAudio.volume = this.volumeLevel;

      this.persistentAudio.addEventListener('play', () => {
        this.isCurrentlyPlaying = true;
        this.setAutoplayBlocked(false);
      });

      this.persistentAudio.addEventListener('pause', () => {
        this.isCurrentlyPlaying = false;
      });

      this.persistentAudio.addEventListener('ended', () => {
        this.isCurrentlyPlaying = false;
      });
    }
    return this.persistentAudio;
  }

  setVolume(vol: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, vol));
    const audio = this.getAudio();
    if (audio) {
      audio.volume = this.volumeLevel;
    }
    this.cachedAudios.forEach((a) => {
      a.volume = this.volumeLevel;
    });
  }

  getVolume(): number {
    return this.volumeLevel;
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.persistentAudio;
  }

  getCurrentVoice(): AdhanVoice {
    return this.currentVoice;
  }

  isAutoplayBlocked(): boolean {
    return this.autoplayBlocked;
  }

  subscribeAutoplayBlocked(listener: AutoplayListener): () => void {
    this.autoplayListeners.add(listener);
    listener(this.autoplayBlocked);
    return () => {
      this.autoplayListeners.delete(listener);
    };
  }

  private setAutoplayBlocked(blocked: boolean): void {
    if (this.autoplayBlocked !== blocked) {
      this.autoplayBlocked = blocked;
      this.autoplayListeners.forEach((l) => {
        try {
          l(blocked);
        } catch {}
      });
    }
  }

  getAudioSrcForVoice(voice: AdhanVoice = 'makkah', isFajr = false): string {
    const vTag = '?v=57';
    if (isFajr || voice === 'fajr') return `/audio/adhan_fajr.mp3${vTag}`;
    switch (voice) {
      case 'makkah':
        return `/audio/adhan_makkah.mp3${vTag}`;
      case 'madinah':
        return `/audio/adhan.mp3${vTag}`;
      case 'afasy':
        return `/audio/adhan_afasy.mp3${vTag}`;
      case 'abdulbasit':
        return `/audio/adhan_abdulbasit.mp3${vTag}`;
      case 'zahrani':
        return `/audio/adhan_zahrani.mp3${vTag}`;
      case 'qatami':
        return `/audio/adhan_qatami.mp3${vTag}`;
      case 'minshawi':
        return `/audio/adhan_minshawi.mp3${vTag}`;
      default:
        return `/audio/adhan_makkah.mp3${vTag}`;
    }
  }

  // Prepare Sheikh Adhan audio elements without saturating network sockets on startup
  preloadVoices(): void {
    if (typeof window === 'undefined' || this.preloaded) return;
    this.preloaded = true;
    const voices: AdhanVoice[] = [
      'makkah',
      'madinah',
      'afasy',
      'abdulbasit',
      'zahrani',
      'qatami',
      'minshawi',
      'fajr',
    ];

    voices.forEach((v) => {
      try {
        const src = this.getAudioSrcForVoice(v, v === 'fajr');
        if (!this.cachedAudios.has(v)) {
          const a = new Audio();
          a.preload = 'none';
          a.src = src;
          a.volume = this.volumeLevel;
          (a as unknown as { playsInline?: boolean }).playsInline = true;
          this.cachedAudios.set(v, a);
        }
      } catch {}
    });
  }

  // Pre-warms audio permissions safely without playing or leaking any adhan sound
  unlockAudio(): void {
    if (typeof window === 'undefined') return;

    // 1. Safely unlock Web Audio API context
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        // Silent single sample to permanently satisfy iOS WebAudio gesture requirement
        if (this.audioCtx.state === 'running' || this.audioCtx.state === 'suspended') {
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
        }
      }
    } catch {}

    // 2. Bless persistent HTMLAudioElement on first user gesture so timer-triggered Adhan NEVER gets blocked!
    if (!this.htmlAudioBlessed && !this.isCurrentlyPlaying && !this.isStartingPlay) {
      try {
        const audio = this.getAudio();
        if (audio && (!audio.src || audio.paused)) {
          const prevSrc = audio.src;
          audio.src = SILENT_WAV_DATA_URI;
          audio.volume = 0.001;
          const p = audio.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.htmlAudioBlessed = true;
              if (!this.isCurrentlyPlaying && !this.isStartingPlay) {
                audio.pause();
                audio.volume = this.volumeLevel;
                if (prevSrc && !prevSrc.startsWith('data:audio/wav')) {
                  audio.src = prevSrc;
                }
              }
            }).catch(() => {});
          }
        }
      } catch {}
    }

    // 3. Start background keep-alive audio loop so Mobile (screen locked) & Desktop (minimized) never sleep
    if (this.keepAliveEnabled) {
      this.startKeepAliveLoop();
    }

    // 4. If an Adhan was waiting for user gesture, play it immediately now!
    if (this.pendingPlay) {
      const fn = this.pendingPlay;
      this.pendingPlay = null;
      setTimeout(() => fn(), 20);
    }

    this.unlocked = true;
    this.setAutoplayBlocked(false);
  }

  private startKeepAliveLoop(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.keepAliveAudio) {
        this.keepAliveAudio = new Audio(SILENT_WAV_DATA_URI);
        this.keepAliveAudio.loop = true;
        this.keepAliveAudio.volume = 0.0001;
        (this.keepAliveAudio as unknown as { playsInline?: boolean }).playsInline = true;
      }
      if (this.keepAliveAudio.paused) {
        this.keepAliveAudio.play().catch(() => {});
      }
      if ('mediaSession' in navigator && !this.isCurrentlyPlaying) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Heeganka Aadaanka (24/7)',
            artist: 'Tuko • Salaad & Adhkaar',
            album: 'Waqtiyada Salaadda',
          });
        } catch {}
      }
    } catch {}
  }

  setKeepAliveEnabled(enabled: boolean): void {
    this.keepAliveEnabled = enabled;
    if (enabled) {
      this.startKeepAliveLoop();
    } else if (this.keepAliveAudio) {
      try {
        this.keepAliveAudio.pause();
      } catch {}
    }
  }

  isKeepAliveActive(): boolean {
    return !!(this.keepAliveAudio && !this.keepAliveAudio.paused);
  }

  // Request screen wake lock so the phone stays awake during alarm/adhan
  async requestWakeLock(): Promise<void> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {}
  }

  releaseWakeLock(): void {
    try {
      if (this.wakeLock) {
        this.wakeLock.release().catch(() => {});
        this.wakeLock = null;
      }
    } catch {}
  }

  // Pre-prayer reminder alert
  playPrePrayerChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25 * this.volumeLevel, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }

  // Plays authentic recorded Adhan for any chosen Sheikh/reciter (never plays synthetic oscillator buzz)
  async playAdhan(
    isFajr = false,
    onEnded?: () => void,
    voice: AdhanVoice = 'makkah'
  ): Promise<boolean> {
    this.requestWakeLock();
    this.currentVoice = voice;

    // 0. If running inside Android Native APK, trigger native hardware player ONLY (never play HTML5 audio simultaneously!)
    if (typeof window !== 'undefined' && (window as any).TukoNative?.playAdhanNow) {
      try {
        this.silenceCurrentMinuteInNative();
        (window as any).TukoNative.playAdhanNow(isFajr ? 'Fajr' : 'Adhan', voice);
        this.isCurrentlyPlaying = true;
        this.isStartingPlay = false;
        return true;
      } catch (err) {
        console.warn('Native Adhan trigger notice:', err);
      }
    }

    const audioSrc = this.getAudioSrcForVoice(voice, isFajr);
    const audio = this.getAudio();

    if (!audio) {
      return false;
    }

    audio.muted = false;
    audio.volume = this.volumeLevel;

    // If any Adhan is already actively playing or starting in the overlay, don't interrupt it!
    const isSameSrc =
      audio.src.endsWith(audioSrc) || audio.src === window.location.origin + audioSrc;

    if ((this.isCurrentlyPlaying || this.isStartingPlay) && isSameSrc) {
      if (onEnded) {
        audio.onended = () => {
          this.isCurrentlyPlaying = false;
          this.isStartingPlay = false;
          this.releaseWakeLock();
          onEnded();
        };
      }
      if (this.playPromise) {
        try {
          await this.playPromise;
          return true;
        } catch {
          return false;
        }
      }
      return true;
    }

    const requestId = ++this.playRequestId;
    this.isStartingPlay = true;

    try {
      if (!isSameSrc) {
        try {
          audio.pause();
        } catch {}
        audio.src = audioSrc;
      } else {
        try {
          audio.currentTime = 0;
        } catch {}
      }

      audio.muted = false;
      audio.volume = this.volumeLevel;

      audio.onended = () => {
        this.isCurrentlyPlaying = false;
        this.isStartingPlay = false;
        this.releaseWakeLock();
        if (onEnded) onEnded();
      };

      const currentPlayPromise = audio.play();
      this.playPromise = currentPlayPromise;
      await currentPlayPromise;

      if (this.playPromise === currentPlayPromise) {
        this.playPromise = null;
      }
      if (requestId !== this.playRequestId) {
        return false;
      }

      this.unlocked = true;
      this.isStartingPlay = false;
      this.isCurrentlyPlaying = true;
      this.setAutoplayBlocked(false);
      return true;
    } catch (err: any) {
      this.isStartingPlay = false;
      if (this.playPromise) {
        this.playPromise = null;
      }

      const errMsg = String(err?.message || err || '');
      if (
        requestId !== this.playRequestId ||
        err?.name === 'AbortError' ||
        errMsg.includes('interrupted') ||
        errMsg.includes('pause')
      ) {
        this.isCurrentlyPlaying = false;
        return false;
      }

      // If autoplay was blocked by browser policy, queue pendingPlay & sound WebAudio chime immediately
      this.isCurrentlyPlaying = false;
      this.pendingPlay = () => {
        this.playAdhan(isFajr, onEnded, voice);
      };
      this.playChimeTone();
      this.setAutoplayBlocked(true);
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate([400, 200, 400]);
        } catch {}
      }
      return false;
    }
  }

  playChimeTone(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      // 4-note ascending bright chime (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const startTime = ctx.currentTime + idx * 0.18;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.35 * this.volumeLevel, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } catch {}
  }

  playSoftBellTone(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      // Harmonic soft bell chords (warm, soothing wake-up tones)
      const freqs = [440.0, 554.37, 659.25]; // A major triad
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25 * this.volumeLevel, ctx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.25);
      });
    } catch {}
  }

  playDigitalBeep(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1200;
      gain.gain.value = 0.1 * this.volumeLevel;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  playClassicAlarm(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.2 * this.volumeLevel, ctx.currentTime + offset + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.15);
      });
    } catch {}
  }

  playGentleWakeup(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2 * this.volumeLevel, ctx.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 3);
    } catch {}
  }

  playZenBowl(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3 * this.volumeLevel, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 3);
    } catch {}
  }

  playWaveSoft(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const bufferSize = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1 * this.volumeLevel, ctx.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  playMorningBird(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      
      [1500, 2000].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2 * this.volumeLevel, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      });
    } catch {}
  }

  playAlarmBeep(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.audioCtx || new AudioCtx();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      [0, 0.15, 0.3].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(980, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.25 * this.volumeLevel, ctx.currentTime + offset + 0.03);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.1);
      });
    } catch {}
  }

  private clearTimersOnly(): void {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
  }

  // Plays alarm sound: Repeating and persistent until user taps dismiss or snooze
  playAlarm(
    soundType: 'adhan' | 'chime' | 'soft_bell' | 'digital' | 'classic' | 'gentle_morning' | 'alarm_beep' | 'zen_bowl' | 'wave_soft' | 'morning_bird' = 'adhan',
    voice: AdhanVoice = 'makkah',
    onEnded?: () => void
  ): void {
    this.clearTimersOnly();
    this.silenceCurrentMinuteInNative();
    this.unlockAudio();
    this.requestWakeLock();

    // If running inside Native APK and native alarm player is available, use single native audio engine
    if (typeof window !== 'undefined' && (window as any).TukoNative) {
      if (typeof (window as any).TukoNative.playAlarmNow === 'function') {
        try {
          (window as any).TukoNative.playAlarmNow('Alaarm', voice, soundType);
          this.isCurrentlyPlaying = true;
          return;
        } catch {}
      } else if (soundType === 'adhan' && typeof (window as any).TukoNative.playAdhanNow === 'function') {
        try {
          (window as any).TukoNative.playAdhanNow(voice === 'fajr' ? 'Fajr' : 'Alaarm', voice);
          this.isCurrentlyPlaying = true;
          return;
        } catch {}
      }
    }

    // Setup repeating mobile vibration
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([600, 300, 600, 300, 1000]);
        this.vibrationInterval = setInterval(() => {
          try {
            navigator.vibrate([600, 300, 600, 300, 1000]);
          } catch {}
        }, 3200);
      } catch {}
    }

    const playLoop = (fn: () => void, interval: number) => {
      fn();
      this.alarmInterval = setInterval(fn, interval);
    };

    if (soundType === 'adhan') {
      const audio = this.getAudio();
      if (audio) {
        audio.loop = true; // Alarm should loop until dismissed!
      }
      this.playAdhan(voice === 'fajr', onEnded, voice).then((success) => {
        if (!success) {
          playLoop(() => this.playChimeTone(), 2500);
        }
      });
    } else if (soundType === 'chime') {
      playLoop(() => this.playChimeTone(), 2500);
    } else if (soundType === 'soft_bell') {
      playLoop(() => this.playSoftBellTone(), 3000);
    } else if (soundType === 'digital') {
      playLoop(() => this.playDigitalBeep(), 1000);
    } else if (soundType === 'classic') {
      playLoop(() => this.playClassicAlarm(), 2000);
    } else if (soundType === 'gentle_morning') {
      playLoop(() => this.playGentleWakeup(), 4000);
    } else if (soundType === 'alarm_beep') {
      playLoop(() => this.playAlarmBeep(), 1000);
    } else if (soundType === 'zen_bowl') {
      playLoop(() => this.playZenBowl(), 4000);
    } else if (soundType === 'wave_soft') {
      playLoop(() => this.playWaveSoft(), 2000);
    } else if (soundType === 'morning_bird') {
      playLoop(() => this.playMorningBird(), 3000);
    }
  }

  // Stops any playing alarm (audio, chime, interval, vibration, wakelock)
  stopAlarm(): void {
    this.clearTimersOnly();
    const audio = this.getAudio();
    if (audio) {
      audio.loop = false;
    }
    this.stopAdhan();
    this.releaseWakeLock();
  }

  // Stops any playing Adhan immediately and silences the current minute in Native ForegroundService
  stopAdhan(): void {
    this.userStoppedUntilMs = Date.now() + 65_000;
    this.silenceCurrentMinuteInNative();

    if (typeof window !== 'undefined' && (window as any).TukoNative?.stopAdhan) {
      try {
        (window as any).TukoNative.stopAdhan();
      } catch (_) {}
    }

    this.playRequestId++;
    this.pendingPlay = null;
    this.playPromise = null;
    this.isStartingPlay = false;
    this.isCurrentlyPlaying = false;

    const audio = this.getAudio();
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
      } catch {}
    }
    this.cachedAudios.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
        a.loop = false;
      } catch {}
    });
    this.releaseWakeLock();
  }

  // Check if Adhan is actively playing or starting
  isAdhanPlaying(): boolean {
    const audio = this.getAudio();
    if (audio) {
      return (!audio.paused && !audio.ended && audio.currentTime >= 0) || this.isCurrentlyPlaying || this.isStartingPlay;
    }
    return this.isCurrentlyPlaying || this.isStartingPlay;
  }

  // Test full audio pipeline with visual confirmation
  async testAudioPlayback(): Promise<boolean> {
    this.unlockAudio();
    this.playChimeTone();
    return true;
  }
}

export const audioAlerts = new AudioManager();

// Browser Notification API
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      audioAlerts.unlockAudio();
    }
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function isNotificationGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export function sendBrowserNotification(title: string, body: string, icon = '/pwa-192x192.png'): void {
  if (!isNotificationGranted()) return;

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag: 'tuko-prayer-adhan',
            renotify: true,
            requireInteraction: true,
            silent: false,
            vibrate: [400, 200, 400, 200, 600],
            actions: [
              { action: 'play', title: '📢 Shid Aadaanka' },
              { action: 'open', title: '🕌 Fur App-ka' },
            ],
            data: { url: '/' },
          } as any);
        })
        .catch(() => {
          new Notification(title, { body, icon });
        });
    } else {
      new Notification(title, { body, icon });
    }
  } catch {
    // Fallback ignore
  }
}
