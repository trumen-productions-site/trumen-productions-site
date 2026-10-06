/**
 * Forced alignment: the approved script's words → moments in the take.
 *
 * Three backends, chosen in this order:
 *   scratch-plan  no take yet; timings come from the spec's scratchLines
 *   whisper       whisper.cpp word timestamps (tools/whisper), matched to the
 *                 script words by sequence alignment. Recognition is used for
 *                 TIMING ONLY. Caption text is always the approved script.
 *   energy        always available: speech segments from the RMS envelope,
 *                 one segment per line, words spread by syllable weight.
 *
 * If a line's confidence falls below the threshold the build stops and names
 * the line. It never substitutes recognised text.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { matchKey, wordsOf } from './script.js';
import { scratchTimings, round3 } from './timing.js';
import { TOOLS_DIR } from './paths.js';
import type { Alignment, LineTiming, WordTiming } from './types.js';
import { decodePcm, rmsEnvelope, type Pcm } from './wav.js';

export const CONFIDENCE_THRESHOLD = 0.6;

export class AlignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlignmentError';
  }
}

// ── Syllables ───────────────────────────────────────────────────────────

/** A rough syllable count, good enough to weight words inside a line. */
export function syllables(word: string): number {
  const w = matchKey(word);
  if (!w) return 1;
  if (/^\d+$/.test(w)) return Math.max(1, w.length);
  const groups = w.replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Spread a line's words across [start, end] by syllable weight. */
export function spreadWords(
  lineNo: number,
  words: string[],
  start: number,
  end: number,
): WordTiming[] {
  const weights = words.map((w) => syllables(w) + 0.35);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  return words.map((text, index) => {
    const dur = ((end - start) * (weights[index] ?? 1)) / total;
    const wt: WordTiming = { line: lineNo, index, text, start: round3(t), end: round3(t + dur) };
    t += dur;
    return wt;
  });
}

// ── Scratch plan ────────────────────────────────────────────────────────

export function alignScratch(scratchLines: number[], gapSeconds: number): Alignment {
  const lines = scratchTimings(scratchLines, gapSeconds);
  return {
    backend: 'scratch-plan',
    lines,
    words: [],
    confidence: lines.map(() => 1),
    notes: [
      'scratch track: timings come from scratchLines in episode.json; there is no approved text yet',
    ],
  };
}

// ── Energy ──────────────────────────────────────────────────────────────

export interface Segment {
  start: number;
  end: number;
}

/** Speech segments from the RMS envelope. Pure; tested on synthetic envelopes. */
export function segmentsFromEnvelope(
  env: Float32Array,
  windowSeconds: number,
  opts = { minGap: 0.5, minSegment: 0.15 },
): Segment[] {
  const sorted = Array.from(env).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const peak = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  if (peak <= 1e-5) return [];
  const threshold = floor + (peak - floor) * 0.18;
  const raw: Segment[] = [];
  let open: Segment | null = null;
  env.forEach((v, i) => {
    const t = i * windowSeconds;
    if (v > threshold) {
      if (!open) open = { start: t, end: t + windowSeconds };
      else open.end = t + windowSeconds;
    } else if (open) {
      raw.push(open);
      open = null;
    }
  });
  if (open) raw.push(open);
  // Merge segments separated by less than minGap, then drop shards.
  const merged: Segment[] = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (last && s.start - last.end < opts.minGap) last.end = s.end;
    else merged.push({ ...s });
  }
  return merged
    .filter((s) => s.end - s.start >= opts.minSegment)
    .map((s) => ({ start: round3(s.start), end: round3(s.end) }));
}

/** Fit `count` segments to `lines` by merging the closest pairs or splitting the longest. Returns [segments, confidence penalty]. */
export function fitSegmentsToLines(
  segments: Segment[],
  lineWeights: number[],
): { segments: Segment[]; penalty: number } {
  const target = lineWeights.length;
  const segs = segments.map((s) => ({ ...s }));
  let penalty = 0;
  while (segs.length > target && segs.length > 1) {
    let best = 0;
    let bestGap = Infinity;
    for (let i = 0; i < segs.length - 1; i++) {
      const gap = (segs[i + 1]?.start ?? 0) - (segs[i]?.end ?? 0);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    segs[best]!.end = segs[best + 1]!.end;
    segs.splice(best + 1, 1);
    penalty += 0.15;
  }
  while (segs.length < target && segs.length > 0) {
    let longest = 0;
    for (let i = 1; i < segs.length; i++) {
      if (segs[i]!.end - segs[i]!.start > segs[longest]!.end - segs[longest]!.start) longest = i;
    }
    const s = segs[longest]!;
    const mid = s.start + (s.end - s.start) / 2;
    segs.splice(
      longest,
      1,
      { start: s.start, end: round3(mid - 0.05) },
      { start: round3(mid + 0.05), end: s.end },
    );
    penalty += 0.3;
  }
  return { segments: segs, penalty };
}

export function alignWithEnergy(pcm: Pcm, scriptLines: string[]): Alignment {
  const window = 0.02;
  const env = rmsEnvelope(pcm, window);
  const detected = segmentsFromEnvelope(env, window);
  if (detected.length === 0)
    throw new AlignmentError('the take contains no speech the energy aligner can find');
  const weights = scriptLines.map((l) => wordsOf(l).reduce((a, w) => a + syllables(w), 0));
  const { segments, penalty } = fitSegmentsToLines(detected, weights);
  const lines: LineTiming[] = segments.map((s, i) => ({ line: i + 1, start: s.start, end: s.end }));
  const words = lines.flatMap((l) =>
    spreadWords(l.line, wordsOf(scriptLines[l.line - 1] ?? ''), l.start, l.end),
  );
  const confidence = lines.map(() => Math.max(0, 1 - penalty));
  const notes = [
    `energy aligner: ${detected.length} speech segment${detected.length === 1 ? '' : 's'} found for ${scriptLines.length} line${scriptLines.length === 1 ? '' : 's'}`,
  ];
  if (penalty > 0)
    notes.push(
      `segments were ${detected.length > scriptLines.length ? 'merged' : 'split'} to fit; confidence reduced to ${(1 - penalty).toFixed(2)}`,
    );
  return { backend: 'energy', lines, words, confidence, notes };
}

// ── whisper.cpp ─────────────────────────────────────────────────────────

export interface WhisperToken {
  text: string;
  offsets: { from: number; to: number };
  p?: number;
}
export interface WhisperJson {
  transcription: Array<{
    text: string;
    offsets: { from: number; to: number };
    tokens?: WhisperToken[];
  }>;
}

export interface WhisperTools {
  cli: string;
  model: string;
}

export function findWhisper(toolsDir = TOOLS_DIR): WhisperTools | null {
  const cli = path.join(toolsDir, 'whisper', 'build', 'bin', 'whisper-cli');
  const model = path.join(toolsDir, 'whisper', 'ggml-tiny.en.bin');
  if (existsSync(cli) && existsSync(model) && readFileSync(model).length > 1_000_000)
    return { cli, model };
  return null;
}

/** Recognised words with times, from whisper's token-level JSON. Sub-word tokens are joined. */
export function wordsFromWhisper(
  json: WhisperJson,
): Array<{ key: string; start: number; end: number }> {
  const out: Array<{ key: string; start: number; end: number }> = [];
  for (const seg of json.transcription) {
    let current: { key: string; start: number; end: number } | null = null;
    for (const tok of seg.tokens ?? []) {
      if (/^\[_.*\]$/.test(tok.text)) continue; // [_BEG_], [_TT_...]
      const key = matchKey(tok.text);
      if (key === '') continue; // punctuation carries no timing of its own
      const startsWord = tok.text.startsWith(' ') || current === null;
      if (startsWord) {
        if (current && current.key) out.push(current);
        current = { key, start: tok.offsets.from / 1000, end: tok.offsets.to / 1000 };
      } else if (current) {
        current.key += key;
        current.end = tok.offsets.to / 1000;
      }
    }
    if (current && current.key) out.push(current);
  }
  return out.filter((w) => w.key.length > 0);
}

/**
 * Needleman–Wunsch over script words vs recognised words. Returns, for each
 * script word, the index of the recognised word it matched, or -1.
 */
export function alignSequences(script: string[], recognised: string[]): number[] {
  const n = script.length;
  const m = recognised.length;
  const MATCH = 2;
  const GAP = -1;
  const MISMATCH = -1;
  const score = (a: string, b: string) => {
    if (a === b) return MATCH;
    if (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a))) return 1;
    return MISMATCH;
  };
  const H: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) H[i]![0] = i * GAP;
  for (let j = 1; j <= m; j++) H[0]![j] = j * GAP;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = H[i - 1]![j - 1]! + score(script[i - 1]!, recognised[j - 1]!);
      const up = H[i - 1]![j]! + GAP;
      const left = H[i]![j - 1]! + GAP;
      H[i]![j] = Math.max(diag, up, left);
    }
  }
  const result = new Array<number>(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const here = H[i]![j]!;
    const s = score(script[i - 1]!, recognised[j - 1]!);
    if (here === H[i - 1]![j - 1]! + s) {
      if (s > 0) result[i - 1] = j - 1;
      i--;
      j--;
    } else if (here === H[i - 1]![j]! + GAP) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

/** Build word timings from a whisper result and the script. Pure; tested on a fixture JSON. */
export function alignFromWhisperJson(
  json: WhisperJson,
  scriptLines: string[],
  takeEnd: number,
): Alignment {
  const recognised = wordsFromWhisper(json);
  const scriptWords = scriptLines.flatMap((line, li) =>
    wordsOf(line).map((text, index) => ({ line: li + 1, index, text, key: matchKey(text) })),
  );
  const matches = alignSequences(
    scriptWords.map((w) => w.key),
    recognised.map((w) => w.key),
  );
  // Matched words take their recognised time; the rest are interpolated between neighbours.
  const starts: Array<number | null> = scriptWords.map((_, i) =>
    matches[i]! >= 0 ? recognised[matches[i]!]!.start : null,
  );
  const ends: Array<number | null> = scriptWords.map((_, i) =>
    matches[i]! >= 0 ? recognised[matches[i]!]!.end : null,
  );
  const interpolate = (arr: Array<number | null>, first: number, last: number) => {
    const out = arr.slice();
    let i = 0;
    while (i < out.length) {
      if (out[i] !== null) {
        i++;
        continue;
      }
      let j = i;
      while (j < out.length && out[j] === null) j++;
      const a = i === 0 ? first : (out[i - 1] as number);
      const b = j >= out.length ? last : (out[j] as number);
      for (let k = i; k < j; k++) out[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
      i = j;
    }
    return out as number[];
  };
  const s = interpolate(starts, 0, takeEnd);
  const e = interpolate(ends, 0, takeEnd);
  const words: WordTiming[] = scriptWords.map((w, i) => ({
    line: w.line,
    index: w.index,
    text: w.text,
    start: round3(s[i]!),
    end: round3(Math.max(s[i]!, e[i]!)),
  }));
  const lines: LineTiming[] = scriptLines.map((_, li) => {
    const ws = words.filter((w) => w.line === li + 1);
    return { line: li + 1, start: ws[0]?.start ?? 0, end: ws[ws.length - 1]?.end ?? 0 };
  });
  const confidence = scriptLines.map((_, li) => {
    const idx = scriptWords.map((w, i) => (w.line === li + 1 ? i : -1)).filter((i) => i >= 0);
    const matched = idx.filter((i) => matches[i]! >= 0).length;
    return idx.length === 0 ? 0 : matched / idx.length;
  });
  const total = matches.filter((m) => m >= 0).length;
  return {
    backend: 'whisper',
    lines,
    words,
    confidence,
    notes: [
      `whisper.cpp: ${total} of ${scriptWords.length} script words matched to recognised speech (timing only)`,
    ],
  };
}

export function runWhisper(wavFile: string, tools: WhisperTools): WhisperJson {
  const dir = mkdtempSync(path.join(tmpdir(), 'ce-whisper-'));
  try {
    const wav16 = path.join(dir, 'take16.wav');
    const conv = spawnSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-i',
      wavFile,
      '-ac',
      '1',
      '-ar',
      '16000',
      wav16,
    ]);
    if (conv.status !== 0)
      throw new AlignmentError(
        `ffmpeg failed preparing audio for whisper: ${conv.stderr.toString()}`,
      );
    const outBase = path.join(dir, 'take');
    const run = spawnSync(
      tools.cli,
      ['-m', tools.model, '-f', wav16, '-ojf', '-of', outBase, '-ml', '1', '-sow', '-nt'],
      { encoding: 'utf8' },
    );
    if (run.status !== 0) throw new AlignmentError(`whisper-cli failed: ${run.stderr}`);
    return JSON.parse(readFileSync(`${outBase}.json`, 'utf8')) as WhisperJson;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Entry point ─────────────────────────────────────────────────────────

export function alignTake(wavFile: string, scriptLines: string[], toolsDir = TOOLS_DIR): Alignment {
  if (scriptLines.length === 0) {
    throw new AlignmentError(
      'a take exists but script.approved.txt has no lines; type the words exactly as spoken before rendering',
    );
  }
  const pcm = decodePcm(wavFile, 16000);
  const whisper = findWhisper(toolsDir);
  const alignment = whisper
    ? alignFromWhisperJson(runWhisper(wavFile, whisper), scriptLines, pcm.durationSeconds)
    : alignWithEnergy(pcm, scriptLines);
  assertConfident(alignment, scriptLines);
  return alignment;
}

export function assertConfident(
  alignment: Alignment,
  scriptLines: string[],
  threshold = CONFIDENCE_THRESHOLD,
): void {
  const low = alignment.confidence.map((c, i) => ({ c, i })).filter(({ c }) => c < threshold);
  if (low.length > 0) {
    const first = low[0]!;
    throw new AlignmentError(
      `alignment confidence for line ${first.i + 1} is ${first.c.toFixed(2)} (threshold ${threshold}): "${scriptLines[first.i] ?? ''}". ` +
        `The build stops rather than guess. Re-record with a clear pause between lines, or check that the typed line matches what was spoken.`,
    );
  }
}
