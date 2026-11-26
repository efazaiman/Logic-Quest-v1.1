/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Responsive Full-Bleed Cosmic Sanctuary Environment
 * - Renders sharp, complete, un-blurred sanctuary environments from top edge to bottom edge
 *   across all device classes using dedicated aspect-ratio artwork sets:
 *   1. Desktop Landscape (aspect > 14/9): 16:9 Sanctuary Panorama
 *   2. Tablet Landscape (1/1 < aspect <= 14/9): 4:3 Sanctuary Composition
 *   3. Tablet Portrait (5/8 < aspect <= 1/1): 3:4 Vertical Sanctuary Composition
 *   4. Phone Portrait (aspect <= 5/8): 9:16 Tall Portrait Sanctuary Composition
 * - Preserves all environmental animations (moving clouds, island mist, rotating portal rings,
 *   ring travelers, monolith runes, levitating crystals, edge glints, reflections, light rays,
 *   and multi-tiered particles) aligned with the sanctuary architecture.
 */

import React, { memo, useEffect, useState } from 'react';
import cosmicSanctuaryDarkDesktopUrl from '../../assets/images/cosmic_sanctuary_night_depth_1794042906836.jpg';
import cosmicSanctuaryDarkTabLandUrl from '../../assets/images/cosmic_sanctuary_dark_tab_land_1794071190889.jpg';
import cosmicSanctuaryDarkTabletUrl from '../../assets/images/cosmic_sanctuary_dark_tablet_1794071158147.jpg';
import cosmicSanctuaryDarkPhoneUrl from '../../assets/images/cosmic_sanctuary_dark_phone_1794071154914.jpg';

import skySanctuaryLightDesktopUrl from '../../assets/images/sky_puzzle_sanctuary_light_1794041830227.jpg';
import skySanctuaryLightTabLandUrl from '../../assets/images/sky_sanctuary_light_tab_land_1794071191550.jpg';
import skySanctuaryLightTabletUrl from '../../assets/images/sky_sanctuary_light_tablet_1794071158576.jpg';
import skySanctuaryLightPhoneUrl from '../../assets/images/sky_sanctuary_light_phone_1794071156540.jpg';
import { ScreenRoute } from '../../types/game';

export interface LogicQuestAtmosphereProps {
  resolvedTheme: 'dark' | 'light';
  currentRoute: ScreenRoute;
  isSettingsOpen?: boolean;
  categoryAccentHex?: string | null;
}

// Tier 1: Tiny atmospheric dust specks (varied sizes, speeds, delays)
const ATMOSPHERIC_DUST = [
  { left: '10%', top: '24%', size: 1.8, delay: '-2s', duration: '24s' },
  { left: '18%', top: '52%', size: 1.5, delay: '-9s', duration: '28s' },
  { left: '26%', top: '74%', size: 2.0, delay: '-14s', duration: '22s' },
  { left: '34%', top: '32%', size: 1.6, delay: '-5s', duration: '26s' },
  { left: '66%', top: '30%', size: 1.7, delay: '-11s', duration: '25s' },
  { left: '74%', top: '72%', size: 2.1, delay: '-4s', duration: '23s' },
  { left: '83%', top: '48%', size: 1.6, delay: '-16s', duration: '29s' },
  { left: '90%', top: '26%', size: 1.9, delay: '-7s', duration: '21s' },
];

// Tier 2: Small glowing magical particles drifting upward
const ENCHANTED_MOTES = [
  { left: '8%', top: '76%', size: 3.6, delay: '0s', duration: '16s' },
  { left: '15%', top: '58%', size: 4.4, delay: '-4.2s', duration: '21s' },
  { left: '23%', top: '40%', size: 3.0, delay: '-9.1s', duration: '18s' },
  { left: '31%', top: '68%', size: 2.8, delay: '-12.4s', duration: '23s' },
  { left: '69%', top: '66%', size: 3.1, delay: '-6.3s', duration: '20s' },
  { left: '77%', top: '42%', size: 3.6, delay: '-11.2s', duration: '17s' },
  { left: '85%', top: '60%', size: 4.5, delay: '-3.4s', duration: '22s' },
  { left: '92%', top: '78%', size: 3.2, delay: '-15.1s', duration: '19s' },
  { left: '12%', top: '24%', size: 2.7, delay: '-7.5s', duration: '24s' },
  { left: '88%', top: '22%', size: 3.0, delay: '-10.3s', duration: '20s' },
];

// Tier 3: Occasional brighter crystal & portal sparkles (mounted in vector stage so they stay aligned with crystals)
const SCENIC_CRYSTAL_SPARKLES = [
  { left: '14.8%', top: '46.5%', delay: '-1.1s', duration: '6.8s' },
  { left: '7.5%', top: '76%', delay: '-3.9s', duration: '7.5s' },
  { left: '22.2%', top: '26%', delay: '-2.5s', duration: '8.4s' },
  { left: '77.8%', top: '27%', delay: '-4.7s', duration: '7.9s' },
  { left: '85.2%', top: '47%', delay: '-1.9s', duration: '6.6s' },
  { left: '92.5%', top: '75.5%', delay: '-5.4s', duration: '8.1s' },
];

export const LogicQuestAtmosphere: React.FC<LogicQuestAtmosphereProps> = memo(
  ({
    resolvedTheme,
    currentRoute,
    isSettingsOpen = false,
    categoryAccentHex = null,
  }) => {
    const isDark = resolvedTheme === 'dark';
    const [darkImgError, setDarkImgError] = useState(false);
    const [lightImgError, setLightImgError] = useState(false);
    const [isPageHidden, setIsPageHidden] = useState(false);

    useEffect(() => {
      const handleVisibilityChange = () => {
        setIsPageHidden(document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    // Screen-specific world scene visibility
    const worldSceneClass = (() => {
      if (isSettingsOpen) {
        return isDark
          ? 'opacity-55 scale-[1.01]'
          : 'opacity-50 scale-[1.01]';
      }
      switch (currentRoute) {
        case 'home':
          return isDark
            ? 'opacity-100 scale-100'
            : 'opacity-94 scale-100';
        case 'gameplay':
          return isDark
            ? 'opacity-78 scale-[1.01]'
            : 'opacity-76 scale-[1.01]';
        case 'collection':
          return isDark
            ? 'opacity-84 scale-[1.01]'
            : 'opacity-80 scale-[1.01]';
        case 'progress':
          return isDark
            ? 'opacity-86 scale-[1.01]'
            : 'opacity-82 scale-[1.01]';
        case 'results':
          return isDark
            ? 'opacity-88 scale-[1.01]'
            : 'opacity-86 scale-[1.01]';
        default:
          return 'opacity-82 scale-100';
      }
    })();

    const vectorArchitectureOpacityClass = (() => {
      if (isSettingsOpen) return 'opacity-45';
      switch (currentRoute) {
        case 'home':
          return 'opacity-100';
        case 'gameplay':
          return 'opacity-68';
        case 'collection':
          return 'opacity-84';
        case 'progress':
          return 'opacity-88';
        case 'results':
          return 'opacity-92';
        default:
          return 'opacity-80';
      }
    })();

    const particleOpacityClass = (() => {
      if (isSettingsOpen) return 'opacity-20';
      switch (currentRoute) {
        case 'home':
          return 'opacity-95';
        case 'gameplay':
          return 'opacity-35';
        case 'results':
          return 'opacity-100';
        case 'progress':
          return 'opacity-85';
        default:
          return 'opacity-68';
      }
    })();

    return (
      <div
        className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 transition-colors duration-300 ${
          isDark ? 'logic-quest-dark-atmosphere' : 'logic-quest-light-atmosphere'
        } ${isPageHidden ? 'sanctuary-paused' : ''}`}
        aria-hidden="true"
      >
        {/* =====================================================================
            LAYER 1 — SHARP FULL-BLEED RESPONSIVE SANCTUARY WORLD ARTWORK
           ===================================================================== */}
        <div
          className={`absolute inset-0 transition-all duration-700 ease-out ${worldSceneClass}`}
        >
          {/* 1A. Full-Viewport Sharp Responsive Sanctuary Artwork (Zero Blur, Dedicated Aspect Ratios) */}
          <div className="sanctuary-artwork-frame">
            {!darkImgError && (
              <picture
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                  isDark ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <source
                  media="(max-aspect-ratio: 5/8)"
                  srcSet={cosmicSanctuaryDarkPhoneUrl}
                />
                <source
                  media="(max-aspect-ratio: 1/1)"
                  srcSet={cosmicSanctuaryDarkTabletUrl}
                />
                <source
                  media="(max-aspect-ratio: 14/9)"
                  srcSet={cosmicSanctuaryDarkTabLandUrl}
                />
                <img
                  src={cosmicSanctuaryDarkDesktopUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setDarkImgError(true)}
                  className="w-full h-full object-cover object-center"
                />
              </picture>
            )}

            {!lightImgError && (
              <picture
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                  !isDark ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <source
                  media="(max-aspect-ratio: 5/8)"
                  srcSet={skySanctuaryLightPhoneUrl}
                />
                <source
                  media="(max-aspect-ratio: 1/1)"
                  srcSet={skySanctuaryLightTabletUrl}
                />
                <source
                  media="(max-aspect-ratio: 14/9)"
                  srcSet={skySanctuaryLightTabLandUrl}
                />
                <img
                  src={skySanctuaryLightDesktopUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setLightImgError(true)}
                  className="w-full h-full object-cover object-center"
                />
              </picture>
            )}
          </div>

          {/* 1B. Sanctuary-Aligned Vector & Crystal Animation Stage */}
          <div className="sanctuary-vector-stage">
            {/* Island-Hugging Mist Tendrils (Locked to Left & Right Sanctuary Islands) */}
            <div
              className={`sanctuary-island-mist-left absolute left-[-4%] top-[48%] w-[46%] h-[34%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_55%_45%_at_38%_52%,rgba(34,211,238,0.18)_0%,rgba(14,35,90,0.20)_48%,transparent_78%)]'
                  : 'bg-[radial-gradient(ellipse_55%_45%_at_38%_52%,rgba(255,255,255,0.64)_0%,rgba(186,230,253,0.32)_50%,transparent_80%)]'
              }`}
            />
            <div
              className={`sanctuary-island-mist-right absolute right-[-4%] top-[48%] w-[46%] h-[34%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_55%_45%_at_62%_52%,rgba(34,211,238,0.18)_0%,rgba(14,35,90,0.20)_48%,transparent_78%)]'
                  : 'bg-[radial-gradient(ellipse_55%_45%_at_62%_52%,rgba(255,255,255,0.64)_0%,rgba(186,230,253,0.32)_50%,transparent_80%)]'
              }`}
            />

            {/* Scenic-Aligned SVG Sanctuary Scenery (1600×900 Aligned to Sanctuary Architecture) */}
            <svg
              viewBox="0 0 1600 900"
              preserveAspectRatio="xMidYMid slice"
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${vectorArchitectureOpacityClass}`}
            >
              <defs>
                {/* Far Distance Silhouette Gradient */}
                <linearGradient id="lq-far-silhouette" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#0e235a' : '#bae6fd'}
                    stopOpacity={isDark ? '0.54' : '0.42'}
                  />
                  <stop
                    offset="70%"
                    stopColor={isDark ? '#091b48' : '#7dd3fc'}
                    stopOpacity={isDark ? '0.34' : '0.24'}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? '#020512' : '#e0f2fe'}
                    stopOpacity="0"
                  />
                </linearGradient>

                {/* Middle Distance 3D Lit Monolith Face */}
                <linearGradient id="lq-arch-lit-face" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#153478' : '#ffffff'}
                    stopOpacity={isDark ? '0.74' : '0.66'}
                  />
                  <stop
                    offset="55%"
                    stopColor={isDark ? '#091b48' : '#e0f2fe'}
                    stopOpacity={isDark ? '0.55' : '0.46'}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? '#05112e' : '#7dd3fc'}
                    stopOpacity="0.1"
                  />
                </linearGradient>

                {/* Middle Distance 3D Shadow Monolith Face */}
                <linearGradient id="lq-arch-shadow-face" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#091b48' : '#bae6fd'}
                    stopOpacity={isDark ? '0.78' : '0.54'}
                  />
                  <stop
                    offset="70%"
                    stopColor={isDark ? '#05112e' : '#7dd3fc'}
                    stopOpacity={isDark ? '0.58' : '0.36'}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? '#020512' : '#38bdf8'}
                    stopOpacity="0.1"
                  />
                </linearGradient>

                {/* Glowing Cyan Crystal Gradient */}
                <linearGradient id="lq-crystal-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#a5f3fc' : '#67e8f9'}
                    stopOpacity={isDark ? '0.94' : '0.76'}
                  />
                  <stop
                    offset="48%"
                    stopColor="#06b6d4"
                    stopOpacity={isDark ? '0.68' : '0.52'}
                  />
                  <stop
                    offset="100%"
                    stopColor="#0284c7"
                    stopOpacity="0.26"
                  />
                </linearGradient>

                {/* Soft Radial Crystal Internal Halo */}
                <radialGradient id="lq-crystal-halo" cx="50%" cy="50%" r="50%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#22d3ee' : '#38bdf8'}
                    stopOpacity={isDark ? '0.52' : '0.38'}
                  />
                  <stop
                    offset="55%"
                    stopColor="#06b6d4"
                    stopOpacity={isDark ? '0.18' : '0.12'}
                  />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>

                {/* Subtle Cyan Reflection Cast onto Nearby Architecture */}
                <linearGradient id="lq-crystal-reflection" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#22d3ee' : '#38bdf8'}
                    stopOpacity={isDark ? '0.45' : '0.32'}
                  />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>

                {/* Illuminated Sanctuary Ring Stroke */}
                <linearGradient id="lq-halo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#22d3ee' : '#0284c7'}
                    stopOpacity={isDark ? '0.72' : '0.48'}
                  />
                  <stop
                    offset="55%"
                    stopColor={isDark ? '#0284c7' : '#06b6d4'}
                    stopOpacity={isDark ? '0.36' : '0.24'}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? '#4338ca' : '#ffffff'}
                    stopOpacity="0.06"
                  />
                </linearGradient>

                {/* Volumetric Horizon Light Rays */}
                <linearGradient id="lq-horizon-beam" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop
                    offset="0%"
                    stopColor={isDark ? '#22d3ee' : '#ffffff'}
                    stopOpacity={isDark ? '0.26' : '0.34'}
                  />
                  <stop
                    offset="55%"
                    stopColor={isDark ? '#0284c7' : '#7dd3fc'}
                    stopOpacity={isDark ? '0.10' : '0.12'}
                  />
                  <stop offset="100%" stopColor="#020512" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* DISTANCE 1: FAR BACKGROUND (Volumetric Rays & Horizon Citadels) */}
              <g opacity={isDark ? '0.76' : '0.50'}>
                <polygon
                  points="520,660 350,120 465,120 605,660"
                  fill="url(#lq-horizon-beam)"
                  className="sanctuary-ray-shimmer-1"
                />
                <polygon
                  points="800,660 735,95 865,95 800,660"
                  fill="url(#lq-horizon-beam)"
                  className="sanctuary-ray-shimmer-2"
                />
                <polygon
                  points="1080,660 1135,120 1250,120 995,660"
                  fill="url(#lq-horizon-beam)"
                  className="sanctuary-ray-shimmer-1"
                />

                {/* Distant Floating Citadels with Very Subtle Parallax */}
                <g className="sanctuary-distant-parallax">
                  <polygon
                    points="465,590 465,445 486,418 508,445 508,590"
                    fill="url(#lq-far-silhouette)"
                  />
                  <polygon
                    points="520,610 520,495 538,476 556,495 556,610"
                    fill="url(#lq-far-silhouette)"
                  />
                  <polygon
                    points="580,535 642,520 695,535 655,568 638,615 618,568"
                    fill="url(#lq-far-silhouette)"
                  />
                  <polygon
                    points="905,540 962,525 1020,540 982,572 962,622 940,572"
                    fill="url(#lq-far-silhouette)"
                  />
                  <polygon
                    points="1044,610 1044,492 1062,472 1080,492 1080,610"
                    fill="url(#lq-far-silhouette)"
                  />
                  <polygon
                    points="1092,590 1092,440 1114,412 1135,440 1135,590"
                    fill="url(#lq-far-silhouette)"
                  />
                  {/* Distant Artwork Crystal Cluster Glows (Staggered Timing) */}
                  <circle
                    cx="486"
                    cy="432"
                    r="22"
                    fill="url(#lq-crystal-halo)"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '7.4s', animationDelay: '-2.1s' }}
                  />
                  <circle
                    cx="1114"
                    cy="428"
                    r="22"
                    fill="url(#lq-crystal-halo)"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '8.1s', animationDelay: '-5.3s' }}
                  />
                </g>
              </g>

              {/* DISTANCE 2: MIDDLE DISTANCE (Portals, Ring Travelers & Monuments) */}
              <g>
                {/* Giant Left Incomplete Illuminated Sanctuary Ring */}
                <circle
                  cx="265"
                  cy="390"
                  r="245"
                  fill="none"
                  stroke="url(#lq-halo-ring)"
                  strokeWidth={isDark ? '2.6' : '2.0'}
                  strokeDasharray="460 220 110 180"
                />
                <circle
                  cx="265"
                  cy="390"
                  r="230"
                  fill="none"
                  stroke={isDark ? '#22d3ee' : '#0284c7'}
                  strokeOpacity={isDark ? '0.35' : '0.24'}
                  strokeWidth="1.1"
                  strokeDasharray="280 160 120 220"
                />

                {/* Slowly Rotating Inner Celestial Portal & Glowing Ring Traveler (Left) */}
                <g
                  className="sanctuary-portal-spin"
                  style={{ transformOrigin: '265px 390px' }}
                >
                  <circle
                    cx="265"
                    cy="390"
                    r="198"
                    fill="none"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.24' : '0.18'}
                    strokeWidth="1"
                    strokeDasharray="18 28 6 28"
                  />
                </g>
                <circle
                  cx="265"
                  cy="390"
                  r="245"
                  fill="none"
                  stroke={isDark ? '#67e8f9' : '#0284c7'}
                  strokeOpacity={isDark ? '0.84' : '0.52'}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray="26 1514"
                  className="sanctuary-ring-traveler"
                />

                {/* Giant Right Incomplete Illuminated Sanctuary Ring */}
                <circle
                  cx="1335"
                  cy="390"
                  r="245"
                  fill="none"
                  stroke="url(#lq-halo-ring)"
                  strokeWidth={isDark ? '2.6' : '2.0'}
                  strokeDasharray="160 210 470 160"
                />
                <circle
                  cx="1335"
                  cy="390"
                  r="230"
                  fill="none"
                  stroke={isDark ? '#22d3ee' : '#0284c7'}
                  strokeOpacity={isDark ? '0.35' : '0.24'}
                  strokeWidth="1.1"
                  strokeDasharray="210 150 310 190"
                />

                {/* Slowly Rotating Inner Celestial Portal & Glowing Ring Traveler (Right) */}
                <g
                  className="sanctuary-portal-spin-reverse"
                  style={{ transformOrigin: '1335px 390px' }}
                >
                  <circle
                    cx="1335"
                    cy="390"
                    r="198"
                    fill="none"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.24' : '0.18'}
                    strokeWidth="1"
                    strokeDasharray="18 28 6 28"
                  />
                </g>
                <circle
                  cx="1335"
                  cy="390"
                  r="245"
                  fill="none"
                  stroke={isDark ? '#67e8f9' : '#0284c7'}
                  strokeOpacity={isDark ? '0.84' : '0.52'}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray="26 1514"
                  className="sanctuary-ring-traveler-reverse"
                />

                {/* Luminous Magical Energy Streams Connecting Flanking Sanctuary to Horizon */}
                <g opacity={isDark ? '0.60' : '0.36'}>
                  <path
                    d="M 255 585 Q 460 540 660 568"
                    fill="none"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeDasharray="18 140"
                    className="sanctuary-energy-stream"
                  />
                  <path
                    d="M 1345 585 Q 1140 540 940 568"
                    fill="none"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeDasharray="18 140"
                    className="sanctuary-energy-stream"
                  />
                </g>

                {/* Mid-Distance Left Floating Monolith, Glowing Runes, Crystal & Stepped Platform */}
                <g className="sanctuary-float-slow">
                  <polygon
                    points="195,180 238,155 238,350 195,372"
                    fill="url(#lq-arch-shadow-face)"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.42' : '0.30'}
                    strokeWidth="1"
                  />
                  <polygon
                    points="238,155 276,178 276,372 238,350"
                    fill="url(#lq-arch-lit-face)"
                    stroke={isDark ? '#38bdf8' : '#0284c7'}
                    strokeOpacity={isDark ? '0.52' : '0.38'}
                    strokeWidth="1.1"
                  />
                  {/* Subtle Crystal Glow Reflection on Lower Monolith Face */}
                  <polygon
                    points="238,290 276,305 276,372 238,350"
                    fill="url(#lq-crystal-reflection)"
                    className="sanctuary-arch-reflection"
                    style={{ animationDuration: '5.6s', animationDelay: '-0.8s' }}
                  />

                  {/* Etched Geometric Sanctuary Runes on Left Monolith */}
                  <g
                    className="sanctuary-rune-pulse"
                    stroke={isDark ? '#67e8f9' : '#0284c7'}
                    strokeOpacity={isDark ? '0.9' : '0.55'}
                    strokeWidth="1.1"
                    fill="none"
                  >
                    <polygon points="256,205 266,220 256,235 246,220" />
                    <line x1="256" y1="235" x2="256" y2="295" />
                    <circle cx="256" cy="265" r="5" />
                    <line x1="248" y1="282" x2="264" y2="282" />
                  </g>

                  {/* Independently Levitating Left Suspended Crystal + Internal Halo + Edge Glint + Orbit Trail */}
                  <g className="sanctuary-crystal-levitate-a">
                    <circle
                      cx="238"
                      cy="428"
                      r="54"
                      fill="url(#lq-crystal-halo)"
                      className="sanctuary-crystal-pulse"
                      style={{ animationDuration: '5.6s', animationDelay: '-0.8s' }}
                    />
                    <polygon
                      points="238,385 254,418 238,470 222,418"
                      fill="url(#lq-crystal-glow)"
                      stroke={isDark ? '#a5f3fc' : '#0284c7'}
                      strokeOpacity="0.82"
                      strokeWidth="1.1"
                      className="sanctuary-crystal-pulse"
                      style={{ animationDuration: '5.6s', animationDelay: '-0.8s' }}
                    />
                    <line
                      x1="238"
                      y1="385"
                      x2="238"
                      y2="470"
                      stroke="#ffffff"
                      strokeOpacity="0.55"
                      strokeWidth="1"
                    />
                    <polyline
                      points="238,385 254,418 238,470"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="sanctuary-crystal-glint"
                      style={{ animationDuration: '6.4s', animationDelay: '-1.5s' }}
                    />
                    <ellipse
                      cx="238"
                      cy="428"
                      rx="34"
                      ry="14"
                      fill="none"
                      stroke={isDark ? '#a5f3fc' : '#0284c7'}
                      strokeOpacity={isDark ? '0.78' : '0.50'}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeDasharray="16 204"
                      transform="rotate(-18 238 428)"
                      className="sanctuary-structure-orbit"
                    />
                  </g>

                  {/* Mid-Distance Left Floating Terrace + Subtle Crystal Reflection */}
                  <polygon
                    points="135,585 255,552 375,588 255,622"
                    fill="url(#lq-arch-lit-face)"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.48' : '0.36'}
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="185,572 255,552 315,570 255,592"
                    fill="url(#lq-crystal-reflection)"
                    className="sanctuary-arch-reflection"
                    style={{ animationDuration: '5.6s', animationDelay: '-0.8s' }}
                  />
                  <polygon
                    points="185,602 255,622 255,745 215,710"
                    fill="url(#lq-arch-shadow-face)"
                  />
                  <polygon
                    points="255,622 325,602 292,712 255,745"
                    fill="url(#lq-arch-lit-face)"
                  />
                </g>

                {/* Mid-Distance Right Floating Monolith, Glowing Runes, Crystal & Stepped Platform */}
                <g className="sanctuary-float-reverse">
                  <polygon
                    points="1324,178 1362,155 1362,350 1324,372"
                    fill="url(#lq-arch-lit-face)"
                    stroke={isDark ? '#38bdf8' : '#0284c7'}
                    strokeOpacity={isDark ? '0.52' : '0.38'}
                    strokeWidth="1.1"
                  />
                  <polygon
                    points="1362,155 1405,180 1405,372 1362,350"
                    fill="url(#lq-arch-shadow-face)"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.42' : '0.30'}
                    strokeWidth="1"
                  />
                  <polygon
                    points="1324,305 1362,290 1362,350 1324,372"
                    fill="url(#lq-crystal-reflection)"
                    className="sanctuary-arch-reflection"
                    style={{ animationDuration: '6.8s', animationDelay: '-3.4s' }}
                  />

                  {/* Etched Geometric Sanctuary Runes on Right Monolith */}
                  <g
                    className="sanctuary-rune-pulse"
                    stroke={isDark ? '#67e8f9' : '#0284c7'}
                    strokeOpacity={isDark ? '0.9' : '0.55'}
                    strokeWidth="1.1"
                    fill="none"
                    style={{ animationDelay: '-2.6s' }}
                  >
                    <polygon points="1344,205 1354,220 1344,235 1334,220" />
                    <line x1="1344" y1="235" x2="1344" y2="295" />
                    <circle cx="1344" cy="265" r="5" />
                    <line x1="1336" y1="282" x2="1352" y2="282" />
                  </g>

                  {/* Independently Levitating Right Suspended Crystal + Internal Halo + Edge Glint + Orbit Trail */}
                  <g className="sanctuary-crystal-levitate-b">
                    <circle
                      cx="1362"
                      cy="428"
                      r="54"
                      fill="url(#lq-crystal-halo)"
                      className="sanctuary-crystal-pulse"
                      style={{ animationDuration: '6.8s', animationDelay: '-3.4s' }}
                    />
                    <polygon
                      points="1362,385 1378,418 1362,470 1346,418"
                      fill="url(#lq-crystal-glow)"
                      stroke={isDark ? '#a5f3fc' : '#0284c7'}
                      strokeOpacity="0.82"
                      strokeWidth="1.1"
                      className="sanctuary-crystal-pulse"
                      style={{ animationDuration: '6.8s', animationDelay: '-3.4s' }}
                    />
                    <line
                      x1="1362"
                      y1="385"
                      x2="1362"
                      y2="470"
                      stroke="#ffffff"
                      strokeOpacity="0.55"
                      strokeWidth="1"
                    />
                    <polyline
                      points="1362,385 1346,418 1362,470"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="sanctuary-crystal-glint"
                      style={{ animationDuration: '7.6s', animationDelay: '-4.2s' }}
                    />
                    <ellipse
                      cx="1362"
                      cy="428"
                      rx="34"
                      ry="14"
                      fill="none"
                      stroke={isDark ? '#a5f3fc' : '#0284c7'}
                      strokeOpacity={isDark ? '0.78' : '0.50'}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeDasharray="16 204"
                      transform="rotate(18 1362 428)"
                      className="sanctuary-structure-orbit"
                      style={{ animationDelay: '-5.5s' }}
                    />
                  </g>

                  {/* Mid-Distance Right Floating Terrace + Subtle Crystal Reflection */}
                  <polygon
                    points="1225,588 1345,552 1465,585 1345,622"
                    fill="url(#lq-arch-lit-face)"
                    stroke={isDark ? '#22d3ee' : '#0284c7'}
                    strokeOpacity={isDark ? '0.48' : '0.36'}
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="1285,570 1345,552 1415,572 1345,592"
                    fill="url(#lq-crystal-reflection)"
                    className="sanctuary-arch-reflection"
                    style={{ animationDuration: '6.8s', animationDelay: '-3.4s' }}
                  />
                  <polygon
                    points="1275,602 1345,622 1345,745 1308,712"
                    fill="url(#lq-arch-lit-face)"
                  />
                  <polygon
                    points="1345,622 1415,602 1385,710 1345,745"
                    fill="url(#lq-arch-shadow-face)"
                  />
                </g>
              </g>

              {/* DISTANCE 3: NEAR DECORATIVE LAYER (Stationary Towers & Foreground Crystals) */}
              <g opacity={isDark ? '0.88' : '0.74'}>
                {/* Near Left Edge Stationary Sanctuary Tower & Glowing Cyan Conduit */}
                <polygon
                  points="18,40 72,18 72,310 18,335"
                  fill="url(#lq-arch-shadow-face)"
                  stroke={isDark ? '#22d3ee' : '#0284c7'}
                  strokeOpacity="0.38"
                  strokeWidth="1"
                />
                <polygon
                  points="72,18 114,42 114,335 72,310"
                  fill="url(#lq-arch-lit-face)"
                  stroke={isDark ? '#38bdf8' : '#0284c7'}
                  strokeOpacity="0.48"
                  strokeWidth="1.2"
                />
                <line
                  x1="93"
                  y1="58"
                  x2="93"
                  y2="292"
                  stroke={isDark ? '#22d3ee' : '#06b6d4'}
                  strokeOpacity="0.78"
                  strokeWidth="2.2"
                  className="sanctuary-rune-pulse"
                />

                {/* Near Bottom-Left Foreground Crystal Formation */}
                <g>
                  <circle
                    cx="132"
                    cy="738"
                    r="68"
                    fill="url(#lq-crystal-halo)"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '7.2s', animationDelay: '-1.9s' }}
                  />
                  <polygon
                    points="124,655 154,725 134,825 100,735"
                    fill="url(#lq-crystal-glow)"
                    stroke={isDark ? '#a5f3fc' : '#0284c7'}
                    strokeOpacity="0.76"
                    strokeWidth="1.2"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '7.2s', animationDelay: '-1.9s' }}
                  />
                  <polyline
                    points="124,655 154,725 134,825"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="sanctuary-crystal-glint"
                    style={{ animationDuration: '8.2s', animationDelay: '-2.8s' }}
                  />
                </g>

                {/* Near Right Edge Stationary Sanctuary Tower & Glowing Cyan Conduit */}
                <polygon
                  points="1486,42 1528,18 1528,310 1486,335"
                  fill="url(#lq-arch-lit-face)"
                  stroke={isDark ? '#38bdf8' : '#0284c7'}
                  strokeOpacity="0.48"
                  strokeWidth="1.2"
                />
                <polygon
                  points="1528,18 1582,40 1582,335 1528,310"
                  fill="url(#lq-arch-shadow-face)"
                  stroke={isDark ? '#22d3ee' : '#0284c7'}
                  strokeOpacity="0.38"
                  strokeWidth="1"
                />
                <line
                  x1="1507"
                  y1="58"
                  x2="1507"
                  y2="292"
                  stroke={isDark ? '#22d3ee' : '#06b6d4'}
                  strokeOpacity="0.78"
                  strokeWidth="2.2"
                  className="sanctuary-rune-pulse"
                  style={{ animationDelay: '-1.8s' }}
                />

                {/* Near Bottom-Right Foreground Crystal Formation */}
                <g>
                  <circle
                    cx="1468"
                    cy="738"
                    r="68"
                    fill="url(#lq-crystal-halo)"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '6.3s', animationDelay: '-4.6s' }}
                  />
                  <polygon
                    points="1476,655 1500,735 1466,825 1446,725"
                    fill="url(#lq-crystal-glow)"
                    stroke={isDark ? '#a5f3fc' : '#0284c7'}
                    strokeOpacity="0.76"
                    strokeWidth="1.2"
                    className="sanctuary-crystal-pulse"
                    style={{ animationDuration: '6.3s', animationDelay: '-4.6s' }}
                  />
                  <polyline
                    points="1476,655 1446,725 1466,825"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="sanctuary-crystal-glint"
                    style={{ animationDuration: '7.1s', animationDelay: '-5.4s' }}
                  />
                </g>
              </g>
            </svg>

            {/* Crystal & Portal Sparkles (Mounted Inside Scenic Stage so Coordinates Stay Aligned) */}
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${particleOpacityClass}`}
            >
              {SCENIC_CRYSTAL_SPARKLES.map((s, idx) => (
                <svg
                  key={`sparkle-${idx}`}
                  viewBox="0 0 16 16"
                  className="sanctuary-sparkle absolute w-3.5 h-3.5"
                  style={{
                    left: s.left,
                    top: s.top,
                    animationDelay: s.delay,
                    animationDuration: s.duration,
                  }}
                >
                  <path
                    d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z"
                    fill={isDark ? '#a5f3fc' : '#ffffff'}
                    fillOpacity={isDark ? '0.90' : '0.85'}
                  />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Measured Atmospheric Depth Scrims */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isDark
              ? currentRoute === 'home'
                ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(2,5,18,0.04)_0%,rgba(5,17,46,0.14)_62%,rgba(2,5,18,0.36)_100%)]'
                : 'bg-[radial-gradient(circle_at_50%_45%,rgba(2,5,18,0.14)_0%,rgba(5,17,46,0.24)_68%,rgba(2,5,18,0.44)_100%)]'
              : currentRoute === 'home'
              ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(224,242,254,0.04)_0%,rgba(186,230,253,0.16)_68%,rgba(125,211,252,0.28)_100%)]'
              : 'bg-[radial-gradient(circle_at_50%_45%,rgba(224,242,254,0.14)_0%,rgba(186,230,253,0.22)_70%,rgba(125,211,252,0.32)_100%)]'
          }`}
        />

        {/* =====================================================================
            LAYER 2 — FULL-VIEWPORT CLOUDS, AURORA, LIGHTING & MAGICAL PARTICLES
           ===================================================================== */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${vectorArchitectureOpacityClass}`}
        >
          {/* Celestial Aurora Ribbons (Dark) / Upper Sky Light Modulation (Light) */}
          {isDark ? (
            <>
              <div className="sanctuary-aurora-veil absolute inset-x-[-10%] top-[-4%] h-[42%] rounded-full bg-[radial-gradient(ellipse_at_45%_28%,rgba(34,211,238,0.16)_0%,rgba(67,56,202,0.11)_36%,rgba(2,132,199,0.05)_62%,transparent_80%)]" />
              <div className="sanctuary-aurora-secondary absolute inset-x-[-6%] top-[3%] h-[36%] rounded-full bg-[radial-gradient(ellipse_at_62%_24%,rgba(56,189,248,0.12)_0%,rgba(99,102,241,0.09)_42%,transparent_76%)]" />
            </>
          ) : (
            <div className="sanctuary-light-breathe absolute inset-x-[8%] top-[-6%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_50%_25%,rgba(255,255,255,0.50)_0%,rgba(186,230,253,0.22)_52%,transparent_78%)]" />
          )}

          {/* Breathing Distant Horizon Cyan / Sky Glow */}
          <div
            className={`sanctuary-light-breathe absolute inset-x-0 bottom-[-6%] h-[58%] ${
              isDark
                ? 'bg-[radial-gradient(ellipse_at_50%_68%,rgba(34,211,238,0.27)_0%,rgba(2,132,199,0.16)_36%,rgba(14,35,90,0.12)_58%,transparent_76%)]'
                : 'bg-[radial-gradient(ellipse_at_50%_72%,rgba(255,255,255,0.64)_0%,rgba(6,182,212,0.18)_42%,transparent_74%)]'
            }`}
          />

          {/* Full-Viewport Multi-Layer Moving Clouds (Seamlessly Bridging Upper, Mid & Lower Zones) */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Upper-Mid Transition Cloud Band (Slow Left -> Right Drift) */}
            <div
              className={`sanctuary-cloud-far-ltr absolute inset-x-[-14%] top-[20%] h-[26%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_30%_46%_at_24%_50%,rgba(34,211,238,0.11)_0%,rgba(14,35,90,0.14)_52%,transparent_82%),radial-gradient(ellipse_30%_46%_at_76%_50%,rgba(56,189,248,0.11)_0%,rgba(14,35,90,0.14)_52%,transparent_82%)]'
                  : 'bg-[radial-gradient(ellipse_30%_46%_at_24%_50%,rgba(255,255,255,0.48)_0%,rgba(224,242,254,0.24)_54%,transparent_84%),radial-gradient(ellipse_30%_46%_at_76%_50%,rgba(255,255,255,0.48)_0%,rgba(224,242,254,0.24)_54%,transparent_84%)]'
              }`}
            />

            {/* Distant High-Altitude Clouds (Slow Left -> Right Drift) */}
            <div
              className={`sanctuary-cloud-far-ltr absolute inset-x-[-14%] top-[44%] h-[28%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_28%_48%_at_22%_52%,rgba(34,211,238,0.13)_0%,rgba(14,35,90,0.16)_52%,transparent_82%),radial-gradient(ellipse_32%_52%_at_54%_46%,rgba(2,132,199,0.12)_0%,rgba(9,27,72,0.14)_54%,transparent_84%),radial-gradient(ellipse_26%_45%_at_82%_54%,rgba(56,189,248,0.12)_0%,rgba(14,35,90,0.15)_50%,transparent_82%)]'
                  : 'bg-[radial-gradient(ellipse_28%_48%_at_22%_52%,rgba(255,255,255,0.54)_0%,rgba(224,242,254,0.26)_54%,transparent_84%),radial-gradient(ellipse_32%_52%_at_54%_46%,rgba(255,255,255,0.48)_0%,rgba(186,230,253,0.24)_56%,transparent_86%),radial-gradient(ellipse_26%_45%_at_82%_54%,rgba(255,255,255,0.52)_0%,rgba(224,242,254,0.26)_52%,transparent_84%)]'
              }`}
            />

            {/* Mid-Altitude Counter-Drifting Clouds (Opposite Right -> Left + Vertical Drift) */}
            <div
              className={`sanctuary-cloud-mid-rtl absolute inset-x-[-14%] top-[56%] h-[30%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_30%_50%_at_30%_50%,rgba(2,132,199,0.16)_0%,rgba(67,56,202,0.09)_48%,transparent_80%),radial-gradient(ellipse_34%_54%_at_70%_48%,rgba(34,211,238,0.15)_0%,rgba(14,35,90,0.18)_52%,transparent_82%)]'
                  : 'bg-[radial-gradient(ellipse_30%_50%_at_30%_50%,rgba(255,255,255,0.56)_0%,rgba(186,230,253,0.28)_52%,transparent_82%),radial-gradient(ellipse_34%_54%_at_70%_48%,rgba(255,255,255,0.52)_0%,rgba(224,242,254,0.26)_54%,transparent_82%)]'
              }`}
            />

            {/* Horizon Cloud Sea (Very Gentle Undulation Bridging Lower Chasm) */}
            <div
              className={`sanctuary-cloud-horizon-sea absolute inset-x-[-10%] bottom-[-2%] h-[36%] ${
                isDark
                  ? 'bg-[radial-gradient(ellipse_46%_58%_at_50%_68%,rgba(34,211,238,0.14)_0%,rgba(5,17,46,0.28)_56%,transparent_86%),radial-gradient(ellipse_34%_48%_at_20%_72%,rgba(2,132,199,0.14)_0%,transparent_78%),radial-gradient(ellipse_34%_48%_at_80%_72%,rgba(2,132,199,0.14)_0%,transparent_78%)]'
                  : 'bg-[radial-gradient(ellipse_46%_58%_at_50%_68%,rgba(255,255,255,0.62)_0%,rgba(224,242,254,0.34)_58%,transparent_86%),radial-gradient(ellipse_34%_48%_at_20%_72%,rgba(255,255,255,0.50)_0%,transparent_78%),radial-gradient(ellipse_34%_48%_at_80%_72%,rgba(255,255,255,0.50)_0%,transparent_78%)]'
              }`}
            />
          </div>

          {/* Screen-Specific Sanctuary Mood Accents */}
          {currentRoute === 'home' && (
            <div
              className={`sanctuary-light-breathe absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[220px] sm:h-[320px] rounded-full ${
                isDark
                  ? 'bg-[radial-gradient(circle,rgba(34,211,238,0.22)_0%,rgba(14,165,233,0.09)_46%,transparent_72%)]'
                  : 'bg-[radial-gradient(circle,rgba(255,255,255,0.70)_0%,rgba(56,189,248,0.18)_48%,transparent_74%)]'
              }`}
            />
          )}

          {currentRoute === 'progress' && (
            <div
              className={`absolute left-1/2 top-[16%] -translate-x-1/2 w-[480px] sm:w-[740px] h-[300px] rounded-full ${
                isDark
                  ? 'bg-[radial-gradient(ellipse,rgba(34,211,238,0.24)_0%,rgba(67,56,202,0.14)_45%,transparent_74%)]'
                  : 'bg-[radial-gradient(ellipse,rgba(255,255,255,0.82)_0%,rgba(6,182,212,0.22)_45%,transparent_74%)]'
              }`}
            />
          )}

          {currentRoute === 'results' && (
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] sm:w-[680px] h-[440px] sm:h-[520px] rounded-full ${
                isDark
                  ? 'bg-[radial-gradient(circle,rgba(34,211,238,0.26)_0%,rgba(2,132,199,0.14)_44%,transparent_72%)]'
                  : 'bg-[radial-gradient(circle,rgba(255,255,255,0.85)_0%,rgba(6,182,212,0.25)_46%,transparent_74%)]'
              }`}
            />
          )}

          {currentRoute === 'collection' && categoryAccentHex && (
            <div
              className="absolute left-1/2 top-[28%] -translate-x-1/2 w-[540px] sm:w-[820px] h-[360px] rounded-full transition-all duration-500"
              style={{
                background: `radial-gradient(ellipse at center, ${categoryAccentHex}${
                  isDark ? '28' : '24'
                } 0%, transparent 72%)`,
              }}
            />
          )}

          {/* Full-Viewport Atmospheric Dust & Magical Particles */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${particleOpacityClass}`}
          >
            {ATMOSPHERIC_DUST.map((d, idx) => (
              <span
                key={`dust-${idx}`}
                className="sanctuary-dust-speck absolute rounded-full"
                style={{
                  left: d.left,
                  top: d.top,
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                  animationDelay: d.delay,
                  animationDuration: d.duration,
                  backgroundColor: isDark ? '#bae6fd' : '#ffffff',
                }}
              />
            ))}

            {ENCHANTED_MOTES.map((p, idx) => (
              <span
                key={`mote-${idx}`}
                className="sanctuary-upward-mote absolute rounded-full"
                style={{
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  backgroundColor: isDark ? '#67e8f9' : '#0284c7',
                  boxShadow: isDark
                    ? '0 0 11px 2.5px rgba(34, 211, 238, 0.72)'
                    : '0 0 8px 1.5px rgba(6, 182, 212, 0.48)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

LogicQuestAtmosphere.displayName = 'LogicQuestAtmosphere';
