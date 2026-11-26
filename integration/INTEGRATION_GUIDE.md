# Logic Quest — NEX11 Integration Guide (`INTEGRATION_GUIDE.md`)

This guide explains how to integrate **Logic Quest (`v1.0.0`)** into the **NEX11** host application in a future integration phase without modifying Logic Quest's core engine.

---

## 1. Quick Start: Mounting Logic Quest in NEX11

Import `LogicQuestModule` and (optionally) `initializeLogicQuestModule` from `src/module/index.ts`:

```tsx
import React from 'react';
import {
  LogicQuestModule,
  Nex11GameCompletionEvent,
  Nex11LaunchConfig,
} from './src/module';

export function Nex11LogicQuestContainer() {
  const handleLogicQuestCompletion = (event: Nex11GameCompletionEvent) => {
    // 1. Inspect validated completion metadata
    console.log('[NEX11 Host] Puzzle completed:', {
      completionId: event.completionId,
      puzzleId: event.puzzleId,
      category: event.category,
      difficulty: event.difficulty,
      mode: event.mode,
      score: event.score,
      accuracyPercent: event.accuracyPercent,
      isFirstTimeSolve:
        !event.resultData.isReplayOfSolvedPuzzle &&
        !event.resultData.dailyAlreadyClaimed,
    });

    // 2. Award NEX11 global XP or update NEX11 daily streak in the host service
    // (Logic Quest never mutates global NEX11 XP directly)
  };

  const launchConfig: Nex11LaunchConfig = {
    playerId: 'nex11-user-id-001',
    themePreference: 'dark',
    difficultyPreference: 'regular',
    hintsEnabled: true,
    audioPreferences: {
      masterMuted: false,
      masterVolume: 80,
      soundEffectsEnabled: true,
      sfxVolume: 85,
      musicEnabled: true,
      musicVolume: 55,
    },
    hostEnvironment: {
      hostAppId: 'nex11-app',
      hostVersion: '1.0.0',
      platform: 'web',
    },
    onCompletionEvent: handleLogicQuestCompletion,
  };

  return <LogicQuestModule launchConfig={launchConfig} />;
}
```

---

## 2. Subscribing to Completion Events Outside React Props

If the NEX11 host prefers event bus registration outside component props, use `registerNex11CompletionListener`:

```ts
import { registerNex11CompletionListener } from './src/module';

const unsubscribe = registerNex11CompletionListener((event) => {
  // Guaranteed deduplicated by event.completionId (eventVersion === '1.0.0')
  if (!event.resultData.isReplayOfSolvedPuzzle && !event.resultData.dailyAlreadyClaimed) {
    // Credit NEX11 global progression
  }
});

// Call unsubscribe() when unmounting or tearing down the host listener
```

### Deduplication Guarantee
- Every puzzle solve generates a unique `completionId` (`LQ-COMP-...`).
- `emitNex11CompletionEvent` tracks emitted `completionId` values in memory and blocks any duplicate emission for the same `completionId`.
- If a player replays an already-solved library puzzle or an already-claimed Daily Challenge, `resultData.isReplayOfSolvedPuzzle` or `resultData.dailyAlreadyClaimed` is set to `true` and `localGameXpEarned` is `0`, allowing the NEX11 host to distinguish first-time solves from practice replays.

---

## 3. Connecting the Nexi Companion Adapter (Optional)

To allow the NEX11 companion (**Nexi**) to react to hints, puzzle submissions, and screen context changes, provide a `Nex11NexiAdapter` via `launchConfig.nexiAdapter` or `registerNex11NexiAdapter`:

```ts
import { registerNex11NexiAdapter } from './src/module';

const unregisterNexi = registerNex11NexiAdapter({
  showHint(payload) {
    // payload.hintTier (1..3), payload.hintText, payload.category, payload.difficulty
  },
  reactToPuzzleResult(payload) {
    if (payload.isCorrect) {
      // Celebrate solve, level-up (payload.didLevelUp), or 8-win milestone (payload.winStreakMilestoneReached)
    } else {
      // Offer encouragement on wrong attempt (payload.attemptCount, payload.feedbackMessage)
    }
  },
  setExpression(expression, reason) {
    // 'idle' | 'thinking' | 'encouraging' | 'celebrating' | 'impressed' | 'curious'
  },
  updateGameContext(context) {
    // context.currentRoute, context.activeMode, context.activeCategory, context.currentLevel, context.currentWinStreak
  },
});
```

---

## 4. Audio & Viewport Integration Notes

1. **Container Sizing**:
   - The Home screen uses a locked `100dvh` sanctuary layout (`h-[100dvh] max-h-[100dvh] overflow-hidden`), while inner screens (`gameplay`, `collection`, `progress`, `results`) use `min-h-[100dvh]` with responsive scrolling.
   - When embedding inside a NEX11 shell with a persistent top/bottom bar, place `<LogicQuestModule />` inside a dedicated full-viewport container or iframe/portal container.
2. **Web Audio Lifecycle**:
   - `soundEngine` automatically unlocks on the first user gesture (`pointerdown` or `keydown`) and uses a single master lookahead scheduler (`activeMusicSchedulerCount <= 1`).
   - Host mute/volume changes can be passed through `launchConfig.audioPreferences` at launch or controlled by the player inside Logic Quest's Settings modal.
3. **3D Logic Core & WebGL Fallback**:
   - `LogicCoreCanvas` automatically detects WebGL availability and `prefers-reduced-motion`. If WebGL context creation fails on a constrained webview, it falls back seamlessly to a multi-layered SVG Sacred Geometry Core without throwing runtime errors.
