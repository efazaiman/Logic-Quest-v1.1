/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Pure Scoring, XP & Personal Record Calculations (Phase L2.3)
 */

import {
  GameMode,
  GameplayModeMetadata,
  PuzzleDefinition,
  PuzzleDifficulty,
  PuzzleResult,
  PuzzleScoringConfig,
  PuzzleValidationResult,
} from '../types/game';
import { getDifficultyConfig } from './difficulty';

export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 500 + (safeLevel - 1) * 250;
}

export interface ScoreCalculationInput {
  difficulty: PuzzleDifficulty;
  accuracyRatio: number;
  elapsedSeconds: number;
  hintsUsed: number;
  hintsEnabled: boolean;
  scoringConfig?: Partial<PuzzleScoringConfig>;
}

/**
 * Pure function computing validated score from difficulty, accuracy, speed, hints used,
 * and puzzle-specific scoring configuration (including completion bonuses).
 */
export function calculatePuzzleScore(input: ScoreCalculationInput): number {
  if (input.accuracyRatio <= 0) return 0;

  const diffConfig = getDifficultyConfig(input.difficulty);
  const baseScore = input.scoringConfig?.baseScoreOverride ?? diffConfig.baseScore;
  const targetTimeSeconds = Math.max(
    10,
    input.scoringConfig?.targetTimeSeconds ?? diffConfig.targetTimeSeconds
  );
  const hintPenaltyRatio =
    input.scoringConfig?.hintPenaltyRatio ?? diffConfig.hintPenaltyRatio;
  const completionBonusRatio =
    input.scoringConfig?.completionBonusRatio ?? 0;

  const base = baseScore * input.accuracyRatio;

  const timeRatio = Math.max(
    0,
    Math.min(1, (targetTimeSeconds - input.elapsedSeconds) / targetTimeSeconds)
  );
  const timeBonus = Math.round(baseScore * 0.25 * timeRatio);

  const effectiveHints = input.hintsEnabled ? Math.max(0, input.hintsUsed) : 0;
  const hintPenalty = Math.round(baseScore * hintPenaltyRatio * effectiveHints);

  const flawlessBonus =
    input.accuracyRatio >= 0.999 && effectiveHints === 0 && completionBonusRatio > 0
      ? Math.round(baseScore * completionBonusRatio)
      : 0;

  return Math.max(50, Math.round(base + timeBonus + flawlessBonus - hintPenalty));
}

/**
 * Pure function computing local Logic Quest XP from score and difficulty.
 */
export function calculateXpEarned(
  score: number,
  difficulty: PuzzleDifficulty,
  mode: GameMode
): number {
  if (score <= 0) return 0;
  const config = getDifficultyConfig(difficulty);
  const modeBonus = mode === 'daily' ? 1.25 : 1.0;
  return Math.max(15, Math.round((score / 10) * config.xpMultiplier * modeBonus));
}

/**
 * Builds a validated PuzzleResult for a completed puzzle across any of the 8 puzzle mechanics
 * and all 4 game modes (Quick Play, Daily Challenge, Lost Logic Archive, Practice Mode).
 * Respects duplicate daily reward protection (`dailyAlreadyClaimed`) and practice replay protection (`isReplayOfSolvedPuzzle`).
 */
export function buildValidatedPuzzleResult(params: {
  definition: PuzzleDefinition;
  validation: PuzzleValidationResult;
  elapsedSeconds: number;
  hintsUsed: number;
  attemptCount?: number;
  hintsEnabled: boolean;
  mode: GameMode;
  previousBestScore: number | null;
  dailyAlreadyClaimed?: boolean;
  isReplayOfSolvedPuzzle?: boolean;
  startedAtIso?: string;
  modeMetadata?: GameplayModeMetadata;
}): PuzzleResult {
  const {
    definition,
    validation,
    elapsedSeconds,
    hintsUsed,
    attemptCount = 1,
    hintsEnabled,
    mode,
    previousBestScore,
    dailyAlreadyClaimed = false,
    isReplayOfSolvedPuzzle = false,
    startedAtIso,
    modeMetadata,
  } = params;

  const score = calculatePuzzleScore({
    difficulty: definition.difficulty,
    accuracyRatio: validation.accuracyRatio,
    elapsedSeconds,
    hintsUsed,
    hintsEnabled,
    scoringConfig: definition.scoringConfig,
  });

  const accuracyPercent = Math.round(validation.accuracyRatio * 100);
  const rawXp = calculateXpEarned(score, definition.difficulty, mode);
  const xpEarned =
    dailyAlreadyClaimed || isReplayOfSolvedPuzzle ? 0 : rawXp;
  const isNewPersonalBest =
    previousBestScore === null ? score > 0 : score > previousBestScore;

  const completionId = `LQ-COMP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  liveSessionCompletionIds.add(completionId);

  return {
    completionId,
    puzzleId: definition.id,
    puzzleTitle: definition.title,
    category: definition.category,
    difficulty: definition.difficulty,
    puzzleType: definition.puzzleType,
    mode,
    startedAtIso,
    completedAtIso: new Date().toISOString(),
    status: 'completed',
    score,
    accuracyPercent,
    attemptCount,
    completionTimeSeconds: Math.max(1, Math.round(elapsedSeconds)),
    hintsUsed,
    xpEarned,
    explanation: definition.explanation,
    isNewPersonalBest,
    previousBestScore,
    isPersistedRecord: true,
    dailyAlreadyClaimed,
    isReplayOfSolvedPuzzle,
    modeMetadata,
  };
}

// ============================================================================
// Celebration Deduplication Registry (Prevents Re-render & Session-Restore Loops)
// ============================================================================

export type CelebrationScope =
  | 'gameplay_solve'
  | 'results_levelup'
  | 'results_streak';

const liveSessionCompletionIds = new Set<string>();
const consumedCelebrationScopes = new Set<string>();

/**
 * Marks a completionId as originating from a live solve in this runtime session.
 */
export function registerLiveSessionCompletion(completionId: string): void {
  if (!completionId) return;
  liveSessionCompletionIds.add(completionId);
}

/**
 * Returns true if the given completionId was solved during the current live runtime
 * session (and not merely restored from localStorage after a browser refresh).
 */
export function isLiveSessionCompletion(completionId?: string | null): boolean {
  if (!completionId) return false;
  return liveSessionCompletionIds.has(completionId);
}

/**
 * Consumes a one-shot celebration for a given (completionId, scope) pair.
 * Returns true ONLY the first time it is called for a live-solved completionId,
 * preventing duplicate animations on component re-renders or restored sessions.
 */
export function consumeOneShotCelebration(
  completionId: string | undefined | null,
  scope: CelebrationScope
): boolean {
  if (!completionId || !liveSessionCompletionIds.has(completionId)) {
    return false;
  }
  const key = `${scope}:${completionId}`;
  if (consumedCelebrationScopes.has(key)) {
    return false;
  }
  consumedCelebrationScopes.add(key);
  return true;
}

export function resetCelebrationRegistryForTests(): void {
  liveSessionCompletionIds.clear();
  consumedCelebrationScopes.clear();
}

