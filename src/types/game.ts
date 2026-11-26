/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Core Domain & Phase L2.1 Extensible Puzzle Engine Contracts
 */

export type PuzzleCategory =
  | 'number_sequences'
  | 'pattern_recognition'
  | 'mathematical_logic'
  | 'visual_puzzles'
  | 'spatial_reasoning'
  | 'deduction_elimination'
  | 'shape_symbol'
  | 'memory_observation';

export type PuzzleDifficulty = 'easy' | 'normal' | 'hard';

export type DifficultyPreference = PuzzleDifficulty;

export interface AutoDifficultyState {
  currentEffectiveDifficulty: PuzzleDifficulty;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalSolvedInAuto: number;
  recentHistory?: PuzzleDifficulty[];
  lastAdjustmentReason: string;
}

export type PuzzleInteractionType =
  | 'multiple_choice'
  | 'pattern_recognition'
  | 'sequence_puzzle'
  | 'spatial_reasoning'
  | 'logical_deduction'
  | 'cipher_code'
  | 'mathematical_reasoning'
  | 'memory_challenge';

export type ThemePreference = 'dark' | 'light' | 'system';

export type GameMode =
  | 'quick_play'
  | 'daily'
  | 'archive'
  | 'practice'
  | 'collection_preview';

export type GameHubTab =
  | 'overview'
  | 'quick_play'
  | 'daily'
  | 'archive'
  | 'practice';

export type ScreenRoute =
  | 'home'
  | 'quick_play'
  | 'daily'
  | 'collection'
  | 'archive'
  | 'gameplay'
  | 'results'
  | 'progress';

export interface DifficultyConfig {
  id: PuzzleDifficulty;
  label: string;
  description: string;
  targetTimeSeconds: number;
  complexityMultiplier: number;
  baseScore: number;
  maxHintsAllowed: number;
  hintPenaltyRatio: number;
  xpMultiplier: number;
}

export interface PuzzleScoringConfig {
  baseScoreOverride?: number;
  targetTimeSeconds: number;
  maxHints: number;
  hintPenaltyRatio: number;
  attemptPenaltyRatio: number;
  completionBonusRatio: number;
}

export interface CategoryMetadata {
  id: PuzzleCategory;
  indexNumber: string;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  cognitiveFocus: string;
  plannedMechanics: string[];
  boardLayoutType:
    | 'sequence_strip'
    | 'matrix_grid'
    | 'equation_nodes'
    | 'spatial_lattice'
    | 'deduction_table'
    | 'symbol_rings'
    | 'observation_matrix';
  inputModeDescription: string;
  accentHex: string;
  secondaryHex: string;
  polyhedronType:
    | 'octahedron'
    | 'icosahedron'
    | 'dodecahedron'
    | 'tetrahedron'
    | 'torus_knot'
    | 'cuboctahedron'
    | 'prism'
    | 'bipyramid';
}

export interface PuzzleGenerationContext {
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  seed: string;
  mode: GameMode;
  puzzleSetVersion: string;
  stageIndex: number;
  puzzleIdOverride?: string;
  utcDateKey?: string;
}

export interface PuzzleSlotBlueprint {
  slotId: string;
  label: string;
  valueDisplay: string;
  isTargetSlot: boolean;
  subLabel?: string;
  coordinates?: { row: number; col: number };
}

// ============================================================================
// PHASE L2.1 — PUZZLE INTERACTION SPECIFICATIONS, STATES & SOLUTIONS
// ============================================================================

export interface MultipleChoiceSpec {
  type: 'multiple_choice';
  options: Array<{
    optionId: string;
    label: string;
    detail?: string;
  }>;
}

export interface MultipleChoiceState {
  type: 'multiple_choice';
  selectedOptionId: string;
}

export interface MultipleChoiceSolution {
  type: 'multiple_choice';
  correctOptionId: string;
}

export interface PatternRecognitionSpec {
  type: 'pattern_recognition';
  mode: 'cell_builder' | 'layer_toggle';
  targetCellIds: string[];
  paletteTokens: Array<{
    tokenId: string;
    label: string;
    categoryLabel?: string;
  }>;
  secondaryTokens?: Array<{
    tokenId: string;
    label: string;
    categoryLabel?: string;
  }>;
  joinSeparator?: string;
}

export interface PatternRecognitionState {
  type: 'pattern_recognition';
  activeCellId: string;
  cellSelections: Record<string, string>;
  secondarySelections: Record<string, string>;
  toggledTokenIds: string[];
}

export interface PatternRecognitionSolution {
  type: 'pattern_recognition';
  expectedCells?: Record<string, string>;
  expectedToggledTokenIds?: string[];
}

export interface SequencePuzzleSpec {
  type: 'sequence_puzzle';
  mode: 'numeric_input' | 'reorder_tokens';
  targetSlotIds: string[];
  stepButtons?: number[];
  initialTokens?: Array<{
    tokenId: string;
    label: string;
  }>;
}

export interface SequencePuzzleState {
  type: 'sequence_puzzle';
  activeSlotId: string;
  slotValues: Record<string, string>;
  orderedTokenIds: string[];
}

export interface SequencePuzzleSolution {
  type: 'sequence_puzzle';
  expectedSlotValues?: Record<string, number | string>;
  expectedTokenOrder?: string[];
}

export type SpatialTurnCommand =
  | 'rotate_cw_90'
  | 'rotate_ccw_90'
  | 'rotate_cw_45'
  | 'flip_h'
  | 'flip_v'
  | 'pitch_north'
  | 'pitch_south'
  | 'roll_east'
  | 'roll_west';

export interface SpatialReasoningSpec {
  type: 'spatial_reasoning';
  mode: 'orientation_manipulator' | 'voxel_projection' | 'die_rotation';
  initialOrientationDeg?: number;
  initialFlipH?: boolean;
  initialFlipV?: boolean;
  orientationGlyphs?: Record<string, string>;
  voxelGridLabels?: string[];
  maxVoxelHeight?: number;
  targetProjectionSummary?: string;
  initialDieFaces?: {
    top: number;
    bottom: number;
    north: number;
    south: number;
    east: number;
    west: number;
  };
  allowedCommands?: SpatialTurnCommand[];
}

export interface SpatialReasoningState {
  type: 'spatial_reasoning';
  orientationDeg: number;
  flippedH: boolean;
  flippedV: boolean;
  voxelHeights: number[];
  dieFaces: {
    top: number;
    bottom: number;
    north: number;
    south: number;
    east: number;
    west: number;
  };
  commandHistory: SpatialTurnCommand[];
  selectedFaceValue?: number | null;
}

export interface SpatialReasoningSolution {
  type: 'spatial_reasoning';
  expectedOrientationDeg?: number;
  expectedFlippedH?: boolean;
  expectedFlippedV?: boolean;
  expectedVoxelHeights?: number[];
  expectedVoxelSum?: number;
  expectedTopFace?: number;
  expectedSelectedFace?: number;
}

export type DeductionCellMark = 'unknown' | 'eliminated' | 'confirmed';

export interface LogicalDeductionSpec {
  type: 'logical_deduction';
  clues: string[];
  rowEntities: Array<{ id: string; label: string }>;
  colTargets: Array<{ id: string; label: string }>;
  targetQuestionRowId?: string;
}

export interface LogicalDeductionState {
  type: 'logical_deduction';
  gridMarks: Record<string, DeductionCellMark>; // key: `${rowId}:${colId}`
  assignments: Record<string, string>; // rowId -> colId
}

export interface LogicalDeductionSolution {
  type: 'logical_deduction';
  expectedAssignments: Record<string, string>; // rowId -> colId
}

export interface CipherCodeSpec {
  type: 'cipher_code';
  cipherRuleTitle: string;
  referenceMappings: Array<{ source: string; target: string }>;
  encodedPrompt: string;
  slotLabels: string[];
  symbolPalette: Array<{ symbolId: string; label: string }>;
  supportsShiftDial?: boolean;
  initialShift?: number;
}

export interface CipherCodeState {
  type: 'cipher_code';
  activeSlotIndex: number;
  decodedSlots: string[];
  dialShift: number;
}

export interface CipherCodeSolution {
  type: 'cipher_code';
  expectedSlots: string[];
  expectedDialShift?: number;
}

export interface MathematicalReasoningSpec {
  type: 'mathematical_reasoning';
  equationDisplay: string;
  variableLabels: Array<{
    variableId: string;
    label: string;
    placeholder?: string;
  }>;
  allowNegative?: boolean;
  maxDigits?: number;
  quickSteps?: number[];
}

export interface MathematicalReasoningState {
  type: 'mathematical_reasoning';
  activeVariableId: string;
  variableValues: Record<string, string>;
}

export interface MathematicalReasoningSolution {
  type: 'mathematical_reasoning';
  expectedValues: Record<string, number>;
  tolerance?: number;
}

export interface MemoryChallengeSpec {
  type: 'memory_challenge';
  studyDurationSeconds: number;
  studySlots: Array<{
    slotId: string;
    label: string;
    studyValue: string;
  }>;
  recallTargetIds: Array<{
    targetId: string;
    promptLabel: string;
  }>;
  recallPalette: Array<{
    tokenId: string;
    label: string;
  }>;
}

export interface MemoryChallengeState {
  type: 'memory_challenge';
  phase: 'study' | 'recall';
  activeTargetId: string;
  recalledValues: Record<string, string>;
  studyPeekCount: number;
}

export interface MemoryChallengeSolution {
  type: 'memory_challenge';
  expectedRecall: Record<string, string>;
}

export type PuzzleInteractionSpec =
  | MultipleChoiceSpec
  | PatternRecognitionSpec
  | SequencePuzzleSpec
  | SpatialReasoningSpec
  | LogicalDeductionSpec
  | CipherCodeSpec
  | MathematicalReasoningSpec
  | MemoryChallengeSpec;

export type PuzzleInteractiveState =
  | MultipleChoiceState
  | PatternRecognitionState
  | SequencePuzzleState
  | SpatialReasoningState
  | LogicalDeductionState
  | CipherCodeState
  | MathematicalReasoningState
  | MemoryChallengeState;

export type PuzzleSolutionSpec =
  | MultipleChoiceSolution
  | PatternRecognitionSolution
  | SequencePuzzleSolution
  | SpatialReasoningSolution
  | LogicalDeductionSolution
  | CipherCodeSolution
  | MathematicalReasoningSolution
  | MemoryChallengeSolution;

export interface PuzzleCatalogEntry {
  id: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  puzzleType?: PuzzleInteractionType;
  title: string;
  shortDescription: string;
  instructions: string;
  ruleSummary: string;
  estimatedTimeSeconds?: number;
  slots: PuzzleSlotBlueprint[];
  candidateOptions: Array<{
    optionId: string;
    label: string;
    detail?: string;
  }>;
  correctOptionId: string;
  availableHints: string[];
  explanation: string;
  interactionSpec?: PuzzleInteractionSpec;
  initialState?: PuzzleInteractiveState;
  solutionSpec?: PuzzleSolutionSpec;
  scoringConfig?: Partial<PuzzleScoringConfig>;
}

export interface PuzzleDefinition<TPayload = Record<string, unknown>> {
  id: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  puzzleType: PuzzleInteractionType;
  seed: string;
  puzzleSetVersion: string;
  title: string;
  shortDescription?: string;
  instructions: string;
  ruleSummary: string;
  targetTimeSeconds: number;
  estimatedTimeSeconds: number;
  maxHints: number;
  availableHints: string[];
  explanation: string;
  slots: PuzzleSlotBlueprint[];
  candidateOptions: Array<{
    optionId: string;
    label: string;
    detail?: string;
  }>;
  interactionSpec: PuzzleInteractionSpec;
  initialState: PuzzleInteractiveState;
  solutionSpec: PuzzleSolutionSpec;
  scoringConfig: PuzzleScoringConfig;
  isFoundationBlueprint: boolean;
  payload: TPayload;
}

export interface PuzzleAnswer<TValue = unknown> {
  puzzleId: string;
  category: PuzzleCategory;
  selectedOptionId: string;
  submittedValue: TValue;
  interactionState?: PuzzleInteractiveState;
  submissionSignature?: string;
  elapsedSeconds: number;
  hintsUsed: number;
  attemptCount: number;
}

export interface PuzzleValidationResult {
  puzzleId: string;
  isValidSubmission: boolean;
  isCorrect: boolean;
  accuracyRatio: number; // 0.0 to 1.0
  feedbackMessage: string;
  explanation?: string;
  engineStatus: 'validated' | 'foundation_blueprint_only';
}

export interface GameplayModeMetadata {
  quickPlayCategoryFilter?: PuzzleCategory | 'all';
  quickPlayDifficultyFilter?: PuzzleDifficulty;
  quickPlaySelectionType?: 'random' | 'specific';
  archiveChamberId?: string;
  archiveChamberTitle?: string;
  archiveChapterId?: string;
  dailyDateKey?: string;
  dailyId?: string;
  dailyChallengeNumber?: 1 | 2 | 3;
  practiceCategoryFilter?: PuzzleCategory | 'all';
  practiceDifficultyFilter?: PuzzleDifficulty | 'all';
}

export interface QuickPlayConfigState {
  categoryFilter: PuzzleCategory | 'all';
  difficulty: PuzzleDifficulty;
  selectionType: 'random' | 'specific';
  selectedPuzzleId: string | null;
  recentPuzzleIds: string[];
  sessionPlayedPuzzleIds?: string[];
}

export interface WinStreakMilestoneRecord {
  milestoneId: string;
  milestoneIndex: number;
  streakLengthAtMilestone: number;
  xpAwarded: number;
  achievedAtIso: string;
  triggerPuzzleId: string;
}

export interface PuzzleResult {
  completionId: string;
  puzzleId: string;
  puzzleTitle?: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  puzzleType?: PuzzleInteractionType;
  mode: GameMode;
  startedAtIso?: string;
  completedAtIso: string;
  status: 'completed' | 'abandoned' | 'blueprint_preview';
  score: number;
  accuracyPercent: number;
  attemptCount?: number;
  completionTimeSeconds: number;
  hintsUsed: number;
  xpEarned: number;
  basePuzzleXpAwarded?: number;
  winStreakMilestoneXpAwarded?: number;
  winStreakMilestoneReached?: boolean;
  dailySetBonusXpAwarded?: number;
  completedDailySetToday?: boolean;
  archiveChamberBonusXpAwarded?: number;
  newlyCompletedChamberIds?: string[];
  achievementBonusXpAwarded?: number;
  newlyUnlockedAchievementIds?: string[];
  previousLevel?: number;
  newLevel?: number;
  didLevelUp?: boolean;
  explanation?: string;
  isNewPersonalBest: boolean;
  previousBestScore: number | null;
  isPersistedRecord: boolean;
  dailyAlreadyClaimed?: boolean;
  isReplayOfSolvedPuzzle?: boolean;
  modeMetadata?: GameplayModeMetadata;
}

export interface CategoryProgressStats {
  category: PuzzleCategory;
  completedCount: number;
  bestScore: number | null;
  bestAccuracyPercent: number | null;
  fastestTimeSeconds: number | null;
  totalXpEarned: number;
  lastPlayedIso: string | null;
}

export interface PlayerGameProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  totalXp: number;
  totalPuzzlesCompleted: number;
  bestOverallScore: number | null;
  averageAccuracyPercent: number | null;
  currentWinStreak: number;
  bestWinStreak: number;
  winsTowardNextMilestone: number;
  winStreakMilestonesAchieved: number;
  claimedWinStreakMilestoneIds: string[];
  winStreakMilestoneHistory?: WinStreakMilestoneRecord[];
  claimedChamberRewardIds?: string[];
  claimedDailySetDates?: string[];
  claimedAchievementRewardIds?: string[];
  lastUpdatedIso: string;
  categoryStats: Record<PuzzleCategory, CategoryProgressStats>;
}

export interface GameSettings {
  musicEnabled: boolean;
  soundEffectsEnabled: boolean;
  masterMuted?: boolean;
  masterVolume?: number; // 0..100
  sfxVolume?: number; // 0..100
  musicVolume?: number; // 0..100
  difficulty: PuzzleDifficulty;
  difficultyPreference?: DifficultyPreference;
  categoryDifficultyOverrides?: Partial<
    Record<PuzzleCategory, DifficultyPreference>
  >;
  autoDifficultyState?: AutoDifficultyState;
  hintsEnabled: boolean;
  theme: ThemePreference;
}

export interface GameCompletionRecord {
  completionId: string;
  puzzleId: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  mode: GameMode;
  score: number;
  accuracyPercent: number;
  completionTimeSeconds: number;
  hintsUsed?: number;
  attemptCount?: number;
  xpAwarded: number;
  completedAtIso: string;
}

export interface DailyPuzzleDescriptor {
  dailyId: string;
  challengeNumber: 1 | 2 | 3;
  utcDateString: string; // YYYY-MM-DD local calendar date key
  dateKey: string; // YYYY-MM-DD local calendar date key
  puzzleSetVersion: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  featuredPuzzleId: string;
  puzzleTitle: string;
  deterministicSeed: string;
  dayIndex: number;
}

export interface DailyCompletedRecord {
  dailyId: string;
  challengeNumber?: 1 | 2 | 3;
  dateKey?: string;
  completionId: string;
  completedAtIso: string;
  score: number;
  difficulty: PuzzleDifficulty;
  puzzleId?: string;
  puzzleTitle?: string;
  category?: PuzzleCategory;
  accuracyPercent?: number;
  completionTimeSeconds?: number;
  hintsUsed?: number;
  xpEarned?: number;
}

export type DailyDateCompletionMap = Record<string, DailyCompletedRecord>;

export interface DailyCompletionState {
  /**
   * Keyed by local calendar date (YYYY-MM-DD).
   * Stores a map of `{ [dailyId]: DailyCompletedRecord }` for the 3 daily challenges of that date.
   * Also supports legacy single-record objects for backward-compatible migration.
   */
  completedByDate: Record<
    string,
    DailyDateCompletionMap | DailyCompletedRecord
  >;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  categoryRequirement?: PuzzleCategory;
  unlockCriteriaText: string;
  xpReward: number;
  targetValue: number;
}

export interface UnlockedAchievementRecord {
  achievementId: string;
  unlockedAtIso: string;
  triggerCompletionId: string;
  xpAwarded?: number;
}

export interface AchievementProgressItem {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  unlockedAtIso: string | null;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
}

// ============================================================================
// PHASE L3 — NEX11 GAME-MODULE CONTRACT (LAUNCH, COMPLETION & NEXI ADAPTER)
// ============================================================================

export type Nex11CompletionEventVersion = '1.0.0';
export type Nex11ModuleContractVersion = '1.0.0';

export interface Nex11GameCompletionEvent {
  gameId: 'logic_quest';
  eventVersion: Nex11CompletionEventVersion;
  completionId: string;
  puzzleId: string;
  sessionId?: string;
  playerId?: string | null;
  completionStatus: 'completed' | 'abandoned' | 'blueprint_preview';
  validatedScore: number;
  accuracyPercent: number;
  localGameXpEarned: number;
  completionTimestamp: string;
  resultData: {
    category: PuzzleCategory;
    difficulty: PuzzleDifficulty;
    puzzleType?: PuzzleInteractionType;
    mode: GameMode;
    accuracyPercent: number;
    completionTimeSeconds: number;
    hintsUsed: number;
    attemptCount: number;
    localXpEarned: number;
    basePuzzleXpAwarded?: number;
    winStreakMilestoneReached?: boolean;
    winStreakMilestoneXpAwarded?: number;
    completedDailySetToday?: boolean;
    dailySetBonusXpAwarded?: number;
    newlyUnlockedAchievementIds?: string[];
    didLevelUp?: boolean;
    previousLevel?: number;
    newLevel?: number;
    isReplay?: boolean;
    isFoundationPreview: boolean;
  };
}

export type NexiExpressionState =
  | 'idle'
  | 'thinking'
  | 'encouraging'
  | 'celebrating'
  | 'curious'
  | 'proud';

export interface NexiHintEventPayload {
  gameId: 'logic_quest';
  puzzleId: string;
  puzzleTitle: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  hintTier: number;
  maxHints: number;
  hintText: string;
}

export interface NexiResultReactionPayload {
  gameId: 'logic_quest';
  completionId?: string;
  puzzleId: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  mode: GameMode;
  isCorrect: boolean;
  attemptCount: number;
  score?: number;
  accuracyPercent?: number;
  localXpEarned?: number;
  didLevelUp?: boolean;
  newLevel?: number;
  winStreakMilestoneReached?: boolean;
  feedbackMessage?: string;
}

export interface NexiGameContextPayload {
  gameId: 'logic_quest';
  currentRoute: ScreenRoute;
  activeMode?: GameMode;
  activeCategory?: PuzzleCategory | null;
  activePuzzleId?: string | null;
  activeDifficulty?: PuzzleDifficulty;
  playerLevel?: number;
  currentWinStreak?: number;
  updatedAtIso: string;
}

/**
 * Optional host-supplied adapter interface for the NEX11 Nexi companion.
 * Logic Quest never renders a duplicate Nexi character; when standalone, all
 * adapter callbacks safely no-op.
 */
export interface Nex11NexiAdapter {
  showHint?: (payload: NexiHintEventPayload) => void;
  reactToPuzzleResult?: (payload: NexiResultReactionPayload) => void;
  setExpression?: (expression: NexiExpressionState, message?: string) => void;
  updateGameContext?: (context: NexiGameContextPayload) => void;
}

export interface Nex11HostEnvironmentInfo {
  hostApp?: string;
  hostVersion?: string;
  platform?: 'web' | 'ios' | 'android' | 'desktop';
  locale?: string;
  reducedMotion?: boolean;
}

export interface Nex11AudioLaunchPreferences {
  masterMuted?: boolean;
  masterVolume?: number; // 0..100
  musicEnabled?: boolean;
  musicVolume?: number; // 0..100
  soundEffectsEnabled?: boolean;
  sfxVolume?: number; // 0..100
}

/**
 * Optional launch configuration supplied by NEX11 when mounting or launching Logic Quest.
 * All fields are optional; Logic Quest remains 100% playable standalone when omitted.
 */
export interface Nex11LaunchConfig {
  playerId?: string | null;
  themePreference?: ThemePreference;
  audioPreferences?: Nex11AudioLaunchPreferences;
  hostEnvironment?: Nex11HostEnvironmentInfo;
  initialRoute?: 'home' | 'quick_play' | 'daily' | 'collection' | 'progress';
  initialCategory?: PuzzleCategory;
  difficultyPreference?: DifficultyPreference;
  hintsEnabled?: boolean;
  nexiAdapter?: Nex11NexiAdapter | null;
  onCompletionEvent?: (event: Nex11GameCompletionEvent) => void;
}

export interface Nex11ModuleManifest {
  gameId: 'logic_quest';
  displayName: 'Logic Quest';
  gameVersion: string;
  contractVersion: Nex11ModuleContractVersion;
  completionEventVersion: Nex11CompletionEventVersion;
  supportedModes: readonly GameMode[];
  categoriesCount: number;
  catalogPuzzlesCount: number;
  ownsLocalGameXp: true;
  awardsGlobalNex11XpDirectly: false;
  standalonePlayable: true;
}


// ============================================================================
// ============================================================================
// PHASE L2.2 — THE LOST LOGIC ARCHIVE (ADVENTURE CAMPAIGN ARCHITECTURE)
// ============================================================================

export type DifficultyLevel = PuzzleDifficulty;

export interface ArchiveEnvironmentalClue {
  clueId: string;
  label: string;
  clueText: string;
  unlockedByPuzzleId: string | null;
  extractedFragment: string;
}

export interface ArchiveChamberMechanism {
  mechanismId: string;
  name: string;
  dormantDescription: string;
  activeDescription: string;
  linkedChamberId: string | null;
}

export interface ArchiveChamberUnlockCondition {
  type: 'initial' | 'previous_chamber_completed' | 'min_Archive_puzzles_solved';
  requiredChamberId?: string;
  minPuzzlesSolved?: number;
  description: string;
}

export interface ArchiveChamberCompletionCondition {
  requiredPuzzleCount: number;
  description: string;
}

export interface ArchiveStoryDiscovery {
  discoveryId: string;
  archiveCode: string;
  title: string;
  inscribedBy: string;
  storyText: string;
}

export interface ArchiveChamberReward {
  rewardId: string;
  title: string;
  badgeCode: string;
  description: string;
}

export interface ArchiveChamberDefinition {
  id: string;
  chapterId: string;
  chamberIndex: number;
  title: string;
  subtitle: string;
  chamberDescription: string;
  atmosphereNote: string;
  explorationObjective: string;
  accentColor: string;
  puzzleIds: string[];
  environmentalClues: ArchiveEnvironmentalClue[];
  interconnectedMechanism: ArchiveChamberMechanism;
  unlockCondition: ArchiveChamberUnlockCondition;
  completionCondition: ArchiveChamberCompletionCondition;
  storyDiscovery: ArchiveStoryDiscovery;
  reward: ArchiveChamberReward;
}

export interface ArchiveCampaignChapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  narrativeIntro: string;
  chamberIds: string[];
}

export interface CampaignDiscoveryRecord {
  discoveryId: string;
  chamberId: string;
  unlockedAtIso: string;
}

export interface CampaignCompletionRecord {
  chamberId: string;
  completedAtIso: string;
}

export interface CampaignProgressState {
  activeChamberId: string;
  completedChamberIds: string[];
  unlockedDiscoveryIds: string[];
  unlockedRewardIds: string[];
  discoveries: CampaignDiscoveryRecord[];
  chamberCompletions: CampaignCompletionRecord[];
  updatedAtIso: string;
}

export interface EvaluatedChamberStatus {
  chamber: ArchiveChamberDefinition;
  isUnlocked: boolean;
  isCompleted: boolean;
  solvedPuzzleIds: string[];
  solvedCount: number;
  totalCount: number;
  progressPercent: number;
  unlockedClues: ArchiveEnvironmentalClue[];
  isMechanismActive: boolean;
}


export interface ActiveGameplaySessionState {
  puzzleId: string;
  category: PuzzleCategory;
  difficulty?: PuzzleDifficulty;
  mode: GameMode;
  startedAtIso?: string;
  elapsedSeconds: number;
  hintsUsed: number;
  attemptCount: number;
  selectedOptionId: string;
  interactionState?: PuzzleInteractiveState;
  lastWrongSubmissionSignature?: string | null;
  pendingResult: PuzzleResult | null;
  modeMetadata?: GameplayModeMetadata;
  updatedAtIso: string;
}

export interface PersistedAppSessionState {
  currentRoute: ScreenRoute;
  activeHubTab?: GameHubTab;
  activeCategory: PuzzleCategory;
  collectionCategory: PuzzleCategory | null;
  selectedPuzzleId: string | null;
  activeMode: GameMode;
  stageIndex: number;
  lastResult: PuzzleResult | null;
  activeGameplaySession: ActiveGameplaySessionState | null;
  quickPlayConfig?: QuickPlayConfigState;
}
