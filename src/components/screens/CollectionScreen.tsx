/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Simplified Puzzle Library & Dedicated Mode Screens
 * Exports:
 * 1. `CollectionScreen` (Puzzle Library): Shows ONLY the 8 puzzle categories and, when opened,
 *    the 8 puzzles in that category with difficulty filtering, completion status, and launch/replay.
 * 2. `QuickPlayScreen`: Dedicated unlimited free-play launcher with category, difficulty, and
 *    smart random or specific puzzle selection.
 * 3. `DailyChallengesScreen`: Dedicated Three Daily Challenges experience (0/3 to 3/3 progress,
 *    3 distinct deterministic puzzles per local calendar date, result inspection, and replay protection).
 */

import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Grid,
  Lock,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getAllCategories, getCategoryMetadata } from '../../engine/categories';
import { getDailySetSummary } from '../../engine/dailyPuzzle';
import {
  DIFFICULTY_PREFERENCE_ORDER,
  filterPuzzlesByDifficultyPreference,
  formatDifficultyLabel,
  getEffectiveCategoryDifficulty,
} from '../../engine/difficulty';
import {
  PUZZLE_CATALOG,
  filterCatalogPuzzles,
  getCatalogPuzzleById,
  getCatalogPuzzlesByCategory,
  getRecordsForCatalogPuzzle,
  isCatalogPuzzleSolved,
  selectNextLibraryCategoryPuzzle,
  selectQuickPlayPuzzle,
} from '../../engine/generator';
import {
  DailyCompletionState,
  DailyPuzzleDescriptor,
  DifficultyLevel,
  DifficultyPreference,
  GameCompletionRecord,
  GameplayModeMetadata,
  GameSettings,
  PlayerGameProgress,
  PuzzleCategory,
  PuzzleInteractionType,
  QuickPlayConfigState,
} from '../../types/game';
import { CategoryGlyph } from '../icons/CategoryGlyph';

const MECHANIC_DISPLAY_LABEL: Record<PuzzleInteractionType, string> = {
  multiple_choice: 'Choice Matrix',
  pattern_recognition: 'Pattern Builder',
  sequence_puzzle: 'Sequence Console',
  spatial_reasoning: 'Spatial Simulator',
  logical_deduction: 'Deduction Grid',
  cipher_code: 'Cipher Console',
  mathematical_reasoning: 'Node Solver',
  memory_challenge: 'Memory Recall',
};

const formatTime = (secs: number) => {
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
};

// ============================================================================
// 1. PUZZLE LIBRARY SCREEN (COMPACT 8 CATEGORIES + HORIZONTAL PUZZLE ROWS)
// ============================================================================

export interface CollectionScreenProps {
  selectedCategory: PuzzleCategory | null;
  settings: GameSettings;
  progress: PlayerGameProgress;
  completionRecords: GameCompletionRecord[];
  onSelectCategory: (category: PuzzleCategory | null) => void;
  onUpdateCategoryDifficulty: (
    category: PuzzleCategory,
    preference: DifficultyPreference | null
  ) => void;
  onStartLibraryPuzzle: (category: PuzzleCategory, puzzleId: string) => void;
  onBackHome: () => void;
}

export const CollectionScreen: React.FC<CollectionScreenProps> = ({
  selectedCategory,
  settings,
  progress,
  completionRecords,
  onSelectCategory,
  onUpdateCategoryDifficulty,
  onStartLibraryPuzzle,
  onBackHome,
}) => {
  const allCategories = getAllCategories();

  const totalCatalogSolved = useMemo(
    () =>
      PUZZLE_CATALOG.filter((p) =>
        isCatalogPuzzleSolved(p.id, completionRecords)
      ).length,
    [completionRecords]
  );

  const activeCategoryMeta = useMemo(
    () => (selectedCategory ? getCategoryMetadata(selectedCategory) : null),
    [selectedCategory]
  );

  const categoryDifficultyInfo = useMemo(
    () =>
      selectedCategory
        ? getEffectiveCategoryDifficulty(settings, selectedCategory)
        : null,
    [settings, selectedCategory]
  );

  const categoryAllPuzzles = useMemo(
    () =>
      selectedCategory ? getCatalogPuzzlesByCategory(selectedCategory) : [],
    [selectedCategory]
  );

  // Easy -> 3 Easy puzzles; Hard -> 2 Hard puzzles; Regular -> all 8 puzzles in the category (mixed pool)
  const filteredCategoryPuzzles = useMemo(() => {
    if (!categoryDifficultyInfo) return [];
    return filterPuzzlesByDifficultyPreference(
      categoryAllPuzzles,
      categoryDifficultyInfo.preference
    );
  }, [categoryAllPuzzles, categoryDifficultyInfo]);

  // Recommended next puzzle (in Regular mode, adapts to effectiveDifficulty across the 8-puzzle mixed pool)
  const recommendedCategoryPuzzle = useMemo(() => {
    if (!selectedCategory || !categoryDifficultyInfo) return null;
    return selectNextLibraryCategoryPuzzle({
      category: selectedCategory,
      difficultyPreference: categoryDifficultyInfo.preference,
      effectiveDifficulty: categoryDifficultyInfo.effectiveDifficulty,
      completionRecords,
    });
  }, [selectedCategory, categoryDifficultyInfo, completionRecords]);

  const solvedInSelectedCategory = useMemo(
    () =>
      categoryAllPuzzles.filter((p) =>
        isCatalogPuzzleSolved(p.id, completionRecords)
      ).length,
    [categoryAllPuzzles, completionRecords]
  );

  return (
    <div className="w-full max-w-[980px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSelectCategory(null);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl icon-3d-secondary text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Puzzle Library</span>
            </button>
          ) : (
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
          )}

          {selectedCategory && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onBackHome();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl card-3d-compact text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <span>Home</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl card-3d-compact card-3d-static text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Solved: </span>
            <span className="font-bold text-sky-800 dark:text-cyan-300">
              {totalCatalogSolved}/64
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl card-3d-compact card-3d-static text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Streak: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {progress.winsTowardNextMilestone}/8
            </span>
          </div>
        </div>
      </div>

      {/* VIEW A: COMPACT, COLOURFUL 8 PUZZLE CATEGORY CARDS */}
      {!selectedCategory && (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-sky-800 dark:text-cyan-300">
                <Grid className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                <span>8 Cognitive Domains</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white leading-tight">
                Puzzle Library
              </h1>
            </div>
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Global Difficulty:{' '}
              <span className="font-bold text-sky-800 dark:text-cyan-300">
                {formatDifficultyLabel(
                  settings.difficultyPreference ?? settings.difficulty
                )}
              </span>
              {(settings.difficultyPreference ?? settings.difficulty) ===
                'normal' && (
                <span className="text-slate-500 dark:text-slate-400">
                  {' '}
                  (Adaptive · {formatDifficultyLabel(settings.difficulty)})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {allCategories.map((cat) => {
              const catPuzzles = getCatalogPuzzlesByCategory(cat.id);
              const solvedInCat = catPuzzles.filter((p) =>
                isCatalogPuzzleSolved(p.id, completionRecords)
              ).length;
              const pct = Math.round((solvedInCat / catPuzzles.length) * 100);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCategory(cat.id);
                  }}
                  onMouseEnter={() => soundEngine.playHover()}
                  style={{
                    borderColor: `${cat.accentHex}55`,
                    backgroundImage: `linear-gradient(155deg, ${cat.accentHex}1A 0%, ${cat.secondaryHex}0E 100%)`,
                  }}
                  className="group p-4 sm:p-5 rounded-2xl sm:rounded-3xl card-3d-standard text-left flex flex-col justify-between gap-3.5 cursor-pointer transition-all"
                >
                  {/* 1. Large, recognisable category icon as the visual focus */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: `${cat.accentHex}20`,
                        border: `1.5px solid ${cat.accentHex}55`,
                        boxShadow: `0 6px 16px -4px ${cat.accentHex}33`,
                      }}
                    >
                      <CategoryGlyph
                        category={cat.id}
                        className="w-7 h-7 sm:w-8 sm:h-8"
                        accentColor={cat.accentHex}
                      />
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums pt-1">
                      {solvedInCat}/{catPuzzles.length}
                    </span>
                  </div>

                  {/* 2. Category name & 3. Puzzle count */}
                  <div className="space-y-0.5">
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-snug sm:line-clamp-1">
                      {cat.title}
                    </h2>
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      {catPuzzles.length} Puzzles
                    </div>
                  </div>

                  {/* 4. Compact completion progress bar */}
                  <div
                    className="w-full h-1.5 rounded-full bg-slate-900/10 dark:bg-slate-950/75 overflow-hidden"
                    role="progressbar"
                    aria-label={`${cat.title} completion`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.accentHex,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: INSIDE A CATEGORY — DIFFICULTY SELECTOR + HORIZONTAL PUZZLE ROWS */}
      {selectedCategory && activeCategoryMeta && categoryDifficultyInfo && (
        <div className="space-y-4">
          {/* Compact Category Header & Difficulty Selector */}
          <div
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl card-3d-featured space-y-3.5"
            style={{
              borderColor: `${activeCategoryMeta.accentHex}66`,
              backgroundImage: `linear-gradient(145deg, ${activeCategoryMeta.accentHex}1e 0%, ${activeCategoryMeta.secondaryHex}10 100%)`,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${activeCategoryMeta.accentHex}24`,
                    border: `1.5px solid ${activeCategoryMeta.accentHex}55`,
                  }}
                >
                  <CategoryGlyph
                    category={activeCategoryMeta.id}
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    accentColor={activeCategoryMeta.accentHex}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-sky-800 dark:text-cyan-300">
                    <span>{solvedInSelectedCategory}/8 Solved</span>
                    <span>·</span>
                    <span>
                      {categoryDifficultyInfo.isOverridden
                        ? 'Category Difficulty Override'
                        : `Global Default (${formatDifficultyLabel(
                            categoryDifficultyInfo.globalPreference
                          )})`}
                    </span>
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white truncate">
                    {activeCategoryMeta.title}
                  </h1>
                </div>
              </div>

              {/* Difficulty Selector: Easy, Regular, Hard */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div
                  className="inline-flex items-center p-1 rounded-xl card-3d-compact card-3d-static gap-1"
                  role="group"
                  aria-label="Category Difficulty Selector"
                >
                  {DIFFICULTY_PREFERENCE_ORDER.map((pref) => {
                    const isSelected =
                      categoryDifficultyInfo.preference === pref;
                    const label = formatDifficultyLabel(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onUpdateCategoryDifficulty(selectedCategory, pref);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'btn-3d-primary text-white'
                            : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {categoryDifficultyInfo.isOverridden && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateCategoryDifficulty(selectedCategory, null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl icon-3d-secondary text-[11px] font-semibold cursor-pointer"
                  >
                    Use Global Setting
                  </button>
                )}
              </div>
            </div>

            {/* Active Effective Difficulty & Adaptive Launch Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 pt-2 border-t border-sky-300/30 dark:border-sky-400/15">
              <span>
                {categoryDifficultyInfo.preference === 'normal' ? (
                  <>
                    Showing all{' '}
                    <strong className="text-slate-950 dark:text-white">
                      {filteredCategoryPuzzles.length} Mixed Pool
                    </strong>{' '}
                    puzzles · Adaptive Target:{' '}
                    <strong className="text-sky-800 dark:text-cyan-300">
                      {formatDifficultyLabel(
                        categoryDifficultyInfo.effectiveDifficulty
                      )}
                    </strong>
                  </>
                ) : (
                  <>
                    Showing{' '}
                    <strong className="text-slate-950 dark:text-white">
                      {filteredCategoryPuzzles.length}{' '}
                      {formatDifficultyLabel(categoryDifficultyInfo.preference)}{' '}
                      (Fixed)
                    </strong>{' '}
                    puzzle{filteredCategoryPuzzles.length === 1 ? '' : 's'}
                  </>
                )}
              </span>

              {recommendedCategoryPuzzle && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTransition();
                    onStartLibraryPuzzle(
                      recommendedCategoryPuzzle.category,
                      recommendedCategoryPuzzle.id
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl btn-3d-primary text-white font-display text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {categoryDifficultyInfo.preference === 'normal'
                      ? `Play Adaptive (${recommendedCategoryPuzzle.title})`
                      : `Play Next (${recommendedCategoryPuzzle.title})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Clean Horizontal Row List of Puzzles Matching Selected Difficulty */}
          <div className="space-y-2.5">
            {filteredCategoryPuzzles.map((entry, idx) => {
              const isSolved = isCatalogPuzzleSolved(
                entry.id,
                completionRecords
              );
              const recordsForPuzzle = getRecordsForCatalogPuzzle(
                entry.id,
                completionRecords
              );
              const bestScore =
                recordsForPuzzle.length > 0
                  ? Math.max(...recordsForPuzzle.map((r) => r.score))
                  : null;
              const isRecommendedAdaptive =
                categoryDifficultyInfo.preference === 'normal' &&
                recommendedCategoryPuzzle?.id === entry.id;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTransition();
                    onStartLibraryPuzzle(entry.category, entry.id);
                  }}
                  onMouseEnter={() => soundEngine.playHover()}
                  className={`w-full min-h-[64px] sm:min-h-[70px] px-3.5 sm:px-5 py-3 rounded-2xl card-3d-standard flex items-center justify-between gap-3 text-left cursor-pointer group transition-all ${
                    isRecommendedAdaptive
                      ? '!border-cyan-500/70 dark:!border-cyan-400/70'
                      : ''
                  }`}
                >
                  {/* Left: Compact Marker & Puzzle Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                      style={{
                        backgroundColor: `${activeCategoryMeta.accentHex}22`,
                        border: `1px solid ${activeCategoryMeta.accentHex}55`,
                        color: activeCategoryMeta.accentHex,
                      }}
                    >
                      #{idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white truncate">
                          {entry.title}
                        </h2>
                        {isRecommendedAdaptive && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-sky-800 dark:text-cyan-300 font-mono text-[10px] font-bold">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Adaptive Next</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        <span>
                          {
                            MECHANIC_DISPLAY_LABEL[
                              entry.puzzleType ?? 'multiple_choice'
                            ]
                          }
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>~{entry.estimatedTimeSeconds ?? 45}s</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Difficulty Label, Completion Status & Action */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold ${
                        entry.difficulty === 'easy'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : entry.difficulty === 'normal'
                          ? 'bg-sky-500/15 text-sky-800 dark:text-cyan-300'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {formatDifficultyLabel(entry.difficulty)}
                    </span>

                    {isSolved ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Solved{bestScore !== null ? ` · ${bestScore}` : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="hidden sm:inline-block text-xs font-mono text-slate-500 dark:text-slate-400">
                        Unsolved
                      </span>
                    )}

                    <span className="px-3 py-1.5 rounded-xl btn-3d-primary text-white font-display text-xs font-bold inline-flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
                      {isSolved ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Replay</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. DEDICATED QUICK PLAY SCREEN (UNLIMITED FREE PLAY)
// ============================================================================

export interface QuickPlayScreenProps {
  quickPlayConfig: QuickPlayConfigState;
  progress: PlayerGameProgress;
  completionRecords: GameCompletionRecord[];
  onUpdateQuickPlayConfig: (partial: Partial<QuickPlayConfigState>) => void;
  onStartQuickPlaySession: (
    category: PuzzleCategory,
    puzzleId: string,
    difficulty: DifficultyLevel,
    metadata?: GameplayModeMetadata
  ) => void;
  onOpenLibrary: () => void;
  onBackHome: () => void;
}

export const QuickPlayScreen: React.FC<QuickPlayScreenProps> = ({
  quickPlayConfig,
  progress,
  completionRecords,
  onUpdateQuickPlayConfig,
  onStartQuickPlaySession,
  onOpenLibrary,
  onBackHome,
}) => {
  const allCategories = getAllCategories();

  const quickPlayCandidates = useMemo(
    () =>
      filterCatalogPuzzles({
        category: quickPlayConfig.categoryFilter,
        difficulty: quickPlayConfig.difficulty,
        status: 'all',
        completionRecords,
      }),
    [
      quickPlayConfig.categoryFilter,
      quickPlayConfig.difficulty,
      completionRecords,
    ]
  );

  const quickPlayUnsolvedCount = useMemo(
    () =>
      quickPlayCandidates.filter(
        (p) => !isCatalogPuzzleSolved(p.id, completionRecords)
      ).length,
    [quickPlayCandidates, completionRecords]
  );

  const handleLaunchQuickPlay = () => {
    const chosen = selectQuickPlayPuzzle({
      categoryFilter: quickPlayConfig.categoryFilter,
      difficulty: quickPlayConfig.difficulty,
      selectionType: quickPlayConfig.selectionType,
      specificPuzzleId:
        quickPlayConfig.selectionType === 'specific'
          ? quickPlayConfig.selectedPuzzleId
          : null,
      recentPuzzleIds: quickPlayConfig.recentPuzzleIds,
      completionRecords,
      seedIndex: completionRecords.length + 1,
    });

    onUpdateQuickPlayConfig({
      recentPuzzleIds: [
        chosen.id,
        ...quickPlayConfig.recentPuzzleIds.filter((id) => id !== chosen.id),
      ].slice(0, 6),
    });

    onStartQuickPlaySession(chosen.category, chosen.id, chosen.difficulty, {
      quickPlayCategoryFilter: quickPlayConfig.categoryFilter,
      quickPlayDifficultyFilter: quickPlayConfig.difficulty,
      quickPlaySelectionType: quickPlayConfig.selectionType,
    });
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onBackHome();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl icon-3d-secondary text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sanctuary Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenLibrary();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl card-3d-compact text-xs sm:text-sm font-semibold text-sky-800 dark:text-cyan-300 cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            <span>Puzzle Library</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-2xl card-3d-compact card-3d-static text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Win Streak: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {progress.currentWinStreak} ({progress.winsTowardNextMilestone}/8)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Play Configuration Card */}
      <div className="p-6 sm:p-8 rounded-3xl card-3d-featured space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-200/60 dark:border-sky-400/15 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-sky-800 dark:text-cyan-300">
              <Play className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 fill-current" />
              <span>Unlimited Free Play</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              Quick Play
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-2xl">
              Play as many puzzles as you want at your own pace. Choose a category or play across all categories, select your difficulty, and launch a smart non-repeating puzzle immediately.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTransition();
              handleLaunchQuickPlay();
            }}
            className="self-start sm:self-center py-3.5 px-6 rounded-2xl btn-3d-primary text-white font-display font-bold text-sm sm:text-base inline-flex items-center gap-2.5 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Quick Play</span>
          </button>
        </div>

        {/* 1. Difficulty Tier */}
        <div className="space-y-2.5">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            1. Select Difficulty Tier
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map((diff) => {
              const isSelected = quickPlayConfig.difficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateQuickPlayConfig({
                      difficulty: diff,
                      selectedPuzzleId: null,
                    });
                  }}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'card-3d-featured !border-cyan-500 dark:!border-cyan-400'
                      : 'card-3d-compact'
                  }`}
                >
                  <div className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {formatDifficultyLabel(diff)}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {diff === 'easy'
                      ? 'Foundation · 1.0× XP'
                      : diff === 'normal'
                      ? 'Sanctuary · 1.25× XP'
                      : 'Mastery · 1.60× XP'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Category Filter */}
        <div className="space-y-2.5">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            2. Choose Category ({quickPlayCandidates.length} Matching ·{' '}
            {quickPlayUnsolvedCount} Unsolved)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onUpdateQuickPlayConfig({
                  categoryFilter: 'all',
                  selectedPuzzleId: null,
                });
              }}
              className={`p-3 rounded-2xl text-left flex items-center gap-2.5 cursor-pointer ${
                quickPlayConfig.categoryFilter === 'all'
                  ? 'card-3d-featured !border-cyan-500 dark:!border-cyan-400'
                  : 'card-3d-compact'
              }`}
            >
              <Shuffle className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  All Categories
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  All 8 Domains
                </div>
              </div>
            </button>

            {allCategories.map((cat) => {
              const isSelected = quickPlayConfig.categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateQuickPlayConfig({
                      categoryFilter: cat.id,
                      selectedPuzzleId: null,
                    });
                  }}
                  className={`p-3 rounded-2xl text-left flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'card-3d-featured !border-cyan-500 dark:!border-cyan-400'
                      : 'card-3d-compact'
                  }`}
                >
                  <CategoryGlyph
                    category={cat.id}
                    className="w-4 h-4 shrink-0"
                    accentColor={cat.accentHex}
                  />
                  <div className="min-w-0">
                    <div className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {cat.shortTitle}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {cat.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Smart Random vs Specific Puzzle */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              3. Selection Mode
            </label>

            <div className="inline-flex items-center p-1 rounded-xl card-3d-compact card-3d-static gap-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateQuickPlayConfig({
                    selectionType: 'random',
                    selectedPuzzleId: null,
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  quickPlayConfig.selectionType === 'random'
                    ? 'btn-3d-primary text-white'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Smart Random
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateQuickPlayConfig({
                    selectionType: 'specific',
                    selectedPuzzleId:
                      quickPlayConfig.selectedPuzzleId ??
                      quickPlayCandidates[0]?.id ??
                      null,
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  quickPlayConfig.selectionType === 'specific'
                    ? 'btn-3d-primary text-white'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Pick Specific Puzzle
              </button>
            </div>
          </div>

          {quickPlayConfig.selectionType === 'specific' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {quickPlayCandidates.map((p) => {
                const isSolved = isCatalogPuzzleSolved(p.id, completionRecords);
                const isChosen = quickPlayConfig.selectedPuzzleId === p.id;
                const catMeta = getCategoryMetadata(p.category);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateQuickPlayConfig({
                        selectedPuzzleId: p.id,
                      });
                    }}
                    className={`p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 cursor-pointer ${
                      isChosen
                        ? 'card-3d-featured !border-cyan-500 dark:!border-cyan-400'
                        : 'card-3d-compact'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryGlyph
                        category={p.category}
                        className="w-4 h-4 shrink-0"
                        accentColor={catMeta.accentHex}
                      />
                      <div className="min-w-0">
                        <div className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {catMeta.shortTitle} ·{' '}
                          {
                            MECHANIC_DISPLAY_LABEL[
                              p.puzzleType ?? 'multiple_choice'
                            ]
                          }
                        </div>
                      </div>
                    </div>

                    {isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono text-sky-700 dark:text-cyan-300 shrink-0">
                        Unsolved
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. THREE DAILY CHALLENGES SCREEN (3 FEATURED PUZZLES PER LOCAL CALENDAR DAY)
// ============================================================================

export interface DailyChallengesScreenProps {
  dailyChallenges: [
    DailyPuzzleDescriptor,
    DailyPuzzleDescriptor,
    DailyPuzzleDescriptor,
  ];
  dailyState: DailyCompletionState;
  progress: PlayerGameProgress;
  onStartDailyChallenge: (challengeNumber: 1 | 2 | 3) => void;
  onViewDailyCompletedResult: (challengeNumber: 1 | 2 | 3) => void;
  onBackHome: () => void;
}

export const DailyChallengesScreen: React.FC<DailyChallengesScreenProps> = ({
  dailyChallenges,
  dailyState,
  progress,
  onStartDailyChallenge,
  onViewDailyCompletedResult,
  onBackHome,
}) => {
  const dailySummary = useMemo(
    () => getDailySetSummary(dailyChallenges[0].dateKey, dailyState),
    [dailyChallenges, dailyState]
  );

  const pastDailyDates = useMemo(() => {
    const entries: Array<{
      dateKey: string;
      completedCount: number;
      totalScore: number;
      totalXp: number;
    }> = [];

    for (const [dateKey, val] of Object.entries(dailyState.completedByDate)) {
      if (!val || typeof val !== 'object') continue;
      if ('dailyId' in val && typeof val.dailyId === 'string') {
        entries.push({
          dateKey,
          completedCount: 1,
          totalScore: Number(val.score) || 0,
          totalXp: Number(val.xpEarned) || 0,
        });
      } else {
        const records = Object.values(val) as Array<{
          score?: number;
          xpEarned?: number;
        }>;
        if (records.length > 0) {
          entries.push({
            dateKey,
            completedCount: records.length,
            totalScore: records.reduce(
              (s, r) => s + (typeof r.score === 'number' ? r.score : 0),
              0
            ),
            totalXp: records.reduce(
              (s, r) => s + (typeof r.xpEarned === 'number' ? r.xpEarned : 0),
              0
            ),
          });
        }
      }
    }

    return entries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [dailyState]);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onBackHome();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl icon-3d-secondary text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sanctuary Home</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-2xl card-3d-compact card-3d-static text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Today: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {dailySummary.completedCount} / {dailySummary.totalCount} Completed
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl card-3d-compact card-3d-static text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">Win Streak: </span>
            <span className="font-bold text-sky-800 dark:text-cyan-300">
              {progress.winsTowardNextMilestone} / 8 Wins
            </span>
          </div>
        </div>
      </div>

      {/* Daily Header & Overall Progress */}
      <div className="p-6 sm:p-8 rounded-3xl card-3d-featured space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-200/60 dark:border-sky-400/15 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
              <span>Local Calendar Date · {dailySummary.dateKey}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              Daily Challenges · {dailySummary.completedCount}/3 Complete
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-2xl">
              Three deterministic featured challenges are completed in fixed 1 → 2 → 3 sequence every local calendar day across Easy, Regular, and Hard tiers.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            {dailySummary.nextUnfinishedChallenge ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTransition();
                  onStartDailyChallenge(
                    dailySummary.nextUnfinishedChallenge!.challengeNumber
                  );
                }}
                className="py-3 px-5 rounded-2xl btn-3d-primary text-white font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  Start Challenge {dailySummary.nextUnfinishedChallenge.challengeNumber}/3
                </span>
              </button>
            ) : (
              <div className="px-4 py-3 rounded-2xl card-3d-compact card-3d-static text-center tabular-nums">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Daily Progress
                </div>
                <div className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  3 / 3
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All 3 Completed Celebration Banner */}
        {dailySummary.isAllCompleted && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <div className="font-display text-base font-bold text-slate-950 dark:text-white">
                  All 3 Daily Challenges Completed for {dailySummary.dateKey}!
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Your daily triad results and rewards are recorded below.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-mono text-xs font-bold shrink-0">
              3 / 3 COMPLETE
            </span>
          </div>
        )}

        {/* 3 Sequential Daily Challenge Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {dailySummary.challenges.map(({ descriptor, status }) => {
            const entry =
              getCatalogPuzzleById(descriptor.featuredPuzzleId) ??
              PUZZLE_CATALOG[0];
            const catMeta = getCategoryMetadata(entry.category);
            const rec = status.completedRecord;
            const isNextInSequence =
              dailySummary.nextUnfinishedChallenge?.challengeNumber ===
              descriptor.challengeNumber;

            return (
              <div
                key={descriptor.dailyId}
                className={`p-5 rounded-3xl flex flex-col justify-between gap-4 ${
                  status.isCompleted
                    ? 'card-3d-standard'
                    : isNextInSequence
                    ? 'card-3d-featured'
                    : 'card-3d-compact opacity-75'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-800 dark:text-cyan-300 font-mono text-xs font-bold">
                      DAILY {descriptor.challengeNumber}/3
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold ${
                        status.isCompleted
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {status.isCompleted
                        ? 'Completed'
                        : `${formatDifficultyLabel(descriptor.difficulty)} · +25% XP`}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${catMeta.accentHex}22`,
                        border: `1px solid ${catMeta.accentHex}55`,
                      }}
                    >
                      <CategoryGlyph
                        category={entry.category}
                        className="w-5 h-5"
                        accentColor={catMeta.accentHex}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-sky-800 dark:text-cyan-300 truncate">
                        {catMeta.title}
                      </div>
                      <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white leading-snug">
                        {entry.title}
                      </h2>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {
                          MECHANIC_DISPLAY_LABEL[
                            entry.puzzleType ?? 'multiple_choice'
                          ]
                        }{' '}
                        · <span>{formatDifficultyLabel(entry.difficulty)}</span>
                      </div>
                    </div>
                  </div>

                  {status.isCompleted && rec && (
                    <div className="p-3 rounded-2xl card-3d-compact card-3d-static space-y-1.5 text-xs font-mono tabular-nums">
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Score: {rec.score}</span>
                        <span>+{rec.xpEarned ?? 0} XP</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>Accuracy: {rec.accuracyPercent ?? 100}%</span>
                        <span>
                          Time: {formatTime(rec.completionTimeSeconds ?? 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {status.isCompleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onViewDailyCompletedResult(descriptor.challengeNumber);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl btn-3d-primary text-white font-display font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>View Result ({descriptor.challengeNumber}/3)</span>
                    </button>
                  ) : isNextInSequence ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTransition();
                        onStartDailyChallenge(descriptor.challengeNumber);
                      }}
                      className="w-full py-3 px-4 rounded-2xl btn-3d-primary text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Challenge {descriptor.challengeNumber}/3</span>
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-xl card-3d-compact card-3d-static text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold inline-flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        Complete Challenge{' '}
                        {dailySummary.nextUnfinishedChallenge?.challengeNumber ?? 1}{' '}
                        First
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Past Daily Completion History */}
        {pastDailyDates.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Daily Challenge Completion History ({pastDailyDates.length} Days)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {pastDailyDates.slice(0, 6).map((item) => (
                <div
                  key={item.dateKey}
                  className="p-3 rounded-xl card-3d-compact card-3d-static flex items-center justify-between gap-2 text-xs font-mono tabular-nums"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.dateKey}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      {item.completedCount} / 3 Completed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sky-700 dark:text-cyan-400">
                      {item.totalScore} pts
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      +{item.totalXp} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
