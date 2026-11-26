/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Phase L2.2 Original Adventure Experience ("THE LOST LOGIC ARCHIVE")
 * & Scalable Campaign Content Architecture
 *
 * Separates puzzle definitions from campaign chapters, chamber mechanisms,
 * environmental clues, story discoveries, and progression state.
 */

import {
  ArchiveCampaignChapter,
  ArchiveChamberDefinition,
  CampaignProgressState,
  EvaluatedChamberStatus,
  PuzzleCatalogEntry,
} from '../types/game';
import {
  getCatalogPuzzleById,
  isCatalogPuzzleSolved,
  matchesCatalogPuzzleId,
} from './generator';

export const ARCHIVE_CAMPAIGN_TITLE = 'THE LOST LOGIC ARCHIVE';
export const ARCHIVE_CAMPAIGN_SUBTITLE =
  'Restore the four dormant Sanctuary Chambers to reawaken the Prime Logic Core.';

export const ARCHIVE_CAMPAIGN_CHAPTERS: ArchiveCampaignChapter[] = [
  {
    chapterId: 'chapter_outer_sanctum',
    chapterNumber: 1,
    title: 'Act I · The Outer Resonance Sanctum',
    subtitle: 'Re-establish harmonic calibration across the numeric and optical conduits.',
    narrativeIntro:
      'Centuries of silence have left the outer rings of the Cosmic Sanctuary uncalibrated. Only by restoring the numerical axioms and aligning the prism mirrors can the inner vaults be unsealed.',
    chamberIds: ['chamber_threshold_axioms', 'chamber_prism_observatory'],
  },
  {
    chapterId: 'chapter_inner_horologium',
    chapterNumber: 2,
    title: 'Act II · The Inner Horologium Core',
    subtitle: 'Decode the ancient vault protocols and ignite the central Nexus Horologium.',
    narrativeIntro:
      'Beyond the Prism Observatory lie the sealed Deductive Vaults and the heart of the Sanctuary itself. Every solved lock feeds harmonic telemetry directly into the Prime Logic Core.',
    chamberIds: ['chamber_deductive_vaults', 'chamber_nexus_core'],
  },
];

export const ARCHIVE_CHAMBERS: ArchiveChamberDefinition[] = [
  // ==========================================================================
  // CHAMBER I — THE THRESHOLD OF AXIOMS
  // ==========================================================================
  {
    id: 'chamber_threshold_axioms',
    chapterId: 'chapter_outer_sanctum',
    chamberIndex: 1,
    title: 'Chamber I · The Threshold of Axioms',
    subtitle: 'Foundational Gate of Sequences & Harmonic Balance',
    chamberDescription:
      'Towering basalt monoliths etched with glowing copper conduits guard the outer bridge. Four harmonic resonators sit dormant along the causeway, waiting for their numerical sequences and node equations to be balanced.',
    atmosphereNote:
      'Low sub-audible chimes echo across the chasm as cyan particles drift toward the sealed archway.',
    explorationObjective:
      'Stabilize all four Axiom Resonators to power the Acoustic Bridge and unseal the Prism Observatory.',
    accentColor: '#38bdf8',
    puzzleIds: ['ns-easy-01', 'ns-easy-04', 'ml-easy-01', 'ml-normal-02'],
    environmentalClues: [
      {
        clueId: 'clue_ta_01',
        label: 'Inscribed Basalt Plinth',
        clueText:
          '"First, double the pulse and add unity (63). Second, climb the triangular steps (+2, +3, +4, +5 → 18)."',
        unlockedByPuzzleId: null,
        extractedFragment: 'AXIOM-KEY: 63 · 18',
      },
      {
        clueId: 'clue_ta_02',
        label: 'Conduit Balance Plate',
        clueText:
          'Solving the first resonator reveals an engraving: "Triad α=12 requires β=14 to reach Σ=50."',
        unlockedByPuzzleId: 'ns-easy-01',
        extractedFragment: 'NODE-β1: 14',
      },
      {
        clueId: 'clue_ta_03',
        label: 'Harmonic Lock銘 Inscription',
        clueText:
          'When the Triad node hums to life, a holographic projection ignites: "At α=7, the coupled lock αβ − (α+β) = 47 stabilizes at β=9."',
        unlockedByPuzzleId: 'ml-easy-01',
        extractedFragment: 'NODE-β2: 09',
      },
    ],
    interconnectedMechanism: {
      mechanismId: 'mech_acoustic_bridge',
      name: 'Four-Pillar Acoustic Causeway',
      dormantDescription:
        'The four frequency pillars are out of phase; the light-bridge across the abyss remains retracted.',
      activeDescription:
        'All four pillars resonate in unison at 432 Hz, extending a crystalline light-bridge to the Prism Observatory.',
      linkedChamberId: 'chamber_prism_observatory',
    },
    unlockCondition: {
      type: 'initial',
      description: 'Open upon entering the Sanctuary.',
    },
    completionCondition: {
      requiredPuzzleCount: 4,
      description: 'Solve all 4 Axiom Resonator puzzles in Chamber I.',
    },
    storyDiscovery: {
      discoveryId: 'discovery_log_01',
      archiveCode: 'ARCHIVE LOG · 01-A',
      title: 'The Architects of Equilibrium',
      inscribedBy: 'First Archivist Valeria',
      storyText:
        '"We did not build the Logic Core to hoard knowledge, but to tune the mind to structural truth. When the Great Drift began, we sealed the Archive behind four self-verifying chambers so only a seeker who could perceive invariant order would reawaken the Core."',
    },
    reward: {
      rewardId: 'reward_chamber_01',
      title: 'Crest of the First Axiom',
      badgeCode: 'CREST-I',
      description: 'Restored the Acoustic Causeway and unlocked Chamber II: The Prism Observatory.',
    },
  },

  // ==========================================================================
  // CHAMBER II — THE PRISM OBSERVATORY
  // ==========================================================================
  {
    id: 'chamber_prism_observatory',
    chapterId: 'chapter_outer_sanctum',
    chamberIndex: 2,
    title: 'Chamber II · The Prism Observatory',
    subtitle: 'Celestial Dome of Optical Matrices & Spatial Mirrors',
    chamberDescription:
      'Suspended beneath a shattered starlight dome, giant refractive lenses and floating mirror arrays split cosmic beams into geometric lattices. To focus the starlight onto the Vault Seal below, the symmetry matrices and 3D voxel collimators must be aligned.',
    atmosphereNote:
      'Prismatic violet and teal rays refract through rotating crystal rings high above the observatory floor.',
    explorationObjective:
      'Align the Cyclic Matrix, Mirror Symmetry array, Cardinality Lens, and Voxel Collimator to focus the Astral Beam.',
    accentColor: '#a855f7',
    puzzleIds: ['pr-easy-01', 'vp-easy-01', 'pr-normal-02', 'sr-normal-02'],
    environmentalClues: [
      {
        clueId: 'clue_po_01',
        label: 'Astrometric Lens Etching',
        clueText:
          '"Every Latin row of ◆, ▲, ● must complete its trinity; every mirror plane flips ◐ across the meridian into ◑."',
        unlockedByPuzzleId: null,
        extractedFragment: 'OPTIC-ALIGN: ▲ · ◑',
      },
      {
        clueId: 'clue_po_02',
        label: 'Refractive Cardinality Chart',
        clueText:
          'Focusing the primary mirror reveals a star-chart: "Column 3 carries the Circle glyph (●); Row 3 requires weight ×1 to sum to 6."',
        unlockedByPuzzleId: 'vp-easy-01',
        extractedFragment: 'LENS-RATIO: ●×1',
      },
      {
        clueId: 'clue_po_03',
        label: 'Collimator Elevation Blueprint',
        clueText:
          'The focused beam illuminates a blueprint pedestal: "Raise the 2×2 voxel collimator to Front [3, 2] and Back [2, 1] for an 8-cube focal mass."',
        unlockedByPuzzleId: 'pr-normal-02',
        extractedFragment: 'VOXEL-MASS: [3,2,2,1]=8',
      },
    ],
    interconnectedMechanism: {
      mechanismId: 'mech_astral_collimator',
      name: 'Zenith Prismatic Collimator',
      dormantDescription:
        'Starlight scatters harmlessly across misaligned mirrors, leaving the lower Vault iris cold and locked.',
      activeDescription:
        'A coherent beam of violet-cyan starlight pierces the observatory floor, melting the stasis lock on the Deductive Vaults.',
      linkedChamberId: 'chamber_deductive_vaults',
    },
    unlockCondition: {
      type: 'previous_chamber_completed',
      requiredChamberId: 'chamber_threshold_axioms',
      description: 'Complete Chamber I (The Threshold of Axioms) to extend the Acoustic Causeway.',
    },
    completionCondition: {
      requiredPuzzleCount: 4,
      description: 'Solve all 4 Optical & Spatial puzzles in Chamber II.',
    },
    storyDiscovery: {
      discoveryId: 'discovery_log_02',
      archiveCode: 'ARCHIVE LOG · 02-B',
      title: 'When the Mirrors Darkened',
      inscribedBy: 'Master Optician Kaelen',
      storyText:
        '"Number alone could not sustain the Sanctuary when the horizon fractured. We wove spatial reflection and multi-layered pattern matrices into the Observatory so that light itself would become a proof—converging only when geometry and perspective are held in balance."',
    },
    reward: {
      rewardId: 'reward_chamber_02',
      title: 'Lens of the Astral Meridian',
      badgeCode: 'CREST-II',
      description: 'Focused the Zenith Collimator and unsealed Chamber III: The Deductive Vaults.',
    },
  },

  // ==========================================================================
  // CHAMBER III — THE DEDUCTIVE VAULTS
  // ==========================================================================
  {
    id: 'chamber_deductive_vaults',
    chapterId: 'chapter_inner_horologium',
    chamberIndex: 3,
    title: 'Chamber III · The Deductive Vaults',
    subtitle: 'Subterranean Hall of Elimination Locks, Runes & Memory Scans',
    chamberDescription:
      'Rows of obsidian containment vaults line a silent subterranean gallery. Here, brute force fails: each lock demands strict logical elimination, symbolic vertex ciphers, anomaly observation, and vessel docking reconstruction.',
    atmosphereNote:
      'Amber holographic glyphs pulse along the vault doors as memory scanners sweep the corridor.',
    explorationObjective:
      'Resolve the Three Vaults matrix, decode the Vertex Cipher, isolate the Sector Anomaly, and reconstruct the Arrival Order.',
    accentColor: '#f59e0b',
    puzzleIds: ['de-easy-01', 'ss-easy-01', 'mo-easy-01', 'de-normal-02'],
    environmentalClues: [
      {
        clueId: 'clue_dv_01',
        label: 'Vault Warden Tablet',
        clueText:
          '"When Red claims Vault 1 and Blue shuns Vault 3, only the Cyan Core remains for the third containment cell."',
        unlockedByPuzzleId: null,
        extractedFragment: 'VAULT-3: CYAN',
      },
      {
        clueId: 'clue_dv_02',
        label: 'Polygon Rune Codex',
        clueText:
          'Unlocking Vault 3 reveals a cipher key: "Operator Δ(+1) elevates the 5-sided Pentagon into the 6-sided Hexagon (⬡)."',
        unlockedByPuzzleId: 'de-easy-01',
        extractedFragment: 'RUNE-Δ: ⬡-HEX',
      },
      {
        clueId: 'clue_dv_03',
        label: 'Chronicle of the Fleet',
        clueText:
          'The memory banks replay the final docking log after Sector 3 (F2—F5) is isolated: "Vega docked first, Zenith second, Orion third, and Nova fourth."',
        unlockedByPuzzleId: 'mo-easy-01',
        extractedFragment: 'FLEET: V-Z-O-N',
      },
    ],
    interconnectedMechanism: {
      mechanismId: 'mech_obsidian_seal',
      name: 'Tri-Lock Obsidian Seal',
      dormantDescription:
        'Three interlocking concentric rings block the descent to the Nexus Horologium.',
      activeDescription:
        'The three obsidian rings rotate into alignment with a thunderous boom, opening the vertical shaft to the Nexus Horologium.',
      linkedChamberId: 'chamber_nexus_core',
    },
    unlockCondition: {
      type: 'previous_chamber_completed',
      requiredChamberId: 'chamber_prism_observatory',
      description: 'Complete Chamber II (The Prism Observatory) to unseal the subterranean iris.',
    },
    completionCondition: {
      requiredPuzzleCount: 4,
      description: 'Solve all 4 Deduction, Cipher & Memory puzzles in Chamber III.',
    },
    storyDiscovery: {
      discoveryId: 'discovery_log_03',
      archiveCode: 'ARCHIVE LOG · 03-C',
      title: 'The Paradox of the False Witness',
      inscribedBy: 'Chief Logician Seraphina',
      storyText:
        '"Before sealing the inner shaft, we purged corrupted telemetry from Sector 3 and recorded the final docking order of the four ark-vessels: Vega, Zenith, Orion, Nova. Whoever descends into the Horologium must carry both memory and deduction as one instrument."',
    },
    reward: {
      rewardId: 'reward_chamber_03',
      title: 'Sigil of the Unbroken Proof',
      badgeCode: 'CREST-III',
      description: 'Aligned the Obsidian Seal and opened the descent to Chamber IV: The Nexus Horologium.',
    },
  },

  // ==========================================================================
  // CHAMBER IV — THE NEXUS HOROLOGIUM
  // ==========================================================================
  {
    id: 'chamber_nexus_core',
    chapterId: 'chapter_inner_horologium',
    chamberIndex: 4,
    title: 'Chamber IV · The Nexus Horologium',
    subtitle: 'Heart of the Living Logic Core & Master Synthesis Trials',
    chamberDescription:
      'At the center of the Cosmic Sanctuary floats the great Horologium—a gyroscopic cathedral of rotating rings surrounding the Living Logic Core. Four master-grade synthesis locks guard the final ignition sequence.',
    atmosphereNote:
      'Golden and emerald arcs of harmonic energy surge between the three orbital rings and the central crystal core.',
    explorationObjective:
      'Master the Composite Glyph Grammar, Dual-Axis Quaternion Turn, Single Truth Protocol, and Dual-Equation Reactor to awaken the Archive.',
    accentColor: '#10b981',
    puzzleIds: ['ss-hard-03', 'sr-hard-03', 'de-hard-03', 'ml-hard-08'],
    environmentalClues: [
      {
        clueId: 'clue_nh_01',
        label: 'Outer Gyroscope Engraving',
        clueText:
          '"First swap [● ◇] into [◇ ●], then invert polarity to forge the master glyph pair [◆ ○]."',
        unlockedByPuzzleId: null,
        extractedFragment: 'GLYPH-PAIR: ◆ ○',
      },
      {
        clueId: 'clue_nh_02',
        label: 'Quaternion Gimbal Calibration',
        clueText:
          'Stabilizing the outer ring reveals the gimbal vector: "Pitching North preserves West=4; rolling East crowns Face 4 at the zenith."',
        unlockedByPuzzleId: 'ss-hard-03',
        extractedFragment: 'GIMBAL-TOP: FACE-4',
      },
      {
        clueId: 'clue_nh_03',
        label: 'Core Ignition Invariant',
        clueText:
          'When Core B is isolated by the Single Truth Protocol, the final reactor equation illuminates: "α + β = 19 and α − β = 5 converge at α = 12, β = 7."',
        unlockedByPuzzleId: 'de-hard-03',
        extractedFragment: 'IGNITION: α=12 · β=7',
      },
    ],
    interconnectedMechanism: {
      mechanismId: 'mech_prime_horologium',
      name: 'Prime Logic Core Ignition Array',
      dormantDescription:
        'The three orbital rings spin at discordant speeds; the central crystal pulses faintly in standby.',
      activeDescription:
        'The entire Horologium locks into harmonic resonance! The Lost Logic Archive is fully awakened, broadcasting pure geometric light across the Sanctuary.',
      linkedChamberId: null,
    },
    unlockCondition: {
      type: 'previous_chamber_completed',
      requiredChamberId: 'chamber_deductive_vaults',
      description: 'Complete Chamber III (The Deductive Vaults) to enter the Nexus Horologium.',
    },
    completionCondition: {
      requiredPuzzleCount: 4,
      description: 'Solve all 4 Master Synthesis puzzles in Chamber IV.',
    },
    storyDiscovery: {
      discoveryId: 'discovery_log_04',
      archiveCode: 'ARCHIVE LOG · 04-OMEGA',
      title: 'Awakening of the Prime Core',
      inscribedBy: 'The Sanctuary Council',
      storyText:
        '"The four chambers are one continuous proof: Axiom, Perspective, Deduction, and Synthesis. By restoring the Horologium, you have proven that reason is not a cold machine, but a living sanctuary that endures across time."',
    },
    reward: {
      rewardId: 'reward_chamber_04',
      title: 'Crown of the Awakened Archive',
      badgeCode: 'CREST-OMEGA',
      description: 'Awakened the Nexus Horologium and completed The Lost Logic Archive campaign.',
    },
  },
];

/**
 * Creates a clean default campaign progress state.
 */
export function createDefaultCampaignProgressState(): CampaignProgressState {
  return {
    activeChamberId: ARCHIVE_CHAMBERS[0].id,
    completedChamberIds: [],
    unlockedDiscoveryIds: [],
    unlockedRewardIds: [],
    discoveries: [],
    chamberCompletions: [],
    updatedAtIso: new Date().toISOString(),
  };
}

/**
 * Returns a chamber definition by its ID.
 */
export function getChamberById(
  chamberId: string
): ArchiveChamberDefinition | undefined {
  return ARCHIVE_CHAMBERS.find((c) => c.id === chamberId);
}

/**
 * Finds the Archive Chamber that contains a given puzzle ID (supporting both catalog IDs and Daily IDs).
 */
export function getChamberForPuzzleId(
  puzzleId: string
): ArchiveChamberDefinition | undefined {
  return ARCHIVE_CHAMBERS.find((chamber) =>
    chamber.puzzleIds.some((cid) => matchesCatalogPuzzleId(puzzleId, cid))
  );
}

/**
 * Evaluates the live unlock, puzzle completion, environmental clue, and story discovery status
 * for all 4 chambers in The Lost Logic Archive based on the player's completion records.
 */
export function evaluateChamberStatuses(
  records: Array<{ puzzleId: string }>
): EvaluatedChamberStatus[] {
  const solvedCountByChamberId: Record<string, number> = {};
  const solvedPuzzleIdsByChamberId: Record<string, string[]> = {};

  for (const chamber of ARCHIVE_CHAMBERS) {
    const solvedIds = chamber.puzzleIds.filter((pid) =>
      isCatalogPuzzleSolved(pid, records)
    );
    solvedPuzzleIdsByChamberId[chamber.id] = solvedIds;
    solvedCountByChamberId[chamber.id] = solvedIds.length;
  }

  const totalSolvedAcrossArchive = Object.values(solvedCountByChamberId).reduce(
    (sum, n) => sum + n,
    0
  );

  return ARCHIVE_CHAMBERS.map((chamber) => {
    const solvedPuzzleIds = solvedPuzzleIdsByChamberId[chamber.id] ?? [];
    const solvedCount = solvedPuzzleIds.length;
    const totalCount = chamber.puzzleIds.length;
    const isCompleted =
      solvedCount >= chamber.completionCondition.requiredPuzzleCount;

    let isUnlocked = true;
    if (chamber.unlockCondition.type === 'previous_chamber_completed') {
      const reqId = chamber.unlockCondition.requiredChamberId;
      if (reqId) {
        const reqChamber = getChamberById(reqId);
        const reqSolved = solvedCountByChamberId[reqId] ?? 0;
        const reqNeeded =
          reqChamber?.completionCondition.requiredPuzzleCount ?? 4;
        isUnlocked = reqSolved >= reqNeeded;
      }
    } else if (chamber.unlockCondition.type === 'min_Archive_puzzles_solved') {
      isUnlocked =
        totalSolvedAcrossArchive >=
        (chamber.unlockCondition.minPuzzlesSolved ?? 0);
    }

    const unlockedClues = chamber.environmentalClues.filter(
      (clue) =>
        clue.unlockedByPuzzleId === null ||
        solvedPuzzleIds.includes(clue.unlockedByPuzzleId)
    );

    return {
      chamber,
      isUnlocked,
      isCompleted,
      solvedPuzzleIds,
      solvedCount,
      totalCount,
      progressPercent:
        totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0,
      unlockedClues,
      isMechanismActive: isCompleted,
    };
  });
}

/**
 * Synchronizes a persisted CampaignProgressState with the latest completion records,
 * recording newly completed chambers, story discoveries, and rewards idempotently.
 */
export function syncCampaignProgressWithRecords(
  currentState: CampaignProgressState,
  records: Array<{ puzzleId: string }>,
  timestampIso: string = new Date().toISOString()
): CampaignProgressState {
  const statuses = evaluateChamberStatuses(records);

  const completedChamberIds = [...currentState.completedChamberIds];
  const unlockedDiscoveryIds = [...currentState.unlockedDiscoveryIds];
  const unlockedRewardIds = [...currentState.unlockedRewardIds];
  const discoveries = [...currentState.discoveries];
  const chamberCompletions = [...currentState.chamberCompletions];

  for (const status of statuses) {
    if (status.isCompleted) {
      const cId = status.chamber.id;
      const dId = status.chamber.storyDiscovery.discoveryId;
      const rId = status.chamber.reward.rewardId;

      if (!completedChamberIds.includes(cId)) {
        completedChamberIds.push(cId);
      }
      if (!unlockedDiscoveryIds.includes(dId)) {
        unlockedDiscoveryIds.push(dId);
      }
      if (!unlockedRewardIds.includes(rId)) {
        unlockedRewardIds.push(rId);
      }
      if (!discoveries.some((d) => d.discoveryId === dId)) {
        discoveries.push({
          discoveryId: dId,
          chamberId: cId,
          unlockedAtIso: timestampIso,
        });
      }
      if (!chamberCompletions.some((c) => c.chamberId === cId)) {
        chamberCompletions.push({
          chamberId: cId,
          completedAtIso: timestampIso,
        });
      }
    }
  }

  // Advance activeChamberId to the first unlocked, incomplete chamber if current is completed
  let activeChamberId = currentState.activeChamberId;
  const currentActiveStatus = statuses.find(
    (s) => s.chamber.id === activeChamberId
  );
  if (
    !currentActiveStatus ||
    !currentActiveStatus.isUnlocked ||
    currentActiveStatus.isCompleted
  ) {
    const nextOpen = statuses.find((s) => s.isUnlocked && !s.isCompleted);
    if (nextOpen) {
      activeChamberId = nextOpen.chamber.id;
    } else {
      // All completed -> default to Chamber IV
      activeChamberId = ARCHIVE_CHAMBERS[ARCHIVE_CHAMBERS.length - 1].id;
    }
  }

  return {
    activeChamberId,
    completedChamberIds,
    unlockedDiscoveryIds,
    unlockedRewardIds,
    discoveries,
    chamberCompletions,
    updatedAtIso: timestampIso,
  };
}

/**
 * Returns the next recommended puzzle inside a chamber (or the first puzzle of the next unlocked chamber).
 */
export function getNextChamberPuzzle(
  chamberId: string,
  currentPuzzleId?: string,
  records: Array<{ puzzleId: string }> = []
): PuzzleCatalogEntry | undefined {
  const chamber = getChamberById(chamberId);
  if (!chamber) return undefined;

  // First try to find the next unsolved puzzle in this chamber after currentPuzzleId
  const currentIndex = currentPuzzleId
    ? chamber.puzzleIds.findIndex((pid) =>
        matchesCatalogPuzzleId(currentPuzzleId, pid)
      )
    : -1;

  for (let offset = 1; offset <= chamber.puzzleIds.length; offset++) {
    const idx = (currentIndex + offset + chamber.puzzleIds.length) % chamber.puzzleIds.length;
    const candidateId = chamber.puzzleIds[idx];
    if (!isCatalogPuzzleSolved(candidateId, records)) {
      return getCatalogPuzzleById(candidateId);
    }
  }

  // If all puzzles in this chamber are solved, check if the linked next chamber has an unsolved puzzle
  const nextChamberId = chamber.interconnectedMechanism.linkedChamberId;
  if (nextChamberId) {
    const nextChamber = getChamberById(nextChamberId);
    if (nextChamber) {
      for (const pid of nextChamber.puzzleIds) {
        if (!isCatalogPuzzleSolved(pid, records)) {
          return getCatalogPuzzleById(pid);
        }
      }
      return getCatalogPuzzleById(nextChamber.puzzleIds[0]);
    }
  }

  // Fallback to the next sequential puzzle in the current chamber
  const nextIdx = (currentIndex + 1) % chamber.puzzleIds.length;
  return getCatalogPuzzleById(chamber.puzzleIds[nextIdx]);
}
