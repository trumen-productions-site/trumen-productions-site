/**
 * The scratch track: a neutral tone bed with line-length gaps, so timing and
 * animation can be developed before Michael records. It is unmistakably not a
 * voice. The tone carries a syllabic amplitude pattern so the fallback mouth
 * has something to move to.
 */
import { scratchTimings } from './timing.js';
import { writeWav } from './wav.js';

export const SCRATCH_SAMPLE_RATE = 48000;

/** Deterministic pseudo-random in [0,1): a small LCG seeded per track. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateScratchSamples(
  scratchLines: number[],
  gapSeconds: number,
  seed = 1,
): Int16Array {
  const lines = scratchTimings(scratchLines, gapSeconds);
  const last = lines[lines.length - 1];
  const total = (last?.end ?? 0.4) + 0.6;
  const n = Math.round(total * SCRATCH_SAMPLE_RATE);
  const out = new Int16Array(n);
  const rand = lcg(seed);
  const amp = 0.18; // about -15 dBFS peak
  for (const line of lines) {
    const start = Math.round(line.start * SCRATCH_SAMPLE_RATE);
    const end = Math.min(n, Math.round(line.end * SCRATCH_SAMPLE_RATE));
    // Syllables: 3.2–4.2 per second, each a raised-cosine burst.
    let t = line.start;
    while (t < line.end - 0.05) {
      const syl = 0.16 + rand() * 0.14;
      const gap = 0.03 + rand() * 0.05;
      const s0 = Math.max(start, Math.round(t * SCRATCH_SAMPLE_RATE));
      const s1 = Math.min(end, Math.round((t + syl) * SCRATCH_SAMPLE_RATE));
      const f0 = 150 + rand() * 40;
      for (let i = s0; i < s1; i++) {
        const u = (i - s0) / Math.max(1, s1 - s0);
        const env = 0.5 - 0.5 * Math.cos(2 * Math.PI * u);
        const tt = i / SCRATCH_SAMPLE_RATE;
        const v =
          Math.sin(2 * Math.PI * f0 * tt) * 0.6 +
          Math.sin(2 * Math.PI * f0 * 2 * tt) * 0.25 +
          Math.sin(2 * Math.PI * f0 * 3 * tt) * 0.15;
        out[i] = Math.max(-32767, Math.min(32767, Math.round(v * env * amp * 32767)));
      }
      t += syl + gap;
    }
  }
  return out;
}

export function writeScratchTrack(
  file: string,
  scratchLines: number[],
  gapSeconds: number,
  seed = 1,
): void {
  writeWav(file, generateScratchSamples(scratchLines, gapSeconds, seed), SCRATCH_SAMPLE_RATE);
}
