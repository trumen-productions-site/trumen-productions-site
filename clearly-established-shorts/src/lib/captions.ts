/**
 * Captions: two to three words per plate, text from the approved script only,
 * timed from the alignment. Plus .srt and .vtt sidecars.
 */
import { normalizeText, wordsOf } from './script.js';
import { round3 } from './timing.js';
import type { Alignment, CaptionPlate, LineTiming, WordTiming } from './types.js';

/** Split n words into groups of 2–3 (a lone 1 only when the line itself is one word). */
export function plateSizes(n: number, max = 3, min = 2): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n <= max) return [n];
  const sizes: number[] = [];
  let left = n;
  while (left > 0) {
    if (left === max + 1 && min < max) {
      sizes.push(min, min);
      left = 0;
    } else {
      const take = Math.min(max, left);
      sizes.push(take);
      left -= take;
    }
  }
  return sizes;
}

export function buildPlates(
  alignment: Alignment,
  scriptLines: string[],
  max = 3,
  min = 2,
): CaptionPlate[] {
  if (alignment.words.length === 0) {
    // Scratch mode: one placeholder plate per planned line.
    return alignment.lines.map((l) => ({
      start: l.start,
      end: l.end,
      words: [],
      placeholder: `AWAITING TAKE · LINE ${l.line}`,
    }));
  }
  const plates: CaptionPlate[] = [];
  scriptLines.forEach((line, li) => {
    const words = alignment.words.filter((w) => w.line === li + 1);
    const expected = wordsOf(line);
    if (words.length !== expected.length) {
      throw new Error(
        `line ${li + 1}: alignment has ${words.length} words but the script has ${expected.length}`,
      );
    }
    let cursor = 0;
    for (const size of plateSizes(words.length, max, min)) {
      const group = words.slice(cursor, cursor + size);
      cursor += size;
      plates.push({ start: group[0]!.start, end: group[group.length - 1]!.end, words: group });
    }
  });
  // Hold each plate until the next begins, up to 0.6 s, so captions do not flicker between words.
  for (let i = 0; i < plates.length - 1; i++) {
    const gap = plates[i + 1]!.start - plates[i]!.end;
    if (gap > 0) plates[i]!.end = round3(plates[i]!.end + Math.min(gap, 0.6));
  }
  return plates;
}

/** The caption text, reassembled. Must equal the normalised script. */
export function plateText(plates: CaptionPlate[]): string[] {
  const byLine = new Map<number, string[]>();
  for (const p of plates)
    for (const w of p.words) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w.text]);
  return [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, ws]) => normalizeText(ws.join(' ')));
}

export function activeWordIndex(plate: CaptionPlate, seconds: number): number {
  let active = -1;
  plate.words.forEach((w, i) => {
    if (seconds >= w.start) active = i;
  });
  return active;
}

// ── Sidecars ────────────────────────────────────────────────────────────

function stamp(seconds: number, sep: ',' | '.'): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(r, 3)}`;
}

export function cueText(plate: CaptionPlate): string {
  return plate.placeholder ?? plate.words.map((w) => w.text).join(' ');
}

/** Offset (seconds) shifts every cue, e.g. by the gate slate. */
export function toSrt(plates: CaptionPlate[], offset = 0): string {
  return (
    plates
      .map(
        (p, i) =>
          `${i + 1}\n${stamp(p.start + offset, ',')} --> ${stamp(p.end + offset, ',')}\n${cueText(p)}`,
      )
      .join('\n\n') + '\n'
  );
}

export function toVtt(plates: CaptionPlate[], offset = 0, note?: string): string {
  const head = ['WEBVTT', note ? `NOTE ${note}` : null].filter(Boolean).join('\n\n');
  const body = plates
    .map((p) => `${stamp(p.start + offset, '.')} --> ${stamp(p.end + offset, '.')}\n${cueText(p)}`)
    .join('\n\n');
  return `${head}\n\n${body}\n`;
}

export function linesFromWords(words: WordTiming[]): LineTiming[] {
  const map = new Map<number, LineTiming>();
  for (const w of words) {
    const l = map.get(w.line);
    if (!l) map.set(w.line, { line: w.line, start: w.start, end: w.end });
    else {
      l.start = Math.min(l.start, w.start);
      l.end = Math.max(l.end, w.end);
    }
  }
  return [...map.values()].sort((a, b) => a.line - b.line);
}
