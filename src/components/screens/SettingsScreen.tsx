/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Settings Overlay Modal
 * Includes:
 * 1. Global Difficulty: Easy, Regular (Adaptive Mixed Pool), Hard
 * 2. Dedicated Audio Section:
 *    - Master Volume slider + Master Mute toggle
 *    - Background Music ON/OFF + Music Volume slider + Safe Single-Instance Preview/Resume
 *    - Sound Effects ON/OFF + Sound Effects Volume slider
 * 3. Gameplay & Appearance:
 *    - Puzzle Hints ON/OFF
 *    - Visual Theme: Dark, Light, System
 * 4. Safe Data Management:
 *    - Reset Gameplay Progress Only (preserves audio & visual settings)
 *    - Restore Default Settings Only (preserves gameplay progress)
 */

import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  Monitor,
  Moon,
  Music,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  DIFFICULTY_PREFERENCE_ORDER,
  formatDifficultyLabel,
  getEffectiveGlobalDifficulty,
  resolveEffectiveDifficulty,
} from '../../engine/difficulty';
import {
  DifficultyPreference,
  GameSettings,
  ThemePreference,
} from '../../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onResetAllStorage: () => void;
  onResetGameplayProgressOnly?: () => void;
  onResetSettingsOnly?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onResetAllStorage,
  onResetGameplayProgressOnly,
  onResetSettingsOnly,
}) => {
  const [confirmResetMode, setConfirmResetMode] = useState<
    null | 'progress' | 'settings'
  >(null);
  const [activeMovementLabel, setActiveMovementLabel] = useState<string>(() =>
    soundEngine.getActiveMusicSectionName()
  );

  useEffect(() => {
    if (!isOpen) {
      setConfirmResetMode(null);
      return;
    }
    setActiveMovementLabel(soundEngine.getActiveMusicSectionName());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMasterMuted = Boolean(settings.masterMuted);
  const masterVolume =
    typeof settings.masterVolume === 'number' ? settings.masterVolume : 80;
  const sfxVolume =
    typeof settings.sfxVolume === 'number' ? settings.sfxVolume : 85;
  const musicVolume =
    typeof settings.musicVolume === 'number' ? settings.musicVolume : 45;

  const globalDiffInfo = getEffectiveGlobalDifficulty(settings);

  const handlePreviewSoundtrack = () => {
    const nextSettings: Partial<GameSettings> = {};
    if (isMasterMuted) {
      nextSettings.masterMuted = false;
    }
    if (!settings.musicEnabled) {
      nextSettings.musicEnabled = true;
    }
    if (musicVolume <= 0) {
      nextSettings.musicVolume = 45;
    }
    if (Object.keys(nextSettings).length > 0) {
      onUpdateSettings(nextSettings);
    }
    // Synchronize immediately so single-instance preview works on this user gesture
    soundEngine.syncPreferences({
      masterMuted: nextSettings.masterMuted ?? isMasterMuted,
      masterVolume,
      soundEffectsEnabled: settings.soundEffectsEnabled,
      sfxVolume,
      musicEnabled: nextSettings.musicEnabled ?? settings.musicEnabled,
      musicVolume: nextSettings.musicVolume ?? musicVolume,
    });
    soundEngine.previewOrResumeMusic();
    setActiveMovementLabel(soundEngine.getActiveMusicSectionName());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-4 sm:p-6 rounded-3xl card-3d-standard card-3d-static space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="settings-modal-title"
            className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close Settings"
            className="w-9 h-9 rounded-xl icon-3d-secondary flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Global Difficulty (Easy, Regular, Hard) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              Global Difficulty
            </label>
            <span className="font-mono text-[11px] font-bold text-sky-800 dark:text-cyan-300">
              {globalDiffInfo.preference === 'normal'
                ? `Regular (Adaptive · ${formatDifficultyLabel(
                    globalDiffInfo.effectiveDifficulty
                  )})`
                : `${formatDifficultyLabel(globalDiffInfo.preference)} (Fixed)`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_PREFERENCE_ORDER.map((pref: DifficultyPreference) => {
              const active = globalDiffInfo.preference === pref;
              const label = formatDifficultyLabel(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    const nextEffective = resolveEffectiveDifficulty(
                      pref,
                      settings.autoDifficultyState,
                      settings.difficulty
                    );
                    onUpdateSettings({
                      difficultyPreference: pref,
                      difficulty: nextEffective,
                    });
                  }}
                  className={`py-2 px-2.5 rounded-xl font-display text-xs sm:text-sm font-bold cursor-pointer ${
                    active
                      ? 'btn-3d-primary text-white'
                      : 'card-3d-compact text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {globalDiffInfo.preference === 'normal' && (
            <div className="px-3 py-1.5 rounded-xl card-3d-compact card-3d-static flex items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800 dark:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Adaptive Target:{' '}
                  {formatDifficultyLabel(globalDiffInfo.effectiveDifficulty)}
                </span>
              </span>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Mixed Pool (Easy + Regular + Hard)
              </span>
            </div>
          )}
        </div>

        {/* 2. Dedicated Audio Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              Audio
            </label>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isMasterMuted
                ? 'Master Muted'
                : settings.musicEnabled
                ? `Music: ${activeMovementLabel}`
                : 'Music Off'}
            </span>
          </div>

          {/* A. Master Volume & Master Mute */}
          <div className="p-3 rounded-2xl card-3d-compact card-3d-static space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isMasterMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Master Volume
                </span>
                <span className="font-mono text-xs font-bold text-sky-800 dark:text-cyan-300 tabular-nums">
                  {isMasterMuted ? 'Muted' : `${masterVolume}%`}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isMasterMuted}
                aria-label="Master Mute"
                onClick={() => {
                  const nextMuted = !isMasterMuted;
                  onUpdateSettings({ masterMuted: nextMuted });
                  if (!nextMuted) {
                    setTimeout(() => soundEngine.playClick(), 30);
                  }
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                  isMasterMuted
                    ? 'bg-rose-500/20 border border-rose-500/45 text-rose-700 dark:text-rose-300'
                    : 'icon-3d-secondary text-slate-700 dark:text-slate-200'
                }`}
              >
                {isMasterMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              aria-label="Master Volume"
              disabled={isMasterMuted}
              value={masterVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings({ masterVolume: val });
              }}
              className="w-full accent-sky-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* B. Background Music ON/OFF + Music Volume Slider + Safe Single-Instance Preview */}
          <div className="p-3 rounded-2xl card-3d-compact card-3d-static space-y-2">
            <div className="settings-music-controls flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                  Background Music
                </span>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300 tabular-nums shrink-0">
                  {settings.musicEnabled && !isMasterMuted
                    ? `${musicVolume}%`
                    : 'OFF'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePreviewSoundtrack}
                  title="Safely resume or preview the background soundtrack"
                  className="px-2.5 py-1 rounded-xl icon-3d-secondary text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.musicEnabled}
                  aria-label="Music ON/OFF"
                  onClick={() => {
                    const nextEnabled = !settings.musicEnabled;
                    soundEngine.playClick();
                    onUpdateSettings({ musicEnabled: nextEnabled });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                    settings.musicEnabled
                      ? 'btn-3d-primary text-white'
                      : 'icon-3d-secondary text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {settings.musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              aria-label="Music Volume"
              disabled={isMasterMuted || !settings.musicEnabled}
              value={musicVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings({ musicVolume: val });
              }}
              className="w-full accent-indigo-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* C. Sound Effects ON/OFF + Sound Effects Volume Slider */}
          <div className="p-3 rounded-2xl card-3d-compact card-3d-static space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Sound Effects
                </span>
                <span className="font-mono text-xs font-bold text-sky-800 dark:text-cyan-300 tabular-nums">
                  {settings.soundEffectsEnabled && !isMasterMuted
                    ? `${sfxVolume}%`
                    : 'OFF'}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEffectsEnabled}
                aria-label="Sound Effects ON/OFF"
                onClick={() => {
                  const next = !settings.soundEffectsEnabled;
                  onUpdateSettings({ soundEffectsEnabled: next });
                  if (next && !isMasterMuted) {
                    setTimeout(() => soundEngine.playHintChime(), 30);
                  }
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                  settings.soundEffectsEnabled
                    ? 'btn-3d-primary text-white'
                    : 'icon-3d-secondary text-slate-600 dark:text-slate-300'
                }`}
              >
                {settings.soundEffectsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              aria-label="Sound Effects Volume"
              disabled={isMasterMuted || !settings.soundEffectsEnabled}
              value={sfxVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings({ sfxVolume: val });
              }}
              className="w-full accent-sky-500 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* 3. Gameplay & Appearance (Hints + Theme) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-2xl card-3d-compact card-3d-static">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Puzzle Hints
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.hintsEnabled}
              onClick={() => {
                soundEngine.playClick();
                onUpdateSettings({ hintsEnabled: !settings.hintsEnabled });
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                settings.hintsEnabled
                  ? 'btn-3d-primary text-white'
                  : 'icon-3d-secondary text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.hintsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'system', label: 'System', icon: Monitor },
              ] as Array<{
                id: ThemePreference;
                label: string;
                icon: React.FC<{ className?: string }>;
              }>
            ).map((t) => {
              const Icon = t.icon;
              const active = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateSettings({ theme: t.id });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? 'btn-3d-primary text-white'
                      : 'card-3d-compact text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Data & Reset Management + Done */}
        <div className="pt-2 border-t border-sky-200/70 dark:border-sky-400/15 space-y-2.5">
          {!confirmResetMode ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmResetMode('progress')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Progress</span>
                </button>

                {onResetSettingsOnly && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetMode('settings')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Default Settings</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl btn-3d-primary text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/35 space-y-2">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {confirmResetMode === 'progress'
                  ? 'Reset all gameplay progress, solved puzzles, Win Streak, and achievements? Your audio and theme settings will be preserved.'
                  : 'Restore default audio, difficulty, and visual theme settings? Your gameplay progress will be preserved.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmResetMode(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    if (confirmResetMode === 'progress') {
                      if (onResetGameplayProgressOnly) {
                        onResetGameplayProgressOnly();
                      } else {
                        onResetAllStorage();
                      }
                    } else if (onResetSettingsOnly) {
                      onResetSettingsOnly();
                    }
                    setConfirmResetMode(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  {confirmResetMode === 'progress'
                    ? 'Confirm Progress Reset'
                    : 'Restore Defaults'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
