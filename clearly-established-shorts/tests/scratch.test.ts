import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { alignWithEnergy } from '../src/lib/alignment.js';
import { amplitudeCues } from '../src/lib/lipsync.js';
import {
  generateScratchSamples,
  SCRATCH_SAMPLE_RATE,
  writeScratchTrack,
} from '../src/lib/scratch.js';
import { scratchDuration, scratchTimings } from '../src/lib/timing.js';
import { decodePcm, probeDuration } from '../src/lib/wav.js';

describe('the scratch track', () => {
  const plan = [2.4, 2.2, 3.0];

  test('is deterministic', () => {
    const a = generateScratchSamples(plan, 0.8, 7);
    const b = generateScratchSamples(plan, 0.8, 7);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
  });

  test('matches the planned duration and is a valid WAV', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ce-scratch-'));
    try {
      const file = path.join(dir, 'scratch.wav');
      writeScratchTrack(file, plan, 0.8);
      expect(probeDuration(file)).toBeCloseTo(scratchDuration(plan, 0.8), 2);
      // The energy aligner recovers the plan from the audio alone.
      const pcm = decodePcm(file, 16000);
      const a = alignWithEnergy(pcm, ['x x x', 'x x x', 'x x x x']);
      expect(a.lines.length).toBe(3);
      expect(a.confidence).toEqual([1, 1, 1]);
      const planned = scratchTimings(plan, 0.8);
      a.lines.forEach((l, i) => {
        expect(Math.abs(l.start - planned[i]!.start)).toBeLessThan(0.12);
        expect(Math.abs(l.end - planned[i]!.end)).toBeLessThan(0.12);
      });
      // And the fallback mouth has something to move to.
      const cues = amplitudeCues(pcm, 30);
      expect(cues.filter((c) => c.value !== 'X').length).toBeGreaterThan(10);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('peaks well under full scale', () => {
    const s = generateScratchSamples(plan, 0.8);
    let peak = 0;
    for (const v of s) peak = Math.max(peak, Math.abs(v));
    expect(peak / 32767).toBeLessThan(0.3);
    expect(SCRATCH_SAMPLE_RATE).toBe(48000);
  });
});
