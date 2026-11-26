/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Root Application
 * Simplified Navigation & Experience Architecture:
 * - HomeScreen (`home`): 100dvh sanctuary hub with Quick Play, Daily Challenges, Puzzle Library, Progress, and Settings
 * - QuickPlayScreen (`quick_play`): Unlimited free-play launcher with category, difficulty, and smart random or specific puzzle selection
 * - DailyChallengesScreen (`daily`): Three Daily Challenges per local calendar date (0/3 to 3/3 progress, result review, and replay protection)
 * - CollectionScreen (`collection` — Puzzle Library): Shows ONLY the 8 cognitive puzzle categories and each category's 8 puzzles
 * - GameplayScreen (`gameplay`): Shared multi-mechanic puzzle engine with Win Streak abandonment protection
 * - ResultsScreen (`results`): Mode-aware completion experience with XP breakdown, level-up celebration, and achievement notifications
 * - ProgressScreen (`progress`): Player progression, Win Streak & 8-Win Milestone tracker, Category mastery, and achievements
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { LogicQuestAtmosphere } from './components/background/LogicQuestAtmosphere';
import {
  CollectionScreen,
  DailyChallengesScreen,
  QuickPlayScreen,
} from './components/screens/CollectionScreen';
import { GameplayScreen } from './components/screens/GameplayScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ProgressScreen } from './components/screens/ProgressScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';
import { SettingsModal } from './components/screens/SettingsScreen';
import { getCategoryMetadata } from './engine/categories';
import {
  getDailyChallengeStatus,
  getDailyChallengesForDate,
  getNextUnfinishedDailyChallenge,
  resolveSequentialDailyChallenge,
} from './engine/dailyPuzzle';
import {
  getEffectiveCategoryDifficulty,
  getEffectiveGlobalDifficulty,
} from './engine/difficulty';
import {
  PUZZLE_CATALOG,
  getCatalogPuzzleById,
  selectNextLibraryCategoryPuzzle,
  selectNextQuickPlaySessionPuzzle,
} from './engine/generator';
import {
  configureNex11Launch,
  notifyNexiGameContext,
} from './engine/nex11Bridge';
import {
  applyNex11LaunchPreferencesToSettings,
  createDefaultQuickPlayConfig,
  loadAchievementsState,
  loadAppSession,
  loadCompletionRecords,
  loadDailyCompletionState,
  loadPlayerProgress,
  loadSettings,
  recordPuzzleCompletion,
  recordPuzzleFailureOrAbandonment,
  resetAllLocalGameStorage,
  resetGameplayProgressOnly,
  resetSettingsOnly,
  saveAppSession,
  saveSettings,
  setCategoryDifficultyPreference,
} from './storage/storageManager';
import {
  ActiveGameplaySessionState,
  DailyCompletionState,
  DifficultyLevel,
  DifficultyPreference,
  GameCompletionRecord,
  GameHubTab,
  GameMode,
  GameplayModeMetadata,
  GameSettings,
  PlayerGameProgress,
  PuzzleCategory,
  PuzzleResult,
  QuickPlayConfigState,
  ScreenRoute,
  UnlockedAchievementRecord,
  Nex11LaunchConfig,
} from './types/game';

export interface LogicQuestAppProps {
  launchConfig?: Nex11LaunchConfig;
}

export default function App({ launchConfig }: LogicQuestAppProps = {}) {
  // Deterministic Local-Date Three Daily Challenges
  const dailyChallenges = useMemo(
    () => getDailyChallengesForDate(new Date()),
    []
  );
  const todayDateKey = dailyChallenges[0]?.dateKey;

  // Apply optional NEX11 host launch configuration before reading initial settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (launchConfig) {
      configureNex11Launch(launchConfig);
      return applyNex11LaunchPreferencesToSettings(launchConfig);
    }
    return loadSettings();
  });
  const [progress, setProgress] = useState<PlayerGameProgress>(() =>
    loadPlayerProgress()
  );
  const [completionRecords, setCompletionRecords] = useState<
    GameCompletionRecord[]
  >(() => loadCompletionRecords().records);
  const [dailyState, setDailyState] = useState<DailyCompletionState>(() =>
    loadDailyCompletionState()
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    UnlockedAchievementRecord[]
  >(() => loadAchievementsState().unlocked);

  // 2. Navigation & Game Session State (Restored Across Browser Refreshes)
  const initialSession = useMemo(() => {
    const loaded = loadAppSession();
    // Guard against restoring a Daily Challenge session from a previous calendar day
    if (
      loaded.activeGameplaySession?.mode === 'daily' &&
      loaded.activeGameplaySession.modeMetadata?.dailyDateKey &&
      loaded.activeGameplaySession.modeMetadata.dailyDateKey !== todayDateKey
    ) {
      return {
        ...loaded,
        currentRoute: loaded.currentRoute === 'gameplay' ? 'home' : loaded.currentRoute,
        activeGameplaySession: null,
      };
    }
    return loaded;
  }, [todayDateKey]);

  const [currentRoute, setCurrentRoute] = useState<ScreenRoute>(() => {
    if (launchConfig?.initialRoute) {
      return launchConfig.initialRoute;
    }
    return initialSession.currentRoute === 'archive'
      ? 'home'
      : initialSession.currentRoute;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<PuzzleCategory>(
    () => launchConfig?.initialCategory ?? initialSession.activeCategory
  );
  const [collectionCategory, setCollectionCategory] =
    useState<PuzzleCategory | null>(
      () => launchConfig?.initialCategory ?? initialSession.collectionCategory
    );
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(
    () => initialSession.selectedPuzzleId
  );
  const [activeMode, setActiveMode] = useState<GameMode>(() =>
    initialSession.activeMode === 'archive'
      ? 'quick_play'
      : initialSession.activeMode
  );
  const [activeHubTab, setActiveHubTab] = useState<GameHubTab>(
    () => initialSession.activeHubTab ?? 'overview'
  );
  const [quickPlayConfig, setQuickPlayConfig] = useState<QuickPlayConfigState>(
    () =>
      initialSession.quickPlayConfig ??
      createDefaultQuickPlayConfig(settings.difficulty)
  );
  const [activeModeMetadata, setActiveModeMetadata] = useState<
    GameplayModeMetadata | undefined
  >(() => initialSession.activeGameplaySession?.modeMetadata);
  const [stageIndex, setStageIndex] = useState<number>(
    () => initialSession.stageIndex
  );
  const [lastResult, setLastResult] = useState<PuzzleResult | null>(
    () => initialSession.lastResult
  );
  const [activeGameplaySession, setActiveGameplaySession] =
    useState<ActiveGameplaySessionState | null>(
      () => initialSession.activeGameplaySession
    );

  // Re-sync if host dynamically updates launchConfig props
  useEffect(() => {
    if (!launchConfig) return;
    configureNex11Launch(launchConfig);
    setSettings(applyNex11LaunchPreferencesToSettings(launchConfig));
  }, [launchConfig]);

  // Notify optional Nexi companion when route, mode, or progression context changes
  useEffect(() => {
    notifyNexiGameContext({
      currentRoute,
      activeMode: currentRoute === 'gameplay' ? activeMode : undefined,
      activeCategory:
        currentRoute === 'gameplay'
          ? activeCategory
          : currentRoute === 'collection'
          ? collectionCategory
          : null,
      playerLevel: progress.level,
      currentWinStreak: progress.currentWinStreak,
    });
  }, [
    currentRoute,
    activeMode,
    activeCategory,
    collectionCategory,
    progress.level,
    progress.currentWinStreak,
  ]);

  // Persist navigation & active session state across browser refreshes
  useEffect(() => {
    saveAppSession({
      currentRoute,
      activeCategory,
      collectionCategory,
      selectedPuzzleId,
      activeMode,
      activeHubTab,
      quickPlayConfig,
      stageIndex,
      lastResult,
      activeGameplaySession,
    });
  }, [
    currentRoute,
    activeCategory,
    collectionCategory,
    selectedPuzzleId,
    activeMode,
    activeHubTab,
    quickPlayConfig,
    stageIndex,
    lastResult,
    activeGameplaySession,
  ]);

  // 3. System Theme Preference Listener
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    settings.theme === 'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : settings.theme;

  useEffect(() => {
    const rootEl = document.documentElement;
    if (resolvedTheme === 'dark') {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Sync full audio preferences (Master Mute, Master Volume, SFX toggle/volume, Music toggle/volume)
  useEffect(() => {
    soundEngine.syncPreferences({
      masterMuted: settings.masterMuted,
      masterVolume: settings.masterVolume,
      soundEffectsEnabled: settings.soundEffectsEnabled,
      sfxVolume: settings.sfxVolume,
      musicEnabled: settings.musicEnabled,
      musicVolume: settings.musicVolume,
    });
  }, [
    settings.masterMuted,
    settings.masterVolume,
    settings.soundEffectsEnabled,
    settings.sfxVolume,
    settings.musicEnabled,
    settings.musicVolume,
  ]);

  // (dailyChallenges memoized at top of component)

  const activeDailyDescriptor = useMemo(() => {
    const challengeNum = activeModeMetadata?.dailyChallengeNumber ?? 1;
    return (
      dailyChallenges.find((d) => d.challengeNumber === challengeNum) ??
      dailyChallenges[0]
    );
  }, [dailyChallenges, activeModeMetadata?.dailyChallengeNumber]);

  // Settings & Reset Handlers
  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return loadSettings();
    });
  };

  const handleUpdateCategoryDifficulty = (
    category: PuzzleCategory,
    preference: DifficultyPreference | null
  ) => {
    const updatedSettings = setCategoryDifficultyPreference(category, preference);
    setSettings(updatedSettings);
  };

  const handleUpdateQuickPlayConfig = (
    partial: Partial<QuickPlayConfigState>
  ) => {
    setQuickPlayConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleResetGameplayProgressOnly = () => {
    const fresh = resetGameplayProgressOnly();
    setSettings(fresh.settings);
    setProgress(fresh.progress);
    setCompletionRecords(fresh.records.records);
    setDailyState(fresh.daily);
    setUnlockedAchievements(fresh.achievements.unlocked);
    setQuickPlayConfig(createDefaultQuickPlayConfig(fresh.settings.difficulty));
    setActiveHubTab('overview');
    setLastResult(null);
    setActiveGameplaySession(null);
    setCurrentRoute('home');
  };

  const handleResetSettingsOnly = () => {
    const freshSettings = resetSettingsOnly();
    setSettings(freshSettings);
  };

  const handleResetAllStorage = () => {
    const fresh = resetAllLocalGameStorage();
    setSettings(fresh.settings);
    setProgress(fresh.progress);
    setCompletionRecords(fresh.records.records);
    setDailyState(fresh.daily);
    setUnlockedAchievements(fresh.achievements.unlocked);
    setQuickPlayConfig(createDefaultQuickPlayConfig(fresh.settings.difficulty));
    setActiveHubTab('overview');
    setLastResult(null);
    setActiveGameplaySession(null);
    setCurrentRoute('home');
  };

  // Start Specific Daily Challenge (#1, #2, or #3) with strict 1 -> 2 -> 3 anti-skip enforcement
  const handleStartDailyChallenge = (challengeNumber: 1 | 2 | 3 = 1) => {
    const desc = resolveSequentialDailyChallenge(
      dailyChallenges,
      dailyState,
      challengeNumber
    );
    setActiveGameplaySession(null);
    setActiveCategory(desc.category);
    setSelectedPuzzleId(desc.featuredPuzzleId);
    setActiveMode('daily');
    setActiveModeMetadata({
      dailyDateKey: desc.dateKey,
      dailyId: desc.dailyId,
      dailyChallengeNumber: desc.challengeNumber,
    });
    setStageIndex(desc.dayIndex);
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDailyCompletedResult = (challengeNumber: 1 | 2 | 3 = 3) => {
    const desc =
      dailyChallenges.find((d) => d.challengeNumber === challengeNumber) ??
      dailyChallenges[dailyChallenges.length - 1] ??
      dailyChallenges[0];
    const status = getDailyChallengeStatus(desc, dailyState);
    const rec = status.completedRecord;
    const entry =
      getCatalogPuzzleById(rec?.puzzleId ?? desc.featuredPuzzleId) ??
      PUZZLE_CATALOG[0];

    setLastResult({
      completionId: rec?.completionId ?? `daily-review-${desc.dailyId}`,
      puzzleId: entry.id,
      puzzleTitle: rec?.puzzleTitle ?? entry.title,
      category: rec?.category ?? entry.category,
      difficulty: rec?.difficulty ?? entry.difficulty,
      mode: 'daily',
      status: 'completed',
      score: rec?.score ?? 1000,
      completionTimeSeconds: rec?.completionTimeSeconds ?? 0,
      hintsUsed: rec?.hintsUsed ?? 0,
      attemptCount: 1,
      accuracyPercent: rec?.accuracyPercent ?? 100,
      xpEarned: rec?.xpEarned ?? 0,
      isNewPersonalBest: false,
      previousBestScore: null,
      isPersistedRecord: true,
      dailyAlreadyClaimed: true,
      explanation: entry.explanation,
      completedAtIso: rec?.completedAtIso ?? new Date().toISOString(),
      modeMetadata: {
        dailyDateKey: desc.dateKey,
        dailyId: rec?.dailyId ?? desc.dailyId,
        dailyChallengeNumber: desc.challengeNumber,
      },
    });
    setCurrentRoute('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Home Option 1: Immediate Random Quick Play Launch (No intermediate setup screen)
  const handleOpenQuickPlay = () => {
    const globalDiff = getEffectiveGlobalDifficulty(settings);
    const nextSelection = selectNextQuickPlaySessionPuzzle({
      categoryFilter: 'all',
      difficulty: globalDiff.effectiveDifficulty,
      difficultyPreference: globalDiff.preference,
      currentPuzzleId: selectedPuzzleId,
      sessionPlayedPuzzleIds: quickPlayConfig.sessionPlayedPuzzleIds ?? [],
      completionRecords,
      seedIndex: stageIndex + completionRecords.length + 1,
    });

    setQuickPlayConfig((prev) => ({
      ...prev,
      categoryFilter: 'all',
      difficulty: globalDiff.effectiveDifficulty,
      selectedPuzzleId: null,
      sessionPlayedPuzzleIds: nextSelection.updatedSessionPlayedIds,
      recentPuzzleIds: nextSelection.updatedSessionPlayedIds.slice(-12),
    }));

    setActiveGameplaySession(null);
    setActiveCategory(nextSelection.puzzle.category);
    setSelectedPuzzleId(nextSelection.puzzle.id);
    setActiveMode('quick_play');
    setActiveModeMetadata({
      quickPlayCategoryFilter: 'all',
    });
    setStageIndex((prev) => prev + 1);
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Quick Play Session (kept for compatibility if invoked directly)
  const handleStartQuickPlaySession = (
    category: PuzzleCategory,
    puzzleId: string,
    difficulty: DifficultyLevel,
    metadata?: GameplayModeMetadata
  ) => {
    handleUpdateSettings({ difficulty });
    setActiveGameplaySession(null);
    setActiveCategory(category);
    setSelectedPuzzleId(puzzleId);
    setActiveMode('quick_play');
    setActiveModeMetadata(metadata);
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Home Option 2: Immediate Sequential Three Daily Challenges Launch (1 -> 2 -> 3)
  const handleOpenDailyChallenges = () => {
    const nextUnfinished = getNextUnfinishedDailyChallenge(
      dailyChallenges,
      dailyState
    );
    if (nextUnfinished) {
      handleStartDailyChallenge(nextUnfinished.challengeNumber);
    } else {
      handleViewDailyCompletedResult(3);
    }
  };

  // Home Option 3: Open Simplified Puzzle Library (8 Categories)
  const handleOpenCollection = () => {
    setCollectionCategory(null);
    setCurrentRoute('collection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Home Option 4: Open Progress Screen
  const handleOpenProgress = () => {
    setCurrentRoute('progress');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Puzzle Library Puzzle
  const handleStartLibraryPuzzle = (
    category: PuzzleCategory,
    puzzleId: string
  ) => {
    setCollectionCategory(category);
    setActiveGameplaySession(null);
    setActiveCategory(category);
    setSelectedPuzzleId(puzzleId);
    setActiveMode('practice');
    setActiveModeMetadata(undefined);
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persist solved puzzle immediately on solve (idempotent by completionId)
  const handlePuzzleSolved = useCallback(
    (result: PuzzleResult) => {
      const updated = recordPuzzleCompletion(result, activeDailyDescriptor);
      setSettings(loadSettings());
      setProgress(updated.progress);
      setCompletionRecords(updated.recordsPayload.records);
      setDailyState(updated.dailyState);
      setUnlockedAchievements(updated.unlockedAchievements);
      setLastResult({ ...result });
    },
    [activeDailyDescriptor]
  );

  // Abandon active unsolved puzzle session -> reset current Win Streak & step down adaptive Regular difficulty if active
  const handleAbandonPuzzle = useCallback((puzzleId: string) => {
    const updatedProgress = recordPuzzleFailureOrAbandonment(puzzleId);
    setSettings(loadSettings());
    setProgress(updatedProgress);
  }, []);

  // Complete Puzzle -> Ensure Progress Saved & Advance Daily Sequence or Open Results
  const handleCompletePuzzle = (result: PuzzleResult) => {
    const updated = recordPuzzleCompletion(result, activeDailyDescriptor);
    setSettings(loadSettings());
    setProgress(updated.progress);
    setCompletionRecords(updated.recordsPayload.records);
    setDailyState(updated.dailyState);
    setUnlockedAchievements(updated.unlockedAchievements);
    setLastResult({ ...result });
    setActiveGameplaySession(null);

    // Daily Challenges: automatically advance Challenge 1 -> Challenge 2 -> Challenge 3
    if (result.mode === 'daily') {
      const nextUnfinished = getNextUnfinishedDailyChallenge(
        dailyChallenges,
        updated.dailyState
      );
      if (nextUnfinished) {
        handleStartDailyChallenge(nextUnfinished.challengeNumber);
        return;
      }
    }

    setCurrentRoute('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Results: Retry same puzzle cleanly from 00:00
  const handleRetryPuzzle = () => {
    setActiveGameplaySession(null);
    if (lastResult) {
      setActiveCategory(lastResult.category);
      setActiveMode(lastResult.mode);
      setSelectedPuzzleId(lastResult.puzzleId);
    }
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Results: Continue to next suitable puzzle based on active mode
  const handleContinueNext = () => {
    setActiveGameplaySession(null);
    if (lastResult) {
      if (lastResult.mode === 'daily') {
        const nextUnfinished = getNextUnfinishedDailyChallenge(
          dailyChallenges,
          dailyState
        );
        if (nextUnfinished) {
          handleStartDailyChallenge(nextUnfinished.challengeNumber);
        } else {
          setCurrentRoute('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      if (lastResult.mode === 'quick_play') {
        const latestSettings = loadSettings();
        const globalDiff = getEffectiveGlobalDifficulty(latestSettings);
        const nextSelection = selectNextQuickPlaySessionPuzzle({
          categoryFilter: 'all',
          difficulty: globalDiff.effectiveDifficulty,
          difficultyPreference: globalDiff.preference,
          currentPuzzleId: lastResult.puzzleId,
          sessionPlayedPuzzleIds: quickPlayConfig.sessionPlayedPuzzleIds ?? [
            lastResult.puzzleId,
          ],
          completionRecords,
          seedIndex: stageIndex + completionRecords.length + 1,
        });

        setQuickPlayConfig((prev) => ({
          ...prev,
          categoryFilter: 'all',
          difficulty: globalDiff.effectiveDifficulty,
          sessionPlayedPuzzleIds: nextSelection.updatedSessionPlayedIds,
          recentPuzzleIds: nextSelection.updatedSessionPlayedIds.slice(-12),
        }));
        setActiveCategory(nextSelection.puzzle.category);
        setSelectedPuzzleId(nextSelection.puzzle.id);
        setActiveMode('quick_play');
        setStageIndex((prev) => prev + 1);
        setCurrentRoute('gameplay');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Puzzle Library mode: advance to next puzzle within the category (Adaptive mixed pool in Regular, fixed pool in Easy/Hard)
      const latestSettings = loadSettings();
      const catDiffInfo = getEffectiveCategoryDifficulty(
        latestSettings,
        lastResult.category
      );
      const nextEntry = selectNextLibraryCategoryPuzzle({
        category: lastResult.category,
        difficultyPreference: catDiffInfo.preference,
        effectiveDifficulty: catDiffInfo.effectiveDifficulty,
        currentPuzzleId: lastResult.puzzleId,
        completionRecords,
      });

      setCollectionCategory(nextEntry.category);
      setActiveCategory(nextEntry.category);
      setSelectedPuzzleId(nextEntry.id);
      setActiveMode(lastResult.mode);
      setStageIndex((prev) => prev + 1);
    }
    setCurrentRoute('gameplay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to appropriate mode screen from Results or Pause
  const handleReturnToModeScreen = () => {
    setActiveGameplaySession(null);
    const modeToMap = lastResult?.mode ?? activeMode;
    if (modeToMap === 'daily' || modeToMap === 'quick_play') {
      setCurrentRoute('home');
    } else {
      setCurrentRoute('collection');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const collectionAccentHex = useMemo(() => {
    if (!collectionCategory) return null;
    return getCategoryMetadata(collectionCategory).accentHex;
  }, [collectionCategory]);

  return (
    <div
      className={`relative text-slate-900 dark:text-slate-50 transition-colors duration-200 ${
        currentRoute === 'home'
          ? 'home-route-shell h-[100dvh] max-h-[100dvh] overflow-hidden'
          : 'min-h-[100dvh]'
      }`}
    >
      {/* Layers 1 & 2: Cosmic Puzzle Sanctuary Environment */}
      <LogicQuestAtmosphere
        resolvedTheme={resolvedTheme}
        currentRoute={currentRoute}
        isSettingsOpen={isSettingsOpen}
        categoryAccentHex={collectionAccentHex}
      />

      {/* Layer 3: Existing Logic Quest Game Interface */}
      <div className="relative z-10 h-full">
        {currentRoute === 'home' && (
          <HomeScreen
            resolvedTheme={resolvedTheme}
            progress={progress}
            dailyDescriptor={dailyChallenges[0]}
            dailyState={dailyState}
            onQuickPlay={handleOpenQuickPlay}
            onDailyPuzzle={handleOpenDailyChallenges}
            onOpenCollection={handleOpenCollection}
            onOpenProgress={handleOpenProgress}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentRoute === 'quick_play' && (
          <QuickPlayScreen
            quickPlayConfig={quickPlayConfig}
            progress={progress}
            completionRecords={completionRecords}
            onUpdateQuickPlayConfig={handleUpdateQuickPlayConfig}
            onStartQuickPlaySession={handleStartQuickPlaySession}
            onOpenLibrary={handleOpenCollection}
            onBackHome={() => setCurrentRoute('home')}
          />
        )}

        {currentRoute === 'daily' && (
          <DailyChallengesScreen
            dailyChallenges={dailyChallenges}
            dailyState={dailyState}
            progress={progress}
            onStartDailyChallenge={handleStartDailyChallenge}
            onViewDailyCompletedResult={handleViewDailyCompletedResult}
            onBackHome={() => setCurrentRoute('home')}
          />
        )}

        {currentRoute === 'collection' && (
          <CollectionScreen
            selectedCategory={collectionCategory}
            settings={settings}
            progress={progress}
            completionRecords={completionRecords}
            onSelectCategory={(cat) => {
              setCollectionCategory(cat);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateCategoryDifficulty={handleUpdateCategoryDifficulty}
            onStartLibraryPuzzle={handleStartLibraryPuzzle}
            onBackHome={() => setCurrentRoute('home')}
          />
        )}

        {currentRoute === 'progress' && (
          <ProgressScreen
            progress={progress}
            completionRecords={completionRecords}
            unlockedAchievements={unlockedAchievements}
            dailyState={dailyState}
            onBackHome={() => setCurrentRoute('home')}
          />
        )}

        {currentRoute === 'gameplay' && (
          <GameplayScreen
            category={activeCategory}
            mode={activeMode}
            selectedPuzzleId={selectedPuzzleId}
            settings={settings}
            progress={progress}
            completionRecords={completionRecords}
            dailyDescriptor={activeDailyDescriptor}
            dailyState={dailyState}
            stageIndex={stageIndex}
            modeMetadata={activeModeMetadata}
            initialGameplaySession={activeGameplaySession}
            onSyncGameplaySession={setActiveGameplaySession}
            onPuzzleSolved={handlePuzzleSolved}
            onCompletePuzzle={handleCompletePuzzle}
            onAbandonPuzzle={handleAbandonPuzzle}
            onExitHome={() => {
              setActiveGameplaySession(null);
              setCurrentRoute('home');
            }}
            onExitCollection={handleReturnToModeScreen}
          />
        )}

        {currentRoute === 'results' && (
          <ResultsScreen
            lastResult={lastResult}
            progress={progress}
            completionRecords={completionRecords}
            dailyChallenges={dailyChallenges}
            dailyState={dailyState}
            onContinueNext={handleContinueNext}
            onRetryPuzzle={handleRetryPuzzle}
            onOpenModeHub={handleReturnToModeScreen}
            onReturnHome={() => setCurrentRoute('home')}
          />
        )}

        {/* Compact Settings Modal Overlay */}
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          onResetAllStorage={handleResetAllStorage}
          onResetGameplayProgressOnly={handleResetGameplayProgressOnly}
          onResetSettingsOnly={handleResetSettingsOnly}
        />
      </div>
    </div>
  );
}
