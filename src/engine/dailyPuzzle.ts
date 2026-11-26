/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Three Deterministic Daily Challenges Engine (Phase L2.3 Revision)
 * - Generates 3 distinct featured Daily Challenges every local calendar day (YYYY-MM-DD).
 * - Guarantees 3 unique puzzle IDs per day from the 64-puzzle catalog.
 * - Tracks 3 independent completion records per date (0/3 -> 1/3 -> 2/3 -> 3/3)
 *   while preserving previous dates' history and migrating legacy single-record entries.
 * - No Daily Streak is calculated or displayed (NEX11 owns app-wide daily streak; Logic Quest uses Win Streak).
 */

import {
  DailyCompletedRecord,
  DailyCompletionState,
  DailyDateCompletionMap,
  DailyPuzzleDescriptor,
  PuzzleCategory,
  PuzzleDifficulty,
} from '../types/game';
import { PUZZLE_CATEGORIES_ORDER } from './categories';
import { PUZZLE_CATALOG } from './generator';

export const DAILY_PUZZLE_SET_VERSION = 'v1';

/**
 * Pure FNV-1a 32-bit deterministic hash for string inputs.
 */
export function computeDeterministicHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Formats a Date into canonical UTC YYYY-MM-DD format.
 */
export function getUtcDateKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date into the user's local calendar YYYY-MM-DD format.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD calendar date key into epoch days since 2026-01-01.
 */
function computeDayIndexFromDateKey(dateKey: string): number {
  const parts = dateKey.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return 0;
  }
  const [year, month, day] = parts;
  const epochStart = Date.UTC(2026, 0, 1);
  const targetMidnight = Date.UTC(year, month - 1, day);
  return Math.max(0, Math.floor((targetMidnight - epochStart) / 86400000));
}

const CHALLENGE_SLOT_DIFFICULTIES: readonly [
  PuzzleDifficulty,
  PuzzleDifficulty,
  PuzzleDifficulty,
] = ['easy', 'normal', 'hard'];

const FALLBACK_CHALLENGE_PUZZLES: readonly [
  { id: string; title: string; category: PuzzleCategory; difficulty: PuzzleDifficulty },
  { id: string; title: string; category: PuzzleCategory; difficulty: PuzzleDifficulty },
  { id: string; title: string; category: PuzzleCategory; difficulty: PuzzleDifficulty },
] = [
  {
    id: 'ns-easy-01',
    title: 'Harmonic Doubling',
    category: 'number_sequences',
    difficulty: 'easy',
  },
  {
    id: 'pr-normal-02',
    title: 'Cardinality Matrix',
    category: 'pattern_recognition',
    difficulty: 'normal',
  },
  {
    id: 'ml-hard-03',
    title: 'Coupled Node Equilibrium',
    category: 'mathematical_logic',
    difficulty: 'hard',
  },
];

/**
 * Deterministically generates the 3 Daily Challenges for a given local calendar date (YYYY-MM-DD).
 * - Guarantees 3 distinct puzzle IDs from the 64-puzzle catalog.
 * - Spans 3 distinct categories and difficulties (Challenge 1: Easy, Challenge 2: Normal, Challenge 3: Hard).
 */
export function getDailyChallengesForDate(
  dateOrKey: Date | string = new Date(),
  puzzleSetVersion: string = DAILY_PUZZLE_SET_VERSION,
  useLocalDate: boolean = true
): [DailyPuzzleDescriptor, DailyPuzzleDescriptor, DailyPuzzleDescriptor] {
  const dateKey =
    typeof dateOrKey === 'string'
      ? dateOrKey
      : useLocalDate
      ? getLocalDateKey(dateOrKey)
      : getUtcDateKey(dateOrKey);

  const dayIndex = computeDayIndexFromDateKey(dateKey);
  const compactDate = dateKey.replace(/-/g, '');
  const usedPuzzleIds = new Set<string>();
  const usedCategories = new Set<PuzzleCategory>();

  const descriptors: DailyPuzzleDescriptor[] = [];

  for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
    const challengeNumber = (slotIdx + 1) as 1 | 2 | 3;
    const targetDifficulty = CHALLENGE_SLOT_DIFFICULTIES[slotIdx];
    const canonicalKey = `logic_quest_daily:${puzzleSetVersion}:${dateKey}:c${challengeNumber}`;
    const hash = computeDeterministicHash(canonicalKey);

    // Pick a category not yet used today
    let category: PuzzleCategory =
      PUZZLE_CATEGORIES_ORDER[
        (dayIndex + slotIdx * 3 + (hash % PUZZLE_CATEGORIES_ORDER.length)) %
          PUZZLE_CATEGORIES_ORDER.length
      ];
    for (let offset = 0; offset < PUZZLE_CATEGORIES_ORDER.length; offset++) {
      const candidateCat =
        PUZZLE_CATEGORIES_ORDER[
          (dayIndex + slotIdx * 3 + (hash % PUZZLE_CATEGORIES_ORDER.length) + offset) %
            PUZZLE_CATEGORIES_ORDER.length
        ];
      if (!usedCategories.has(candidateCat)) {
        category = candidateCat;
        break;
      }
    }
    usedCategories.add(category);

    // Select a puzzle from the 64-puzzle catalog matching category + difficulty (and not yet used today)
    const catalogAvailable =
      Array.isArray(PUZZLE_CATALOG) && PUZZLE_CATALOG.length > 0;
    let pool = catalogAvailable
      ? PUZZLE_CATALOG.filter(
          (p) =>
            p.category === category &&
            p.difficulty === targetDifficulty &&
            !usedPuzzleIds.has(p.id)
        )
      : [];

    if (pool.length === 0 && catalogAvailable) {
      pool = PUZZLE_CATALOG.filter(
        (p) => p.difficulty === targetDifficulty && !usedPuzzleIds.has(p.id)
      );
    }
    if (pool.length === 0 && catalogAvailable) {
      pool = PUZZLE_CATALOG.filter((p) => !usedPuzzleIds.has(p.id));
    }

    const chosen =
      pool.length > 0 ? pool[(hash >>> 3) % pool.length] : undefined;
    const fallback = FALLBACK_CHALLENGE_PUZZLES[slotIdx];

    const featuredPuzzleId = chosen?.id ?? fallback.id;
    const puzzleTitle = chosen?.title ?? fallback.title;
    const resolvedCategory = chosen?.category ?? fallback.category;
    const resolvedDifficulty = chosen?.difficulty ?? fallback.difficulty;

    usedPuzzleIds.add(featuredPuzzleId);

    const hexSuffix = hash
      .toString(16)
      .toUpperCase()
      .padStart(8, '0')
      .slice(0, 6);
    const dailyId = `LQ-DAILY-${compactDate}-C${challengeNumber}-${puzzleSetVersion.toUpperCase()}-${hexSuffix}`;

    descriptors.push({
      dailyId,
      challengeNumber,
      utcDateString: dateKey,
      dateKey,
      puzzleSetVersion,
      category: resolvedCategory,
      difficulty: resolvedDifficulty,
      featuredPuzzleId,
      puzzleTitle,
      deterministicSeed: `${dailyId}:${resolvedCategory}:${featuredPuzzleId}`,
      dayIndex,
    });
  }

  return [descriptors[0], descriptors[1], descriptors[2]];
}

/**
 * Computes a single DailyPuzzleDescriptor for a given calendar date and challenge number (1, 2, or 3).
 * Defaults to Challenge 1 for backward compatibility with single-descriptor callers.
 */
export function getDailyPuzzleDescriptor(
  dateOrKey: Date | string = new Date(),
  puzzleSetVersion: string = DAILY_PUZZLE_SET_VERSION,
  useLocalDate: boolean = true,
  challengeNumber: 1 | 2 | 3 = 1
): DailyPuzzleDescriptor {
  const allThree = getDailyChallengesForDate(
    dateOrKey,
    puzzleSetVersion,
    useLocalDate
  );
  return allThree[challengeNumber - 1] ?? allThree[0];
}

function isSingleCompletedRecord(val: unknown): val is DailyCompletedRecord {
  return (
    typeof val === 'object' &&
    val !== null &&
    'dailyId' in val &&
    typeof (val as DailyCompletedRecord).dailyId === 'string' &&
    'completionId' in val &&
    typeof (val as DailyCompletedRecord).completionId === 'string' &&
    'score' in val &&
    typeof (val as DailyCompletedRecord).score === 'number'
  );
}

/**
 * Safely normalizes a date's entry in `dailyState.completedByDate[dateKey]` into a map of
 * `{ [dailyId]: DailyCompletedRecord }`, migrating legacy single-record date objects seamlessly.
 */
export function getDailyDateCompletionMap(
  dailyState: DailyCompletionState,
  dateKey: string
): DailyDateCompletionMap {
  const rawEntry = dailyState.completedByDate[dateKey];
  if (!rawEntry || typeof rawEntry !== 'object') {
    return {};
  }

  if (isSingleCompletedRecord(rawEntry)) {
    return {
      [rawEntry.dailyId]: rawEntry,
    };
  }

  const map: DailyDateCompletionMap = {};
  for (const [k, v] of Object.entries(rawEntry)) {
    if (isSingleCompletedRecord(v)) {
      map[k] = v;
    }
  }
  return map;
}

/**
 * Checks whether a daily challenge reward can be claimed for the specified descriptor.
 * Prevents repeated completion rewards for the same date + dailyId.
 */
export function canClaimDailyReward(
  descriptor: DailyPuzzleDescriptor,
  dailyState: DailyCompletionState
): boolean {
  const key = descriptor.dateKey ?? descriptor.utcDateString;
  const dateMap = getDailyDateCompletionMap(dailyState, key);
  return !dateMap[descriptor.dailyId];
}

/**
 * Returns the full status and persisted completion record (if completed) for a single DailyPuzzleDescriptor.
 */
export function getDailyChallengeStatus(
  descriptor: DailyPuzzleDescriptor,
  dailyState: DailyCompletionState
): {
  isCompleted: boolean;
  canClaimReward: boolean;
  completedRecord: DailyCompletedRecord | null;
} {
  const key = descriptor.dateKey ?? descriptor.utcDateString;
  const dateMap = getDailyDateCompletionMap(dailyState, key);
  const record = dateMap[descriptor.dailyId] ?? null;
  const isCompleted = Boolean(record);
  return {
    isCompleted,
    canClaimReward: !isCompleted,
    completedRecord: record,
  };
}

/**
 * Returns the next unfinished Daily Challenge in strict 1 -> 2 -> 3 sequential order,
 * or `null` if all 3 challenges for the date have been completed.
 */
export function getNextUnfinishedDailyChallenge(
  dateOrDescriptors:
    | Date
    | string
    | readonly [
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
      ],
  dailyState: DailyCompletionState
): DailyPuzzleDescriptor | null {
  const descriptors = Array.isArray(dateOrDescriptors)
    ? dateOrDescriptors
    : getDailyChallengesForDate(dateOrDescriptors as Date | string);

  for (const descriptor of descriptors) {
    const status = getDailyChallengeStatus(descriptor, dailyState);
    if (!status.isCompleted) {
      return descriptor;
    }
  }
  return null;
}

/**
 * Returns the overall daily challenge set summary (0/3 through 3/3) for a date, dateKey, or descriptor tuple.
 */
export function getDailySetSummary(
  dateOrDescriptors:
    | Date
    | string
    | readonly [
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
      ],
  dailyState: DailyCompletionState
): {
  dateKey: string;
  totalCount: 3;
  completedCount: number;
  isAllCompleted: boolean;
  nextUnfinishedChallenge: DailyPuzzleDescriptor | null;
  statuses: Array<{
    descriptor: DailyPuzzleDescriptor;
    isCompleted: boolean;
    canClaimReward: boolean;
    completedRecord: DailyCompletedRecord | null;
  }>;
  challenges: Array<{
    descriptor: DailyPuzzleDescriptor;
    status: {
      isCompleted: boolean;
      canClaimReward: boolean;
      completedRecord: DailyCompletedRecord | null;
    };
  }>;
} {
  const descriptors = Array.isArray(dateOrDescriptors)
    ? dateOrDescriptors
    : getDailyChallengesForDate(dateOrDescriptors as Date | string);

  const statuses = descriptors.map((descriptor) => ({
    descriptor,
    ...getDailyChallengeStatus(descriptor, dailyState),
  }));
  const challenges = statuses.map((s) => ({
    descriptor: s.descriptor,
    status: {
      isCompleted: s.isCompleted,
      canClaimReward: s.canClaimReward,
      completedRecord: s.completedRecord,
    },
  }));
  const completedCount = statuses.filter((s) => s.isCompleted).length;
  const nextUnfinishedChallenge =
    statuses.find((s) => !s.isCompleted)?.descriptor ?? null;

  return {
    dateKey: descriptors[0].dateKey,
    totalCount: 3,
    completedCount,
    isAllCompleted: completedCount === 3,
    nextUnfinishedChallenge,
    statuses,
    challenges,
  };
}

/**
 * Enforces strict 1 -> 2 -> 3 Daily Challenge sequential unlocking.
 * - If the requested challenge is already completed, returns it (for replay/review).
 * - Otherwise, returns the first unfinished challenge in 1 -> 2 -> 3 order so players
 *   can never skip ahead to Challenge 2 or 3 before completing earlier challenges.
 */
export function resolveSequentialDailyChallenge(
  dateOrDescriptors:
    | Date
    | string
    | readonly [
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
        DailyPuzzleDescriptor,
      ],
  dailyState: DailyCompletionState,
  requestedChallengeNumber: 1 | 2 | 3 = 1
): DailyPuzzleDescriptor {
  const descriptors = Array.isArray(dateOrDescriptors)
    ? dateOrDescriptors
    : getDailyChallengesForDate(dateOrDescriptors as Date | string);

  const requested =
    descriptors.find((d) => d.challengeNumber === requestedChallengeNumber) ??
    descriptors[0];

  const requestedStatus = getDailyChallengeStatus(requested, dailyState);
  if (requestedStatus.isCompleted) {
    return requested;
  }

  return (
    getNextUnfinishedDailyChallenge(descriptors, dailyState) ?? descriptors[0]
  );
}

