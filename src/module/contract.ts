/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Canonical NEX11 Game-Module Lifecycle & Contract Exports
 * Pure TypeScript module (safe for both Browser Vite builds and Node test runners).
 */

import {
  LOGIC_QUEST_DISPLAY_NAME,
  LOGIC_QUEST_GAME_ID,
  LOGIC_QUEST_GAME_VERSION,
  LOGIC_QUEST_MODULE_MANIFEST,
  NEX11_COMPLETION_EVENT_VERSION,
  NEX11_CONTRACT_VERSION,
  Nex11CompletionListener,
  configureNex11Launch,
  createNex11CompletionEvent,
  emitNex11CompletionEvent,
  getLogicQuestModuleManifest,
  getNex11BridgeDiagnostics,
  getNex11LaunchConfig,
  getNex11NexiAdapter,
  hasEmittedNex11CompletionEvent,
  notifyNexiGameContext,
  notifyNexiHintUsed,
  notifyNexiReaction,
  registerNex11CompletionListener,
  registerNex11NexiAdapter,
} from '../engine/nex11Bridge';
import { applyNex11LaunchPreferencesToSettings } from '../storage/storageManager';
import {
  Nex11AudioLaunchPreferences,
  Nex11CompletionEventVersion,
  Nex11GameCompletionEvent,
  Nex11HostEnvironmentInfo,
  Nex11LaunchConfig,
  Nex11ModuleContractVersion,
  Nex11ModuleManifest,
  Nex11NexiAdapter,
  NexiExpressionState,
  NexiGameContextPayload,
  NexiHintEventPayload,
  NexiResultReactionPayload,
} from '../types/game';

/**
 * Initializes the Logic Quest module with optional NEX11 host launch parameters
 * before or alongside mounting `<LogicQuestModule />`.
 * Safe to omit when running Logic Quest standalone.
 */
export function initializeLogicQuestModule(config?: Nex11LaunchConfig) {
  const disposeLaunch = configureNex11Launch(config);
  const appliedSettings = applyNex11LaunchPreferencesToSettings(config);
  return {
    manifest: LOGIC_QUEST_MODULE_MANIFEST,
    launchConfig: getNex11LaunchConfig(),
    settings: appliedSettings,
    disposeLaunch,
  };
}

export {
  LOGIC_QUEST_GAME_ID,
  LOGIC_QUEST_DISPLAY_NAME,
  LOGIC_QUEST_GAME_VERSION,
  NEX11_CONTRACT_VERSION,
  NEX11_COMPLETION_EVENT_VERSION,
  LOGIC_QUEST_MODULE_MANIFEST,
  getLogicQuestModuleManifest,
  configureNex11Launch,
  getNex11LaunchConfig,
  registerNex11CompletionListener,
  registerNex11NexiAdapter,
  getNex11NexiAdapter,
  createNex11CompletionEvent,
  createNex11CompletionEvent as buildNex11CompletionEventPayload,
  emitNex11CompletionEvent,
  hasEmittedNex11CompletionEvent,
  getNex11BridgeDiagnostics,
  notifyNexiHintUsed,
  notifyNexiReaction,
  notifyNexiGameContext,
};

export type {
  Nex11CompletionListener,
  Nex11CompletionEventVersion,
  Nex11ModuleContractVersion,
  Nex11GameCompletionEvent,
  Nex11NexiAdapter,
  Nex11HostEnvironmentInfo,
  Nex11AudioLaunchPreferences,
  Nex11LaunchConfig,
  Nex11ModuleManifest,
  NexiExpressionState,
  NexiHintEventPayload,
  NexiResultReactionPayload,
  NexiGameContextPayload,
};
