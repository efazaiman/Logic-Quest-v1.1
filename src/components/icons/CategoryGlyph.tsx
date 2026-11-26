/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Bespoke Multi-Tone Geometric SVG Iconography
 * Provides custom dimensional vector artwork for:
 * - LogicQuestEmblem (Brand mark)
 * - CategoryGlyph (All 8 cognitive puzzle categories with coordinated 3-tone palettes & depth)
 */

import React from 'react';
import { PuzzleCategory } from '../../types/game';

export interface CategoryPalette {
  primary: string;
  secondary: string;
  highlight: string;
}

export const CATEGORY_ICON_PALETTES: Record<PuzzleCategory, CategoryPalette> = {
  number_sequences: {
    primary: '#06B6D4',
    secondary: '#0284C7',
    highlight: '#67E8F9',
  },
  pattern_recognition: {
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    highlight: '#93C5FD',
  },
  mathematical_logic: {
    primary: '#8B5CF6',
    secondary: '#6D28D9',
    highlight: '#C4B5FD',
  },
  visual_puzzles: {
    primary: '#10B981',
    secondary: '#047857',
    highlight: '#6EE7B7',
  },
  spatial_reasoning: {
    primary: '#F59E0B',
    secondary: '#B45309',
    highlight: '#FDE68A',
  },
  deduction_elimination: {
    primary: '#EC4899',
    secondary: '#BE185D',
    highlight: '#F9A8D4',
  },
  shape_symbol: {
    primary: '#6366F1',
    secondary: '#4338CA',
    highlight: '#A5B4FC',
  },
  memory_observation: {
    primary: '#14B8A6',
    secondary: '#0F766E',
    highlight: '#5EEAD4',
  },
};

export function LogicQuestEmblem({
  className = 'w-7 h-7',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <polygon
        points="18,2 32,10 32,26 18,34 4,26 4,10"
        fill="#06B6D4"
        fillOpacity="0.14"
        stroke="#06B6D4"
        strokeWidth="2"
      />
      <polygon
        points="18,7 27,18 18,29 9,18"
        fill="#38BDF8"
        fillOpacity="0.22"
        stroke="#38BDF8"
        strokeWidth="1.75"
      />
      <circle cx="18" cy="18" r="3.4" fill="#67E8F9" />
      <line
        x1="18"
        y1="2"
        x2="18"
        y2="7"
        stroke="#06B6D4"
        strokeWidth="1.5"
        strokeOpacity="0.75"
      />
      <line
        x1="18"
        y1="29"
        x2="18"
        y2="34"
        stroke="#06B6D4"
        strokeWidth="1.5"
        strokeOpacity="0.75"
      />
    </svg>
  );
}

export function CategoryGlyph({
  category,
  className = 'w-6 h-6',
  accentColor,
}: {
  category: PuzzleCategory;
  className?: string;
  accentColor?: string;
}) {
  const palette =
    CATEGORY_ICON_PALETTES[category] ?? CATEGORY_ICON_PALETTES.number_sequences;
  const primary = accentColor ?? palette.primary;
  const secondary = palette.secondary;
  const highlight = palette.highlight;

  switch (category) {
    case 'number_sequences':
      // Ascending dimensional number blocks & connected progression trajectory
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Stepped ascending sequence bars with dimensional depth */}
          <rect
            x="4"
            y="19"
            width="6"
            height="9"
            rx="1.8"
            fill={secondary}
            fillOpacity="0.45"
            stroke={primary}
            strokeWidth="1.6"
          />
          <rect
            x="13"
            y="14"
            width="6"
            height="14"
            rx="1.8"
            fill={primary}
            fillOpacity="0.42"
            stroke={primary}
            strokeWidth="1.6"
          />
          <rect
            x="22"
            y="8"
            width="6"
            height="20"
            rx="1.8"
            fill={highlight}
            fillOpacity="0.45"
            stroke={highlight}
            strokeWidth="1.75"
          />
          {/* Top facet highlights on blocks */}
          <line
            x1="5.5"
            y1="21"
            x2="8.5"
            y2="21"
            stroke={highlight}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="14.5"
            y1="16"
            x2="17.5"
            y2="16"
            stroke={highlight}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="23.5"
            y1="10"
            x2="26.5"
            y2="10"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Ascending connected sequence arc & nodes */}
          <path
            d="M7 15L16 10L25 4.5"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="7"
            cy="15"
            r="2.4"
            fill={secondary}
            stroke={highlight}
            strokeWidth="1.4"
          />
          <circle
            cx="16"
            cy="10"
            r="2.4"
            fill={primary}
            stroke={highlight}
            strokeWidth="1.4"
          />
          <circle
            cx="25"
            cy="4.5"
            r="2.8"
            fill={highlight}
            stroke="#FFFFFF"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'pattern_recognition':
      // Repeating 3x3 geometric pattern matrix with illuminated motif tiles
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Row 1 */}
          <rect
            x="4"
            y="4"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={primary}
            fillOpacity="0.6"
            stroke={highlight}
            strokeWidth="1.5"
          />
          <rect
            x="12.6"
            y="4"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={secondary}
            fillOpacity="0.22"
            stroke={primary}
            strokeWidth="1.4"
          />
          <rect
            x="21.2"
            y="4"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={primary}
            fillOpacity="0.6"
            stroke={highlight}
            strokeWidth="1.5"
          />
          {/* Row 2 */}
          <rect
            x="4"
            y="12.6"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={secondary}
            fillOpacity="0.22"
            stroke={primary}
            strokeWidth="1.4"
          />
          <polygon
            points="16,12 20,16 16,20 12,16"
            fill={highlight}
            stroke="#FFFFFF"
            strokeWidth="1.4"
          />
          <rect
            x="21.2"
            y="12.6"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={secondary}
            fillOpacity="0.22"
            stroke={primary}
            strokeWidth="1.4"
          />
          {/* Row 3 */}
          <rect
            x="4"
            y="21.2"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={primary}
            fillOpacity="0.6"
            stroke={highlight}
            strokeWidth="1.5"
          />
          <rect
            x="12.6"
            y="21.2"
            width="6.8"
            height="6.8"
            rx="1.8"
            fill={secondary}
            fillOpacity="0.22"
            stroke={primary}
            strokeWidth="1.4"
          />
          {/* Target pattern completion node */}
          <circle
            cx="24.6"
            cy="24.6"
            r="3.4"
            fill={highlight}
            fillOpacity="0.35"
            stroke={highlight}
            strokeWidth="1.8"
          />
          <circle cx="24.6" cy="24.6" r="1.4" fill="#FFFFFF" />
        </svg>
      );

    case 'mathematical_logic':
      // Dimensional hexagonal mathematical puzzle object with operator & balance nodes
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Outer hexagonal crystal frame */}
          <polygon
            points="16,3 27.5,9.5 27.5,22.5 16,29 4.5,22.5 4.5,9.5"
            fill={secondary}
            fillOpacity="0.32"
            stroke={primary}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Upper facet sheen */}
          <polygon
            points="16,3 27.5,9.5 16,16 4.5,9.5"
            fill={highlight}
            fillOpacity="0.22"
          />
          {/* Inner operator core */}
          <circle
            cx="16"
            cy="16"
            r="6.8"
            fill={primary}
            fillOpacity="0.35"
            stroke={highlight}
            strokeWidth="1.6"
          />
          {/* Plus / Equation cross */}
          <path
            d="M16 12.2V19.8M12.2 16H19.8"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Connected vertex nodes */}
          <circle cx="16" cy="3.5" r="2.1" fill={highlight} />
          <circle cx="27" cy="9.8" r="2" fill={primary} />
          <circle cx="27" cy="22.2" r="2" fill={highlight} />
          <circle cx="16" cy="28.5" r="2.1" fill={primary} />
          <circle cx="5" cy="22.2" r="2" fill={highlight} />
          <circle cx="5" cy="9.8" r="2" fill={primary} />
        </svg>
      );

    case 'visual_puzzles':
      // Overlapping geometric prism shapes forming an optical intersection puzzle
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Left-shifted translucent circle */}
          <circle
            cx="12.5"
            cy="14.5"
            r="8.2"
            fill={secondary}
            fillOpacity="0.42"
            stroke={primary}
            strokeWidth="1.8"
          />
          {/* Right-shifted overlapping geometric prism triangle */}
          <polygon
            points="20,5.5 29,24.5 10.5,24.5"
            fill={primary}
            fillOpacity="0.45"
            stroke={highlight}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Highlighted optical overlap diamond */}
          <polygon
            points="16.5,11.5 20.5,16.5 16.5,21.5 12.5,16.5"
            fill={highlight}
            fillOpacity="0.85"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="16.5" cy="16.5" r="1.7" fill="#FFFFFF" />
        </svg>
      );

    case 'spatial_reasoning':
      // Dimensional 3D isometric cube with shaded facets and rotation axis
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Top illuminated facet */}
          <polygon
            points="16,4 27,10.2 16,16.4 5,10.2"
            fill={highlight}
            fillOpacity="0.62"
            stroke={highlight}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Left mid-tone facet */}
          <polygon
            points="5,10.2 16,16.4 16,28 5,21.8"
            fill={primary}
            fillOpacity="0.48"
            stroke={primary}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Right deep-shaded facet */}
          <polygon
            points="16,16.4 27,10.2 27,21.8 16,28"
            fill={secondary}
            fillOpacity="0.58"
            stroke={primary}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner isometric core vertex & spatial axis */}
          <circle
            cx="16"
            cy="16.4"
            r="2.6"
            fill="#FFFFFF"
            stroke={secondary}
            strokeWidth="1.3"
          />
          <circle cx="16" cy="4" r="1.8" fill="#FFFFFF" />
          <circle cx="5" cy="21.8" r="1.7" fill={highlight} />
          <circle cx="27" cy="21.8" r="1.7" fill={highlight} />
        </svg>
      );

    case 'deduction_elimination':
      // Connected logic node network examined through a deduction lens
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Deduction connection lines */}
          <path
            d="M9.5 11.5L18.5 9.5L15.5 18.5L9.5 11.5Z"
            fill={primary}
            fillOpacity="0.26"
            stroke={highlight}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Magnifying glass ring */}
          <circle
            cx="14.5"
            cy="14"
            r="9.5"
            fill={secondary}
            fillOpacity="0.28"
            stroke={primary}
            strokeWidth="2"
          />
          {/* Magnifying glass handle */}
          <path
            d="M21.5 21L27.5 27"
            stroke={highlight}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Three deduction nodes (Verified + Eliminated) */}
          <circle
            cx="9.5"
            cy="11.5"
            r="2.3"
            fill={primary}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
          <circle
            cx="18.5"
            cy="9.5"
            r="2.3"
            fill={secondary}
            stroke={highlight}
            strokeWidth="1.2"
          />
          <circle
            cx="15.5"
            cy="18.5"
            r="2.7"
            fill={highlight}
            stroke="#FFFFFF"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'shape_symbol':
      // Interlocking geometric symbols (ring, diamond sigil, and radiant triangle)
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Outer celestial symbol ring */}
          <circle
            cx="16"
            cy="16"
            r="11.5"
            fill={secondary}
            fillOpacity="0.28"
            stroke={primary}
            strokeWidth="1.8"
          />
          {/* Rotated geometric diamond */}
          <polygon
            points="16,4.5 27.5,16 16,27.5 4.5,16"
            fill={primary}
            fillOpacity="0.38"
            stroke={highlight}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner upward glyph triangle */}
          <polygon
            points="16,9.5 22,20 10,20"
            fill={highlight}
            fillOpacity="0.78"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16.2" r="2" fill="#FFFFFF" />
        </svg>
      );

    case 'memory_observation':
      // Observant eye with an internal memory pattern constellation
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          {/* Outer observant eye contour */}
          <path
            d="M2.8 16C5.6 9.8 10.3 6.5 16 6.5C21.7 6.5 26.4 9.8 29.2 16C26.4 22.2 21.7 25.5 16 25.5C10.3 25.5 5.6 22.2 2.8 16Z"
            fill={secondary}
            fillOpacity="0.34"
            stroke={primary}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          {/* Iris memory ring */}
          <circle
            cx="16"
            cy="16"
            r="6.2"
            fill={primary}
            fillOpacity="0.45"
            stroke={highlight}
            strokeWidth="1.7"
          />
          {/* Constellation memory nodes inside the eye */}
          <path
            d="M12.5 16L16 12.5L19.5 16L16 19.5Z"
            fill={highlight}
            fillOpacity="0.55"
            stroke="#FFFFFF"
            strokeWidth="1.3"
          />
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
          <circle cx="8.2" cy="16" r="1.5" fill={highlight} />
          <circle cx="23.8" cy="16" r="1.5" fill={highlight} />
        </svg>
      );
  }
}
