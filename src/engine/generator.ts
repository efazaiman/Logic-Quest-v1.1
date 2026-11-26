/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L2.2 Playable Puzzle Catalog (64 Curated Puzzles) & Multi-Mechanic Generator
 * Provides 64 curated, playable puzzles across all 8 categories (8 per category: 3 Easy, 3 Normal, 2 Hard)
 * powered by 8 distinct interactive puzzle mechanics:
 * - multiple_choice
 * - pattern_recognition (single/dual attribute cell builder & visual layer toggle)
 * - sequence_puzzle (numeric keypad/stepper & interactive token reordering)
 * - spatial_reasoning (2D flip/rotation manipulator, 3D voxel stack builder & 3D die rotation)
 * - logical_deduction (interactive elimination grid & constraint assignment)
 * - cipher_code (symbolic operator cipher dial & multi-slot code entry console)
 * - mathematical_reasoning (interactive numeric keypad & equation node solver)
 * - memory_challenge (two-phase Study -> Conceal -> Recall & Reproduce console)
 */

import {
  DifficultyLevel,
  PuzzleCatalogEntry,
  PuzzleCategory,
  PuzzleDefinition,
  PuzzleGenerationContext,
  PuzzleInteractionSpec,
  PuzzleInteractionType,
  PuzzleInteractiveState,
  PuzzleScoringConfig,
  PuzzleSolutionSpec,
} from '../types/game';
import { PUZZLE_CATEGORIES_ORDER, getCategoryMetadata } from './categories';
import { computeDeterministicHash } from './dailyPuzzle';
import { getDifficultyConfig } from './difficulty';
import { cloneInteractiveState } from './mechanicsController';
import { EXPANDED_PUZZLE_CATALOG_ADDITIONS } from './puzzleCatalogAdditions';

const DIFFICULTY_SORT_WEIGHT: Record<DifficultyLevel, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

export const BASE_PUZZLE_CATALOG: PuzzleCatalogEntry[] = [
  // ==========================================================================
  // 1. NUMBER SEQUENCES (sequence_puzzle)
  // ==========================================================================
  {
    id: 'ns-easy-01',
    category: 'number_sequences',
    difficulty: 'easy',
    puzzleType: 'sequence_puzzle',
    title: 'Harmonic Doubling',
    shortDescription: 'Find the missing value in a doubling progression with a constant offset.',
    instructions: 'Enter the missing Term 5 value using the sequence keypad or step controls.',
    ruleSummary: 'Each term doubles and adds 1: T(n) = 2 × T(n-1) + 1',
    estimatedTimeSeconds: 40,
    slots: [
      { slotId: 's1', label: 'Term 1', valueDisplay: '3', isTargetSlot: false },
      { slotId: 's2', label: 'Term 2', valueDisplay: '7', isTargetSlot: false },
      { slotId: 's3', label: 'Term 3', valueDisplay: '15', isTargetSlot: false },
      { slotId: 's4', label: 'Term 4', valueDisplay: '31', isTargetSlot: false },
      { slotId: 's5', label: 'Term 5', valueDisplay: '?', isTargetSlot: true },
      { slotId: 's6', label: 'Term 6', valueDisplay: '127', isTargetSlot: false },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '59' },
      { optionId: 'opt-b', label: '63' },
      { optionId: 'opt-c', label: '64' },
      { optionId: 'opt-d', label: '71' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'sequence_puzzle',
      mode: 'numeric_input',
      targetSlotIds: ['s5'],
      stepButtons: [-10, -1, 1, 10],
    },
    initialState: {
      type: 'sequence_puzzle',
      activeSlotId: 's5',
      slotValues: { s5: '' },
      orderedTokenIds: [],
    },
    solutionSpec: {
      type: 'sequence_puzzle',
      expectedSlotValues: { s5: 63 },
    },
    availableHints: [
      'Compare the difference between consecutive terms: 7−3=4, 15−7=8, 31−15=16.',
      'The difference doubles at every step (+4, +8, +16, +32), or equivalently T(n) = 2×T(n−1) + 1.',
      'Add 32 to Term 4 (31 + 32 = 63), which also satisfies 2×63 + 1 = 127 for Term 6.',
    ],
    explanation: 'The differences double each step (+4, +8, +16, +32), so Term 5 is 31 + 32 = 63 (and 63 × 2 + 1 = 127).',
  },
  {
    id: 'ns-normal-02',
    category: 'number_sequences',
    difficulty: 'normal',
    puzzleType: 'sequence_puzzle',
    title: 'Square Stride',
    shortDescription: 'Track a progression driven by consecutive square increments.',
    instructions: 'Calculate and enter Term 6 to complete the rising sequence.',
    ruleSummary: 'Differences follow consecutive squares: +1², +2², +3², +4², +5²',
    estimatedTimeSeconds: 60,
    slots: [
      { slotId: 's1', label: 'Term 1', valueDisplay: '4', isTargetSlot: false },
      { slotId: 's2', label: 'Term 2', valueDisplay: '5', isTargetSlot: false },
      { slotId: 's3', label: 'Term 3', valueDisplay: '9', isTargetSlot: false },
      { slotId: 's4', label: 'Term 4', valueDisplay: '18', isTargetSlot: false },
      { slotId: 's5', label: 'Term 5', valueDisplay: '34', isTargetSlot: false },
      { slotId: 's6', label: 'Term 6', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '54' },
      { optionId: 'opt-b', label: '59' },
      { optionId: 'opt-c', label: '61' },
      { optionId: 'opt-d', label: '68' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'sequence_puzzle',
      mode: 'numeric_input',
      targetSlotIds: ['s6'],
      stepButtons: [-10, -5, 1, 5, 10],
    },
    initialState: {
      type: 'sequence_puzzle',
      activeSlotId: 's6',
      slotValues: { s6: '' },
      orderedTokenIds: [],
    },
    solutionSpec: {
      type: 'sequence_puzzle',
      expectedSlotValues: { s6: 59 },
    },
    availableHints: [
      'Subtract adjacent numbers: 5−4 = 1, 9−5 = 4, 18−9 = 9, 34−18 = 16.',
      'The increments 1, 4, 9, 16 are the perfect squares 1², 2², 3², 4².',
      'The next increment is 5² = 25, so Term 6 is 34 + 25 = 59.',
    ],
    explanation: 'Adding consecutive squares (+1, +4, +9, +16, +25) gives 34 + 25 = 59.',
  },
  {
    id: 'ns-hard-03',
    category: 'number_sequences',
    difficulty: 'hard',
    puzzleType: 'sequence_puzzle',
    title: 'Alternating Cascade',
    shortDescription: 'Resolve a sequence where multiplication and subtraction alternate.',
    instructions: 'Enter the missing Term 6 value in this two-operation alternating sequence.',
    ruleSummary: 'Alternate ×3 and −4 across each step',
    estimatedTimeSeconds: 85,
    slots: [
      { slotId: 's1', label: 'Term 1', valueDisplay: '5', isTargetSlot: false },
      { slotId: 's2', label: 'Term 2', valueDisplay: '15', isTargetSlot: false },
      { slotId: 's3', label: 'Term 3', valueDisplay: '11', isTargetSlot: false },
      { slotId: 's4', label: 'Term 4', valueDisplay: '33', isTargetSlot: false },
      { slotId: 's5', label: 'Term 5', valueDisplay: '29', isTargetSlot: false },
      { slotId: 's6', label: 'Term 6', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '77' },
      { optionId: 'opt-b', label: '84' },
      { optionId: 'opt-c', label: '87' },
      { optionId: 'opt-d', label: '91' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'sequence_puzzle',
      mode: 'numeric_input',
      targetSlotIds: ['s6'],
      stepButtons: [-10, -1, 1, 10],
    },
    initialState: {
      type: 'sequence_puzzle',
      activeSlotId: 's6',
      slotValues: { s6: '' },
      orderedTokenIds: [],
    },
    solutionSpec: {
      type: 'sequence_puzzle',
      expectedSlotValues: { s6: 87 },
    },
    availableHints: [
      'Separate odd-to-even transitions (5→15, 11→33) from even-to-odd transitions (15→11, 33→29).',
      'Odd-to-even steps multiply by 3 (×3); even-to-odd steps subtract 4 (−4).',
      'Since Term 5 → Term 6 is an odd-to-even transition, multiply 29 × 3 = 87.',
    ],
    explanation: 'The rule alternates ×3 and −4 across consecutive terms: 5 × 3 = 15, 15 − 4 = 11, 11 × 3 = 33, 33 − 4 = 29, and 29 × 3 = 87.',
  },

  // ==========================================================================
  // 2. PATTERN RECOGNITION (pattern_recognition)
  // ==========================================================================
  {
    id: 'pr-easy-01',
    category: 'pattern_recognition',
    difficulty: 'easy',
    puzzleType: 'pattern_recognition',
    title: 'Cyclic Shift Matrix',
    shortDescription: 'Complete a 3×3 symbol grid where each row shifts cyclically.',
    instructions: 'Construct the bottom-right cell (R3 · C3) by selecting the missing glyph from the pattern palette.',
    ruleSummary: 'Each row contains ◆, ▲, and ● in a shifted cycle',
    estimatedTimeSeconds: 35,
    slots: [
      { slotId: 'c11', label: 'R1 · C1', valueDisplay: '◆', isTargetSlot: false },
      { slotId: 'c12', label: 'R1 · C2', valueDisplay: '▲', isTargetSlot: false },
      { slotId: 'c13', label: 'R1 · C3', valueDisplay: '●', isTargetSlot: false },
      { slotId: 'c21', label: 'R2 · C1', valueDisplay: '▲', isTargetSlot: false },
      { slotId: 'c22', label: 'R2 · C2', valueDisplay: '●', isTargetSlot: false },
      { slotId: 'c23', label: 'R2 · C3', valueDisplay: '◆', isTargetSlot: false },
      { slotId: 'c31', label: 'R3 · C1', valueDisplay: '●', isTargetSlot: false },
      { slotId: 'c32', label: 'R3 · C2', valueDisplay: '◆', isTargetSlot: false },
      { slotId: 'c33', label: 'R3 · C3', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '▲' },
      { optionId: 'opt-b', label: '◆' },
      { optionId: 'opt-c', label: '●' },
      { optionId: 'opt-d', label: '■' },
    ],
    correctOptionId: 'opt-a',
    interactionSpec: {
      type: 'pattern_recognition',
      mode: 'cell_builder',
      targetCellIds: ['c33'],
      paletteTokens: [
        { tokenId: '▲', label: '▲', categoryLabel: 'Triangle' },
        { tokenId: '◆', label: '◆', categoryLabel: 'Diamond' },
        { tokenId: '●', label: '●', categoryLabel: 'Circle' },
        { tokenId: '■', label: '■', categoryLabel: 'Square' },
      ],
    },
    initialState: {
      type: 'pattern_recognition',
      activeCellId: 'c33',
      cellSelections: {},
      secondarySelections: {},
      toggledTokenIds: [],
    },
    solutionSpec: {
      type: 'pattern_recognition',
      expectedCells: { c33: '▲' },
    },
    availableHints: [
      'Every row and every column contains each of the three shapes (◆, ▲, ●) exactly once.',
      'Row 3 already contains ● and ◆; Column 3 already contains ● and ◆.',
      'Select ▲ from the palette to complete R3 · C3.',
    ],
    explanation: 'Each row and column is a Latin square of {◆, ▲, ●}, leaving ▲ for R3·C3.',
  },
  {
    id: 'pr-normal-02',
    category: 'pattern_recognition',
    difficulty: 'normal',
    puzzleType: 'pattern_recognition',
    title: 'Cardinality Matrix',
    shortDescription: 'Track both symbol shape and count across rows and columns.',
    instructions: 'Build cell R3 · C3 by selecting both the column shape and the row count multiplier.',
    ruleSummary: 'Column sets the shape; Row sum of counts equals 6',
    estimatedTimeSeconds: 65,
    slots: [
      { slotId: 'c11', label: 'R1 · C1', valueDisplay: '★ × 1', isTargetSlot: false },
      { slotId: 'c12', label: 'R1 · C2', valueDisplay: '◆ × 2', isTargetSlot: false },
      { slotId: 'c13', label: 'R1 · C3', valueDisplay: '● × 3', isTargetSlot: false },
      { slotId: 'c21', label: 'R2 · C1', valueDisplay: '★ × 3', isTargetSlot: false },
      { slotId: 'c22', label: 'R2 · C2', valueDisplay: '◆ × 1', isTargetSlot: false },
      { slotId: 'c23', label: 'R2 · C3', valueDisplay: '● × 2', isTargetSlot: false },
      { slotId: 'c31', label: 'R3 · C1', valueDisplay: '★ × 2', isTargetSlot: false },
      { slotId: 'c32', label: 'R3 · C2', valueDisplay: '◆ × 3', isTargetSlot: false },
      { slotId: 'c33', label: 'R3 · C3', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '● × 1' },
      { optionId: 'opt-b', label: '● × 3' },
      { optionId: 'opt-c', label: '◆ × 1' },
      { optionId: 'opt-d', label: '★ × 1' },
    ],
    correctOptionId: 'opt-a',
    interactionSpec: {
      type: 'pattern_recognition',
      mode: 'cell_builder',
      targetCellIds: ['c33'],
      paletteTokens: [
        { tokenId: '★', label: '★', categoryLabel: 'Star' },
        { tokenId: '◆', label: '◆', categoryLabel: 'Diamond' },
        { tokenId: '●', label: '●', categoryLabel: 'Circle' },
      ],
      secondaryTokens: [
        { tokenId: '1', label: '1', categoryLabel: 'Count ×1' },
        { tokenId: '2', label: '2', categoryLabel: 'Count ×2' },
        { tokenId: '3', label: '3', categoryLabel: 'Count ×3' },
      ],
      joinSeparator: ' × ',
    },
    initialState: {
      type: 'pattern_recognition',
      activeCellId: 'c33',
      cellSelections: {},
      secondarySelections: {},
      toggledTokenIds: [],
    },
    solutionSpec: {
      type: 'pattern_recognition',
      expectedCells: { c33: '●:1' },
    },
    availableHints: [
      'Notice that Column 1 always uses ★, Column 2 uses ◆, and Column 3 uses ●.',
      'Each row contains the counts 1, 2, and 3 exactly once (summing to 6).',
      'Row 3 already has ×2 and ×3, so select Primary shape ● and Secondary count 1.',
    ],
    explanation: 'Column 3 uses ●, and Row 3 already has ×2 and ×3, so the missing cell is ● × 1.',
  },
  {
    id: 'pr-hard-03',
    category: 'pattern_recognition',
    difficulty: 'hard',
    puzzleType: 'pattern_recognition',
    title: 'Vector Rotation Grid',
    shortDescription: 'Follow 90° clockwise arrow rotations across rows and 45° steps down columns.',
    instructions: 'Select the vector direction from the 8-compass palette that completes R3 · C3.',
    ruleSummary: '+90° clockwise across rows; +45° clockwise down columns',
    estimatedTimeSeconds: 90,
    slots: [
      { slotId: 'c11', label: 'R1 · C1', valueDisplay: '↑', isTargetSlot: false },
      { slotId: 'c12', label: 'R1 · C2', valueDisplay: '→', isTargetSlot: false },
      { slotId: 'c13', label: 'R1 · C3', valueDisplay: '↓', isTargetSlot: false },
      { slotId: 'c21', label: 'R2 · C1', valueDisplay: '↗', isTargetSlot: false },
      { slotId: 'c22', label: 'R2 · C2', valueDisplay: '↘', isTargetSlot: false },
      { slotId: 'c23', label: 'R2 · C3', valueDisplay: '↙', isTargetSlot: false },
      { slotId: 'c31', label: 'R3 · C1', valueDisplay: '→', isTargetSlot: false },
      { slotId: 'c32', label: 'R3 · C2', valueDisplay: '↓', isTargetSlot: false },
      { slotId: 'c33', label: 'R3 · C3', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '↑' },
      { optionId: 'opt-b', label: '←' },
      { optionId: 'opt-c', label: '↖' },
      { optionId: 'opt-d', label: '↘' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'pattern_recognition',
      mode: 'cell_builder',
      targetCellIds: ['c33'],
      paletteTokens: [
        { tokenId: '↑', label: '↑', categoryLabel: '0° N' },
        { tokenId: '↗', label: '↗', categoryLabel: '45° NE' },
        { tokenId: '→', label: '→', categoryLabel: '90° E' },
        { tokenId: '↘', label: '↘', categoryLabel: '135° SE' },
        { tokenId: '↓', label: '↓', categoryLabel: '180° S' },
        { tokenId: '↙', label: '↙', categoryLabel: '225° SW' },
        { tokenId: '←', label: '←', categoryLabel: '270° W' },
        { tokenId: '↖', label: '↖', categoryLabel: '315° NW' },
      ],
    },
    initialState: {
      type: 'pattern_recognition',
      activeCellId: 'c33',
      cellSelections: {},
      secondarySelections: {},
      toggledTokenIds: [],
    },
    solutionSpec: {
      type: 'pattern_recognition',
      expectedCells: { c33: '←' },
    },
    availableHints: [
      'Across any row, the arrow rotates 90° clockwise per step (e.g. Row 1: ↑ 0° → → 90° → ↓ 180°).',
      'Down any column, the arrow rotates 45° clockwise per step (e.g. Column 3: ↓ 180° → ↙ 225°).',
      'Rotating ↓ (180°) by 90° clockwise in Row 3 (or ↙ by 45° clockwise in Column 3) lands at ← (270° W).',
    ],
    explanation: 'Rotating ↓ by 90° clockwise across Row 3 (or rotating ↙ by 45° clockwise down Column 3) yields ←.',
  },

  // ==========================================================================
  // 3. MATHEMATICAL LOGIC (mathematical_reasoning)
  // ==========================================================================
  {
    id: 'ml-easy-01',
    category: 'mathematical_logic',
    difficulty: 'easy',
    puzzleType: 'mathematical_reasoning',
    title: 'Triad Balance',
    shortDescription: 'Balance a four-node arithmetic equation network.',
    instructions: 'Enter the exact numeric value of Node β so the node equation holds true.',
    ruleSummary: '(Node α × 3) + Node β = Invariant Σ',
    estimatedTimeSeconds: 40,
    slots: [
      { slotId: 'n1', label: 'Node α', valueDisplay: '12', isTargetSlot: false },
      { slotId: 'n2', label: 'Rule', valueDisplay: '3α + β', isTargetSlot: false },
      { slotId: 'n3', label: 'Node β', valueDisplay: '?', isTargetSlot: true },
      { slotId: 'n4', label: 'Total Σ', valueDisplay: '50', isTargetSlot: false },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '12' },
      { optionId: 'opt-b', label: '14' },
      { optionId: 'opt-c', label: '16' },
      { optionId: 'opt-d', label: '18' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'mathematical_reasoning',
      equationDisplay: '3 × (12) + β = 50',
      variableLabels: [{ variableId: 'beta', label: 'Node β', placeholder: 'Enter β' }],
      allowNegative: false,
      maxDigits: 4,
      quickSteps: [-5, -1, 1, 5],
    },
    initialState: {
      type: 'mathematical_reasoning',
      activeVariableId: 'beta',
      variableValues: { beta: '' },
    },
    solutionSpec: {
      type: 'mathematical_reasoning',
      expectedValues: { beta: 14 },
    },
    availableHints: [
      'First compute the weighted contribution of Node α: 3 × 12 = 36.',
      'The equation simplifies to 36 + β = 50.',
      'Subtract 36 from 50 to get β = 14.',
    ],
    explanation: 'Since 3 × 12 = 36, Node β must be 50 − 36 = 14.',
  },
  {
    id: 'ml-normal-02',
    category: 'mathematical_logic',
    difficulty: 'normal',
    puzzleType: 'mathematical_reasoning',
    title: 'Harmonic Ratio Lock',
    shortDescription: 'Solve for the unknown node in a coupled product-and-difference lock.',
    instructions: 'Compute and enter the integer value for Node β that satisfies the system rule.',
    ruleSummary: '(α × β) − (α + β) = Σ',
    estimatedTimeSeconds: 65,
    slots: [
      { slotId: 'n1', label: 'Node α', valueDisplay: '7', isTargetSlot: false },
      { slotId: 'n2', label: 'Operator', valueDisplay: 'αβ − (α+β)', isTargetSlot: false },
      { slotId: 'n3', label: 'Node β', valueDisplay: '?', isTargetSlot: true },
      { slotId: 'n4', label: 'Output Σ', valueDisplay: '47', isTargetSlot: false },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '8' },
      { optionId: 'opt-b', label: '9' },
      { optionId: 'opt-c', label: '10' },
      { optionId: 'opt-d', label: '11' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'mathematical_reasoning',
      equationDisplay: '(7 × β) − (7 + β) = 47',
      variableLabels: [{ variableId: 'beta', label: 'Node β', placeholder: 'Enter β' }],
      allowNegative: false,
      maxDigits: 4,
      quickSteps: [-5, -1, 1, 5],
    },
    initialState: {
      type: 'mathematical_reasoning',
      activeVariableId: 'beta',
      variableValues: { beta: '' },
    },
    solutionSpec: {
      type: 'mathematical_reasoning',
      expectedValues: { beta: 9 },
    },
    availableHints: [
      'Substitute α = 7 into the operator rule: 7β − (7 + β) = 47.',
      'Combine the β terms: (7β − β) − 7 = 47, which simplifies to 6β − 7 = 47.',
      'Add 7 to both sides (6β = 54) and divide by 6 to get β = 9.',
    ],
    explanation: '7×9 − (7+9) = 63 − 16 = 47, so β = 9.',
  },
  {
    id: 'ml-hard-03',
    category: 'mathematical_logic',
    difficulty: 'hard',
    puzzleType: 'mathematical_reasoning',
    title: 'Quantum Congruence',
    shortDescription: 'Find the unique integer satisfying dual modular and quadratic constraints.',
    instructions: 'Determine and enter the positive integer value of β that satisfies α² − β² = Σ.',
    ruleSummary: 'α² − β² = Σ',
    estimatedTimeSeconds: 85,
    slots: [
      { slotId: 'n1', label: 'Node α', valueDisplay: '13', isTargetSlot: false },
      { slotId: 'n2', label: 'Relation', valueDisplay: 'α² − β²', isTargetSlot: false },
      { slotId: 'n3', label: 'Node β', valueDisplay: '?', isTargetSlot: true },
      { slotId: 'n4', label: 'Invariant Σ', valueDisplay: '120', isTargetSlot: false },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '6' },
      { optionId: 'opt-b', label: '7' },
      { optionId: 'opt-c', label: '8' },
      { optionId: 'opt-d', label: '9' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'mathematical_reasoning',
      equationDisplay: '13² − β² = 120',
      variableLabels: [{ variableId: 'beta', label: 'Node β', placeholder: 'Enter β' }],
      allowNegative: false,
      maxDigits: 4,
      quickSteps: [-5, -1, 1, 5],
    },
    initialState: {
      type: 'mathematical_reasoning',
      activeVariableId: 'beta',
      variableValues: { beta: '' },
    },
    solutionSpec: {
      type: 'mathematical_reasoning',
      expectedValues: { beta: 7 },
    },
    availableHints: [
      'First square Node α: 13² = 169.',
      'Rearrange the equation to isolate β²: β² = 169 − 120 = 49.',
      'Take the positive square root of 49 to find β = 7.',
    ],
    explanation: '13² − 120 = 169 − 120 = 49, and √49 = 7.',
  },

  // ==========================================================================
  // 4. VISUAL PUZZLES (spatial_reasoning, multiple_choice, pattern_recognition)
  // ==========================================================================
  {
    id: 'vp-easy-01',
    category: 'visual_puzzles',
    difficulty: 'easy',
    puzzleType: 'spatial_reasoning',
    title: 'Mirror Symmetry',
    shortDescription: 'Complete a horizontal reflection pattern across a 3×3 visual grid.',
    instructions: 'Use the spatial Flip & Rotate controls to transform L3 (◐) into its horizontal mirror image for R3.',
    ruleSummary: 'Column 3 mirrors Column 1 horizontally across Column 2',
    estimatedTimeSeconds: 40,
    slots: [
      { slotId: 'v11', label: 'L1', valueDisplay: '◢', isTargetSlot: false },
      { slotId: 'v12', label: 'C1', valueDisplay: '■', isTargetSlot: false },
      { slotId: 'v13', label: 'R1', valueDisplay: '◣', isTargetSlot: false },
      { slotId: 'v21', label: 'L2', valueDisplay: '◥', isTargetSlot: false },
      { slotId: 'v22', label: 'C2', valueDisplay: '◆', isTargetSlot: false },
      { slotId: 'v23', label: 'R2', valueDisplay: '◤', isTargetSlot: false },
      { slotId: 'v31', label: 'L3', valueDisplay: '◐', isTargetSlot: false },
      { slotId: 'v32', label: 'C3', valueDisplay: '●', isTargetSlot: false },
      { slotId: 'v33', label: 'R3', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '◐' },
      { optionId: 'opt-b', label: '◑' },
      { optionId: 'opt-c', label: '◓' },
      { optionId: 'opt-d', label: '◒' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'spatial_reasoning',
      mode: 'orientation_manipulator',
      initialOrientationDeg: 0,
      initialFlipH: false,
      initialFlipV: false,
      allowedCommands: ['flip_h', 'flip_v', 'rotate_cw_90', 'rotate_ccw_90'],
      orientationGlyphs: {
        '0:0:0': '◐',
        '0:1:0': '◑',
        '0:0:1': '◐',
        '0:1:1': '◑',
        '90:0:0': '◓',
        '90:1:0': '◓',
        '180:0:0': '◑',
        '180:1:0': '◐',
        '270:0:0': '◒',
        '270:1:0': '◒',
      },
    },
    initialState: {
      type: 'spatial_reasoning',
      orientationDeg: 0,
      flippedH: false,
      flippedV: false,
      voxelHeights: [],
      dieFaces: { top: 1, bottom: 6, north: 2, south: 5, east: 3, west: 4 },
      commandHistory: [],
      selectedFaceValue: null,
    },
    solutionSpec: {
      type: 'spatial_reasoning',
      expectedOrientationDeg: 0,
      expectedFlippedH: true,
    },
    availableHints: [
      'Compare L1 (◢) and R1 (◣): each row reflects Column 1 across a vertical mirror axis.',
      'L3 is ◐ (left half shaded). Reflecting it horizontally swaps left and right.',
      'Tap "Flip Horizontal (↔)" once so the preview displays ◑ with 0° rotation.',
    ],
    explanation: 'Horizontal mirror reflection turns ◐ (left half filled) into ◑ (right half filled).',
  },
  {
    id: 'vp-normal-02',
    category: 'visual_puzzles',
    difficulty: 'normal',
    puzzleType: 'multiple_choice',
    title: 'Overlay Superposition',
    shortDescription: 'Combine two visual tiles in each row to form the third composite tile.',
    instructions: 'Cell 1 + Cell 2 combine their strokes to form Cell 3. Select the composite figure.',
    ruleSummary: 'Additive visual overlay: Left ∪ Center = Right',
    estimatedTimeSeconds: 55,
    slots: [
      { slotId: 'v11', label: 'Layer A', valueDisplay: '─', isTargetSlot: false },
      { slotId: 'v12', label: 'Layer B', valueDisplay: '│', isTargetSlot: false },
      { slotId: 'v13', label: 'Combined', valueDisplay: '┼', isTargetSlot: false },
      { slotId: 'v21', label: 'Layer A', valueDisplay: '╱', isTargetSlot: false },
      { slotId: 'v22', label: 'Layer B', valueDisplay: '╲', isTargetSlot: false },
      { slotId: 'v23', label: 'Combined', valueDisplay: '╳', isTargetSlot: false },
      { slotId: 'v31', label: 'Layer A', valueDisplay: '□', isTargetSlot: false },
      { slotId: 'v32', label: 'Layer B', valueDisplay: '┼', isTargetSlot: false },
      { slotId: 'v33', label: 'Combined', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '⊞' },
      { optionId: 'opt-b', label: '☒' },
      { optionId: 'opt-c', label: '◈' },
      { optionId: 'opt-d', label: '▣' },
    ],
    correctOptionId: 'opt-a',
    interactionSpec: {
      type: 'multiple_choice',
      options: [
        { optionId: 'opt-a', label: '⊞', detail: 'Outer Square + Orthogonal Cross' },
        { optionId: 'opt-b', label: '☒', detail: 'Outer Square + Diagonal Cross' },
        { optionId: 'opt-c', label: '◈', detail: 'Nested Diamond' },
        { optionId: 'opt-d', label: '▣', detail: 'Nested Core Square' },
      ],
    },
    initialState: {
      type: 'multiple_choice',
      selectedOptionId: '',
    },
    solutionSpec: {
      type: 'multiple_choice',
      correctOptionId: 'opt-a',
    },
    availableHints: [
      'In Row 1, horizontal (─) and vertical (│) strokes combine into a plus cross (┼).',
      'In Row 3, Layer A is an outer square (□) and Layer B is an orthogonal cross (┼).',
      'Superimposing □ and ┼ yields the four-pane windowed square ⊞.',
    ],
    explanation: 'Superimposing the outer square □ and orthogonal cross ┼ produces the windowed square ⊞.',
  },
  {
    id: 'vp-hard-03',
    category: 'visual_puzzles',
    difficulty: 'hard',
    puzzleType: 'pattern_recognition',
    title: 'XOR Cancellation',
    shortDescription: 'Keep only elements that appear in one tile but not both.',
    instructions: 'Toggle the active shape layers so only the non-overlapping XOR elements remain for Row 3.',
    ruleSummary: 'Symmetric difference (XOR): keep non-overlapping parts',
    estimatedTimeSeconds: 85,
    slots: [
      { slotId: 'v11', label: 'Tile 1', valueDisplay: '▲ + ●', isTargetSlot: false },
      { slotId: 'v12', label: 'Tile 2', valueDisplay: '● + ■', isTargetSlot: false },
      { slotId: 'v13', label: 'XOR Out', valueDisplay: '▲ + ■', isTargetSlot: false },
      { slotId: 'v21', label: 'Tile 1', valueDisplay: '◆ + ★', isTargetSlot: false },
      { slotId: 'v22', label: 'Tile 2', valueDisplay: '★ + ▲', isTargetSlot: false },
      { slotId: 'v23', label: 'XOR Out', valueDisplay: '◆ + ▲', isTargetSlot: false },
      { slotId: 'v31', label: 'Tile 1', valueDisplay: '■ + ◆', isTargetSlot: false },
      { slotId: 'v32', label: 'Tile 2', valueDisplay: '◆ + ●', isTargetSlot: false },
      { slotId: 'v33', label: 'XOR Out', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '◆ + ●' },
      { optionId: 'opt-b', label: '■ + ●' },
      { optionId: 'opt-c', label: '■ + ◆' },
      { optionId: 'opt-d', label: '● + ★' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'pattern_recognition',
      mode: 'layer_toggle',
      targetCellIds: ['v33'],
      paletteTokens: [
        { tokenId: '■', label: '■', categoryLabel: 'Square Layer' },
        { tokenId: '◆', label: '◆', categoryLabel: 'Diamond Layer' },
        { tokenId: '●', label: '●', categoryLabel: 'Circle Layer' },
        { tokenId: '▲', label: '▲', categoryLabel: 'Triangle Layer' },
      ],
    },
    initialState: {
      type: 'pattern_recognition',
      activeCellId: 'v33',
      cellSelections: {},
      secondarySelections: {},
      toggledTokenIds: [],
    },
    solutionSpec: {
      type: 'pattern_recognition',
      expectedToggledTokenIds: ['■', '●'],
    },
    availableHints: [
      'Compare Tile 1 and Tile 2 in each row: any symbol present in both tiles cancels out.',
      'In Row 3, ◆ appears in both Tile 1 (■ + ◆) and Tile 2 (◆ + ●), so ◆ is eliminated.',
      'Toggle ON only ■ and ● to form the symmetric difference ■ + ●.',
    ],
    explanation: 'Cancelling the shared ◆ from (■ + ◆) and (◆ + ●) leaves ■ + ●.',
  },

  // ==========================================================================
  // 5. SPATIAL REASONING (multiple_choice & spatial_reasoning)
  // ==========================================================================
  {
    id: 'sr-easy-01',
    category: 'spatial_reasoning',
    difficulty: 'easy',
    puzzleType: 'multiple_choice',
    title: 'Cube Net Folding',
    shortDescription: 'Identify which face lies opposite the target face when folded into a cube.',
    instructions: 'In a standard cross net [1–2–3–4 vertical, 5–6 wings], select the face opposite Face 1.',
    ruleSummary: 'Opposite faces in a linear net strip are separated by one intermediate square',
    estimatedTimeSeconds: 45,
    slots: [
      { slotId: 'sp1', label: 'Top Flap', valueDisplay: 'Face 1', isTargetSlot: false },
      { slotId: 'sp2', label: 'Center', valueDisplay: 'Face 2', isTargetSlot: false },
      { slotId: 'sp3', label: 'Bottom', valueDisplay: 'Face 3', isTargetSlot: false },
      { slotId: 'sp4', label: 'Opposite of 1', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Face 2' },
      { optionId: 'opt-b', label: 'Face 3' },
      { optionId: 'opt-c', label: 'Face 4' },
      { optionId: 'opt-d', label: 'Face 5' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'multiple_choice',
      options: [
        { optionId: 'opt-a', label: 'Face 2', detail: 'Adjacent center fold' },
        { optionId: 'opt-b', label: 'Face 3', detail: 'Separated by 1 face (Opposite)' },
        { optionId: 'opt-c', label: 'Face 4', detail: 'Tail flap wraps adjacent' },
        { optionId: 'opt-d', label: 'Face 5', detail: 'Lateral wing face' },
      ],
    },
    initialState: {
      type: 'multiple_choice',
      selectedOptionId: '',
    },
    solutionSpec: {
      type: 'multiple_choice',
      correctOptionId: 'opt-b',
    },
    availableHints: [
      'Hold Face 2 flat as the base of the cube.',
      'Fold Face 1 up 90° on the north edge and Face 3 up 90° on the south edge.',
      'Because Face 1 and Face 3 are separated by one square (Face 2), they fold to sit directly opposite each other.',
    ],
    explanation: 'Along any straight line of 3 squares in a cube net, the outer two squares fold to become opposite faces (Face 1 opposite Face 3).',
  },
  {
    id: 'sr-normal-02',
    category: 'spatial_reasoning',
    difficulty: 'normal',
    puzzleType: 'spatial_reasoning',
    title: 'Orthographic Voxel Count',
    shortDescription: 'Construct a 3D voxel stack on a 2×2 base to match the target elevations.',
    instructions: 'Adjust the 4 voxel column heights on the 2×2 base to match the blueprint elevations: Front=[3, 2], Back=[2, 1].',
    ruleSummary: 'Column heights on the 2×2 base are [3, 2] in front and [2, 1] in back',
    estimatedTimeSeconds: 65,
    slots: [
      { slotId: 'sp1', label: 'Front-Left', valueDisplay: '3 high', isTargetSlot: false },
      { slotId: 'sp2', label: 'Front-Right', valueDisplay: '2 high', isTargetSlot: false },
      { slotId: 'sp3', label: 'Back Row', valueDisplay: '2 & 1 high', isTargetSlot: false },
      { slotId: 'sp4', label: 'Total Cubes', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '6 Cubes' },
      { optionId: 'opt-b', label: '7 Cubes' },
      { optionId: 'opt-c', label: '8 Cubes' },
      { optionId: 'opt-d', label: '9 Cubes' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'spatial_reasoning',
      mode: 'voxel_projection',
      voxelGridLabels: [
        'Front-Left (Target 3)',
        'Front-Right (Target 2)',
        'Back-Left (Target 2)',
        'Back-Right (Target 1)',
      ],
      maxVoxelHeight: 4,
      targetProjectionSummary: 'Front: [3, 2] · Back: [2, 1] → Total = 8 Cubes',
    },
    initialState: {
      type: 'spatial_reasoning',
      orientationDeg: 0,
      flippedH: false,
      flippedV: false,
      voxelHeights: [1, 1, 1, 1],
      dieFaces: { top: 1, bottom: 6, north: 2, south: 5, east: 3, west: 4 },
      commandHistory: [],
      selectedFaceValue: null,
    },
    solutionSpec: {
      type: 'spatial_reasoning',
      expectedVoxelHeights: [3, 2, 2, 1],
      expectedVoxelSum: 8,
    },
    availableHints: [
      'Match the front row stacks first: set Front-Left to height 3 and Front-Right to height 2.',
      'Match the back row stacks next: set Back-Left to height 2 and Back-Right to height 1.',
      'Verify the four stacks read [3, 2, 2, 1] for a total of 3 + 2 + 2 + 1 = 8 cubes.',
    ],
    explanation: 'Setting the four stacks to [3, 2, 2, 1] yields 3 + 2 + 2 + 1 = 8 unit cubes.',
  },
  {
    id: 'sr-hard-03',
    category: 'spatial_reasoning',
    difficulty: 'hard',
    puzzleType: 'spatial_reasoning',
    title: 'Dual-Axis Quaternion Turn',
    shortDescription: 'Rotate the 3D die along two orthogonal axes and lock in the resulting Top face.',
    instructions: 'Execute Pitch 90° North followed by Roll 90° East on the die simulator (or select the final Top face directly).',
    ruleSummary: 'Pitch North brings South face to Top; Roll East brings West face to Top',
    estimatedTimeSeconds: 90,
    slots: [
      { slotId: 'sp1', label: 'Initial State', valueDisplay: 'Top 1 · N 2 · E 3', isTargetSlot: false },
      { slotId: 'sp2', label: 'Step 1', valueDisplay: 'Pitch 90° North', isTargetSlot: false },
      { slotId: 'sp3', label: 'Step 2', valueDisplay: 'Roll 90° East', isTargetSlot: false },
      { slotId: 'sp4', label: 'Final Top Face', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Face 3' },
      { optionId: 'opt-b', label: 'Face 4' },
      { optionId: 'opt-c', label: 'Face 5' },
      { optionId: 'opt-d', label: 'Face 6' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'spatial_reasoning',
      mode: 'die_rotation',
      initialDieFaces: {
        top: 1,
        bottom: 6,
        north: 2,
        south: 5,
        east: 3,
        west: 4,
      },
      allowedCommands: ['pitch_north', 'pitch_south', 'roll_east', 'roll_west'],
    },
    initialState: {
      type: 'spatial_reasoning',
      orientationDeg: 0,
      flippedH: false,
      flippedV: false,
      voxelHeights: [],
      dieFaces: { top: 1, bottom: 6, north: 2, south: 5, east: 3, west: 4 },
      commandHistory: [],
      selectedFaceValue: null,
    },
    solutionSpec: {
      type: 'spatial_reasoning',
      expectedTopFace: 4,
    },
    availableHints: [
      'Opposite faces on the standard die sum to 7: initially Top=1, Bottom=6, North=2, South=5, East=3, West=4.',
      'Step 1 (Pitch 90° North) rotates around the East-West axis, so East (3) and West (4) stay in place while South (5) moves to Top.',
      'Step 2 (Roll 90° East) rolls the West face (4) up onto the Top position.',
    ],
    explanation: 'Pitching North leaves East=3 and West=4 unchanged. Rolling 90° East moves the West face (4) to the Top.',
  },

  // ==========================================================================
  // 6. DEDUCTION AND ELIMINATION (logical_deduction & sequence_puzzle reorder)
  // ==========================================================================
  {
    id: 'de-easy-01',
    category: 'deduction_elimination',
    difficulty: 'easy',
    puzzleType: 'logical_deduction',
    title: 'Three Vaults',
    shortDescription: 'Eliminate impossible assignments from three mutually exclusive clues.',
    instructions: 'Use the deduction grid to eliminate impossible pairs (✕) and confirm (✓) which Vault holds each Core.',
    ruleSummary: 'Apply elimination across the three vault constraints',
    estimatedTimeSeconds: 45,
    slots: [
      { slotId: 'd1', label: 'Clue 1', valueDisplay: 'Red is in Vault 1', isTargetSlot: false },
      { slotId: 'd2', label: 'Clue 2', valueDisplay: 'Blue is NOT in Vault 3', isTargetSlot: false },
      { slotId: 'd3', label: 'Deduction', valueDisplay: 'Blue → Vault 2', isTargetSlot: false },
      { slotId: 'd4', label: 'Vault 3 Core', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Red Core' },
      { optionId: 'opt-b', label: 'Blue Core' },
      { optionId: 'opt-c', label: 'Cyan Core' },
      { optionId: 'opt-d', label: 'Amber Core' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'logical_deduction',
      clues: [
        'Clue 1: Red Core is locked inside Vault 1.',
        'Clue 2: Blue Core is NOT in Vault 3.',
        'Clue 3: Each Vault holds exactly one Core.',
      ],
      rowEntities: [
        { id: 'vault_1', label: 'Vault 1' },
        { id: 'vault_2', label: 'Vault 2' },
        { id: 'vault_3', label: 'Vault 3' },
      ],
      colTargets: [
        { id: 'Red Core', label: 'Red Core' },
        { id: 'Blue Core', label: 'Blue Core' },
        { id: 'Cyan Core', label: 'Cyan Core' },
      ],
      targetQuestionRowId: 'vault_3',
    },
    initialState: {
      type: 'logical_deduction',
      gridMarks: {},
      assignments: {},
    },
    solutionSpec: {
      type: 'logical_deduction',
      expectedAssignments: {
        vault_1: 'Red Core',
        vault_2: 'Blue Core',
        vault_3: 'Cyan Core',
      },
    },
    availableHints: [
      'Clue 1 directly locks Vault 1 = Red Core.',
      'Since Vault 1 is taken and Clue 2 says Blue Core is not in Vault 3, Blue Core must be in Vault 2.',
      'Confirm Vault 1 = Red Core, Vault 2 = Blue Core, and Vault 3 = Cyan Core.',
    ],
    explanation: 'With Red in Vault 1 and Blue forced into Vault 2, Cyan Core must occupy Vault 3.',
  },
  {
    id: 'de-normal-02',
    category: 'deduction_elimination',
    difficulty: 'normal',
    puzzleType: 'sequence_puzzle',
    title: 'Arrival Order',
    shortDescription: 'Order four vessels from 1st to 4th using relative arrival clues.',
    instructions: 'Reorder the four ships into their exact 1st-to-4th docking sequence using the move controls or drag-and-drop.',
    ruleSummary: 'Vega before Orion; Nova after Orion; Zenith docked 2nd',
    estimatedTimeSeconds: 65,
    slots: [
      { slotId: 'd1', label: 'Clue 1', valueDisplay: 'Zenith = 2nd', isTargetSlot: false },
      { slotId: 'd2', label: 'Clue 2', valueDisplay: 'Vega before Orion', isTargetSlot: false },
      { slotId: 'd3', label: 'Clue 3', valueDisplay: 'Orion before Nova', isTargetSlot: false },
      { slotId: 'd4', label: 'Docking Sequence', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Nova' },
      { optionId: 'opt-b', label: 'Orion' },
      { optionId: 'opt-c', label: 'Vega' },
      { optionId: 'opt-d', label: 'Zenith' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'sequence_puzzle',
      mode: 'reorder_tokens',
      targetSlotIds: ['d4'],
      initialTokens: [
        { tokenId: 'Nova', label: 'Nova' },
        { tokenId: 'Zenith', label: 'Zenith' },
        { tokenId: 'Orion', label: 'Orion' },
        { tokenId: 'Vega', label: 'Vega' },
      ],
    },
    initialState: {
      type: 'sequence_puzzle',
      activeSlotId: 'd4',
      slotValues: {},
      orderedTokenIds: ['Nova', 'Zenith', 'Orion', 'Vega'],
    },
    solutionSpec: {
      type: 'sequence_puzzle',
      expectedTokenOrder: ['Vega', 'Zenith', 'Orion', 'Nova'],
    },
    availableHints: [
      'Combine Clue 2 (Vega before Orion) and Clue 3 (Orion before Nova) into a strict three-ship chain: Vega → Orion → Nova.',
      'Clue 1 fixes Zenith in 2nd place, leaving 1st, 3rd, and 4th for the three-ship chain.',
      'Place Vega 1st, Zenith 2nd, Orion 3rd, and Nova 4th.',
    ],
    explanation: 'Since Zenith takes 2nd place and Vega → Orion → Nova must fit in the remaining three slots (1st, 3rd, 4th), the order is Vega, Zenith, Orion, Nova.',
  },
  {
    id: 'de-hard-03',
    category: 'deduction_elimination',
    difficulty: 'hard',
    puzzleType: 'logical_deduction',
    title: 'Single Truth Protocol',
    shortDescription: 'Identify the active node when only one of three sensors tells the truth.',
    instructions: 'One Core (A, B, or C) holds the key, and at most one sensor is truthful. Assign the true status for each Core.',
    ruleSummary: 'Test each hypothesis until exactly 1 statement evaluates to True',
    estimatedTimeSeconds: 95,
    slots: [
      { slotId: 'd1', label: 'Sensor A', valueDisplay: '"Key is in A"', isTargetSlot: false },
      { slotId: 'd2', label: 'Sensor B', valueDisplay: '"Key is NOT in B"', isTargetSlot: false },
      { slotId: 'd3', label: 'Sensor C', valueDisplay: '"Key is NOT in A"', isTargetSlot: false },
      { slotId: 'd4', label: 'True Location', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Core A' },
      { optionId: 'opt-b', label: 'Core B' },
      { optionId: 'opt-c', label: 'Core C' },
      { optionId: 'opt-d', label: 'None' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'logical_deduction',
      clues: [
        'Sensor A claims: "The Key is in Core A."',
        'Sensor B claims: "The Key is NOT in Core B."',
        'Sensor C claims: "The Key is NOT in Core A."',
        'Protocol Invariant: Exactly ONE of the three sensors is telling the truth.',
      ],
      rowEntities: [{ id: 'key_holder', label: 'True Key Location' }],
      colTargets: [
        { id: 'Core A', label: 'Core A' },
        { id: 'Core B', label: 'Core B' },
        { id: 'Core C', label: 'Core C' },
      ],
      targetQuestionRowId: 'key_holder',
    },
    initialState: {
      type: 'logical_deduction',
      gridMarks: {},
      assignments: {},
    },
    solutionSpec: {
      type: 'logical_deduction',
      expectedAssignments: {
        key_holder: 'Core B',
      },
    },
    availableHints: [
      'Notice that Sensor A ("Key is in A") and Sensor C ("Key is NOT in A") directly contradict each other, so one of them MUST be the sole truth-teller.',
      'Since the single truth belongs to either A or C, Sensor B ("Key is NOT in B") must be FALSE.',
      'Because Sensor B is false, the Key IS in Core B (making C true and A & B false).',
    ],
    explanation: 'If the key is in Core B: Sensor A is false, Sensor B is false, and Sensor C ("Not in A") is the ONLY true statement.',
  },

  // ==========================================================================
  // 7. SHAPE AND SYMBOL CHALLENGES (cipher_code)
  // ==========================================================================
  {
    id: 'ss-easy-01',
    category: 'shape_symbol',
    difficulty: 'easy',
    puzzleType: 'cipher_code',
    title: 'Vertex Increment Operator',
    shortDescription: 'Apply a polygon vertex-addition operator to a source shape.',
    instructions: 'Operator Δ(+1) adds one vertex to a polygon. Decode the output glyph for Pentagon (5).',
    ruleSummary: 'Δ(+1): Triangle(3) → Square(4) → Pentagon(5) → ?',
    estimatedTimeSeconds: 40,
    slots: [
      { slotId: 'sh1', label: 'Example', valueDisplay: '△ (3) → □ (4)', isTargetSlot: false },
      { slotId: 'sh2', label: 'Input Glyph', valueDisplay: '⬠ Pentagon (5)', isTargetSlot: false },
      { slotId: 'sh3', label: 'Operator', valueDisplay: 'Δ (+1 Vertex)', isTargetSlot: false },
      { slotId: 'sh4', label: 'Output Glyph', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '◇ Rhombus (4)' },
      { optionId: 'opt-b', label: '⬡ Hexagon (6)' },
      { optionId: 'opt-c', label: '◯ Circle (0)' },
      { optionId: 'opt-d', label: '△ Triangle (3)' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'cipher_code',
      cipherRuleTitle: 'Vertex Shift Cipher Δ(+1)',
      referenceMappings: [
        { source: '△ (3)', target: '□ (4)' },
        { source: '□ (4)', target: '⬠ (5)' },
        { source: '⬠ (5)', target: '?' },
      ],
      encodedPrompt: 'Δ(+1) applied to ⬠ Pentagon (5)',
      slotLabels: ['Decoded Polygon'],
      symbolPalette: [
        { symbolId: '△ Triangle (3)', label: '△ Triangle (3)' },
        { symbolId: '◇ Rhombus (4)', label: '◇ Rhombus (4)' },
        { symbolId: '⬠ Pentagon (5)', label: '⬠ Pentagon (5)' },
        { symbolId: '⬡ Hexagon (6)', label: '⬡ Hexagon (6)' },
      ],
      supportsShiftDial: true,
      initialShift: 1,
    },
    initialState: {
      type: 'cipher_code',
      activeSlotIndex: 0,
      decodedSlots: [''],
      dialShift: 1,
    },
    solutionSpec: {
      type: 'cipher_code',
      expectedSlots: ['⬡ Hexagon (6)'],
    },
    availableHints: [
      'Count the sides/vertices of the input shape: a Pentagon has 5 vertices.',
      'Operator Δ(+1) adds 1 vertex to the input polygon (5 + 1 = 6).',
      'Select ⬡ Hexagon (6) from the symbol palette.',
    ],
    explanation: '5 vertices + 1 vertex = 6 vertices (⬡ Hexagon (6)).',
  },
  {
    id: 'ss-normal-02',
    category: 'shape_symbol',
    difficulty: 'normal',
    puzzleType: 'cipher_code',
    title: 'Polarity & Scale Cipher',
    shortDescription: 'Apply a dual symbol rule that inverts fill polarity and doubles count.',
    instructions: 'Operator Ω flips hollow/filled polarity and doubles the glyph count. Enter all 4 decoded symbols for Ω(■■).',
    ruleSummary: 'Ω( hollow → filled, filled → hollow, count × 2 )',
    estimatedTimeSeconds: 60,
    slots: [
      { slotId: 'sh1', label: 'Rule Sample', valueDisplay: '○ → ●●', isTargetSlot: false },
      { slotId: 'sh2', label: 'Input State', valueDisplay: '■■ (2 Filled)', isTargetSlot: false },
      { slotId: 'sh3', label: 'Transform', valueDisplay: 'Apply Ω', isTargetSlot: false },
      { slotId: 'sh4', label: 'Result State', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '□□ (2 Hollow)' },
      { optionId: 'opt-b', label: '■■■■ (4 Filled)' },
      { optionId: 'opt-c', label: '□□□□ (4 Hollow)' },
      { optionId: 'opt-d', label: '□■□■ (Mixed)' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'cipher_code',
      cipherRuleTitle: 'Operator Ω: Invert Polarity & ×2 Length',
      referenceMappings: [
        { source: '○', target: '● ●' },
        { source: '■', target: '□ □' },
      ],
      encodedPrompt: 'Input: ■ ■  ──[ Ω ]──►  4 Code Slots',
      slotLabels: ['Glyph 1', 'Glyph 2', 'Glyph 3', 'Glyph 4'],
      symbolPalette: [
        { symbolId: '□', label: '□ Hollow' },
        { symbolId: '■', label: '■ Filled' },
        { symbolId: '○', label: '○ Hollow' },
        { symbolId: '●', label: '● Filled' },
      ],
    },
    initialState: {
      type: 'cipher_code',
      activeSlotIndex: 0,
      decodedSlots: ['', '', '', ''],
      dialShift: 0,
    },
    solutionSpec: {
      type: 'cipher_code',
      expectedSlots: ['□', '□', '□', '□'],
    },
    availableHints: [
      'First apply the polarity inversion: filled squares (■) become hollow squares (□).',
      'Next apply the scale rule: 2 input glyphs double to 2 × 2 = 4 output glyphs.',
      'Enter □ (Hollow Square) into all 4 code slots: □ □ □ □.',
    ],
    explanation: 'Inverting ■■ to hollow and doubling the count yields □□□□.',
  },
  {
    id: 'ss-hard-03',
    category: 'shape_symbol',
    difficulty: 'hard',
    puzzleType: 'cipher_code',
    title: 'Composite Glyph Grammar',
    shortDescription: 'Chain two symbolic operators in sequence: Swap Order (⇄) then Invert (¬).',
    instructions: 'Apply ⇄ (swap left & right) followed by ¬ (flip hollow/solid) to [● ◇] and enter the Left and Right output glyphs.',
    ruleSummary: 'Pipeline: [● ◇] → ⇄ → ¬ → ?',
    estimatedTimeSeconds: 85,
    slots: [
      { slotId: 'sh1', label: 'Input Pair', valueDisplay: '[ ●   ◇ ]', isTargetSlot: false },
      { slotId: 'sh2', label: 'Step 1 (⇄)', valueDisplay: '[ ◇   ● ]', isTargetSlot: false },
      { slotId: 'sh3', label: 'Step 2 (¬)', valueDisplay: 'Invert Fill', isTargetSlot: false },
      { slotId: 'sh4', label: 'Final Pair', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '[ ◆   ○ ]' },
      { optionId: 'opt-b', label: '[ ○   ◆ ]' },
      { optionId: 'opt-c', label: '[ ◇   ○ ]' },
      { optionId: 'opt-d', label: '[ ●   ◆ ]' },
    ],
    correctOptionId: 'opt-a',
    interactionSpec: {
      type: 'cipher_code',
      cipherRuleTitle: 'Pipeline: Swap (⇄) then Polarity Invert (¬)',
      referenceMappings: [
        { source: '● (Solid Circle)', target: '○ (Hollow Circle)' },
        { source: '◇ (Hollow Diamond)', target: '◆ (Solid Diamond)' },
      ],
      encodedPrompt: '[ ● , ◇ ] ──► ⇄ ──► ¬ ──► [ Slot 1 , Slot 2 ]',
      slotLabels: ['Left Glyph', 'Right Glyph'],
      symbolPalette: [
        { symbolId: '◆', label: '◆ Solid' },
        { symbolId: '◇', label: '◇ Hollow' },
        { symbolId: '●', label: '● Solid' },
        { symbolId: '○', label: '○ Hollow' },
      ],
    },
    initialState: {
      type: 'cipher_code',
      activeSlotIndex: 0,
      decodedSlots: ['', ''],
      dialShift: 0,
    },
    solutionSpec: {
      type: 'cipher_code',
      expectedSlots: ['◆', '○'],
    },
    availableHints: [
      'Execute Step 1 (⇄ Swap) on [●, ◇] to get the intermediate pair [◇, ●].',
      'Execute Step 2 (¬ Invert Fill) on each glyph of [◇, ●]: hollow ◇ becomes solid ◆, and solid ● becomes hollow ○.',
      'Enter ◆ in Left Glyph (Slot 1) and ○ in Right Glyph (Slot 2).',
    ],
    explanation: 'Swapping [● ◇] gives [◇ ●], and inverting fill polarity gives [◆ ○].',
  },

  // ==========================================================================
  // 8. MEMORY AND OBSERVATION (memory_challenge)
  // ==========================================================================
  {
    id: 'mo-easy-01',
    category: 'memory_observation',
    difficulty: 'easy',
    puzzleType: 'memory_challenge',
    title: 'Odd Sector Out',
    shortDescription: 'Memorize the sector coordinate pairs and recall which sector broke the symmetry.',
    instructions: 'Study the four sectors, then switch to Recall mode and identify the anomalous sector.',
    ruleSummary: 'Standard sectors repeat the same letter-number pair (X7-X7)',
    estimatedTimeSeconds: 40,
    slots: [
      { slotId: 'm1', label: 'Sector 1', valueDisplay: 'A4 — A4', isTargetSlot: false },
      { slotId: 'm2', label: 'Sector 2', valueDisplay: 'C9 — C9', isTargetSlot: false },
      { slotId: 'm3', label: 'Sector 3', valueDisplay: 'F2 — F5', isTargetSlot: false },
      { slotId: 'm4', label: 'Anomalous Sector', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: 'Sector 1 (A4—A4)' },
      { optionId: 'opt-b', label: 'Sector 2 (C9—C9)' },
      { optionId: 'opt-c', label: 'Sector 3 (F2—F5)' },
      { optionId: 'opt-d', label: 'None' },
    ],
    correctOptionId: 'opt-c',
    interactionSpec: {
      type: 'memory_challenge',
      studyDurationSeconds: 6,
      studySlots: [
        { slotId: 'm1', label: 'Sector 1', studyValue: 'A4 — A4' },
        { slotId: 'm2', label: 'Sector 2', studyValue: 'C9 — C9' },
        { slotId: 'm3', label: 'Sector 3', studyValue: 'F2 — F5' },
        { slotId: 'm4', label: 'Sector 4', studyValue: 'K8 — K8' },
      ],
      recallTargetIds: [
        { targetId: 'anomaly', promptLabel: 'Which sector had mismatched coordinates?' },
      ],
      recallPalette: [
        { tokenId: 'Sector 1 (A4—A4)', label: 'Sector 1 (A4—A4)' },
        { tokenId: 'Sector 2 (C9—C9)', label: 'Sector 2 (C9—C9)' },
        { tokenId: 'Sector 3 (F2—F5)', label: 'Sector 3 (F2—F5)' },
        { tokenId: 'Sector 4 (K8—K8)', label: 'Sector 4 (K8—K8)' },
      ],
    },
    initialState: {
      type: 'memory_challenge',
      phase: 'study',
      activeTargetId: 'anomaly',
      recalledValues: {},
      studyPeekCount: 0,
    },
    solutionSpec: {
      type: 'memory_challenge',
      expectedRecall: { anomaly: 'Sector 3 (F2—F5)' },
    },
    availableHints: [
      'Check whether both sides of the dash are identical in each sector.',
      'Sectors 1, 2, and 4 repeat the exact same coordinate on both sides.',
      'Select Sector 3 (F2—F5) as the anomalous sector.',
    ],
    explanation: 'Sector 3 displays F2 — F5 instead of an identical pair.',
  },
  {
    id: 'mo-normal-02',
    category: 'memory_observation',
    difficulty: 'normal',
    puzzleType: 'memory_challenge',
    title: 'State Delta Scan',
    shortDescription: 'Memorize Scan Alpha and Scan Beta, then recall which symbol mutated.',
    instructions: 'Study Scan Alpha and Scan Beta carefully, then recall the exact symbol mutation.',
    ruleSummary: 'Identify the single mutated element between the two observation frames',
    estimatedTimeSeconds: 60,
    slots: [
      { slotId: 'm1', label: 'Scan Alpha', valueDisplay: '◆  ▲  ●  ★  ■', isTargetSlot: false },
      { slotId: 'm2', label: 'Scan Beta', valueDisplay: '◆  ▲  ◈  ★  ■', isTargetSlot: false },
      { slotId: 'm3', label: 'Position', valueDisplay: 'Index 3', isTargetSlot: false },
      { slotId: 'm4', label: 'Changed Symbol', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '▲ became △' },
      { optionId: 'opt-b', label: '● became ◈' },
      { optionId: 'opt-c', label: '★ became ✦' },
      { optionId: 'opt-d', label: '■ became □' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'memory_challenge',
      studyDurationSeconds: 7,
      studySlots: [
        { slotId: 'alpha', label: 'Scan Alpha', studyValue: '◆   ▲   ●   ★   ■' },
        { slotId: 'beta', label: 'Scan Beta', studyValue: '◆   ▲   ◈   ★   ■' },
      ],
      recallTargetIds: [
        { targetId: 'mutation', promptLabel: 'Recalled State Mutation at Index 3' },
      ],
      recallPalette: [
        { tokenId: '▲ became △', label: '▲ became △' },
        { tokenId: '● became ◈', label: '● became ◈' },
        { tokenId: '★ became ✦', label: '★ became ✦' },
        { tokenId: '■ became □', label: '■ became □' },
      ],
    },
    initialState: {
      type: 'memory_challenge',
      phase: 'study',
      activeTargetId: 'mutation',
      recalledValues: {},
      studyPeekCount: 0,
    },
    solutionSpec: {
      type: 'memory_challenge',
      expectedRecall: { mutation: '● became ◈' },
    },
    availableHints: [
      'Compare Scan Alpha and Scan Beta symbol by symbol from left to right.',
      'Positions 1, 2, 4, and 5 remain ◆, ▲, ★, and ■ in both scans.',
      'At position 3 (center), ● mutated into ◈.',
    ],
    explanation: 'At position 3, the circle ● in Scan Alpha changed to ◈ in Scan Beta.',
  },
  {
    id: 'mo-hard-03',
    category: 'memory_observation',
    difficulty: 'hard',
    puzzleType: 'memory_challenge',
    title: 'Frequency Checksum',
    shortDescription: 'Count the exact occurrences of the target glyph in a dense signal array during the exposure window.',
    instructions: 'Count how many times "◈" appears across the three signal rows during Study mode, then lock in the count during Recall.',
    ruleSummary: 'Scan all 15 symbols and count exact matches for ◈',
    estimatedTimeSeconds: 85,
    slots: [
      { slotId: 'm1', label: 'Signal Row 1', valueDisplay: '◈  ◇  ◈  ◆  ◇', isTargetSlot: false },
      { slotId: 'm2', label: 'Signal Row 2', valueDisplay: '◆  ◈  ◇  ◈  ◈', isTargetSlot: false },
      { slotId: 'm3', label: 'Signal Row 3', valueDisplay: '◇  ◆  ◈  ◇  ◆', isTargetSlot: false },
      { slotId: 'm4', label: 'Total ◈ Count', valueDisplay: '?', isTargetSlot: true },
    ],
    candidateOptions: [
      { optionId: 'opt-a', label: '5 Occurrences' },
      { optionId: 'opt-b', label: '6 Occurrences' },
      { optionId: 'opt-c', label: '7 Occurrences' },
      { optionId: 'opt-d', label: '8 Occurrences' },
    ],
    correctOptionId: 'opt-b',
    interactionSpec: {
      type: 'memory_challenge',
      studyDurationSeconds: 8,
      studySlots: [
        { slotId: 'r1', label: 'Signal Row 1', studyValue: '◈   ◇   ◈   ◆   ◇' },
        { slotId: 'r2', label: 'Signal Row 2', studyValue: '◆   ◈   ◇   ◈   ◈' },
        { slotId: 'r3', label: 'Signal Row 3', studyValue: '◇   ◆   ◈   ◇   ◆' },
      ],
      recallTargetIds: [
        { targetId: 'count', promptLabel: 'Total occurrences of target glyph ◈' },
      ],
      recallPalette: [
        { tokenId: '5 Occurrences', label: '5 Occurrences' },
        { tokenId: '6 Occurrences', label: '6 Occurrences' },
        { tokenId: '7 Occurrences', label: '7 Occurrences' },
        { tokenId: '8 Occurrences', label: '8 Occurrences' },
      ],
    },
    initialState: {
      type: 'memory_challenge',
      phase: 'study',
      activeTargetId: 'count',
      recalledValues: {},
      studyPeekCount: 0,
    },
    solutionSpec: {
      type: 'memory_challenge',
      expectedRecall: { count: '6 Occurrences' },
    },
    availableHints: [
      'Distinguish ◈ (nested diamond) carefully from ◇ (hollow) and ◆ (solid).',
      'Count row by row: Row 1 has 2, Row 2 has 3, and Row 3 has 1.',
      'Sum the row counts (2 + 3 + 1 = 6) and select "6 Occurrences".',
    ],
    explanation: 'Row 1 has 2, Row 2 has 3, and Row 3 has 1 occurrence of ◈, totaling 6.',
  },
];

/**
 * Combined 64-puzzle catalog sorted by category order and difficulty progression (3 Easy, 3 Normal, 2 Hard per category).
 */
export const PUZZLE_CATALOG: PuzzleCatalogEntry[] = [
  ...BASE_PUZZLE_CATALOG,
  ...EXPANDED_PUZZLE_CATALOG_ADDITIONS,
].sort((a, b) => {
  const catDiff =
    PUZZLE_CATEGORIES_ORDER.indexOf(a.category) -
    PUZZLE_CATEGORIES_ORDER.indexOf(b.category);
  if (catDiff !== 0) return catDiff;
  const diffWeight =
    DIFFICULTY_SORT_WEIGHT[a.difficulty] - DIFFICULTY_SORT_WEIGHT[b.difficulty];
  if (diffWeight !== 0) return diffWeight;
  return a.id.localeCompare(b.id);
});

/**
 * Returns all playable catalog puzzles for a given category.
 */
export function getCatalogPuzzlesByCategory(
  category: PuzzleCategory
): PuzzleCatalogEntry[] {
  return PUZZLE_CATALOG.filter((p) => p.category === category);
}

/**
 * Finds a specific catalog puzzle by its ID.
 */
export function getCatalogPuzzleById(id: string): PuzzleCatalogEntry | undefined {
  return PUZZLE_CATALOG.find((p) => p.id === id);
}

/**
 * Converts a PuzzleCatalogEntry into a full runtime PuzzleDefinition with
 * strongly-typed Phase L2.1/L2.2 interactionSpec, initialState, solutionSpec, and scoringConfig.
 */
export function buildDefinitionFromCatalogEntry(
  entry: PuzzleCatalogEntry,
  context: PuzzleGenerationContext
): PuzzleDefinition {
  const diffConfig = getDifficultyConfig(entry.difficulty);
  const puzzleType: PuzzleInteractionType = entry.puzzleType ?? 'multiple_choice';

  const defaultInteractionSpec: PuzzleInteractionSpec = entry.interactionSpec ?? {
    type: 'multiple_choice',
    options: entry.candidateOptions,
  };

  const defaultInitialState: PuzzleInteractiveState = entry.initialState
    ? cloneInteractiveState(entry.initialState)
    : {
        type: 'multiple_choice',
        selectedOptionId: '',
      };

  const defaultSolutionSpec: PuzzleSolutionSpec = entry.solutionSpec ?? {
    type: 'multiple_choice',
    correctOptionId: entry.correctOptionId,
  };

  const maxHints = Math.max(1, entry.availableHints.length);
  const targetTimeSeconds =
    entry.scoringConfig?.targetTimeSeconds ??
    entry.estimatedTimeSeconds ??
    diffConfig.targetTimeSeconds;

  const scoringConfig: PuzzleScoringConfig = {
    baseScoreOverride: entry.scoringConfig?.baseScoreOverride,
    targetTimeSeconds,
    maxHints,
    hintPenaltyRatio:
      entry.scoringConfig?.hintPenaltyRatio ?? diffConfig.hintPenaltyRatio,
    attemptPenaltyRatio: entry.scoringConfig?.attemptPenaltyRatio ?? 0.15,
    completionBonusRatio: entry.scoringConfig?.completionBonusRatio ?? 0.08,
  };

  return {
    id:
      context.mode === 'daily' && context.utcDateKey
        ? `DAILY-${context.utcDateKey}-${entry.id.toUpperCase()}`
        : entry.id,
    category: entry.category,
    difficulty: entry.difficulty,
    puzzleType,
    seed: context.seed,
    puzzleSetVersion: context.puzzleSetVersion,
    title: entry.title,
    shortDescription: entry.shortDescription,
    instructions: entry.instructions,
    ruleSummary: entry.ruleSummary,
    targetTimeSeconds: scoringConfig.targetTimeSeconds,
    estimatedTimeSeconds: entry.estimatedTimeSeconds ?? targetTimeSeconds,
    maxHints,
    availableHints: entry.availableHints.slice(0, maxHints),
    explanation: entry.explanation,
    slots: entry.slots,
    candidateOptions: entry.candidateOptions,
    interactionSpec: defaultInteractionSpec,
    initialState: defaultInitialState,
    solutionSpec: defaultSolutionSpec,
    scoringConfig,
    isFoundationBlueprint: false,
    payload: {
      correctOptionId: entry.correctOptionId,
      explanation: entry.explanation,
      catalogId: entry.id,
      puzzleType,
      boardLayoutType: getCategoryMetadata(entry.category).boardLayoutType,
    },
  };
}

/**
 * Selects and builds an appropriate playable puzzle definition for Quick Play,
 * Daily Puzzle, or Collection selection.
 */
export function generatePlayablePuzzle(
  context: PuzzleGenerationContext
): PuzzleDefinition {
  if (context.puzzleIdOverride) {
    const exact = getCatalogPuzzleById(context.puzzleIdOverride);
    if (exact) {
      return buildDefinitionFromCatalogEntry(exact, context);
    }
  }

  // Filter by category and preferred difficulty
  const categoryPuzzles = getCatalogPuzzlesByCategory(context.category);
  const matchingDifficulty = categoryPuzzles.filter(
    (p) => p.difficulty === context.difficulty
  );

  const pool =
    matchingDifficulty.length > 0
      ? matchingDifficulty
      : categoryPuzzles.length > 0
      ? categoryPuzzles
      : PUZZLE_CATALOG;

  const hash = computeDeterministicHash(
    `${context.seed}:${context.category}:${context.difficulty}:${context.stageIndex}`
  );
  const chosen = pool[hash % pool.length];

  return buildDefinitionFromCatalogEntry(chosen, context);
}

/**
 * Constructs a valid winning PuzzleInteractiveState from a PuzzleDefinition's solutionSpec.
 * Used by automated content verification tests to prove every puzzle in the catalog is solvable.
 */
export function constructWinningStateForPuzzle(
  definition: PuzzleDefinition
): PuzzleInteractiveState {
  const spec = definition.solutionSpec;
  const init = cloneInteractiveState(definition.initialState);

  switch (spec.type) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        selectedOptionId: spec.correctOptionId,
      };

    case 'pattern_recognition': {
      const cellSelections: Record<string, string> = {};
      const secondarySelections: Record<string, string> = {};
      if (spec.expectedCells) {
        for (const [cellId, rawExpected] of Object.entries(spec.expectedCells)) {
          if (rawExpected.includes(':')) {
            const [primary, secondary] = rawExpected.split(':');
            cellSelections[cellId] = primary;
            secondarySelections[cellId] = secondary;
          } else {
            cellSelections[cellId] = rawExpected;
          }
        }
      }
      return {
        type: 'pattern_recognition',
        activeCellId:
          init.type === 'pattern_recognition' ? init.activeCellId : 'c33',
        cellSelections,
        secondarySelections,
        toggledTokenIds: spec.expectedToggledTokenIds
          ? [...spec.expectedToggledTokenIds]
          : [],
      };
    }

    case 'sequence_puzzle': {
      const slotValues: Record<string, string> = {};
      if (spec.expectedSlotValues) {
        for (const [slotId, val] of Object.entries(spec.expectedSlotValues)) {
          slotValues[slotId] = String(val);
        }
      }
      return {
        type: 'sequence_puzzle',
        activeSlotId:
          init.type === 'sequence_puzzle' ? init.activeSlotId : 's1',
        slotValues,
        orderedTokenIds: spec.expectedTokenOrder
          ? [...spec.expectedTokenOrder]
          : [],
      };
    }

    case 'spatial_reasoning': {
      const baseSpatial =
        init.type === 'spatial_reasoning'
          ? init
          : {
              type: 'spatial_reasoning' as const,
              orientationDeg: 0,
              flippedH: false,
              flippedV: false,
              voxelHeights: [],
              dieFaces: {
                top: 1,
                bottom: 6,
                north: 2,
                south: 5,
                east: 3,
                west: 4,
              },
              commandHistory: [],
              selectedFaceValue: null,
            };

      return {
        ...baseSpatial,
        orientationDeg:
          spec.expectedOrientationDeg ?? baseSpatial.orientationDeg,
        flippedH: spec.expectedFlippedH ?? baseSpatial.flippedH,
        flippedV: spec.expectedFlippedV ?? baseSpatial.flippedV,
        voxelHeights: spec.expectedVoxelHeights
          ? [...spec.expectedVoxelHeights]
          : baseSpatial.voxelHeights,
        dieFaces:
          spec.expectedTopFace !== undefined
            ? { ...baseSpatial.dieFaces, top: spec.expectedTopFace }
            : baseSpatial.dieFaces,
        selectedFaceValue:
          spec.expectedTopFace !== undefined ? spec.expectedTopFace : null,
      };
    }

    case 'logical_deduction': {
      const gridMarks: Record<string, 'unknown' | 'eliminated' | 'confirmed'> =
        {};
      const assignments: Record<string, string> = {};
      for (const [rowId, colId] of Object.entries(spec.expectedAssignments)) {
        assignments[rowId] = colId;
        gridMarks[`${rowId}:${colId}`] = 'confirmed';
      }
      return {
        type: 'logical_deduction',
        gridMarks,
        assignments,
      };
    }

    case 'cipher_code': {
      return {
        type: 'cipher_code',
        activeSlotIndex: 0,
        decodedSlots: [...spec.expectedSlots],
        dialShift:
          spec.expectedDialShift ??
          (init.type === 'cipher_code' ? init.dialShift : 0),
      };
    }

    case 'mathematical_reasoning': {
      const variableValues: Record<string, string> = {};
      for (const [varId, numVal] of Object.entries(spec.expectedValues)) {
        variableValues[varId] = String(numVal);
      }
      return {
        type: 'mathematical_reasoning',
        activeVariableId:
          init.type === 'mathematical_reasoning'
            ? init.activeVariableId
            : Object.keys(spec.expectedValues)[0] ?? 'beta',
        variableValues,
      };
    }

    case 'memory_challenge': {
      return {
        type: 'memory_challenge',
        phase: 'recall',
        activeTargetId:
          init.type === 'memory_challenge'
            ? init.activeTargetId
            : Object.keys(spec.expectedRecall)[0] ?? 'target',
        recalledValues: { ...spec.expectedRecall },
        studyPeekCount: 0,
      };
    }
  }
}

/**
 * Checks whether a recorded completion puzzleId corresponds to a catalog entry ID,
 * supporting both direct catalog IDs (`ns-easy-01`) and Daily Puzzle IDs (`DAILY-2026-11-08-NS-EASY-01`).
 */
export function matchesCatalogPuzzleId(
  recordPuzzleId: string,
  catalogPuzzleId: string
): boolean {
  if (recordPuzzleId === catalogPuzzleId) return true;
  const upperRecord = recordPuzzleId.toUpperCase();
  const upperCatalog = catalogPuzzleId.toUpperCase();
  return (
    upperRecord === upperCatalog || upperRecord.endsWith(`-${upperCatalog}`)
  );
}

/**
 * Returns all completion records matching a given catalog puzzle ID.
 */
export function getRecordsForCatalogPuzzle<T extends { puzzleId: string }>(
  catalogPuzzleId: string,
  records: T[]
): T[] {
  return records.filter((r) =>
    matchesCatalogPuzzleId(r.puzzleId, catalogPuzzleId)
  );
}

/**
 * Checks if a catalog puzzle has been solved at least once across any game mode.
 */
export function isCatalogPuzzleSolved(
  catalogPuzzleId: string,
  records: Array<{ puzzleId: string }>
): boolean {
  return records.some((r) =>
    matchesCatalogPuzzleId(r.puzzleId, catalogPuzzleId)
  );
}

/**
 * Finds the next sequential puzzle in the catalog for the "Continue" action.
 */
export function getNextCatalogPuzzle(currentPuzzleId: string): PuzzleCatalogEntry {
  const idx = PUZZLE_CATALOG.findIndex((p) =>
    matchesCatalogPuzzleId(currentPuzzleId, p.id)
  );
  if (idx === -1) {
    return PUZZLE_CATALOG[0];
  }
  return PUZZLE_CATALOG[(idx + 1) % PUZZLE_CATALOG.length];
}

/**
 * Programmatically counts the exact number of puzzles per interaction mechanic across all 64 puzzles.
 */
export function getCatalogMechanicCounts(): Record<
  PuzzleInteractionType,
  number
> {
  const counts: Record<PuzzleInteractionType, number> = {
    multiple_choice: 0,
    pattern_recognition: 0,
    sequence_puzzle: 0,
    spatial_reasoning: 0,
    logical_deduction: 0,
    cipher_code: 0,
    mathematical_reasoning: 0,
    memory_challenge: 0,
  };

  for (const entry of PUZZLE_CATALOG) {
    const mech: PuzzleInteractionType = entry.puzzleType ?? 'multiple_choice';
    counts[mech] = (counts[mech] ?? 0) + 1;
  }

  return counts;
}

/**
 * Filters the 64-puzzle catalog by category ('all' or specific), difficulty ('all' or specific),
 * and completion status ('all' | 'solved' | 'unsolved').
 */
export function filterCatalogPuzzles(options: {
  category?: PuzzleCategory | 'all';
  difficulty?: DifficultyLevel | 'all';
  status?: 'all' | 'solved' | 'unsolved';
  completionRecords?: Array<{ puzzleId: string }>;
}): PuzzleCatalogEntry[] {
  const {
    category = 'all',
    difficulty = 'all',
    status = 'all',
    completionRecords = [],
  } = options;

  return PUZZLE_CATALOG.filter((entry) => {
    if (category !== 'all' && entry.category !== category) {
      return false;
    }
    if (difficulty !== 'all' && entry.difficulty !== difficulty) {
      return false;
    }
    if (status !== 'all') {
      const solved = isCatalogPuzzleSolved(entry.id, completionRecords);
      if (status === 'solved' && !solved) return false;
      if (status === 'unsolved' && solved) return false;
    }
    return true;
  });
}

/**
 * Smart Quick Play puzzle selector:
 * - Honors categoryFilter ('all' or any of the 8 categories) and difficulty ('easy' | 'normal' | 'hard').
 * - Honors specificPuzzleId when selectionType === 'specific' and the puzzle exists in the filtered pool (or catalog).
 * - For random selection, avoids repeating recently played puzzles (and currentPuzzleId) whenever alternatives exist,
 *   prioritizing unsolved puzzles first.
 * - Never returns undefined or a nonexistent puzzle.
 */
export function selectQuickPlayPuzzle(options: {
  categoryFilter: PuzzleCategory | 'all';
  difficulty: DifficultyLevel;
  selectionType?: 'random' | 'specific';
  specificPuzzleId?: string | null;
  currentPuzzleId?: string | null;
  recentPuzzleIds?: string[];
  sessionPlayedPuzzleIds?: string[];
  completionRecords?: Array<{ puzzleId: string }>;
  seedIndex?: number;
}): PuzzleCatalogEntry {
  const {
    categoryFilter,
    difficulty,
    selectionType = 'random',
    specificPuzzleId = null,
    currentPuzzleId = null,
    recentPuzzleIds = [],
    sessionPlayedPuzzleIds = [],
    completionRecords = [],
    seedIndex = 0,
  } = options;

  // 1. If specific puzzle requested and exists in catalog, return it (if it matches filters, or fallback to filtered pool)
  if (selectionType === 'specific' && specificPuzzleId) {
    const exact = getCatalogPuzzleById(specificPuzzleId);
    if (
      exact &&
      (categoryFilter === 'all' || exact.category === categoryFilter) &&
      exact.difficulty === difficulty
    ) {
      return exact;
    }
  }

  // 2. Build filtered pool matching categoryFilter + difficulty
  let pool = filterCatalogPuzzles({
    category: categoryFilter,
    difficulty,
  });

  if (pool.length === 0 && categoryFilter !== 'all') {
    pool = getCatalogPuzzlesByCategory(categoryFilter);
  }
  if (pool.length === 0) {
    pool = PUZZLE_CATALOG;
  }

  // 3. Exclude currentPuzzleId, recentPuzzleIds, and sessionPlayedPuzzleIds if alternatives exist
  const excludedIds = new Set<string>();
  if (currentPuzzleId) {
    for (const entry of pool) {
      if (matchesCatalogPuzzleId(currentPuzzleId, entry.id)) {
        excludedIds.add(entry.id);
      }
    }
  }
  for (const rId of recentPuzzleIds) {
    excludedIds.add(rId);
  }
  for (const sId of sessionPlayedPuzzleIds) {
    excludedIds.add(sId);
  }

  const nonRecentPool = pool.filter((p) => !excludedIds.has(p.id));
  const candidatePool =
    nonRecentPool.length > 0
      ? nonRecentPool
      : pool.filter(
          (p) =>
            !currentPuzzleId || !matchesCatalogPuzzleId(currentPuzzleId, p.id)
        );
  const finalPool = candidatePool.length > 0 ? candidatePool : pool;

  // 4. Prefer unsolved puzzles within the candidate pool when available
  const unsolvedInPool = finalPool.filter(
    (p) => !isCatalogPuzzleSolved(p.id, completionRecords)
  );
  const targetPool = unsolvedInPool.length > 0 ? unsolvedInPool : finalPool;

  const hash = computeDeterministicHash(
    `QP:${categoryFilter}:${difficulty}:${seedIndex}:${recentPuzzleIds.join(',')}:${sessionPlayedPuzzleIds.join(',')}`
  );
  return targetPool[hash % targetPool.length] ?? PUZZLE_CATALOG[0];
}

/**
 * Selects the next Quick Play puzzle with strict non-repeating session pool tracking:
 * - When `difficultyPreference === 'easy'` or `'hard'` (or when `difficultyPreference` is omitted),
 *   uses only the fixed Easy or Hard pool.
 * - When `difficultyPreference === 'normal'` (Regular — Adaptive Mixed Difficulty),
 *   uses the entire available puzzle pool (Easy, Regular, Hard) and selects a puzzle matching
 *   the player's current adaptive `difficulty` tier (or at most 1 tier adjacent if the current
 *   tier's unplayed puzzles are exhausted, avoiding sudden 2-level jumps).
 * - Tracks `sessionPlayedPuzzleIds` across the active Quick Play session and refreshes once exhausted.
 */
export function selectNextQuickPlaySessionPuzzle(options: {
  categoryFilter?: PuzzleCategory | 'all';
  difficulty: DifficultyLevel;
  difficultyPreference?: DifficultyLevel | string;
  currentPuzzleId?: string | null;
  sessionPlayedPuzzleIds?: string[];
  completionRecords?: Array<{ puzzleId: string }>;
  seedIndex?: number;
  customPoolOverride?: PuzzleCatalogEntry[];
}): {
  puzzle: PuzzleCatalogEntry;
  updatedSessionPlayedIds: string[];
  poolExhaustedAndRefreshed: boolean;
  eligiblePoolSize: number;
} {
  const {
    categoryFilter = 'all',
    difficulty,
    difficultyPreference,
    currentPuzzleId = null,
    sessionPlayedPuzzleIds = [],
    completionRecords = [],
    seedIndex = 0,
    customPoolOverride,
  } = options;

  const isAdaptiveRegular =
    difficultyPreference === 'normal' ||
    difficultyPreference === 'regular' ||
    difficultyPreference === 'auto';

  let pool =
    customPoolOverride !== undefined
      ? customPoolOverride
      : isAdaptiveRegular
      ? filterCatalogPuzzles({
          category: categoryFilter,
          difficulty: 'all',
        })
      : filterCatalogPuzzles({
          category: categoryFilter,
          difficulty,
        });

  if (
    pool.length === 0 &&
    customPoolOverride === undefined &&
    categoryFilter !== 'all'
  ) {
    pool = getCatalogPuzzlesByCategory(categoryFilter);
  }
  if (pool.length === 0) {
    pool = PUZZLE_CATALOG;
  }

  const eligiblePoolIds = new Set(pool.map((p) => p.id));
  const validPlayedInPool = sessionPlayedPuzzleIds.filter((id) =>
    eligiblePoolIds.has(id)
  );
  const playedSet = new Set(validPlayedInPool);

  let unplayedInSession = pool.filter((p) => !playedSet.has(p.id));
  let poolExhaustedAndRefreshed = false;

  if (unplayedInSession.length === 0) {
    poolExhaustedAndRefreshed = true;
    const withoutCurrent =
      currentPuzzleId && pool.length > 1
        ? pool.filter((p) => !matchesCatalogPuzzleId(currentPuzzleId, p.id))
        : pool;
    unplayedInSession = withoutCurrent.length > 0 ? withoutCurrent : pool;
  } else if (currentPuzzleId && unplayedInSession.length > 1) {
    const withoutCurrent = unplayedInSession.filter(
      (p) => !matchesCatalogPuzzleId(currentPuzzleId, p.id)
    );
    if (withoutCurrent.length > 0) {
      unplayedInSession = withoutCurrent;
    }
  }

  // In Regular adaptive mixed mode, select from the current adaptive target difficulty first,
  // falling back to at most 1 adjacent difficulty tier so there are no sudden 2-tier jumps.
  let tierFilteredCandidates = unplayedInSession;
  if (isAdaptiveRegular) {
    const exactTier = unplayedInSession.filter(
      (p) => p.difficulty === difficulty
    );
    if (exactTier.length > 0) {
      tierFilteredCandidates = exactTier;
    } else {
      const adjacentTier = unplayedInSession.filter((p) =>
        difficulty === 'easy' || difficulty === 'hard'
          ? p.difficulty === 'normal'
          : p.difficulty === 'easy' || p.difficulty === 'hard'
      );
      if (adjacentTier.length > 0) {
        tierFilteredCandidates = adjacentTier;
      }
    }
  }

  const unsolvedCandidates = tierFilteredCandidates.filter(
    (p) => !isCatalogPuzzleSolved(p.id, completionRecords)
  );
  const targetPool =
    unsolvedCandidates.length > 0 ? unsolvedCandidates : tierFilteredCandidates;

  const hash = computeDeterministicHash(
    `QP-SESSION:${categoryFilter}:${difficulty}:${seedIndex}:${validPlayedInPool.join(',')}`
  );
  const chosen =
    targetPool[hash % targetPool.length] ?? pool[0] ?? PUZZLE_CATALOG[0];

  const updatedSessionPlayedIds = poolExhaustedAndRefreshed
    ? [chosen.id]
    : [...validPlayedInPool, chosen.id];

  return {
    puzzle: chosen,
    updatedSessionPlayedIds,
    poolExhaustedAndRefreshed,
    eligiblePoolSize: pool.length,
  };
}

/**
 * Selects the next suitable puzzle inside a Puzzle Library category:
 * - For Easy ('easy') or Hard ('hard'), restricts to that fixed difficulty tier in the category.
 * - For Regular ('normal'), uses all 8 puzzles in the category (Easy, Regular, Hard) and selects
 *   the next puzzle matching the player's adaptive `effectiveDifficulty` (or 1 tier adjacent if
 *   all puzzles of that tier in this category are solved, avoiding 2-level jumps).
 */
export function selectNextLibraryCategoryPuzzle(options: {
  category: PuzzleCategory;
  difficultyPreference?: DifficultyLevel | string;
  preference?: DifficultyLevel | string;
  effectiveDifficulty: DifficultyLevel;
  currentPuzzleId?: string | null;
  completionRecords?: Array<{ puzzleId: string }>;
}): PuzzleCatalogEntry {
  const {
    category,
    difficultyPreference,
    preference,
    effectiveDifficulty,
    currentPuzzleId = null,
    completionRecords = [],
  } = options;
  const resolvedPreference = difficultyPreference ?? preference ?? 'normal';

  const allCategoryPuzzles = getCatalogPuzzlesByCategory(category);
  const isFixedEasy = resolvedPreference === 'easy';
  const isFixedHard = resolvedPreference === 'hard';

  if (isFixedEasy || isFixedHard) {
    const fixedDiff: DifficultyLevel = isFixedEasy ? 'easy' : 'hard';
    const fixedPool = allCategoryPuzzles.filter(
      (p) => p.difficulty === fixedDiff
    );
    const pool = fixedPool.length > 0 ? fixedPool : allCategoryPuzzles;
    const currentIdx = currentPuzzleId
      ? pool.findIndex((p) => matchesCatalogPuzzleId(currentPuzzleId, p.id))
      : -1;
    if (currentIdx >= 0 && pool.length > 1) {
      return pool[(currentIdx + 1) % pool.length];
    }
    const unsolved = pool.find(
      (p) => !isCatalogPuzzleSolved(p.id, completionRecords)
    );
    return unsolved ?? pool[0] ?? PUZZLE_CATALOG[0];
  }

  // Regular ('normal') — Adaptive Mixed Difficulty across all 8 puzzles in the category
  const candidatesWithoutCurrent =
    currentPuzzleId && allCategoryPuzzles.length > 1
      ? allCategoryPuzzles.filter(
          (p) => !matchesCatalogPuzzleId(currentPuzzleId, p.id)
        )
      : allCategoryPuzzles;

  // 1. Unsolved puzzles in the category at the player's current adaptive tier
  const unsolvedExactTier = candidatesWithoutCurrent.filter(
    (p) =>
      p.difficulty === effectiveDifficulty &&
      !isCatalogPuzzleSolved(p.id, completionRecords)
  );
  if (unsolvedExactTier.length > 0) {
    return unsolvedExactTier[0];
  }

  // 2. Unsolved puzzles at an adjacent tier (at most 1 difficulty step away)
  const unsolvedAdjacentTier = candidatesWithoutCurrent.filter(
    (p) =>
      !isCatalogPuzzleSolved(p.id, completionRecords) &&
      (effectiveDifficulty === 'easy' || effectiveDifficulty === 'hard'
        ? p.difficulty === 'normal'
        : p.difficulty === 'easy' || p.difficulty === 'hard')
  );
  if (unsolvedAdjacentTier.length > 0) {
    return unsolvedAdjacentTier[0];
  }

  // 3. Any remaining unsolved puzzle in the category
  const anyUnsolved = candidatesWithoutCurrent.find(
    (p) => !isCatalogPuzzleSolved(p.id, completionRecords)
  );
  if (anyUnsolved) {
    return anyUnsolved;
  }

  // 4. All 8 solved in category: pick a puzzle matching effectiveDifficulty (excluding current)
  const solvedExactTier = candidatesWithoutCurrent.filter(
    (p) => p.difficulty === effectiveDifficulty
  );
  if (solvedExactTier.length > 0) {
    return solvedExactTier[0];
  }

  return candidatesWithoutCurrent[0] ?? allCategoryPuzzles[0] ?? PUZZLE_CATALOG[0];
}

export { PUZZLE_CATEGORIES_ORDER };
