/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Procedural Web Audio Synthesizer (Phase L2.4)
 * Provides zero-dependency synthesized UI & gameplay sound effects and an ambient
 * sanctuary harmonic pad governed by persistent user settings:
 * - masterMuted (boolean)
 * - masterVolume (0..100)
 * - soundEffectsEnabled (boolean)
 * - sfxVolume (0..100)
 * - musicEnabled (boolean)
 * - musicVolume (0..100)
 */

export interface AudioPreferencesInput {
  masterMuted?: boolean;
  masterVolume?: number;
  soundEffectsEnabled: boolean;
  sfxVolume?: number;
  musicEnabled: boolean;
  musicVolume?: number;
}

export interface AudioDiagnosticsSnapshot {
  masterMuted: boolean;
  masterVolume: number;
  soundEffectsEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  effectiveSfxGain: number;
  effectiveMusicGain: number;
  isAmbientPlaying: boolean;
  musicSectionCount: number;
  activeMusicVoices: string[];
  scheduledMusicStepCount: number;
  activeMusicSchedulerCount: number;
  hasAudioContext: boolean;
  lastPlayedSound: string | null;
  playedSoundCount: number;
}

function clampPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Converts a MIDI note number to frequency in Hz (A4 = 69 = 440Hz).
 */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface MusicSectionSpec {
  id: string;
  name: string;
  /** 4 chords per section; each chord lasts 8 eighth-note steps (1 bar) */
  chords: Array<{
    bassMidi: number;
    fifthBassMidi: number;
    padMidis: number[];
    arpMidis: number[];
    shimmerMidi?: number;
    sparkleMidis?: number[];
  }>;
  /** 32 eighth-note steps per section (null = rest, object = melodic note with timbre & articulation) */
  melodySteps: Array<{
    midi: number;
    harmonyMidi?: number;
    durationSteps: number;
    accent?: number;
    voice?: 'bell' | 'flute' | 'celesta';
  } | null>;
  /** 8-step bouncy arpeggio velocity pattern (0..1) */
  pulsePattern: number[];
  /** 8-step bass groove pattern (0 = rest, 1 = root, 2 = octave, 3 = fifth) */
  bassPattern: Array<0 | 1 | 2 | 3>;
  /** 8-step whisper-light tactile percussion pattern (0 = rest, 1 = soft pulse kick, 2 = crystal shaker, 3 = warm rim click) */
  percussionPattern: Array<0 | 1 | 2 | 3>;
}

/**
 * Original 4-Movement, 16-Bar (128 eighth-note steps) Instrumental Soundtrack:
 * "Starlight Sanctuary & Hidden Mechanisms"
 *
 * Atmosphere: Mysterious + Magical + Futuristic + Playful + Alive
 * Harmonic Palette: F Lydian / C Major9 / G Mixolydian / A Minor11 (bright #11 wonder & playful syncopation)
 * - Movement I: "Starlight Mechanisms" (curious, buoyant Fmaj9(#11) & G6(add9) bell-marimba motif)
 * - Movement II: "Clockwork Constellations" (playful, interlocking celesta & synth pluck dialog with Lydian lift)
 * - Movement III: "Prismatic Discovery" (mysterious, floating crystal harmonies & warm analog-style pad)
 * - Movement IV: "Sanctuary in Motion" (uplifting, luminous resolution & seamless turnaround loop)
 */
const SANCTUARY_MUSIC_SECTIONS: MusicSectionSpec[] = [
  {
    id: 'section_a_starlight_mechanisms',
    name: 'Starlight Mechanisms',
    chords: [
      // Bar 1: Fmaj9(#11) — Magical Lydian opening (F2, A3-C4-E4-G4-B4)
      {
        bassMidi: 41,
        fifthBassMidi: 48,
        padMidis: [57, 60, 64, 67],
        arpMidis: [65, 69, 72, 76, 79, 83, 79, 72],
        shimmerMidi: 88,
        sparkleMidis: [84, 91, 95],
      },
      // Bar 2: G6(add9) — Playful, sunny motion (G2, B3-D4-E4-A4)
      {
        bassMidi: 43,
        fifthBassMidi: 50,
        padMidis: [59, 62, 64, 69],
        arpMidis: [67, 71, 74, 76, 81, 76, 74, 71],
        shimmerMidi: 86,
      },
      // Bar 3: Em11 — Mysterious futuristic float (E2, G3-B3-D4-F#4-A4)
      {
        bassMidi: 40,
        fifthBassMidi: 47,
        padMidis: [55, 59, 62, 66],
        arpMidis: [64, 67, 71, 74, 78, 81, 78, 71],
        shimmerMidi: 90,
        sparkleMidis: [83, 86, 93],
      },
      // Bar 4: Am9 — Curious warm landing (A2, G3-B3-C4-E4)
      {
        bassMidi: 45,
        fifthBassMidi: 52,
        padMidis: [55, 59, 60, 64],
        arpMidis: [69, 72, 76, 79, 83, 79, 76, 72],
        shimmerMidi: 84,
      },
    ],
    pulsePattern: [0.88, 0.48, 0.74, 0.56, 0.82, 0.5, 0.78, 0.62],
    bassPattern: [1, 0, 0, 2, 0, 3, 1, 0],
    percussionPattern: [1, 2, 3, 2, 1, 2, 3, 2],
    melodySteps: [
      // Bar 1: Playful ascending Lydian bell motif (C5 -> E5 -> G5 -> B5 -> A5)
      { midi: 72, durationSteps: 1, accent: 0.86, voice: 'bell' },
      { midi: 76, durationSteps: 1, accent: 0.82, voice: 'bell' },
      { midi: 79, durationSteps: 2, accent: 0.92, voice: 'bell', harmonyMidi: 72 },
      null,
      { midi: 83, durationSteps: 1, accent: 0.9, voice: 'celesta' },
      { midi: 81, durationSteps: 2, accent: 0.85, voice: 'bell' },
      null,
      { midi: 79, durationSteps: 1, accent: 0.78, voice: 'bell' },
      // Bar 2: Syncopated answer phrase (B5 -> G5 -> E5 -> D5)
      null,
      { midi: 83, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 79, durationSteps: 2, accent: 0.84, voice: 'bell', harmonyMidi: 71 },
      null,
      { midi: 76, durationSteps: 1, accent: 0.8, voice: 'flute' },
      { midi: 74, durationSteps: 2, accent: 0.86, voice: 'flute' },
      null,
      null,
      // Bar 3: Curious mysterious turn (F#5 -> G5 -> B5 -> A5 -> G5)
      { midi: 78, durationSteps: 1, accent: 0.84, voice: 'celesta' },
      { midi: 79, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 83, durationSteps: 2, accent: 0.94, voice: 'bell', harmonyMidi: 74 },
      null,
      { midi: 81, durationSteps: 1, accent: 0.85, voice: 'bell' },
      { midi: 79, durationSteps: 1, accent: 0.8, voice: 'bell' },
      { midi: 74, durationSteps: 2, accent: 0.78, voice: 'flute' },
      null,
      // Bar 4: Warm resolution with magical grace echo (E5 -> G5 -> A5)
      { midi: 76, durationSteps: 2, accent: 0.86, voice: 'flute', harmonyMidi: 69 },
      null,
      { midi: 79, durationSteps: 1, accent: 0.82, voice: 'celesta' },
      { midi: 81, durationSteps: 3, accent: 0.9, voice: 'bell', harmonyMidi: 72 },
      null,
      null,
      { midi: 76, durationSteps: 1, accent: 0.72, voice: 'celesta' },
      null,
    ],
  },
  {
    id: 'section_b_clockwork_constellations',
    name: 'Clockwork Constellations',
    chords: [
      // Bar 5: Cmaj9 — Bright open sky (C2, E3-G3-B3-D4)
      {
        bassMidi: 36,
        fifthBassMidi: 43,
        padMidis: [55, 59, 62, 64],
        arpMidis: [64, 67, 71, 74, 79, 83, 79, 71],
        shimmerMidi: 86,
      },
      // Bar 6: D9sus4 -> D7(#11) — Magical exploratory lift (D2, A3-C4-E4-F#4)
      {
        bassMidi: 38,
        fifthBassMidi: 45,
        padMidis: [57, 60, 64, 66],
        arpMidis: [66, 69, 72, 76, 81, 84, 81, 72],
        shimmerMidi: 90,
        sparkleMidis: [86, 90, 96],
      },
      // Bar 7: Fmaj9(#11) — Floating crystal terrace (F2, A3-C4-E4-G4)
      {
        bassMidi: 41,
        fifthBassMidi: 48,
        padMidis: [57, 60, 64, 67],
        arpMidis: [65, 69, 72, 76, 79, 84, 79, 72],
        shimmerMidi: 88,
      },
      // Bar 8: G13sus4 — Playful anticipation (G2, F3-A3-C4-E4)
      {
        bassMidi: 43,
        fifthBassMidi: 50,
        padMidis: [55, 57, 60, 64],
        arpMidis: [67, 71, 74, 79, 81, 83, 79, 74],
        shimmerMidi: 91,
        sparkleMidis: [86, 89, 95],
      },
    ],
    pulsePattern: [0.92, 0.54, 0.78, 0.6, 0.86, 0.52, 0.8, 0.66],
    bassPattern: [1, 0, 2, 0, 3, 0, 1, 2],
    percussionPattern: [1, 2, 3, 2, 2, 3, 1, 2],
    melodySteps: [
      // Bar 5: Bouncy starlight motif
      { midi: 79, durationSteps: 1, accent: 0.9, voice: 'bell' },
      { midi: 83, durationSteps: 1, accent: 0.86, voice: 'bell' },
      { midi: 86, durationSteps: 2, accent: 0.94, voice: 'celesta', harmonyMidi: 79 },
      null,
      { midi: 84, durationSteps: 1, accent: 0.84, voice: 'bell' },
      { midi: 79, durationSteps: 2, accent: 0.82, voice: 'flute' },
      null,
      { midi: 76, durationSteps: 1, accent: 0.76, voice: 'bell' },
      // Bar 6: Magical F#5 / A5 / C6 lift
      { midi: 78, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 81, durationSteps: 1, accent: 0.9, voice: 'bell' },
      { midi: 84, durationSteps: 2, accent: 0.95, voice: 'celesta', harmonyMidi: 78 },
      null,
      { midi: 86, durationSteps: 2, accent: 0.92, voice: 'bell' },
      null,
      { midi: 81, durationSteps: 2, accent: 0.82, voice: 'flute' },
      null,
      // Bar 7: Cascading bell droplets
      null,
      { midi: 84, durationSteps: 1, accent: 0.88, voice: 'celesta' },
      { midi: 83, durationSteps: 1, accent: 0.84, voice: 'bell' },
      { midi: 79, durationSteps: 2, accent: 0.9, voice: 'bell', harmonyMidi: 72 },
      null,
      { midi: 76, durationSteps: 1, accent: 0.82, voice: 'flute' },
      { midi: 79, durationSteps: 2, accent: 0.86, voice: 'flute' },
      null,
      // Bar 8: Playful upward wink
      { midi: 81, durationSteps: 1, accent: 0.86, voice: 'bell' },
      { midi: 83, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 86, durationSteps: 3, accent: 0.94, voice: 'celesta', harmonyMidi: 79 },
      null,
      null,
      { midi: 79, durationSteps: 2, accent: 0.8, voice: 'flute' },
      null,
      null,
    ],
  },
  {
    id: 'section_c_prismatic_discovery',
    name: 'Prismatic Discovery',
    chords: [
      // Bar 9: Am11 — Gentle mysterious sanctuary depth (A2, G3-B3-C4-E4-G4)
      {
        bassMidi: 45,
        fifthBassMidi: 52,
        padMidis: [55, 59, 60, 64],
        arpMidis: [69, 71, 72, 76, 79, 84, 79, 72],
        shimmerMidi: 88,
      },
      // Bar 10: Fmaj9(#11) — Warm glowing discovery (F2, A3-C4-E4-G4)
      {
        bassMidi: 41,
        fifthBassMidi: 48,
        padMidis: [57, 60, 64, 67],
        arpMidis: [65, 69, 72, 76, 83, 79, 76, 69],
        shimmerMidi: 84,
        sparkleMidis: [84, 88, 95],
      },
      // Bar 11: Dm9 — Tender curiosity (D2, F3-A3-C4-E4)
      {
        bassMidi: 38,
        fifthBassMidi: 45,
        padMidis: [53, 57, 60, 64],
        arpMidis: [62, 65, 69, 72, 76, 81, 76, 69],
        shimmerMidi: 86,
      },
      // Bar 12: G6(add9) — Brightening horizon (G2, B3-D4-E4-A4)
      {
        bassMidi: 43,
        fifthBassMidi: 50,
        padMidis: [59, 62, 64, 69],
        arpMidis: [67, 71, 74, 76, 79, 83, 79, 74],
        shimmerMidi: 91,
        sparkleMidis: [83, 86, 91],
      },
    ],
    pulsePattern: [0.8, 0.45, 0.68, 0.5, 0.76, 0.45, 0.72, 0.55],
    bassPattern: [1, 0, 0, 3, 0, 2, 1, 0],
    percussionPattern: [1, 2, 0, 2, 3, 2, 1, 2],
    melodySteps: [
      // Bar 9: Lyrical flute & celesta duet
      null,
      { midi: 76, durationSteps: 2, accent: 0.85, voice: 'flute', harmonyMidi: 69 },
      null,
      { midi: 79, durationSteps: 1, accent: 0.82, voice: 'celesta' },
      { midi: 81, durationSteps: 2, accent: 0.9, voice: 'flute', harmonyMidi: 72 },
      null,
      { midi: 84, durationSteps: 2, accent: 0.88, voice: 'celesta' },
      null,
      // Bar 10: Sparkling Lydian response
      { midi: 83, durationSteps: 2, accent: 0.9, voice: 'bell', harmonyMidi: 76 },
      null,
      { midi: 79, durationSteps: 1, accent: 0.82, voice: 'bell' },
      { midi: 76, durationSteps: 2, accent: 0.85, voice: 'flute' },
      null,
      { midi: 72, durationSteps: 2, accent: 0.78, voice: 'celesta' },
      null,
      null,
      // Bar 11: Playful stepping stones
      { midi: 74, durationSteps: 1, accent: 0.84, voice: 'bell' },
      { midi: 76, durationSteps: 1, accent: 0.86, voice: 'bell' },
      { midi: 77, durationSteps: 2, accent: 0.9, voice: 'bell', harmonyMidi: 69 },
      null,
      { midi: 81, durationSteps: 2, accent: 0.92, voice: 'celesta' },
      null,
      { midi: 79, durationSteps: 2, accent: 0.84, voice: 'flute' },
      null,
      // Bar 12: Radiant ascent
      { midi: 79, durationSteps: 1, accent: 0.86, voice: 'bell' },
      { midi: 81, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 83, durationSteps: 2, accent: 0.92, voice: 'bell', harmonyMidi: 74 },
      null,
      { midi: 86, durationSteps: 3, accent: 0.95, voice: 'celesta', harmonyMidi: 79 },
      null,
      null,
      null,
    ],
  },
  {
    id: 'section_d_sanctuary_in_motion',
    name: 'Sanctuary in Motion',
    chords: [
      // Bar 13: Fmaj9(#11) — Joyful return (F2, A3-C4-E4-G4)
      {
        bassMidi: 41,
        fifthBassMidi: 48,
        padMidis: [57, 60, 64, 67],
        arpMidis: [65, 69, 72, 76, 79, 83, 84, 79],
        shimmerMidi: 88,
      },
      // Bar 14: G6(add9) — Dancing light (G2, B3-D4-E4-A4)
      {
        bassMidi: 43,
        fifthBassMidi: 50,
        padMidis: [59, 62, 64, 69],
        arpMidis: [67, 71, 74, 79, 81, 83, 79, 74],
        shimmerMidi: 86,
        sparkleMidis: [83, 86, 93],
      },
      // Bar 15: Cmaj9 — Luminous sanctuary vista (C2, E3-G3-B3-D4)
      {
        bassMidi: 36,
        fifthBassMidi: 43,
        padMidis: [55, 59, 62, 64],
        arpMidis: [60, 64, 67, 71, 74, 79, 83, 79],
        shimmerMidi: 91,
      },
      // Bar 16: G9sus4 -> Cmaj9/G turnaround leading seamlessly back to Bar 1 Fmaj9(#11)
      {
        bassMidi: 43,
        fifthBassMidi: 50,
        padMidis: [55, 57, 60, 64],
        arpMidis: [62, 65, 69, 72, 76, 79, 76, 72],
        shimmerMidi: 86,
        sparkleMidis: [84, 88, 91],
      },
    ],
    pulsePattern: [0.9, 0.52, 0.76, 0.58, 0.85, 0.52, 0.78, 0.64],
    bassPattern: [1, 0, 2, 0, 3, 1, 2, 0],
    percussionPattern: [1, 2, 3, 2, 1, 2, 3, 2],
    melodySteps: [
      // Bar 13
      { midi: 84, durationSteps: 1, accent: 0.92, voice: 'celesta' },
      { midi: 83, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 79, durationSteps: 2, accent: 0.9, voice: 'bell', harmonyMidi: 72 },
      null,
      { midi: 76, durationSteps: 1, accent: 0.84, voice: 'flute' },
      { midi: 79, durationSteps: 2, accent: 0.88, voice: 'bell' },
      null,
      { midi: 81, durationSteps: 1, accent: 0.84, voice: 'celesta' },
      // Bar 14
      { midi: 83, durationSteps: 2, accent: 0.92, voice: 'bell', harmonyMidi: 74 },
      null,
      { midi: 79, durationSteps: 1, accent: 0.85, voice: 'bell' },
      { midi: 74, durationSteps: 2, accent: 0.82, voice: 'flute' },
      null,
      { midi: 76, durationSteps: 2, accent: 0.84, voice: 'flute' },
      null,
      null,
      // Bar 15
      { midi: 79, durationSteps: 1, accent: 0.88, voice: 'bell' },
      { midi: 83, durationSteps: 1, accent: 0.9, voice: 'bell' },
      { midi: 84, durationSteps: 2, accent: 0.94, voice: 'celesta', harmonyMidi: 76 },
      null,
      { midi: 79, durationSteps: 2, accent: 0.86, voice: 'flute' },
      null,
      { midi: 76, durationSteps: 2, accent: 0.82, voice: 'bell' },
      null,
      // Bar 16: Smooth magical turnaround into Bar 1
      { midi: 74, durationSteps: 2, accent: 0.86, voice: 'flute', harmonyMidi: 67 },
      null,
      { midi: 76, durationSteps: 2, accent: 0.86, voice: 'bell' },
      null,
      { midi: 79, durationSteps: 3, accent: 0.9, voice: 'celesta', harmonyMidi: 72 },
      null,
      null,
      null,
    ],
  },
];

const EIGHTH_NOTE_DURATION_SEC = 0.24; // ~125 BPM buoyant, playful eighth-note pulse
const TOTAL_STEPS_PER_SECTION = 32; // 4 bars * 8 eighth-notes per bar
const TOTAL_ARRANGEMENT_STEPS =
  SANCTUARY_MUSIC_SECTIONS.length * TOTAL_STEPS_PER_SECTION; // 128 steps

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterMuted = false;
  private masterVolume = 80;
  private sfxEnabled = true;
  private sfxVolume = 85;
  private musicEnabled = true;
  private musicVolume = 45;

  private ambientGain: GainNode | null = null;
  private musicFilterNode: BiquadFilterNode | null = null;
  private musicSchedulerTimer: ReturnType<typeof setInterval> | null = null;
  private ambientStopTimer: ReturnType<typeof setTimeout> | null = null;
  private activeMusicNodes = new Set<AudioNode>();
  private isAmbientPlaying = false;
  private currentMusicStep = 0;
  private nextStepAudioTime = 0;
  private scheduledMusicStepCount = 0;
  private activeMusicSchedulerCount = 0;

  private visibilityListenerAttached = false;
  private unlockListenersAttached = false;

  private lastPlayedSound: string | null = null;
  private playedSoundCount = 0;
  private lastScheduledAtBySound: Record<string, number> = {};

  constructor() {
    this.attachVisibilityListener();
    this.attachUserGestureUnlockListeners();
  }

  private attachVisibilityListener(): void {
    if (
      this.visibilityListenerAttached ||
      typeof document === 'undefined' ||
      typeof document.addEventListener !== 'function'
    ) {
      return;
    }
    this.visibilityListenerAttached = true;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private attachUserGestureUnlockListeners(): void {
    if (
      this.unlockListenersAttached ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return;
    }
    this.unlockListenersAttached = true;
    const handleGesture = () => {
      if (!this.canPlayMusic()) return;
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (this.canPlayMusic() && !this.isAmbientPlaying) {
        this.startAmbientPad();
      } else if (
        this.canPlayMusic() &&
        this.isAmbientPlaying &&
        ctx &&
        !this.ambientGain
      ) {
        // Re-initialize audio bus if context became available after initial startup
        this.stopAmbientPadImmediate();
        this.startAmbientPad();
      }
    };
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      if (this.isAmbientPlaying) {
        this.stopAmbientPadImmediate();
      }
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else if (this.canPlayMusic()) {
      this.startAmbientPad();
    }
  };

  public getEffectiveSfxMultiplier(): number {
    if (this.masterMuted || !this.sfxEnabled) return 0;
    if (this.masterVolume <= 0 || this.sfxVolume <= 0) return 0;
    return (this.masterVolume / 100) * (this.sfxVolume / 100);
  }

  public getEffectiveMusicMultiplier(): number {
    if (this.masterMuted || !this.musicEnabled) return 0;
    if (this.masterVolume <= 0 || this.musicVolume <= 0) return 0;
    return (this.masterVolume / 100) * (this.musicVolume / 100);
  }

  public canPlaySfx(): boolean {
    return this.getEffectiveSfxMultiplier() > 0;
  }

  public canPlayMusic(): boolean {
    return this.getEffectiveMusicMultiplier() > 0;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public syncPreferences(params: AudioPreferencesInput): void {
    this.masterMuted = Boolean(params.masterMuted);
    this.masterVolume = clampPercent(params.masterVolume, this.masterVolume);
    this.sfxEnabled = Boolean(params.soundEffectsEnabled);
    this.sfxVolume = clampPercent(params.sfxVolume, this.sfxVolume);
    this.musicEnabled = Boolean(params.musicEnabled);
    this.musicVolume = clampPercent(params.musicVolume, this.musicVolume);

    if (this.canPlayMusic()) {
      if (this.isAmbientPlaying) {
        if (this.ambientGain && this.ctx) {
          const targetGain = Math.max(
            0.0005,
            0.24 * this.getEffectiveMusicMultiplier()
          );
          try {
            this.ambientGain.gain.setTargetAtTime(
              targetGain,
              this.ctx.currentTime,
              0.08
            );
          } catch {
            // Fallback if audio param ramp fails
          }
        }
      } else {
        this.startAmbientPad();
      }
    } else {
      this.stopAmbientPad();
    }
  }

  public getAudioDiagnostics(): AudioDiagnosticsSnapshot {
    return {
      masterMuted: this.masterMuted,
      masterVolume: this.masterVolume,
      soundEffectsEnabled: this.sfxEnabled,
      sfxVolume: this.sfxVolume,
      musicEnabled: this.musicEnabled,
      musicVolume: this.musicVolume,
      effectiveSfxGain: Number(this.getEffectiveSfxMultiplier().toFixed(4)),
      effectiveMusicGain: Number(this.getEffectiveMusicMultiplier().toFixed(4)),
      isAmbientPlaying: this.isAmbientPlaying,
      musicSectionCount: SANCTUARY_MUSIC_SECTIONS.length,
      activeMusicVoices: [
        'chord_pad',
        'pulse_arp',
        'lead_melody',
        'sub_bass',
        'harmonic_shimmer',
      ],
      scheduledMusicStepCount: this.scheduledMusicStepCount,
      activeMusicSchedulerCount: this.activeMusicSchedulerCount,
      hasAudioContext: this.ctx !== null,
      lastPlayedSound: this.lastPlayedSound,
      playedSoundCount: this.playedSoundCount,
    };
  }

  public isMusicPlaying(): boolean {
    return this.isAmbientPlaying && this.canPlayMusic();
  }

  public getActiveMusicSectionName(): string {
    const normalizedStep =
      ((this.currentMusicStep % TOTAL_ARRANGEMENT_STEPS) +
        TOTAL_ARRANGEMENT_STEPS) %
      TOTAL_ARRANGEMENT_STEPS;
    const sectionIndex = Math.min(
      SANCTUARY_MUSIC_SECTIONS.length - 1,
      Math.floor(normalizedStep / TOTAL_STEPS_PER_SECTION)
    );
    return (
      SANCTUARY_MUSIC_SECTIONS[sectionIndex]?.name ?? 'Starlight Mechanisms'
    );
  }

  /**
   * Safely unlocks/resumes or previews the single background soundtrack instance
   * without ever creating a second playback scheduler.
   */
  public previewOrResumeMusic(): boolean {
    if (!this.canPlayMusic()) return false;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this.isAmbientPlaying) {
      this.startAmbientPad();
    } else if (ctx && !this.ambientGain) {
      this.stopAmbientPadImmediate();
      this.startAmbientPad();
    } else {
      this.runMusicSchedulerTick();
    }
    return this.isAmbientPlaying;
  }

  public resetDiagnosticsCounter(): void {
    this.lastPlayedSound = null;
    this.playedSoundCount = 0;
    this.lastScheduledAtBySound = {};
  }

  private recordSoundTriggered(soundName: string): void {
    this.lastPlayedSound = soundName;
    this.playedSoundCount += 1;
  }

  private scheduleToneSequence(
    soundName: string,
    notes: Array<{
      freq: number;
      endFreq?: number;
      delay: number;
      duration: number;
      baseGain: number;
      type: OscillatorType;
    }>
  ): void {
    const mult = this.getEffectiveSfxMultiplier();
    if (mult <= 0) return;

    // Prevent harsh Web Audio oscillator stacking if the exact same UI sound
    // is scheduled multiple times within 18ms
    const perfNow =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prevScheduled = this.lastScheduledAtBySound[soundName] ?? -1000;
    if (perfNow - prevScheduled < 18) {
      return;
    }
    this.lastScheduledAtBySound[soundName] = perfNow;

    // Record triggered sound whenever SFX is unmuted and passes anti-overlap guard
    this.recordSoundTriggered(soundName);

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type;

        const start = now + note.delay;
        const stop = start + note.duration;
        const peakGain = Math.max(0.0005, note.baseGain * mult);

        osc.frequency.setValueAtTime(note.freq, start);
        if (note.endFreq && note.endFreq !== note.freq) {
          osc.frequency.exponentialRampToValueAtTime(
            note.endFreq,
            start + note.duration * 0.85
          );
        }

        gain.gain.setValueAtTime(peakGain, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, stop);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(stop + 0.01);
      }
    } catch {
      // Ignore Web Audio scheduling errors under restricted autoplay environments
    }
  }

  public playClick(): void {
    this.scheduleToneSequence('click', [
      {
        freq: 520,
        endFreq: 780,
        delay: 0,
        duration: 0.06,
        baseGain: 0.08,
        type: 'triangle',
      },
    ]);
  }

  public playHover(): void {
    this.scheduleToneSequence('hover', [
      {
        freq: 880,
        endFreq: 1040,
        delay: 0,
        duration: 0.028,
        baseGain: 0.022,
        type: 'sine',
      },
    ]);
  }

  public playReset(): void {
    this.scheduleToneSequence('reset', [
      {
        freq: 540,
        endFreq: 420,
        delay: 0,
        duration: 0.075,
        baseGain: 0.065,
        type: 'triangle',
      },
      {
        freq: 392,
        delay: 0.045,
        duration: 0.09,
        baseGain: 0.06,
        type: 'sine',
      },
    ]);
  }

  public playTransition(): void {
    this.scheduleToneSequence('transition', [
      { freq: 440, delay: 0, duration: 0.14, baseGain: 0.05, type: 'sine' },
      { freq: 554.37, delay: 0.035, duration: 0.14, baseGain: 0.05, type: 'sine' },
      { freq: 659.25, delay: 0.07, duration: 0.16, baseGain: 0.055, type: 'sine' },
    ]);
  }

  public playPuzzleInteract(): void {
    this.scheduleToneSequence('puzzle_interact', [
      {
        freq: 620,
        endFreq: 740,
        delay: 0,
        duration: 0.05,
        baseGain: 0.055,
        type: 'sine',
      },
    ]);
  }

  public playCorrectAnswer(): void {
    this.scheduleToneSequence('correct_answer', [
      { freq: 587.33, delay: 0, duration: 0.16, baseGain: 0.075, type: 'triangle' },
      { freq: 880, delay: 0.055, duration: 0.24, baseGain: 0.085, type: 'triangle' },
    ]);
  }

  public playWrongAnswer(): void {
    this.scheduleToneSequence('wrong_answer', [
      {
        freq: 260,
        endFreq: 195,
        delay: 0,
        duration: 0.14,
        baseGain: 0.075,
        type: 'sawtooth',
      },
      {
        freq: 210,
        endFreq: 165,
        delay: 0.09,
        duration: 0.18,
        baseGain: 0.07,
        type: 'triangle',
      },
    ]);
  }

  public playHintChime(): void {
    this.scheduleToneSequence('hint_chime', [
      { freq: 587.33, delay: 0, duration: 0.22, baseGain: 0.06, type: 'triangle' },
      { freq: 880, delay: 0.05, duration: 0.22, baseGain: 0.06, type: 'triangle' },
      { freq: 1174.66, delay: 0.1, duration: 0.25, baseGain: 0.065, type: 'triangle' },
    ]);
  }

  public playCompletionChord(): void {
    this.scheduleToneSequence('completion_chord', [
      { freq: 523.25, delay: 0, duration: 0.34, baseGain: 0.07, type: 'triangle' },
      { freq: 659.25, delay: 0.045, duration: 0.34, baseGain: 0.07, type: 'triangle' },
      { freq: 783.99, delay: 0.09, duration: 0.36, baseGain: 0.075, type: 'triangle' },
      { freq: 1046.5, delay: 0.135, duration: 0.42, baseGain: 0.08, type: 'sine' },
    ]);
  }

  public playWinStreakIncrease(): void {
    this.scheduleToneSequence('win_streak_increase', [
      { freq: 659.25, delay: 0, duration: 0.14, baseGain: 0.068, type: 'triangle' },
      { freq: 880, delay: 0.045, duration: 0.18, baseGain: 0.072, type: 'triangle' },
      { freq: 1174.66, delay: 0.09, duration: 0.26, baseGain: 0.078, type: 'sine' },
    ]);
  }

  public playAchievementUnlock(): void {
    this.scheduleToneSequence('achievement_unlock', [
      { freq: 659.25, delay: 0, duration: 0.2, baseGain: 0.075, type: 'triangle' },
      { freq: 830.61, delay: 0.055, duration: 0.22, baseGain: 0.075, type: 'triangle' },
      { freq: 987.77, delay: 0.11, duration: 0.26, baseGain: 0.08, type: 'triangle' },
      { freq: 1318.51, delay: 0.165, duration: 0.42, baseGain: 0.09, type: 'sine' },
    ]);
  }

  public playLevelUp(): void {
    this.scheduleToneSequence('level_up', [
      { freq: 523.25, delay: 0, duration: 0.18, baseGain: 0.08, type: 'triangle' },
      { freq: 659.25, delay: 0.055, duration: 0.2, baseGain: 0.082, type: 'triangle' },
      { freq: 783.99, delay: 0.11, duration: 0.22, baseGain: 0.085, type: 'triangle' },
      { freq: 1046.5, delay: 0.165, duration: 0.28, baseGain: 0.09, type: 'triangle' },
      { freq: 1318.51, delay: 0.22, duration: 0.36, baseGain: 0.092, type: 'sine' },
      { freq: 1567.98, delay: 0.28, duration: 0.52, baseGain: 0.095, type: 'sine' },
    ]);
  }

  public playWinStreakMilestone(): void {
    this.scheduleToneSequence('win_streak_milestone', [
      { freq: 587.33, delay: 0, duration: 0.16, baseGain: 0.078, type: 'triangle' },
      { freq: 739.99, delay: 0.045, duration: 0.18, baseGain: 0.08, type: 'triangle' },
      { freq: 880, delay: 0.09, duration: 0.22, baseGain: 0.084, type: 'triangle' },
      { freq: 1174.66, delay: 0.135, duration: 0.28, baseGain: 0.088, type: 'triangle' },
      { freq: 1479.98, delay: 0.185, duration: 0.48, baseGain: 0.094, type: 'sine' },
    ]);
  }

  public playDailyChallengeComplete(): void {
    this.scheduleToneSequence('daily_challenge_complete', [
      { freq: 587.33, delay: 0, duration: 0.22, baseGain: 0.075, type: 'triangle' },
      { freq: 739.99, delay: 0.05, duration: 0.24, baseGain: 0.075, type: 'triangle' },
      { freq: 880, delay: 0.1, duration: 0.28, baseGain: 0.08, type: 'triangle' },
      { freq: 1174.66, delay: 0.15, duration: 0.42, baseGain: 0.085, type: 'sine' },
    ]);
  }

  public playArchiveMechanismActivate(): void {
    this.scheduleToneSequence('archive_mechanism_activate', [
      { freq: 329.63, delay: 0, duration: 0.28, baseGain: 0.07, type: 'sine' },
      { freq: 493.88, delay: 0.06, duration: 0.3, baseGain: 0.07, type: 'triangle' },
      { freq: 659.25, delay: 0.12, duration: 0.38, baseGain: 0.075, type: 'sine' },
    ]);
  }

  // --- Structured Multi-Voice Original Soundtrack Engine ---

  private scheduleMusicNote(params: {
    ctx: AudioContext;
    destination: AudioNode;
    freq: number;
    endFreq?: number;
    startTime: number;
    duration: number;
    peakGain: number;
    attackSec: number;
    releaseSec: number;
    type: OscillatorType;
    detuneCents?: number;
    filterCutoffHz?: number;
    filterType?: BiquadFilterType;
  }): void {
    const {
      ctx,
      destination,
      freq,
      endFreq,
      startTime,
      duration,
      peakGain,
      attackSec,
      releaseSec,
      type,
      detuneCents = 0,
      filterCutoffHz,
      filterType = 'lowpass',
    } = params;

    if (peakGain <= 0.0001 || duration <= 0.008) return;

    try {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, endFreq),
          startTime + duration
        );
      }
      if (detuneCents !== 0 && osc.detune) {
        osc.detune.setValueAtTime(detuneCents, startTime);
      }

      const safeAttack = Math.min(attackSec, duration * 0.45);
      const stopTime = startTime + duration + releaseSec;

      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.linearRampToValueAtTime(peakGain, startTime + safeAttack);
      noteGain.gain.setValueAtTime(
        peakGain * 0.8,
        startTime + Math.max(safeAttack, duration * 0.68)
      );
      noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      if (filterCutoffHz && typeof ctx.createBiquadFilter === 'function') {
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterCutoffHz, startTime);
        osc.connect(filter);
        filter.connect(noteGain);
        this.activeMusicNodes.add(filter);
      } else {
        osc.connect(noteGain);
      }

      noteGain.connect(destination);
      this.activeMusicNodes.add(osc);
      this.activeMusicNodes.add(noteGain);

      osc.onended = () => {
        try {
          osc.disconnect();
          noteGain.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.activeMusicNodes.delete(osc);
        this.activeMusicNodes.delete(noteGain);
      };

      osc.start(startTime);
      osc.stop(stopTime + 0.02);
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  /**
   * Schedules whisper-light, tactile futuristic percussion (soft pulse kick,
   * crystalline high-frequency tick/shaker, or warm wooden marimba rim click)
   * so the soundtrack feels alive and playful without ever sounding loud or harsh.
   */
  private scheduleSoftPercussionStep(
    ctx: AudioContext,
    destination: AudioNode,
    percType: 0 | 1 | 2 | 3,
    stepStartTime: number
  ): void {
    if (percType === 0) return;

    if (percType === 1) {
      // Soft, warm heartbeat pulse kick
      this.scheduleMusicNote({
        ctx,
        destination,
        freq: 112,
        endFreq: 46,
        startTime: stepStartTime,
        duration: 0.065,
        peakGain: 0.048,
        attackSec: 0.005,
        releaseSec: 0.055,
        type: 'sine',
        filterCutoffHz: 240,
      });
    } else if (percType === 2) {
      // Whisper-light crystalline shaker / clockwork tick
      this.scheduleMusicNote({
        ctx,
        destination,
        freq: 3400,
        endFreq: 4800,
        startTime: stepStartTime,
        duration: 0.018,
        peakGain: 0.0085,
        attackSec: 0.003,
        releaseSec: 0.018,
        type: 'triangle',
        filterCutoffHz: 4200,
        filterType: 'bandpass',
      });
    } else if (percType === 3) {
      // Playful warm wooden block / kalimba rim accent
      this.scheduleMusicNote({
        ctx,
        destination,
        freq: 760,
        endFreq: 490,
        startTime: stepStartTime,
        duration: 0.028,
        peakGain: 0.018,
        attackSec: 0.003,
        releaseSec: 0.032,
        type: 'triangle',
        filterCutoffHz: 1400,
      });
    }
  }

  private scheduleSingleMusicStep(
    stepIndex: number,
    stepStartTime: number
  ): void {
    this.scheduledMusicStepCount += 1;

    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;
    const bus = this.musicFilterNode ?? this.ambientGain;

    const normalizedStep =
      ((stepIndex % TOTAL_ARRANGEMENT_STEPS) + TOTAL_ARRANGEMENT_STEPS) %
      TOTAL_ARRANGEMENT_STEPS;
    const sectionIndex = Math.floor(normalizedStep / TOTAL_STEPS_PER_SECTION);
    const stepInSection = normalizedStep % TOTAL_STEPS_PER_SECTION;
    const barInSection = Math.floor(stepInSection / 8);
    const stepInBar = stepInSection % 8;

    const section = SANCTUARY_MUSIC_SECTIONS[sectionIndex];
    const chord = section.chords[barInSection];
    if (!chord) return;

    const barDuration = EIGHTH_NOTE_DURATION_SEC * 8;

    // 1. Warm Breathing Ambient Pad + Magical Sparkle Accents (at bar start)
    if (stepInBar === 0) {
      for (const [idx, padMidi] of chord.padMidis.entries()) {
        const freq = midiToFreq(padMidi);
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq,
          startTime: stepStartTime,
          duration: barDuration * 0.94,
          peakGain: 0.026,
          attackSec: 0.32 + idx * 0.05,
          releaseSec: 0.48,
          type: 'sine',
          detuneCents: idx % 2 === 0 ? -4 : 4,
        });
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq,
          startTime: stepStartTime,
          duration: barDuration * 0.88,
          peakGain: 0.013,
          attackSec: 0.4,
          releaseSec: 0.45,
          type: 'triangle',
          detuneCents: idx % 2 === 0 ? 6 : -6,
          filterCutoffHz: 1350,
        });
      }

      // Crystalline harmonic shimmer accent
      if (typeof chord.shimmerMidi === 'number') {
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: midiToFreq(chord.shimmerMidi),
          startTime: stepStartTime + EIGHTH_NOTE_DURATION_SEC * 2,
          duration: EIGHTH_NOTE_DURATION_SEC * 3.5,
          peakGain: 0.016,
          attackSec: 0.16,
          releaseSec: 0.45,
          type: 'sine',
        });
      }

      // Occasional magical futuristic 3-note crystal sparkle cascade
      if (chord.sparkleMidis && chord.sparkleMidis.length > 0) {
        chord.sparkleMidis.forEach((spMidi, spIdx) => {
          this.scheduleMusicNote({
            ctx,
            destination: bus,
            freq: midiToFreq(spMidi),
            startTime:
              stepStartTime +
              EIGHTH_NOTE_DURATION_SEC * 5 +
              spIdx * (EIGHTH_NOTE_DURATION_SEC * 0.38),
            duration: EIGHTH_NOTE_DURATION_SEC * 1.4,
            peakGain: 0.015,
            attackSec: 0.012,
            releaseSec: 0.26,
            type: 'sine',
          });
        });
      }
    }

    // 2. Bouncy Melodic Synth Bass Groove (follows section.bassPattern)
    const bassAction = section.bassPattern[stepInBar % section.bassPattern.length] ?? 0;
    if (bassAction > 0) {
      const targetBassMidi =
        bassAction === 1
          ? chord.bassMidi
          : bassAction === 2
          ? chord.bassMidi + 12
          : chord.fifthBassMidi;
      const isRootDownbeat = stepInBar === 0;
      this.scheduleMusicNote({
        ctx,
        destination: bus,
        freq: midiToFreq(targetBassMidi),
        startTime: stepStartTime,
        duration: EIGHTH_NOTE_DURATION_SEC * (isRootDownbeat ? 2.4 : 1.15),
        peakGain: isRootDownbeat ? 0.072 : 0.048,
        attackSec: 0.025,
        releaseSec: 0.16,
        type: bassAction === 2 ? 'triangle' : 'sine',
        filterCutoffHz: 520,
      });
    }

    // 3. Playful Marimba / Synth-Pluck Arpeggiator (every eighth-note step)
    const arpMidi = chord.arpMidis[stepInBar % chord.arpMidis.length];
    const pulseVel =
      section.pulsePattern[stepInBar % section.pulsePattern.length] ?? 0.6;
    if (typeof arpMidi === 'number' && pulseVel > 0) {
      this.scheduleMusicNote({
        ctx,
        destination: bus,
        freq: midiToFreq(arpMidi),
        startTime: stepStartTime,
        duration: EIGHTH_NOTE_DURATION_SEC * 0.56,
        peakGain: 0.042 * pulseVel,
        attackSec: 0.01,
        releaseSec: 0.13,
        type: 'triangle',
        filterCutoffHz: 1950 + (stepInBar % 4) * 180,
      });
    }

    // 4. Whisper-Light Futuristic Percussion Pulse
    const percAction =
      section.percussionPattern[stepInBar % section.percussionPattern.length] ?? 0;
    this.scheduleSoftPercussionStep(ctx, bus, percAction, stepStartTime);

    // 5. Playful, Memorable Electronic Lead & Celesta Melody
    const melodyNote = section.melodySteps[stepInSection];
    if (melodyNote) {
      const melFreq = midiToFreq(melodyNote.midi);
      const melDuration =
        EIGHTH_NOTE_DURATION_SEC * Math.max(0.7, melodyNote.durationSteps * 0.85);
      const accent = melodyNote.accent ?? 0.85;
      const voice = melodyNote.voice ?? 'bell';

      if (voice === 'celesta') {
        // Sparkling celesta bell + octave overtone
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq,
          startTime: stepStartTime,
          duration: melDuration * 0.9,
          peakGain: 0.064 * accent,
          attackSec: 0.008,
          releaseSec: 0.28,
          type: 'sine',
        });
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq * 2,
          startTime: stepStartTime,
          duration: melDuration * 0.45,
          peakGain: 0.018 * accent,
          attackSec: 0.006,
          releaseSec: 0.16,
          type: 'sine',
        });
      } else if (voice === 'flute') {
        // Warm airy synth flute
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq,
          startTime: stepStartTime,
          duration: melDuration,
          peakGain: 0.062 * accent,
          attackSec: 0.045,
          releaseSec: 0.24,
          type: 'triangle',
          filterCutoffHz: 1850,
        });
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq,
          startTime: stepStartTime,
          duration: melDuration * 0.95,
          peakGain: 0.032 * accent,
          attackSec: 0.05,
          releaseSec: 0.22,
          type: 'sine',
          detuneCents: 5,
        });
      } else {
        // Playful crystal synth-bell lead
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq,
          startTime: stepStartTime,
          duration: melDuration,
          peakGain: 0.066 * accent,
          attackSec: 0.014,
          releaseSec: 0.24,
          type: 'sine',
        });
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: melFreq,
          startTime: stepStartTime,
          duration: melDuration * 0.8,
          peakGain: 0.028 * accent,
          attackSec: 0.018,
          releaseSec: 0.18,
          type: 'triangle',
          detuneCents: -6,
          filterCutoffHz: 2400,
        });
      }

      // Optional sweet sixth/third harmony note on key motif peaks
      if (typeof melodyNote.harmonyMidi === 'number') {
        this.scheduleMusicNote({
          ctx,
          destination: bus,
          freq: midiToFreq(melodyNote.harmonyMidi),
          startTime: stepStartTime + 0.012,
          duration: melDuration * 0.88,
          peakGain: 0.028 * accent,
          attackSec: 0.025,
          releaseSec: 0.22,
          type: 'sine',
        });
      }
    }
  }

  private runMusicSchedulerTick = (): void => {
    if (!this.isAmbientPlaying || !this.canPlayMusic()) {
      return;
    }

    if (!this.ctx || !this.ambientGain) {
      // Headless / test environment without Web Audio context: still advance step counter cleanly
      this.scheduleSingleMusicStep(this.currentMusicStep, 0);
      this.currentMusicStep =
        (this.currentMusicStep + 1) % TOTAL_ARRANGEMENT_STEPS;
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const lookaheadWindowSec = 0.35;

    // Guard against large timer gaps (e.g. background tab wakeup)
    if (this.nextStepAudioTime < now - 0.15) {
      this.nextStepAudioTime = now + 0.04;
    }

    while (this.nextStepAudioTime < now + lookaheadWindowSec) {
      this.scheduleSingleMusicStep(
        this.currentMusicStep,
        this.nextStepAudioTime
      );
      this.nextStepAudioTime += EIGHTH_NOTE_DURATION_SEC;
      this.currentMusicStep =
        (this.currentMusicStep + 1) % TOTAL_ARRANGEMENT_STEPS;
    }
  };

  private startAmbientPad(): void {
    if (!this.canPlayMusic()) {
      this.stopAmbientPadImmediate();
      return;
    }
    // Prevent duplicate playback instances
    if (this.isAmbientPlaying) return;

    if (this.ambientStopTimer) {
      clearTimeout(this.ambientStopTimer);
      this.ambientStopTimer = null;
    }
    if (this.musicSchedulerTimer) {
      clearInterval(this.musicSchedulerTimer);
      this.musicSchedulerTimer = null;
    }

    this.isAmbientPlaying = true;
    this.activeMusicSchedulerCount = 1;

    const ctx = this.ensureContext();
    if (ctx) {
      try {
        const now = ctx.currentTime;
        const musicMult = this.getEffectiveMusicMultiplier();
        const targetGain = Math.max(0.0005, 0.22 * musicMult);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0005, now);
        masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.75);

        let destinationNode: AudioNode = masterGain;
        if (typeof ctx.createBiquadFilter === 'function') {
          const warmFilter = ctx.createBiquadFilter();
          warmFilter.type = 'lowpass';
          warmFilter.frequency.setValueAtTime(2800, now);
          warmFilter.connect(masterGain);
          this.musicFilterNode = warmFilter;
          destinationNode = warmFilter;
        }

        masterGain.connect(ctx.destination);
        this.ambientGain = masterGain;
        this.activeMusicNodes.add(masterGain);
        if (destinationNode !== masterGain) {
          this.activeMusicNodes.add(destinationNode);
        }

        this.nextStepAudioTime = now + 0.05;
      } catch {
        // Ignore autoplay restrictions until next user gesture
      }
    }

    // Schedule initial lookahead window immediately
    this.runMusicSchedulerTick();

    // Start single lookahead scheduler interval (110ms)
    this.musicSchedulerTimer = setInterval(this.runMusicSchedulerTick, 110);
    if (
      this.musicSchedulerTimer &&
      typeof (this.musicSchedulerTimer as { unref?: () => void }).unref ===
        'function'
    ) {
      (this.musicSchedulerTimer as { unref: () => void }).unref();
    }
  }

  private stopAmbientPadImmediate(): void {
    if (this.ambientStopTimer) {
      clearTimeout(this.ambientStopTimer);
      this.ambientStopTimer = null;
    }
    if (this.musicSchedulerTimer) {
      clearInterval(this.musicSchedulerTimer);
      this.musicSchedulerTimer = null;
    }

    for (const node of this.activeMusicNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
      } catch {
        // Already stopped
      }
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect error
      }
    }
    this.activeMusicNodes.clear();

    try {
      this.musicFilterNode?.disconnect();
      this.ambientGain?.disconnect();
    } catch {
      // Already disconnected
    }

    this.musicFilterNode = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
    this.activeMusicSchedulerCount = 0;
  }

  private stopAmbientPad(): void {
    if (!this.isAmbientPlaying) return;

    if (this.musicSchedulerTimer) {
      clearInterval(this.musicSchedulerTimer);
      this.musicSchedulerTimer = null;
    }
    this.activeMusicSchedulerCount = 0;

    if (!this.ctx || !this.ambientGain) {
      this.stopAmbientPadImmediate();
      return;
    }

    this.isAmbientPlaying = false;
    try {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.18);
      this.ambientStopTimer = setTimeout(() => {
        this.stopAmbientPadImmediate();
      }, 200);
      if (
        this.ambientStopTimer &&
        typeof (this.ambientStopTimer as { unref?: () => void }).unref ===
          'function'
      ) {
        (this.ambientStopTimer as { unref: () => void }).unref();
      }
    } catch {
      this.stopAmbientPadImmediate();
    }
  }

  public dispose(): void {
    this.stopAmbientPadImmediate();
    this.currentMusicStep = 0;
    if (this.ctx) {
      try {
        this.ctx.close().catch(() => {});
      } catch {
        // Ignore close errors
      }
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
