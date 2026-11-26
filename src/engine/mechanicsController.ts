/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L2.1 Reusable Interactive Mechanism Controller
 * Pure state-transition, completeness, signature, and progressive hint logic
 * for all 8 puzzle interaction types:
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
  DeductionCellMark,
  PuzzleDefinition,
  PuzzleInteractionSpec,
  PuzzleInteractiveState,
  SpatialTurnCommand,
} from '../types/game';

export type PuzzleMechanismAction =
  | { type: 'reset'; initialState: PuzzleInteractiveState }
  // A. Multiple Choice
  | { type: 'select_option'; optionId: string }
  // B. Pattern Recognition
  | { type: 'pattern_focus_cell'; cellId: string }
  | { type: 'pattern_select_primary'; tokenId: string; cellId?: string }
  | { type: 'pattern_select_secondary'; tokenId: string; cellId?: string }
  | { type: 'pattern_toggle_layer'; tokenId: string }
  // C. Sequence Puzzle
  | { type: 'sequence_focus_slot'; slotId: string }
  | { type: 'sequence_set_value'; slotId?: string; value: string }
  | { type: 'sequence_append_digit'; slotId?: string; digit: string }
  | { type: 'sequence_backspace'; slotId?: string }
  | { type: 'sequence_step_delta'; slotId?: string; delta: number }
  | { type: 'sequence_swap_tokens'; fromIndex: number; toIndex: number }
  // D. Spatial Reasoning
  | { type: 'spatial_command'; command: SpatialTurnCommand }
  | { type: 'spatial_set_voxel'; index: number; height: number; maxHeight?: number }
  | { type: 'spatial_step_voxel'; index: number; delta: number; maxHeight?: number }
  | { type: 'spatial_select_face'; faceValue: number }
  // E. Logical Deduction
  | { type: 'deduction_cycle_cell'; rowId: string; colId: string }
  | { type: 'deduction_assign'; rowId: string; colId: string }
  // F. Cipher & Code
  | { type: 'cipher_focus_slot'; index: number }
  | { type: 'cipher_input_symbol'; symbol: string }
  | { type: 'cipher_backspace' }
  | { type: 'cipher_clear' }
  | { type: 'cipher_shift_dial'; delta: number }
  // G. Mathematical Reasoning
  | { type: 'math_focus_variable'; variableId: string }
  | { type: 'math_set_value'; variableId?: string; value: string }
  | { type: 'math_append_digit'; variableId?: string; digit: string; maxDigits?: number }
  | { type: 'math_toggle_sign'; variableId?: string }
  | { type: 'math_backspace'; variableId?: string }
  | { type: 'math_clear'; variableId?: string }
  | { type: 'math_step_delta'; variableId?: string; delta: number }
  // H. Memory Challenge
  | { type: 'memory_start_recall' }
  | { type: 'memory_peek_study' }
  | { type: 'memory_focus_target'; targetId: string }
  | { type: 'memory_select_token'; tokenId: string; targetId?: string };

/**
 * Deep-clones a PuzzleInteractiveState so mutations never leak into PuzzleDefinition.initialState.
 */
export function cloneInteractiveState(
  state: PuzzleInteractiveState
): PuzzleInteractiveState {
  return JSON.parse(JSON.stringify(state)) as PuzzleInteractiveState;
}

/**
 * Creates a fresh initial state for a puzzle definition.
 */
export function createInitialPuzzleState(
  definition: PuzzleDefinition
): PuzzleInteractiveState {
  return cloneInteractiveState(definition.initialState);
}

/**
 * Resets a puzzle state back to its definition's initial state.
 */
export function resetPuzzleState(
  definition: PuzzleDefinition
): PuzzleInteractiveState {
  return cloneInteractiveState(definition.initialState);
}

/**
 * Applies a 3D die spatial turn command to a 6-face die state.
 */
export function applyDieTurn(
  faces: {
    top: number;
    bottom: number;
    north: number;
    south: number;
    east: number;
    west: number;
  },
  command: SpatialTurnCommand
) {
  const { top, bottom, north, south, east, west } = faces;
  switch (command) {
    case 'pitch_north':
      return { top: south, north: top, bottom: north, south: bottom, east, west };
    case 'pitch_south':
      return { top: north, south: top, bottom: south, north: bottom, east, west };
    case 'roll_east':
      return { top: west, east: top, bottom: east, west: bottom, north, south };
    case 'roll_west':
      return { top: east, west: top, bottom: west, east: bottom, north, south };
    case 'rotate_cw_90':
      return { top, bottom, north: west, east: north, south: east, west: south };
    case 'rotate_ccw_90':
      return { top, bottom, north: east, west: north, south: west, east: south };
    default:
      return { ...faces };
  }
}

/**
 * Pure reducer applying an interactive mechanism action to the current puzzle state.
 */
export function applyPuzzleAction(
  state: PuzzleInteractiveState,
  action: PuzzleMechanismAction,
  spec?: PuzzleInteractionSpec
): PuzzleInteractiveState {
  if (action.type === 'reset') {
    return cloneInteractiveState(action.initialState);
  }

  // A. Multiple Choice
  if (state.type === 'multiple_choice') {
    if (action.type === 'select_option') {
      return {
        ...state,
        selectedOptionId: action.optionId,
      };
    }
    return state;
  }

  // B. Pattern Recognition
  if (state.type === 'pattern_recognition') {
    if (action.type === 'pattern_focus_cell') {
      return {
        ...state,
        activeCellId: action.cellId,
      };
    }
    if (action.type === 'pattern_select_primary') {
      const targetCell = action.cellId ?? state.activeCellId;
      if (!targetCell) return state;
      return {
        ...state,
        activeCellId: targetCell,
        cellSelections: {
          ...state.cellSelections,
          [targetCell]: action.tokenId,
        },
      };
    }
    if (action.type === 'pattern_select_secondary') {
      const targetCell = action.cellId ?? state.activeCellId;
      if (!targetCell) return state;
      return {
        ...state,
        activeCellId: targetCell,
        secondarySelections: {
          ...state.secondarySelections,
          [targetCell]: action.tokenId,
        },
      };
    }
    if (action.type === 'pattern_toggle_layer') {
      const exists = state.toggledTokenIds.includes(action.tokenId);
      const nextToggled = exists
        ? state.toggledTokenIds.filter((id) => id !== action.tokenId)
        : [...state.toggledTokenIds, action.tokenId];
      return {
        ...state,
        toggledTokenIds: nextToggled,
      };
    }
    return state;
  }

  // C. Sequence Puzzle
  if (state.type === 'sequence_puzzle') {
    if (action.type === 'sequence_focus_slot') {
      return {
        ...state,
        activeSlotId: action.slotId,
      };
    }
    if (action.type === 'sequence_set_value') {
      const slotId = action.slotId ?? state.activeSlotId;
      if (!slotId) return state;
      return {
        ...state,
        slotValues: {
          ...state.slotValues,
          [slotId]: action.value.trim(),
        },
      };
    }
    if (action.type === 'sequence_append_digit') {
      const slotId = action.slotId ?? state.activeSlotId;
      if (!slotId) return state;
      const current = state.slotValues[slotId] ?? '';
      if (current.replace('-', '').length >= 6) return state;
      const nextVal = current === '0' ? action.digit : `${current}${action.digit}`;
      return {
        ...state,
        slotValues: {
          ...state.slotValues,
          [slotId]: nextVal,
        },
      };
    }
    if (action.type === 'sequence_backspace') {
      const slotId = action.slotId ?? state.activeSlotId;
      if (!slotId) return state;
      const current = state.slotValues[slotId] ?? '';
      return {
        ...state,
        slotValues: {
          ...state.slotValues,
          [slotId]: current.slice(0, -1),
        },
      };
    }
    if (action.type === 'sequence_step_delta') {
      const slotId = action.slotId ?? state.activeSlotId;
      if (!slotId) return state;
      const currentNum = Number(state.slotValues[slotId] || '0');
      const baseNum = Number.isFinite(currentNum) ? currentNum : 0;
      const nextNum = baseNum + action.delta;
      return {
        ...state,
        slotValues: {
          ...state.slotValues,
          [slotId]: String(nextNum),
        },
      };
    }
    if (action.type === 'sequence_swap_tokens') {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.orderedTokenIds.length ||
        toIndex >= state.orderedTokenIds.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const nextOrder = [...state.orderedTokenIds];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);
      return {
        ...state,
        orderedTokenIds: nextOrder,
      };
    }
    return state;
  }

  // D. Spatial Reasoning
  if (state.type === 'spatial_reasoning') {
    if (action.type === 'spatial_command') {
      const cmd = action.command;
      let nextDeg = state.orientationDeg;
      let nextFlipH = state.flippedH;
      let nextFlipV = state.flippedV;
      let nextDieFaces = { ...state.dieFaces };

      if (cmd === 'rotate_cw_90') {
        nextDeg = (nextDeg + 90) % 360;
        nextDieFaces = applyDieTurn(nextDieFaces, cmd);
      } else if (cmd === 'rotate_ccw_90') {
        nextDeg = (nextDeg + 270) % 360;
        nextDieFaces = applyDieTurn(nextDieFaces, cmd);
      } else if (cmd === 'rotate_cw_45') {
        nextDeg = (nextDeg + 45) % 360;
      } else if (cmd === 'flip_h') {
        nextFlipH = !nextFlipH;
      } else if (cmd === 'flip_v') {
        nextFlipV = !nextFlipV;
      } else if (
        cmd === 'pitch_north' ||
        cmd === 'pitch_south' ||
        cmd === 'roll_east' ||
        cmd === 'roll_west'
      ) {
        nextDieFaces = applyDieTurn(nextDieFaces, cmd);
      }

      return {
        ...state,
        orientationDeg: nextDeg,
        flippedH: nextFlipH,
        flippedV: nextFlipV,
        dieFaces: nextDieFaces,
        commandHistory: [...state.commandHistory, cmd],
      };
    }
    if (action.type === 'spatial_set_voxel') {
      const maxH =
        action.maxHeight ??
        (spec?.type === 'spatial_reasoning' ? spec.maxVoxelHeight ?? 4 : 4);
      const clamped = Math.max(0, Math.min(maxH, Math.round(action.height)));
      const nextVoxels = [...state.voxelHeights];
      if (action.index >= 0 && action.index < nextVoxels.length) {
        nextVoxels[action.index] = clamped;
      }
      return {
        ...state,
        voxelHeights: nextVoxels,
      };
    }
    if (action.type === 'spatial_step_voxel') {
      const maxH =
        action.maxHeight ??
        (spec?.type === 'spatial_reasoning' ? spec.maxVoxelHeight ?? 4 : 4);
      const nextVoxels = [...state.voxelHeights];
      if (action.index >= 0 && action.index < nextVoxels.length) {
        const nextVal = nextVoxels[action.index] + action.delta;
        nextVoxels[action.index] = Math.max(0, Math.min(maxH, nextVal));
      }
      return {
        ...state,
        voxelHeights: nextVoxels,
      };
    }
    if (action.type === 'spatial_select_face') {
      return {
        ...state,
        selectedFaceValue: action.faceValue,
      };
    }
    return state;
  }

  // E. Logical Deduction
  if (state.type === 'logical_deduction') {
    if (action.type === 'deduction_cycle_cell') {
      const key = `${action.rowId}:${action.colId}`;
      const current: DeductionCellMark = state.gridMarks[key] ?? 'unknown';
      const nextMark: DeductionCellMark =
        current === 'unknown'
          ? 'eliminated'
          : current === 'eliminated'
          ? 'confirmed'
          : 'unknown';

      const nextGridMarks: Record<string, DeductionCellMark> = {
        ...state.gridMarks,
        [key]: nextMark,
      };
      const nextAssignments = { ...state.assignments };

      if (nextMark === 'confirmed') {
        // Confirming a cell assigns rowId -> colId and clears previous confirmation on same row
        Object.keys(nextGridMarks).forEach((k) => {
          if (k.startsWith(`${action.rowId}:`) && k !== key && nextGridMarks[k] === 'confirmed') {
            nextGridMarks[k] = 'eliminated';
          }
        });
        nextAssignments[action.rowId] = action.colId;
      } else if (nextAssignments[action.rowId] === action.colId) {
        delete nextAssignments[action.rowId];
      }

      return {
        ...state,
        gridMarks: nextGridMarks,
        assignments: nextAssignments,
      };
    }
    if (action.type === 'deduction_assign') {
      const key = `${action.rowId}:${action.colId}`;
      const nextAssignments = {
        ...state.assignments,
        [action.rowId]: action.colId,
      };
      const nextGridMarks: Record<string, DeductionCellMark> = {
        ...state.gridMarks,
      };
      Object.keys(nextGridMarks).forEach((k) => {
        if (k.startsWith(`${action.rowId}:`) && nextGridMarks[k] === 'confirmed') {
          nextGridMarks[k] = 'unknown';
        }
      });
      nextGridMarks[key] = 'confirmed';
      return {
        ...state,
        gridMarks: nextGridMarks,
        assignments: nextAssignments,
      };
    }
    return state;
  }

  // F. Cipher & Code
  if (state.type === 'cipher_code') {
    if (action.type === 'cipher_focus_slot') {
      const clampedIdx = Math.max(
        0,
        Math.min(state.decodedSlots.length - 1, action.index)
      );
      return {
        ...state,
        activeSlotIndex: clampedIdx,
      };
    }
    if (action.type === 'cipher_input_symbol') {
      const nextSlots = [...state.decodedSlots];
      const idx = Math.max(0, Math.min(nextSlots.length - 1, state.activeSlotIndex));
      nextSlots[idx] = action.symbol;
      const nextIdx = Math.min(nextSlots.length - 1, idx + 1);
      return {
        ...state,
        decodedSlots: nextSlots,
        activeSlotIndex: nextIdx,
      };
    }
    if (action.type === 'cipher_backspace') {
      const nextSlots = [...state.decodedSlots];
      let idx = state.activeSlotIndex;
      if (nextSlots[idx]) {
        nextSlots[idx] = '';
      } else if (idx > 0) {
        idx -= 1;
        nextSlots[idx] = '';
      }
      return {
        ...state,
        decodedSlots: nextSlots,
        activeSlotIndex: idx,
      };
    }
    if (action.type === 'cipher_clear') {
      return {
        ...state,
        decodedSlots: state.decodedSlots.map(() => ''),
        activeSlotIndex: 0,
      };
    }
    if (action.type === 'cipher_shift_dial') {
      const nextShift = ((state.dialShift + action.delta) % 12 + 12) % 12;
      return {
        ...state,
        dialShift: nextShift,
      };
    }
    return state;
  }

  // G. Mathematical Reasoning
  if (state.type === 'mathematical_reasoning') {
    const varId =
      ('variableId' in action && action.variableId) || state.activeVariableId;

    if (action.type === 'math_focus_variable') {
      return {
        ...state,
        activeVariableId: action.variableId,
      };
    }
    if (action.type === 'math_set_value') {
      if (!varId) return state;
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: action.value.trim(),
        },
      };
    }
    if (action.type === 'math_append_digit') {
      if (!varId) return state;
      const maxDigits = action.maxDigits ?? 5;
      const current = state.variableValues[varId] ?? '';
      const rawDigits = current.replace('-', '');
      if (rawDigits.length >= maxDigits) return state;
      const nextVal =
        current === '0'
          ? action.digit
          : current === '-0'
          ? `-${action.digit}`
          : `${current}${action.digit}`;
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: nextVal,
        },
      };
    }
    if (action.type === 'math_toggle_sign') {
      if (!varId) return state;
      const current = state.variableValues[varId] ?? '';
      const nextVal = current.startsWith('-') ? current.slice(1) : `-${current}`;
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: nextVal,
        },
      };
    }
    if (action.type === 'math_backspace') {
      if (!varId) return state;
      const current = state.variableValues[varId] ?? '';
      const nextVal = current.slice(0, -1);
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: nextVal === '-' ? '' : nextVal,
        },
      };
    }
    if (action.type === 'math_clear') {
      if (!varId) return state;
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: '',
        },
      };
    }
    if (action.type === 'math_step_delta') {
      if (!varId) return state;
      const currentNum = Number(state.variableValues[varId] || '0');
      const safeBase = Number.isFinite(currentNum) ? currentNum : 0;
      const nextNum = safeBase + action.delta;
      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [varId]: String(nextNum),
        },
      };
    }
    return state;
  }

  // H. Memory Challenge
  if (state.type === 'memory_challenge') {
    if (action.type === 'memory_start_recall') {
      return {
        ...state,
        phase: 'recall',
      };
    }
    if (action.type === 'memory_peek_study') {
      return {
        ...state,
        phase: 'study',
        studyPeekCount: state.studyPeekCount + 1,
      };
    }
    if (action.type === 'memory_focus_target') {
      return {
        ...state,
        activeTargetId: action.targetId,
      };
    }
    if (action.type === 'memory_select_token') {
      const targetId = action.targetId ?? state.activeTargetId;
      if (!targetId) return state;
      const nextRecalled = {
        ...state.recalledValues,
        [targetId]: action.tokenId,
      };
      let nextActiveTarget = targetId;
      if (spec?.type === 'memory_challenge') {
        const emptyTarget = spec.recallTargetIds.find(
          (t) => !nextRecalled[t.targetId]
        );
        if (emptyTarget) {
          nextActiveTarget = emptyTarget.targetId;
        }
      }
      return {
        ...state,
        phase: 'recall',
        activeTargetId: nextActiveTarget,
        recalledValues: nextRecalled,
      };
    }
    return state;
  }

  return state;
}

/**
 * Checks whether the current interactive state is complete and ready for submission.
 * Incomplete states return false so the UI/validator can guide the user without penalizing attempts.
 */
export function isPuzzleStateComplete(
  definition: PuzzleDefinition,
  state: PuzzleInteractiveState
): boolean {
  const spec = definition.interactionSpec;

  switch (state.type) {
    case 'multiple_choice':
      return Boolean(state.selectedOptionId && state.selectedOptionId.trim().length > 0);

    case 'pattern_recognition': {
      if (spec.type !== 'pattern_recognition') return false;
      if (spec.mode === 'layer_toggle') {
        return state.toggledTokenIds.length > 0;
      }
      const hasPrimary = spec.targetCellIds.every((cellId) =>
        Boolean(state.cellSelections[cellId])
      );
      if (!hasPrimary) return false;
      if (spec.secondaryTokens && spec.secondaryTokens.length > 0) {
        return spec.targetCellIds.every((cellId) =>
          Boolean(state.secondarySelections[cellId])
        );
      }
      return true;
    }

    case 'sequence_puzzle': {
      if (spec.type !== 'sequence_puzzle') return false;
      if (spec.mode === 'reorder_tokens') {
        return state.orderedTokenIds.length > 0;
      }
      return spec.targetSlotIds.every((slotId) => {
        const val = state.slotValues[slotId];
        return typeof val === 'string' && val.trim().length > 0 && val.trim() !== '-';
      });
    }

    case 'spatial_reasoning': {
      if (spec.type !== 'spatial_reasoning') return false;
      if (spec.mode === 'voxel_projection') {
        return state.voxelHeights.some((h) => h > 0);
      }
      if (
        definition.solutionSpec.type === 'spatial_reasoning' &&
        definition.solutionSpec.expectedSelectedFace !== undefined
      ) {
        return typeof state.selectedFaceValue === 'number';
      }
      return true;
    }

    case 'logical_deduction': {
      if (spec.type !== 'logical_deduction') return false;
      return spec.rowEntities.every((row) => Boolean(state.assignments[row.id]));
    }

    case 'cipher_code': {
      return (
        state.decodedSlots.length > 0 &&
        state.decodedSlots.every((slotVal) => slotVal.trim().length > 0)
      );
    }

    case 'mathematical_reasoning': {
      if (spec.type !== 'mathematical_reasoning') return false;
      return spec.variableLabels.every((v) => {
        const raw = state.variableValues[v.variableId];
        if (typeof raw !== 'string' || raw.trim().length === 0 || raw.trim() === '-') {
          return false;
        }
        return Number.isFinite(Number(raw));
      });
    }

    case 'memory_challenge': {
      if (spec.type !== 'memory_challenge') return false;
      if (state.phase !== 'recall') return false;
      return spec.recallTargetIds.every((t) =>
        Boolean(state.recalledValues[t.targetId])
      );
    }
  }
}

/**
 * Computes a deterministic string signature for the submitted answer state so
 * repeated clicks on Check Answer without changing the state never double-penalize the player.
 */
export function getPuzzleStateSignature(state: PuzzleInteractiveState): string {
  switch (state.type) {
    case 'multiple_choice':
      return `mc:${state.selectedOptionId}`;
    case 'pattern_recognition':
      return `pr:${JSON.stringify(state.cellSelections)}:${JSON.stringify(
        state.secondarySelections
      )}:${[...state.toggledTokenIds].sort().join(',')}`;
    case 'sequence_puzzle':
      return `seq:${JSON.stringify(state.slotValues)}:${state.orderedTokenIds.join(',')}`;
    case 'spatial_reasoning':
      return `sr:${state.orientationDeg}:${state.flippedH}:${state.flippedV}:${state.voxelHeights.join(
        ','
      )}:${state.dieFaces.top}-${state.dieFaces.north}-${state.dieFaces.east}:${
        state.selectedFaceValue ?? 'none'
      }`;
    case 'logical_deduction':
      return `ld:${JSON.stringify(state.assignments)}`;
    case 'cipher_code':
      return `cc:${state.decodedSlots.join('|')}:${state.dialShift}`;
    case 'mathematical_reasoning':
      return `mr:${JSON.stringify(state.variableValues)}`;
    case 'memory_challenge':
      return `mem:${state.phase}:${JSON.stringify(state.recalledValues)}`;
  }
}

/**
 * Formats a human-readable preview of the player's current answer for the target slot on the board.
 */
export function getTargetSlotPreviewText(
  definition: PuzzleDefinition,
  state: PuzzleInteractiveState,
  slotId?: string
): string {
  const spec = definition.interactionSpec;

  switch (state.type) {
    case 'multiple_choice': {
      const found = definition.candidateOptions.find(
        (c) => c.optionId === state.selectedOptionId
      );
      return found ? found.label : '?';
    }
    case 'pattern_recognition': {
      if (spec.type !== 'pattern_recognition') return '?';
      if (spec.mode === 'layer_toggle') {
        if (state.toggledTokenIds.length === 0) return '?';
        const labels = state.toggledTokenIds.map(
          (id) => spec.paletteTokens.find((t) => t.tokenId === id)?.label ?? id
        );
        return labels.join(' + ');
      }
      const targetId = slotId && spec.targetCellIds.includes(slotId)
        ? slotId
        : spec.targetCellIds[0];
      const primaryId = state.cellSelections[targetId];
      const primaryLabel =
        spec.paletteTokens.find((t) => t.tokenId === primaryId)?.label ?? primaryId;
      if (!primaryLabel) return '?';
      if (spec.secondaryTokens && spec.secondaryTokens.length > 0) {
        const secId = state.secondarySelections[targetId];
        const secLabel =
          spec.secondaryTokens.find((t) => t.tokenId === secId)?.label ?? secId;
        const sep = spec.joinSeparator ?? ' × ';
        return secLabel ? `${primaryLabel}${sep}${secLabel}` : `${primaryLabel}${sep}?`;
      }
      return primaryLabel;
    }
    case 'sequence_puzzle': {
      if (spec.type !== 'sequence_puzzle') return '?';
      if (spec.mode === 'reorder_tokens') {
        return state.orderedTokenIds.join(' → ');
      }
      const key = slotId && state.slotValues[slotId] !== undefined
        ? slotId
        : spec.targetSlotIds[0];
      const val = state.slotValues[key];
      return val && val.trim().length > 0 ? val : '?';
    }
    case 'spatial_reasoning': {
      if (spec.type !== 'spatial_reasoning') return '?';
      if (spec.mode === 'voxel_projection') {
        const total = state.voxelHeights.reduce((acc, v) => acc + v, 0);
        return total > 0 ? `${total} Cubes` : '?';
      }
      if (spec.mode === 'die_rotation') {
        if (typeof state.selectedFaceValue === 'number') {
          return `Face ${state.selectedFaceValue}`;
        }
        return `Top: Face ${state.dieFaces.top}`;
      }
      const key = `${state.orientationDeg}:${state.flippedH ? 1 : 0}:${
        state.flippedV ? 1 : 0
      }`;
      if (spec.orientationGlyphs?.[key]) {
        return spec.orientationGlyphs[key];
      }
      if (spec.orientationGlyphs?.[String(state.orientationDeg)]) {
        return spec.orientationGlyphs[String(state.orientationDeg)];
      }
      return `${state.orientationDeg}°`;
    }
    case 'logical_deduction': {
      if (spec.type !== 'logical_deduction') return '?';
      const qRow = spec.targetQuestionRowId ?? spec.rowEntities[0]?.id;
      const assignedColId = qRow ? state.assignments[qRow] : undefined;
      if (!assignedColId) return '?';
      const colObj = spec.colTargets.find((c) => c.id === assignedColId);
      return colObj ? colObj.label : assignedColId;
    }
    case 'cipher_code': {
      const filled = state.decodedSlots.filter((s) => s.trim().length > 0);
      if (filled.length === 0) return '?';
      return state.decodedSlots.map((s) => (s ? s : '_')).join(' ');
    }
    case 'mathematical_reasoning': {
      if (spec.type !== 'mathematical_reasoning') return '?';
      const firstVar = spec.variableLabels[0]?.variableId;
      const val = firstVar ? state.variableValues[firstVar] : '';
      return val && val.trim().length > 0 ? val : '?';
    }
    case 'memory_challenge': {
      if (spec.type !== 'memory_challenge') return '?';
      if (state.phase === 'study') return 'Studying...';
      const firstTarget = spec.recallTargetIds[0]?.targetId;
      const tokenId = firstTarget ? state.recalledValues[firstTarget] : '';
      const tokenLabel =
        spec.recallPalette.find((t) => t.tokenId === tokenId)?.label ?? tokenId;
      return tokenLabel || '?';
    }
  }
}

/**
 * Progressive Hint lookup helper for any puzzle definition.
 */
export function getProgressiveHint(
  definition: PuzzleDefinition,
  hintsUsed: number
): {
  unlockedHints: string[];
  nextHintIndex: number | null;
  canRequestMore: boolean;
} {
  const safeUsed = Math.max(0, Math.min(hintsUsed, definition.maxHints));
  const unlockedHints = definition.availableHints.slice(0, safeUsed);
  const canRequestMore =
    safeUsed < definition.maxHints && safeUsed < definition.availableHints.length;

  return {
    unlockedHints,
    nextHintIndex: canRequestMore ? safeUsed : null,
    canRequestMore,
  };
}
