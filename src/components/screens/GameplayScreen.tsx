/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Responsive Gameplay Screen (Phase L2.4 Multi-Mechanic Engine)
 * - Uses a visually light, translucent Liquid Glass outer surface (.gameplay-liquid-glass)
 *   so the Enchanted Sanctuary remains visible around and subtly through it.
 * - Delegates all puzzle-specific interactive controls to <PuzzleMechanismHost />,
 *   keeping GameplayScreen decoupled from individual puzzle mechanics.
 * - Preserves mid-puzzle interactive state across browser refreshes and prevents
 *   duplicate rewards or attempt penalties on unchanged answers.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Home,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { getCategoryMetadata } from '../../engine/categories';
import { canClaimDailyReward } from '../../engine/dailyPuzzle';
import { formatDifficultyLabel } from '../../engine/difficulty';
import {
  generatePlayablePuzzle,
  isCatalogPuzzleSolved,
} from '../../engine/generator';
import {
  PuzzleMechanismAction,
  applyPuzzleAction,
  createInitialPuzzleState,
  getProgressiveHint,
  getPuzzleStateSignature,
  getTargetSlotPreviewText,
  isPuzzleStateComplete,
  resetPuzzleState,
} from '../../engine/mechanicsController';
import {
  emitNex11CompletionEvent,
  notifyNexiHintUsed,
  notifyNexiReaction,
} from '../../engine/nex11Bridge';
import {
  buildValidatedPuzzleResult,
  calculatePuzzleScore,
  consumeOneShotCelebration,
} from '../../engine/scoring';
import { validatePuzzleAnswer } from '../../engine/validator';
import {
  ActiveGameplaySessionState,
  DailyCompletionState,
  DailyPuzzleDescriptor,
  GameCompletionRecord,
  GameMode,
  GameplayModeMetadata,
  GameSettings,
  PlayerGameProgress,
  PuzzleCategory,
  PuzzleInteractiveState,
  PuzzleResult,
  PuzzleValidationResult,
} from '../../types/game';
import { CategoryGlyph } from '../icons/CategoryGlyph';
import { PuzzleMechanismHost } from '../puzzles/PuzzleMechanismHost';

interface GameplayScreenProps {
  category: PuzzleCategory;
  mode: GameMode;
  selectedPuzzleId: string | null;
  settings: GameSettings;
  progress: PlayerGameProgress;
  completionRecords?: GameCompletionRecord[];
  dailyDescriptor: DailyPuzzleDescriptor;
  dailyState: DailyCompletionState;
  stageIndex: number;
  modeMetadata?: GameplayModeMetadata;
  initialGameplaySession?: ActiveGameplaySessionState | null;
  onSyncGameplaySession?: (session: ActiveGameplaySessionState | null) => void;
  onPuzzleSolved?: (result: PuzzleResult) => void;
  onCompletePuzzle: (result: PuzzleResult) => void;
  onAbandonPuzzle?: (puzzleId: string) => void;
  onExitHome: () => void;
  onExitCollection?: () => void;
}

const MODE_DISPLAY_LABELS: Record<GameMode, string> = {
  quick_play: 'Quick Play',
  daily: 'Daily Challenge',
  archive: 'Puzzle Library',
  practice: 'Puzzle Library',
  collection_preview: 'Puzzle Library',
};

const GAMEPLAY_CELEBRATION_PARTICLES: Array<{
  tx: string;
  ty: string;
  delay: string;
  tone: 'gold' | 'cyan' | 'violet';
}> = [
  { tx: '-54px', ty: '-18px', delay: '0s', tone: 'gold' },
  { tx: '-36px', ty: '-26px', delay: '0.03s', tone: 'cyan' },
  { tx: '-14px', ty: '-28px', delay: '0.05s', tone: 'gold' },
  { tx: '14px', ty: '-28px', delay: '0.04s', tone: 'violet' },
  { tx: '38px', ty: '-24px', delay: '0.02s', tone: 'gold' },
  { tx: '56px', ty: '-16px', delay: '0.06s', tone: 'cyan' },
  { tx: '-46px', ty: '18px', delay: '0.05s', tone: 'cyan' },
  { tx: '46px', ty: '18px', delay: '0.03s', tone: 'gold' },
];

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  category,
  mode,
  selectedPuzzleId,
  settings,
  progress,
  completionRecords = [],
  dailyDescriptor,
  dailyState,
  stageIndex,
  modeMetadata,
  initialGameplaySession = null,
  onSyncGameplaySession,
  onPuzzleSolved,
  onCompletePuzzle,
  onAbandonPuzzle,
  onExitHome,
  onExitCollection,
}) => {
  const categoryMeta = getCategoryMetadata(category);

  const effectivePuzzleId =
    mode === 'daily'
      ? selectedPuzzleId ?? dailyDescriptor.featuredPuzzleId
      : selectedPuzzleId;

  const definition = useMemo(() => {
    const seed =
      mode === 'daily'
        ? dailyDescriptor.deterministicSeed
        : `LQ-PLAY-${category}-${settings.difficulty}-${stageIndex}`;

    return generatePlayablePuzzle({
      category,
      difficulty:
        mode === 'daily' ? dailyDescriptor.difficulty : settings.difficulty,
      seed,
      mode,
      puzzleSetVersion: 'v1',
      stageIndex,
      puzzleIdOverride: effectivePuzzleId ?? undefined,
      utcDateKey: mode === 'daily' ? dailyDescriptor.utcDateString : undefined,
    });
  }, [
    category,
    settings.difficulty,
    mode,
    stageIndex,
    effectivePuzzleId,
    dailyDescriptor,
  ]);

  const matchingSavedSession =
    initialGameplaySession &&
    initialGameplaySession.puzzleId === definition.id &&
    (!initialGameplaySession.interactionState ||
      initialGameplaySession.interactionState.type === definition.puzzleType)
      ? initialGameplaySession
      : null;

  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    () => matchingSavedSession?.elapsedSeconds ?? 0
  );
  const [interactionState, setInteractionState] =
    useState<PuzzleInteractiveState>(() =>
      matchingSavedSession?.interactionState
        ? matchingSavedSession.interactionState
        : createInitialPuzzleState(definition)
    );
  const [hintsUsed, setHintsUsed] = useState<number>(
    () => matchingSavedSession?.hintsUsed ?? 0
  );
  const [attemptCount, setAttemptCount] = useState<number>(
    () => matchingSavedSession?.attemptCount ?? 0
  );
  const [lastWrongSubmissionSignature, setLastWrongSubmissionSignature] =
    useState<string | null>(
      () => matchingSavedSession?.lastWrongSubmissionSignature ?? null
    );

  const [feedback, setFeedback] = useState<PuzzleValidationResult | null>(() => {
    if (matchingSavedSession?.pendingResult) {
      return {
        puzzleId: definition.id,
        isValidSubmission: true,
        isCorrect: true,
        accuracyRatio: matchingSavedSession.pendingResult.accuracyPercent / 100,
        feedbackMessage: 'Pattern verified! Logical rule satisfied.',
        explanation: definition.explanation,
        engineStatus: 'validated',
      };
    }
    return null;
  });

  const [pendingResult, setPendingResult] = useState<PuzzleResult | null>(
    () => matchingSavedSession?.pendingResult ?? null
  );

  // Lock whether this daily run started as a replay so solving it doesn't flip the header badge mid-screen
  const [sessionStartedAsDailyReplay, setSessionStartedAsDailyReplay] =
    useState<boolean>(() => {
      if (matchingSavedSession?.pendingResult?.dailyAlreadyClaimed !== undefined) {
        return Boolean(matchingSavedSession.pendingResult.dailyAlreadyClaimed);
      }
      return mode === 'daily' && !canClaimDailyReward(dailyDescriptor, dailyState);
    });

  // Lock whether this puzzle run started as a replay of an already-solved catalog puzzle
  const [sessionStartedAsPracticeReplay, setSessionStartedAsPracticeReplay] =
    useState<boolean>(() => {
      if (
        matchingSavedSession?.pendingResult?.isReplayOfSolvedPuzzle !==
        undefined
      ) {
        return Boolean(
          matchingSavedSession.pendingResult.isReplayOfSolvedPuzzle
        );
      }
      return isCatalogPuzzleSolved(definition.id, completionRecords);
    });

  const [startedAtIso, setStartedAtIso] = useState<string>(
    () => matchingSavedSession?.startedAtIso ?? new Date().toISOString()
  );

  const activePuzzleIdRef = useRef<string>(definition.id);

  // Reset or restore puzzle session state when the definition changes
  useEffect(() => {
    if (activePuzzleIdRef.current === definition.id) return;
    activePuzzleIdRef.current = definition.id;

    const restored =
      initialGameplaySession &&
      initialGameplaySession.puzzleId === definition.id &&
      (!initialGameplaySession.interactionState ||
        initialGameplaySession.interactionState.type === definition.puzzleType)
        ? initialGameplaySession
        : null;

    setElapsedSeconds(restored?.elapsedSeconds ?? 0);
    setHintsUsed(restored?.hintsUsed ?? 0);
    setAttemptCount(restored?.attemptCount ?? 0);
    setStartedAtIso(restored?.startedAtIso ?? new Date().toISOString());
    setInteractionState(
      restored?.interactionState
        ? restored.interactionState
        : createInitialPuzzleState(definition)
    );
    setLastWrongSubmissionSignature(
      restored?.lastWrongSubmissionSignature ?? null
    );
    setPendingResult(restored?.pendingResult ?? null);
    setFeedback(
      restored?.pendingResult
        ? {
            puzzleId: definition.id,
            isValidSubmission: true,
            isCorrect: true,
            accuracyRatio: restored.pendingResult.accuracyPercent / 100,
            feedbackMessage: 'Pattern verified! Logical rule satisfied.',
            explanation: definition.explanation,
            engineStatus: 'validated',
          }
        : null
    );
    setSessionStartedAsDailyReplay(
      restored?.pendingResult?.dailyAlreadyClaimed !== undefined
        ? Boolean(restored.pendingResult.dailyAlreadyClaimed)
        : mode === 'daily' && !canClaimDailyReward(dailyDescriptor, dailyState)
    );
    setSessionStartedAsPracticeReplay(
      restored?.pendingResult?.isReplayOfSolvedPuzzle !== undefined
        ? Boolean(restored.pendingResult.isReplayOfSolvedPuzzle)
        : isCatalogPuzzleSolved(definition.id, completionRecords)
    );
  }, [
    definition,
    initialGameplaySession,
    mode,
    dailyDescriptor,
    dailyState,
    completionRecords,
  ]);

  const selectedOptionIdSummary =
    interactionState.type === 'multiple_choice'
      ? interactionState.selectedOptionId
      : getPuzzleStateSignature(interactionState);

  // Persist active gameplay session state so browser refreshes resume cleanly
  useEffect(() => {
    onSyncGameplaySession?.({
      puzzleId: definition.id,
      category: definition.category,
      mode,
      elapsedSeconds,
      hintsUsed,
      attemptCount,
      selectedOptionId: selectedOptionIdSummary,
      interactionState,
      lastWrongSubmissionSignature,
      pendingResult,
      startedAtIso,
      modeMetadata,
      updatedAtIso: new Date().toISOString(),
    });
  }, [
    definition.id,
    definition.category,
    mode,
    elapsedSeconds,
    hintsUsed,
    attemptCount,
    selectedOptionIdSummary,
    interactionState,
    lastWrongSubmissionSignature,
    pendingResult,
    startedAtIso,
    modeMetadata,
    onSyncGameplaySession,
  ]);

  // Pause timer when browser tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Keyboard Escape toggles Pause modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playClick();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active gameplay timer (stops when paused, solved, or tab hidden)
  useEffect(() => {
    if (isPaused || pendingResult || isTabHidden) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, pendingResult, isTabHidden]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const liveAccuracyRatio = Math.max(
    0.4,
    1 - attemptCount * (definition.scoringConfig?.attemptPenaltyRatio ?? 0.15)
  );
  const currentScoreEstimate = pendingResult
    ? pendingResult.score
    : calculatePuzzleScore({
        difficulty: definition.difficulty,
        accuracyRatio: liveAccuracyRatio,
        elapsedSeconds,
        hintsUsed,
        hintsEnabled: settings.hintsEnabled,
        scoringConfig: definition.scoringConfig,
      });

  const hintProgress = getProgressiveHint(definition, hintsUsed);

  const handleRevealHint = () => {
    if (!settings.hintsEnabled || !hintProgress.canRequestMore || pendingResult) {
      return;
    }
    soundEngine.playHintChime();
    const nextHintsUsed = hintsUsed + 1;
    setHintsUsed(nextHintsUsed);
    const updatedHintProgress = getProgressiveHint(definition, nextHintsUsed);
    const latestHintText =
      updatedHintProgress.unlockedHints[
        updatedHintProgress.unlockedHints.length - 1
      ] ?? '';
    notifyNexiHintUsed({
      gameId: 'logic_quest',
      puzzleId: definition.id,
      puzzleTitle: definition.title,
      category: definition.category,
      difficulty: definition.difficulty,
      hintTier: nextHintsUsed,
      maxHints: definition.maxHints,
      hintText: latestHintText,
    });
  };

  const handleDispatchMechanism = useCallback(
    (action: PuzzleMechanismAction) => {
      if (action.type === 'reset') {
        soundEngine.playReset();
      } else {
        soundEngine.playPuzzleInteract();
      }
      setInteractionState((prev) => {
        const next = applyPuzzleAction(prev, action, definition.interactionSpec);
        const nextSig = getPuzzleStateSignature(next);
        if (nextSig !== lastWrongSubmissionSignature) {
          setLastWrongSubmissionSignature(null);
          setFeedback((prevFb) => (prevFb && !prevFb.isCorrect ? null : prevFb));
        }
        return next;
      });
    },
    [definition.interactionSpec, lastWrongSubmissionSignature]
  );

  const currentSignature = getPuzzleStateSignature(interactionState);
  const isCompleteInput = isPuzzleStateComplete(definition, interactionState);
  const isSameWrongSubmission =
    Boolean(lastWrongSubmissionSignature) &&
    currentSignature === lastWrongSubmissionSignature;

  const handleSubmitAnswer = () => {
    if (pendingResult || isSameWrongSubmission) return;

    if (!isCompleteInput) {
      const incompleteCheck = validatePuzzleAnswer(definition, {
        puzzleId: definition.id,
        category: definition.category,
        selectedOptionId: selectedOptionIdSummary,
        submittedValue: interactionState,
        interactionState,
        submissionSignature: currentSignature,
        elapsedSeconds,
        hintsUsed,
        attemptCount: attemptCount + 1,
      });
      setFeedback(incompleteCheck);
      soundEngine.playWrongAnswer();
      return;
    }

    const nextAttempts = attemptCount + 1;
    setAttemptCount(nextAttempts);

    const validation = validatePuzzleAnswer(definition, {
      puzzleId: definition.id,
      category: definition.category,
      selectedOptionId: selectedOptionIdSummary,
      submittedValue: interactionState,
      interactionState,
      submissionSignature: currentSignature,
      elapsedSeconds,
      hintsUsed,
      attemptCount: nextAttempts,
    });

    setFeedback(validation);

    if (validation.isCorrect) {
      setLastWrongSubmissionSignature(null);
      const previousBest =
        progress.categoryStats[definition.category]?.bestScore ?? null;
      const result = buildValidatedPuzzleResult({
        definition,
        validation,
        elapsedSeconds,
        hintsUsed,
        attemptCount: nextAttempts,
        hintsEnabled: settings.hintsEnabled,
        mode,
        previousBestScore: previousBest,
        dailyAlreadyClaimed: sessionStartedAsDailyReplay,
        isReplayOfSolvedPuzzle: sessionStartedAsPracticeReplay,
        startedAtIso,
        modeMetadata,
      });

      // Persist immediately and enrich result with milestone/level-up/achievement rewards
      onPuzzleSolved?.(result);
      emitNex11CompletionEvent(result);
      notifyNexiReaction({
        gameId: 'logic_quest',
        completionId: result.completionId,
        puzzleId: definition.id,
        category: definition.category,
        difficulty: definition.difficulty,
        mode,
        isCorrect: true,
        attemptCount: nextAttempts,
        score: result.score,
        accuracyPercent: result.accuracyPercent,
        localXpEarned: result.xpEarned,
        didLevelUp: result.didLevelUp,
        newLevel: result.newLevel,
        winStreakMilestoneReached: result.winStreakMilestoneReached,
        feedbackMessage: validation.feedbackMessage,
      });
      setPendingResult({ ...result });

      // Mark this completionId for one-shot in-gameplay celebration (prevents duplicate animations on re-renders or session restore)
      if (consumeOneShotCelebration(result.completionId, 'gameplay_solve')) {
        setLiveCelebratedCompletionId(result.completionId);
      }

      // Play mode-aware completion sound
      if (mode === 'daily') {
        soundEngine.playDailyChallengeComplete();
      } else {
        soundEngine.playCompletionChord();
      }

      const isFirstTimeWin =
        !result.isReplayOfSolvedPuzzle && !result.dailyAlreadyClaimed;

      if (result.winStreakMilestoneReached) {
        setTimeout(() => soundEngine.playWinStreakMilestone(), 120);
      } else if (isFirstTimeWin) {
        setTimeout(() => soundEngine.playWinStreakIncrease(), 100);
      }

      if (result.didLevelUp) {
        setTimeout(
          () => soundEngine.playLevelUp(),
          result.winStreakMilestoneReached ? 260 : 170
        );
      } else if (
        result.newlyUnlockedAchievementIds &&
        result.newlyUnlockedAchievementIds.length > 0 &&
        !result.winStreakMilestoneReached
      ) {
        setTimeout(() => soundEngine.playAchievementUnlock(), 180);
      }
    } else {
      setLastWrongSubmissionSignature(currentSignature);
      soundEngine.playWrongAnswer();
      notifyNexiReaction({
        gameId: 'logic_quest',
        puzzleId: definition.id,
        category: definition.category,
        difficulty: definition.difficulty,
        mode,
        isCorrect: false,
        attemptCount: nextAttempts,
        feedbackMessage: validation.feedbackMessage,
      });
    }
  };

  // Keyboard Enter submits a completed answer or continues when solved
  useEffect(() => {
    const handleEnterKey = (e: KeyboardEvent) => {
      if (isPaused || e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (pendingResult) {
        e.preventDefault();
        soundEngine.playTransition();
        onCompletePuzzle(pendingResult);
      } else if (isCompleteInput && !isSameWrongSubmission) {
        e.preventDefault();
        handleSubmitAnswer();
      }
    };
    window.addEventListener('keydown', handleEnterKey);
    return () => window.removeEventListener('keydown', handleEnterKey);
  });

  const handleRestartPuzzle = () => {
    soundEngine.playReset();
    setElapsedSeconds(0);
    setHintsUsed(0);
    setAttemptCount(0);
    setStartedAtIso(new Date().toISOString());
    setLastWrongSubmissionSignature(null);
    setFeedback(null);
    setPendingResult(null);
    setLiveCelebratedCompletionId(null);
    setInteractionState(resetPuzzleState(definition));
    setIsPaused(false);
  };

  const isMemoryConcealed =
    interactionState.type === 'memory_challenge' &&
    interactionState.phase === 'recall' &&
    !pendingResult;

  const isMemoryStudying =
    interactionState.type === 'memory_challenge' &&
    interactionState.phase === 'study' &&
    !pendingResult;

  // Track global Win Streak changes & live solve celebration ID
  const [liveCelebratedCompletionId, setLiveCelebratedCompletionId] = useState<
    string | null
  >(null);
  const prevWinStreakRef = useRef<number>(progress.currentWinStreak);
  const [streakAnimationState, setStreakAnimationState] = useState<
    'idle' | 'increased' | 'milestone' | 'reset'
  >('idle');

  useEffect(() => {
    const prev = prevWinStreakRef.current;
    const curr = progress.currentWinStreak;
    if (curr === prev) return;
    prevWinStreakRef.current = curr;

    if (curr > prev) {
      if (curr > 0 && curr % 8 === 0) {
        setStreakAnimationState('milestone');
      } else {
        setStreakAnimationState('increased');
      }
    } else if (curr === 0 && prev > 0) {
      setStreakAnimationState('reset');
    }
  }, [progress.currentWinStreak]);

  const isLiveSolveCelebration = Boolean(
    pendingResult &&
      liveCelebratedCompletionId &&
      pendingResult.completionId === liveCelebratedCompletionId
  );

  const isLiveMilestoneCelebration = Boolean(
    (isLiveSolveCelebration && pendingResult?.winStreakMilestoneReached) ||
      streakAnimationState === 'milestone'
  );

  const isLiveStreakIncrease = Boolean(
    isLiveMilestoneCelebration ||
      streakAnimationState === 'increased' ||
      (isLiveSolveCelebration &&
        !pendingResult?.isReplayOfSolvedPuzzle &&
        !pendingResult?.dailyAlreadyClaimed)
  );

  const isLiveLevelUpCelebration = Boolean(
    isLiveSolveCelebration && pendingResult?.didLevelUp
  );

  const milestoneDisplayStep =
    pendingResult?.winStreakMilestoneReached ||
    (progress.currentWinStreak > 0 && progress.winsTowardNextMilestone === 0)
      ? 8
      : progress.winsTowardNextMilestone;

  return (
    <div className="gameplay-viewport-shell min-h-[100dvh] w-full overflow-x-hidden flex flex-col max-w-[860px] mx-auto safe-viewport-pad sm:px-6 sm:py-4 md:px-8 md:py-6 gap-2 sm:gap-3">
      {/* 1. Compact Top Gameplay Header */}
      <div className="w-full space-y-1.5 shrink-0">
        <div className="gameplay-header flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsPaused(true);
            }}
            className="min-h-[42px] sm:min-h-[44px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl icon-3d-secondary text-xs sm:text-sm font-semibold shrink-0 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Pause</span>
          </button>

          {/* Category & Puzzle Title (Single-layer translucent surface) */}
          <div className="gameplay-title flex items-center gap-2 text-center min-w-0 px-3 sm:px-3.5 py-1.5 rounded-2xl gameplay-question-glass">
            <CategoryGlyph
              category={definition.category}
              className="w-5 h-5 hidden sm:block shrink-0"
              accentColor={categoryMeta.accentHex}
            />
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold text-sky-900 dark:text-cyan-300 truncate">
                {mode === 'daily'
                  ? `Daily Challenge ${dailyDescriptor.challengeNumber}/3`
                  : MODE_DISPLAY_LABELS[mode]}{' '}
                · {categoryMeta.shortTitle} ·{' '}
                <span>{formatDifficultyLabel(definition.difficulty)}</span>
                {sessionStartedAsDailyReplay || sessionStartedAsPracticeReplay
                  ? ' · Replay'
                  : ''}
              </div>
              <h1 className="font-display text-sm sm:text-base md:text-lg font-bold text-slate-950 dark:text-white leading-tight truncate">
                {definition.title}
              </h1>
            </div>
          </div>

          {/* Score & Timer Indicator */}
          <div className="gameplay-score min-h-[42px] sm:min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl card-3d-compact card-3d-static text-xs font-mono tabular-nums shrink-0">
            <span className="text-sky-700 dark:text-cyan-400 font-bold">
              {currentScoreEstimate} pts
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 hidden sm:inline" />
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Compact Global Win Streak & Live Level-Up Strip (Visible Across All Categories & Modes) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div
            aria-live="polite"
            className={`relative inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono tabular-nums transition-all ${
              isLiveMilestoneCelebration
                ? 'card-3d-featured lq-milestone-card-glow lq-shimmer-sweep !border-amber-500/85 text-amber-950 dark:text-amber-100'
                : isLiveStreakIncrease
                ? 'gameplay-question-glass !border-amber-400/75 text-slate-900 dark:text-slate-100 shadow-[0_0_16px_-3px_rgba(245,158,11,0.38)]'
                : streakAnimationState === 'reset'
                ? 'gameplay-question-glass text-slate-500 dark:text-slate-400'
                : 'gameplay-question-glass text-slate-800 dark:text-slate-200'
            }`}
          >
            {isLiveMilestoneCelebration && (
              <div className="lq-particle-burst" aria-hidden="true">
                {GAMEPLAY_CELEBRATION_PARTICLES.map((p, idx) => (
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

            {/* Prominent Global Win Streak Counter Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-display font-bold text-xs sm:text-sm ${
                progress.currentWinStreak > 0
                  ? 'bg-amber-500/20 border border-amber-500/45 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-500/15 border border-slate-400/30 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Zap
                className={`w-3.5 h-3.5 shrink-0 ${
                  progress.currentWinStreak > 0
                    ? 'text-amber-500 fill-amber-500/35'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span
                key={`streak-num-${progress.currentWinStreak}`}
                className={isLiveStreakIncrease ? 'lq-streak-num-pop' : ''}
              >
                {progress.currentWinStreak}
              </span>
            </span>

            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Win Streak · {milestoneDisplayStep}/8
            </span>

            {/* Smooth 8-Step Milestone Progress Indicator */}
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, idx) => {
                const isFilled = idx < milestoneDisplayStep;
                const isLatestFilled =
                  isLiveStreakIncrease && idx === milestoneDisplayStep - 1;
                return (
                  <span
                    key={idx}
                    className={`h-1.5 w-2 sm:w-2.5 rounded-full transition-all duration-300 ${
                      isFilled
                        ? isLiveMilestoneCelebration
                          ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]'
                          : 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-slate-400/30 dark:bg-slate-700/80'
                    } ${isLatestFilled ? 'lq-slot-pop' : ''}`}
                  />
                );
              })}
            </div>

            {isLiveMilestoneCelebration && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/25 border border-amber-400/60 font-display font-bold text-amber-800 dark:text-amber-200 lq-streak-num-pop">
                8-WIN BONUS +250 XP!
              </span>
            )}
          </div>

          {isLiveLevelUpCelebration && pendingResult && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl card-3d-featured lq-level-badge-pop !border-sky-400/80 text-xs font-display font-bold text-sky-950 dark:text-white"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                LEVEL {pendingResult.newLevel ?? progress.level} REACHED!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Translucent Liquid Glass Outer Gameplay Container (Content-Hugging, Centered) */}
      <div className="gameplay-board-container w-full max-w-[740px] mx-auto my-auto p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl gameplay-liquid-glass flex flex-col gap-2.5 sm:gap-3.5 md:gap-4">
        {/* Question Surface — Close to Diagram */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl gameplay-question-glass text-center max-w-xl mx-auto w-full">
          <p className="text-xs sm:text-base md:text-[17px] font-semibold text-slate-900 dark:text-slate-50 leading-snug">
            {definition.instructions}
          </p>
        </div>

        {/* Opaque 3D Puzzle Diagram Cards */}
        <div className="w-full">
          <div
            className={`grid gap-2 sm:gap-2.5 md:gap-3 mx-auto w-full ${
              definition.slots.length === 9
                ? 'grid-cols-3 max-w-[295px] sm:max-w-[355px] md:max-w-[380px]'
                : definition.slots.length === 6
                ? 'grid-cols-3 sm:grid-cols-6 max-w-[640px]'
                : 'grid-cols-2 sm:grid-cols-4 max-w-[640px]'
            }`}
          >
            {definition.slots.map((slot) => {
              const displayValue = slot.isTargetSlot
                ? getTargetSlotPreviewText(
                    definition,
                    interactionState,
                    slot.slotId
                  )
                : isMemoryConcealed
                ? '•••'
                : slot.valueDisplay;
              const isCompactText = displayValue.length > 8;

              return (
                <div
                  key={
                    slot.isTargetSlot
                      ? `${slot.slotId}-${displayValue}`
                      : slot.slotId
                  }
                  className={`gameplay-slot-card p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                    definition.slots.length === 9
                      ? 'min-h-[50px] sm:min-h-[68px]'
                      : 'min-h-[56px] sm:min-h-[74px]'
                  } ${
                    slot.isTargetSlot
                      ? pendingResult
                        ? 'card-3d-featured border-2 !border-emerald-500 dark:!border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-[0_0_20px_-2px_rgba(16,185,129,0.4)] lq-solve-celebration'
                        : isSameWrongSubmission
                        ? 'card-3d-featured border-2 !border-rose-500 text-rose-800 dark:text-rose-300 lq-shake-subtle'
                        : `card-3d-featured border-2 !border-cyan-500 dark:!border-cyan-400 text-sky-800 dark:text-cyan-300 shadow-[0_0_18px_-2px_rgba(14,165,233,0.34)] ${
                            displayValue !== '?' ? 'lq-slot-pop' : ''
                          }`
                      : 'card-3d-compact card-3d-static text-slate-900 dark:text-white'
                  }`}
                >
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 leading-tight">
                    {slot.label}
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums leading-tight break-words ${
                      isCompactText
                        ? 'text-xs sm:text-sm md:text-base'
                        : 'text-base sm:text-xl'
                    }`}
                  >
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact Progressive Hint & Feedback Area */}
        {((settings.hintsEnabled && hintProgress.unlockedHints.length > 0) ||
          feedback) && (
          <div className="space-y-1.5 max-w-xl mx-auto w-full" aria-live="polite">
            {settings.hintsEnabled &&
              hintProgress.unlockedHints.map((hint, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl card-3d-compact card-3d-static !border-amber-500/45 text-xs text-amber-900 dark:text-amber-200 text-center leading-snug lq-fade-in"
                >
                  <strong className="font-semibold">Hint {idx + 1}:</strong> {hint}
                </div>
              ))}

            {feedback && (
              <div
                key={`${feedback.isCorrect}-${attemptCount}`}
                className={`px-3.5 py-2 rounded-xl border text-center space-y-0.5 backdrop-blur-md ${
                  feedback.isCorrect
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-950 dark:text-emerald-100 lq-solve-celebration'
                    : 'bg-rose-500/20 border-rose-500/50 text-rose-950 dark:text-rose-100 lq-shake-subtle'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 font-display font-bold text-xs sm:text-sm">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{feedback.feedbackMessage}</span>
                </div>
                {feedback.explanation && (
                  <p className="text-[11px] sm:text-xs opacity-90 leading-snug">
                    {feedback.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modular Interactive Mechanism Host + Hint & Check Answer Controls */}
        <div className="space-y-2.5 max-w-xl mx-auto w-full">
          <PuzzleMechanismHost
            definition={definition}
            state={interactionState}
            disabled={Boolean(pendingResult)}
            isMarkedWrong={isSameWrongSubmission}
            onDispatch={handleDispatchMechanism}
          />

          {/* Submit / Continue & Hint Row */}
          <div className="gameplay-controls flex items-center justify-between gap-2.5">
            {settings.hintsEnabled && definition.maxHints > 0 ? (
              <button
                type="button"
                disabled={!hintProgress.canRequestMore || Boolean(pendingResult)}
                onClick={handleRevealHint}
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold shrink-0 ${
                  !hintProgress.canRequestMore || pendingResult
                    ? 'card-3d-compact card-3d-static opacity-55 text-slate-400 cursor-not-allowed'
                    : 'icon-3d-secondary cursor-pointer'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>
                  {!hintProgress.canRequestMore
                    ? 'No Hints'
                    : `Hint (${definition.maxHints - hintsUsed})`}
                </span>
              </button>
            ) : (
              <div />
            )}

            {!pendingResult ? (
              <button
                type="button"
                disabled={!isCompleteInput || isSameWrongSubmission}
                onClick={handleSubmitAnswer}
                className={`flex-1 sm:flex-initial min-w-[160px] sm:min-w-[200px] min-h-[44px] py-2.5 sm:py-3 px-6 rounded-xl sm:rounded-2xl font-display text-sm sm:text-base font-bold ${
                  isCompleteInput && !isSameWrongSubmission
                    ? 'btn-3d-primary text-white cursor-pointer'
                    : 'card-3d-compact card-3d-static opacity-65 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {isMemoryStudying ? 'Studying Pattern...' : 'Check Answer'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTransition();
                  onCompletePuzzle(pendingResult);
                }}
                className="flex-1 sm:flex-initial min-w-[160px] sm:min-w-[200px] min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 rounded-xl sm:rounded-2xl btn-3d-primary text-white font-display text-sm sm:text-base font-bold cursor-pointer lq-solve-celebration"
              >
                <span>
                  {mode === 'daily'
                    ? dailyDescriptor.challengeNumber < 3
                      ? `Challenge ${dailyDescriptor.challengeNumber + 1}/3`
                      : 'Complete Daily (3/3)'
                    : 'Continue'}
                </span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-dialog-title"
          onClick={() => {
            soundEngine.playClick();
            setIsPaused(false);
          }}
        >
          <div
            className="gameplay-pause-panel w-full max-w-sm p-6 rounded-3xl card-3d-standard card-3d-static space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2
                id="pause-dialog-title"
                className="font-display text-2xl font-bold text-slate-900 dark:text-white"
              >
                Game Paused
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {definition.title}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsPaused(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl btn-3d-primary text-white font-display font-bold text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={handleRestartPuzzle}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl card-3d-compact text-slate-800 dark:text-slate-100 font-semibold text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Puzzle</span>
              </button>

              {onExitCollection &&
                (mode === 'practice' || mode === 'collection_preview') && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (!pendingResult) {
                        onAbandonPuzzle?.(definition.id);
                      }
                      setIsPaused(false);
                      onExitCollection();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl card-3d-compact text-slate-800 dark:text-slate-100 font-semibold text-sm cursor-pointer"
                  >
                    <span>Return to Puzzle Library</span>
                  </button>
                )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  if (!pendingResult) {
                    onAbandonPuzzle?.(definition.id);
                  }
                  setIsPaused(false);
                  onExitHome();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl icon-3d-secondary font-semibold text-sm cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Exit to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
