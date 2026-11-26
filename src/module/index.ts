/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Canonical NEX11 Game-Module Entry Point (Phase L3)
 */

import App, { LogicQuestAppProps } from '../App';

export * from './contract';
export type { LogicQuestAppProps };

/**
 * Canonical React component entry point for mounting Logic Quest as a NEX11 Game Module
 * or standalone brain-training application.
 */
export const LogicQuestModule = App;

export default LogicQuestModule;
