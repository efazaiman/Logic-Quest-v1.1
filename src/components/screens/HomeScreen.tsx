/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Responsive Game Hub Home Screen
 * - Guarantees the Home header, 3D Logic Core, and the four main action cards
 *   (Quick Play, Daily Challenges, Puzzle Library, Progress) fit together within
 *   the initial visible viewport without vertical scrolling across small phones,
 *   standard/large phones, tablet portrait, tablet landscape, and desktop.
 */

import React, { useId, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Grid,
  Menu,
  Play,
  Settings,
  Trophy,
  X,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getDailySetSummary } from '../../engine/dailyPuzzle';
import {
  DailyCompletionState,
  DailyPuzzleDescriptor,
  PlayerGameProgress,
} from '../../types/game';
import { LogicQuestEmblem } from '../icons/CategoryGlyph';
import { LogicCoreCanvas } from '../three/LogicCoreCanvas';

interface HomeScreenProps {
  resolvedTheme: 'dark' | 'light';
  progress: PlayerGameProgress;
  dailyDescriptor: DailyPuzzleDescriptor;
  dailyState: DailyCompletionState;
  onQuickPlay: () => void;
  onDailyPuzzle: () => void;
  onOpenCollection: () => void;
  onOpenProgress: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  resolvedTheme,
  progress,
  dailyDescriptor,
  dailyState,
  onQuickPlay,
  onDailyPuzzle,
  onOpenCollection,
  onOpenProgress,
  onOpenSettings,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  const MenuIcon = isMenuOpen ? X : Menu;
  const dailySummary = useMemo(
    () => getDailySetSummary(dailyDescriptor.dateKey, dailyState),
    [dailyDescriptor.dateKey, dailyState]
  );

  return (
    <div
      className="home-viewport-shell h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between max-w-[1000px] mx-auto safe-home-pad sm:px-6 sm:py-4 md:px-8 md:py-5 lg:px-10 lg:py-6 gap-2 sm:gap-3 md:gap-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isMenuOpen && !event.defaultPrevented) {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      {/* 1. Compact Home Header */}
      <header className="w-full max-w-[840px] mx-auto flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl icon-3d-secondary flex items-center justify-center shrink-0">
            <LogicQuestEmblem className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-950 dark:text-white block leading-none truncate">
              Logic Quest
            </span>
            <span className="text-[10px] sm:text-xs text-sky-900 dark:text-cyan-300 font-semibold block mt-0.5 leading-tight truncate">
              Futuristic Puzzle Sanctuary
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsMenuOpen(false);
              onOpenSettings();
            }}
            onMouseEnter={() => soundEngine.playHover()}
            aria-label="Open Settings"
            title="Settings"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl icon-3d-secondary flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls={navigationId}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close game menu' : 'Open game menu'}
            onClick={() => {
              soundEngine.playClick();
              setIsMenuOpen((open) => !open);
            }}
            className="home-menu-toggle hidden items-center justify-center gap-2 rounded-xl icon-3d-secondary px-2.5 font-semibold cursor-pointer"
          >
            <MenuIcon className="size-5 shrink-0 max-[360px]:hidden" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      <nav
        id={navigationId}
        aria-label="Main Game Modes"
        data-open={isMenuOpen}
        className="home-actions-grid order-last w-full max-w-[840px] mx-auto grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-3.5 shrink-0"
      >
        {/* 1. QUICK PLAY — Featured 3D Surface */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTransition();
            onQuickPlay();
          }}
          onMouseEnter={() => soundEngine.playHover()}
          className="home-action-card group relative min-h-[58px] sm:min-h-[68px] md:min-h-[76px] p-3 sm:p-3.5 md:p-4 rounded-2xl sm:rounded-3xl card-3d-featured text-left flex flex-row items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl btn-3d-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white ml-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-950 dark:text-white leading-tight truncate">
              Quick Play
            </h2>
            <p className="text-[11px] sm:text-xs text-sky-900 dark:text-cyan-200/90 font-medium leading-tight truncate mt-0.5">
              Instant puzzle session
            </p>
          </div>
        </button>

        {/* 2. DAILY CHALLENGES — Standard 3D Surface */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTransition();
            onDailyPuzzle();
          }}
          onMouseEnter={() => soundEngine.playHover()}
          className="home-action-card group relative min-h-[58px] sm:min-h-[68px] md:min-h-[76px] p-3 sm:p-3.5 md:p-4 rounded-2xl sm:rounded-3xl card-3d-standard text-left flex flex-row items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl icon-3d-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              Daily Challenges
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 tabular-nums leading-tight truncate mt-0.5">
              {dailySummary.isAllCompleted
                ? '3/3 Completed today'
                : `${dailySummary.completedCount}/3 Completed today`}
            </p>
          </div>
        </button>

        {/* 3. PUZZLE LIBRARY — Standard 3D Surface */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenCollection();
          }}
          onMouseEnter={() => soundEngine.playHover()}
          className="home-action-card group relative min-h-[58px] sm:min-h-[68px] md:min-h-[76px] p-3 sm:p-3.5 md:p-4 rounded-2xl sm:rounded-3xl card-3d-standard text-left flex flex-row items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl icon-3d-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              Puzzle Library
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-tight truncate mt-0.5">
              8 puzzle categories
            </p>
          </div>
        </button>

        {/* 4. PROGRESS — Compact 3D Surface */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenProgress();
          }}
          onMouseEnter={() => soundEngine.playHover()}
          className="home-action-card group relative min-h-[58px] sm:min-h-[68px] md:min-h-[76px] p-3 sm:p-3.5 md:p-4 rounded-2xl sm:rounded-3xl card-3d-compact text-left flex flex-row items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl icon-3d-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              Progress
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 tabular-nums leading-tight truncate mt-0.5">
              Lv. {progress.level} · Streak {progress.currentWinStreak}
            </p>
          </div>
        </button>
      </nav>

      <div className="home-core-stage relative flex-1 min-h-[110px] max-h-[500px] w-full max-w-[840px] mx-auto my-auto">
        <LogicCoreCanvas resolvedTheme={resolvedTheme} />
      </div>
    </div>
  );
};
