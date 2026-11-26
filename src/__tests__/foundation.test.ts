/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L1, L2.1 & L2.2 Comprehensive Automated Test Suite
 * Verifies:
 * 1. All 8 categories, 3 difficulties, and 64 curated catalog puzzles (8 per category: 3 Easy, 3 Normal, 2 Hard)
 * 2. Preservation of all 24 original puzzle IDs + 40 new unique puzzle IDs
 * 3. All 8 puzzle mechanics (Multiple Choice, Pattern Recognition, Sequence Puzzle,
 *    Spatial Reasoning, Logical Deduction, Cipher & Code, Mathematical Reasoning, Memory Challenge)
 * 4. Automated solvability & validation of all 64 puzzles (winning state -> isCorrect: true, non-winning -> false)
 * 5. Progressive 3-tier hint framework & post-completion explanations across all 64 puzzles
 * 6. "THE LOST LOGIC ARCHIVE" campaign chapters, 4 chambers, sequential unlock conditions,
 *    environmental clues, interconnected mechanisms, story discoveries, and persistence
 * 7. Scoring compatibility, session persistence, and neutral NEX11 completion event bridge
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_ICON_PALETTES } from '../components/icons/CategoryGlyph';
import {
  ARCHIVE_CAMPAIGN_CHAPTERS,
  ARCHIVE_CHAMBERS,
  evaluateChamberStatuses,
  getChamberById,
  getChamberForPuzzleId,
  getNextChamberPuzzle,
} from '../engine/campaign';
import {
  PUZZLE_CATEGORIES_ORDER,
  getAllCategories,
  getCategoryMetadata,
} from '../engine/categories';
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PREFERENCE_ORDER,
  advanceAutoDifficultyOnSolve,
  createDefaultAutoDifficultyState,
  demoteAutoDifficultyOnFailure,
  filterPuzzlesByDifficultyPreference,
  formatDifficultyLabel,
  getEffectiveCategoryDifficulty,
  getEffectiveGlobalDifficulty,
  normalizeDifficultyPreference,
  resolveEffectiveDifficulty,
} from '../engine/difficulty';
import {
  BASE_PUZZLE_CATALOG,
  PUZZLE_CATALOG,
  constructWinningStateForPuzzle,
  filterCatalogPuzzles,
  generatePlayablePuzzle,
  getCatalogMechanicCounts,
  getCatalogPuzzleById,
  getCatalogPuzzlesByCategory,
  getNextCatalogPuzzle,
  getRecordsForCatalogPuzzle,
  isCatalogPuzzleSolved,
  matchesCatalogPuzzleId,
  selectNextLibraryCategoryPuzzle,
  selectNextQuickPlaySessionPuzzle,
  selectQuickPlayPuzzle,
} from '../engine/generator';
import {
  applyPuzzleAction,
  createInitialPuzzleState,
  getProgressiveHint,
  getPuzzleStateSignature,
  getTargetSlotPreviewText,
  isPuzzleStateComplete,
  resetPuzzleState,
} from '../engine/mechanicsController';
import { validatePuzzleAnswer } from '../engine/validator';
import {
  buildValidatedPuzzleResult,
  calculatePuzzleScore,
  calculateXpEarned,
  consumeOneShotCelebration,
  getXpRequiredForLevel,
  isLiveSessionCompletion,
  resetCelebrationRegistryForTests,
} from '../engine/scoring';
import {
  canClaimDailyReward,
  getDailyChallengeStatus,
  getDailyChallengesForDate,
  getDailyPuzzleDescriptor,
  getDailySetSummary,
  getLocalDateKey,
  getNextUnfinishedDailyChallenge,
  getUtcDateKey,
  resolveSequentialDailyChallenge,
} from '../engine/dailyPuzzle';
import {
  ACHIEVEMENT_DEFINITIONS,
  ARCHIVE_CHAMBER_COMPLETION_XP_REWARD,
  DAILY_SET_COMPLETION_XP_REWARD,
  DEFAULT_GAME_SETTINGS,
  STORAGE_KEYS,
  WIN_STREAK_MILESTONE_TARGET,
  WIN_STREAK_MILESTONE_XP_REWARD,
  applyNex11LaunchPreferencesToSettings,
  createDefaultQuickPlayConfig,
  evaluateAchievementProgress,
  isPlayerFacingAchievementId,
  getRawStorageItem,
  getRecoveredStorageKeys,
  loadAchievementsState,
  loadAppSession,
  loadCampaignProgress,
  loadCompletionRecords,
  loadDailyCompletionState,
  loadPlayerProgress,
  loadSettings,
  recordPuzzleCompletion,
  recordPuzzleFailureOrAbandonment,
  resetAllLocalGameStorage,
  resetGameplayProgressOnly,
  resetSettingsOnly,
  saveActiveGameplaySession,
  saveAppSession,
  saveSettings,
  setCategoryDifficultyPreference,
  setGlobalDifficultyPreference,
  setRawStorageItem,
} from '../storage/storageManager';
import { soundEngine } from '../audio/soundEngine';
import {
  LOGIC_QUEST_DISPLAY_NAME,
  LOGIC_QUEST_GAME_ID,
  LOGIC_QUEST_GAME_VERSION,
  LOGIC_QUEST_MODULE_MANIFEST,
  NEX11_COMPLETION_EVENT_VERSION,
  NEX11_CONTRACT_VERSION,
  configureNex11Launch,
  emitNex11CompletionEvent,
  getNex11BridgeDiagnostics,
  getNex11LaunchConfig,
  hasEmittedNex11CompletionEvent,
  notifyNexiGameContext,
  notifyNexiHintUsed,
  notifyNexiReaction,
  registerNex11CompletionListener,
  registerNex11NexiAdapter,
  resetNex11BridgeForTests,
} from '../engine/nex11Bridge';
import { initializeLogicQuestModule } from '../module/contract';
import {
  Nex11GameCompletionEvent,
  NexiExpressionState,
  NexiGameContextPayload,
  NexiHintEventPayload,
  NexiResultReactionPayload,
  PuzzleInteractionType,
} from '../types/game';

const ORIGINAL_24_PUZZLE_IDS = [
  'ns-easy-01',
  'ns-normal-02',
  'ns-hard-03',
  'pr-easy-01',
  'pr-normal-02',
  'pr-hard-03',
  'ml-easy-01',
  'ml-normal-02',
  'ml-hard-03',
  'vp-easy-01',
  'vp-normal-02',
  'vp-hard-03',
  'sr-easy-01',
  'sr-normal-02',
  'sr-hard-03',
  'de-easy-01',
  'de-normal-02',
  'de-hard-03',
  'ss-easy-01',
  'ss-normal-02',
  'ss-hard-03',
  'mo-easy-01',
  'mo-normal-02',
  'mo-hard-03',
];

test('1. Phase L2.2 Catalog Expansion & Integrity: 64 unique puzzles (8 per category: 3 Easy, 3 Normal, 2 Hard) and all 24 original IDs preserved', () => {
  assert.equal(PUZZLE_CATEGORIES_ORDER.length, 8);
  assert.equal(getAllCategories().length, 8);
  assert.deepEqual(DIFFICULTY_ORDER, ['easy', 'normal', 'hard']);
  assert.equal(BASE_PUZZLE_CATALOG.length, 24);
  assert.equal(PUZZLE_CATALOG.length, 64);

  // Verify all 24 original puzzle IDs remain present
  for (const origId of ORIGINAL_24_PUZZLE_IDS) {
    const found = getCatalogPuzzleById(origId);
    assert.ok(found, `Original puzzle ID ${origId} must be preserved`);
  }

  // Verify all 64 puzzle IDs are unique
  const seenIds = new Set<string>();
  const observedPuzzleTypes = new Set<PuzzleInteractionType>();
  let totalEasy = 0;
  let totalNormal = 0;
  let totalHard = 0;

  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    const meta = getCategoryMetadata(cat);
    assert.equal(meta.id, cat);

    const entries = getCatalogPuzzlesByCategory(cat);
    assert.equal(
      entries.length,
      8,
      `Category ${cat} must have exactly 8 puzzles`
    );

    const easyInCat = entries.filter((p) => p.difficulty === 'easy');
    const normalInCat = entries.filter((p) => p.difficulty === 'normal');
    const hardInCat = entries.filter((p) => p.difficulty === 'hard');

    assert.equal(
      easyInCat.length,
      3,
      `Category ${cat} must have 3 Easy puzzles`
    );
    assert.equal(
      normalInCat.length,
      3,
      `Category ${cat} must have 3 Normal puzzles`
    );
    assert.equal(
      hardInCat.length,
      2,
      `Category ${cat} must have 2 Hard puzzles`
    );

    totalEasy += easyInCat.length;
    totalNormal += normalInCat.length;
    totalHard += hardInCat.length;

    for (const entry of entries) {
      assert.equal(
        seenIds.has(entry.id),
        false,
        `Duplicate puzzle ID found: ${entry.id}`
      );
      seenIds.add(entry.id);

      const def = generatePlayablePuzzle({
        category: cat,
        difficulty: entry.difficulty,
        seed: `TEST-${entry.id}`,
        mode: 'quick_play',
        puzzleSetVersion: 'v1',
        stageIndex: 1,
        puzzleIdOverride: entry.id,
      });

      observedPuzzleTypes.add(def.puzzleType);
      assert.equal(def.id, entry.id);
      assert.equal(def.interactionSpec.type, def.puzzleType);
      assert.equal(def.initialState.type, def.puzzleType);
      assert.equal(def.solutionSpec.type, def.puzzleType);
      assert.ok(
        def.explanation.length >= 15,
        `Puzzle ${entry.id} must have a clear step-by-step explanation`
      );
      assert.ok(
        def.estimatedTimeSeconds >= 20,
        `Puzzle ${entry.id} must have a valid estimatedTimeSeconds`
      );
      assert.ok(def.scoringConfig.targetTimeSeconds > 0);
      assert.equal(
        def.availableHints.length,
        3,
        `Puzzle ${entry.id} must provide 3 progressive hints`
      );
    }
  }

  assert.equal(seenIds.size, 64);
  assert.equal(totalEasy, 24);
  assert.equal(totalNormal, 24);
  assert.equal(totalHard, 16);

  const allEightMechanics: PuzzleInteractionType[] = [
    'multiple_choice',
    'pattern_recognition',
    'sequence_puzzle',
    'spatial_reasoning',
    'logical_deduction',
    'cipher_code',
    'mathematical_reasoning',
    'memory_challenge',
  ];
  for (const mech of allEightMechanics) {
    assert.ok(
      observedPuzzleTypes.has(mech),
      `Catalog must include playable puzzles for mechanic: ${mech}`
    );
  }
});

test('2. Automated Solvability Verification: all 64 puzzles validate as correct with their solution state and fail with initial state', () => {
  for (const entry of PUZZLE_CATALOG) {
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `SOLVE-VERIFY-${entry.id}`,
      mode: 'quick_play',
      puzzleSetVersion: 'v1',
      stageIndex: 1,
      puzzleIdOverride: entry.id,
    });

    // 1. Initial state must not accidentally be a valid winning solution
    const initState = createInitialPuzzleState(def);
    const initRes = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: initState,
      interactionState: initState,
      elapsedSeconds: 5,
      hintsUsed: 0,
      attemptCount: 1,
    });
    assert.equal(
      initRes.isCorrect,
      false,
      `Initial state for puzzle ${entry.id} must not validate as already solved`
    );

    // 2. Constructed winning state must be complete and validate as isCorrect === true
    const winningState = constructWinningStateForPuzzle(def);
    assert.equal(
      isPuzzleStateComplete(def, winningState),
      true,
      `Constructed winning state for ${entry.id} must be complete`
    );

    const winRes = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId:
        winningState.type === 'multiple_choice'
          ? winningState.selectedOptionId
          : '',
      submittedValue: winningState,
      interactionState: winningState,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
    });

    assert.equal(
      winRes.isValidSubmission,
      true,
      `Winning submission for ${entry.id} must be valid`
    );
    assert.equal(
      winRes.isCorrect,
      true,
      `Winning state for puzzle ${entry.id} (${entry.puzzleType}) must validate as isCorrect: true`
    );
  }
});

test('3. Mechanic A — Multiple Choice: selection, incomplete check, wrong/right validation & reset', () => {
  const def = generatePlayablePuzzle({
    category: 'visual_puzzles',
    difficulty: 'normal',
    seed: 'MC-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'vp-normal-02',
  });
  assert.equal(def.puzzleType, 'multiple_choice');

  let state = createInitialPuzzleState(def);
  assert.equal(isPuzzleStateComplete(def, state), false);

  // Incomplete submission check
  const incompleteRes = validatePuzzleAnswer(def, {
    puzzleId: def.id,
    category: def.category,
    selectedOptionId: '',
    submittedValue: state,
    interactionState: state,
    elapsedSeconds: 5,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(incompleteRes.isValidSubmission, false);
  assert.equal(incompleteRes.isCorrect, false);

  // Wrong selection ('opt-b')
  state = applyPuzzleAction(state, { type: 'select_option', optionId: 'opt-b' }, def.interactionSpec);
  assert.equal(isPuzzleStateComplete(def, state), true);
  const wrongSig = getPuzzleStateSignature(state);

  const wrongRes = validatePuzzleAnswer(def, {
    puzzleId: def.id,
    category: def.category,
    selectedOptionId: 'opt-b',
    submittedValue: state,
    interactionState: state,
    submissionSignature: wrongSig,
    elapsedSeconds: 8,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(wrongRes.isValidSubmission, true);
  assert.equal(wrongRes.isCorrect, false);

  // Correct selection ('opt-a') on attempt 2
  state = applyPuzzleAction(state, { type: 'select_option', optionId: 'opt-a' }, def.interactionSpec);
  assert.notEqual(getPuzzleStateSignature(state), wrongSig);
  assert.equal(getTargetSlotPreviewText(def, state), '⊞');

  const rightRes = validatePuzzleAnswer(def, {
    puzzleId: def.id,
    category: def.category,
    selectedOptionId: 'opt-a',
    submittedValue: state,
    interactionState: state,
    elapsedSeconds: 12,
    hintsUsed: 0,
    attemptCount: 2,
  });
  assert.equal(rightRes.isCorrect, true);
  assert.equal(rightRes.accuracyRatio, 0.85);
  assert.ok(rightRes.explanation);

  // Reset
  state = resetPuzzleState(def);
  assert.equal(isPuzzleStateComplete(def, state), false);
});

test('4. Mechanic B — Pattern Recognition: single/dual attribute cell builder & visual layer toggles', () => {
  const defBuilder = generatePlayablePuzzle({
    category: 'pattern_recognition',
    difficulty: 'normal',
    seed: 'PR-BUILDER',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'pr-normal-02',
  });
  assert.equal(defBuilder.puzzleType, 'pattern_recognition');

  let state = createInitialPuzzleState(defBuilder);
  assert.equal(isPuzzleStateComplete(defBuilder, state), false);

  state = applyPuzzleAction(
    state,
    { type: 'pattern_select_primary', tokenId: '●', cellId: 'c33' },
    defBuilder.interactionSpec
  );
  assert.equal(isPuzzleStateComplete(defBuilder, state), false);
  assert.equal(getTargetSlotPreviewText(defBuilder, state, 'c33'), '● × ?');

  state = applyPuzzleAction(
    state,
    { type: 'pattern_select_secondary', tokenId: '3', cellId: 'c33' },
    defBuilder.interactionSpec
  );
  assert.equal(isPuzzleStateComplete(defBuilder, state), true);
  assert.equal(getTargetSlotPreviewText(defBuilder, state, 'c33'), '● × 3');

  const wrongCheck = validatePuzzleAnswer(defBuilder, {
    puzzleId: defBuilder.id,
    category: defBuilder.category,
    selectedOptionId: '',
    submittedValue: state,
    interactionState: state,
    elapsedSeconds: 10,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(wrongCheck.isCorrect, false);

  state = applyPuzzleAction(
    state,
    { type: 'pattern_select_secondary', tokenId: '1', cellId: 'c33' },
    defBuilder.interactionSpec
  );
  const rightCheck = validatePuzzleAnswer(defBuilder, {
    puzzleId: defBuilder.id,
    category: defBuilder.category,
    selectedOptionId: '',
    submittedValue: state,
    interactionState: state,
    elapsedSeconds: 14,
    hintsUsed: 0,
    attemptCount: 2,
  });
  assert.equal(rightCheck.isCorrect, true);

  // Layer toggle mode (vp-hard-03: XOR Cancellation -> toggle ■ and ●)
  const defLayers = generatePlayablePuzzle({
    category: 'visual_puzzles',
    difficulty: 'hard',
    seed: 'PR-LAYERS',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'vp-hard-03',
  });
  let layerState = createInitialPuzzleState(defLayers);
  assert.equal(isPuzzleStateComplete(defLayers, layerState), false);

  layerState = applyPuzzleAction(layerState, { type: 'pattern_toggle_layer', tokenId: '■' });
  layerState = applyPuzzleAction(layerState, { type: 'pattern_toggle_layer', tokenId: '◆' });
  layerState = applyPuzzleAction(layerState, { type: 'pattern_toggle_layer', tokenId: '●' });
  layerState = applyPuzzleAction(layerState, { type: 'pattern_toggle_layer', tokenId: '◆' });
  assert.equal(getTargetSlotPreviewText(defLayers, layerState), '■ + ●');

  const layerRes = validatePuzzleAnswer(defLayers, {
    puzzleId: defLayers.id,
    category: defLayers.category,
    selectedOptionId: '',
    submittedValue: layerState,
    interactionState: layerState,
    elapsedSeconds: 15,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(layerRes.isCorrect, true);
});

test('5. Mechanic C — Sequence Puzzles: numeric keypad/stepper & token drag/swap reordering', () => {
  const defSeq = generatePlayablePuzzle({
    category: 'number_sequences',
    difficulty: 'easy',
    seed: 'SEQ-NUM',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'ns-easy-01',
  });
  assert.equal(defSeq.puzzleType, 'sequence_puzzle');

  let seqState = createInitialPuzzleState(defSeq);
  assert.equal(isPuzzleStateComplete(defSeq, seqState), false);

  seqState = applyPuzzleAction(seqState, { type: 'sequence_append_digit', digit: '6' });
  seqState = applyPuzzleAction(seqState, { type: 'sequence_append_digit', digit: '2' });
  seqState = applyPuzzleAction(seqState, { type: 'sequence_step_delta', delta: 1 });
  assert.equal(getTargetSlotPreviewText(defSeq, seqState, 's5'), '63');

  const seqRes = validatePuzzleAnswer(defSeq, {
    puzzleId: defSeq.id,
    category: defSeq.category,
    selectedOptionId: '',
    submittedValue: seqState,
    interactionState: seqState,
    elapsedSeconds: 9,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(seqRes.isCorrect, true);

  // Token Reordering (de-normal-02: ['Nova', 'Zenith', 'Orion', 'Vega'] -> ['Vega', 'Zenith', 'Orion', 'Nova'])
  const defReorder = generatePlayablePuzzle({
    category: 'deduction_elimination',
    difficulty: 'normal',
    seed: 'SEQ-REORDER',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'de-normal-02',
  });
  let reorderState = createInitialPuzzleState(defReorder);
  assert.equal(isPuzzleStateComplete(defReorder, reorderState), true);

  const wrongOrderRes = validatePuzzleAnswer(defReorder, {
    puzzleId: defReorder.id,
    category: defReorder.category,
    selectedOptionId: '',
    submittedValue: reorderState,
    interactionState: reorderState,
    elapsedSeconds: 8,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(wrongOrderRes.isCorrect, false);

  reorderState = applyPuzzleAction(reorderState, {
    type: 'sequence_swap_tokens',
    fromIndex: 3,
    toIndex: 0,
  });
  reorderState = applyPuzzleAction(reorderState, {
    type: 'sequence_swap_tokens',
    fromIndex: 1,
    toIndex: 3,
  });
  assert.equal(
    getTargetSlotPreviewText(defReorder, reorderState),
    'Vega → Zenith → Orion → Nova'
  );

  const rightOrderRes = validatePuzzleAnswer(defReorder, {
    puzzleId: defReorder.id,
    category: defReorder.category,
    selectedOptionId: '',
    submittedValue: reorderState,
    interactionState: reorderState,
    elapsedSeconds: 14,
    hintsUsed: 0,
    attemptCount: 2,
  });
  assert.equal(rightOrderRes.isCorrect, true);
});

test('6. Mechanic D — Spatial Reasoning: orientation flip/rotate, voxel stack builder & 3D die turns', () => {
  const defOrient = generatePlayablePuzzle({
    category: 'visual_puzzles',
    difficulty: 'easy',
    seed: 'SPATIAL-ORIENT',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'vp-easy-01',
  });
  let orientState = createInitialPuzzleState(defOrient);
  orientState = applyPuzzleAction(orientState, {
    type: 'spatial_command',
    command: 'flip_h',
  });
  assert.equal(getTargetSlotPreviewText(defOrient, orientState), '◑');
  const orientRes = validatePuzzleAnswer(defOrient, {
    puzzleId: defOrient.id,
    category: defOrient.category,
    selectedOptionId: '',
    submittedValue: orientState,
    interactionState: orientState,
    elapsedSeconds: 7,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(orientRes.isCorrect, true);

  const defVoxel = generatePlayablePuzzle({
    category: 'spatial_reasoning',
    difficulty: 'normal',
    seed: 'SPATIAL-VOXEL',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'sr-normal-02',
  });
  let voxelState = createInitialPuzzleState(defVoxel);
  voxelState = applyPuzzleAction(voxelState, { type: 'spatial_set_voxel', index: 0, height: 3 });
  voxelState = applyPuzzleAction(voxelState, { type: 'spatial_set_voxel', index: 1, height: 2 });
  voxelState = applyPuzzleAction(voxelState, { type: 'spatial_set_voxel', index: 2, height: 2 });
  voxelState = applyPuzzleAction(voxelState, { type: 'spatial_set_voxel', index: 3, height: 1 });
  assert.equal(getTargetSlotPreviewText(defVoxel, voxelState), '8 Cubes');

  const voxelRes = validatePuzzleAnswer(defVoxel, {
    puzzleId: defVoxel.id,
    category: defVoxel.category,
    selectedOptionId: '',
    submittedValue: voxelState,
    interactionState: voxelState,
    elapsedSeconds: 11,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(voxelRes.isCorrect, true);

  const defDie = generatePlayablePuzzle({
    category: 'spatial_reasoning',
    difficulty: 'hard',
    seed: 'SPATIAL-DIE',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'sr-hard-03',
  });
  let dieState = createInitialPuzzleState(defDie);
  dieState = applyPuzzleAction(dieState, { type: 'spatial_command', command: 'pitch_north' });
  dieState = applyPuzzleAction(dieState, { type: 'spatial_command', command: 'roll_east' });
  assert.equal(getTargetSlotPreviewText(defDie, dieState), 'Top: Face 4');

  const dieRes = validatePuzzleAnswer(defDie, {
    puzzleId: defDie.id,
    category: defDie.category,
    selectedOptionId: '',
    submittedValue: dieState,
    interactionState: dieState,
    elapsedSeconds: 15,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(dieRes.isCorrect, true);
});

test('7. Mechanic E, F, G, H — Logical Deduction, Cipher Code, Mathematical Reasoning & Memory Challenge', () => {
  // E: Logical Deduction (de-easy-01)
  const defDed = generatePlayablePuzzle({
    category: 'deduction_elimination',
    difficulty: 'easy',
    seed: 'DED-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'de-easy-01',
  });
  let dedState = createInitialPuzzleState(defDed);
  dedState = applyPuzzleAction(dedState, {
    type: 'deduction_cycle_cell',
    rowId: 'vault_1',
    colId: 'Red Core',
  });
  dedState = applyPuzzleAction(dedState, {
    type: 'deduction_cycle_cell',
    rowId: 'vault_1',
    colId: 'Red Core',
  });
  dedState = applyPuzzleAction(dedState, {
    type: 'deduction_assign',
    rowId: 'vault_2',
    colId: 'Blue Core',
  });
  dedState = applyPuzzleAction(dedState, {
    type: 'deduction_assign',
    rowId: 'vault_3',
    colId: 'Cyan Core',
  });
  assert.equal(isPuzzleStateComplete(defDed, dedState), true);
  assert.equal(
    validatePuzzleAnswer(defDed, {
      puzzleId: defDed.id,
      category: defDed.category,
      selectedOptionId: '',
      submittedValue: dedState,
      interactionState: dedState,
      elapsedSeconds: 16,
      hintsUsed: 0,
      attemptCount: 1,
    }).isCorrect,
    true
  );

  // F: Cipher Code (ss-hard-03)
  const defCipher = generatePlayablePuzzle({
    category: 'shape_symbol',
    difficulty: 'hard',
    seed: 'CIPHER-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'ss-hard-03',
  });
  let cipherState = createInitialPuzzleState(defCipher);
  cipherState = applyPuzzleAction(cipherState, { type: 'cipher_input_symbol', symbol: '◆' });
  cipherState = applyPuzzleAction(cipherState, { type: 'cipher_input_symbol', symbol: '●' });
  cipherState = applyPuzzleAction(cipherState, { type: 'cipher_backspace' });
  cipherState = applyPuzzleAction(cipherState, { type: 'cipher_input_symbol', symbol: '○' });
  assert.equal(
    validatePuzzleAnswer(defCipher, {
      puzzleId: defCipher.id,
      category: defCipher.category,
      selectedOptionId: '',
      submittedValue: cipherState,
      interactionState: cipherState,
      elapsedSeconds: 14,
      hintsUsed: 0,
      attemptCount: 1,
    }).isCorrect,
    true
  );

  // G: Mathematical Reasoning (ml-hard-08: alpha = 12)
  const defMathHard = generatePlayablePuzzle({
    category: 'mathematical_logic',
    difficulty: 'hard',
    seed: 'MATH-HARD-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'ml-hard-08',
  });
  let mathState = createInitialPuzzleState(defMathHard);
  mathState = applyPuzzleAction(mathState, {
    type: 'math_focus_variable',
    variableId: 'alpha',
  });
  mathState = applyPuzzleAction(mathState, { type: 'math_append_digit', digit: '1' });
  mathState = applyPuzzleAction(mathState, { type: 'math_append_digit', digit: '2' });
  assert.equal(isPuzzleStateComplete(defMathHard, mathState), true);
  assert.equal(
    validatePuzzleAnswer(defMathHard, {
      puzzleId: defMathHard.id,
      category: defMathHard.category,
      selectedOptionId: '',
      submittedValue: mathState,
      interactionState: mathState,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
    }).isCorrect,
    true
  );

  // H: Memory Challenge (mo-normal-06: flux = '88 Hz')
  const defMem = generatePlayablePuzzle({
    category: 'memory_observation',
    difficulty: 'normal',
    seed: 'MEM-FLUX-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'mo-normal-06',
  });
  let memState = createInitialPuzzleState(defMem);
  assert.equal(isPuzzleStateComplete(defMem, memState), false);
  memState = applyPuzzleAction(memState, { type: 'memory_start_recall' }, defMem.interactionSpec);
  memState = applyPuzzleAction(
    memState,
    { type: 'memory_select_token', tokenId: '88 Hz', targetId: 'flux' },
    defMem.interactionSpec
  );
  assert.equal(isPuzzleStateComplete(defMem, memState), true);
  assert.equal(
    validatePuzzleAnswer(defMem, {
      puzzleId: defMem.id,
      category: defMem.category,
      selectedOptionId: '',
      submittedValue: memState,
      interactionState: memState,
      elapsedSeconds: 18,
      hintsUsed: 0,
      attemptCount: 1,
    }).isCorrect,
    true
  );
});

test('8. Phase L2.2 "THE LOST LOGIC ARCHIVE" Campaign Architecture, Unlock Progression, Clues & Story Discoveries', () => {
  resetAllLocalGameStorage();

  assert.equal(ARCHIVE_CAMPAIGN_CHAPTERS.length, 2);
  assert.equal(ARCHIVE_CHAMBERS.length, 4);

  // Verify every chamber references 4 valid catalog puzzles
  for (const chamber of ARCHIVE_CHAMBERS) {
    assert.equal(chamber.puzzleIds.length, 4);
    for (const pid of chamber.puzzleIds) {
      const catEntry = getCatalogPuzzleById(pid);
      assert.ok(catEntry, `Chamber ${chamber.id} puzzle ${pid} must exist in PUZZLE_CATALOG`);
      assert.equal(getChamberForPuzzleId(pid)?.id, chamber.id);
    }
  }

  // Initial state: Only Chamber I is unlocked, 0 completed
  const initialStatuses = evaluateChamberStatuses([]);
  assert.equal(initialStatuses[0].isUnlocked, true);
  assert.equal(initialStatuses[0].isCompleted, false);
  assert.equal(initialStatuses[0].unlockedClues.length, 1); // Only initial clue unlocked
  assert.equal(initialStatuses[1].isUnlocked, false);
  assert.equal(initialStatuses[2].isUnlocked, false);
  assert.equal(initialStatuses[3].isUnlocked, false);

  // Solve the 4 puzzles of Chamber I ("chamber_threshold_axioms")
  const chamber1 = getChamberById('chamber_threshold_axioms')!;
  let lastCampaignState = loadCampaignProgress();
  assert.equal(lastCampaignState.completedChamberIds.length, 0);

  for (const [idx, pid] of chamber1.puzzleIds.entries()) {
    const def = generatePlayablePuzzle({
      category: getCatalogPuzzleById(pid)!.category,
      difficulty: getCatalogPuzzleById(pid)!.difficulty,
      seed: `CAMP-${pid}`,
      mode: 'collection_preview',
      puzzleSetVersion: 'v1',
      stageIndex: idx + 1,
      puzzleIdOverride: pid,
    });
    const winningState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winningState,
      interactionState: winningState,
      elapsedSeconds: 25,
      hintsUsed: 0,
      attemptCount: 1,
    });
    assert.equal(val.isCorrect, true);

    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 25,
      hintsUsed: 0,
      hintsEnabled: true,
      mode: 'collection_preview',
      previousBestScore: null,
    });

    const saved = recordPuzzleCompletion(res);
    lastCampaignState = saved.campaignProgress;
  }

  // Now Chamber I is completed, its story discovery & reward are unlocked, and Chamber II is unlocked!
  assert.ok(
    lastCampaignState.completedChamberIds.includes('chamber_threshold_axioms')
  );
  assert.ok(
    lastCampaignState.unlockedDiscoveryIds.includes('discovery_log_01')
  );
  assert.ok(lastCampaignState.unlockedRewardIds.includes('reward_chamber_01'));
  assert.equal(lastCampaignState.activeChamberId, 'chamber_prism_observatory');

  const statusesAfterChamber1 = evaluateChamberStatuses(
    loadCompletionRecords().records
  );
  assert.equal(statusesAfterChamber1[0].isCompleted, true);
  assert.equal(statusesAfterChamber1[0].isMechanismActive, true);
  assert.equal(statusesAfterChamber1[0].unlockedClues.length, 3);
  assert.equal(statusesAfterChamber1[1].isUnlocked, true);
  assert.equal(statusesAfterChamber1[1].isCompleted, false);

  // Verify next chamber puzzle recommendation advances to Chamber II
  const nextRecommended = getNextChamberPuzzle(
    'chamber_threshold_axioms',
    'ml-normal-02',
    loadCompletionRecords().records
  );
  assert.equal(nextRecommended?.id, 'pr-easy-01');

  // Verify keeper of the archive achievement unlocked
  const unlockedAchIds = loadAchievementsState().unlocked.map(
    (u) => u.achievementId
  );
  assert.ok(unlockedAchIds.includes('archive_restorer'));
});

test('9. Progressive 3-Tier Hints, Scoring Compatibility, Storage Persistence & NEX11 Event Bridge', () => {
  resetAllLocalGameStorage();

  const def = generatePlayablePuzzle({
    category: 'pattern_recognition',
    difficulty: 'easy',
    seed: 'HINT-SCORE-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'pr-easy-01',
  });

  // Progressive 3-tier hints
  const h0 = getProgressiveHint(def, 0);
  assert.equal(h0.unlockedHints.length, 0);
  assert.equal(h0.canRequestMore, true);

  const h1 = getProgressiveHint(def, 1);
  assert.equal(h1.unlockedHints.length, 1);
  assert.equal(h1.canRequestMore, true);

  const h2 = getProgressiveHint(def, 2);
  assert.equal(h2.unlockedHints.length, 2);
  assert.equal(h2.canRequestMore, true);

  const h3 = getProgressiveHint(def, 3);
  assert.equal(h3.unlockedHints.length, 3);
  assert.equal(h3.canRequestMore, false);

  // Flawless score (0 hints, 100% accuracy) > Hint-penalized score
  const scoreFlawless = calculatePuzzleScore({
    difficulty: def.difficulty,
    accuracyRatio: 1,
    elapsedSeconds: 10,
    hintsUsed: 0,
    hintsEnabled: true,
    scoringConfig: def.scoringConfig,
  });
  const scoreHinted = calculatePuzzleScore({
    difficulty: def.difficulty,
    accuracyRatio: 0.85,
    elapsedSeconds: 10,
    hintsUsed: 1,
    hintsEnabled: true,
    scoringConfig: def.scoringConfig,
  });
  assert.ok(scoreFlawless > scoreHinted);

  // Interactive state persistence across session save/load
  let activeState = createInitialPuzzleState(def);
  activeState = applyPuzzleAction(
    activeState,
    { type: 'pattern_select_primary', tokenId: '◆', cellId: 'c33' },
    def.interactionSpec
  );
  const wrongSig = getPuzzleStateSignature(activeState);

  saveAppSession({
    currentRoute: 'gameplay',
    activeCategory: 'pattern_recognition',
    collectionCategory: 'pattern_recognition',
    selectedPuzzleId: 'pr-easy-01',
    activeMode: 'quick_play',
    stageIndex: 1,
    lastResult: null,
    activeGameplaySession: {
      puzzleId: 'pr-easy-01',
      category: 'pattern_recognition',
      mode: 'quick_play',
      elapsedSeconds: 19,
      hintsUsed: 1,
      attemptCount: 1,
      selectedOptionId: wrongSig,
      interactionState: activeState,
      lastWrongSubmissionSignature: wrongSig,
      pendingResult: null,
      updatedAtIso: new Date().toISOString(),
    },
  });

  const restored = loadAppSession();
  assert.equal(restored.activeGameplaySession?.interactionState?.type, 'pattern_recognition');
  assert.equal(restored.activeGameplaySession?.lastWrongSubmissionSignature, wrongSig);

  // Solve and verify recordPuzzleCompletion + duplicate protection + NEX11 bridge
  activeState = applyPuzzleAction(
    activeState,
    { type: 'pattern_select_primary', tokenId: '▲', cellId: 'c33' },
    def.interactionSpec
  );
  const validation = validatePuzzleAnswer(def, {
    puzzleId: def.id,
    category: def.category,
    selectedOptionId: '',
    submittedValue: activeState,
    interactionState: activeState,
    elapsedSeconds: 22,
    hintsUsed: 1,
    attemptCount: 2,
  });
  assert.equal(validation.isCorrect, true);

  const result = buildValidatedPuzzleResult({
    definition: def,
    validation,
    elapsedSeconds: 22,
    hintsUsed: 1,
    hintsEnabled: true,
    mode: 'quick_play',
    previousBestScore: null,
  });
  assert.equal(result.puzzleType, 'pattern_recognition');

  let bridgeCalledCount = 0;
  const unsub = registerNex11CompletionListener((evt) => {
    if (evt.gameId === LOGIC_QUEST_GAME_ID && evt.puzzleId === def.id) {
      bridgeCalledCount += 1;
    }
  });
  emitNex11CompletionEvent(result);
  assert.equal(bridgeCalledCount, 1);
  unsub();

  const recorded = recordPuzzleCompletion(result);
  assert.equal(recorded.progress.totalPuzzlesCompleted, 1);
  const xpAfterFirst = recorded.progress.totalXp;

  // Duplicate submission with identical completionId must not award duplicate XP
  const duplicateRecorded = recordPuzzleCompletion(result);
  assert.equal(duplicateRecorded.progress.totalPuzzlesCompleted, 1);
  assert.equal(duplicateRecorded.progress.totalXp, xpAfterFirst);

  assert.equal(isCatalogPuzzleSolved('pr-easy-01', recorded.recordsPayload.records), true);
  assert.equal(getRecordsForCatalogPuzzle('pr-easy-01', recorded.recordsPayload.records).length, 1);
  assert.notEqual(getNextCatalogPuzzle('pr-easy-01').id, 'pr-easy-01');

  // Verify Daily Puzzle determinism & claim check
  const fixedDate = new Date('2026-05-15T12:00:00.000Z');
  assert.equal(getUtcDateKey(fixedDate), '2026-05-15');
  const dailyDesc = getDailyPuzzleDescriptor(fixedDate);
  assert.equal(canClaimDailyReward(dailyDesc, loadDailyCompletionState()), true);
  assert.equal(matchesCatalogPuzzleId('DAILY-2026-05-15-PR-EASY-01', 'pr-easy-01'), true);
  assert.ok(calculateXpEarned(600, 'normal', 'daily') > 0);
  assert.equal(getXpRequiredForLevel(1), 500);

  // Settings & full storage reset
  saveSettings({ ...loadSettings(), difficulty: 'hard' });
  assert.equal(loadSettings().difficulty, 'hard');
  resetAllLocalGameStorage();
  assert.equal(loadPlayerProgress().totalPuzzlesCompleted, 0);
  assert.equal(loadCompletionRecords().records.length, 0);
  assert.equal(loadAchievementsState().unlocked.length, 0);
  assert.equal(loadCampaignProgress().completedChamberIds.length, 0);
  saveActiveGameplaySession(null);
});

test('10. Phase L2.3 Game Modes & Complete Player Experience: Mechanic Distribution Audit, Quick Play, Daily Challenge, Archive & Practice Replay Protection', () => {
  resetAllLocalGameStorage();

  // A. Programmatic Mechanic Distribution Audit (resolving L2.2 sequence_puzzle report typo)
  const counts = getCatalogMechanicCounts();
  assert.equal(counts.sequence_puzzle, 12);
  assert.equal(counts.pattern_recognition, 12);
  assert.equal(counts.spatial_reasoning, 10);
  assert.equal(counts.mathematical_reasoning, 8);
  assert.equal(counts.cipher_code, 7);
  assert.equal(counts.memory_challenge, 7);
  assert.equal(counts.logical_deduction, 6);
  assert.equal(counts.multiple_choice, 2);

  const totalFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(totalFromCounts, 64);

  // B. Quick Play Filtering & Non-Repeating Smart Selection
  const easySeqPool = filterCatalogPuzzles({
    category: 'number_sequences',
    difficulty: 'easy',
    status: 'all',
    completionRecords: [],
  });
  assert.equal(easySeqPool.length, 3);

  const qpFirst = selectQuickPlayPuzzle({
    categoryFilter: 'number_sequences',
    difficulty: 'easy',
    completionRecords: [],
    seedIndex: 0,
  });
  assert.equal(qpFirst.category, 'number_sequences');
  assert.equal(qpFirst.difficulty, 'easy');

  const qpNext = selectQuickPlayPuzzle({
    categoryFilter: 'number_sequences',
    difficulty: 'easy',
    currentPuzzleId: qpFirst.id,
    recentPuzzleIds: [qpFirst.id],
    completionRecords: [],
    seedIndex: 0,
  });
  assert.notEqual(
    qpNext.id,
    qpFirst.id,
    'Quick Play smart selection must avoid immediate repetition when alternatives exist'
  );

  const qpSpecific = selectQuickPlayPuzzle({
    categoryFilter: 'all',
    difficulty: 'hard',
    selectionType: 'specific',
    specificPuzzleId: 'ns-hard-03',
    completionRecords: [],
  });
  assert.equal(qpSpecific.id, 'ns-hard-03');

  // C. Daily Challenge Local-Date Determinism, Completion & Date Rollover
  const day1Date = new Date(2026, 4, 15, 10, 30, 0); // Local 2026-05-15
  const day2Date = new Date(2026, 4, 16, 10, 30, 0); // Local 2026-05-16
  assert.equal(getLocalDateKey(day1Date), '2026-05-15');
  assert.equal(getLocalDateKey(day2Date), '2026-05-16');

  const descDay1A = getDailyPuzzleDescriptor(day1Date);
  const descDay1B = getDailyPuzzleDescriptor(day1Date);
  assert.equal(descDay1A.dailyId, descDay1B.dailyId);
  assert.equal(descDay1A.featuredPuzzleId, descDay1B.featuredPuzzleId);
  assert.ok(getCatalogPuzzleById(descDay1A.featuredPuzzleId));

  const statusBeforeSolve = getDailyChallengeStatus(
    descDay1A,
    loadDailyCompletionState()
  );
  assert.equal(statusBeforeSolve.isCompleted, false);
  assert.equal(statusBeforeSolve.canClaimReward, true);

  // Solve Day 1 Daily Challenge
  const dailyDef = generatePlayablePuzzle({
    category: descDay1A.category,
    difficulty: descDay1A.difficulty,
    seed: descDay1A.deterministicSeed,
    mode: 'daily',
    puzzleSetVersion: 'v1',
    stageIndex: descDay1A.dayIndex,
    puzzleIdOverride: descDay1A.featuredPuzzleId,
    utcDateKey: descDay1A.utcDateString,
  });
  const dailyWinState = constructWinningStateForPuzzle(dailyDef);
  const dailyVal = validatePuzzleAnswer(dailyDef, {
    puzzleId: dailyDef.id,
    category: dailyDef.category,
    selectedOptionId: '',
    submittedValue: dailyWinState,
    interactionState: dailyWinState,
    elapsedSeconds: 30,
    hintsUsed: 0,
    attemptCount: 1,
  });
  assert.equal(dailyVal.isCorrect, true);

  const dailyResult1 = buildValidatedPuzzleResult({
    definition: dailyDef,
    validation: dailyVal,
    elapsedSeconds: 30,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'daily',
    previousBestScore: null,
    dailyAlreadyClaimed: false,
    modeMetadata: {
      dailyDateKey: descDay1A.utcDateString,
      dailyId: descDay1A.dailyId,
    },
  });
  assert.ok(dailyResult1.xpEarned > 0);

  const afterDaily1 = recordPuzzleCompletion(dailyResult1, descDay1A);
  const xpAfterDaily1 = afterDaily1.progress.totalXp;
  const solvedCountAfterDaily1 = afterDaily1.progress.totalPuzzlesCompleted;
  assert.equal(solvedCountAfterDaily1, 1);

  const statusAfterSolve = getDailyChallengeStatus(
    descDay1A,
    afterDaily1.dailyState
  );
  assert.equal(statusAfterSolve.isCompleted, true);
  assert.equal(statusAfterSolve.canClaimReward, false);
  assert.equal(statusAfterSolve.completedRecord?.score, dailyResult1.score);

  // Replaying the same day's Daily Challenge must award 0 duplicate XP and not inflate totalPuzzlesCompleted
  const dailyReplayResult = buildValidatedPuzzleResult({
    definition: dailyDef,
    validation: dailyVal,
    elapsedSeconds: 22,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'daily',
    previousBestScore: dailyResult1.score,
    dailyAlreadyClaimed: true,
  });
  assert.equal(dailyReplayResult.xpEarned, 0);

  const afterDailyReplay = recordPuzzleCompletion(dailyReplayResult, descDay1A);
  assert.equal(afterDailyReplay.progress.totalXp, xpAfterDaily1);
  assert.equal(
    afterDailyReplay.progress.totalPuzzlesCompleted,
    solvedCountAfterDaily1
  );

  // Date rollover to Day 2: Day 2 is Available while Day 1 remains Completed in history
  const descDay2 = getDailyPuzzleDescriptor(day2Date);
  const statusDay2 = getDailyChallengeStatus(
    descDay2,
    afterDailyReplay.dailyState
  );
  assert.equal(statusDay2.isCompleted, false);
  assert.equal(statusDay2.canClaimReward, true);
  assert.ok(afterDailyReplay.dailyState.completedByDate['2026-05-15']);

  // D. Practice Mode First Solve vs Replay Protection
  const practicePuzzleId = 'vp-easy-04';
  const practiceEntry = getCatalogPuzzleById(practicePuzzleId)!;
  const practiceDef = generatePlayablePuzzle({
    category: practiceEntry.category,
    difficulty: practiceEntry.difficulty,
    seed: `PRACTICE-${practicePuzzleId}`,
    mode: 'practice',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: practicePuzzleId,
  });
  const practiceWinState = constructWinningStateForPuzzle(practiceDef);
  const practiceVal = validatePuzzleAnswer(practiceDef, {
    puzzleId: practiceDef.id,
    category: practiceDef.category,
    selectedOptionId: '',
    submittedValue: practiceWinState,
    interactionState: practiceWinState,
    elapsedSeconds: 40,
    hintsUsed: 1,
    attemptCount: 2,
  });
  assert.equal(practiceVal.isCorrect, true);

  // 1st solve in Practice Mode awards XP and increments solved count
  const practiceFirstResult = buildValidatedPuzzleResult({
    definition: practiceDef,
    validation: practiceVal,
    elapsedSeconds: 40,
    hintsUsed: 1,
    attemptCount: 2,
    hintsEnabled: true,
    mode: 'practice',
    previousBestScore: null,
    isReplayOfSolvedPuzzle: false,
  });
  assert.ok(practiceFirstResult.xpEarned > 0);

  const afterPracticeFirst = recordPuzzleCompletion(practiceFirstResult);
  const xpAfterPracticeFirst = afterPracticeFirst.progress.totalXp;
  const solvedAfterPracticeFirst =
    afterPracticeFirst.progress.totalPuzzlesCompleted;
  assert.equal(solvedAfterPracticeFirst, solvedCountAfterDaily1 + 1);

  // Replay of already-solved puzzle in Practice Mode awards 0 duplicate XP and does NOT inflate solved count, but updates personal best score
  const practiceValFaster = validatePuzzleAnswer(practiceDef, {
    puzzleId: practiceDef.id,
    category: practiceDef.category,
    selectedOptionId: '',
    submittedValue: practiceWinState,
    interactionState: practiceWinState,
    elapsedSeconds: 10,
    hintsUsed: 0,
    attemptCount: 1,
  });
  const practiceReplayResult = buildValidatedPuzzleResult({
    definition: practiceDef,
    validation: practiceValFaster,
    elapsedSeconds: 10,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'practice',
    previousBestScore: practiceFirstResult.score,
    isReplayOfSolvedPuzzle: true,
  });
  assert.equal(practiceReplayResult.xpEarned, 0);
  assert.ok(practiceReplayResult.score > practiceFirstResult.score);

  const afterPracticeReplay = recordPuzzleCompletion(practiceReplayResult);
  assert.equal(afterPracticeReplay.progress.totalXp, xpAfterPracticeFirst);
  assert.equal(
    afterPracticeReplay.progress.totalPuzzlesCompleted,
    solvedAfterPracticeFirst
  );
  assert.equal(
    afterPracticeReplay.progress.categoryStats[practiceEntry.category].bestScore,
    practiceReplayResult.score
  );

  // E. Session Persistence for activeHubTab & quickPlayConfig
  const qpCfg = createDefaultQuickPlayConfig('hard');
  qpCfg.categoryFilter = 'spatial_reasoning';
  qpCfg.selectionType = 'specific';
  qpCfg.selectedPuzzleId = 'sr-hard-03';

  saveAppSession({
    currentRoute: 'collection',
    activeCategory: 'spatial_reasoning',
    collectionCategory: 'spatial_reasoning',
    selectedPuzzleId: 'sr-hard-03',
    activeMode: 'archive',
    activeHubTab: 'archive',
    quickPlayConfig: qpCfg,
    stageIndex: 3,
    lastResult: null,
    activeGameplaySession: null,
  });

  const restoredSession = loadAppSession();
  assert.equal(restoredSession.activeMode, 'quick_play');
  assert.equal(restoredSession.activeHubTab, 'archive');
  assert.equal(restoredSession.quickPlayConfig?.categoryFilter, 'spatial_reasoning');
  assert.equal(restoredSession.quickPlayConfig?.difficulty, 'hard');
  assert.equal(restoredSession.quickPlayConfig?.selectionType, 'specific');
  assert.equal(restoredSession.quickPlayConfig?.selectedPuzzleId, 'sr-hard-03');

  resetAllLocalGameStorage();
});

test('11. L2.3 Revision: Daily Streak Removal, Win Streak & 8-Win Milestone Cycle, Three Daily Challenges & Simplified Puzzle Library', () => {
  resetAllLocalGameStorage();

  // 1. Verify Daily Streak is completely removed from PlayerGameProgress and replaced by Win Streak fields
  const initProgress = loadPlayerProgress();
  assert.equal('currentDailyStreak' in initProgress, false);
  assert.equal(initProgress.currentWinStreak, 0);
  assert.equal(initProgress.bestWinStreak, 0);
  assert.equal(initProgress.winsTowardNextMilestone, 0);
  assert.equal(initProgress.winStreakMilestonesAchieved, 0);
  assert.equal(WIN_STREAK_MILESTONE_TARGET, 8);
  assert.equal(WIN_STREAK_MILESTONE_XP_REWARD, 250);

  // 2. Verify Win Streak increments on consecutive valid puzzle wins, reaches 8-win milestone, and resets on abandonment
  const eightPuzzleIds = PUZZLE_CATALOG.slice(0, 10).map((p) => p.id);

  // Solve first 5 distinct puzzles -> 5/8 toward milestone
  for (let i = 0; i < 5; i += 1) {
    const pid = eightPuzzleIds[i];
    const entry = getCatalogPuzzleById(pid)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `STREAK-${pid}`,
      mode: 'quick_play',
      puzzleSetVersion: 'v1',
      stageIndex: i + 1,
      puzzleIdOverride: pid,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'quick_play',
      previousBestScore: null,
    });
    const saved = recordPuzzleCompletion(res);
    assert.equal(saved.progress.currentWinStreak, i + 1);
    assert.equal(saved.progress.bestWinStreak, i + 1);
    assert.equal(saved.progress.winsTowardNextMilestone, i + 1);
    assert.equal(saved.progress.winStreakMilestonesAchieved, 0);
  }

  // Replaying an already completed puzzle (eightPuzzleIds[0]) must NOT increment Win Streak
  {
    const replayPid = eightPuzzleIds[0];
    const entry = getCatalogPuzzleById(replayPid)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `STREAK-REPLAY-${replayPid}`,
      mode: 'quick_play',
      puzzleSetVersion: 'v1',
      stageIndex: 99,
      puzzleIdOverride: replayPid,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 15,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const replayRes = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 15,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'quick_play',
      previousBestScore: 500,
    });
    const afterReplay = recordPuzzleCompletion(replayRes);
    assert.equal(afterReplay.progress.currentWinStreak, 5);
    assert.equal(afterReplay.progress.winsTowardNextMilestone, 5);
  }

  // Abandoning an unsolved puzzle session resets currentWinStreak & winsTowardNextMilestone to 0, preserving bestWinStreak = 5
  const afterAbandon = recordPuzzleFailureOrAbandonment(eightPuzzleIds[5]);
  assert.equal(afterAbandon.currentWinStreak, 0);
  assert.equal(afterAbandon.winsTowardNextMilestone, 0);
  assert.equal(afterAbandon.bestWinStreak, 5);

  // Leaving a replay of an already solved puzzle does NOT reset the active win streak
  // Now solve 8 new distinct puzzles (indices 5..12) to reach the 8-Win Milestone!
  const nextEightIds = PUZZLE_CATALOG.slice(5, 13).map((p) => p.id);
  for (let i = 0; i < 8; i += 1) {
    const pid = nextEightIds[i];
    const entry = getCatalogPuzzleById(pid)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `MILESTONE-${pid}`,
      mode: 'quick_play',
      puzzleSetVersion: 'v1',
      stageIndex: i + 10,
      puzzleIdOverride: pid,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 18,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 18,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'quick_play',
      previousBestScore: null,
    });

    const xpBefore = loadPlayerProgress().totalXp;
    const saved = recordPuzzleCompletion(res);

    if (i < 7) {
      assert.equal(saved.progress.currentWinStreak, i + 1);
      assert.equal(saved.progress.winsTowardNextMilestone, i + 1);
      assert.equal(saved.progress.winStreakMilestonesAchieved, 0);
      assert.equal(res.winStreakMilestoneReached, false);
    } else {
      // 8th consecutive win!
      assert.equal(saved.progress.currentWinStreak, 8);
      assert.equal(saved.progress.bestWinStreak, 8);
      assert.equal(saved.progress.winsTowardNextMilestone, 0); // Starts next 8-win cycle
      assert.equal(saved.progress.winStreakMilestonesAchieved, 1);
      assert.equal(res.winStreakMilestoneReached, true);
      assert.equal(
        res.winStreakMilestoneXpAwarded,
        WIN_STREAK_MILESTONE_XP_REWARD
      );
      assert.equal(
        saved.progress.totalXp,
        xpBefore + res.xpEarned
      );
      assert.ok(
        res.xpEarned >=
          (res.basePuzzleXpAwarded ?? 0) + WIN_STREAK_MILESTONE_XP_REWARD
      );

      // Verify 'win_streak_8' achievement unlocked
      const achIds = saved.unlockedAchievements.map((u) => u.achievementId);
      assert.ok(achIds.includes('win_streak_8'));

      // Duplicate completionId submission must not duplicate milestone reward
      const dupSaved = recordPuzzleCompletion(res);
      assert.equal(dupSaved.progress.winStreakMilestonesAchieved, 1);
      assert.equal(dupSaved.progress.totalXp, saved.progress.totalXp);
    }
  }

  // 3. Verify Three Daily Challenges per Date (3 unique IDs, determinism, 0/3 -> 3/3 completion, history)
  const testDateA = new Date(2026, 7, 20, 9, 0, 0); // 2026-08-20
  const testDateB = new Date(2026, 7, 21, 9, 0, 0); // 2026-08-21

  const challengesA1 = getDailyChallengesForDate(testDateA);
  const challengesA2 = getDailyChallengesForDate(testDateA);
  assert.equal(challengesA1.length, 3);
  assert.deepEqual(challengesA1, challengesA2);

  // Verify Challenge #1 is Easy, #2 is Normal, #3 is Hard, and all 3 puzzle IDs are distinct
  assert.equal(challengesA1[0].challengeNumber, 1);
  assert.equal(challengesA1[0].difficulty, 'easy');
  assert.equal(challengesA1[1].challengeNumber, 2);
  assert.equal(challengesA1[1].difficulty, 'normal');
  assert.equal(challengesA1[2].challengeNumber, 3);
  assert.equal(challengesA1[2].difficulty, 'hard');

  const uniqueDailyIds = new Set(challengesA1.map((c) => c.featuredPuzzleId));
  assert.equal(
    uniqueDailyIds.size,
    3,
    'Three Daily Challenges on the same day must have 3 unique puzzle IDs'
  );

  // Verify across 365 consecutive calendar days that every day produces 3 unique puzzle IDs
  for (let d = 0; d < 365; d += 1) {
    const dt = new Date(2026, 0, 1 + d, 12, 0, 0);
    const trio = getDailyChallengesForDate(dt);
    const idSet = new Set(trio.map((c) => c.featuredPuzzleId));
    assert.equal(idSet.size, 3, `Day offset ${d} must have 3 distinct daily puzzles`);
  }

  // Verify 0/3 -> 1/3 -> 2/3 -> 3/3 independent completion records for testDateA
  const sum0 = getDailySetSummary(testDateA, loadDailyCompletionState());
  assert.equal(sum0.completedCount, 0);
  assert.equal(sum0.isAllCompleted, false);

  for (let idx = 0; idx < 3; idx += 1) {
    const desc = challengesA1[idx];
    const entry = getCatalogPuzzleById(desc.featuredPuzzleId)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: desc.deterministicSeed,
      mode: 'daily',
      puzzleSetVersion: 'v1',
      stageIndex: desc.dayIndex,
      puzzleIdOverride: desc.featuredPuzzleId,
      utcDateKey: desc.dateKey,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 24,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const dailyRes = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 24,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'daily',
      previousBestScore: null,
      dailyAlreadyClaimed: false,
      modeMetadata: {
        dailyDateKey: desc.dateKey,
        dailyId: desc.dailyId,
        dailyChallengeNumber: desc.challengeNumber,
      },
    });
    const recorded = recordPuzzleCompletion(dailyRes, desc);
    const sumAfter = getDailySetSummary(testDateA, recorded.dailyState);
    assert.equal(sumAfter.completedCount, idx + 1);
    assert.equal(sumAfter.isAllCompleted, idx === 2);
  }

  // Date rollover to testDateB shows 0/3 while testDateA remains 3/3 in history
  const sumNextDay = getDailySetSummary(testDateB, loadDailyCompletionState());
  assert.equal(sumNextDay.completedCount, 0);
  const sumPrevDay = getDailySetSummary(testDateA, loadDailyCompletionState());
  assert.equal(sumPrevDay.completedCount, 3);
  assert.equal(sumPrevDay.isAllCompleted, true);

  resetAllLocalGameStorage();
});

test('12. Phase L2.4 Progression Engine, 12 Achievements, Audio Controls/Mute & Persistence/Selective Reset', () => {
  resetAllLocalGameStorage();

  // --- PART A: Audio Preferences, Volume Multipliers, Strict Mute & Lifecycle ---
  soundEngine.resetDiagnosticsCounter();
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 50,
    musicEnabled: true,
    musicVolume: 50,
  });

  const diagActive = soundEngine.getAudioDiagnostics();
  assert.equal(diagActive.masterMuted, false);
  assert.equal(diagActive.effectiveSfxGain, 0.4); // 0.8 * 0.5
  assert.equal(diagActive.effectiveMusicGain, 0.4);
  assert.equal(diagActive.isAmbientPlaying, true);

  soundEngine.playClick();
  soundEngine.playPuzzleInteract();
  soundEngine.playCompletionChord();
  soundEngine.playLevelUp();
  soundEngine.playWinStreakMilestone();
  soundEngine.playAchievementUnlock();
  assert.equal(soundEngine.getAudioDiagnostics().playedSoundCount, 6);
  assert.equal(
    soundEngine.getAudioDiagnostics().lastPlayedSound,
    'achievement_unlock'
  );

  // Master Mute strictly blocks all SFX and stops ambient music
  soundEngine.resetDiagnosticsCounter();
  soundEngine.syncPreferences({
    masterMuted: true,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 100,
    musicEnabled: true,
    musicVolume: 100,
  });
  assert.equal(soundEngine.getEffectiveSfxMultiplier(), 0);
  assert.equal(soundEngine.getEffectiveMusicMultiplier(), 0);
  assert.equal(soundEngine.getAudioDiagnostics().isAmbientPlaying, false);

  soundEngine.playClick();
  soundEngine.playHover();
  soundEngine.playWrongAnswer();
  soundEngine.playHintChime();
  soundEngine.playDailyChallengeComplete();
  soundEngine.playArchiveMechanismActivate();
  assert.equal(
    soundEngine.getAudioDiagnostics().playedSoundCount,
    0,
    'No sound effect may play while masterMuted is true'
  );

  // Unmuting master but disabling SFX blocks SFX while allowing music
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 100,
    soundEffectsEnabled: false,
    sfxVolume: 100,
    musicEnabled: true,
    musicVolume: 60,
  });
  assert.equal(soundEngine.getEffectiveSfxMultiplier(), 0);
  assert.equal(soundEngine.getEffectiveMusicMultiplier(), 0.6);
  soundEngine.playClick();
  assert.equal(soundEngine.getAudioDiagnostics().playedSoundCount, 0);

  soundEngine.dispose();
  assert.equal(soundEngine.getAudioDiagnostics().isAmbientPlaying, false);

  // --- PART B: 12 Achievements, Live Progress, Chamber/Daily Triad Bonuses & Level-Up ---
  resetAllLocalGameStorage();
  assert.equal(ACHIEVEMENT_DEFINITIONS.length, 12);

  const initialAchProgress = evaluateAchievementProgress();
  assert.equal(initialAchProgress.length, 12);
  assert.equal(initialAchProgress.every((a) => !a.isUnlocked), true);

  // Solve all 64 catalog puzzles in sequence (which also completes all 4 Archive Chambers,
  // all 8 categories, all 16 Hard puzzles, 0-hint solves, and 8-win milestones)
  let totalMilestonesReached = 0;
  let totalChambersNewlyCompleted = 0;
  let didExperienceLevelUp = false;

  for (const [idx, entry] of PUZZLE_CATALOG.entries()) {
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `L24-FULL-${entry.id}`,
      mode: 'archive',
      puzzleSetVersion: 'v1',
      stageIndex: idx + 1,
      puzzleIdOverride: entry.id,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 15,
      hintsUsed: 0,
      attemptCount: 1,
    });
    assert.equal(val.isCorrect, true);

    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 15,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'archive',
      previousBestScore: null,
    });

    recordPuzzleCompletion(res);
    if (res.winStreakMilestoneReached) {
      totalMilestonesReached += 1;
    }
    if (res.newlyCompletedChamberIds && res.newlyCompletedChamberIds.length > 0) {
      totalChambersNewlyCompleted += res.newlyCompletedChamberIds.length;
      assert.equal(
        res.archiveChamberBonusXpAwarded,
        res.newlyCompletedChamberIds.length * ARCHIVE_CHAMBER_COMPLETION_XP_REWARD
      );
    }
    if (res.didLevelUp) {
      didExperienceLevelUp = true;
      assert.ok((res.newLevel ?? 1) > (res.previousLevel ?? 1));
    }
  }

  assert.equal(totalMilestonesReached, 8); // 64 / 8 = 8 milestones
  assert.equal(totalChambersNewlyCompleted, 4); // All 4 chambers restored
  assert.equal(didExperienceLevelUp, true);

  const progAfter64 = loadPlayerProgress();
  assert.equal(progAfter64.totalPuzzlesCompleted, 64);
  assert.equal(progAfter64.currentWinStreak, 64);
  assert.equal(progAfter64.bestWinStreak, 64);
  assert.equal(progAfter64.winStreakMilestonesAchieved, 8);
  assert.equal(progAfter64.winStreakMilestoneHistory?.length, 8);
  assert.ok(progAfter64.level > 5);

  // Complete a full 3/3 Daily Challenge Triad on a single date to unlock 'daily_initiate' & 'daily_triad'
  const triadDate = new Date(2026, 9, 10, 12, 0, 0);
  const triadDescriptors = getDailyChallengesForDate(triadDate);
  let sawDailyTriadBonus = false;

  for (const desc of triadDescriptors) {
    const entry = getCatalogPuzzleById(desc.featuredPuzzleId)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: desc.deterministicSeed,
      mode: 'daily',
      puzzleSetVersion: 'v1',
      stageIndex: desc.dayIndex,
      puzzleIdOverride: desc.featuredPuzzleId,
      utcDateKey: desc.dateKey,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const dailyRes = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 20,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'daily',
      previousBestScore: null,
      dailyAlreadyClaimed: false,
      modeMetadata: {
        dailyDateKey: desc.dateKey,
        dailyId: desc.dailyId,
        dailyChallengeNumber: desc.challengeNumber,
      },
    });
    recordPuzzleCompletion(dailyRes, desc);
    if (dailyRes.completedDailySetToday) {
      sawDailyTriadBonus = true;
      assert.equal(
        dailyRes.dailySetBonusXpAwarded,
        DAILY_SET_COMPLETION_XP_REWARD
      );
    }
  }
  assert.equal(sawDailyTriadBonus, true);

  // Verify all 12 achievements are now unlocked and at 100% progress
  const finalAchProgress = evaluateAchievementProgress();
  assert.equal(finalAchProgress.length, 12);
  for (const item of finalAchProgress) {
    assert.equal(
      item.isUnlocked,
      true,
      `Achievement ${item.definition.id} should be unlocked`
    );
    assert.equal(item.progressPercent, 100);
    assert.equal(item.currentValue, item.targetValue);
  }

  // --- PART C: Selective Reset (Gameplay Progress Only vs Settings Only) & Corrupted Storage Recovery ---
  saveSettings({
    masterMuted: true,
    masterVolume: 35,
    soundEffectsEnabled: false,
    sfxVolume: 25,
    musicEnabled: true,
    musicVolume: 70,
    difficulty: 'hard',
    hintsEnabled: false,
    theme: 'light',
  });

  // Reset ONLY gameplay progress -> must preserve custom audio & theme settings
  const afterProgressReset = resetGameplayProgressOnly();
  assert.equal(afterProgressReset.progress.totalPuzzlesCompleted, 0);
  assert.equal(afterProgressReset.progress.totalXp, 0);
  assert.equal(afterProgressReset.records.records.length, 0);
  assert.equal(afterProgressReset.achievements.unlocked.length, 0);
  assert.equal(afterProgressReset.campaign.completedChamberIds.length, 0);

  const preservedSettings = loadSettings();
  assert.equal(preservedSettings.masterMuted, true);
  assert.equal(preservedSettings.masterVolume, 35);
  assert.equal(preservedSettings.soundEffectsEnabled, false);
  assert.equal(preservedSettings.sfxVolume, 25);
  assert.equal(preservedSettings.musicEnabled, true);
  assert.equal(preservedSettings.musicVolume, 70);
  assert.equal(preservedSettings.difficulty, 'hard');
  assert.equal(preservedSettings.hintsEnabled, false);
  assert.equal(preservedSettings.theme, 'light');

  // Reset ONLY settings -> restores default settings
  const restoredDefaults = resetSettingsOnly();
  assert.equal(restoredDefaults.masterMuted, false);
  assert.equal(restoredDefaults.masterVolume, 80);
  assert.equal(restoredDefaults.soundEffectsEnabled, true);
  assert.equal(restoredDefaults.theme, 'dark');

  // Legacy L1-L2.3 settings migration (envelope without masterMuted/masterVolume/sfxVolume/musicVolume)
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify({
        schemaVersion: 1,
        updatedAtIso: new Date().toISOString(),
        data: {
          musicEnabled: true,
          soundEffectsEnabled: false,
          difficulty: 'hard',
          hintsEnabled: true,
          theme: 'light',
        },
      })
    );
    const migrated = loadSettings();
    assert.equal(migrated.musicEnabled, true);
    assert.equal(migrated.soundEffectsEnabled, false);
    assert.equal(migrated.masterMuted, false);
    assert.equal(migrated.masterVolume, 80);
    assert.equal(migrated.sfxVolume, 85);
    assert.equal(migrated.musicVolume, 45);

    // Corrupted JSON recovery test
    window.localStorage.setItem(STORAGE_KEYS.PROGRESS, '{malformed_json:true');
    const recoveredProg = loadPlayerProgress();
    assert.equal(recoveredProg.level, 1);
    assert.ok(getRecoveredStorageKeys().includes(STORAGE_KEYS.PROGRESS));
  }

  resetAllLocalGameStorage();
});

test('13. Phase L2.5 Preparation & Feature Correction: Quick Play Non-Repeating Session Pool, Daily 1->2->3 Sequence, Easy/Regular/Hard 3-Option Difficulty System, Regular Adaptive Mixed Pool & Per-Category Overrides', () => {
  resetAllLocalGameStorage();

  // --- PART A: Three User-Facing Difficulty Options Only (Easy, Regular, Hard) ---
  assert.deepEqual(DIFFICULTY_PREFERENCE_ORDER, ['easy', 'normal', 'hard']);
  assert.equal(formatDifficultyLabel('easy'), 'Easy');
  assert.equal(formatDifficultyLabel('normal'), 'Regular');
  assert.equal(formatDifficultyLabel('hard'), 'Hard');
  // Legacy 'auto' and 'regular' normalize and format cleanly to 'Regular' ('normal')
  assert.equal(normalizeDifficultyPreference('auto'), 'normal');
  assert.equal(normalizeDifficultyPreference('regular'), 'normal');
  assert.equal(formatDifficultyLabel('auto'), 'Regular');

  // --- PART B: Quick Play Session Non-Repeating Pool & Automatic Refresh on Exhaustion ---
  // Hard difficulty across all 8 categories has 8 * 2 = 16 puzzles
  let sessionPlayedIds: string[] = [];
  let lastPuzzleId: string | null = null;
  const seenInFirstCycle = new Set<string>();

  for (let i = 0; i < 16; i += 1) {
    const step = selectNextQuickPlaySessionPuzzle({
      categoryFilter: 'all',
      difficulty: 'hard',
      difficultyPreference: 'hard',
      currentPuzzleId: lastPuzzleId,
      sessionPlayedPuzzleIds: sessionPlayedIds,
      completionRecords: [],
      seedIndex: i + 1,
    });
    assert.equal(step.puzzle.difficulty, 'hard');
    assert.equal(
      seenInFirstCycle.has(step.puzzle.id),
      false,
      `Hard Quick Play puzzle ${step.puzzle.id} must not repeat before all 16 hard puzzles are played`
    );
    seenInFirstCycle.add(step.puzzle.id);
    sessionPlayedIds = step.updatedSessionPlayedIds;
    lastPuzzleId = step.puzzle.id;
  }

  assert.equal(seenInFirstCycle.size, 16);
  assert.equal(sessionPlayedIds.length, 16);

  // 17th selection: all 16 Hard puzzles were played -> pool must refresh seamlessly without throwing or repeating the 16th puzzle immediately
  const stepAfterExhaustion = selectNextQuickPlaySessionPuzzle({
    categoryFilter: 'all',
    difficulty: 'hard',
    difficultyPreference: 'hard',
    currentPuzzleId: lastPuzzleId,
    sessionPlayedPuzzleIds: sessionPlayedIds,
    completionRecords: [],
    seedIndex: 17,
  });
  assert.equal(stepAfterExhaustion.poolExhaustedAndRefreshed, true);
  assert.equal(stepAfterExhaustion.puzzle.difficulty, 'hard');
  assert.notEqual(stepAfterExhaustion.puzzle.id, lastPuzzleId);
  assert.equal(stepAfterExhaustion.updatedSessionPlayedIds.length, 1);

  // --- PART C: Daily Challenges Strict 1 -> 2 -> 3 Sequential Progression & Resume ---
  const testDate = new Date(2026, 10, 8, 9, 0, 0);
  const dailyTriad = getDailyChallengesForDate(testDate);
  assert.equal(dailyTriad.length, 3);
  assert.equal(dailyTriad[0].challengeNumber, 1);
  assert.equal(dailyTriad[1].challengeNumber, 2);
  assert.equal(dailyTriad[2].challengeNumber, 3);

  // Initially 0/3 completed -> next unfinished challenge is Challenge 1
  const nextBeforeAny = getNextUnfinishedDailyChallenge(
    dailyTriad,
    loadDailyCompletionState()
  );
  assert.equal(nextBeforeAny?.challengeNumber, 1);

  // Solve Challenge 1 -> next unfinished challenge becomes Challenge 2 (2/3)
  const solveDailyDesc = (desc: (typeof dailyTriad)[number]) => {
    const entry = getCatalogPuzzleById(desc.featuredPuzzleId)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: desc.deterministicSeed,
      mode: 'daily',
      puzzleSetVersion: 'v1',
      stageIndex: desc.dayIndex,
      puzzleIdOverride: desc.featuredPuzzleId,
      utcDateKey: desc.dateKey,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 18,
      hintsUsed: 0,
      attemptCount: 1,
    });
    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 18,
      hintsUsed: 0,
      attemptCount: 1,
      hintsEnabled: true,
      mode: 'daily',
      previousBestScore: null,
      dailyAlreadyClaimed: false,
      modeMetadata: {
        dailyDateKey: desc.dateKey,
        dailyId: desc.dailyId,
        dailyChallengeNumber: desc.challengeNumber,
      },
    });
    return recordPuzzleCompletion(res, desc);
  };

  const afterC1 = solveDailyDesc(dailyTriad[0]);
  const nextAfterC1 = getNextUnfinishedDailyChallenge(
    dailyTriad,
    afterC1.dailyState
  );
  assert.equal(nextAfterC1?.challengeNumber, 2);
  assert.equal(
    getDailySetSummary(testDate, afterC1.dailyState).completedCount,
    1
  );

  // Solve Challenge 2 -> next unfinished challenge becomes Challenge 3 (3/3)
  const afterC2 = solveDailyDesc(dailyTriad[1]);
  const nextAfterC2 = getNextUnfinishedDailyChallenge(
    dailyTriad,
    afterC2.dailyState
  );
  assert.equal(nextAfterC2?.challengeNumber, 3);
  assert.equal(
    getDailySetSummary(testDate, afterC2.dailyState).completedCount,
    2
  );

  // Solve Challenge 3 -> all 3/3 completed -> nextUnfinished is null
  const afterC3 = solveDailyDesc(dailyTriad[2]);
  const nextAfterC3 = getNextUnfinishedDailyChallenge(
    dailyTriad,
    afterC3.dailyState
  );
  assert.equal(nextAfterC3, null);
  assert.equal(
    getDailySetSummary(testDate, afterC3.dailyState).isAllCompleted,
    true
  );

  // --- PART D: Regular ('normal') Adaptive Mixed-Pool Difficulty Engine ---
  resetAllLocalGameStorage();
  setGlobalDifficultyPreference('normal');

  const initialRegularSettings = loadSettings();
  assert.equal(initialRegularSettings.difficultyPreference, 'normal');
  assert.equal(
    getEffectiveGlobalDifficulty(initialRegularSettings).isAdaptive,
    true
  );
  // New Regular players start at 'easy'
  assert.equal(
    getEffectiveGlobalDifficulty(initialRegularSettings).effectiveDifficulty,
    'easy'
  );

  // Helper to solve a puzzle at current effective difficulty
  const solveForAdaptiveTest = (
    puzzleId: string,
    attemptCount = 1,
    hintsUsed = 0
  ) => {
    const entry = getCatalogPuzzleById(puzzleId)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `REGULAR-ADAPTIVE-${puzzleId}`,
      mode: 'quick_play',
      puzzleSetVersion: 'v1',
      stageIndex: 1,
      puzzleIdOverride: puzzleId,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 20,
      hintsUsed,
      attemptCount,
    });
    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 20,
      hintsUsed,
      attemptCount,
      hintsEnabled: true,
      mode: 'quick_play',
      previousBestScore: null,
    });
    recordPuzzleCompletion(res);
    return loadSettings();
  };

  // Solve #1 at Easy -> consecutiveSuccesses = 1, still Easy
  const afterRegSolve1 = solveForAdaptiveTest('ns-easy-01', 1);
  assert.equal(
    getEffectiveGlobalDifficulty(afterRegSolve1).effectiveDifficulty,
    'easy'
  );
  assert.equal(
    afterRegSolve1.autoDifficultyState?.consecutiveSuccesses,
    1
  );

  // Solve #2 at Easy -> 2 consecutive solves promotes Easy -> Regular ('normal'), never jumping straight to Hard!
  const afterRegSolve2 = solveForAdaptiveTest('pr-easy-01', 1);
  assert.equal(
    getEffectiveGlobalDifficulty(afterRegSolve2).effectiveDifficulty,
    'normal'
  );
  assert.equal(
    afterRegSolve2.autoDifficultyState?.consecutiveSuccesses,
    0
  );

  // Single wrong answer (attemptCount === 2) must NOT reduce difficulty in Regular mode!
  const afterSingleMistakeSolve = solveForAdaptiveTest('ml-normal-02', 2, 0);
  assert.equal(
    getEffectiveGlobalDifficulty(afterSingleMistakeSolve).effectiveDifficulty,
    'normal',
    'A single wrong answer (attemptCount === 2) must not demote Regular adaptive difficulty'
  );

  // Solve #3 and #4 cleanly at Regular -> 2 consecutive clean solves promotes Regular ('normal') -> Hard ('hard')
  solveForAdaptiveTest('ns-normal-02', 1);
  const afterRegSolve4 = solveForAdaptiveTest('pr-normal-02', 1);
  assert.equal(
    getEffectiveGlobalDifficulty(afterRegSolve4).effectiveDifficulty,
    'hard'
  );

  // Struggling on a puzzle (attemptCount >= 4 or hintsUsed >= 3) steps Regular difficulty down by 1 level: Hard -> Regular ('normal')
  const afterStruggleSolve = solveForAdaptiveTest('ns-hard-03', 4, 3);
  assert.equal(
    getEffectiveGlobalDifficulty(afterStruggleSolve).effectiveDifficulty,
    'normal',
    'Heavy struggle (attemptCount >= 4 or hintsUsed >= 3) must step down adaptive difficulty by 1 level'
  );

  // Abandoning an unsolved puzzle session steps Regular difficulty down by 1 level: Regular ('normal') -> Easy ('easy')
  recordPuzzleFailureOrAbandonment('vp-normal-02');
  const afterAbandonToEasy = loadSettings();
  assert.equal(
    getEffectiveGlobalDifficulty(afterAbandonToEasy).effectiveDifficulty,
    'easy'
  );

  // Fixed Easy and Fixed Hard never auto-increase or auto-decrease
  setGlobalDifficultyPreference('easy');
  solveForAdaptiveTest('de-easy-01', 1);
  solveForAdaptiveTest('ss-easy-01', 1);
  assert.equal(
    getEffectiveGlobalDifficulty(loadSettings()).effectiveDifficulty,
    'easy',
    'Fixed Easy must never auto-increase to Regular'
  );

  setGlobalDifficultyPreference('hard');
  recordPuzzleFailureOrAbandonment('de-hard-03');
  assert.equal(
    getEffectiveGlobalDifficulty(loadSettings()).effectiveDifficulty,
    'hard',
    'Fixed Hard must never auto-decrease on abandonment'
  );

  // --- PART E: Global Difficulty Setting vs Per-Category Overrides & "Use Global Setting" Reset ---
  setGlobalDifficultyPreference('normal');
  let curSettings = loadSettings();
  assert.equal(curSettings.difficultyPreference, 'normal');

  // Every category initially inherits the global difficulty ('normal' / Regular)
  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    const catInfo = getEffectiveCategoryDifficulty(curSettings, cat);
    assert.equal(catInfo.isOverridden, false);
    assert.equal(catInfo.preference, 'normal');
    assert.equal(catInfo.isAdaptive, true);
  }

  // Override ONLY 'number_sequences' to 'hard'
  curSettings = setCategoryDifficultyPreference('number_sequences', 'hard');
  const nsOverrideInfo = getEffectiveCategoryDifficulty(
    curSettings,
    'number_sequences'
  );
  assert.equal(nsOverrideInfo.isOverridden, true);
  assert.equal(nsOverrideInfo.preference, 'hard');
  assert.equal(nsOverrideInfo.effectiveDifficulty, 'hard');
  assert.equal(nsOverrideInfo.isAdaptive, false);

  // Verify all other 7 categories still inherit the global setting ('normal')
  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    if (cat === 'number_sequences') continue;
    const catInfo = getEffectiveCategoryDifficulty(curSettings, cat);
    assert.equal(catInfo.isOverridden, false);
    assert.equal(catInfo.preference, 'normal');
  }

  // Change global difficulty to 'easy' -> all inheriting categories update to 'easy', while 'number_sequences' keeps its 'hard' override
  curSettings = setGlobalDifficultyPreference('easy');
  assert.equal(
    getEffectiveCategoryDifficulty(curSettings, 'pattern_recognition')
      .effectiveDifficulty,
    'easy'
  );
  assert.equal(
    getEffectiveCategoryDifficulty(curSettings, 'number_sequences')
      .effectiveDifficulty,
    'hard'
  );

  // Reset 'number_sequences' to inherit global setting ("Use Global Setting" -> null)
  curSettings = setCategoryDifficultyPreference('number_sequences', null);
  const nsResetInfo = getEffectiveCategoryDifficulty(
    curSettings,
    'number_sequences'
  );
  assert.equal(nsResetInfo.isOverridden, false);
  assert.equal(nsResetInfo.preference, 'easy');
  assert.equal(nsResetInfo.effectiveDifficulty, 'easy');

  // --- PART F: Puzzle Library Category Filtering by Difficulty Preference (Easy=3, Hard=2, Regular=8 Mixed Pool) ---
  for (const cat of PUZZLE_CATEGORIES_ORDER) {
    const allInCat = getCatalogPuzzlesByCategory(cat);
    assert.equal(allInCat.length, 8);
    assert.equal(
      filterPuzzlesByDifficultyPreference(allInCat, 'easy').length,
      3,
      `Category ${cat} must display 3 Easy puzzles when Easy is selected`
    );
    assert.equal(
      filterPuzzlesByDifficultyPreference(allInCat, 'hard').length,
      2,
      `Category ${cat} must display 2 Hard puzzles when Hard is selected`
    );
    assert.equal(
      filterPuzzlesByDifficultyPreference(allInCat, 'normal').length,
      8,
      `Category ${cat} must display all 8 mixed-pool puzzles (Easy + Regular + Hard) when Regular is selected`
    );

    const recommendedAdaptive = selectNextLibraryCategoryPuzzle({
      category: cat,
      difficultyPreference: 'normal',
      effectiveDifficulty: 'normal',
      completionRecords: [],
    });
    assert.equal(recommendedAdaptive.category, cat);
    assert.equal(recommendedAdaptive.difficulty, 'normal');
  }

  resetAllLocalGameStorage();
});

test('14. Phase L2.5 Gameplay Polish: All 8 Mechanics Reset/Retry Integrity, Audio playReset & Anti-Overlap Guard, and Progressive Hint Bounds', () => {
  resetAllLocalGameStorage();

  // --- PART A: Audio playReset & Anti-Overlap Guard ---
  soundEngine.resetDiagnosticsCounter();
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: true,
    musicVolume: 45,
  });

  soundEngine.playReset();
  assert.equal(soundEngine.getAudioDiagnostics().lastPlayedSound, 'reset');
  assert.equal(soundEngine.getAudioDiagnostics().playedSoundCount, 1);

  // Rapid identical sound calls within < 18ms must be debounced by anti-overlap guard
  soundEngine.playPuzzleInteract();
  soundEngine.playPuzzleInteract();
  assert.equal(
    soundEngine.getAudioDiagnostics().playedSoundCount,
    2,
    'Rapid duplicate puzzle_interact calls within 18ms must not double-schedule oscillators'
  );
  soundEngine.dispose();

  // --- PART B: Reset & Retry State Integrity Across All 64 Catalog Puzzles & All 8 Mechanics ---
  const mechanicsVerified = new Set<string>();

  for (const entry of PUZZLE_CATALOG) {
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `L25-POLISH-${entry.id}`,
      mode: 'practice',
      puzzleSetVersion: 'v1',
      stageIndex: 1,
      puzzleIdOverride: entry.id,
    });
    mechanicsVerified.add(def.puzzleType);

    const initialState = createInitialPuzzleState(def);
    const initialSig = getPuzzleStateSignature(initialState);

    // Construct winning state and verify it validates cleanly
    const winningState = constructWinningStateForPuzzle(def);
    assert.equal(isPuzzleStateComplete(def, winningState), true);
    const solvedCheck = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winningState,
      interactionState: winningState,
      elapsedSeconds: 15,
      hintsUsed: 0,
      attemptCount: 1,
    });
    assert.equal(solvedCheck.isCorrect, true);

    // Verify both action { type: 'reset', initialState } and resetPuzzleState(def) cleanly restore initial state
    const stateAfterResetAction = applyPuzzleAction(
      winningState,
      { type: 'reset', initialState },
      def.interactionSpec
    );
    assert.equal(getPuzzleStateSignature(stateAfterResetAction), initialSig);

    const stateAfterFullReset = resetPuzzleState(def);
    assert.equal(getPuzzleStateSignature(stateAfterFullReset), initialSig);
  }

  assert.equal(
    mechanicsVerified.size,
    8,
    'All 8 puzzle mechanics must be verified for reset and retry integrity'
  );

  resetAllLocalGameStorage();
});

test('15. Feature Correction Verification: Legacy "auto" Preference Migration, Cross-Category Global Win Streak, Default Music Enabled & Multi-Voice Soundtrack Engine', () => {
  resetAllLocalGameStorage();

  // --- PART A: Default Music Enabled for New Players ---
  assert.equal(DEFAULT_GAME_SETTINGS.musicEnabled, true);
  assert.equal(DEFAULT_GAME_SETTINGS.musicVolume, 45);
  assert.equal(DEFAULT_GAME_SETTINGS.difficultyPreference, 'normal');

  // --- PART B: Safe Migration from Old "auto" Preference to "normal" (Regular) ---
  setGlobalDifficultyPreference('auto');
  setCategoryDifficultyPreference('number_sequences', 'auto');
  const migratedSettings = loadSettings();
  assert.equal(
    migratedSettings.difficultyPreference,
    'normal',
    'Legacy "auto" global preference must migrate cleanly to "normal" (Regular)'
  );
  assert.equal(
    migratedSettings.categoryDifficultyOverrides?.number_sequences,
    'normal',
    'Legacy "auto" category override must migrate cleanly to "normal" (Regular)'
  );

  // --- PART C: One Global Win Streak Shared Across Categories and Game Modes ---
  resetAllLocalGameStorage();
  const crossCategoryPuzzles = [
    { id: 'ns-easy-01', mode: 'quick_play' as const },
    { id: 'pr-easy-01', mode: 'practice' as const },
    { id: 'ml-easy-01', mode: 'archive' as const },
    { id: 'vp-easy-01', mode: 'quick_play' as const },
    { id: 'sr-easy-01', mode: 'practice' as const },
    { id: 'de-easy-01', mode: 'archive' as const },
    { id: 'ss-easy-01', mode: 'quick_play' as const },
    { id: 'mo-easy-01', mode: 'practice' as const },
  ];

  for (let i = 0; i < crossCategoryPuzzles.length; i += 1) {
    const item = crossCategoryPuzzles[i];
    const entry = getCatalogPuzzleById(item.id)!;
    const def = generatePlayablePuzzle({
      category: entry.category,
      difficulty: entry.difficulty,
      seed: `GLOBAL-STREAK-${entry.id}`,
      mode: item.mode,
      puzzleSetVersion: 'v1',
      stageIndex: i + 1,
      puzzleIdOverride: entry.id,
    });
    const winState = constructWinningStateForPuzzle(def);
    const val = validatePuzzleAnswer(def, {
      puzzleId: def.id,
      category: def.category,
      selectedOptionId: '',
      submittedValue: winState,
      interactionState: winState,
      elapsedSeconds: 16,
      hintsUsed: 0,
      attemptCount: 2, // Wrong attempt during play does NOT break Win Streak!
    });
    const res = buildValidatedPuzzleResult({
      definition: def,
      validation: val,
      elapsedSeconds: 16,
      hintsUsed: 0,
      attemptCount: 2,
      hintsEnabled: true,
      mode: item.mode,
      previousBestScore: null,
    });
    const saved = recordPuzzleCompletion(res);
    assert.equal(saved.progress.currentWinStreak, i + 1);
    if (i === 7) {
      assert.equal(saved.progress.winStreakMilestonesAchieved, 1);
      assert.equal(saved.progress.winsTowardNextMilestone, 0);
      assert.equal(res.winStreakMilestoneXpAwarded, WIN_STREAK_MILESTONE_XP_REWARD);
    }
  }

  // --- PART D: Multi-Voice Original Soundtrack Engine, Single-Instance Guard & Clean Disposal ---
  soundEngine.dispose();
  soundEngine.resetDiagnosticsCounter();

  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: true,
    musicVolume: 50,
  });

  // Calling syncPreferences multiple times must NEVER spawn duplicate music schedulers
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: true,
    musicVolume: 60,
  });

  const musicDiag = soundEngine.getAudioDiagnostics();
  assert.equal(musicDiag.isAmbientPlaying, true);
  assert.equal(musicDiag.musicSectionCount, 4);
  assert.deepEqual(musicDiag.activeMusicVoices, [
    'chord_pad',
    'pulse_arp',
    'lead_melody',
    'sub_bass',
    'harmonic_shimmer',
  ]);
  assert.equal(
    musicDiag.activeMusicSchedulerCount,
    1,
    'Music engine must never start duplicate playback scheduler instances'
  );
  assert.ok(
    musicDiag.scheduledMusicStepCount >= 1,
    'Music engine must schedule structured musical steps when started'
  );

  // Disabling music or disposing stops the scheduler cleanly
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: false,
    musicVolume: 60,
  });
  assert.equal(soundEngine.getAudioDiagnostics().isAmbientPlaying, false);
  assert.equal(soundEngine.getAudioDiagnostics().activeMusicSchedulerCount, 0);

  soundEngine.dispose();
  resetAllLocalGameStorage();
});

// ============================================================================
// TEST 16: Visual & Experience Polish Verification (8-Category Multi-Tone
// Palettes, Safe Single-Instance Music Preview, and Archive Adventure Integrity)
// ============================================================================
test('16. Visual & Experience Polish: 8-Category Multi-Tone Icon Palettes, Safe Single-Instance Music Preview & Archive Adventure Integrity', () => {
  resetAllLocalGameStorage();
  soundEngine.dispose();

  // 1. Verify all 8 categories have distinct, valid 3-tone hex palettes
  const seenPrimaryColors = new Set<string>();
  for (const catId of PUZZLE_CATEGORIES_ORDER) {
    const palette = CATEGORY_ICON_PALETTES[catId];
    assert.ok(palette, `Category ${catId} must have a 3-tone icon palette`);
    assert.match(palette.primary, /^#[0-9A-Fa-f]{6}$/);
    assert.match(palette.secondary, /^#[0-9A-Fa-f]{6}$/);
    assert.match(palette.highlight, /^#[0-9A-Fa-f]{6}$/);
    seenPrimaryColors.add(palette.primary.toUpperCase());
  }
  assert.equal(
    seenPrimaryColors.size,
    8,
    'All 8 puzzle categories must have distinct primary icon colors'
  );

  // 2. Verify safe single-instance music preview / resume
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: true,
    musicVolume: 50,
  });

  assert.equal(soundEngine.isMusicPlaying(), true);
  assert.ok(soundEngine.getActiveMusicSectionName().length > 0);

  // Calling previewOrResumeMusic repeatedly must NEVER spawn a second music scheduler
  assert.equal(soundEngine.previewOrResumeMusic(), true);
  assert.equal(soundEngine.previewOrResumeMusic(), true);
  assert.equal(soundEngine.getAudioDiagnostics().activeMusicSchedulerCount, 1);

  // 3. Verify legacy saved sessions with 'archive' route or mode safely migrate to 'home' and 'quick_play'
  saveAppSession({
    currentRoute: 'archive',
    activeCategory: 'number_sequences',
    collectionCategory: null,
    selectedPuzzleId: 'ns-easy-01',
    activeMode: 'archive',
    stageIndex: 1,
    lastResult: null,
    activeGameplaySession: null,
  });
  const migratedSession = loadAppSession();
  assert.equal(migratedSession.currentRoute, 'home');
  assert.equal(migratedSession.activeMode, 'quick_play');

  // 4. Verify player-facing achievements exclude Archive-only IDs while keeping all 10 core achievements
  const playerFacingAchievements = ACHIEVEMENT_DEFINITIONS.filter((def) =>
    isPlayerFacingAchievementId(def.id)
  );
  assert.equal(playerFacingAchievements.length, 10);
  assert.equal(
    playerFacingAchievements.some(
      (def) =>
        def.id === 'archive_restorer' || def.id === 'prime_core_awakened'
    ),
    false
  );

  // 5. Verify new Starlight Sanctuary & Hidden Mechanisms soundtrack, playWinStreakIncrease(), and celebration deduplication
  soundEngine.resetDiagnosticsCounter();
  soundEngine.syncPreferences({
    masterMuted: false,
    masterVolume: 80,
    soundEffectsEnabled: true,
    sfxVolume: 85,
    musicEnabled: true,
    musicVolume: 50,
  });
  assert.equal(soundEngine.getActiveMusicSectionName(), 'Starlight Mechanisms');
  soundEngine.playWinStreakIncrease();
  assert.equal(
    soundEngine.getAudioDiagnostics().lastPlayedSound,
    'win_streak_increase'
  );

  resetCelebrationRegistryForTests();
  const sampleDef = generatePlayablePuzzle({
    category: 'number_sequences',
    difficulty: 'easy',
    seed: 'CELEB-DEDUP-TEST',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'ns-easy-01',
  });
  const sampleWin = constructWinningStateForPuzzle(sampleDef);
  const sampleVal = validatePuzzleAnswer(sampleDef, {
    puzzleId: sampleDef.id,
    category: sampleDef.category,
    selectedOptionId: '',
    submittedValue: sampleWin,
    interactionState: sampleWin,
    elapsedSeconds: 12,
    hintsUsed: 0,
    attemptCount: 1,
  });
  const liveResult = buildValidatedPuzzleResult({
    definition: sampleDef,
    validation: sampleVal,
    elapsedSeconds: 12,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'quick_play',
    previousBestScore: null,
  });

  // Live completion is registered and can be consumed ONCE per celebration scope
  assert.equal(isLiveSessionCompletion(liveResult.completionId), true);
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'gameplay_solve'),
    true
  );
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'gameplay_solve'),
    false,
    'Re-renders must not replay gameplay solve celebrations'
  );
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'results_levelup'),
    true
  );
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'results_levelup'),
    false,
    'Re-renders must not replay Results level-up celebrations'
  );
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'results_streak'),
    true
  );
  assert.equal(
    consumeOneShotCelebration(liveResult.completionId, 'results_streak'),
    false,
    'Re-renders must not replay Results Win Streak celebrations'
  );

  // Restored session completionId from a previous browser session must NEVER trigger celebrations
  assert.equal(isLiveSessionCompletion('LQ-COMP-RESTORED-SESSION-ID'), false);
  assert.equal(
    consumeOneShotCelebration('LQ-COMP-RESTORED-SESSION-ID', 'results_levelup'),
    false
  );
  assert.equal(
    consumeOneShotCelebration('LQ-COMP-RESTORED-SESSION-ID', 'results_streak'),
    false
  );

  soundEngine.dispose();
  resetAllLocalGameStorage();
});

// ============================================================================
// TEST 17: Phase L3 — NEX11 Game-Module Contract, Completion Deduplication,
// Optional Nexi Companion Adapter, Daily Anti-Skip & Storage Version Migration
// ============================================================================
test('17. Phase L3: NEX11 Game-Module Contract, Completion Deduplication, Nexi Adapter, Daily Anti-Skip & Storage Migration', () => {
  resetAllLocalGameStorage();
  resetNex11BridgeForTests();
  soundEngine.dispose();

  // 1. Verify Game-Module Manifest Identity & Versioning
  assert.equal(LOGIC_QUEST_GAME_ID, 'logic_quest');
  assert.equal(LOGIC_QUEST_DISPLAY_NAME, 'Logic Quest');
  assert.equal(LOGIC_QUEST_GAME_VERSION, '1.0.0');
  assert.equal(NEX11_CONTRACT_VERSION, '1.0.0');
  assert.equal(NEX11_COMPLETION_EVENT_VERSION, '1.0.0');
  assert.equal(LOGIC_QUEST_MODULE_MANIFEST.gameId, 'logic_quest');
  assert.equal(LOGIC_QUEST_MODULE_MANIFEST.standalonePlayable, true);
  assert.equal(LOGIC_QUEST_MODULE_MANIFEST.catalogPuzzlesCount, 64);
  assert.equal(LOGIC_QUEST_MODULE_MANIFEST.categoriesCount, 8);

  // 2. Verify Standalone Operation when no NEX11 host or Nexi adapter is present
  assert.equal(getNex11LaunchConfig(), null);
  assert.doesNotThrow(() => {
    notifyNexiHintUsed({
      gameId: 'logic_quest',
      puzzleId: 'ns-easy-01',
      puzzleTitle: 'Arithmetic Pulse',
      category: 'number_sequences',
      difficulty: 'easy',
      hintTier: 1,
      maxHints: 3,
      hintText: 'Check the step difference.',
    });
    notifyNexiReaction({
      gameId: 'logic_quest',
      puzzleId: 'ns-easy-01',
      category: 'number_sequences',
      difficulty: 'easy',
      mode: 'quick_play',
      isCorrect: true,
      attemptCount: 1,
    });
    const ctx = notifyNexiGameContext({
      currentRoute: 'home',
      activeMode: undefined,
      activeCategory: null,
      playerLevel: 1,
      currentWinStreak: 0,
    });
    assert.equal(ctx.gameId, 'logic_quest');
    assert.equal(ctx.currentRoute, 'home');
  });

  // 3. Seed player progress, then initialize module with optional NEX11 Launch Config
  const seedDef = generatePlayablePuzzle({
    category: 'number_sequences',
    difficulty: 'easy',
    seed: 'L3-SEED-SOLVE',
    mode: 'quick_play',
    puzzleSetVersion: 'v1',
    stageIndex: 1,
    puzzleIdOverride: 'ns-easy-01',
  });
  const seedWin = constructWinningStateForPuzzle(seedDef);
  const seedVal = validatePuzzleAnswer(seedDef, {
    puzzleId: seedDef.id,
    category: seedDef.category,
    selectedOptionId: '',
    submittedValue: seedWin,
    interactionState: seedWin,
    elapsedSeconds: 15,
    hintsUsed: 0,
    attemptCount: 1,
  });
  const seedRes = buildValidatedPuzzleResult({
    definition: seedDef,
    validation: seedVal,
    elapsedSeconds: 15,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'quick_play',
    previousBestScore: null,
  });
  recordPuzzleCompletion(seedRes);
  const progressBeforeLaunch = loadPlayerProgress();
  assert.equal(progressBeforeLaunch.totalPuzzlesCompleted, 1);

  const capturedCompletionEvents: Nex11GameCompletionEvent[] = [];
  const capturedHints: NexiHintEventPayload[] = [];
  const capturedReactions: NexiResultReactionPayload[] = [];
  const capturedExpressions: NexiExpressionState[] = [];
  const capturedContexts: NexiGameContextPayload[] = [];

  const initResult = initializeLogicQuestModule({
    playerId: 'nex11-user-42',
    themePreference: 'light',
    difficultyPreference: 'hard',
    hintsEnabled: false,
    audioPreferences: {
      masterMuted: false,
      masterVolume: 70,
      soundEffectsEnabled: true,
      sfxVolume: 75,
      musicEnabled: false,
      musicVolume: 40,
    },
    hostEnvironment: {
      hostApp: 'nex11-shell',
      hostVersion: '2.0.0',
      platform: 'desktop',
    },
    nexiAdapter: {
      showHint: (h) => capturedHints.push(h),
      reactToPuzzleResult: (r) => capturedReactions.push(r),
      setExpression: (expr) => capturedExpressions.push(expr),
      updateGameContext: (ctx) => capturedContexts.push(ctx),
    },
    onCompletionEvent: (evt) => capturedCompletionEvents.push(evt),
  });

  // Verify launch preferences applied cleanly WITHOUT wiping existing player progress
  assert.equal(initResult.settings.theme, 'light');
  assert.equal(initResult.settings.difficultyPreference, 'hard');
  assert.equal(initResult.settings.difficulty, 'hard');
  assert.equal(initResult.settings.hintsEnabled, false);
  assert.equal(initResult.settings.masterVolume, 70);
  assert.equal(initResult.settings.musicEnabled, false);
  assert.equal(
    loadPlayerProgress().totalPuzzlesCompleted,
    1,
    'Host launch preferences must never overwrite existing player progression'
  );

  // 4. Verify Completion Event Contract & Strict Deduplication by completionId
  const emittedEvent = emitNex11CompletionEvent(seedRes);
  assert.ok(emittedEvent, 'First emission for a completionId must succeed');
  assert.equal(emittedEvent.eventVersion, '1.0.0');
  assert.equal(emittedEvent.gameId, 'logic_quest');
  assert.equal(emittedEvent.completionId, seedRes.completionId);
  assert.equal(emittedEvent.playerId, 'nex11-user-42');
  assert.equal(emittedEvent.puzzleId, 'ns-easy-01');
  assert.equal(emittedEvent.resultData.category, 'number_sequences');
  assert.equal(emittedEvent.resultData.difficulty, 'easy');
  assert.equal(emittedEvent.validatedScore, seedRes.score);
  assert.equal(emittedEvent.localGameXpEarned, seedRes.xpEarned);
  assert.equal(capturedCompletionEvents.length, 1);
  assert.equal(hasEmittedNex11CompletionEvent(seedRes.completionId), true);

  // Attempting to emit the exact same completionId again must be blocked from notifying listeners a second time
  emitNex11CompletionEvent(seedRes);
  assert.equal(
    capturedCompletionEvents.length,
    1,
    'Host listener must never receive duplicate completion events for the same completionId'
  );
  assert.equal(getNex11BridgeDiagnostics().duplicateBlockedCount, 1);

  // 5. Verify Optional Nexi Companion Adapter Callbacks & Error Isolation
  notifyNexiHintUsed({
    gameId: 'logic_quest',
    puzzleId: 'ns-easy-01',
    puzzleTitle: 'Arithmetic Pulse',
    category: 'number_sequences',
    difficulty: 'easy',
    hintTier: 2,
    maxHints: 3,
    hintText: 'Add 4 to the last term.',
  });
  assert.equal(capturedHints.length, 1);
  assert.equal(capturedHints[0].hintTier, 2);
  assert.ok(capturedExpressions.includes('curious'));

  notifyNexiReaction({
    gameId: 'logic_quest',
    completionId: seedRes.completionId,
    puzzleId: 'ns-easy-01',
    category: 'number_sequences',
    difficulty: 'easy',
    mode: 'quick_play',
    isCorrect: true,
    attemptCount: 1,
    score: seedRes.score,
    accuracyPercent: 100,
    localXpEarned: seedRes.xpEarned,
    didLevelUp: true,
    newLevel: 2,
  });
  assert.equal(capturedReactions.length, 1);
  assert.ok(capturedExpressions.includes('celebrating'));

  notifyNexiGameContext({
    currentRoute: 'gameplay',
    activeMode: 'quick_play',
    activeCategory: 'number_sequences',
    playerLevel: 2,
    currentWinStreak: 1,
  });
  assert.equal(capturedContexts.length, 1);

  // Registering an adapter that throws an error must be isolated and never crash Logic Quest
  registerNex11NexiAdapter({
    showHint: () => {
      throw new Error('Simulated host Nexi error');
    },
  });
  assert.doesNotThrow(() => {
    notifyNexiHintUsed({
      gameId: 'logic_quest',
      puzzleId: 'ns-easy-01',
      puzzleTitle: 'Arithmetic Pulse',
      category: 'number_sequences',
      difficulty: 'easy',
      hintTier: 1,
      maxHints: 3,
      hintText: 'Safe isolation check',
    });
  });

  // 6. Verify Sequential Daily Challenge Anti-Skip Enforcement (1 -> 2 -> 3)
  resetAllLocalGameStorage();
  const sampleDate = new Date('2026-06-15T12:00:00');
  const dailyTriad = getDailyChallengesForDate(sampleDate);
  const emptyDailyState = loadDailyCompletionState();

  // Requesting Challenge #2 or #3 when #1 is unfinished must resolve to Challenge #1
  assert.equal(
    resolveSequentialDailyChallenge(dailyTriad, emptyDailyState, 2).challengeNumber,
    1,
    'Requesting Daily #2 before completing #1 must redirect to #1'
  );
  assert.equal(
    resolveSequentialDailyChallenge(dailyTriad, emptyDailyState, 3).challengeNumber,
    1,
    'Requesting Daily #3 before completing #1 must redirect to #1'
  );

  // Complete Daily #1 and verify Daily #2 is now unlocked, while Daily #3 redirects to #2
  const daily1Def = generatePlayablePuzzle({
    category: dailyTriad[0].category,
    difficulty: dailyTriad[0].difficulty,
    seed: dailyTriad[0].deterministicSeed,
    mode: 'daily',
    puzzleSetVersion: 'v1',
    stageIndex: dailyTriad[0].dayIndex,
    puzzleIdOverride: dailyTriad[0].featuredPuzzleId,
  });
  const daily1Win = constructWinningStateForPuzzle(daily1Def);
  const daily1Val = validatePuzzleAnswer(daily1Def, {
    puzzleId: daily1Def.id,
    category: daily1Def.category,
    selectedOptionId: '',
    submittedValue: daily1Win,
    interactionState: daily1Win,
    elapsedSeconds: 20,
    hintsUsed: 0,
    attemptCount: 1,
  });
  const daily1Res = buildValidatedPuzzleResult({
    definition: daily1Def,
    validation: daily1Val,
    elapsedSeconds: 20,
    hintsUsed: 0,
    attemptCount: 1,
    hintsEnabled: true,
    mode: 'daily',
    previousBestScore: null,
    modeMetadata: {
      dailyDateKey: dailyTriad[0].dateKey,
      dailyId: dailyTriad[0].dailyId,
      dailyChallengeNumber: 1,
    },
  });
  const afterDaily1 = recordPuzzleCompletion(daily1Res, dailyTriad[0]);
  assert.equal(
    resolveSequentialDailyChallenge(dailyTriad, afterDaily1.dailyState, 2)
      .challengeNumber,
    2,
    'Daily #2 must be playable once Daily #1 is completed'
  );
  assert.equal(
    resolveSequentialDailyChallenge(dailyTriad, afterDaily1.dailyState, 3)
      .challengeNumber,
    2,
    'Requesting Daily #3 before Daily #2 is completed must redirect to Daily #2'
  );
  assert.equal(
    resolveSequentialDailyChallenge(dailyTriad, afterDaily1.dailyState, 1)
      .challengeNumber,
    1,
    'Already-completed Daily #1 must remain accessible for replay/review'
  );

  // 7. Verify Storage Migration from Older Schema Versions & Corruption Recovery
  resetAllLocalGameStorage();

  // Case A: Older envelope schemaVersion (e.g., schemaVersion: 0) with valid data migrates without data loss
  setRawStorageItem(
    STORAGE_KEYS.SETTINGS,
    JSON.stringify({
      schemaVersion: 0,
      updatedAtIso: '2025-01-01T00:00:00.000Z',
      data: {
        difficulty: 'hard',
        difficultyPreference: 'hard',
        theme: 'light',
        soundEffectsEnabled: false,
        musicEnabled: true,
        hintsEnabled: true,
      },
    })
  );
  const migratedSettings = loadSettings();
  assert.equal(
    migratedSettings.difficultyPreference,
    'hard',
    'Older schemaVersion envelope must migrate valid user settings without resetting'
  );
  assert.equal(migratedSettings.theme, 'light');
  assert.equal(migratedSettings.soundEffectsEnabled, false);
  // Confirm re-saved under current schemaVersion
  const upgradedRaw = JSON.parse(getRawStorageItem(STORAGE_KEYS.SETTINGS) ?? '{}');
  assert.equal(upgradedRaw.schemaVersion, 1);

  // Case B: Pre-envelope raw JSON object migrates cleanly
  setRawStorageItem(
    STORAGE_KEYS.SETTINGS,
    JSON.stringify({
      difficulty: 'easy',
      difficultyPreference: 'easy',
      theme: 'dark',
    })
  );
  const rawMigratedSettings = loadSettings();
  assert.equal(rawMigratedSettings.difficultyPreference, 'easy');

  // Case C: Corrupted JSON recovers cleanly to safe defaults and logs recovery key
  setRawStorageItem(STORAGE_KEYS.PROGRESS, '{corrupted-json-payload:::');
  const recoveredProgress = loadPlayerProgress();
  assert.equal(recoveredProgress.level, 1);
  assert.ok(getRecoveredStorageKeys().includes(STORAGE_KEYS.PROGRESS));

  // Case D: Session referencing a non-existent puzzleId recovers safely to 'home'
  saveAppSession({
    currentRoute: 'gameplay',
    activeCategory: 'number_sequences',
    collectionCategory: null,
    selectedPuzzleId: 'non-existent-puzzle-999',
    activeMode: 'quick_play',
    stageIndex: 1,
    lastResult: null,
    activeGameplaySession: null,
  });
  const sanitizedSession = loadAppSession();
  assert.equal(sanitizedSession.currentRoute, 'home');
  assert.equal(sanitizedSession.selectedPuzzleId, null);

  resetNex11BridgeForTests();
  resetAllLocalGameStorage();
});


