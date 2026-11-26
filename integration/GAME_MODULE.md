# Logic Quest — NEX11 Game Module Specification (`GAME_MODULE.md`)

## 1. Module Identity & Versioning

| Property | Value |
| :--- | :--- |
| **Game ID** | `logic_quest` |
| **Display Name** | `Logic Quest` |
| **Game Version** | `1.0.0` |
| **NEX11 Module Contract Version** | `1.0.0` |
| **Completion Event Contract Version** | `1.0.0` |
| **Standalone Ready** | `true` (100% playable without NEX11 host services) |
| **Canonical Entry Point** | `src/module/index.ts` (`LogicQuestModule`, `initializeLogicQuestModule`, `LOGIC_QUEST_MODULE_MANIFEST`) |

---

## 2. Game Architecture Overview

Logic Quest is a modular, deterministic cognitive puzzle and brain-training module designed for standalone execution and clean future embedding inside the NEX11 ecosystem.

### Folder Structure
- **`src/module/index.ts`** — Canonical NEX11 Game-Module entry point, manifest, launch configuration initializer, and contract exports.
- **`src/engine/`** — Pure, UI-independent game engines:
  - `categories.ts` — Metadata and cognitive descriptors for the 8 puzzle categories.
  - `generator.ts` — 64 curated, deterministic puzzles (8 per category: 3 Easy, 3 Regular, 2 Hard) and session-aware selection logic.
  - `mechanicsController.ts` — Interactive state machine and 3-tier progressive hint resolver for all 8 puzzle mechanics.
  - `validator.ts` — Deterministic answer validation and diagnostic feedback across all 8 mechanics.
  - `difficulty.ts` — Global and per-category difficulty engine (`easy`, `regular` adaptive, `hard`).
  - `dailyPuzzle.ts` — Deterministic local-calendar-date triad generator (`1 -> 2 -> 3` sequence) and anti-skip enforcement.
  - `scoring.ts` — Score, accuracy, Logic Quest internal XP, Level-Up progression, and one-shot celebration deduplication registry.
  - `nex11Bridge.ts` — Neutral, versioned NEX11 completion event emitter (with `completionId` deduplication) and optional Nexi companion adapter.
- **`src/storage/storageManager.ts`** — Schema-versioned local storage persistence (`schemaVersion: 1`), older schema migration, and corruption recovery.
- **`src/audio/soundEngine.ts`** — Procedural Web Audio API sound effects and 4-movement instrumental ambient score (*Starlight Sanctuary & Hidden Mechanisms*) with strict single-scheduler protection.
- **`src/components/`** — Responsive React + Tailwind UI layers, 8 interactive puzzle mechanic hosts, and 3D Logic Core WebGL canvas with automatic SVG fallback.

---

## 3. Supported Modes, Categories & Mechanics

### Game Modes
1. **Quick Play (`quick_play`)**: Immediate launch into a puzzle across all 8 categories using the player's effective difficulty (`easy`, adaptive `regular`, or `hard`) while avoiding session repeats.
2. **Daily Challenges (`daily`)**: Three deterministic puzzles per local calendar day (`#1 Easy`, `#2 Regular`, `#3 Hard`) played in strict `1 -> 2 -> 3` sequential order with a `+150 XP` daily triad bonus on 3/3 completion.
3. **Puzzle Library (`practice`)**: Browse all 8 cognitive categories (8 puzzles per category, 64 total) with per-category difficulty overrides (`Easy`, `Regular`, `Hard`) and replay protection.
4. **Progress (`progress`)**: Displays Logic Quest internal Level & XP progress, Global Win Streak & 8-Win Milestone progress (`+250 XP` per 8 wins), 8-Category mastery breakdown, and 10 player-facing achievements.

### Eight Cognitive Categories (`PuzzleCategory`)
1. `number_sequences` — **Number Sequences**
2. `pattern_recognition` — **Pattern Recognition**
3. `math_logic` — **Math Logic**
4. `word_verbal` — **Word / Verbal Logic**
5. `spatial_reasoning` — **Spatial Reasoning**
6. `deduction` — **Deduction**
7. `symbol_systems` — **Symbol Systems**
8. `memory_order` — **Memory & Order**

### Eight Interactive Mechanics (`PuzzleInteractionType`)
1. `multiple_choice` — Curated multi-option selection
2. `pattern_recognition` — Visual matrix cell completion
3. `sequence_puzzle` — Multi-slot sequence construction
4. `spatial_reasoning` — 2D orientation, rotation, and reflection inspection
5. `logical_deduction` — Constraint elimination matrix
6. `cipher_code` — Symbolic token-to-value mapping
7. `mathematical_reasoning` — Balanced operator/equation assembly
8. `memory_challenge` — Timed sequence recall and reconstruction

---

## 4. NEX11 Game-Module Contract (`v1.0.0`)

### 4.1 Optional Launch Configuration (`Nex11LaunchConfig`)
Logic Quest can be mounted with zero props (`<LogicQuestModule />`) or configured with an optional `Nex11LaunchConfig`:

```ts
export interface Nex11LaunchConfig {
  playerId?: string | null;
  themePreference?: 'dark' | 'light' | 'system';
  audioPreferences?: {
    masterMuted?: boolean;
    masterVolume?: number; // 0 - 100
    soundEffectsEnabled?: boolean;
    sfxVolume?: number; // 0 - 100
    musicEnabled?: boolean;
    musicVolume?: number; // 0 - 100
  };
  hostEnvironment?: {
    hostAppId?: string;
    hostVersion?: string;
    locale?: string;
    platform?: 'web' | 'ios' | 'android' | 'desktop';
  };
  initialRoute?: ScreenRoute;
  initialCategory?: PuzzleCategory | null;
  difficultyPreference?: 'easy' | 'regular' | 'hard';
  hintsEnabled?: boolean;
  nexiAdapter?: Nex11NexiAdapter | null;
  onCompletionEvent?: (event: Nex11GameCompletionEvent) => void;
}
```

### 4.2 Versioned Completion Event Contract (`Nex11GameCompletionEvent`)
Every validated puzzle solve emits a single deduplicated `Nex11GameCompletionEvent` (guaranteed at most once per `completionId`):

```ts
export interface Nex11GameCompletionEvent {
  eventVersion: '1.0.0';
  gameId: 'logic_quest';
  completionId: string;
  playerId?: string | null;
  puzzleId: string;
  category: PuzzleCategory;
  difficulty: DifficultyLevel;
  mode: GameMode;
  score: number;
  completionTimeSeconds: number;
  hintsUsed: number;
  attemptCount: number;
  accuracyPercent: number;
  localGameXpEarned: number;
  completedAtIso: string;
  resultData: {
    puzzleTitle: string;
    isNewPersonalBest: boolean;
    previousBestScore: number | null;
    dailyAlreadyClaimed?: boolean;
    isReplayOfSolvedPuzzle?: boolean;
    didLevelUp?: boolean;
    previousLevel?: number;
    newLevel?: number;
    winStreakMilestoneReached?: boolean;
    winStreakMilestoneBonusXp?: number;
    dailySetCompletedNow?: boolean;
    dailySetBonusXpEarned?: number;
    newlyUnlockedAchievementIds?: AchievementId[];
    modeMetadata?: GameplayModeMetadata;
  };
}
```

### 4.3 XP & Progression Ownership Boundary
- **Logic Quest Internal Progression**: Logic Quest calculates and persists its own internal `localGameXpEarned`, player levels, category mastery, and global Win Streak inside its own namespaced storage keys.
- **NEX11 Global Progression**: Logic Quest **never** writes to or mutates global NEX11 XP or global NEX11 daily streaks. The NEX11 host listens to `Nex11GameCompletionEvent` and applies its own global reward rules.

### 4.4 Optional Nexi Companion Adapter (`Nex11NexiAdapter`)
When hosted inside NEX11, the host may pass an optional `nexiAdapter` to receive real-time companion hooks:
- `showHint(payload: NexiHintEventPayload)` — Triggered when the player reveals a progressive hint tier (1..3).
- `reactToPuzzleResult(payload: NexiResultReactionPayload)` — Triggered on correct solve or wrong submission.
- `setExpression(expression: NexiExpressionState, reason?: string)` — Suggests companion expression (`idle`, `thinking`, `encouraging`, `celebrating`, `impressed`, `curious`).
- `updateGameContext(context: NexiGameContextPayload)` — Triggered when route, mode, category, level, or Win Streak changes.
- When `nexiAdapter` is omitted (standalone mode), all Nexi hooks safely no-op and errors inside host callbacks are isolated via `try/catch`.

---

## 5. Storage & Settings Ownership

All local persistence is namespaced under `logic_quest.v1.*`:

| Storage Key | Purpose | Ownership |
| :--- | :--- | :--- |
| `logic_quest.v1.settings` | Theme, audio volumes/toggles, global & category difficulty preferences, adaptive difficulty state, hints toggle | Logic Quest (initializable via `Nex11LaunchConfig`) |
| `logic_quest.v1.progress` | Logic Quest XP, level, total score, Win Streak (`currentWinStreak`, `bestWinStreak`, `winStreakMilestoneProgress`), per-category stats | Logic Quest internal progression |
| `logic_quest.v1.completion_records` | Historical puzzle solve records (capped to 250 recent entries) | Logic Quest internal history |
| `logic_quest.v1.daily_completion` | Local-date Daily Challenge triad state (`completedChallenges`, `dailySetBonusClaimed`, history) | Logic Quest internal daily state |
| `logic_quest.v1.achievements` | Unlocked Logic Quest achievement timestamps and progress | Logic Quest internal achievements |
| `logic_quest.v1.app_session` | Active screen route, category selection, and mid-puzzle interactive state for seamless refresh recovery | Logic Quest session state |
| `logic_quest.v1.campaign_progress` | Legacy compatibility storage key (preserved for backward data safety) | Legacy / internal |
