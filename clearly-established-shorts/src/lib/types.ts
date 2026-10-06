/**
 * Shared types for the data the composition renders from. Browser-safe: this
 * file imports nothing from Node.
 */
import type { GateDecision } from './gate.js';
import type {
  Beat,
  BrandConfig,
  Card,
  EpisodeSpec,
  RigConfig,
  SafeZone,
  SeriesConfig,
  Viseme,
} from './schema.js';

export interface LineTiming {
  line: number;
  start: number;
  end: number;
}

export interface WordTiming {
  /** 1-based script line. */
  line: number;
  /** 0-based index within the line. */
  index: number;
  text: string;
  start: number;
  end: number;
}

export type AlignmentBackend = 'scratch-plan' | 'whisper' | 'energy';

export interface Alignment {
  backend: AlignmentBackend;
  lines: LineTiming[];
  words: WordTiming[];
  /** Per line, 0..1. */
  confidence: number[];
  notes: string[];
}

export type LipsyncBackend = 'rhubarb' | 'amplitude';

export interface MouthCue {
  start: number;
  end: number;
  value: Viseme;
}

export interface Lipsync {
  backend: LipsyncBackend;
  cues: MouthCue[];
}

export interface CaptionPlate {
  start: number;
  end: number;
  words: WordTiming[];
  /** Set in scratch mode, when there is no approved text to show. */
  placeholder?: string;
}

export interface ResolvedBeat extends Beat {
  seconds: number;
}

export interface ResolvedCard extends Card {
  seconds: number;
}

export interface EndCardTiming {
  /** Seconds. The title lockup begins here (the spec's title card anchor). */
  titleStart: number;
  writtenByStart: number;
  companyStart: number;
  /** Seconds. End of the episode, before any gate slate. */
  end: number;
}

export interface RigBundle {
  config: RigConfig;
  svg: string;
}

export type Typeface = 'Georgia' | 'Gelasio';

export interface EpisodeRenderData {
  kind: 'episode';
  folder: string;
  spec: EpisodeSpec;
  mode: 'scratch' | 'take';
  fps: number;
  width: number;
  height: number;
  /** Frames including the gate slate when the gate is closed. */
  durationInFrames: number;
  /** Frames of slate before the episode begins (0 when clean). */
  slateFrames: number;
  takeEnd: number;
  typeface: Typeface;
  gate: GateDecision;
  brand: BrandConfig;
  series: SeriesConfig;
  /** The union of every preset's safe zone. */
  safeZone: SafeZone;
  alignment: Alignment;
  lipsync: Lipsync;
  captions: CaptionPlate[];
  beats: ResolvedBeat[];
  cards: ResolvedCard[];
  endCard: EndCardTiming;
  rigs: Record<string, RigBundle>;
  lockup: { available: boolean; file: string };
  /** Render only caption plates and cards as solid magenta on black, for the safe-zone probe. */
  probeMask?: boolean;
}

export interface EmptyRenderData {
  kind: 'empty';
}

export type RootProps = EpisodeRenderData | EmptyRenderData;
