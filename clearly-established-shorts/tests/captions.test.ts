import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { alignScratch, alignWithEnergy } from '../src/lib/alignment.js';
import {
  activeWordIndex,
  buildPlates,
  plateSizes,
  plateText,
  toSrt,
  toVtt,
} from '../src/lib/captions.js';
import { normalizeText, parseScript } from '../src/lib/script.js';
import { decodePcm } from '../src/lib/wav.js';

const FIX = path.join(import.meta.dirname, 'fixtures', 'episodes', '900-fixture-take');
const script = parseScript(readFileSync(path.join(FIX, 'script.approved.txt'), 'utf8'));
const alignment = alignWithEnergy(
  decodePcm(path.join(FIX, 'audio', 'take.wav'), 16000),
  script.lines,
);

describe('plates', () => {
  test('sizes are two or three, never more, with a lone one only for a one-word line', () => {
    expect(plateSizes(1)).toEqual([1]);
    expect(plateSizes(2)).toEqual([2]);
    expect(plateSizes(3)).toEqual([3]);
    expect(plateSizes(4)).toEqual([2, 2]);
    expect(plateSizes(5)).toEqual([3, 2]);
    expect(plateSizes(7)).toEqual([3, 2, 2]);
    expect(plateSizes(10)).toEqual([3, 3, 2, 2]);
    for (let n = 2; n < 40; n++) for (const s of plateSizes(n)) expect(s).toBeGreaterThanOrEqual(2);
    for (let n = 1; n < 40; n++) {
      const sizes = plateSizes(n);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      for (const s of sizes) expect(s).toBeLessThanOrEqual(3);
    }
  });

  test('caption text equals the approved script byte for byte after normalisation', () => {
    const plates = buildPlates(alignment, script.lines);
    for (const p of plates) expect(p.words.length).toBeLessThanOrEqual(3);
    expect(plateText(plates)).toEqual(script.lines.map(normalizeText));
    const joined = plates.flatMap((p) => p.words.map((w) => w.text)).join(' ');
    expect(Buffer.from(normalizeText(joined))).toEqual(
      Buffer.from(normalizeText(script.lines.join(' '))),
    );
  });

  test('plates are in order, hold to the next plate, and never overlap', () => {
    const plates = buildPlates(alignment, script.lines);
    for (let i = 1; i < plates.length; i++) {
      expect(plates[i]!.start).toBeGreaterThanOrEqual(plates[i - 1]!.end - 1e-6);
    }
  });

  test('the active word follows time', () => {
    const plates = buildPlates(alignment, script.lines);
    const p = plates[0]!;
    expect(activeWordIndex(p, p.words[0]!.start - 0.01)).toBe(-1);
    expect(activeWordIndex(p, p.words[0]!.start)).toBe(0);
    expect(activeWordIndex(p, p.words[p.words.length - 1]!.start + 0.01)).toBe(p.words.length - 1);
  });

  test('scratch mode yields a labelled placeholder per planned line and no script text', () => {
    const plates = buildPlates(alignScratch([2, 2], 0.8), []);
    expect(plates.map((p) => p.placeholder)).toEqual([
      'AWAITING TAKE · LINE 1',
      'AWAITING TAKE · LINE 2',
    ]);
    expect(plates.every((p) => p.words.length === 0)).toBe(true);
  });
});

describe('sidecars', () => {
  const plates = buildPlates(alignment, script.lines);

  test('srt is numbered with comma timestamps', () => {
    const srt = toSrt(plates);
    expect(srt.startsWith('1\n00:00:0')).toBe(true);
    expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
    expect(srt.split('\n\n').length).toBe(plates.length);
  });

  test('vtt carries the header and dot timestamps and the same cue text', () => {
    const vtt = toVtt(plates, 0, 'test');
    expect(vtt.startsWith('WEBVTT\n\nNOTE test\n\n')).toBe(true);
    expect(vtt).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3} --> /);
    const srtText = toSrt(plates)
      .split('\n')
      .filter((l) => l && !/^\d+$/.test(l) && !l.includes('-->'));
    const vttText = vtt
      .split('\n')
      .filter((l) => l && !l.includes('-->') && l !== 'WEBVTT' && !l.startsWith('NOTE'));
    expect(vttText).toEqual(srtText);
  });

  test('an offset shifts every cue (the gate slate)', () => {
    const shifted = toSrt(plates, 2);
    const first = /(\d{2}):(\d{2}):(\d{2}),(\d{3})/.exec(shifted)!;
    const seconds = +first[3]! + +first[4]! / 1000;
    expect(seconds).toBeCloseTo(plates[0]!.start + 2, 2);
  });
});
