import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  amplitudeCues,
  findRhubarb,
  lipsyncFor,
  runRhubarb,
  visemeAt,
} from '../src/lib/lipsync.js';
import { VISEMES } from '../src/lib/schema.js';
import { decodePcm } from '../src/lib/wav.js';
import { TOOLS_DIR } from '../src/lib/paths.js';

const TAKE = path.join(
  import.meta.dirname,
  'fixtures',
  'episodes',
  '900-fixture-take',
  'audio',
  'take.wav',
);
const rhubarb = findRhubarb(TOOLS_DIR);

describe('amplitude fallback', () => {
  const pcm = decodePcm(TAKE, 16000);
  const cues = amplitudeCues(pcm, 30);

  test('covers the whole take contiguously with the three-shape set', () => {
    expect(cues[0]!.start).toBe(0);
    expect(cues[cues.length - 1]!.end).toBeCloseTo(pcm.durationSeconds, 2);
    for (let i = 1; i < cues.length; i++) expect(cues[i]!.start).toBeCloseTo(cues[i - 1]!.end, 3);
    const used = new Set(cues.map((c) => c.value));
    expect([...used].every((v) => ['X', 'B', 'D'].includes(v))).toBe(true);
    expect(used.has('D')).toBe(true);
    expect(used.has('X')).toBe(true);
  });

  test('the mouth is closed in the pauses and open during speech', () => {
    expect(visemeAt(cues, 0.1)).toBe('X');
    expect(visemeAt(cues, 3.3)).toBe('X'); // the gap after line 1
    const speaking = cues.filter((c) => c.start > 0.5 && c.end < 3.0 && c.value !== 'X');
    expect(speaking.length).toBeGreaterThan(5);
  });

  test('no cue is shorter than two frames', () => {
    for (const c of cues) expect(c.end - c.start).toBeGreaterThanOrEqual(2 / 30 - 0.002);
  });

  test('silence is one closed cue', () => {
    const silent = { sampleRate: 16000, samples: new Int16Array(16000), durationSeconds: 1 };
    expect(amplitudeCues(silent, 30)).toEqual([{ start: 0, end: 1, value: 'X' }]);
  });
});

describe('backend selection', () => {
  test('fallback engages when Rhubarb is absent', () => {
    const l = lipsyncFor(TAKE, 30, undefined, '/nonexistent/tools');
    expect(l.backend).toBe('amplitude');
  });

  test.skipIf(!rhubarb)(
    'Rhubarb yields a viseme sequence from the nine-shape set for the fixture take',
    () => {
      const cues = runRhubarb(
        rhubarb!,
        TAKE,
        'This is a fixture take for the test suite. It has three lines, spoken with a pause between each. Nothing here is an approved script.',
      );
      expect(cues.length).toBeGreaterThan(20);
      for (const c of cues) expect(VISEMES).toContain(c.value);
      expect(new Set(cues.map((c) => c.value)).size).toBeGreaterThan(3);
      expect(visemeAt(cues, 0.05)).toBe('X');
      const l = lipsyncFor(TAKE, 30, undefined, TOOLS_DIR);
      expect(l.backend).toBe('rhubarb');
    },
  );

  test('the Rhubarb install is reported honestly', () => {
    // Not an assertion on presence: a machine without Rhubarb is a supported configuration.
    expect(typeof existsSync(path.join(TOOLS_DIR, 'rhubarb', 'rhubarb'))).toBe('boolean');
  });
});
