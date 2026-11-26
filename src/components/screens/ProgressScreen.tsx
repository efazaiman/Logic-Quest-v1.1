/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Clean Player Progression Dashboard
 * Main Visible Section:
 * 1. Level and XP progress bar
 * 2. Total puzzles solved
 * 3. Current Win Streak (with compact 8-win milestone progress)
 * 4. Best Win Streak
 * 5. Achievements unlocked
 *
 * Expandable Sections:
 * - Category Progress (8 categories with custom icons & compact completion indicators)
 * - Achievements (unlocked achievements & progress toward locked achievements)
 * - Optional Statistics (accuracy, best score, fastest solve, and milestone records)
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Grid,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getAllCategories } from '../../engine/categories';
import {
  PUZZLE_CATALOG,
  getCatalogPuzzlesByCategory,
  isCatalogPuzzleSolved,
} from '../../engine/generator';
import {
  ACHIEVEMENT_DEFINITIONS,
  WIN_STREAK_MILESTONE_TARGET,
  evaluateAchievementProgress,
  isPlayerFacingAchievementId,
} from '../../storage/storageManager';
import {
  DailyCompletionState,
  GameCompletionRecord,
  PlayerGameProgress,
  UnlockedAchievementRecord,
} from '../../types/game';
import { CategoryGlyph } from '../icons/CategoryGlyph';

interface ProgressScreenProps {
  progress: PlayerGameProgress;
  completionRecords: GameCompletionRecord[];
  unlockedAchievements: UnlockedAchievementRecord[];
  dailyState?: DailyCompletionState;
  onBackHome: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  progress,
  completionRecords,
  unlockedAchievements,
  dailyState,
  onBackHome,
}) => {
  const [expandedSection, setExpandedSection] = useState<
    'categories' | 'achievements' | 'statistics' | null
  >(null);

  const categories = getAllCategories();
  const xpPercent = Math.min(
    100,
    Math.round(
      (progress.currentXp / Math.max(1, progress.xpForNextLevel)) * 100
    )
  );

  const solvedCatalogCount = useMemo(
    () =>
      PUZZLE_CATALOG.filter((p) =>
        isCatalogPuzzleSolved(p.id, completionRecords)
      ).length,
    [completionRecords]
  );

  const totalPuzzlesSolved = Math.max(
    solvedCatalogCount,
    progress.totalPuzzlesCompleted
  );

  const totalPlayerFacingAchievementsCount = useMemo(
    () =>
      ACHIEVEMENT_DEFINITIONS.filter((def) =>
        isPlayerFacingAchievementId(def.id)
      ).length,
    []
  );

  const unlockedPlayerFacingAchievementsCount = useMemo(
    () =>
      unlockedAchievements.filter((u) =>
        isPlayerFacingAchievementId(u.achievementId)
      ).length,
    [unlockedAchievements]
  );

  const achievementItems = useMemo(
    () =>
      evaluateAchievementProgress({
        progress,
        records: completionRecords,
        dailyState,
        unlocked: unlockedAchievements,
      }).filter((item) => isPlayerFacingAchievementId(item.definition.id)),
    [progress, completionRecords, dailyState, unlockedAchievements]
  );

  const fastestOverallTime = useMemo(() => {
    let fastest: number | null = null;
    for (const cat of categories) {
      const catTime = progress.categoryStats[cat.id]?.fastestTimeSeconds;
      if (typeof catTime === 'number' && catTime > 0) {
        fastest = fastest === null ? catTime : Math.min(fastest, catTime);
      }
    }
    return fastest;
  }, [categories, progress.categoryStats]);

  const formatTimeShort = (secs: number | null) => {
    if (secs === null) return '—';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  const toggleSection = (
    section: 'categories' | 'achievements' | 'statistics'
  ) => {
    soundEngine.playClick();
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const milestoneStep =
    progress.currentWinStreak > 0 && progress.winsTowardNextMilestone === 0
      ? WIN_STREAK_MILESTONE_TARGET
      : progress.winsTowardNextMilestone;

  return (
    <div className="w-full max-w-[860px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onBackHome();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl icon-3d-secondary text-xs sm:text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <h1 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white">
          Player Progress
        </h1>
      </div>

      {/* MAIN VISIBLE SECTION */}
      <div className="space-y-3">
        {/* 1. Level and XP Progress Bar */}
        <div className="p-4 sm:p-5 rounded-3xl card-3d-featured space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl btn-3d-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-sky-900 dark:text-cyan-300">
                  Current Level
                </div>
                <div className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tabular-nums leading-tight">
                  Level {progress.level}
                </div>
              </div>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                {progress.currentXp} / {progress.xpForNextLevel} XP
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                Next level in{' '}
                {Math.max(0, progress.xpForNextLevel - progress.currentXp)} XP
              </div>
            </div>
          </div>

          <div
            className="w-full h-2.5 rounded-full bg-sky-950/12 dark:bg-slate-950/80 p-0.5 overflow-hidden"
            role="progressbar"
            aria-label="Level XP Progress"
            aria-valuenow={xpPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(14,165,233,0.45)]"
              style={{
                width: `${Math.max(4, xpPercent)}%`,
                background: 'var(--3d-cyan-grad)',
              }}
            />
          </div>
        </div>

        {/* 2–5. Balanced 2×2 / 4-Card Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 tabular-nums">
          {/* 2. Total Puzzles Solved */}
          <div className="p-3.5 sm:p-4 rounded-2xl card-3d-standard card-3d-static flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Puzzles Solved
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {totalPuzzlesSolved}
            </div>
          </div>

          {/* 3. Current Win Streak (with subtle 8-win milestone progress) */}
          <div className="p-3.5 sm:p-4 rounded-2xl card-3d-standard card-3d-static flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Streak
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/25" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-display text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {progress.currentWinStreak}
                </span>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  {milestoneStep}/{WIN_STREAK_MILESTONE_TARGET}
                </span>
              </div>
              <div
                className="grid grid-cols-8 gap-1"
                aria-label={`${milestoneStep} of ${WIN_STREAK_MILESTONE_TARGET} wins toward next streak reward`}
              >
                {Array.from({ length: WIN_STREAK_MILESTONE_TARGET }).map(
                  (_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx < milestoneStep
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-sky-950/15 dark:bg-slate-800'
                      }`}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          {/* 4. Best Win Streak */}
          <div className="p-3.5 sm:p-4 rounded-2xl card-3d-standard card-3d-static flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Best Win Streak
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-sky-700 dark:text-cyan-400">
              {progress.bestWinStreak}
            </div>
          </div>

          {/* 5. Achievements Unlocked */}
          <div className="p-3.5 sm:p-4 rounded-2xl card-3d-standard card-3d-static flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Achievements
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {unlockedPlayerFacingAchievementsCount}{' '}
              <span className="text-sm font-mono font-normal text-slate-600 dark:text-slate-400">
                / {totalPlayerFacingAchievementsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE SECTIONS */}
      <div className="space-y-2.5">
        {/* 1. Category Progress */}
        <div className="rounded-3xl card-3d-standard card-3d-static overflow-hidden">
          <button
            type="button"
            aria-expanded={expandedSection === 'categories'}
            onClick={() => toggleSection('categories')}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <Grid className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Category Progress
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Completion across all 8 puzzle categories
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
              {expandedSection === 'categories' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {expandedSection === 'categories' && (
            <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-sky-200/60 dark:border-sky-400/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const catPuzzles = getCatalogPuzzlesByCategory(cat.id);
                const solvedInCat = catPuzzles.filter((p) =>
                  isCatalogPuzzleSolved(p.id, completionRecords)
                ).length;
                const ratioPercent = Math.round(
                  (solvedInCat / Math.max(1, catPuzzles.length)) * 100
                );

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl card-3d-compact card-3d-static flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${cat.accentHex}1F`,
                        border: `1px solid ${cat.accentHex}4D`,
                      }}
                    >
                      <CategoryGlyph
                        category={cat.id}
                        className="w-6 h-6"
                        accentColor={cat.accentHex}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
                          {cat.title}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                          {solvedInCat}/{catPuzzles.length}
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-sky-950/10 dark:bg-slate-950/75 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${ratioPercent}%`,
                            backgroundColor: cat.accentHex,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Achievements */}
        <div className="rounded-3xl card-3d-standard card-3d-static overflow-hidden">
          <button
            type="button"
            aria-expanded={expandedSection === 'achievements'}
            onClick={() => toggleSection('achievements')}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Achievements
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Unlocked milestones and remaining goals
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
              {expandedSection === 'achievements' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {expandedSection === 'achievements' && (
            <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-sky-200/60 dark:border-sky-400/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievementItems.map((item) => {
                const ach = item.definition;
                const isUnlocked = item.isUnlocked;
                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-2.5 ${
                      isUnlocked
                        ? 'card-3d-featured !border-cyan-500/75 dark:!border-cyan-400/65 text-slate-950 dark:text-white'
                        : 'card-3d-compact card-3d-static opacity-85'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isUnlocked
                            ? 'btn-3d-primary text-white'
                            : 'icon-3d-secondary opacity-75'
                        }`}
                      >
                        {isUnlocked ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Award className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                            {ach.title}
                          </div>
                          {ach.xpReward ? (
                            <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-cyan-300 shrink-0">
                              +{ach.xpReward} XP
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                          {ach.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{isUnlocked ? 'Unlocked' : ach.unlockCriteriaText}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.currentValue} / {item.targetValue}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-sky-950/10 dark:bg-slate-950/75 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isUnlocked
                              ? 'bg-emerald-500'
                              : 'bg-sky-500 dark:bg-cyan-400'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Optional Statistics */}
        <div className="rounded-3xl card-3d-standard card-3d-static overflow-hidden">
          <button
            type="button"
            aria-expanded={expandedSection === 'statistics'}
            onClick={() => toggleSection('statistics')}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Optional Statistics
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Accuracy, personal score records and solve times
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl icon-3d-secondary flex items-center justify-center shrink-0">
              {expandedSection === 'statistics' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {expandedSection === 'statistics' && (
            <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-sky-200/60 dark:border-sky-400/15 grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Best Score
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white mt-0.5">
                  {progress.bestOverallScore ?? '—'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Average Accuracy
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {progress.averageAccuracyPercent !== null
                    ? `${progress.averageAccuracyPercent}%`
                    : '—'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Fastest Solve
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white mt-0.5">
                  {formatTimeShort(fastestOverallTime)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  8-Win Milestones
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {progress.winStreakMilestonesAchieved}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
