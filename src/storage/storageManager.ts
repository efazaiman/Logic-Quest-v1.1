/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Versioned Local Persistence & Centralized Progression Engine (Phase L2.4)
 * Separates storage responsibilities across dedicated versioned envelopes:
 * 1. Settings (`logic_quest_settings_v1`)
 * 2. Player Progression (`logic_quest_progress_v1`)
 * 3. Puzzle Completion Records (`logic_quest_records_v1`)
 * 4. Daily Completion Registry (`logic_quest_daily_v1`)
 * 5. Achievements (`logic_quest_achievements_v1`)
 * 6. Active App & Gameplay Session (`logic_quest_session_v1`)
 * 7. Lost Logic Archive Campaign (`logic_quest_campaign_v1`)
 */

import {
  ARCHIVE_CHAMBERS,
  createDefaultCampaignProgressState,
  syncCampaignProgressWithRecords,
} from '../engine/campaign';
import { PUZZLE_CATEGORIES_ORDER } from '../engine/categories';
import { getDailyDateCompletionMap } from '../engine/dailyPuzzle';
import {
  advanceAutoDifficultyOnSolve,
  createDefaultAutoDifficultyState,
  demoteAutoDifficultyOnFailure,
  getEffectiveCategoryDifficulty,
  getEffectiveGlobalDifficulty,
  normalizeDifficultyPreference,
  resolveEffectiveDifficulty,
} from '../engine/difficulty';
import {
  getCatalogPuzzleById,
  isCatalogPuzzleSolved,
  PUZZLE_CATALOG,
} from '../engine/generator';
import { getXpRequiredForLevel } from '../engine/scoring';
import {
  AchievementDefinition,
  AchievementProgressItem,
  ActiveGameplaySessionState,
  AutoDifficultyState,
  CampaignCompletionRecord,
  CampaignDiscoveryRecord,
  CampaignProgressState,
  CategoryProgressStats,
  DailyCompletionState,
  DailyPuzzleDescriptor,
  DifficultyPreference,
  GameCompletionRecord,
  GameHubTab,
  GameMode,
  GameplayModeMetadata,
  GameSettings,
  Nex11LaunchConfig,
  PersistedAppSessionState,
  PlayerGameProgress,
  PuzzleCategory,
  PuzzleDifficulty,
  PuzzleResult,
  QuickPlayConfigState,
  ScreenRoute,
  ThemePreference,
  UnlockedAchievementRecord,
  WinStreakMilestoneRecord,
} from '../types/game';

export const STORAGE_SCHEMA_VERSION = 1;
export const WIN_STREAK_MILESTONE_TARGET = 8;
export const WIN_STREAK_MILESTONE_XP_REWARD = 250;
export const DAILY_SET_COMPLETION_XP_REWARD = 100;
export const ARCHIVE_CHAMBER_COMPLETION_XP_REWARD = 150;

export const STORAGE_KEYS = {
  SETTINGS: 'logic_quest_settings_v1',
  PROGRESS: 'logic_quest_progress_v1',
  RECORDS: 'logic_quest_records_v1',
  DAILY: 'logic_quest_daily_v1',
  ACHIEVEMENTS: 'logic_quest_achievements_v1',
  SESSION: 'logic_quest_session_v1',
  CAMPAIGN: 'logic_quest_campaign_v1',
} as const;

interface VersionedEnvelope<T> {
  schemaVersion: number;
  updatedAtIso: string;
  data: T;
}

export interface RecordsStoragePayload {
  records: GameCompletionRecord[];
  processedCompletionIds: string[];
}

export interface AchievementsStoragePayload {
  unlocked: UnlockedAchievementRecord[];
}

const recoveredKeysSet = new Set<string>();
const memoryStorageFallback = new Map<string, string>();

export function getRecoveredStorageKeys(): string[] {
  return Array.from(recoveredKeysSet);
}

export function getRawStorageItem(key: string): string | null {
  return getStorageItem(key);
}

export function setRawStorageItem(key: string, value: string): void {
  setStorageItem(key, value);
}

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memoryStorageFallback.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }
  memoryStorageFallback.set(key, value);
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  masterMuted: false,
  masterVolume: 80,
  musicEnabled: true,
  musicVolume: 45,
  soundEffectsEnabled: true,
  sfxVolume: 85,
  difficulty: 'easy',
  difficultyPreference: 'normal',
  categoryDifficultyOverrides: {},
  autoDifficultyState: createDefaultAutoDifficultyState('easy'),
  hintsEnabled: true,
  theme: 'dark',
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_deduction',
    title: 'First Axiom Solved',
    description: 'Complete your first puzzle in Logic Quest.',
    unlockCriteriaText: 'Solve 1 puzzle',
    xpReward: 50,
    targetValue: 1,
  },
  {
    id: 'axiom_adept_16',
    title: 'Sanctuary Scholar',
    description: 'Solve 16 distinct puzzles across the Sanctuary catalog.',
    unlockCriteriaText: 'Solve 16 distinct puzzles',
    xpReward: 100,
    targetValue: 16,
  },
  {
    id: 'grand_archivist_64',
    title: 'Master of All 64',
    description: 'Complete all 64 hand-crafted puzzles in the Sanctuary.',
    unlockCriteriaText: 'Solve all 64 catalog puzzles',
    xpReward: 500,
    targetValue: 64,
  },
  {
    id: 'octa_explorer',
    title: 'Octagonal Explorer',
    description: 'Solve at least one puzzle in all 8 logic categories.',
    unlockCriteriaText: 'Solve 1 puzzle in all 8 categories',
    xpReward: 150,
    targetValue: 8,
  },
  {
    id: 'hard_conqueror',
    title: 'Apex Tactician',
    description: 'Solve 8 distinct Hard difficulty puzzles.',
    unlockCriteriaText: 'Solve 8 Hard puzzles',
    xpReward: 150,
    targetValue: 8,
  },
  {
    id: 'hint_free_master',
    title: 'Unassisted Clarity',
    description: 'Solve 10 distinct puzzles without using any hints.',
    unlockCriteriaText: 'Solve 10 puzzles with 0 hints',
    xpReward: 100,
    targetValue: 10,
  },
  {
    id: 'pure_precision',
    title: 'Flawless Logic',
    description: 'Solve a Hard puzzle with 100% accuracy and 0 hints.',
    unlockCriteriaText: '100% accuracy on Hard · 0 Hints',
    xpReward: 125,
    targetValue: 1,
  },
  {
    id: 'win_streak_8',
    title: 'Octet Master',
    description: 'Reach an 8-puzzle consecutive Win Streak milestone.',
    unlockCriteriaText: 'Achieve 8 consecutive puzzle wins',
    xpReward: 150,
    targetValue: 8,
  },
  {
    id: 'daily_initiate',
    title: 'Synchronized Mind',
    description: 'Complete a Daily Challenge puzzle.',
    unlockCriteriaText: 'Complete 1 Daily Challenge',
    xpReward: 50,
    targetValue: 1,
  },
  {
    id: 'daily_triad',
    title: 'Solar Triad Complete',
    description: 'Complete all 3 Daily Challenges on the same calendar day.',
    unlockCriteriaText: 'Complete all 3 Daily Challenges in 1 day',
    xpReward: 150,
    targetValue: 3,
  },
  {
    id: 'archive_restorer',
    title: 'Keeper of the Archive',
    description: 'Restore a Sanctuary Chamber in The Lost Logic Archive.',
    unlockCriteriaText: 'Complete 1 Archive Chamber',
    xpReward: 100,
    targetValue: 1,
  },
  {
    id: 'prime_core_awakened',
    title: 'Prime Core Awakened',
    description: 'Restore all 4 Sanctuary Chambers in The Lost Logic Archive.',
    unlockCriteriaText: 'Complete all 4 Archive Chambers',
    xpReward: 350,
    targetValue: 4,
  },
];

export function createInitialCategoryStats(): Record<
  PuzzleCategory,
  CategoryProgressStats
> {
  const map = {} as Record<PuzzleCategory, CategoryProgressStats>;
  for (const category of PUZZLE_CATEGORIES_ORDER) {
    map[category] = {
      category,
      completedCount: 0,
      bestScore: null,
      bestAccuracyPercent: null,
      fastestTimeSeconds: null,
      totalXpEarned: 0,
      lastPlayedIso: null,
    };
  }
  return map;
}

export function createDefaultPlayerProgress(): PlayerGameProgress {
  return {
    level: 1,
    currentXp: 0,
    xpForNextLevel: getXpRequiredForLevel(1),
    totalXp: 0,
    totalPuzzlesCompleted: 0,
    bestOverallScore: null,
    averageAccuracyPercent: null,
    currentWinStreak: 0,
    bestWinStreak: 0,
    winsTowardNextMilestone: 0,
    winStreakMilestonesAchieved: 0,
    claimedWinStreakMilestoneIds: [],
    winStreakMilestoneHistory: [],
    claimedChamberRewardIds: [],
    claimedDailySetDates: [],
    claimedAchievementRewardIds: [],
    lastUpdatedIso: new Date().toISOString(),
    categoryStats: createInitialCategoryStats(),
  };
}

export function createDefaultDailyState(): DailyCompletionState {
  return {
    completedByDate: {},
  };
}

export function createDefaultRecordsPayload(): RecordsStoragePayload {
  return {
    records: [],
    processedCompletionIds: [],
  };
}

export function createDefaultAchievementsPayload(): AchievementsStoragePayload {
  return {
    unlocked: [],
  };
}

export function createDefaultQuickPlayConfig(
  difficulty: PuzzleDifficulty = 'easy'
): QuickPlayConfigState {
  return {
    categoryFilter: 'all',
    difficulty,
    selectionType: 'random',
    selectedPuzzleId: null,
    recentPuzzleIds: [],
    sessionPlayedPuzzleIds: [],
  };
}

export function createDefaultAppSession(): PersistedAppSessionState {
  return {
    currentRoute: 'home',
    activeHubTab: 'overview',
    activeCategory: 'number_sequences',
    collectionCategory: null,
    selectedPuzzleId: null,
    activeMode: 'quick_play',
    stageIndex: 1,
    lastResult: null,
    activeGameplaySession: null,
    quickPlayConfig: createDefaultQuickPlayConfig(),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDifficulty(val: unknown): val is PuzzleDifficulty {
  return val === 'easy' || val === 'normal' || val === 'hard';
}

function isValidDifficultyPreferenceOrLegacy(
  val: unknown
): val is DifficultyPreference | 'auto' | 'regular' {
  return (
    val === 'easy' ||
    val === 'normal' ||
    val === 'hard' ||
    val === 'auto' ||
    val === 'regular'
  );
}

function isValidTheme(val: unknown): val is ThemePreference {
  return val === 'dark' || val === 'light' || val === 'system';
}

function isValidCategory(val: unknown): val is PuzzleCategory {
  return (
    typeof val === 'string' &&
    PUZZLE_CATEGORIES_ORDER.includes(val as PuzzleCategory)
  );
}

function isValidRoute(val: unknown): val is ScreenRoute {
  return (
    val === 'home' ||
    val === 'quick_play' ||
    val === 'daily' ||
    val === 'collection' ||
    val === 'archive' ||
    val === 'gameplay' ||
    val === 'results' ||
    val === 'progress'
  );
}

function isValidGameMode(val: unknown): val is GameMode {
  return (
    val === 'quick_play' ||
    val === 'daily' ||
    val === 'archive' ||
    val === 'practice' ||
    val === 'collection_preview'
  );
}

function isValidHubTab(val: unknown): val is GameHubTab {
  return (
    val === 'overview' ||
    val === 'quick_play' ||
    val === 'daily' ||
    val === 'archive' ||
    val === 'practice'
  );
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readEnvelope<T>(
  key: string,
  validator: (raw: unknown) => T | null,
  fallbackFactory: () => T
): T {
  try {
    const rawStr = getStorageItem(key);
    if (!rawStr) {
      return fallbackFactory();
    }
    const parsed: unknown = JSON.parse(rawStr);
    if (!isObject(parsed)) {
      recoveredKeysSet.add(key);
      const fallback = fallbackFactory();
      writeEnvelope(key, fallback);
      return fallback;
    }

    // 1. Standard or older envelope with a `data` payload
    if ('data' in parsed) {
      const validated = validator(parsed.data);
      if (validated) {
        if (parsed.schemaVersion !== STORAGE_SCHEMA_VERSION) {
          // Safely upgrade older schemaVersion envelope without losing user progress
          writeEnvelope(key, validated);
        }
        return validated;
      }
      recoveredKeysSet.add(key);
      const fallback = fallbackFactory();
      writeEnvelope(key, fallback);
      return fallback;
    }

    // 2. Pre-envelope legacy raw object migration (if validator accepts the object directly)
    const migratedLegacy = validator(parsed);
    if (migratedLegacy) {
      writeEnvelope(key, migratedLegacy);
      return migratedLegacy;
    }

    recoveredKeysSet.add(key);
    const fallback = fallbackFactory();
    writeEnvelope(key, fallback);
    return fallback;
  } catch {
    recoveredKeysSet.add(key);
    const fallback = fallbackFactory();
    writeEnvelope(key, fallback);
    return fallback;
  }
}

function writeEnvelope<T>(key: string, data: T): void {
  try {
    const envelope: VersionedEnvelope<T> = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      updatedAtIso: new Date().toISOString(),
      data,
    };
    setStorageItem(key, JSON.stringify(envelope));
  } catch {
    // Graceful no-op if storage quota is exceeded
  }
}

// --- 1. Settings Storage (with L1-L2.5 backwards-compatible migration) ---

function validateAutoDifficultyState(
  raw: unknown,
  fallbackDifficulty: PuzzleDifficulty
): AutoDifficultyState {
  if (
    isObject(raw) &&
    isValidDifficulty(raw.currentEffectiveDifficulty) &&
    typeof raw.consecutiveSuccesses === 'number' &&
    typeof raw.consecutiveFailures === 'number'
  ) {
    const recentHistory = Array.isArray(raw.recentHistory)
      ? raw.recentHistory
          .filter((d): d is PuzzleDifficulty => isValidDifficulty(d))
          .slice(-12)
      : [raw.currentEffectiveDifficulty];

    return {
      currentEffectiveDifficulty: raw.currentEffectiveDifficulty,
      consecutiveSuccesses: Math.max(0, Math.floor(raw.consecutiveSuccesses)),
      consecutiveFailures: Math.max(0, Math.floor(raw.consecutiveFailures)),
      totalSolvedInAuto:
        typeof raw.totalSolvedInAuto === 'number'
          ? Math.max(0, Math.floor(raw.totalSolvedInAuto))
          : 0,
      lastAdjustmentReason:
        typeof raw.lastAdjustmentReason === 'string'
          ? raw.lastAdjustmentReason
          : 'Restored adaptive state.',
      recentHistory,
    };
  }
  return createDefaultAutoDifficultyState(fallbackDifficulty);
}

function validateCategoryDifficultyOverrides(
  raw: unknown
): Partial<Record<PuzzleCategory, DifficultyPreference>> {
  if (!isObject(raw)) return {};
  const result: Partial<Record<PuzzleCategory, DifficultyPreference>> = {};
  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    const val = raw[cat];
    if (isValidDifficultyPreferenceOrLegacy(val)) {
      result[cat] = normalizeDifficultyPreference(val, 'normal');
    }
  }
  return result;
}

function validateSettings(raw: unknown): GameSettings | null {
  if (!isObject(raw)) return null;
  if (!isValidDifficulty(raw.difficulty)) return null;
  if (!isValidTheme(raw.theme)) return null;

  const musicEnabled =
    typeof raw.musicEnabled === 'boolean'
      ? raw.musicEnabled
      : DEFAULT_GAME_SETTINGS.musicEnabled;
  const soundEffectsEnabled =
    typeof raw.soundEffectsEnabled === 'boolean'
      ? raw.soundEffectsEnabled
      : DEFAULT_GAME_SETTINGS.soundEffectsEnabled;
  const hintsEnabled =
    typeof raw.hintsEnabled === 'boolean'
      ? raw.hintsEnabled
      : DEFAULT_GAME_SETTINGS.hintsEnabled;

  const difficultyPreference: DifficultyPreference =
    isValidDifficultyPreferenceOrLegacy(raw.difficultyPreference)
      ? normalizeDifficultyPreference(raw.difficultyPreference, raw.difficulty)
      : raw.difficulty;

  const autoDifficultyState = validateAutoDifficultyState(
    raw.autoDifficultyState,
    difficultyPreference === 'normal' ? 'easy' : raw.difficulty
  );

  const categoryDifficultyOverrides = validateCategoryDifficultyOverrides(
    raw.categoryDifficultyOverrides
  );

  const resolvedDifficulty = resolveEffectiveDifficulty(
    difficultyPreference,
    autoDifficultyState,
    raw.difficulty
  );

  return {
    masterMuted:
      typeof raw.masterMuted === 'boolean'
        ? raw.masterMuted
        : Boolean(DEFAULT_GAME_SETTINGS.masterMuted),
    masterVolume: clampVolume(
      raw.masterVolume,
      DEFAULT_GAME_SETTINGS.masterVolume ?? 80
    ),
    musicEnabled,
    musicVolume: clampVolume(
      raw.musicVolume,
      DEFAULT_GAME_SETTINGS.musicVolume ?? 45
    ),
    soundEffectsEnabled,
    sfxVolume: clampVolume(
      raw.sfxVolume,
      DEFAULT_GAME_SETTINGS.sfxVolume ?? 85
    ),
    difficulty: resolvedDifficulty,
    difficultyPreference,
    categoryDifficultyOverrides,
    autoDifficultyState,
    hintsEnabled,
    theme: raw.theme,
  };
}

export function loadSettings(): GameSettings {
  const loaded = readEnvelope(
    STORAGE_KEYS.SETTINGS,
    validateSettings,
    () => ({
      ...DEFAULT_GAME_SETTINGS,
      categoryDifficultyOverrides: {},
      autoDifficultyState: createDefaultAutoDifficultyState('easy'),
    })
  );

  // If raw stored JSON contained legacy 'auto' or 'regular' values, persist the migrated envelope cleanly
  const rawStr = getStorageItem(STORAGE_KEYS.SETTINGS);
  if (rawStr && (rawStr.includes('"auto"') || rawStr.includes('"regular"'))) {
    writeEnvelope(STORAGE_KEYS.SETTINGS, loaded);
  }

  return loaded;
}

function persistSettingsEnvelope(settings: GameSettings): void {
  const normalizedPreference = normalizeDifficultyPreference(
    settings.difficultyPreference,
    settings.difficulty
  );
  const autoState =
    settings.autoDifficultyState ?? createDefaultAutoDifficultyState('easy');
  const effectiveDifficulty = resolveEffectiveDifficulty(
    normalizedPreference,
    autoState,
    settings.difficulty
  );
  const normalizedOverrides = validateCategoryDifficultyOverrides(
    settings.categoryDifficultyOverrides
  );

  writeEnvelope(STORAGE_KEYS.SETTINGS, {
    ...settings,
    difficulty: effectiveDifficulty,
    difficultyPreference: normalizedPreference,
    categoryDifficultyOverrides: normalizedOverrides,
    autoDifficultyState: autoState,
  });
}

export function saveSettings(settings: GameSettings): void {
  const existingRawStr = getStorageItem(STORAGE_KEYS.SETTINGS);
  let previousDifficulty: PuzzleDifficulty | null = null;
  let previousPreference: DifficultyPreference | null = null;
  if (existingRawStr) {
    try {
      const parsed = JSON.parse(existingRawStr);
      if (isObject(parsed) && isObject(parsed.data)) {
        if (isValidDifficulty(parsed.data.difficulty)) {
          previousDifficulty = parsed.data.difficulty;
        }
        if (
          isValidDifficultyPreferenceOrLegacy(parsed.data.difficultyPreference)
        ) {
          previousPreference = normalizeDifficultyPreference(
            parsed.data.difficultyPreference,
            previousDifficulty ?? 'normal'
          );
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  let normalizedPreference: DifficultyPreference =
    settings.difficultyPreference !== undefined
      ? normalizeDifficultyPreference(
          settings.difficultyPreference,
          settings.difficulty
        )
      : normalizeDifficultyPreference(settings.difficulty, 'normal');

  // Backwards compatibility: if a caller updated `settings.difficulty` directly (e.g. `{ ...loadSettings(), difficulty: 'hard' }`)
  // without changing `difficultyPreference`, sync `difficultyPreference` to `settings.difficulty`.
  if (
    previousDifficulty !== null &&
    settings.difficulty !== previousDifficulty &&
    normalizedPreference === (previousPreference ?? previousDifficulty)
  ) {
    normalizedPreference = settings.difficulty;
  }

  persistSettingsEnvelope({
    ...settings,
    difficultyPreference: normalizedPreference,
  });
}

/**
 * Updates the global difficulty preference ('easy' | 'normal' | 'hard', migrating 'auto' -> 'normal')
 * while keeping `settings.difficulty` synced to the resolved effective difficulty.
 * Does NOT overwrite category-specific overrides.
 */
export function setGlobalDifficultyPreference(
  preference: DifficultyPreference | 'auto' | 'regular'
): GameSettings {
  const current = loadSettings();
  const normalizedPref = normalizeDifficultyPreference(
    preference,
    current.difficulty
  );
  const autoState =
    current.autoDifficultyState ?? createDefaultAutoDifficultyState('easy');
  const effectiveDifficulty = resolveEffectiveDifficulty(
    normalizedPref,
    autoState,
    current.difficulty
  );
  const updated: GameSettings = {
    ...current,
    difficultyPreference: normalizedPref,
    difficulty: effectiveDifficulty,
    autoDifficultyState: autoState,
  };
  persistSettingsEnvelope(updated);
  return loadSettings();
}

/**
 * Sets or clears (`null`) a Puzzle Library category's difficulty override.
 * Passing `null` removes the override so the category inherits the global difficulty setting.
 */
export function setCategoryDifficultyPreference(
  category: PuzzleCategory,
  preference: DifficultyPreference | 'auto' | 'regular' | null
): GameSettings {
  const current = loadSettings();
  const nextOverrides: Partial<Record<PuzzleCategory, DifficultyPreference>> = {
    ...(current.categoryDifficultyOverrides ?? {}),
  };
  if (preference === null) {
    delete nextOverrides[category];
  } else {
    nextOverrides[category] = normalizeDifficultyPreference(
      preference,
      'normal'
    );
  }
  const updated: GameSettings = {
    ...current,
    categoryDifficultyOverrides: nextOverrides,
  };
  persistSettingsEnvelope(updated);
  return loadSettings();
}

/**
 * Applies optional NEX11 host launch preferences (theme, audio, difficulty, hints)
 * to Logic Quest's settings while preserving existing player progress and category overrides.
 */
export function applyNex11LaunchPreferencesToSettings(
  launchConfig?: Nex11LaunchConfig | null
): GameSettings {
  const current = loadSettings();
  if (!launchConfig) return current;

  const next: GameSettings = { ...current };

  if (launchConfig.themePreference && isValidTheme(launchConfig.themePreference)) {
    next.theme = launchConfig.themePreference;
  }

  if (launchConfig.audioPreferences) {
    const audio = launchConfig.audioPreferences;
    if (typeof audio.masterMuted === 'boolean') {
      next.masterMuted = audio.masterMuted;
    }
    if (typeof audio.masterVolume === 'number') {
      next.masterVolume = clampVolume(audio.masterVolume, next.masterVolume ?? 80);
    }
    if (typeof audio.musicEnabled === 'boolean') {
      next.musicEnabled = audio.musicEnabled;
    }
    if (typeof audio.musicVolume === 'number') {
      next.musicVolume = clampVolume(audio.musicVolume, next.musicVolume ?? 45);
    }
    if (typeof audio.soundEffectsEnabled === 'boolean') {
      next.soundEffectsEnabled = audio.soundEffectsEnabled;
    }
    if (typeof audio.sfxVolume === 'number') {
      next.sfxVolume = clampVolume(audio.sfxVolume, next.sfxVolume ?? 85);
    }
  }

  if (
    launchConfig.difficultyPreference &&
    isValidDifficultyPreferenceOrLegacy(launchConfig.difficultyPreference)
  ) {
    const normPref = normalizeDifficultyPreference(
      launchConfig.difficultyPreference,
      next.difficulty
    );
    next.difficultyPreference = normPref;
    next.difficulty = resolveEffectiveDifficulty(
      normPref,
      next.autoDifficultyState,
      next.difficulty
    );
  }

  if (typeof launchConfig.hintsEnabled === 'boolean') {
    next.hintsEnabled = launchConfig.hintsEnabled;
  }

  persistSettingsEnvelope(next);
  return loadSettings();
}

// --- 2. Player Progression Storage ---

function validateProgress(raw: unknown): PlayerGameProgress | null {
  if (!isObject(raw)) return null;
  if (typeof raw.level !== 'number' || raw.level < 1) return null;
  if (typeof raw.currentXp !== 'number' || raw.currentXp < 0) return null;
  if (typeof raw.totalXp !== 'number' || raw.totalXp < 0) return null;
  if (
    typeof raw.totalPuzzlesCompleted !== 'number' ||
    raw.totalPuzzlesCompleted < 0
  ) {
    return null;
  }

  const base = createDefaultPlayerProgress();
  const rawCatStats = isObject(raw.categoryStats) ? raw.categoryStats : {};

  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    const item = rawCatStats[cat];
    if (isObject(item) && typeof item.completedCount === 'number') {
      base.categoryStats[cat] = {
        category: cat,
        completedCount: Math.max(0, item.completedCount),
        bestScore: typeof item.bestScore === 'number' ? item.bestScore : null,
        bestAccuracyPercent:
          typeof item.bestAccuracyPercent === 'number'
            ? item.bestAccuracyPercent
            : null,
        fastestTimeSeconds:
          typeof item.fastestTimeSeconds === 'number'
            ? item.fastestTimeSeconds
            : null,
        totalXpEarned:
          typeof item.totalXpEarned === 'number'
            ? Math.max(0, item.totalXpEarned)
            : 0,
        lastPlayedIso:
          typeof item.lastPlayedIso === 'string' ? item.lastPlayedIso : null,
      };
    }
  }

  const currentWinStreak =
    typeof raw.currentWinStreak === 'number'
      ? Math.max(0, Math.floor(raw.currentWinStreak))
      : 0;
  const bestWinStreak =
    typeof raw.bestWinStreak === 'number'
      ? Math.max(currentWinStreak, Math.floor(raw.bestWinStreak))
      : currentWinStreak;
  const winsTowardNextMilestone =
    typeof raw.winsTowardNextMilestone === 'number'
      ? Math.min(
          WIN_STREAK_MILESTONE_TARGET,
          Math.max(0, Math.floor(raw.winsTowardNextMilestone))
        )
      : currentWinStreak % WIN_STREAK_MILESTONE_TARGET;
  const winStreakMilestonesAchieved =
    typeof raw.winStreakMilestonesAchieved === 'number'
      ? Math.max(0, Math.floor(raw.winStreakMilestonesAchieved))
      : Math.floor(currentWinStreak / WIN_STREAK_MILESTONE_TARGET);
  const claimedWinStreakMilestoneIds = Array.isArray(
    raw.claimedWinStreakMilestoneIds
  )
    ? raw.claimedWinStreakMilestoneIds.filter(
        (id): id is string => typeof id === 'string'
      )
    : [];

  const winStreakMilestoneHistory: WinStreakMilestoneRecord[] = Array.isArray(
    raw.winStreakMilestoneHistory
  )
    ? raw.winStreakMilestoneHistory.filter(
        (m): m is WinStreakMilestoneRecord =>
          isObject(m) &&
          typeof m.milestoneId === 'string' &&
          typeof m.milestoneIndex === 'number' &&
          typeof m.xpAwarded === 'number' &&
          typeof m.achievedAtIso === 'string'
      )
    : [];

  const claimedChamberRewardIds = Array.isArray(raw.claimedChamberRewardIds)
    ? raw.claimedChamberRewardIds.filter(
        (id): id is string => typeof id === 'string'
      )
    : [];

  const claimedDailySetDates = Array.isArray(raw.claimedDailySetDates)
    ? raw.claimedDailySetDates.filter(
        (d): d is string => typeof d === 'string'
      )
    : [];

  const claimedAchievementRewardIds = Array.isArray(
    raw.claimedAchievementRewardIds
  )
    ? raw.claimedAchievementRewardIds.filter(
        (id): id is string => typeof id === 'string'
      )
    : [];

  return {
    level: Math.floor(raw.level),
    currentXp: Math.floor(raw.currentXp),
    xpForNextLevel: getXpRequiredForLevel(Math.floor(raw.level)),
    totalXp: Math.floor(raw.totalXp),
    totalPuzzlesCompleted: Math.floor(raw.totalPuzzlesCompleted),
    bestOverallScore:
      typeof raw.bestOverallScore === 'number' ? raw.bestOverallScore : null,
    averageAccuracyPercent:
      typeof raw.averageAccuracyPercent === 'number'
        ? raw.averageAccuracyPercent
        : null,
    currentWinStreak,
    bestWinStreak,
    winsTowardNextMilestone,
    winStreakMilestonesAchieved,
    claimedWinStreakMilestoneIds,
    winStreakMilestoneHistory,
    claimedChamberRewardIds,
    claimedDailySetDates,
    claimedAchievementRewardIds,
    lastUpdatedIso:
      typeof raw.lastUpdatedIso === 'string'
        ? raw.lastUpdatedIso
        : new Date().toISOString(),
    categoryStats: base.categoryStats,
  };
}

export function loadPlayerProgress(): PlayerGameProgress {
  return readEnvelope(
    STORAGE_KEYS.PROGRESS,
    validateProgress,
    createDefaultPlayerProgress
  );
}

export function savePlayerProgress(progress: PlayerGameProgress): void {
  writeEnvelope(STORAGE_KEYS.PROGRESS, progress);
}

// --- 3. Puzzle Completion Records Storage ---

function validateRecords(raw: unknown): RecordsStoragePayload | null {
  if (!isObject(raw)) return null;
  if (
    !Array.isArray(raw.records) ||
    !Array.isArray(raw.processedCompletionIds)
  ) {
    return null;
  }
  return {
    records: raw.records.filter(
      (r): r is GameCompletionRecord =>
        isObject(r) &&
        typeof r.completionId === 'string' &&
        typeof r.puzzleId === 'string' &&
        typeof r.score === 'number'
    ),
    processedCompletionIds: raw.processedCompletionIds.filter(
      (id): id is string => typeof id === 'string'
    ),
  };
}

export function loadCompletionRecords(): RecordsStoragePayload {
  return readEnvelope(
    STORAGE_KEYS.RECORDS,
    validateRecords,
    createDefaultRecordsPayload
  );
}

// --- 4. Daily Completion Storage ---

function validateDailyState(raw: unknown): DailyCompletionState | null {
  if (!isObject(raw) || !isObject(raw.completedByDate)) return null;
  return {
    completedByDate:
      raw.completedByDate as DailyCompletionState['completedByDate'],
  };
}

export function loadDailyCompletionState(): DailyCompletionState {
  return readEnvelope(
    STORAGE_KEYS.DAILY,
    validateDailyState,
    createDefaultDailyState
  );
}

// --- 5. Achievements Storage & Live Progress Evaluation ---

function validateAchievements(raw: unknown): AchievementsStoragePayload | null {
  if (!isObject(raw) || !Array.isArray(raw.unlocked)) return null;
  return {
    unlocked: raw.unlocked.filter(
      (u): u is UnlockedAchievementRecord =>
        isObject(u) &&
        typeof u.achievementId === 'string' &&
        typeof u.unlockedAtIso === 'string'
    ),
  };
}

export function loadAchievementsState(): AchievementsStoragePayload {
  return readEnvelope(
    STORAGE_KEYS.ACHIEVEMENTS,
    validateAchievements,
    createDefaultAchievementsPayload
  );
}

/**
 * Computes live progress (`currentValue / targetValue`, `progressPercent`, and unlock status)
 * for all 12 achievements across the Sanctuary.
 */
export function evaluateAchievementProgress(params?: {
  progress?: PlayerGameProgress;
  records?: GameCompletionRecord[];
  dailyState?: DailyCompletionState;
  campaignProgress?: CampaignProgressState;
  unlocked?: UnlockedAchievementRecord[];
}): AchievementProgressItem[] {
  const progress = params?.progress ?? loadPlayerProgress();
  const records = params?.records ?? loadCompletionRecords().records;
  const dailyState = params?.dailyState ?? loadDailyCompletionState();
  const campaignProgress = params?.campaignProgress ?? loadCampaignProgress();
  const unlocked = params?.unlocked ?? loadAchievementsState().unlocked;

  const unlockedMap = new Map<string, UnlockedAchievementRecord>();
  for (const item of unlocked) {
    unlockedMap.set(item.achievementId, item);
  }

  // Distinct catalog puzzles solved
  const catalogIds = new Set(PUZZLE_CATALOG.map((p) => p.id));
  const distinctCatalogSolvedIds = new Set<string>();
  const distinctHardSolvedIds = new Set<string>();
  const distinctHintFreeSolvedIds = new Set<string>();
  let hasFlawlessHardSolve = false;

  for (const r of records) {
    if (catalogIds.has(r.puzzleId)) {
      distinctCatalogSolvedIds.add(r.puzzleId);
    }
    if (r.difficulty === 'hard') {
      distinctHardSolvedIds.add(r.puzzleId);
    }
    if (typeof r.hintsUsed === 'number' && r.hintsUsed === 0) {
      distinctHintFreeSolvedIds.add(r.puzzleId);
      if (r.difficulty === 'hard' && r.accuracyPercent === 100) {
        hasFlawlessHardSolve = true;
      }
    }
  }

  const distinctSolvedCount = Math.max(
    distinctCatalogSolvedIds.size,
    Math.min(64, progress.totalPuzzlesCompleted)
  );

  // Categories with >= 1 solved puzzle
  const solvedCategoriesCount = PUZZLE_CATEGORIES_ORDER.filter(
    (c) => (progress.categoryStats[c]?.completedCount ?? 0) >= 1
  ).length;

  // Daily completions
  let totalDailySolved = 0;
  let maxDailyInSingleDate = 0;
  for (const dateKey of Object.keys(dailyState.completedByDate)) {
    const map = getDailyDateCompletionMap(dailyState, dateKey);
    const countForDate = Object.keys(map).length;
    totalDailySolved += countForDate;
    if (countForDate > maxDailyInSingleDate) {
      maxDailyInSingleDate = countForDate;
    }
  }
  const dailyRecordsCount = records.filter((r) => r.mode === 'daily').length;
  totalDailySolved = Math.max(totalDailySolved, dailyRecordsCount);

  const completedChambersCount = campaignProgress.completedChamberIds.length;
  const streakProgressFor8 =
    progress.winStreakMilestonesAchieved >= 1 ||
    progress.bestWinStreak >= WIN_STREAK_MILESTONE_TARGET
      ? WIN_STREAK_MILESTONE_TARGET
      : Math.min(WIN_STREAK_MILESTONE_TARGET, progress.bestWinStreak);

  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const unlockedRecord = unlockedMap.get(def.id);
    const isUnlocked = Boolean(unlockedRecord);
    const target = def.targetValue ?? 1;
    let rawValue = 0;

    switch (def.id) {
      case 'first_deduction':
        rawValue = Math.min(1, progress.totalPuzzlesCompleted);
        break;
      case 'axiom_adept_16':
        rawValue = Math.min(16, distinctSolvedCount);
        break;
      case 'grand_archivist_64':
        rawValue = Math.min(64, distinctCatalogSolvedIds.size);
        break;
      case 'octa_explorer':
        rawValue = Math.min(8, solvedCategoriesCount);
        break;
      case 'hard_conqueror':
        rawValue = Math.min(8, distinctHardSolvedIds.size);
        break;
      case 'hint_free_master':
        rawValue = Math.min(10, distinctHintFreeSolvedIds.size);
        break;
      case 'pure_precision':
        rawValue = hasFlawlessHardSolve ? 1 : 0;
        break;
      case 'win_streak_8':
        rawValue = streakProgressFor8;
        break;
      case 'daily_initiate':
        rawValue = Math.min(1, totalDailySolved);
        break;
      case 'daily_triad':
        rawValue = Math.min(3, maxDailyInSingleDate);
        break;
      case 'archive_restorer':
        rawValue = Math.min(1, completedChambersCount);
        break;
      case 'prime_core_awakened':
        rawValue = Math.min(ARCHIVE_CHAMBERS.length, completedChambersCount);
        break;
      default:
        rawValue = isUnlocked ? target : 0;
        break;
    }

    const currentValue = isUnlocked ? target : Math.min(target, rawValue);
    const progressPercent = Math.min(
      100,
      Math.round((currentValue / Math.max(1, target)) * 100)
    );

    return {
      definition: def,
      isUnlocked,
      unlockedAtIso: unlockedRecord?.unlockedAtIso ?? null,
      currentValue,
      targetValue: target,
      progressPercent,
    };
  });
}

// --- 5B. Campaign ("The Lost Logic Archive") Progress Storage ---

function validateCampaignProgress(raw: unknown): CampaignProgressState | null {
  if (!isObject(raw)) return null;
  if (typeof raw.activeChamberId !== 'string') return null;
  if (!Array.isArray(raw.completedChamberIds)) return null;
  if (!Array.isArray(raw.unlockedDiscoveryIds)) return null;
  if (!Array.isArray(raw.unlockedRewardIds)) return null;

  const discoveries: CampaignDiscoveryRecord[] = Array.isArray(raw.discoveries)
    ? raw.discoveries.filter(
        (d): d is CampaignDiscoveryRecord =>
          isObject(d) &&
          typeof d.discoveryId === 'string' &&
          typeof d.chamberId === 'string' &&
          typeof d.unlockedAtIso === 'string'
      )
    : [];

  const chamberCompletions: CampaignCompletionRecord[] = Array.isArray(
    raw.chamberCompletions
  )
    ? raw.chamberCompletions.filter(
        (c): c is CampaignCompletionRecord =>
          isObject(c) &&
          typeof c.chamberId === 'string' &&
          typeof c.completedAtIso === 'string'
      )
    : [];

  return {
    activeChamberId: raw.activeChamberId,
    completedChamberIds: raw.completedChamberIds.filter(
      (id): id is string => typeof id === 'string'
    ),
    unlockedDiscoveryIds: raw.unlockedDiscoveryIds.filter(
      (id): id is string => typeof id === 'string'
    ),
    unlockedRewardIds: raw.unlockedRewardIds.filter(
      (id): id is string => typeof id === 'string'
    ),
    discoveries,
    chamberCompletions,
    updatedAtIso:
      typeof raw.updatedAtIso === 'string'
        ? raw.updatedAtIso
        : new Date().toISOString(),
  };
}

export function loadCampaignProgress(): CampaignProgressState {
  const loaded = readEnvelope(
    STORAGE_KEYS.CAMPAIGN,
    validateCampaignProgress,
    createDefaultCampaignProgressState
  );
  const records = loadCompletionRecords().records;
  return syncCampaignProgressWithRecords(loaded, records, loaded.updatedAtIso);
}

export function saveCampaignProgress(
  campaignProgress: CampaignProgressState
): void {
  writeEnvelope(STORAGE_KEYS.CAMPAIGN, campaignProgress);
}

/**
 * Persists a validated puzzle completion, updates XP/level, Win Streak & 8-win milestones,
 * category stats, 3-challenge daily completion state + 3/3 daily triad bonus,
 * campaign chamber progression + chamber completion bonus, and evaluates all 12 achievements
 * with one-time achievement XP rewards. Protected against duplicate completion IDs and replays.
 */
export function recordPuzzleCompletion(
  result: PuzzleResult,
  dailyDescriptor?: DailyPuzzleDescriptor
): {
  progress: PlayerGameProgress;
  recordsPayload: RecordsStoragePayload;
  dailyState: DailyCompletionState;
  unlockedAchievements: UnlockedAchievementRecord[];
  campaignProgress: CampaignProgressState;
} {
  const progress = loadPlayerProgress();
  const recordsPayload = loadCompletionRecords();
  const dailyState = loadDailyCompletionState();
  const achievementsPayload = loadAchievementsState();
  const currentCampaign = loadCampaignProgress();

  // Duplicate reward protection by completionId
  if (recordsPayload.processedCompletionIds.includes(result.completionId)) {
    return {
      progress,
      recordsPayload,
      dailyState,
      unlockedAchievements: achievementsPayload.unlocked,
      campaignProgress: currentCampaign,
    };
  }

  const previousLevel = progress.level;

  // Check whether this puzzle was already solved prior to this completion record
  const wasPuzzleAlreadySolved = isCatalogPuzzleSolved(
    result.puzzleId,
    recordsPayload.records
  );

  // Check whether this specific Daily Challenge (by dailyId) for this calendar date was already claimed
  const dailyDateKey =
    dailyDescriptor?.dateKey ??
    dailyDescriptor?.utcDateString ??
    result.modeMetadata?.dailyDateKey;
  const dailyIdKey =
    dailyDescriptor?.dailyId ?? result.modeMetadata?.dailyId;

  const existingDateMap = dailyDateKey
    ? getDailyDateCompletionMap(dailyState, dailyDateKey)
    : {};
  const isDailyChallengeAlreadyCompleted = Boolean(
    result.mode === 'daily' &&
      dailyDateKey &&
      dailyIdKey &&
      existingDateMap[dailyIdKey]
  );

  // Replaying an already completed puzzle must not increment Win Streak, solved counts, or award duplicate XP
  const isReplayOfCompletedPuzzle =
    Boolean(result.isReplayOfSolvedPuzzle) ||
    wasPuzzleAlreadySolved ||
    Boolean(result.dailyAlreadyClaimed) ||
    isDailyChallengeAlreadyCompleted;

  const isDuplicatePracticeReplay =
    Boolean(result.isReplayOfSolvedPuzzle) ||
    (result.mode === 'practice' && wasPuzzleAlreadySolved);
  const isDuplicateDailyReplay =
    Boolean(result.dailyAlreadyClaimed) || isDailyChallengeAlreadyCompleted;

  let milestoneBonusXp = 0;
  let reachedWinStreakMilestone = false;

  if (!progress.winStreakMilestoneHistory) {
    progress.winStreakMilestoneHistory = [];
  }
  if (!progress.claimedChamberRewardIds) {
    progress.claimedChamberRewardIds = [];
  }
  if (!progress.claimedDailySetDates) {
    progress.claimedDailySetDates = [];
  }
  if (!progress.claimedAchievementRewardIds) {
    progress.claimedAchievementRewardIds = [];
  }

  // Update Win Streak on valid non-replay completions
  if (!isReplayOfCompletedPuzzle) {
    progress.currentWinStreak += 1;
    progress.bestWinStreak = Math.max(
      progress.bestWinStreak,
      progress.currentWinStreak
    );

    const nextCycleStep = progress.winsTowardNextMilestone + 1;
    if (nextCycleStep >= WIN_STREAK_MILESTONE_TARGET) {
      const milestoneClaimId = `win_streak_milestone_${result.completionId}`;
      if (!progress.claimedWinStreakMilestoneIds.includes(milestoneClaimId)) {
        progress.claimedWinStreakMilestoneIds.push(milestoneClaimId);
        progress.winStreakMilestonesAchieved += 1;
        milestoneBonusXp = WIN_STREAK_MILESTONE_XP_REWARD;
        reachedWinStreakMilestone = true;
        progress.winStreakMilestoneHistory.unshift({
          milestoneId: milestoneClaimId,
          milestoneIndex: progress.winStreakMilestonesAchieved,
          streakLengthAtMilestone: progress.currentWinStreak,
          xpAwarded: milestoneBonusXp,
          achievedAtIso: result.completedAtIso,
          triggerPuzzleId: result.puzzleId,
        });
      }
      // Start the next 8-win streak cycle
      progress.winsTowardNextMilestone = 0;
    } else {
      progress.winsTowardNextMilestone = nextCycleStep;
    }
  }

  const baseEffectiveXp =
    isDuplicatePracticeReplay || isDuplicateDailyReplay || wasPuzzleAlreadySolved
      ? 0
      : Math.max(0, result.xpEarned);

  // Update Daily Challenge Completion if applicable (supports 3 independent records per date)
  let dailySetBonusXp = 0;
  let completedDailySetToday = false;

  if (
    result.mode === 'daily' &&
    dailyDescriptor &&
    dailyDateKey &&
    !existingDateMap[dailyDescriptor.dailyId]
  ) {
    const updatedMap = {
      ...existingDateMap,
      [dailyDescriptor.dailyId]: {
        dailyId: dailyDescriptor.dailyId,
        challengeNumber: dailyDescriptor.challengeNumber ?? 1,
        completionId: result.completionId,
        completedAtIso: result.completedAtIso,
        score: result.score,
        difficulty: result.difficulty,
        puzzleId: result.puzzleId,
        puzzleTitle: result.puzzleTitle,
        category: result.category,
        accuracyPercent: result.accuracyPercent,
        completionTimeSeconds: result.completionTimeSeconds,
        hintsUsed: result.hintsUsed,
        xpEarned: baseEffectiveXp,
      },
    };
    dailyState.completedByDate[dailyDateKey] = updatedMap;
    writeEnvelope(STORAGE_KEYS.DAILY, dailyState);

    if (
      Object.keys(updatedMap).length >= 3 &&
      !progress.claimedDailySetDates.includes(dailyDateKey)
    ) {
      progress.claimedDailySetDates.push(dailyDateKey);
      dailySetBonusXp = DAILY_SET_COMPLETION_XP_REWARD;
      completedDailySetToday = true;
    }
  }

  // Tentatively push record to sync Campaign Progress and evaluate achievements
  recordsPayload.processedCompletionIds.push(result.completionId);
  const newRecord: GameCompletionRecord = {
    completionId: result.completionId,
    puzzleId: result.puzzleId,
    category: result.category,
    difficulty: result.difficulty,
    mode: result.mode,
    score: result.score,
    accuracyPercent: result.accuracyPercent,
    completionTimeSeconds: result.completionTimeSeconds,
    hintsUsed: result.hintsUsed,
    attemptCount: result.attemptCount,
    xpAwarded: baseEffectiveXp, // Updated below with total effective XP
    completedAtIso: result.completedAtIso,
  };
  recordsPayload.records.unshift(newRecord);

  // Sync Campaign Progress with updated completion records
  const previousCompletedChambers = new Set(currentCampaign.completedChamberIds);
  const campaignProgress = syncCampaignProgressWithRecords(
    currentCampaign,
    recordsPayload.records,
    result.completedAtIso
  );
  saveCampaignProgress(campaignProgress);

  // Check for newly completed chambers & award one-time chamber completion bonus
  let archiveChamberBonusXp = 0;
  const newlyCompletedChamberIds: string[] = [];
  for (const chamberId of campaignProgress.completedChamberIds) {
    if (
      !previousCompletedChambers.has(chamberId) &&
      !progress.claimedChamberRewardIds.includes(chamberId)
    ) {
      progress.claimedChamberRewardIds.push(chamberId);
      newlyCompletedChamberIds.push(chamberId);
      archiveChamberBonusXp += ARCHIVE_CHAMBER_COMPLETION_XP_REWARD;
    }
  }

  // Update overall completion count & category stats before evaluating achievements
  const shouldIncrementCompletionCount = !isReplayOfCompletedPuzzle;
  const prevTotal = progress.totalPuzzlesCompleted;
  if (shouldIncrementCompletionCount) {
    progress.totalPuzzlesCompleted += 1;
  }
  progress.bestOverallScore =
    progress.bestOverallScore === null
      ? result.score
      : Math.max(progress.bestOverallScore, result.score);

  if (shouldIncrementCompletionCount) {
    const prevAvg = progress.averageAccuracyPercent ?? result.accuracyPercent;
    progress.averageAccuracyPercent = Math.round(
      (prevAvg * prevTotal + result.accuracyPercent) /
        Math.max(1, progress.totalPuzzlesCompleted)
    );
  }

  const catStat = progress.categoryStats[result.category];
  if (catStat) {
    if (shouldIncrementCompletionCount) {
      catStat.completedCount += 1;
    }
    catStat.bestScore =
      catStat.bestScore === null
        ? result.score
        : Math.max(catStat.bestScore, result.score);
    catStat.bestAccuracyPercent =
      catStat.bestAccuracyPercent === null
        ? result.accuracyPercent
        : Math.max(catStat.bestAccuracyPercent, result.accuracyPercent);
    catStat.fastestTimeSeconds =
      catStat.fastestTimeSeconds === null
        ? result.completionTimeSeconds
        : Math.min(catStat.fastestTimeSeconds, result.completionTimeSeconds);
    catStat.lastPlayedIso = result.completedAtIso;
  }

  // Evaluate all 12 Achievements using live progress evaluator
  const evaluatedAchievements = evaluateAchievementProgress({
    progress,
    records: recordsPayload.records,
    dailyState,
    campaignProgress,
    unlocked: achievementsPayload.unlocked,
  });

  const unlockedIds = new Set(
    achievementsPayload.unlocked.map((u) => u.achievementId)
  );
  const newlyUnlockedAchievementIds: string[] = [];
  let achievementBonusXp = 0;

  for (const item of evaluatedAchievements) {
    const def = item.definition;
    const target = item.targetValue;
    const isNowMet =
      item.currentValue >= target ||
      (def.id === 'pure_precision' &&
        result.difficulty === 'hard' &&
        result.accuracyPercent === 100 &&
        result.hintsUsed === 0);

    if (isNowMet && !unlockedIds.has(def.id)) {
      unlockedIds.add(def.id);
      newlyUnlockedAchievementIds.push(def.id);
      achievementsPayload.unlocked.push({
        achievementId: def.id,
        unlockedAtIso: result.completedAtIso,
        triggerCompletionId: result.completionId,
      });
      if (
        def.xpReward &&
        def.xpReward > 0 &&
        !progress.claimedAchievementRewardIds.includes(def.id)
      ) {
        progress.claimedAchievementRewardIds.push(def.id);
        achievementBonusXp += def.xpReward;
      }
    }
  }

  writeEnvelope(STORAGE_KEYS.ACHIEVEMENTS, achievementsPayload);

  // Total XP awarded for this completion event
  const effectiveXpEarned =
    baseEffectiveXp +
    milestoneBonusXp +
    dailySetBonusXp +
    archiveChamberBonusXp +
    achievementBonusXp;

  newRecord.xpAwarded = effectiveXpEarned;
  writeEnvelope(STORAGE_KEYS.RECORDS, recordsPayload);

  if (catStat) {
    catStat.totalXpEarned += effectiveXpEarned;
  }

  // Update XP & Level (only when effectiveXpEarned > 0)
  if (effectiveXpEarned > 0) {
    progress.totalXp += effectiveXpEarned;
    progress.currentXp += effectiveXpEarned;
    while (progress.currentXp >= progress.xpForNextLevel) {
      progress.currentXp -= progress.xpForNextLevel;
      progress.level += 1;
      progress.xpForNextLevel = getXpRequiredForLevel(progress.level);
    }
  }

  const newLevel = progress.level;
  const didLevelUp = newLevel > previousLevel;

  // Populate authoritative reward & level breakdown onto the PuzzleResult object
  result.xpEarned = effectiveXpEarned;
  result.basePuzzleXpAwarded = baseEffectiveXp;
  result.winStreakMilestoneReached = reachedWinStreakMilestone;
  result.winStreakMilestoneXpAwarded = milestoneBonusXp;
  result.dailySetBonusXpAwarded = dailySetBonusXp;
  result.completedDailySetToday = completedDailySetToday;
  result.archiveChamberBonusXpAwarded = archiveChamberBonusXp;
  result.newlyCompletedChamberIds = newlyCompletedChamberIds;
  result.achievementBonusXpAwarded = achievementBonusXp;
  result.newlyUnlockedAchievementIds = newlyUnlockedAchievementIds;
  result.previousLevel = previousLevel;
  result.newLevel = newLevel;
  result.didLevelUp = didLevelUp;
  if (wasPuzzleAlreadySolved) {
    result.isReplayOfSolvedPuzzle = true;
  }
  if (isDailyChallengeAlreadyCompleted) {
    result.dailyAlreadyClaimed = true;
  }

  progress.lastUpdatedIso = result.completedAtIso;
  savePlayerProgress(progress);

  // Update adaptive Regular ('normal') difficulty state on non-replay completions
  const currentSettings = loadSettings();
  if (!isReplayOfCompletedPuzzle) {
    const activePref =
      result.mode === 'practice'
        ? getEffectiveCategoryDifficulty(currentSettings, result.category)
            .preference
        : getEffectiveGlobalDifficulty(currentSettings).preference;

    if (activePref === 'normal') {
      const nextAutoState = advanceAutoDifficultyOnSolve(
        currentSettings.autoDifficultyState,
        {
          hintsUsed: result.hintsUsed,
          attemptCount: result.attemptCount,
          puzzleDifficulty: result.difficulty,
        }
      );
      const updatedSettings: GameSettings = {
        ...currentSettings,
        autoDifficultyState: nextAutoState,
        difficulty:
          currentSettings.difficultyPreference === 'normal'
            ? nextAutoState.currentEffectiveDifficulty
            : currentSettings.difficulty,
      };
      persistSettingsEnvelope(updatedSettings);
    }
  }

  return {
    progress,
    recordsPayload,
    dailyState,
    unlockedAchievements: achievementsPayload.unlocked,
    campaignProgress,
  };
}

/**
 * Resets the active consecutive Win Streak (`currentWinStreak` and `winsTowardNextMilestone`)
 * to 0 and steps down adaptive Regular difficulty by 1 level when a player fails or abandons
 * an unsolved puzzle session.
 * Preserves `bestWinStreak`, `winStreakMilestonesAchieved`, and unlocked achievements.
 * Note: An incorrect answer during an active puzzle does NOT call this; only abandoning or
 * failing an unsolved session resets the streak / demotes adaptive difficulty.
 */
export function recordPuzzleFailureOrAbandonment(
  puzzleId?: string
): PlayerGameProgress {
  const progress = loadPlayerProgress();
  const catalogEntry = puzzleId ? getCatalogPuzzleById(puzzleId) : undefined;
  if (puzzleId) {
    const recordsPayload = loadCompletionRecords();
    if (isCatalogPuzzleSolved(puzzleId, recordsPayload.records)) {
      // Leaving a replay of an already solved puzzle does not penalize the active win streak or adaptive difficulty
      return progress;
    }
  }
  progress.currentWinStreak = 0;
  progress.winsTowardNextMilestone = 0;
  progress.lastUpdatedIso = new Date().toISOString();
  savePlayerProgress(progress);

  // Step down adaptive Regular ('normal') difficulty by 1 level (Hard -> Regular, Regular -> Easy)
  // Fixed Easy and Fixed Hard preferences never auto-adjust.
  const currentSettings = loadSettings();
  const globalPref = getEffectiveGlobalDifficulty(currentSettings).preference;
  const catPref = catalogEntry
    ? getEffectiveCategoryDifficulty(currentSettings, catalogEntry.category)
        .preference
    : globalPref;

  if (globalPref === 'normal' || catPref === 'normal') {
    const nextAutoState = demoteAutoDifficultyOnFailure(
      currentSettings.autoDifficultyState
    );
    const updatedSettings: GameSettings = {
      ...currentSettings,
      autoDifficultyState: nextAutoState,
      difficulty:
        currentSettings.difficultyPreference === 'normal'
          ? nextAutoState.currentEffectiveDifficulty
          : currentSettings.difficulty,
    };
    persistSettingsEnvelope(updatedSettings);
  }

  return progress;
}

// --- 6. App Navigation & Interrupted Gameplay Session Storage ---

function validatePuzzleResult(raw: unknown): PuzzleResult | null {
  if (!isObject(raw)) return null;
  if (typeof raw.completionId !== 'string' || typeof raw.puzzleId !== 'string') {
    return null;
  }
  if (!isValidCategory(raw.category) || !isValidDifficulty(raw.difficulty)) {
    return null;
  }
  if (!isValidGameMode(raw.mode)) return null;
  if (typeof raw.score !== 'number' || typeof raw.accuracyPercent !== 'number') {
    return null;
  }
  if (
    typeof raw.completionTimeSeconds !== 'number' ||
    typeof raw.hintsUsed !== 'number' ||
    typeof raw.xpEarned !== 'number'
  ) {
    return null;
  }
  return {
    completionId: raw.completionId,
    puzzleId: raw.puzzleId,
    puzzleTitle: typeof raw.puzzleTitle === 'string' ? raw.puzzleTitle : undefined,
    category: raw.category,
    difficulty: raw.difficulty,
    puzzleType:
      typeof raw.puzzleType === 'string'
        ? (raw.puzzleType as PuzzleResult['puzzleType'])
        : undefined,
    mode: raw.mode,
    startedAtIso:
      typeof raw.startedAtIso === 'string' ? raw.startedAtIso : undefined,
    completedAtIso:
      typeof raw.completedAtIso === 'string'
        ? raw.completedAtIso
        : new Date().toISOString(),
    status:
      raw.status === 'abandoned' || raw.status === 'blueprint_preview'
        ? raw.status
        : 'completed',
    score: raw.score,
    accuracyPercent: raw.accuracyPercent,
    attemptCount:
      typeof raw.attemptCount === 'number' ? raw.attemptCount : undefined,
    completionTimeSeconds: raw.completionTimeSeconds,
    hintsUsed: raw.hintsUsed,
    xpEarned: raw.xpEarned,
    basePuzzleXpAwarded:
      typeof raw.basePuzzleXpAwarded === 'number'
        ? raw.basePuzzleXpAwarded
        : undefined,
    winStreakMilestoneXpAwarded:
      typeof raw.winStreakMilestoneXpAwarded === 'number'
        ? raw.winStreakMilestoneXpAwarded
        : undefined,
    winStreakMilestoneReached:
      typeof raw.winStreakMilestoneReached === 'boolean'
        ? raw.winStreakMilestoneReached
        : undefined,
    dailySetBonusXpAwarded:
      typeof raw.dailySetBonusXpAwarded === 'number'
        ? raw.dailySetBonusXpAwarded
        : undefined,
    completedDailySetToday:
      typeof raw.completedDailySetToday === 'boolean'
        ? raw.completedDailySetToday
        : undefined,
    archiveChamberBonusXpAwarded:
      typeof raw.archiveChamberBonusXpAwarded === 'number'
        ? raw.archiveChamberBonusXpAwarded
        : undefined,
    newlyCompletedChamberIds: Array.isArray(raw.newlyCompletedChamberIds)
      ? raw.newlyCompletedChamberIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : undefined,
    achievementBonusXpAwarded:
      typeof raw.achievementBonusXpAwarded === 'number'
        ? raw.achievementBonusXpAwarded
        : undefined,
    newlyUnlockedAchievementIds: Array.isArray(raw.newlyUnlockedAchievementIds)
      ? raw.newlyUnlockedAchievementIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : undefined,
    previousLevel:
      typeof raw.previousLevel === 'number' ? raw.previousLevel : undefined,
    newLevel: typeof raw.newLevel === 'number' ? raw.newLevel : undefined,
    didLevelUp:
      typeof raw.didLevelUp === 'boolean' ? raw.didLevelUp : undefined,
    explanation:
      typeof raw.explanation === 'string' ? raw.explanation : undefined,
    isNewPersonalBest: Boolean(raw.isNewPersonalBest),
    previousBestScore:
      typeof raw.previousBestScore === 'number' ? raw.previousBestScore : null,
    isPersistedRecord:
      typeof raw.isPersistedRecord === 'boolean' ? raw.isPersistedRecord : true,
    dailyAlreadyClaimed:
      typeof raw.dailyAlreadyClaimed === 'boolean'
        ? raw.dailyAlreadyClaimed
        : undefined,
    isReplayOfSolvedPuzzle:
      typeof raw.isReplayOfSolvedPuzzle === 'boolean'
        ? raw.isReplayOfSolvedPuzzle
        : undefined,
    modeMetadata: isObject(raw.modeMetadata)
      ? (raw.modeMetadata as GameplayModeMetadata)
      : undefined,
  };
}

function validateActiveGameplaySession(
  raw: unknown
): ActiveGameplaySessionState | null {
  if (!isObject(raw)) return null;
  if (typeof raw.puzzleId !== 'string' || !raw.puzzleId) return null;
  if (!isValidCategory(raw.category) || !isValidGameMode(raw.mode)) return null;
  if (typeof raw.elapsedSeconds !== 'number' || raw.elapsedSeconds < 0) {
    return null;
  }
  if (typeof raw.hintsUsed !== 'number' || raw.hintsUsed < 0) return null;
  if (typeof raw.attemptCount !== 'number' || raw.attemptCount < 0) return null;
  if (typeof raw.selectedOptionId !== 'string') return null;

  const interactionState =
    isObject(raw.interactionState) && typeof raw.interactionState.type === 'string'
      ? (raw.interactionState as unknown as ActiveGameplaySessionState['interactionState'])
      : undefined;

  return {
    puzzleId: raw.puzzleId,
    category: raw.category,
    difficulty: isValidDifficulty(raw.difficulty) ? raw.difficulty : undefined,
    mode: raw.mode,
    startedAtIso:
      typeof raw.startedAtIso === 'string' ? raw.startedAtIso : undefined,
    elapsedSeconds: Math.floor(raw.elapsedSeconds),
    hintsUsed: Math.floor(raw.hintsUsed),
    attemptCount: Math.floor(raw.attemptCount),
    selectedOptionId: raw.selectedOptionId,
    interactionState,
    lastWrongSubmissionSignature:
      typeof raw.lastWrongSubmissionSignature === 'string'
        ? raw.lastWrongSubmissionSignature
        : null,
    pendingResult: raw.pendingResult
      ? validatePuzzleResult(raw.pendingResult)
      : null,
    modeMetadata: isObject(raw.modeMetadata)
      ? (raw.modeMetadata as GameplayModeMetadata)
      : undefined,
    updatedAtIso:
      typeof raw.updatedAtIso === 'string'
        ? raw.updatedAtIso
        : new Date().toISOString(),
  };
}

function validateQuickPlayConfig(raw: unknown): QuickPlayConfigState {
  const def = createDefaultQuickPlayConfig();
  if (!isObject(raw)) return def;

  const categoryFilter: PuzzleCategory | 'all' =
    raw.categoryFilter === 'all' || isValidCategory(raw.categoryFilter)
      ? raw.categoryFilter
      : def.categoryFilter;

  const difficulty: PuzzleDifficulty = isValidDifficulty(raw.difficulty)
    ? raw.difficulty
    : def.difficulty;

  const selectionType: 'random' | 'specific' =
    raw.selectionType === 'specific' ? 'specific' : 'random';

  const selectedPuzzleId =
    typeof raw.selectedPuzzleId === 'string' ? raw.selectedPuzzleId : null;

  const recentPuzzleIds = Array.isArray(raw.recentPuzzleIds)
    ? raw.recentPuzzleIds
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 64)
    : [];

  const sessionPlayedPuzzleIds = Array.isArray(raw.sessionPlayedPuzzleIds)
    ? raw.sessionPlayedPuzzleIds
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 64)
    : [];

  return {
    categoryFilter,
    difficulty,
    selectionType,
    selectedPuzzleId,
    recentPuzzleIds,
    sessionPlayedPuzzleIds,
  };
}

export const ARCHIVE_ONLY_ACHIEVEMENT_IDS: ReadonlySet<string> = new Set([
  'archive_restorer',
  'prime_core_awakened',
]);

export function isPlayerFacingAchievementId(id: string): boolean {
  return !ARCHIVE_ONLY_ACHIEVEMENT_IDS.has(id);
}

function validateAppSession(raw: unknown): PersistedAppSessionState | null {
  if (!isObject(raw)) return null;
  if (!isValidRoute(raw.currentRoute)) return null;
  if (!isValidCategory(raw.activeCategory)) return null;
  if (!isValidGameMode(raw.activeMode)) return null;
  if (typeof raw.stageIndex !== 'number' || raw.stageIndex < 0) return null;

  const lastResult = raw.lastResult ? validatePuzzleResult(raw.lastResult) : null;
  const rawSelectedPuzzleId =
    typeof raw.selectedPuzzleId === 'string' ? raw.selectedPuzzleId : null;
  const isSelectedPuzzleValid = Boolean(
    rawSelectedPuzzleId && getCatalogPuzzleById(rawSelectedPuzzleId)
  );
  const selectedPuzzleId = isSelectedPuzzleValid ? rawSelectedPuzzleId : null;

  const validatedGameplaySession = raw.activeGameplaySession
    ? validateActiveGameplaySession(raw.activeGameplaySession)
    : null;

  const isGameplaySessionCatalogValid = Boolean(
    validatedGameplaySession &&
      validatedGameplaySession.mode !== 'archive' &&
      getCatalogPuzzleById(validatedGameplaySession.puzzleId)
  );

  const activeGameplaySession = isGameplaySessionCatalogValid
    ? validatedGameplaySession
    : null;

  const currentRoute: ScreenRoute =
    raw.currentRoute === 'archive' ||
    (raw.currentRoute === 'results' && !lastResult) ||
    (raw.currentRoute === 'gameplay' &&
      !selectedPuzzleId &&
      !activeGameplaySession)
      ? 'home'
      : raw.currentRoute;

  const activeMode: GameMode =
    raw.activeMode === 'archive' ? 'quick_play' : raw.activeMode;

  return {
    currentRoute,
    activeHubTab: isValidHubTab(raw.activeHubTab)
      ? raw.activeHubTab
      : 'overview',
    activeCategory: raw.activeCategory,
    collectionCategory: isValidCategory(raw.collectionCategory)
      ? raw.collectionCategory
      : null,
    selectedPuzzleId:
      selectedPuzzleId ?? activeGameplaySession?.puzzleId ?? null,
    activeMode,
    stageIndex: Math.floor(raw.stageIndex),
    lastResult,
    activeGameplaySession,
    quickPlayConfig: validateQuickPlayConfig(raw.quickPlayConfig),
  };
}

export function loadAppSession(): PersistedAppSessionState {
  return readEnvelope(
    STORAGE_KEYS.SESSION,
    validateAppSession,
    createDefaultAppSession
  );
}

export function saveAppSession(session: PersistedAppSessionState): void {
  writeEnvelope(STORAGE_KEYS.SESSION, session);
}

export function saveActiveGameplaySession(
  activeGameplaySession: ActiveGameplaySessionState | null
): PersistedAppSessionState {
  const current = loadAppSession();
  const updated: PersistedAppSessionState = {
    ...current,
    activeGameplaySession,
  };
  saveAppSession(updated);
  return updated;
}

/**
 * Resets ONLY gameplay progression, completion records, daily challenges,
 * achievements, campaign progress, and active gameplay session while
 * strictly preserving the player's audio & visual settings (`STORAGE_KEYS.SETTINGS`).
 */
export function resetGameplayProgressOnly(): {
  settings: GameSettings;
  progress: PlayerGameProgress;
  records: RecordsStoragePayload;
  daily: DailyCompletionState;
  achievements: AchievementsStoragePayload;
  session: PersistedAppSessionState;
  campaign: CampaignProgressState;
} {
  const settings = loadSettings();
  const progress = createDefaultPlayerProgress();
  const records = createDefaultRecordsPayload();
  const daily = createDefaultDailyState();
  const achievements = createDefaultAchievementsPayload();
  const session = createDefaultAppSession();
  if (session.quickPlayConfig) {
    session.quickPlayConfig.difficulty = settings.difficulty;
  }
  const campaign = createDefaultCampaignProgressState();

  writeEnvelope(STORAGE_KEYS.PROGRESS, progress);
  writeEnvelope(STORAGE_KEYS.RECORDS, records);
  writeEnvelope(STORAGE_KEYS.DAILY, daily);
  writeEnvelope(STORAGE_KEYS.ACHIEVEMENTS, achievements);
  writeEnvelope(STORAGE_KEYS.SESSION, session);
  writeEnvelope(STORAGE_KEYS.CAMPAIGN, campaign);
  recoveredKeysSet.clear();

  return {
    settings,
    progress,
    records,
    daily,
    achievements,
    session,
    campaign,
  };
}

/**
 * Resets ONLY audio, difficulty, hint, and visual theme settings to defaults
 * while preserving all gameplay progression, solved puzzles, streaks, and achievements.
 */
export function resetSettingsOnly(): GameSettings {
  const settings = { ...DEFAULT_GAME_SETTINGS };
  writeEnvelope(STORAGE_KEYS.SETTINGS, settings);
  return settings;
}

export function resetAllLocalGameStorage(): {
  settings: GameSettings;
  progress: PlayerGameProgress;
  records: RecordsStoragePayload;
  daily: DailyCompletionState;
  achievements: AchievementsStoragePayload;
  session: PersistedAppSessionState;
  campaign: CampaignProgressState;
} {
  const settings = { ...DEFAULT_GAME_SETTINGS };
  const progress = createDefaultPlayerProgress();
  const records = createDefaultRecordsPayload();
  const daily = createDefaultDailyState();
  const achievements = createDefaultAchievementsPayload();
  const session = createDefaultAppSession();
  const campaign = createDefaultCampaignProgressState();

  writeEnvelope(STORAGE_KEYS.SETTINGS, settings);
  writeEnvelope(STORAGE_KEYS.PROGRESS, progress);
  writeEnvelope(STORAGE_KEYS.RECORDS, records);
  writeEnvelope(STORAGE_KEYS.DAILY, daily);
  writeEnvelope(STORAGE_KEYS.ACHIEVEMENTS, achievements);
  writeEnvelope(STORAGE_KEYS.SESSION, session);
  writeEnvelope(STORAGE_KEYS.CAMPAIGN, campaign);
  recoveredKeysSet.clear();

  return {
    settings,
    progress,
    records,
    daily,
    achievements,
    session,
    campaign,
  };
}
