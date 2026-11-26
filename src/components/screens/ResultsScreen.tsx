/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Mode-Aware Results Experience
 * Displays:
 * - Score, Accuracy, Total XP Gained, Time
 * - Detailed XP Breakdown (Puzzle XP, 8-Win Milestone Bonus, 3/3 Daily Triad Bonus,
 *   Achievement Unlock Bonus)
 * - Level-Up Celebration Banner & Live XP Bar toward next level
 * - Newly Unlocked Achievements Notification Cards
 * - Verified Step-by-Step Solution Explanation
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Grid,
  Home,
  Layers,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getCategoryMetadata } from '../../engine/categories';
import { getDailySetSummary } from '../../engine/dailyPuzzle';
import { formatDifficultyLabel } from '../../engine/difficulty';
import { getCatalogPuzzleById } from '../../engine/generator';
import {
  consumeOneShotCelebration,
  getXpRequiredForLevel,
} from '../../engine/scoring';
import {
  ACHIEVEMENT_DEFINITIONS,
  isPlayerFacingAchievementId,
} from '../../storage/storageManager';
import {
  DailyCompletionState,
  DailyPuzzleDescriptor,
  GameCompletionRecord,
  GameMode,
  PlayerGameProgress,
  PuzzleResult,
} from '../../types/game';
import { CategoryGlyph } from '../icons/CategoryGlyph';

interface ResultsScreenProps {
  lastResult: PuzzleResult | null;
  progress?: PlayerGameProgress;
  completionRecords?: GameCompletionRecord[];
  dailyChallenges?: [
    DailyPuzzleDescriptor,
    DailyPuzzleDescriptor,
    DailyPuzzleDescriptor,
  ];
  dailyState?: DailyCompletionState;
  onContinueNext: () => void;
  onRetryPuzzle: () => void;
  onOpenModeHub?: () => void;
  onReturnHome: () => void;
}

const MODE_BADGE_LABELS: Record<GameMode, string> = {
  quick_play: 'Quick Play',
  daily: 'Daily Challenge',
  archive: 'Puzzle Library',
  practice: 'Puzzle Library',
  collection_preview: 'Puzzle Library',
};

const LEVEL_UP_PARTICLES: Array<{
  tx: string;
  ty: string;
  delay: string;
  tone: 'gold' | 'cyan' | 'violet';
}> = [
  { tx: '-115px', ty: '-42px', delay: '0s', tone: 'gold' },
  { tx: '-88px', ty: '-58px', delay: '0.04s', tone: 'cyan' },
  { tx: '-52px', ty: '-68px', delay: '0.02s', tone: 'gold' },
  { tx: '-18px', ty: '-72px', delay: '0.06s', tone: 'violet' },
  { tx: '22px', ty: '-72px', delay: '0.03s', tone: 'gold' },
  { tx: '58px', ty: '-66px', delay: '0.05s', tone: 'cyan' },
  { tx: '92px', ty: '-54px', delay: '0.02s', tone: 'gold' },
  { tx: '118px', ty: '-38px', delay: '0.07s', tone: 'violet' },
  { tx: '-98px', ty: '36px', delay: '0.05s', tone: 'cyan' },
  { tx: '-46px', ty: '52px', delay: '0.03s', tone: 'gold' },
  { tx: '48px', ty: '52px', delay: '0.06s', tone: 'cyan' },
  { tx: '102px', ty: '34px', delay: '0.04s', tone: 'gold' },
];

const STREAK_MILESTONE_PARTICLES: Array<{
  tx: string;
  ty: string;
  delay: string;
  tone: 'gold' | 'cyan' | 'violet';
}> = [
  { tx: '-96px', ty: '-32px', delay: '0s', tone: 'gold' },
  { tx: '-62px', ty: '-46px', delay: '0.03s', tone: 'cyan' },
  { tx: '-22px', ty: '-52px', delay: '0.05s', tone: 'gold' },
  { tx: '24px', ty: '-52px', delay: '0.02s', tone: 'gold' },
  { tx: '64px', ty: '-44px', delay: '0.04s', tone: 'cyan' },
  { tx: '98px', ty: '-30px', delay: '0.06s', tone: 'violet' },
  { tx: '-74px', ty: '34px', delay: '0.04s', tone: 'gold' },
  { tx: '76px', ty: '34px', delay: '0.03s', tone: 'cyan' },
];

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  lastResult,
  progress,
  dailyChallenges,
  dailyState,
  onContinueNext,
  onRetryPuzzle,
  onOpenModeHub,
  onReturnHome,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const dailySummary = useMemo(() => {
    if (!dailyChallenges || !dailyState) return null;
    return getDailySetSummary(dailyChallenges, dailyState);
  }, [dailyChallenges, dailyState]);

  const catalogEntry = useMemo(
    () => (lastResult ? getCatalogPuzzleById(lastResult.puzzleId) : undefined),
    [lastResult]
  );

  const newlyUnlockedAchievements = useMemo(() => {
    if (!lastResult?.newlyUnlockedAchievementIds?.length) return [];
    const idSet = new Set(lastResult.newlyUnlockedAchievementIds);
    return ACHIEVEMENT_DEFINITIONS.filter(
      (def) => idSet.has(def.id) && isPlayerFacingAchievementId(def.id)
    );
  }, [lastResult]);

  // Deduplicated one-shot celebration flags (only trigger once per genuine live solve;
  // never repeat on component re-renders or when restoring a saved session from localStorage)
  const [celebrateLevelUpId, setCelebrateLevelUpId] = useState<string | null>(
    null
  );
  const [celebrateStreakId, setCelebrateStreakId] = useState<string | null>(
    null
  );
  // Two-stage XP bar transition state: 'filling_previous' (fills to 100%) -> 'settled_new' (transitions to new level XP%)
  const [xpBarPhase, setXpBarPhase] = useState<
    'filling_previous' | 'resetting' | 'settled_new'
  >('settled_new');

  useEffect(() => {
    if (!lastResult?.completionId) return;

    if (
      lastResult.didLevelUp &&
      consumeOneShotCelebration(lastResult.completionId, 'results_levelup')
    ) {
      setCelebrateLevelUpId(lastResult.completionId);
      setXpBarPhase('filling_previous');

      const resetTimer = window.setTimeout(() => {
        setXpBarPhase('resetting');
      }, 480);

      const settleTimer = window.setTimeout(() => {
        setXpBarPhase('settled_new');
      }, 560);

      return () => {
        window.clearTimeout(resetTimer);
        window.clearTimeout(settleTimer);
      };
    } else {
      setXpBarPhase('settled_new');
    }
  }, [lastResult?.completionId, lastResult?.didLevelUp]);

  useEffect(() => {
    if (!lastResult?.completionId) return;
    const isFirstTimeWin =
      !lastResult.isReplayOfSolvedPuzzle && !lastResult.dailyAlreadyClaimed;
    if (
      isFirstTimeWin &&
      consumeOneShotCelebration(lastResult.completionId, 'results_streak')
    ) {
      setCelebrateStreakId(lastResult.completionId);
    }
  }, [
    lastResult?.completionId,
    lastResult?.isReplayOfSolvedPuzzle,
    lastResult?.dailyAlreadyClaimed,
  ]);

  if (!lastResult) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-10 flex items-center justify-center">
        <div className="w-full p-7 rounded-3xl card-3d-standard card-3d-static text-center space-y-5">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            No Recent Puzzle Result
          </h1>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onReturnHome();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl btn-3d-primary text-white font-display font-bold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </div>
    );
  }

  const categoryMeta = getCategoryMetadata(lastResult.category);
  const explanationText =
    lastResult.explanation ?? catalogEntry?.explanation ?? '';
  const isPracticeMode =
    lastResult.mode === 'practice' || lastResult.mode === 'collection_preview';
  const isDailyMode = lastResult.mode === 'daily';
  const isQuickPlayMode = lastResult.mode === 'quick_play';

  const dailyChallengeNum = lastResult.modeMetadata?.dailyChallengeNumber ?? 1;
  const nextUnfinishedDaily = dailySummary?.nextUnfinishedChallenge ?? null;

  const primaryContinueLabel = isDailyMode
    ? nextUnfinishedDaily
      ? `Start Daily Challenge ${nextUnfinishedDaily.challengeNumber}/3`
      : 'Return Home'
    : isPracticeMode
    ? 'Next Category Puzzle'
    : 'Next Random Puzzle';

  const hubReturnLabel = isDailyMode
    ? 'Daily Summary'
    : `Back to ${categoryMeta.shortTitle}`;

  const showModeHubButton = Boolean(onOpenModeHub && !isQuickPlayMode);

  const xpPercent = progress
    ? Math.min(
        100,
        Math.round(
          (progress.currentXp / Math.max(1, progress.xpForNextLevel)) * 100
        )
      )
    : 0;

  const isAnimatingLevelUp = Boolean(
    lastResult.didLevelUp && celebrateLevelUpId === lastResult.completionId
  );

  const isAnimatingStreak = Boolean(
    celebrateStreakId === lastResult.completionId
  );

  const isMilestoneCelebration = Boolean(lastResult.winStreakMilestoneReached);

  const previousLevelNum =
    lastResult.previousLevel ?? Math.max(1, (progress?.level ?? 2) - 1);
  const newLevelNum = lastResult.newLevel ?? progress?.level ?? 2;
  const prevLevelRequiredXp = getXpRequiredForLevel(previousLevelNum);

  const displayedXpBarWidth =
    isAnimatingLevelUp && xpBarPhase === 'filling_previous'
      ? 100
      : isAnimatingLevelUp && xpBarPhase === 'resetting'
      ? 2
      : Math.max(5, xpPercent);

  const milestoneStepDisplay = progress
    ? lastResult.winStreakMilestoneReached ||
      (progress.currentWinStreak > 0 && progress.winsTowardNextMilestone === 0)
      ? 8
      : progress.winsTowardNextMilestone
    : 0;

  const milestonePercent = Math.min(
    100,
    Math.round((milestoneStepDisplay / 8) * 100)
  );

  const hasBonusXpBreakdown = Boolean(
    (lastResult.winStreakMilestoneXpAwarded &&
      lastResult.winStreakMilestoneXpAwarded > 0) ||
      (lastResult.dailySetBonusXpAwarded &&
        lastResult.dailySetBonusXpAwarded > 0) ||
      (lastResult.achievementBonusXpAwarded &&
        lastResult.achievementBonusXpAwarded > 0)
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-5 sm:py-7 flex items-center justify-center">
      <div className="w-full p-5 sm:p-7 rounded-3xl card-3d-featured space-y-4 sm:space-y-5 text-center lq-fade-in">
        {/* Top Mode & Status Header */}
        <div className="space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl btn-3d-primary flex items-center justify-center lq-solve-celebration">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-bold text-sky-900 dark:text-cyan-300">
            <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15">
              {isDailyMode
                ? `Daily Challenge ${dailyChallengeNum}/3`
                : MODE_BADGE_LABELS[lastResult.mode]}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <CategoryGlyph
                category={lastResult.category}
                className="w-3.5 h-3.5"
                accentColor={categoryMeta.accentHex}
              />
              <span>{categoryMeta.title}</span>
            </span>
            <span>·</span>
            <span>{formatDifficultyLabel(lastResult.difficulty)}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {isDailyMode
              ? dailySummary?.isAllCompleted
                ? 'All 3 Daily Challenges Complete!'
                : `Daily Challenge ${dailyChallengeNum}/3 Complete!`
              : lastResult.isReplayOfSolvedPuzzle
              ? 'Solved Replay Complete!'
              : 'Puzzle Complete!'}
          </h1>

          {lastResult.puzzleTitle && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {lastResult.puzzleTitle}
            </p>
          )}
        </div>

        {/* 1. Polished Level-Up Celebration Stage (Hero New Level Number + Particle Burst) */}
        {lastResult.didLevelUp && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-sky-500/20 to-amber-500/25 border-2 border-amber-400/75 dark:border-cyan-400/70 text-slate-950 dark:text-white ${
              isAnimatingLevelUp
                ? 'lq-levelup-stage lq-shimmer-sweep'
                : 'card-3d-featured'
            }`}
          >
            {isAnimatingLevelUp && (
              <div className="lq-particle-burst" aria-hidden="true">
                {LEVEL_UP_PARTICLES.map((p, idx) => (
                  <span
                    key={idx}
                    className={`lq-particle lq-particle-${p.tone}`}
                    style={
                      {
                        '--tx': p.tx,
                        '--ty': p.ty,
                        '--delay': p.delay,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5">
              {/* Hero New Level Number Focal Crest */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-sky-500 to-indigo-600 text-white flex flex-col items-center justify-center shrink-0 border border-white/60 ${
                  isAnimatingLevelUp ? 'lq-level-badge-pop' : ''
                }`}
              >
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest opacity-90">
                  LEVEL
                </span>
                <span className="font-display text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">
                  {newLevelNum}
                </span>
              </div>

              <div className="text-center sm:text-left space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Level Up Unlocked!</span>
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white">
                  Level {previousLevelNum} → Level {newLevelNum}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  New rank achieved! Your logic mastery continues to ascend.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Badges: Personal Best / Daily Bonus / Replay */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {lastResult.isNewPersonalBest && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold lq-solve-celebration">
              <Award className="w-4 h-4 text-amber-500" />
              <span>New Personal Record!</span>
            </div>
          )}

          {lastResult.completedDailySetToday && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-bold lq-solve-celebration">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>
                3/3 Daily Triad Complete! +
                {lastResult.dailySetBonusXpAwarded ?? 100} XP Bonus
              </span>
            </div>
          )}

          {isDailyMode && (
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold ${
                lastResult.dailyAlreadyClaimed
                  ? 'bg-slate-500/15 border-slate-400/35 text-slate-700 dark:text-slate-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {lastResult.dailyAlreadyClaimed
                  ? 'Daily Reward Already Claimed · 0 Duplicate XP'
                  : '+25% Daily XP Bonus Claimed'}
              </span>
            </div>
          )}

          {!isDailyMode && lastResult.isReplayOfSolvedPuzzle && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-900 dark:text-cyan-300 text-xs font-bold">
              <Target className="w-3.5 h-3.5" />
              <span>Solved Puzzle Replay · 0 Duplicate XP</span>
            </div>
          )}
        </div>

        {/* Core Metrics: Score, Accuracy, XP, Time */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 tabular-nums">
          <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Score
            </div>
            <div className="font-display text-2xl font-bold text-sky-700 dark:text-cyan-400 mt-0.5">
              {lastResult.score}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Accuracy
            </div>
            <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {lastResult.accuracyPercent}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>XP</span>
            </div>
            <div className="font-display text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              +{lastResult.xpEarned}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl card-3d-compact card-3d-static">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
              <span>Time</span>
            </div>
            <div className="font-display text-2xl font-bold text-slate-950 dark:text-white mt-0.5">
              {formatTime(lastResult.completionTimeSeconds)}
            </div>
          </div>
        </div>

        {/* 2. Global Win Streak & 8-Win Milestone Celebration Card */}
        {progress && (
          <div
            className={`p-4 rounded-2xl text-left space-y-2.5 tabular-nums transition-all ${
              isMilestoneCelebration
                ? 'card-3d-featured lq-milestone-card-glow lq-shimmer-sweep !border-amber-500/80'
                : 'card-3d-compact card-3d-static'
            }`}
          >
            {isMilestoneCelebration && isAnimatingStreak && (
              <div className="lq-particle-burst" aria-hidden="true">
                {STREAK_MILESTONE_PARTICLES.map((p, idx) => (
                  <span
                    key={idx}
                    className={`lq-particle lq-particle-${p.tone}`}
                    style={
                      {
                        '--tx': p.tx,
                        '--ty': p.ty,
                        '--delay': p.delay,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`px-3 py-1 rounded-xl flex items-center gap-1.5 font-display font-extrabold text-base sm:text-lg ${
                    progress.currentWinStreak > 0
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-800 dark:text-amber-200'
                      : 'bg-slate-500/15 border border-slate-400/35 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Zap
                    className={`w-4 h-4 shrink-0 ${
                      progress.currentWinStreak > 0
                        ? 'text-amber-500 fill-amber-500/35'
                        : 'text-slate-400'
                    }`}
                  />
                  <span
                    key={`res-streak-${progress.currentWinStreak}`}
                    className={isAnimatingStreak ? 'lq-streak-num-pop' : ''}
                  >
                    {progress.currentWinStreak}
                  </span>
                </div>

                <div>
                  <div className="font-display text-xs sm:text-sm font-bold text-slate-950 dark:text-white">
                    Global Win Streak
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isMilestoneCelebration
                      ? `8-Win Milestone Complete! (+${
                          lastResult.winStreakMilestoneXpAwarded ?? 250
                        } XP Awarded)`
                      : `${milestoneStepDisplay} / 8 wins toward +250 XP Milestone`}
                  </div>
                </div>
              </div>

              {isMilestoneCelebration ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/25 border border-amber-400/65 font-mono text-xs font-bold text-amber-900 dark:text-amber-200 lq-streak-num-pop">
                  +{lastResult.winStreakMilestoneXpAwarded ?? 250} XP BONUS!
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-sky-900 dark:text-cyan-300">
                  Best: {progress.bestWinStreak}
                </span>
              )}
            </div>

            {/* Smooth 8-Win Milestone Progress Bar + 8 Segment Pills */}
            <div className="relative z-10 space-y-1.5">
              <div className="w-full h-2 rounded-full bg-sky-950/12 dark:bg-slate-950/80 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, milestonePercent)}%`,
                    background: isMilestoneCelebration
                      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 55%, #38bdf8 100%)'
                      : 'linear-gradient(90deg, #0ea5e9 0%, #f59e0b 100%)',
                  }}
                />
              </div>

              <div className="grid grid-cols-8 gap-1" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const filled = idx < milestoneStepDisplay;
                  const isNewest =
                    isAnimatingStreak && idx === milestoneStepDisplay - 1;
                  return (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        filled
                          ? isMilestoneCelebration
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]'
                            : 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-slate-400/25 dark:bg-slate-800/90'
                      } ${isNewest ? 'lq-slot-pop' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. XP Breakdown & Animated Level Progress Bar */}
        {progress && (
          <div className="p-4 rounded-2xl card-3d-compact card-3d-static text-left space-y-2.5 tabular-nums">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-slate-900 dark:text-white">
                {isAnimatingLevelUp && xpBarPhase === 'filling_previous'
                  ? `Level ${previousLevelNum} Complete!`
                  : `Level ${progress.level} · ${progress.totalXp} Total XP`}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {isAnimatingLevelUp && xpBarPhase === 'filling_previous'
                  ? `${prevLevelRequiredXp} / ${prevLevelRequiredXp} XP (MAX)`
                  : `${progress.currentXp} / ${progress.xpForNextLevel} XP to Level ${
                      progress.level + 1
                    }`}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-sky-950/12 dark:bg-slate-950/80 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full ${
                  xpBarPhase === 'resetting'
                    ? 'transition-none'
                    : 'transition-all duration-500 ease-out'
                }`}
                style={{
                  width: `${displayedXpBarWidth}%`,
                  background:
                    isAnimatingLevelUp && xpBarPhase === 'filling_previous'
                      ? 'linear-gradient(90deg, #38bdf8 0%, #fbbf24 100%)'
                      : 'var(--3d-cyan-grad)',
                }}
              />
            </div>

            {hasBonusXpBreakdown && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded-md bg-sky-500/10">
                  Puzzle: +{lastResult.basePuzzleXpAwarded ?? 0} XP
                </span>
                {Boolean(lastResult.winStreakMilestoneXpAwarded) && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
                    8-Win Milestone: +{lastResult.winStreakMilestoneXpAwarded} XP
                  </span>
                )}
                {Boolean(lastResult.dailySetBonusXpAwarded) && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                    Daily Triad: +{lastResult.dailySetBonusXpAwarded} XP
                  </span>
                )}
                {Boolean(lastResult.achievementBonusXpAwarded) && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-800 dark:text-indigo-300">
                    Achievements: +{lastResult.achievementBonusXpAwarded} XP
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Newly Unlocked Achievements Notification */}
        {newlyUnlockedAchievements.length > 0 && (
          <div className="p-4 rounded-2xl card-3d-compact card-3d-static text-left space-y-2 border !border-amber-500/45 lq-solve-celebration">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>
                Achievement{newlyUnlockedAchievements.length > 1 ? 's' : ''}{' '}
                Unlocked!
              </span>
            </div>
            <div className="space-y-2">
              {newlyUnlockedAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-2.5 rounded-xl bg-amber-500/10 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start"
                >
                  <div>
                    <div className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {ach.title}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      {ach.description}
                    </div>
                  </div>
                  {ach.xpReward ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold shrink-0">
                      +{ach.xpReward} XP
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verified Step-by-Step Explanation Panel */}
        {explanationText && (
          <div className="p-4 rounded-2xl card-3d-compact card-3d-static text-left space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold uppercase tracking-wider text-sky-900 dark:text-cyan-300 max-sm:flex-col max-sm:items-start">
              <span>Verified Solution Explanation</span>
              <span>
                {lastResult.hintsUsed > 0
                  ? `Hints: ${lastResult.hintsUsed} · `
                  : ''}
                Attempts: {lastResult.attemptCount ?? 1}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {explanationText}
            </p>
          </div>
        )}

        {/* 3/3 Daily Challenges Triad Summary Panel */}
        {isDailyMode && dailySummary && (
          <div className="p-4 rounded-2xl card-3d-compact card-3d-static text-left space-y-2.5 border !border-amber-500/40">
            <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 max-sm:flex-col max-sm:items-start">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Daily Challenges ({dailySummary.dateKey})</span>
              </span>
              <span>
                {dailySummary.completedCount}/3 Completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {dailySummary.challenges.map(({ descriptor, status }) => (
                <div
                  key={descriptor.dailyId}
                  className={`p-2.5 rounded-xl text-xs font-mono space-y-0.5 ${
                    status.isCompleted
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-slate-900 dark:text-white'
                      : 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>#{descriptor.challengeNumber}/3</span>
                    <span>{formatDifficultyLabel(descriptor.difficulty)}</span>
                  </div>
                  <div className="truncate font-sans text-[11px] font-semibold">
                    {descriptor.puzzleTitle}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                    {status.isCompleted && status.completedRecord
                      ? `${status.completedRecord.score} pts`
                      : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode-Specific Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTransition();
              onContinueNext();
            }}
            className="w-full py-3.5 px-6 rounded-2xl btn-3d-primary text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{primaryContinueLabel}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <div
            className={`grid grid-cols-1 gap-2.5 ${
              showModeHubButton ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onRetryPuzzle();
              }}
              className="py-3 px-3 rounded-2xl card-3d-compact text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Replay</span>
            </button>

            {showModeHubButton && onOpenModeHub && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenModeHub();
                }}
                className="py-3 px-3 rounded-2xl card-3d-compact text-sky-900 dark:text-cyan-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPracticeMode ? (
                  <Layers className="w-4 h-4 shrink-0" />
                ) : (
                  <Grid className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{hubReturnLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onReturnHome();
              }}
              className="py-3 px-3 rounded-2xl icon-3d-secondary font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
