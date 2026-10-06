/**
 * Anchors → seconds.
 *
 * Beats and cards anchor to script lines ("line:3"), to absolute seconds, or
 * to the end of the take ("end-2.5"). Line anchors resolve from the alignment,
 * so re-recording a take re-times the whole episode with no spec edits.
 */
import type { Anchor } from './schema.js';

export interface LineTiming {
  /** 1-based line number. */
  line: number;
  start: number;
  end: number;
}

export interface TimingContext {
  lines: LineTiming[];
  /** Seconds. The end of the take audio. */
  takeEnd: number;
}

export class TimingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimingError';
  }
}

export function resolveAnchor(anchor: Anchor, ctx: TimingContext): number {
  if (/^\d/.test(anchor)) {
    return Number.parseFloat(anchor);
  }
  if (anchor.startsWith('line:')) {
    const m = /^line:(\d+)(\.end)?$/.exec(anchor);
    if (!m) throw new TimingError(`bad line anchor "${anchor}"`);
    const n = Number.parseInt(m[1] ?? '0', 10);
    const line = ctx.lines.find((l) => l.line === n);
    if (!line) {
      throw new TimingError(
        `anchor "${anchor}" refers to line ${n}, but the take has ${ctx.lines.length} line${ctx.lines.length === 1 ? '' : 's'}`,
      );
    }
    return m[2] ? line.end : line.start;
  }
  if (anchor.startsWith('end')) {
    const m = /^end(?:([-+])(\d+(?:\.\d+)?))?$/.exec(anchor);
    if (!m) throw new TimingError(`bad end anchor "${anchor}"`);
    const offset = m[2] ? Number.parseFloat(m[2]) : 0;
    const t = m[1] === '+' ? ctx.takeEnd + offset : ctx.takeEnd - offset;
    if (t < 0)
      throw new TimingError(
        `anchor "${anchor}" resolves before the start of the take (${t.toFixed(2)}s)`,
      );
    return t;
  }
  throw new TimingError(`unrecognised anchor "${anchor}"`);
}

export function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Line timings for a scratch track: each placeholder line runs for its planned
 * length, separated by the series line gap, after a short lead-in.
 */
export function scratchTimings(
  scratchLines: number[],
  gapSeconds: number,
  leadInSeconds = 0.4,
): LineTiming[] {
  const lines: LineTiming[] = [];
  let t = leadInSeconds;
  scratchLines.forEach((seconds, i) => {
    lines.push({ line: i + 1, start: round3(t), end: round3(t + seconds) });
    t += seconds + gapSeconds;
  });
  return lines;
}

export function scratchDuration(
  scratchLines: number[],
  gapSeconds: number,
  leadInSeconds = 0.4,
  tailSeconds = 0.6,
): number {
  const lines = scratchTimings(scratchLines, gapSeconds, leadInSeconds);
  const last = lines[lines.length - 1];
  return round3((last?.end ?? leadInSeconds) + tailSeconds);
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
