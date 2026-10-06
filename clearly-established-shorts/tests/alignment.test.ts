import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  AlignmentError,
  alignFromWhisperJson,
  alignScratch,
  alignSequences,
  alignTake,
  alignWithEnergy,
  assertConfident,
  fitSegmentsToLines,
  segmentsFromEnvelope,
  spreadWords,
  syllables,
  wordsFromWhisper,
  type WhisperJson,
} from '../src/lib/alignment.js';
import { parseScript } from '../src/lib/script.js';
import { decodePcm } from '../src/lib/wav.js';

const FIX = path.join(import.meta.dirname, 'fixtures', 'episodes', '900-fixture-take');
const script = parseScript(readFileSync(path.join(FIX, 'script.approved.txt'), 'utf8'));
const TAKE = path.join(FIX, 'audio', 'take.wav');

describe('scratch plan', () => {
  test('one line per planned length, separated by the gap', () => {
    const a = alignScratch([2.0, 3.0], 0.8);
    expect(a.backend).toBe('scratch-plan');
    expect(a.lines).toEqual([
      { line: 1, start: 0.4, end: 2.4 },
      { line: 2, start: 3.2, end: 6.2 },
    ]);
    expect(a.words).toEqual([]);
  });
});

describe('energy aligner', () => {
  test('finds speech segments in a synthetic envelope', () => {
    const env = new Float32Array(500).fill(0.002);
    for (let i = 20; i < 120; i++) env[i] = 0.2;
    for (let i = 160; i < 300; i++) env[i] = 0.25;
    for (let i = 400; i < 410; i++) env[i] = 0.2; // 10 windows of 20ms = 0.2s, above the 0.15s shard floor, kept
    const segs = segmentsFromEnvelope(env, 0.02);
    expect(segs.length).toBe(3);
    expect(segs[0]).toEqual({ start: 0.4, end: 2.4 });
    expect(segs[1]).toEqual({ start: 3.2, end: 6.0 });
  });

  test('fits too many segments by merging the closest, too few by splitting the longest', () => {
    const many = fitSegmentsToLines(
      [
        { start: 0, end: 1 },
        { start: 1.2, end: 2 },
        { start: 5, end: 6 },
      ],
      [3, 3],
    );
    expect(many.segments).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 6 },
    ]);
    expect(many.penalty).toBeCloseTo(0.15);
    const few = fitSegmentsToLines([{ start: 0, end: 4 }], [3, 3]);
    expect(few.segments.length).toBe(2);
    expect(few.penalty).toBeCloseTo(0.3);
  });

  test('the fixture take yields exactly three lines at full confidence', () => {
    const a = alignWithEnergy(decodePcm(TAKE, 16000), script.lines);
    expect(a.backend).toBe('energy');
    expect(a.lines.length).toBe(3);
    expect(a.confidence).toEqual([1, 1, 1]);
    expect(a.lines[0]!.start).toBeGreaterThan(0.2);
    expect(a.lines[0]!.start).toBeLessThan(0.9);
    expect(a.lines[1]!.start).toBeGreaterThan(a.lines[0]!.end + 0.5);
    expect(a.lines[2]!.end).toBeLessThan(12.4);
    expect(
      a.words
        .filter((w) => w.line === 1)
        .map((w) => w.text)
        .join(' '),
    ).toBe(script.lines[0]);
  });

  test('words inside a line are spread by syllable weight and never overlap', () => {
    const words = spreadWords(1, ['a', 'syllable', 'test'], 1, 3);
    expect(words[0]!.start).toBe(1);
    expect(words[2]!.end).toBe(3);
    for (let i = 1; i < words.length; i++)
      expect(words[i]!.start).toBeCloseTo(words[i - 1]!.end, 3);
    expect(words[1]!.end - words[1]!.start).toBeGreaterThan(words[0]!.end - words[0]!.start);
    expect(syllables('fixture')).toBe(2);
    expect(syllables('a')).toBe(1);
  });

  test('alignTake uses the energy backend when whisper is absent and passes the threshold', () => {
    const a = alignTake(TAKE, script.lines, '/nonexistent/tools');
    expect(a.backend).toBe('energy');
    expect(a.words.length).toBe(script.lines.reduce((n, l) => n + l.split(' ').length, 0));
  });

  test('a take with an empty script stops the build', () => {
    expect(() => alignTake(TAKE, [], '/nonexistent/tools')).toThrow(AlignmentError);
    expect(() => alignTake(TAKE, [], '/nonexistent/tools')).toThrow(/no lines/);
  });

  test('a mismatch between spoken lines and typed lines drops confidence and names the line', () => {
    const fiveLines = [...script.lines, 'A fourth line that was never spoken.', 'And a fifth.'];
    const a = alignWithEnergy(decodePcm(TAKE, 16000), fiveLines);
    expect(a.confidence[0]).toBeLessThan(0.6);
    expect(() => assertConfident(a, fiveLines)).toThrow(/confidence for line 1/);
  });
});

describe('whisper aligner', () => {
  const json = JSON.parse(
    readFileSync(path.join(import.meta.dirname, 'fixtures', 'whisper.fixture.json'), 'utf8'),
  ) as WhisperJson;

  test('joins sub-word tokens and drops markers', () => {
    const words = wordsFromWhisper(json);
    expect(words.map((w) => w.key)).toContain('approved');
    expect(words.some((w) => w.key.includes('beg'))).toBe(false);
    expect(words[0]).toEqual({ key: 'this', start: 0.4, end: 0.62 });
  });

  test('sequence alignment tolerates substitutions and gaps', () => {
    const m = alignSequences(
      ['this', 'is', 'a', 'fixture', 'take'],
      ['this', 'is', 'a', 'fix', 'sure', 'take'],
    );
    expect(m[0]).toBe(0);
    expect(m[4]).toBe(5);
  });

  test('script words take recognised times; unmatched words are interpolated; text is never replaced', () => {
    const a = alignFromWhisperJson(json, script.lines, 12.3);
    expect(a.backend).toBe('whisper');
    expect(a.lines.length).toBe(3);
    expect(a.words.map((w) => w.text).join(' ')).toBe(script.lines.join(' '));
    const fixture = a.words.find((w) => w.text === 'fixture')!;
    expect(fixture.start).toBeGreaterThanOrEqual(0.84);
    expect(fixture.end).toBeLessThanOrEqual(1.4);
    const an = a.words.find((w) => w.line === 3 && w.text === 'an')!;
    expect(an.start).toBeGreaterThan(9.3);
    expect(an.start).toBeLessThan(10.0);
    expect(a.lines[1]).toEqual({ line: 2, start: 4.0, end: 7.4 });
    for (const c of a.confidence) expect(c).toBeGreaterThanOrEqual(0.6);
    expect(() => assertConfident(a, script.lines)).not.toThrow();
  });

  test('a recognition that shares nothing with the script fails the threshold', () => {
    const a = alignFromWhisperJson(
      json,
      ['Completely different words were typed here.', 'And here.', 'And here too.'],
      12.3,
    );
    expect(() => assertConfident(a, ['x', 'y', 'z'])).toThrow(AlignmentError);
  });
});
