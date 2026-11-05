import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Timer,
  Sparkles,
  Sliders,
  Moon,
  CheckCircle2,
  Flame,
  BookOpen,
} from 'lucide-react';
import {
  AMBIENT_SOUNDS,
  AMBIENT_PRESETS,
  AmbientSoundId,
  AmbientStateSnapshot,
  ambientSounds,
} from '../utils/ambientSoundService';

interface AmbientSoundsViewProps {
  onNavigateTab?: (tabId: string) => void;
}

export const AmbientSoundsView: React.FC<AmbientSoundsViewProps> = ({ onNavigateTab }) => {
  const [state, setState] = useState<AmbientStateSnapshot>(() => ambientSounds.getState());

  useEffect(() => {
    return ambientSounds.subscribe(setState);
  }, []);

  const activeList = AMBIENT_SOUNDS.filter((s) => state.activeSounds[s.id]);
  const activeCount = activeList.length;

  const formatTimer = (sec: number | null) => {
    if (sec == null || sec <= 0) return null;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timerFormatted = formatTimer(state.sleepTimerRemainingSec);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in pb-16">
      {/* 1. Hero Banner: Codadka Dabeecadda & Deganaanshaha */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#062630] via-[#093440] to-[#041920] border border-teal-400/35 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <span>🌿 Jawiga Dabeecadda • Background Play 24/7</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Codadka Dabeecadda &amp; Deganaanshaha Qalbiga
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/85 max-w-2xl leading-relaxed">
              Daar codka roobka, shimbiraha subaxdii, dabka xaabada, hirarka badda ama biyaha durdurka. Codadkani waxay kuu sii soconayaan <strong className="text-amber-300">Background-ka</strong> xitaa marka aad akhrisanayso <strong className="text-emerald-300">Adhkaarta</strong>, tirinayso <strong className="text-emerald-300">Tasbiixda</strong>, ama aad ku seexanayso.
            </p>
          </div>

          {/* Active Status / Stop All Control */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {(state.isAnyPlaying || state.isPausedAll) && (
              <>
                <button
                  type="button"
                  onClick={() => ambientSounds.pauseOrResumeAll()}
                  className={`px-3.5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 transition shadow-lg active:scale-95 cursor-pointer ${
                    state.isAnyPlaying
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                  }`}
                >
                  {state.isAnyPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Hakad</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Sii Wad</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => ambientSounds.stopAll()}
                  className="px-3.5 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Dami Dhammaan</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Master Volume & Active Mix Bar */}
        <div className="pt-3 border-t border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              onClick={() => ambientSounds.setMasterVolume(state.masterVolume > 0 ? 0 : 0.85)}
              className="p-2 rounded-xl bg-black/40 border border-teal-500/30 text-teal-300 hover:text-white transition cursor-pointer shrink-0"
              title="Codka Guud"
            >
              {state.masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-teal-300" />
              )}
            </button>
            <div className="flex-1 max-w-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-teal-200 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-300" />
                  <span>Codka Guud (Master Volume):</span>
                </span>
                <span className="font-mono text-amber-300">{Math.round(state.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(state.masterVolume * 100)}
                onChange={(e) => ambientSounds.setMasterVolume(Number(e.target.value) / 100)}
                className="w-full accent-teal-400 cursor-pointer h-1.5 rounded-lg"
              />
            </div>
          </div>

          {/* Quick Jump to Adhkaar or Tasbeeh while sound plays */}
          {state.isAnyPlaying && onNavigateTab && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-emerald-300 font-bold">Ku akhriso jawigan:</span>
              <button
                type="button"
                onClick={() => onNavigateTab('adhkaar')}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Adhkaarta ➔</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('tasbeeh')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Tasbiixda ➔</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('quran')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span>Qur&apos;aanka ➔</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Ready-Made Mix Presets (Jawiyo Isku-dhafan oo Hal-Taabasho ah) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#061e26] border border-teal-500/25 space-y-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Jawiyo Isku-Dhafan oo Diyaarsan (1-Tap Mixes)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Taabo mid ka mid ah si uu isugu kaa daro dhowr cod oo si qurux badan isugu baxaya:
            </p>
          </div>
          {activeCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black shrink-0">
              {activeCount} Cod Waa Shidan Yahay
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {AMBIENT_PRESETS.map((preset) => {
            const presetKeys = Object.keys(preset.mix) as AmbientSoundId[];
            const isPresetActive =
              presetKeys.length === activeCount &&
              presetKeys.every((k) => state.activeSounds[k]);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (isPresetActive) {
                    ambientSounds.stopAll();
                  } else {
                    ambientSounds.applyPreset(preset);
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-95 ${
                  isPresetActive
                    ? 'bg-gradient-to-br from-teal-900/80 to-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg'
                    : 'bg-black/35 hover:bg-black/55 border-teal-500/20 hover:border-teal-400/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{preset.icon}</span>
                    <span className="font-black text-xs sm:text-sm text-white truncate">
                      {preset.nameSo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/80 mt-1 line-clamp-1">
                    {preset.descSo}
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isPresetActive
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/10 text-teal-300'
                  }`}
                >
                  {isPresetActive ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main 8 Nature Sound Cards Grid (Mid Walba Gaar u Shid ama Isku Dar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {AMBIENT_SOUNDS.map((sound) => {
          const isPlaying = !!state.activeSounds[sound.id];
          const volPercent = Math.round((state.volumes[sound.id] ?? sound.defaultVolume) * 100);

          return (
            <div
              key={sound.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                isPlaying
                  ? `bg-gradient-to-br ${sound.color} ${sound.borderGlow} shadow-xl ring-2 ring-teal-400/40`
                  : 'bg-[#071f27] hover:bg-[#0a2832] border-teal-500/20 shadow-md'
              }`}
            >
              {/* Top Section: Icon, Title, Subtitle & Play Toggle */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => ambientSounds.toggleSound(sound.id)}
                    className="flex items-center gap-3 text-left group cursor-pointer flex-1 min-w-0"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105 ${
                        isPlaying
                          ? 'bg-white/15 border border-white/30 shadow-inner'
                          : 'bg-black/40 border border-teal-500/20'
                      }`}
                    >
                      {sound.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm sm:text-base text-white truncate">
                        {sound.nameSo}
                      </h4>
                      <p className="text-[11px] text-teal-300/80 font-semibold truncate">
                        {sound.nameEn}
                      </p>
                    </div>
                  </button>

                  {/* Animated Equalizer Badge when active */}
                  {isPlaying && (
                    <div className="flex items-center gap-0.5 bg-emerald-500/20 border border-emerald-400/40 px-2 py-1 rounded-full shrink-0">
                      <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {sound.subtitleSo}
                </p>
              </div>

              {/* Bottom Section: Individual Volume Slider + Start/Stop Button */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-300">Awoodda Codka:</span>
                    <span className="font-mono text-teal-300">{volPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={volPercent}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      ambientSounds.setSoundVolume(sound.id, v);
                      if (!isPlaying) {
                        ambientSounds.startSound(sound.id);
                      }
                    }}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 rounded-lg"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => ambientSounds.toggleSound(sound.id)}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                    isPlaying
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/25'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-teal-500/30'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Wuu Shidan Yahay • Dami</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Daar Codkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Sleep Timer Card (Saacadda Is-daminta Otomaatiga ah marka aad seexanayso) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#07212b] via-[#092b36] to-[#051820] border border-cyan-500/30 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Saacadda Hurdada (Sleep Timer 🌙)</span>
              </h3>
              <p className="text-xs text-slate-300">
                U xiro wakhti uu codka dabeecaddu iskiis isaga damiyo marka aad ku seexato Adhkaarta Hurdada:
              </p>
            </div>
          </div>

          {timerFormatted && (
            <div className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/40 px-3.5 py-1.5 rounded-2xl self-start sm:self-center">
              <Timer className="w-4 h-4 text-amber-300 animate-spin" />
              <span className="font-mono text-base font-black text-amber-300">
                {timerFormatted}
              </span>
              <button
                type="button"
                onClick={() => ambientSounds.clearSleepTimer()}
                className="text-[11px] font-bold text-rose-300 hover:text-white ml-1 underline cursor-pointer"
              >
                Jooji
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: '15 Daqiiqo', mins: 15 },
            { label: '30 Daqiiqo', mins: 30 },
            { label: '45 Daqiiqo', mins: 45 },
            { label: '1 Saac', mins: 60 },
            { label: '90 Daqiiqo', mins: 90 },
            { label: '2 Saac', mins: 120 },
          ].map((item) => (
            <button
              key={item.mins}
              type="button"
              onClick={() => ambientSounds.setSleepTimer(item.mins)}
              className="py-2.5 px-2 rounded-xl bg-black/40 hover:bg-indigo-500/25 border border-indigo-400/25 hover:border-indigo-400 text-indigo-200 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              🌙 {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// GLOBAL FLOATING MINI-PLAYER BAR (SO USER CAN CONTROL AMBIENT SOUNDS ON ANY TAB)
// ============================================================================
export const AmbientMiniPlayer: React.FC<{
  currentTab: string;
  onOpenAmbientTab: () => void;
}> = ({ currentTab, onOpenAmbientTab }) => {
  const [state, setState] = useState<AmbientStateSnapshot>(() => ambientSounds.getState());

  useEffect(() => {
    return ambientSounds.subscribe(setState);
  }, []);

  if (currentTab === 'ambient') return null;
  if (!state.isAnyPlaying && !state.isPausedAll) return null;

  const activeItems = AMBIENT_SOUNDS.filter((s) => state.activeSounds[s.id]);
  const iconsText = activeItems.map((s) => s.icon).join(' ') || '🌿';
  const namesText =
    activeItems.length > 0
      ? activeItems.map((s) => s.nameSo.replace('Codka ', '')).join(' + ')
      : 'Codka Dabeecadda (Hakad)';

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-2 z-30">
      <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#072a35]/95 via-[#0a3845]/95 to-[#06232c]/95 border border-emerald-400/40 shadow-xl backdrop-blur-md flex items-center justify-between gap-2 animate-in fade-in">
        <button
          type="button"
          onClick={onOpenAmbientTab}
          className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer group"
          title="Riix si aad u furto Codadka Dabeecadda"
        >
          <span className="text-lg sm:text-xl px-2 py-1 rounded-xl bg-black/40 border border-teal-400/30 shrink-0">
            {iconsText}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs font-black text-white group-hover:text-emerald-300 truncate">
                {namesText}
              </span>
            </div>
            <p className="text-[10px] text-teal-200/80 truncate">
              Background wuu ka shidan yahay • Taabo si aad wax uga beddesho
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => ambientSounds.pauseOrResumeAll()}
            className="px-2.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            {state.isAnyPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Hakad</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Sii Wad</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => ambientSounds.stopAll()}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="Dami codka dabeecadda"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Dami</span>
          </button>
        </div>
      </div>
    </div>
  );
};
