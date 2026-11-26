/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Three-Tier Difficulty Architecture & Regular Adaptive Engine
 * Defines how the three user-facing difficulty options work:
 * 1. Easy ('easy'): Fixed Easy-only pool. Does not auto-increase or auto-decrease.
 * 2. Regular ('normal'): Adaptive mixed-difficulty experience across the full pool
 *    (Easy, Regular, Hard). Gradually adjusts target difficulty based on recent
 *    player performance without sudden 2-tier jumps.
 * 3. Hard ('hard'): Fixed Hard-only pool. Does not auto-increase or auto-decrease.
 */

import {
  AutoDifficultyState,
  DifficultyConfig,
  DifficultyPreference,
  GameSettings,
  PuzzleCategory,
  PuzzleDifficulty,
} from '../types/game';

export const DIFFICULTY_ORDER: PuzzleDifficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_PREFERENCE_ORDER: DifficultyPreference[] = [
  'easy',
  'normal',
  'hard',
];

export const AUTO_PROMOTE_CONSECUTIVE_WINS = 2;
export const AUTO_DEMOTE_ATTEMPT_THRESHOLD = 4;

export const DIFFICULTY_CONFIGS: Record<PuzzleDifficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description:
      'Fixed Easy puzzles only. Single-layer logical rules, generous target time window, and up to 3 contextual hints.',
    targetTimeSeconds: 120,
    complexityMultiplier: 1.0,
    baseScore: 500,
    maxHintsAllowed: 3,
    hintPenaltyRatio: 0.1,
    xpMultiplier: 1.0,
  },
  normal: {
    id: 'normal',
    label: 'Regular',
    description:
      'Adaptive mixed difficulty across Easy, Regular, and Hard puzzles based on your recent performance.',
    targetTimeSeconds: 90,
    complexityMultiplier: 1.35,
    baseScore: 750,
    maxHintsAllowed: 2,
    hintPenaltyRatio: 0.15,
    xpMultiplier: 1.25,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description:
      'Fixed Hard puzzles only. Compound multi-axis constraints, strict time target, and high-mastery rewards.',
    targetTimeSeconds: 60,
    complexityMultiplier: 1.75,
    baseScore: 1000,
    maxHintsAllowed: 1,
    hintPenaltyRatio: 0.25,
    xpMultiplier: 1.6,
  },
};

export function getDifficultyConfig(
  difficulty: PuzzleDifficulty
): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS.normal;
}

/**
 * Normalizes any raw or legacy difficulty preference ('easy' | 'normal' | 'regular' | 'hard' | 'auto')
 * into one of the three canonical DifficultyPreference values ('easy' | 'normal' | 'hard').
 * Safely migrates legacy 'auto' and 'regular' values to 'normal' (Regular).
 */
export function normalizeDifficultyPreference(
  raw: unknown,
  fallback: DifficultyPreference = 'normal'
): DifficultyPreference {
  if (raw === 'easy') return 'easy';
  if (raw === 'hard') return 'hard';
  if (raw === 'normal' || raw === 'regular' || raw === 'auto') {
    return 'normal';
  }
  return fallback;
}

/**
 * Formats an internal difficulty or preference value into its canonical player-facing label.
 * Always displays 'normal' (and any migrated 'auto'/'regular' value) as 'Regular'.
 */
export function formatDifficultyLabel(
  difficultyOrPref: DifficultyPreference | string
): string {
  switch (difficultyOrPref) {
    case 'easy':
      return 'Easy';
    case 'hard':
      return 'Hard';
    case 'normal':
    case 'regular':
    case 'auto':
    default:
      return 'Regular';
  }
}

export function createDefaultAutoDifficultyState(
  initialDifficulty: PuzzleDifficulty = 'easy'
): AutoDifficultyState {
  const validInitial: PuzzleDifficulty =
    initialDifficulty === 'easy' ||
    initialDifficulty === 'normal' ||
    initialDifficulty === 'hard'
      ? initialDifficulty
      : 'easy';
  return {
    currentEffectiveDifficulty: validInitial,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    totalSolvedInAuto: 0,
    recentHistory: [],
    lastAdjustmentReason: `Adaptive Regular baseline initialized at ${formatDifficultyLabel(
      validInitial
    )}.`,
  };
}

/**
 * Steps difficulty up by at most 1 level (Easy -> Regular -> Hard).
 * Never jumps directly from Easy to Hard.
 */
export function stepDifficultyUp(current: PuzzleDifficulty): PuzzleDifficulty {
  if (current === 'easy') return 'normal';
  if (current === 'normal') return 'hard';
  return 'hard';
}

/**
 * Steps difficulty down by at most 1 level (Hard -> Regular -> Easy).
 * Never jumps directly from Hard to Easy.
 */
export function stepDifficultyDown(
  current: PuzzleDifficulty
): PuzzleDifficulty {
  if (current === 'hard') return 'normal';
  if (current === 'normal') return 'easy';
  return 'easy';
}

/**
 * Resolves a DifficultyPreference ('easy' | 'normal' | 'hard', or legacy 'auto')
 * into an actionable PuzzleDifficulty:
 * - 'easy' -> Fixed 'easy'
 * - 'hard' -> Fixed 'hard'
 * - 'normal' (Regular) -> Adaptive currentEffectiveDifficulty from autoState (defaulting to 'easy' for new players)
 */
export function resolveEffectiveDifficulty(
  preference: DifficultyPreference | string | undefined,
  autoState?: AutoDifficultyState,
  fallbackDifficulty: PuzzleDifficulty = 'easy'
): PuzzleDifficulty {
  const normalized = normalizeDifficultyPreference(preference, 'normal');
  if (normalized === 'easy') return 'easy';
  if (normalized === 'hard') return 'hard';

  const candidate = autoState?.currentEffectiveDifficulty;
  if (
    candidate === 'easy' ||
    candidate === 'normal' ||
    candidate === 'hard'
  ) {
    return candidate;
  }
  return fallbackDifficulty;
}

/**
 * Resolves the player's global difficulty preference and effective difficulty from GameSettings.
 */
export function getEffectiveGlobalDifficulty(settings: GameSettings): {
  preference: DifficultyPreference;
  effectiveDifficulty: PuzzleDifficulty;
  isAdaptive: boolean;
} {
  const preference = normalizeDifficultyPreference(
    settings.difficultyPreference ?? settings.difficulty,
    'normal'
  );
  const effectiveDifficulty = resolveEffectiveDifficulty(
    preference,
    settings.autoDifficultyState,
    'easy'
  );
  return {
    preference,
    effectiveDifficulty,
    isAdaptive: preference === 'normal',
  };
}

/**
 * Resolves a Puzzle Library category's difficulty preference and effective difficulty:
 * - Uses the category's override if set; otherwise inherits the global difficulty preference.
 */
export function getEffectiveCategoryDifficulty(
  settings: GameSettings,
  category: PuzzleCategory
): {
  preference: DifficultyPreference;
  effectiveDifficulty: PuzzleDifficulty;
  isOverridden: boolean;
  isAdaptive: boolean;
  globalPreference: DifficultyPreference;
} {
  const globalPreference = normalizeDifficultyPreference(
    settings.difficultyPreference ?? settings.difficulty,
    'normal'
  );
  const rawOverride = settings.categoryDifficultyOverrides?.[
    category
  ] as unknown;
  const isOverridden =
    rawOverride === 'easy' ||
    rawOverride === 'normal' ||
    rawOverride === 'hard' ||
    rawOverride === 'auto' ||
    rawOverride === 'regular';

  const preference: DifficultyPreference = isOverridden
    ? normalizeDifficultyPreference(rawOverride, globalPreference)
    : globalPreference;

  const effectiveDifficulty = resolveEffectiveDifficulty(
    preference,
    settings.autoDifficultyState,
    'easy'
  );

  return {
    preference,
    effectiveDifficulty,
    isOverridden,
    isAdaptive: preference === 'normal',
    globalPreference,
  };
}

/**
 * Filters a puzzle list according to the 3 difficulty rules:
 * - Easy ('easy'): Only Easy puzzles.
 * - Hard ('hard'): Only Hard puzzles.
 * - Regular ('normal'): Entire available puzzle pool (Easy + Regular + Hard).
 */
export function filterPuzzlesByDifficultyPreference<
  T extends { difficulty: PuzzleDifficulty }
>(puzzles: T[], preference: DifficultyPreference | string): T[] {
  const normalized = normalizeDifficultyPreference(preference, 'normal');
  if (normalized === 'easy') {
    return puzzles.filter((p) => p.difficulty === 'easy');
  }
  if (normalized === 'hard') {
    return puzzles.filter((p) => p.difficulty === 'hard');
  }
  // Regular ('normal') uses the entire mixed puzzle pool (Easy, Regular, Hard)
  return [...puzzles];
}

/**
 * Updates Regular's adaptive difficulty state after a valid puzzle completion:
 * - Single wrong answer (attemptCount === 2, hintsUsed <= 1) does NOT reduce difficulty;
 *   it counts as a valid solve.
 * - Struggling (attemptCount >= AUTO_DEMOTE_ATTEMPT_THRESHOLD or hintsUsed >= 3)
 *   steps difficulty down by 1 level (Hard -> Regular, Regular -> Easy).
 * - Moderate struggle (attemptCount === 3 or hintsUsed === 2) holds the current tier
 *   and resets consecutiveSuccesses so difficulty does not jump up prematurely.
 * - Clean solves (attemptCount <= 2 and hintsUsed <= 1) increment consecutiveSuccesses;
 *   after 2 consecutive successes, promotes 1 level (Easy -> Regular or Regular -> Hard).
 */
export function advanceAutoDifficultyOnSolve(
  currentState: AutoDifficultyState | undefined,
  solveMetrics?: {
    hintsUsed?: number;
    attemptCount?: number;
    solvedDifficulty?: PuzzleDifficulty;
    puzzleDifficulty?: PuzzleDifficulty;
  }
): AutoDifficultyState {
  const base = currentState
    ? { ...currentState }
    : createDefaultAutoDifficultyState('easy');
  const attempts = solveMetrics?.attemptCount ?? 1;
  const hintsUsed = solveMetrics?.hintsUsed ?? 0;
  const recordedTier =
    solveMetrics?.solvedDifficulty ??
    solveMetrics?.puzzleDifficulty ??
    base.currentEffectiveDifficulty;

  base.totalSolvedInAuto = (base.totalSolvedInAuto ?? 0) + 1;
  const nextHistory = [
    ...(base.recentHistory ?? []),
    recordedTier,
  ].slice(-12);

  // Heavy struggle: step down 1 level (never jumping 2 levels)
  if (
    attempts >= AUTO_DEMOTE_ATTEMPT_THRESHOLD ||
    hintsUsed >= 3 ||
    (attempts >= 3 && hintsUsed >= 2)
  ) {
    const nextDiff = stepDifficultyDown(base.currentEffectiveDifficulty);
    return {
      ...base,
      currentEffectiveDifficulty: nextDiff,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      recentHistory: nextHistory,
      lastAdjustmentReason:
        nextDiff !== base.currentEffectiveDifficulty
          ? `Stepped down to ${formatDifficultyLabel(
              nextDiff
            )} after struggling (${attempts} attempts, ${hintsUsed} hints).`
          : `Maintained ${formatDifficultyLabel(
              nextDiff
            )} after ${attempts} attempts.`,
    };
  }

  // Moderate struggle (3 attempts or 2 hints): keep current tier, reset promotion streak
  if (attempts === 3 || hintsUsed === 2) {
    return {
      ...base,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      recentHistory: nextHistory,
      lastAdjustmentReason: `Steady at ${formatDifficultyLabel(
        base.currentEffectiveDifficulty
      )} (${attempts} attempts).`,
    };
  }

  // Clean solve (including 1st-try or 2nd-try after a single wrong answer)
  const nextConsecutiveWins = base.consecutiveSuccesses + 1;
  if (nextConsecutiveWins >= AUTO_PROMOTE_CONSECUTIVE_WINS) {
    const promoted = stepDifficultyUp(base.currentEffectiveDifficulty);
    return {
      ...base,
      currentEffectiveDifficulty: promoted,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      recentHistory: nextHistory,
      lastAdjustmentReason:
        promoted !== base.currentEffectiveDifficulty
          ? `Promoted to ${formatDifficultyLabel(
              promoted
            )} after ${AUTO_PROMOTE_CONSECUTIVE_WINS} strong solves.`
          : `Maintained ${formatDifficultyLabel(
              promoted
            )} mastery (${AUTO_PROMOTE_CONSECUTIVE_WINS} consecutive solves).`,
    };
  }

  return {
    ...base,
    consecutiveSuccesses: nextConsecutiveWins,
    consecutiveFailures: 0,
    recentHistory: nextHistory,
    lastAdjustmentReason: `${nextConsecutiveWins}/${AUTO_PROMOTE_CONSECUTIVE_WINS} consecutive solves at ${formatDifficultyLabel(
      base.currentEffectiveDifficulty
    )}.`,
  };
}

/**
 * Updates Regular's adaptive difficulty state when a player abandons or fails an unsolved puzzle session:
 * - Steps difficulty down by 1 level (Hard -> Regular, Regular -> Easy) and resets consecutiveSuccesses.
 * - Note: A single wrong answer during an active puzzle does NOT call this function.
 */
export function demoteAutoDifficultyOnFailure(
  currentState: AutoDifficultyState | undefined
): AutoDifficultyState {
  const base = currentState
    ? { ...currentState }
    : createDefaultAutoDifficultyState('easy');
  const demoted = stepDifficultyDown(base.currentEffectiveDifficulty);

  return {
    ...base,
    currentEffectiveDifficulty: demoted,
    consecutiveSuccesses: 0,
    consecutiveFailures: (base.consecutiveFailures ?? 0) + 1,
    lastAdjustmentReason:
      demoted !== base.currentEffectiveDifficulty
        ? `Stepped down to ${formatDifficultyLabel(
            demoted
          )} after an unfinished puzzle session.`
        : `Maintained ${formatDifficultyLabel(
            demoted
          )} after an unfinished puzzle session.`,
  };
}
