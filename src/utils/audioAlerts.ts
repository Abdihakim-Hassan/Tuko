// Audio alerts, authentic Adhan player, Alarm engine, and Web Notification utilities

import { AdhanVoice } from '../types';

type AutoplayListener = (blocked: boolean) => void;

class AudioManager {
  private persistentAudio: HTMLAudioElement | null = null;
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

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup aggressive, persistent unlock on all common interaction events
      const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown', 'mousedown'];
      const triggerUnlock = () => {
        this.unlockAudio();
        if (this.pendingPlay) {
          const fn = this.pendingPlay;
          this.pendingPlay = null;
          try {
            fn();
          } catch {}
        }
      };

      unlockEvents.forEach((ev) => {
        window.addEventListener(ev, triggerUnlock, { capture: true, passive: true });
      });

      // Handle visibility changes to resume audio context if suspended
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
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
      window.addEventListener('pagehide', releaseOnUnload);
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

  // Pre-warms audio permissions on user interactions (button click, touch)
  unlockAudio(): void {
    if (typeof window === 'undefined') return;

    // 1. Unlock Web Audio API context
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

        // Play 1 silent buffer to permanently unlock on iOS Safari
        if (this.audioCtx.state === 'running' || this.audioCtx.state === 'suspended') {
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
        }
      }
    } catch {}

    // 2. Prime HTMLAudioElement with silent audio
    try {
      const audio = this.getAudio();
      if (audio && !this.unlocked) {
        audio.volume = this.volumeLevel;
        const silentAudio = new Audio(
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
        );
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
          this.unlocked = true;
          this.setAutoplayBlocked(false);
        }).catch(() => {});
      } else if (this.unlocked) {
        this.setAutoplayBlocked(false);
      }
    } catch {}
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

  // Melodic Adhan chime fallback if MP3 fails to load or is blocked
  playAdhanFallbackChime(): void {
    console.log('[AudioAlerts] Playing fallback chime');
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

      // Adhan inspired melodic sequence (Allahu Akbar tones)
      const notes = [293.66, 329.63, 392.0, 440.0, 392.0, 329.63];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.4;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.3 * this.volumeLevel, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {}
  }

  // Plays authentic recorded Adhan for any chosen Sheikh/reciter
  async playAdhan(
    isFajr = false,
    onEnded?: () => void,
    voice: AdhanVoice = 'makkah'
  ): Promise<boolean> {
    this.unlockAudio();
    this.requestWakeLock();
    this.currentVoice = voice;

    const audioSrc = this.getAudioSrcForVoice(voice, isFajr);
    const audio = this.getAudio();

    if (!audio) {
      this.playAdhanFallbackChime();
      return true;
    }

    const isSameSrc =
      audio.src.endsWith(audioSrc) || audio.src === window.location.origin + audioSrc;

    // If same audio is already playing or currently starting, don't interrupt it with pause()!
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
      // Only pause if switching to a different audio source or not currently starting
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

      this.isStartingPlay = false;
      this.isCurrentlyPlaying = true;
      this.setAutoplayBlocked(false);
      return true;
    } catch (err: any) {
      this.isStartingPlay = false;
      if (this.playPromise) {
        this.playPromise = null;
      }

      // If superseded by another playAdhan or stopAdhan request, or interrupted by pause(), ignore cleanly
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

      if (err?.name === 'NotAllowedError') {
        this.setAutoplayBlocked(true);
        // Queue this adhan to play on the very next user click
        this.pendingPlay = () => {
          this.playAdhan(isFajr, onEnded, voice);
        };
        this.playAdhanFallbackChime();
        // Vibrate to alert user on mobile
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          try {
            navigator.vibrate([400, 200, 400]);
          } catch {}
        }
      } else {
        this.playAdhanFallbackChime();
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

  // Plays alarm sound: Repeating and persistent until user taps dismiss or snooze
  playAlarm(
    soundType: 'adhan' | 'chime' | 'soft_bell' | 'digital' | 'classic' | 'gentle_morning' | 'alarm_beep' | 'zen_bowl' | 'wave_soft' | 'morning_bird' = 'adhan',
    voice: AdhanVoice = 'makkah',
    onEnded?: () => void
  ): void {
    this.stopAlarm();
    this.unlockAudio();
    this.requestWakeLock();

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
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    const audio = this.getAudio();
    if (audio) {
      audio.loop = false;
    }
    this.stopAdhan();
    this.releaseWakeLock();
  }

  // Stops any playing Adhan immediately
  stopAdhan(): void {
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
          } as NotificationOptions);
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
