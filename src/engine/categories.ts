/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Eight Puzzle Categories Registry & Metadata
 */

import { CategoryMetadata, PuzzleCategory } from '../types/game';

export const PUZZLE_CATEGORIES_ORDER: PuzzleCategory[] = [
  'number_sequences',
  'pattern_recognition',
  'mathematical_logic',
  'visual_puzzles',
  'spatial_reasoning',
  'deduction_elimination',
  'shape_symbol',
  'memory_observation',
];

export const PUZZLE_CATEGORIES: Record<PuzzleCategory, CategoryMetadata> = {
  number_sequences: {
    id: 'number_sequences',
    indexNumber: '01',
    title: 'Number Sequences',
    shortTitle: 'Sequences',
    tagline: 'Decode recursive progressions and multi-step numerical intervals.',
    description:
      'Analyze ordered numerical progressions governed by arithmetic, geometric, alternating, or second-order difference laws to determine missing elements.',
    cognitiveFocus: 'Quantitative Induction & Recursive Rule Extraction',
    plannedMechanics: [
      'First- and second-order difference chains',
      'Interleaved dual-stream progressions',
      'Prime-offset and modular arithmetic series',
    ],
    boardLayoutType: 'sequence_strip',
    inputModeDescription: 'Linear sequence node selector with delta inspection',
    accentHex: '#06B6D4', // Electric Cyan
    secondaryHex: '#0284C7',
    polyhedronType: 'octahedron',
  },
  pattern_recognition: {
    id: 'pattern_recognition',
    indexNumber: '02',
    title: 'Pattern Recognition',
    shortTitle: 'Patterns',
    tagline: 'Identify structural invariants across evolving multi-axis matrices.',
    description:
      'Observe transformations across rows, columns, and diagonals—tracking rotation, parity, frequency, and boolean superposition across grid cells.',
    cognitiveFocus: 'Relational Mapping & Structural Invariance',
    plannedMechanics: [
      '3x3 and 4x4 relational matrix completion',
      'XOR / AND visual layer composition rules',
      'Cyclic state shifts across matrix axes',
    ],
    boardLayoutType: 'matrix_grid',
    inputModeDescription: 'Matrix cell inspection with candidate rule comparator',
    accentHex: '#3B82F6', // Electric Blue
    secondaryHex: '#2563EB',
    polyhedronType: 'icosahedron',
  },
  mathematical_logic: {
    id: 'mathematical_logic',
    indexNumber: '03',
    title: 'Mathematical Logic',
    shortTitle: 'Math Logic',
    tagline: 'Balance coupled operator networks and constraint equations.',
    description:
      'Resolve interconnected numerical node graphs where vertex values and edge operators must simultaneously satisfy system-wide conservation rules.',
    cognitiveFocus: 'Algebraic Constraint Satisfaction & Quantitative Balance',
    plannedMechanics: [
      'Balanced node-and-edge arithmetic networks',
      'Missing operator and operand synthesis',
      'Multi-constraint magic lattice balancing',
    ],
    boardLayoutType: 'equation_nodes',
    inputModeDescription: 'Node-graph operand & operator assignment',
    accentHex: '#8B5CF6', // Cosmic Violet
    secondaryHex: '#6D28D9',
    polyhedronType: 'dodecahedron',
  },
  visual_puzzles: {
    id: 'visual_puzzles',
    indexNumber: '04',
    title: 'Visual Puzzles',
    shortTitle: 'Visual',
    tagline: 'Deconstruct layered geometric projections and symmetry slices.',
    description:
      'Discern how overlapping translucent forms, reflection axes, and negative-space cutouts combine or separate to form a target figure.',
    cognitiveFocus: 'Visual-Perceptual Synthesis & Figure-Ground Separation',
    plannedMechanics: [
      'Multi-axis reflection and rotational symmetry matching',
      'Subtractive silhouette and negative-space assembly',
      'Composite geometric layer decomposition',
    ],
    boardLayoutType: 'matrix_grid',
    inputModeDescription: 'Composite visual layer selector',
    accentHex: '#10B981', // Emerald Prism
    secondaryHex: '#059669',
    polyhedronType: 'tetrahedron',
  },
  spatial_reasoning: {
    id: 'spatial_reasoning',
    indexNumber: '05',
    title: 'Spatial Reasoning',
    shortTitle: 'Spatial',
    tagline: 'Mentally rotate polyhedral assemblies and orthographic views.',
    description:
      'Manipulate three-dimensional polyhedral nets, isometric voxel structures, and multi-axis rotations to match equivalent spatial orientations.',
    cognitiveFocus: '3D Mental Rotation & Orthographic Projection',
    plannedMechanics: [
      'Polyhedral net folding and face-adjacency verification',
      'Isometric block assembly cross-section matching',
      'Multi-axis 90° quaternion rotation equivalence',
    ],
    boardLayoutType: 'spatial_lattice',
    inputModeDescription: '3D orientation & projection comparator',
    accentHex: '#F59E0B', // Solar Amber
    secondaryHex: '#D97706',
    polyhedronType: 'cuboctahedron',
  },
  deduction_elimination: {
    id: 'deduction_elimination',
    indexNumber: '06',
    title: 'Deduction and Elimination',
    shortTitle: 'Deduction',
    tagline: 'Eliminate contradictions from formal propositional clue sets.',
    description:
      'Apply strict deductive inference to a set of mutually exclusive clues, ruling out impossible states until a unique truth assignment remains.',
    cognitiveFocus: 'Formal Deductive Inference & Constraint Elimination',
    plannedMechanics: [
      'Multi-attribute constraint elimination grids',
      'Truth-value consistency verification',
      'Conditional implication chain resolution',
    ],
    boardLayoutType: 'deduction_table',
    inputModeDescription: 'State elimination toggle matrix (Confirm / Exclude)',
    accentHex: '#EC4899', // Rose Logic
    secondaryHex: '#DB2777',
    polyhedronType: 'prism',
  },
  shape_symbol: {
    id: 'shape_symbol',
    indexNumber: '07',
    title: 'Shape and Symbol Challenges',
    shortTitle: 'Symbols',
    tagline: 'Translate symbolic grammars and abstract glyph transformations.',
    description:
      'Decipher formal transformation rules acting on abstract geometric glyphs, where modifier symbols permute scale, vertex count, polarity, or order.',
    cognitiveFocus: 'Symbolic Grammar Decoding & Abstract Rule Transfer',
    plannedMechanics: [
      'Symbolic operator pipelines (invert, rotate, morph)',
      'Glyph attribute cipher substitution',
      'Concentric ring alignment encodings',
    ],
    boardLayoutType: 'symbol_rings',
    inputModeDescription: 'Glyph transformation & symbol selector',
    accentHex: '#6366F1', // Indigo Vector
    secondaryHex: '#4F46E5',
    polyhedronType: 'torus_knot',
  },
  memory_observation: {
    id: 'memory_observation',
    indexNumber: '08',
    title: 'Memory and Observation',
    shortTitle: 'Observation',
    tagline: 'Retain high-density spatial arrangements and subtle state deltas.',
    description:
      'Encode precise visual details, positional coordinates, and ordered state transitions within brief exposure windows or complex multi-element arrays.',
    cognitiveFocus: 'Working Memory Encoding & Visual Change Detection',
    plannedMechanics: [
      'Timed constellation pattern encoding & recall',
      'Subtle state-delta identification across dual boards',
      'Sequential node activation path reconstruction',
    ],
    boardLayoutType: 'observation_matrix',
    inputModeDescription: 'Recall matrix & state-delta target selector',
    accentHex: '#14B8A6', // Teal Pulse
    secondaryHex: '#0D9488',
    polyhedronType: 'bipyramid',
  },
};

export function getCategoryMetadata(category: PuzzleCategory): CategoryMetadata {
  return PUZZLE_CATEGORIES[category] ?? PUZZLE_CATEGORIES.number_sequences;
}

export function getAllCategories(): CategoryMetadata[] {
  return PUZZLE_CATEGORIES_ORDER.map((id) => PUZZLE_CATEGORIES[id]);
}
