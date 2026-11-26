/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Neutral NEX11 Integration Boundary (Phase L3 Finalized Contract)
 * - Defines canonical Game Identity (`gameId: 'logic_quest'`, version `1.0.0`)
 * - Supports optional NEX11 Launch Configuration (`Nex11LaunchConfig`) while remaining
 *   100% playable standalone when no host config is provided.
 * - Emits versioned (`1.0.0`), strictly deduplicated `Nex11GameCompletionEvent` payloads
 *   keyed by `completionId` without ever awarding global NEX11 XP directly.
 * - Provides a safe, optional `Nex11NexiAdapter` companion bridge that cleanly no-ops
 *   when running standalone.
 */

import {
  Nex11CompletionEventVersion,
  Nex11GameCompletionEvent,
  Nex11LaunchConfig,
  Nex11ModuleContractVersion,
  Nex11ModuleManifest,
  Nex11NexiAdapter,
  NexiExpressionState,
  NexiGameContextPayload,
  NexiHintEventPayload,
  NexiResultReactionPayload,
  PuzzleResult,
} from '../types/game';

export const LOGIC_QUEST_GAME_ID = 'logic_quest' as const;
export const LOGIC_QUEST_DISPLAY_NAME = 'Logic Quest' as const;
export const LOGIC_QUEST_GAME_VERSION = '1.0.0' as const;
export const NEX11_CONTRACT_VERSION: Nex11ModuleContractVersion = '1.0.0';
export const NEX11_COMPLETION_EVENT_VERSION: Nex11CompletionEventVersion = '1.0.0';

export const LOGIC_QUEST_MODULE_MANIFEST: Nex11ModuleManifest = Object.freeze({
  gameId: LOGIC_QUEST_GAME_ID,
  displayName: LOGIC_QUEST_DISPLAY_NAME,
  gameVersion: LOGIC_QUEST_GAME_VERSION,
  contractVersion: NEX11_CONTRACT_VERSION,
  completionEventVersion: NEX11_COMPLETION_EVENT_VERSION,
  supportedModes: ['quick_play', 'daily', 'practice'] as const,
  categoriesCount: 8,
  catalogPuzzlesCount: 64,
  ownsLocalGameXp: true,
  awardsGlobalNex11XpDirectly: false,
  standalonePlayable: true,
});

export type Nex11CompletionListener = (event: Nex11GameCompletionEvent) => void;

const listeners = new Set<Nex11CompletionListener>();
const emittedCompletionIds = new Set<string>();

let activeLaunchConfig: Nex11LaunchConfig | null = null;
let activeNexiAdapter: Nex11NexiAdapter | null = null;
let launchCompletionUnsubscribe: (() => void) | null = null;

let emittedEventCount = 0;
let duplicateBlockedCount = 0;
let lastEmittedEvent: Nex11GameCompletionEvent | null = null;
let lastNexiExpression: NexiExpressionState = 'idle';
let lastNexiContext: NexiGameContextPayload | null = null;

/**
 * Returns the static NEX11 module manifest for Logic Quest.
 */
export function getLogicQuestModuleManifest(): Nex11ModuleManifest {
  return LOGIC_QUEST_MODULE_MANIFEST;
}

/**
 * Configures optional NEX11 host launch parameters (playerId, theme/audio defaults,
 * Nexi companion adapter, and completion listener). Safe to call with `undefined`
 * or omit entirely in standalone mode.
 */
export function configureNex11Launch(
  config?: Nex11LaunchConfig | null
): () => void {
  if (launchCompletionUnsubscribe) {
    launchCompletionUnsubscribe();
    launchCompletionUnsubscribe = null;
  }

  activeLaunchConfig = config ? { ...config } : null;
  activeNexiAdapter = config?.nexiAdapter ?? null;

  if (config?.onCompletionEvent) {
    launchCompletionUnsubscribe = registerNex11CompletionListener(
      config.onCompletionEvent
    );
  }

  return () => {
    if (launchCompletionUnsubscribe) {
      launchCompletionUnsubscribe();
      launchCompletionUnsubscribe = null;
    }
    activeLaunchConfig = null;
    activeNexiAdapter = null;
  };
}

export function getNex11LaunchConfig(): Nex11LaunchConfig | null {
  return activeLaunchConfig;
}

/**
 * Registers or clears the optional NEX11 Nexi companion adapter.
 */
export function registerNex11NexiAdapter(
  adapter: Nex11NexiAdapter | null
): () => void {
  activeNexiAdapter = adapter;
  return () => {
    if (activeNexiAdapter === adapter) {
      activeNexiAdapter = null;
    }
  };
}

export function getNex11NexiAdapter(): Nex11NexiAdapter | null {
  return activeNexiAdapter;
}

/**
 * Transforms an internal Logic Quest `PuzzleResult` into the versioned, neutral
 * `Nex11GameCompletionEvent` payload.
 * Note: `localGameXpEarned` represents Logic Quest's internal progression XP only.
 * NEX11 computes and awards global NEX11 XP independently upon receiving this event.
 */
export function createNex11CompletionEvent(
  result: PuzzleResult
): Nex11GameCompletionEvent {
  const isReplay = Boolean(
    result.isReplayOfSolvedPuzzle || result.dailyAlreadyClaimed
  );

  return {
    gameId: LOGIC_QUEST_GAME_ID,
    eventVersion: NEX11_COMPLETION_EVENT_VERSION,
    completionId: result.completionId,
    puzzleId: result.puzzleId,
    playerId: activeLaunchConfig?.playerId ?? null,
    completionStatus: result.status,
    validatedScore: result.score,
    accuracyPercent: result.accuracyPercent,
    localGameXpEarned: result.xpEarned,
    completionTimestamp: result.completedAtIso,
    resultData: {
      category: result.category,
      difficulty: result.difficulty,
      puzzleType: result.puzzleType,
      mode: result.mode,
      accuracyPercent: result.accuracyPercent,
      completionTimeSeconds: result.completionTimeSeconds,
      hintsUsed: result.hintsUsed,
      attemptCount: result.attemptCount ?? 1,
      localXpEarned: result.xpEarned,
      basePuzzleXpAwarded: result.basePuzzleXpAwarded,
      winStreakMilestoneReached: result.winStreakMilestoneReached,
      winStreakMilestoneXpAwarded: result.winStreakMilestoneXpAwarded,
      completedDailySetToday: result.completedDailySetToday,
      dailySetBonusXpAwarded: result.dailySetBonusXpAwarded,
      newlyUnlockedAchievementIds: result.newlyUnlockedAchievementIds,
      didLevelUp: result.didLevelUp,
      previousLevel: result.previousLevel,
      newLevel: result.newLevel,
      isReplay,
      isFoundationPreview: !result.isPersistedRecord,
    },
  };
}

/**
 * Registers an optional external adapter listener for NEX11 integration.
 */
export function registerNex11CompletionListener(
  listener: Nex11CompletionListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns true if a completion event with the given `completionId` has already been emitted.
 */
export function hasEmittedNex11CompletionEvent(
  completionId: string | undefined | null
): boolean {
  if (!completionId) return false;
  return emittedCompletionIds.has(completionId);
}

/**
 * Emits a versioned completion event to any registered NEX11 adapter listeners.
 * Strictly deduplicated by `result.completionId` so repeated calls or re-renders
 * never produce duplicate completion events.
 */
export function emitNex11CompletionEvent(
  result: PuzzleResult
): Nex11GameCompletionEvent {
  const event = createNex11CompletionEvent(result);

  if (result.completionId && emittedCompletionIds.has(result.completionId)) {
    duplicateBlockedCount += 1;
    return event;
  }

  if (result.completionId) {
    emittedCompletionIds.add(result.completionId);
  }

  emittedEventCount += 1;
  lastEmittedEvent = event;

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Isolate external adapter errors from Logic Quest runtime
    }
  });

  return event;
}

// ============================================================================
// SAFE NEXI COMPANION ADAPTER DISPATCHERS (NO-OP WHEN STANDALONE)
// ============================================================================

export function notifyNexiHintUsed(payload: NexiHintEventPayload): void {
  lastNexiExpression = 'curious';
  if (!activeNexiAdapter) return;
  try {
    activeNexiAdapter.setExpression?.('curious', payload.hintText);
    activeNexiAdapter.showHint?.(payload);
  } catch {
    // Isolate host Nexi adapter errors
  }
}

export function notifyNexiReaction(payload: NexiResultReactionPayload): void {
  const expression: NexiExpressionState = payload.isCorrect
    ? payload.didLevelUp || payload.winStreakMilestoneReached
      ? 'celebrating'
      : 'proud'
    : 'encouraging';
  lastNexiExpression = expression;
  if (!activeNexiAdapter) return;
  try {
    activeNexiAdapter.setExpression?.(expression, payload.feedbackMessage);
    activeNexiAdapter.reactToPuzzleResult?.(payload);
  } catch {
    // Isolate host Nexi adapter errors
  }
}

export function notifyNexiGameContext(
  context: Omit<NexiGameContextPayload, 'gameId' | 'updatedAtIso'>
): NexiGameContextPayload {
  const fullContext: NexiGameContextPayload = {
    gameId: LOGIC_QUEST_GAME_ID,
    ...context,
    updatedAtIso: new Date().toISOString(),
  };
  lastNexiContext = fullContext;
  if (activeNexiAdapter) {
    try {
      activeNexiAdapter.updateGameContext?.(fullContext);
    } catch {
      // Isolate host Nexi adapter errors
    }
  }
  return fullContext;
}

export function getNex11BridgeDiagnostics(): {
  gameId: 'logic_quest';
  gameVersion: string;
  contractVersion: string;
  completionEventVersion: string;
  emittedEventCount: number;
  duplicateBlockedCount: number;
  registeredListenerCount: number;
  hasNexiAdapter: boolean;
  activePlayerId: string | null;
  lastEmittedEvent: Nex11GameCompletionEvent | null;
  lastNexiExpression: NexiExpressionState;
  lastNexiContext: NexiGameContextPayload | null;
} {
  return {
    gameId: LOGIC_QUEST_GAME_ID,
    gameVersion: LOGIC_QUEST_GAME_VERSION,
    contractVersion: NEX11_CONTRACT_VERSION,
    completionEventVersion: NEX11_COMPLETION_EVENT_VERSION,
    emittedEventCount,
    duplicateBlockedCount,
    registeredListenerCount: listeners.size,
    hasNexiAdapter: Boolean(activeNexiAdapter),
    activePlayerId: activeLaunchConfig?.playerId ?? null,
    lastEmittedEvent,
    lastNexiExpression,
    lastNexiContext,
  };
}

export function resetNex11BridgeForTests(): void {
  if (launchCompletionUnsubscribe) {
    launchCompletionUnsubscribe();
    launchCompletionUnsubscribe = null;
  }
  listeners.clear();
  emittedCompletionIds.clear();
  activeLaunchConfig = null;
  activeNexiAdapter = null;
  emittedEventCount = 0;
  duplicateBlockedCount = 0;
  lastEmittedEvent = null;
  lastNexiExpression = 'idle';
  lastNexiContext = null;
}

