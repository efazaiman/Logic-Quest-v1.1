/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L2.1 Modular Interactive Puzzle Mechanism Host
 * Renders dedicated, touch-and-desktop-accessible interactive controls for all 8 puzzle types:
 * 1. multiple_choice
 * 2. pattern_recognition (single/dual attribute builder & visual layer toggles)
 * 3. sequence_puzzle (numeric keypad/steppers & drag/tap token reordering)
 * 4. spatial_reasoning (flip/rotate manipulator, 2x2 voxel stack builder & 3D die rotation)
 * 5. logical_deduction (interactive elimination grid & constraint assignment)
 * 6. cipher_code (cipher reference table, shift dial & multi-slot symbol decoder)
 * 7. mathematical_reasoning (equation node display, step adjusters & numeric keypad)
 * 8. memory_challenge (timed Study phase -> Concealed Recall & Reproduce phase)
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Delete,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { PuzzleMechanismAction } from '../../engine/mechanicsController';
import {
  PuzzleDefinition,
  PuzzleInteractiveState,
  SpatialTurnCommand,
} from '../../types/game';

interface PuzzleMechanismHostProps {
  definition: PuzzleDefinition;
  state: PuzzleInteractiveState;
  disabled: boolean;
  isMarkedWrong: boolean;
  onDispatch: (action: PuzzleMechanismAction) => void;
}

const MECHANISM_BADGE_LABELS: Record<PuzzleDefinition['puzzleType'], string> = {
  multiple_choice: 'Multiple Choice',
  pattern_recognition: 'Pattern Constructor',
  sequence_puzzle: 'Sequence Mechanism',
  spatial_reasoning: 'Spatial Manipulator',
  logical_deduction: 'Deduction Matrix',
  cipher_code: 'Cipher Decoder',
  mathematical_reasoning: 'Math Console',
  memory_challenge: 'Memory & Recall',
};

export const PuzzleMechanismHost: React.FC<PuzzleMechanismHostProps> = ({
  definition,
  state,
  disabled,
  isMarkedWrong,
  onDispatch,
}) => {
  const spec = definition.interactionSpec;
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [selectedSwapIdx, setSelectedSwapIdx] = useState<number | null>(null);
  const [studyRemaining, setStudyRemaining] = useState<number>(() =>
    spec.type === 'memory_challenge' ? spec.studyDurationSeconds : 6
  );

  // Reset study timer when puzzle changes or when returning to study phase
  useEffect(() => {
    if (spec.type !== 'memory_challenge' || state.type !== 'memory_challenge') {
      return;
    }
    if (state.phase !== 'study' || disabled) return;

    setStudyRemaining(spec.studyDurationSeconds);
    const interval = window.setInterval(() => {
      setStudyRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          onDispatch({ type: 'memory_start_recall' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [definition.id, spec, state.type, state.type === 'memory_challenge' ? state.phase : null, disabled, onDispatch]);

  // Support physical keyboard input across Sequence, Math, Multiple Choice & Cipher mechanics
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      if (
        state.type === 'sequence_puzzle' ||
        state.type === 'mathematical_reasoning'
      ) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          if (state.type === 'sequence_puzzle') {
            onDispatch({ type: 'sequence_append_digit', digit: e.key });
          } else if (spec.type === 'mathematical_reasoning') {
            onDispatch({
              type: 'math_append_digit',
              digit: e.key,
              maxDigits: spec.maxDigits,
            });
          }
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          if (state.type === 'sequence_puzzle') {
            onDispatch({ type: 'sequence_backspace' });
          } else {
            onDispatch({ type: 'math_backspace' });
          }
        }
        return;
      }

      if (
        state.type === 'multiple_choice' &&
        spec.type === 'multiple_choice'
      ) {
        const keyUpper = e.key.toUpperCase();
        const idx =
          keyUpper >= '1' && keyUpper <= '4'
            ? Number(keyUpper) - 1
            : keyUpper >= 'A' && keyUpper <= 'D'
            ? keyUpper.charCodeAt(0) - 65
            : -1;
        if (idx >= 0 && idx < spec.options.length) {
          e.preventDefault();
          onDispatch({
            type: 'select_option',
            optionId: spec.options[idx].optionId,
          });
        }
        return;
      }

      if (state.type === 'cipher_code' && spec.type === 'cipher_code') {
        if (e.key === 'Backspace') {
          e.preventDefault();
          onDispatch({ type: 'cipher_backspace' });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onDispatch({
            type: 'cipher_focus_slot',
            index: Math.max(0, state.activeSlotIndex - 1),
          });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onDispatch({
            type: 'cipher_focus_slot',
            index: Math.min(
              state.decodedSlots.length - 1,
              state.activeSlotIndex + 1
            ),
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, state, spec, onDispatch]);

  const handleReset = () => {
    if (disabled) return;
    setSelectedSwapIdx(null);
    onDispatch({ type: 'reset', initialState: definition.initialState });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-2.5">
      {/* Mechanism Header Bar with Reset Action */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-sky-900 dark:text-cyan-300">
          {MECHANISM_BADGE_LABELS[definition.puzzleType]}
        </span>

        {!disabled && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-cyan-300 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Input</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          A. MULTIPLE CHOICE MECHANISM
          ===================================================================== */}
      {state.type === 'multiple_choice' && spec.type === 'multiple_choice' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {spec.options.map((option) => {
            const isSelected = state.selectedOptionId === option.optionId;
            return (
              <button
                key={option.optionId}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => {
                  onDispatch({ type: 'select_option', optionId: option.optionId });
                }}
                className={`min-h-[48px] py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-2xl font-mono text-sm sm:text-base font-bold cursor-pointer tabular-nums flex flex-col items-center justify-center text-center transition-transform ${
                  isSelected
                    ? isMarkedWrong
                      ? 'card-3d-compact !border-rose-500 dark:!border-rose-400 text-rose-700 dark:text-rose-300 lq-shake-subtle'
                      : 'btn-3d-primary text-white -translate-y-0.5 lq-slot-pop'
                    : 'card-3d-compact text-slate-900 dark:text-white'
                }`}
              >
                <span>{option.label}</span>
                {option.detail && (
                  <span
                    className={`text-[10px] font-sans font-normal mt-0.5 leading-tight ${
                      isSelected && !isMarkedWrong
                        ? 'text-sky-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {option.detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          B. PATTERN RECOGNITION MECHANISM (Cell Builder & Layer Toggle)
          ===================================================================== */}
      {state.type === 'pattern_recognition' && spec.type === 'pattern_recognition' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          {spec.mode === 'layer_toggle' ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Tap shape layers to toggle them ON or OFF in the output cell:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {spec.paletteTokens.map((token) => {
                  const isActive = state.toggledTokenIds.includes(token.tokenId);
                  return (
                    <button
                      key={token.tokenId}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isActive}
                      onClick={() => {
                        onDispatch({
                          type: 'pattern_toggle_layer',
                          tokenId: token.tokenId,
                        });
                      }}
                      className={`min-h-[52px] p-2.5 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform ${
                        isActive
                          ? 'btn-3d-primary text-white lq-slot-pop'
                          : 'card-3d-compact text-slate-900 dark:text-white'
                      }`}
                    >
                      <span className="font-mono text-lg font-bold">{token.label}</span>
                      <span className="text-[10px] opacity-85">
                        {isActive ? 'Layer ON' : token.categoryLabel ?? 'Layer OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center">
                  1. Select Primary Pattern Symbol
                </div>
                <div
                  className={`grid gap-2 ${
                    spec.paletteTokens.length > 4
                      ? 'grid-cols-4 sm:grid-cols-8'
                      : spec.paletteTokens.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {spec.paletteTokens.map((token) => {
                    const activeCell = state.activeCellId || spec.targetCellIds[0];
                    const isSelected = state.cellSelections[activeCell] === token.tokenId;
                    return (
                      <button
                        key={token.tokenId}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isSelected}
                        onClick={() => {
                          onDispatch({
                            type: 'pattern_select_primary',
                            tokenId: token.tokenId,
                            cellId: activeCell,
                          });
                        }}
                        className={`min-h-[48px] py-2 px-2.5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-transform ${
                          isSelected
                            ? 'btn-3d-primary text-white lq-slot-pop'
                            : 'card-3d-compact text-slate-900 dark:text-white'
                        }`}
                      >
                        <span className="font-mono text-base sm:text-lg font-bold">
                          {token.label}
                        </span>
                        {token.categoryLabel && (
                          <span className="text-[10px] opacity-80 truncate max-w-full">
                            {token.categoryLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {spec.secondaryTokens && spec.secondaryTokens.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-300/40 dark:border-slate-700/50">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center">
                    2. Select Pattern Count / Modifier
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {spec.secondaryTokens.map((sec) => {
                      const activeCell = state.activeCellId || spec.targetCellIds[0];
                      const isSelected =
                        state.secondarySelections[activeCell] === sec.tokenId;
                      return (
                        <button
                          key={sec.tokenId}
                          type="button"
                          disabled={disabled}
                          aria-pressed={isSelected}
                          onClick={() => {
                            onDispatch({
                              type: 'pattern_select_secondary',
                              tokenId: sec.tokenId,
                              cellId: activeCell,
                            });
                          }}
                          className={`min-h-[44px] py-2 px-3 rounded-xl font-mono text-sm font-bold cursor-pointer transition-transform ${
                            isSelected
                              ? 'btn-3d-primary text-white lq-slot-pop'
                              : 'card-3d-compact text-slate-900 dark:text-white'
                          }`}
                        >
                          {sec.categoryLabel ?? `× ${sec.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          C. SEQUENCE PUZZLE MECHANISM (Numeric Keypad/Stepper & Token Reorder)
          ===================================================================== */}
      {state.type === 'sequence_puzzle' && spec.type === 'sequence_puzzle' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          {spec.mode === 'reorder_tokens' ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Tap two items to swap or use the arrows / drag-and-drop to arrange 1st → 4th:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {state.orderedTokenIds.map((tokenId, idx) => {
                  const isSwapPicked = selectedSwapIdx === idx;
                  return (
                    <div
                      key={`${tokenId}-${idx}`}
                      draggable={!disabled}
                      onDragStart={() => setDragFromIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragFromIdx !== null && dragFromIdx !== idx) {
                          onDispatch({
                            type: 'sequence_swap_tokens',
                            fromIndex: dragFromIdx,
                            toIndex: idx,
                          });
                        }
                        setDragFromIdx(null);
                      }}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-between gap-1.5 transition-all lq-slot-pop ${
                        isSwapPicked
                          ? 'card-3d-featured !border-cyan-500 ring-2 ring-cyan-400/50'
                          : 'card-3d-compact card-3d-static'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-sky-700 dark:text-cyan-400">
                        Position #{idx + 1}
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (selectedSwapIdx === null) {
                            soundEngine.playPuzzleInteract();
                            setSelectedSwapIdx(idx);
                          } else if (selectedSwapIdx === idx) {
                            soundEngine.playPuzzleInteract();
                            setSelectedSwapIdx(null);
                          } else {
                            onDispatch({
                              type: 'sequence_swap_tokens',
                              fromIndex: selectedSwapIdx,
                              toIndex: idx,
                            });
                            setSelectedSwapIdx(null);
                          }
                        }}
                        className="w-full py-1.5 px-2 rounded-lg font-display font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
                      >
                        {tokenId}
                      </button>
                      <div className="flex items-center justify-between w-full gap-1">
                        <button
                          type="button"
                          disabled={disabled || idx === 0}
                          aria-label={`Move ${tokenId} left`}
                          onClick={() => {
                            setSelectedSwapIdx(null);
                            onDispatch({
                              type: 'sequence_swap_tokens',
                              fromIndex: idx,
                              toIndex: idx - 1,
                            });
                          }}
                          className="flex-1 min-h-[36px] py-1 rounded-lg icon-3d-secondary flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={disabled || idx === state.orderedTokenIds.length - 1}
                          aria-label={`Move ${tokenId} right`}
                          onClick={() => {
                            setSelectedSwapIdx(null);
                            onDispatch({
                              type: 'sequence_swap_tokens',
                              fromIndex: idx,
                              toIndex: idx + 1,
                            });
                          }}
                          className="flex-1 min-h-[36px] py-1 rounded-lg icon-3d-secondary flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Active Sequence Slot Readout + Quick Step Adjusters */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Sequence Value:
                  </span>
                  <span
                    key={state.slotValues[state.activeSlotId] || 'empty'}
                    className={`min-w-[84px] px-3 py-1.5 rounded-xl font-mono text-base font-bold text-center tabular-nums lq-slot-pop ${
                      isMarkedWrong
                        ? 'bg-rose-500/20 border border-rose-500 text-rose-700 dark:text-rose-200 lq-shake-subtle'
                        : 'card-3d-compact card-3d-static text-sky-800 dark:text-cyan-300'
                    }`}
                  >
                    {state.slotValues[state.activeSlotId] || '?'}
                  </span>
                </div>

                {spec.stepButtons && spec.stepButtons.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {spec.stepButtons.map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onDispatch({ type: 'sequence_step_delta', delta });
                        }}
                        className="min-h-[38px] px-2.5 py-1 rounded-xl icon-3d-secondary font-mono text-xs font-bold cursor-pointer tabular-nums"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Numeric Keypad */}
              <div className="puzzle-keypad grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onDispatch({ type: 'sequence_append_digit', digit });
                    }}
                    className="min-h-[44px] rounded-xl card-3d-compact font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Backspace"
                  onClick={() => {
                    onDispatch({ type: 'sequence_backspace' });
                  }}
                  className="min-h-[44px] col-span-2 sm:col-span-1 rounded-xl icon-3d-secondary flex items-center justify-center cursor-pointer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          D. SPATIAL REASONING MECHANISM (Orientation, Voxel Grid & Die Turn)
          ===================================================================== */}
      {state.type === 'spatial_reasoning' && spec.type === 'spatial_reasoning' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          {spec.mode === 'orientation_manipulator' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Orientation:{' '}
                  <span className="font-mono font-bold text-sky-700 dark:text-cyan-300 tabular-nums">
                    {state.orientationDeg}°
                  </span>{' '}
                  · Mirror H:{' '}
                  <span className="font-mono font-bold text-sky-700 dark:text-cyan-300">
                    {state.flippedH ? 'Flipped' : 'Normal'}
                  </span>
                </div>
                <div
                  key={`${state.orientationDeg}-${state.flippedH}-${state.flippedV}`}
                  className="px-3 py-1 rounded-xl card-3d-compact card-3d-static font-mono text-xl font-bold text-sky-700 dark:text-cyan-300 lq-slot-pop"
                >
                  {spec.orientationGlyphs?.[
                    `${state.orientationDeg}:${state.flippedH ? 1 : 0}:${
                      state.flippedV ? 1 : 0
                    }`
                  ] ?? '◐'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'spatial_command', command: 'flip_h' });
                  }}
                  className={`min-h-[46px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                    state.flippedH
                      ? 'btn-3d-primary text-white'
                      : 'card-3d-compact text-slate-900 dark:text-white'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip H (↔)</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'spatial_command', command: 'flip_v' });
                  }}
                  className={`min-h-[46px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                    state.flippedV
                      ? 'btn-3d-primary text-white'
                      : 'card-3d-compact text-slate-900 dark:text-white'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Flip V (↕)</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'spatial_command', command: 'rotate_ccw_90' });
                  }}
                  className="min-h-[46px] px-3 py-2 rounded-xl card-3d-compact text-slate-900 dark:text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>90° CCW</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'spatial_command', command: 'rotate_cw_90' });
                  }}
                  className="min-h-[46px] px-3 py-2 rounded-xl card-3d-compact text-slate-900 dark:text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>90° CW</span>
                </button>
              </div>
            </div>
          )}

          {spec.mode === 'voxel_projection' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 px-1">
                <span>Adjust 2×2 Voxel Column Heights:</span>
                <span className="font-mono font-bold text-sky-700 dark:text-cyan-300 tabular-nums">
                  Total = {state.voxelHeights.reduce((a, b) => a + b, 0)} Cubes
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {state.voxelHeights.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl card-3d-compact card-3d-static flex flex-col items-center justify-between gap-2"
                  >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-tight">
                      {spec.voxelGridLabels?.[idx] ?? `Column ${idx + 1}`}
                    </span>
                    <div
                      key={`${idx}-${h}`}
                      className="font-mono text-lg font-bold text-sky-700 dark:text-cyan-300 tabular-nums lq-slot-pop"
                    >
                      {h} {h === 1 ? 'Cube' : 'Cubes'}
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        disabled={disabled || h <= 0}
                        aria-label={`Decrease column ${idx + 1}`}
                        onClick={() => {
                          onDispatch({
                            type: 'spatial_step_voxel',
                            index: idx,
                            delta: -1,
                            maxHeight: spec.maxVoxelHeight,
                          });
                        }}
                        className="flex-1 min-h-[38px] rounded-lg icon-3d-secondary flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || h >= (spec.maxVoxelHeight ?? 4)}
                        aria-label={`Increase column ${idx + 1}`}
                        onClick={() => {
                          onDispatch({
                            type: 'spatial_step_voxel',
                            index: idx,
                            delta: 1,
                            maxHeight: spec.maxVoxelHeight,
                          });
                        }}
                        className="flex-1 min-h-[38px] rounded-lg btn-3d-primary text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {spec.mode === 'die_rotation' && (
            <div className="space-y-2.5">
              <div
                key={state.commandHistory.length}
                className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl card-3d-compact card-3d-static text-xs font-mono tabular-nums lq-slot-pop"
              >
                <span className="font-bold text-sky-700 dark:text-cyan-300">
                  Top Face: {state.dieFaces.top}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  N:{state.dieFaces.north} · S:{state.dieFaces.south} · E:
                  {state.dieFaces.east} · W:{state.dieFaces.west}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Steps: {state.commandHistory.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { cmd: 'pitch_north', label: 'Pitch 90° North' },
                    { cmd: 'pitch_south', label: 'Pitch 90° South' },
                    { cmd: 'roll_east', label: 'Roll 90° East' },
                    { cmd: 'roll_west', label: 'Roll 90° West' },
                  ] as Array<{ cmd: SpatialTurnCommand; label: string }>
                ).map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onDispatch({ type: 'spatial_command', command: item.cmd });
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl card-3d-compact text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          E. LOGICAL DEDUCTION MECHANISM (Interactive Elimination & Assignment Grid)
          ===================================================================== */}
      {state.type === 'logical_deduction' && spec.type === 'logical_deduction' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span>
              Tap cells to cycle:{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ✕ Eliminate
              </span>{' '}
              →{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Confirm
              </span>
            </span>
            <span className="font-mono font-bold text-sky-800 dark:text-cyan-300 tabular-nums">
              Assigned: {Object.keys(state.assignments).length} /{' '}
              {spec.rowEntities.length}
            </span>
          </div>

          <div className="puzzle-deduction-grid overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-display text-slate-600 dark:text-slate-300">
                    Entity / Target
                  </th>
                  {spec.colTargets.map((col) => (
                    <th
                      key={col.id}
                      className="p-1.5 text-center font-display font-bold text-slate-800 dark:text-slate-100"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spec.rowEntities.map((row) => {
                  const rowHasAssignment = Boolean(state.assignments[row.id]);
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-slate-300/40 dark:border-slate-700/50 transition-colors ${
                        rowHasAssignment
                          ? 'bg-sky-500/5 dark:bg-cyan-500/5'
                          : ''
                      }`}
                    >
                      <td className="p-1.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {row.label}
                      </td>
                      {spec.colTargets.map((col) => {
                        const key = `${row.id}:${col.id}`;
                        const mark = state.gridMarks[key] ?? 'unknown';
                        const isAssigned = state.assignments[row.id] === col.id;
                        return (
                          <td key={col.id} className="p-1 text-center">
                            <button
                              type="button"
                              disabled={disabled}
                              aria-label={`${row.label} - ${col.label}: ${mark}`}
                              onClick={() => {
                                onDispatch({
                                  type: 'deduction_cycle_cell',
                                  rowId: row.id,
                                  colId: col.id,
                                });
                              }}
                              className={`w-full min-h-[42px] rounded-xl font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-1 cursor-pointer transition-transform ${
                                isAssigned || mark === 'confirmed'
                                  ? 'btn-3d-primary text-white lq-slot-pop'
                                  : mark === 'eliminated'
                                  ? 'bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300'
                                  : 'card-3d-compact text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isAssigned || mark === 'confirmed' ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span className="puzzle-deduction-mark hidden sm:inline">Confirmed</span>
                                </>
                              ) : mark === 'eliminated' ? (
                                <>
                                  <X className="w-4 h-4" />
                                  <span className="puzzle-deduction-mark hidden sm:inline">Out</span>
                                </>
                              ) : (
                                <span>·</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          F. CIPHER & CODE MECHANISM (Cipher Key, Shift Dial & Multi-Slot Decoder)
          ===================================================================== */}
      {state.type === 'cipher_code' && spec.type === 'cipher_code' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          {/* Reference Mapping Strip + Optional Shift Dial */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {spec.referenceMappings.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg card-3d-compact card-3d-static font-mono font-semibold text-slate-800 dark:text-slate-100"
                >
                  {m.source} → {m.target}
                </span>
              ))}
            </div>

            {spec.supportsShiftDial ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl card-3d-compact card-3d-static font-mono text-xs tabular-nums">
                <span>Dial Δ+{state.dialShift}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'cipher_shift_dial', delta: 1 });
                  }}
                  className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-cyan-300 font-bold cursor-pointer"
                >
                  +1
                </button>
              </div>
            ) : (
              <span className="font-mono text-[11px] font-bold text-sky-800 dark:text-cyan-300 tabular-nums">
                Decoded: {state.decodedSlots.filter(Boolean).length} /{' '}
                {state.decodedSlots.length}
              </span>
            )}
          </div>

          {/* Decoded Code Slots */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {state.decodedSlots.map((slotVal, idx) => {
              const isFocused = state.activeSlotIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'cipher_focus_slot', index: idx });
                  }}
                  className={`min-w-[74px] min-h-[48px] px-3 py-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-transform ${
                    isFocused
                      ? 'card-3d-featured border-2 !border-cyan-500 dark:!border-cyan-400 lq-slot-pop'
                      : 'card-3d-compact'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {spec.slotLabels[idx] ?? `Slot ${idx + 1}`}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {slotVal || '_'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Symbol Input Palette + Backspace */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {spec.symbolPalette.map((sym) => (
              <button
                key={sym.symbolId}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onDispatch({ type: 'cipher_input_symbol', symbol: sym.symbolId });
                }}
                className="min-h-[44px] px-2.5 py-2 rounded-xl card-3d-compact font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {sym.label}
              </button>
            ))}
            <button
              type="button"
              disabled={disabled}
              aria-label="Backspace cipher slot"
              onClick={() => {
                onDispatch({ type: 'cipher_backspace' });
              }}
              className="min-h-[44px] px-2.5 py-2 rounded-xl icon-3d-secondary flex items-center justify-center gap-1 text-xs font-bold cursor-pointer col-span-2 sm:col-span-1"
            >
              <Delete className="w-4 h-4" />
              <span>Clear Slot</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          G. MATHEMATICAL REASONING MECHANISM (Equation Node & Numeric Console)
          ===================================================================== */}
      {state.type === 'mathematical_reasoning' &&
        spec.type === 'mathematical_reasoning' && (
          <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-bold text-sky-800 dark:text-cyan-300 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30">
                  {spec.equationDisplay}
                </span>
                {spec.variableLabels.map((v) => (
                  <div
                    key={`${v.variableId}-${state.variableValues[v.variableId] || 'empty'}`}
                    className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold tabular-nums lq-slot-pop ${
                      isMarkedWrong
                        ? 'bg-rose-500/20 border border-rose-500 text-rose-700 dark:text-rose-200 lq-shake-subtle'
                        : 'card-3d-featured text-sky-900 dark:text-cyan-200'
                    }`}
                  >
                    {v.label}: {state.variableValues[v.variableId] || '?'}
                  </div>
                ))}
              </div>

              {spec.quickSteps && spec.quickSteps.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {spec.quickSteps.map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onDispatch({ type: 'math_step_delta', delta: step });
                      }}
                      className="min-h-[38px] px-2.5 py-1 rounded-xl icon-3d-secondary font-mono text-xs font-bold cursor-pointer tabular-nums"
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Numeric Keypad */}
            <div className="puzzle-keypad grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({
                      type: 'math_append_digit',
                      digit,
                      maxDigits: spec.maxDigits,
                    });
                  }}
                  className="min-h-[44px] rounded-xl card-3d-compact font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={disabled}
                aria-label="Backspace digit"
                onClick={() => {
                  onDispatch({ type: 'math_backspace' });
                }}
                className="min-h-[44px] col-span-2 sm:col-span-1 rounded-xl icon-3d-secondary flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* =====================================================================
          H. MEMORY CHALLENGE MECHANISM (Study Exposure -> Concealed Recall)
          ===================================================================== */}
      {state.type === 'memory_challenge' && spec.type === 'memory_challenge' && (
        <div className="p-3 sm:p-3.5 rounded-2xl gameplay-question-glass space-y-2.5">
          {state.phase === 'study' ? (
            <div className="space-y-2.5 text-center lq-fade-in">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                  <Eye className="w-4 h-4" />
                  <span>Study Phase Active ({studyRemaining}s remaining)</span>
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDispatch({ type: 'memory_start_recall' });
                  }}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl btn-3d-primary text-white text-xs font-display font-bold cursor-pointer"
                >
                  I&apos;m Ready — Recall Now
                </button>
              </div>

              {/* Study Countdown Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-sky-950/10 dark:bg-slate-950/75 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          (studyRemaining /
                            Math.max(1, spec.studyDurationSeconds)) *
                            100
                        )
                      )
                    )}%`,
                  }}
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Memorize the signal slots above before they conceal, or tap &ldquo;I&apos;m Ready — Recall Now&rdquo; to enter your answer immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 lq-fade-in">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-cyan-300">
                  <EyeOff className="w-4 h-4" />
                  <span>
                    {spec.recallTargetIds[0]?.promptLabel ??
                      'Select the recalled observation:'}
                  </span>
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onDispatch({ type: 'memory_peek_study' });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg icon-3d-secondary text-[11px] font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Study Again</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {spec.recallPalette.map((token) => {
                  const activeTarget =
                    state.activeTargetId || spec.recallTargetIds[0]?.targetId;
                  const isSelected =
                    state.recalledValues[activeTarget] === token.tokenId;
                  return (
                    <button
                      key={token.tokenId}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() => {
                        onDispatch({
                          type: 'memory_select_token',
                          tokenId: token.tokenId,
                          targetId: activeTarget,
                        });
                      }}
                      className={`min-h-[46px] px-3 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold cursor-pointer transition-transform ${
                        isSelected
                          ? isMarkedWrong
                            ? 'card-3d-compact !border-rose-500 text-rose-700 dark:text-rose-300 lq-shake-subtle'
                            : 'btn-3d-primary text-white lq-slot-pop'
                          : 'card-3d-compact text-slate-900 dark:text-white'
                      }`}
                    >
                      {token.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
