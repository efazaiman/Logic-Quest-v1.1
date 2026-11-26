/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L2.1 Multi-Mechanic Answer Validation Engine
 * Provides dedicated validators for all 8 puzzle interaction types:
 * 1. multiple_choice
 * 2. pattern_recognition
 * 3. sequence_puzzle
 * 4. spatial_reasoning
 * 5. logical_deduction
 * 6. cipher_code
 * 7. mathematical_reasoning
 * 8. memory_challenge
 */

import {
  CipherCodeSolution,
  CipherCodeState,
  LogicalDeductionSolution,
  LogicalDeductionState,
  MathematicalReasoningSolution,
  MathematicalReasoningState,
  MemoryChallengeSolution,
  MemoryChallengeState,
  MultipleChoiceSolution,
  MultipleChoiceState,
  PatternRecognitionSolution,
  PatternRecognitionState,
  PuzzleAnswer,
  PuzzleDefinition,
  PuzzleValidationResult,
  SequencePuzzleSolution,
  SequencePuzzleState,
  SpatialReasoningSolution,
  SpatialReasoningState,
} from '../types/game';
import { isPuzzleStateComplete } from './mechanicsController';

function computeAttemptAccuracy(
  attemptCount: number,
  attemptPenaltyRatio = 0.15
): number {
  const safeAttempts = Math.max(1, attemptCount);
  const penalty = Math.max(0, (safeAttempts - 1) * attemptPenaltyRatio);
  return Math.max(0.4, Number((1 - penalty).toFixed(4)));
}

export function validateMultipleChoiceState(
  state: MultipleChoiceState,
  solution: MultipleChoiceSolution
): { isCorrect: boolean; feedbackMessage: string } {
  const isCorrect = state.selectedOptionId === solution.correctOptionId;
  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Selection verified! Logical rule satisfied.'
      : 'That option does not satisfy the rule. Re-examine the relationship and try again.',
  };
}

export function validatePatternRecognitionState(
  state: PatternRecognitionState,
  solution: PatternRecognitionSolution
): { isCorrect: boolean; feedbackMessage: string } {
  if (solution.expectedToggledTokenIds) {
    const expectedSorted = [...solution.expectedToggledTokenIds].sort();
    const actualSorted = [...state.toggledTokenIds].sort();
    const isCorrect =
      expectedSorted.length === actualSorted.length &&
      expectedSorted.every((val, idx) => val === actualSorted[idx]);
    return {
      isCorrect,
      feedbackMessage: isCorrect
        ? 'Visual pattern layers synthesized accurately!'
        : 'The active pattern layers do not match the matrix transformation rule.',
    };
  }

  const expectedCells = solution.expectedCells ?? {};
  const isCorrect = Object.entries(expectedCells).every(([cellId, expectedVal]) => {
    const primary = state.cellSelections[cellId] ?? '';
    const secondary = state.secondarySelections[cellId] ?? '';
    const combined = secondary ? `${primary}:${secondary}` : primary;
    return combined === expectedVal || primary === expectedVal;
  });

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Pattern matrix invariant verified!'
      : 'The constructed pattern cell does not match the row and column progression.',
  };
}

export function validateSequencePuzzleState(
  state: SequencePuzzleState,
  solution: SequencePuzzleSolution
): { isCorrect: boolean; feedbackMessage: string } {
  if (solution.expectedTokenOrder) {
    const isCorrect =
      state.orderedTokenIds.length === solution.expectedTokenOrder.length &&
      state.orderedTokenIds.every(
        (id, idx) => id === solution.expectedTokenOrder![idx]
      );
    return {
      isCorrect,
      feedbackMessage: isCorrect
        ? 'Sequence order locked in!'
        : 'The sequence order is out of alignment. Check the step progression between adjacent terms.',
    };
  }

  const expectedValues = solution.expectedSlotValues ?? {};
  const isCorrect = Object.entries(expectedValues).every(([slotId, expected]) => {
    const rawActual = (state.slotValues[slotId] ?? '').trim();
    if (!rawActual) return false;
    if (typeof expected === 'number') {
      const numActual = Number(rawActual);
      return Number.isFinite(numActual) && numActual === expected;
    }
    return rawActual.toUpperCase() === String(expected).trim().toUpperCase();
  });

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Sequence progression verified!'
      : 'The entered sequence term does not match the interval rule. Inspect the differences between steps.',
  };
}

export function validateSpatialReasoningState(
  state: SpatialReasoningState,
  solution: SpatialReasoningSolution
): { isCorrect: boolean; feedbackMessage: string } {
  let isCorrect = true;

  if (solution.expectedOrientationDeg !== undefined) {
    const normActual = ((state.orientationDeg % 360) + 360) % 360;
    const normExpected = ((solution.expectedOrientationDeg % 360) + 360) % 360;
    if (normActual !== normExpected) isCorrect = false;
  }

  if (solution.expectedFlippedH !== undefined) {
    if (Boolean(state.flippedH) !== Boolean(solution.expectedFlippedH)) {
      isCorrect = false;
    }
  }

  if (solution.expectedFlippedV !== undefined) {
    if (Boolean(state.flippedV) !== Boolean(solution.expectedFlippedV)) {
      isCorrect = false;
    }
  }

  if (solution.expectedVoxelHeights) {
    if (
      state.voxelHeights.length !== solution.expectedVoxelHeights.length ||
      !state.voxelHeights.every((h, idx) => h === solution.expectedVoxelHeights![idx])
    ) {
      isCorrect = false;
    }
  }

  if (solution.expectedVoxelSum !== undefined) {
    const sum = state.voxelHeights.reduce((acc, v) => acc + v, 0);
    if (sum !== solution.expectedVoxelSum) {
      isCorrect = false;
    }
  }

  if (solution.expectedTopFace !== undefined) {
    if (state.dieFaces.top !== solution.expectedTopFace) {
      isCorrect = false;
    }
  }

  if (solution.expectedSelectedFace !== undefined) {
    if (state.selectedFaceValue !== solution.expectedSelectedFace) {
      isCorrect = false;
    }
  }

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Spatial alignment verified!'
      : 'The spatial orientation or assembly does not match the target configuration.',
  };
}

export function validateLogicalDeductionState(
  state: LogicalDeductionState,
  solution: LogicalDeductionSolution
): { isCorrect: boolean; feedbackMessage: string } {
  const expected = solution.expectedAssignments;
  const isCorrect = Object.entries(expected).every(
    ([rowId, expectedColId]) => state.assignments[rowId] === expectedColId
  );

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Deductive matrix resolved without contradiction!'
      : 'One or more assignments violate the clue constraints. Eliminate impossible pairs and try again.',
  };
}

export function validateCipherCodeState(
  state: CipherCodeState,
  solution: CipherCodeSolution
): { isCorrect: boolean; feedbackMessage: string } {
  const slotsMatch =
    state.decodedSlots.length === solution.expectedSlots.length &&
    state.decodedSlots.every(
      (val, idx) =>
        val.trim().toUpperCase() ===
        solution.expectedSlots[idx].trim().toUpperCase()
    );

  const shiftMatch =
    solution.expectedDialShift === undefined ||
    state.dialShift === solution.expectedDialShift;

  const isCorrect = slotsMatch && shiftMatch;

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Cipher sequence decoded! Symbolic grammar verified.'
      : 'The decoded symbol sequence does not match the cipher transformation rule.',
  };
}

export function validateMathematicalReasoningState(
  state: MathematicalReasoningState,
  solution: MathematicalReasoningSolution
): { isCorrect: boolean; feedbackMessage: string } {
  const tolerance = solution.tolerance ?? 1e-6;
  const isCorrect = Object.entries(solution.expectedValues).every(
    ([varId, expectedNum]) => {
      const raw = state.variableValues[varId];
      if (typeof raw !== 'string' || raw.trim().length === 0) return false;
      const actualNum = Number(raw.trim());
      if (!Number.isFinite(actualNum)) return false;
      return Math.abs(actualNum - expectedNum) <= tolerance;
    }
  );

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Mathematical equilibrium verified!'
      : 'The calculated value does not balance the equation constraint.',
  };
}

export function validateMemoryChallengeState(
  state: MemoryChallengeState,
  solution: MemoryChallengeSolution
): { isCorrect: boolean; feedbackMessage: string } {
  if (state.phase !== 'recall') {
    return {
      isCorrect: false,
      feedbackMessage: 'Complete the study phase and enter your recall selection first.',
    };
  }

  const isCorrect = Object.entries(solution.expectedRecall).every(
    ([targetId, expectedTokenId]) =>
      state.recalledValues[targetId] === expectedTokenId
  );

  return {
    isCorrect,
    feedbackMessage: isCorrect
      ? 'Observation recall verified with 100% fidelity!'
      : 'The recalled pattern does not match the observed signal state.',
  };
}

/**
 * Validates a submitted answer against a PuzzleDefinition across all 8 puzzle mechanics,
 * while remaining backward-compatible with optionId-based submissions.
 */
export function validatePuzzleAnswer(
  definition: PuzzleDefinition,
  answer: PuzzleAnswer
): PuzzleValidationResult {
  const explanationText =
    definition.explanation ||
    (typeof definition.payload.explanation === 'string'
      ? definition.payload.explanation
      : undefined);

  const attemptPenaltyRatio =
    definition.scoringConfig?.attemptPenaltyRatio ?? 0.15;

  // 1. If an interactive state is provided, validate using the dedicated mechanic validator
  if (answer.interactionState) {
    const state = answer.interactionState;
    if (!isPuzzleStateComplete(definition, state)) {
      return {
        puzzleId: definition.id,
        isValidSubmission: false,
        isCorrect: false,
        accuracyRatio: 0,
        feedbackMessage:
          'Complete all required puzzle inputs before checking your solution.',
        engineStatus: 'validated',
      };
    }

    const sol = definition.solutionSpec;
    let outcome: { isCorrect: boolean; feedbackMessage: string } = {
      isCorrect: false,
      feedbackMessage: 'Not quite right. Review the pattern and try again.',
    };

    if (state.type === 'multiple_choice' && sol.type === 'multiple_choice') {
      outcome = validateMultipleChoiceState(state, sol);
    } else if (
      state.type === 'pattern_recognition' &&
      sol.type === 'pattern_recognition'
    ) {
      outcome = validatePatternRecognitionState(state, sol);
    } else if (state.type === 'sequence_puzzle' && sol.type === 'sequence_puzzle') {
      outcome = validateSequencePuzzleState(state, sol);
    } else if (
      state.type === 'spatial_reasoning' &&
      sol.type === 'spatial_reasoning'
    ) {
      outcome = validateSpatialReasoningState(state, sol);
    } else if (
      state.type === 'logical_deduction' &&
      sol.type === 'logical_deduction'
    ) {
      outcome = validateLogicalDeductionState(state, sol);
    } else if (state.type === 'cipher_code' && sol.type === 'cipher_code') {
      outcome = validateCipherCodeState(state, sol);
    } else if (
      state.type === 'mathematical_reasoning' &&
      sol.type === 'mathematical_reasoning'
    ) {
      outcome = validateMathematicalReasoningState(state, sol);
    } else if (
      state.type === 'memory_challenge' &&
      sol.type === 'memory_challenge'
    ) {
      outcome = validateMemoryChallengeState(state, sol);
    }

    const accuracyRatio = outcome.isCorrect
      ? computeAttemptAccuracy(answer.attemptCount, attemptPenaltyRatio)
      : 0;

    return {
      puzzleId: definition.id,
      isValidSubmission: true,
      isCorrect: outcome.isCorrect,
      accuracyRatio,
      feedbackMessage: outcome.feedbackMessage,
      explanation: outcome.isCorrect ? explanationText : undefined,
      engineStatus: 'validated',
    };
  }

  // 2. Fallback / Multiple-Choice Option ID validation
  if (!answer.selectedOptionId) {
    return {
      puzzleId: definition.id,
      isValidSubmission: false,
      isCorrect: false,
      accuracyRatio: 0,
      feedbackMessage: 'Select or enter an answer before checking.',
      engineStatus: 'validated',
    };
  }

  const expectedOptionId = String(definition.payload.correctOptionId ?? 'opt-a');
  const isCorrect = answer.selectedOptionId === expectedOptionId;
  const accuracyRatio = isCorrect
    ? computeAttemptAccuracy(answer.attemptCount, attemptPenaltyRatio)
    : 0;

  return {
    puzzleId: definition.id,
    isValidSubmission: true,
    isCorrect,
    accuracyRatio,
    feedbackMessage: isCorrect
      ? 'Pattern verified! Logical rule satisfied.'
      : 'Not quite right. Check the relationship between elements and try again.',
    explanation: isCorrect ? explanationText : undefined,
    engineStatus: 'validated',
  };
}
