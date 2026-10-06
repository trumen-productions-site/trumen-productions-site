/**
 * Lip-sync: mouth shapes over time.
 *
 *   rhubarb     Rhubarb Lip Sync (tools/rhubarb), the nine-viseme set A–H + X.
 *               Given the approved script as dialog when there is one.
 *   amplitude   Fallback when Rhubarb is absent: a three-shape mouth
 *               (X closed, B part-open, D open) driven by the RMS envelope.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLS_DIR } from './paths.js';
import type { Viseme } from './schema.js';
import { round3 } from './timing.js';
import type { Lipsync, MouthCue } from './types.js';
import { decodePcm, rmsEnvelope, type Pcm } from './wav.js';

export function findRhubarb(toolsDir = TOOLS_DIR): string | null {
  const bin = path.join(toolsDir, 'rhubarb', 'rhubarb');
  return existsSync(bin) ? bin : null;
}

interface RhubarbJson {
  mouthCues: Array<{ start: number; end: number; value: string }>;
}

export function runRhubarb(bin: string, wavFile: string, dialog?: string): MouthCue[] {
  const dir = mkdtempSync(path.join(tmpdir(), 'ce-rhubarb-'));
  try {
    const args = ['-f', 'json', '--machineReadable'];
    if (dialog && dialog.trim()) {
      const dialogFile = path.join(dir, 'dialog.txt');
      writeFileSync(dialogFile, dialog);
      args.push('-r', 'pocketSphinx', '-d', dialogFile);
    } else {
      args.push('-r', 'phonetic');
    }
    args.push(wavFile);
    const run = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (run.status !== 0) throw new Error(`rhubarb failed: ${run.stderr}`);
    const json = JSON.parse(run.stdout) as RhubarbJson;
    return json.mouthCues.map((c) => ({ start: c.start, end: c.end, value: c.value as Viseme }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Three-shape mouth from the envelope, with hysteresis and a two-frame minimum hold. */
export function amplitudeCues(pcm: Pcm, fps: number): MouthCue[] {
  const window = 1 / fps;
  const env = rmsEnvelope(pcm, window);
  const sorted = Array.from(env).sort((a, b) => a - b);
  const peak = sorted[Math.floor(sorted.length * 0.97)] ?? 0;
  if (peak <= 1e-5) return [{ start: 0, end: round3(pcm.durationSeconds), value: 'X' }];
  const hi = peak * 0.55;
  const lo = peak * 0.22;
  const shapes: Viseme[] = [];
  let current: Viseme = 'X';
  env.forEach((v) => {
    let next: Viseme = current;
    if (v > hi) next = 'D';
    else if (v > lo) next = current === 'D' && v > hi * 0.8 ? 'D' : 'B';
    else if (v < lo * 0.7) next = 'X';
    shapes.push(next);
    current = next;
  });
  // Minimum hold of two frames: absorb single-frame flickers into their neighbour.
  for (let i = 1; i < shapes.length - 1; i++) {
    if (shapes[i] !== shapes[i - 1] && shapes[i] !== shapes[i + 1]) shapes[i] = shapes[i - 1]!;
  }
  const cues: MouthCue[] = [];
  shapes.forEach((s, i) => {
    const last = cues[cues.length - 1];
    const t = round3(i * window);
    const end = round3((i + 1) * window);
    if (last && last.value === s) last.end = end;
    else cues.push({ start: t, end, value: s });
  });
  const tail = cues[cues.length - 1];
  if (tail) tail.end = round3(pcm.durationSeconds);
  return cues;
}

export function lipsyncFor(
  wavFile: string,
  fps: number,
  dialog?: string,
  toolsDir = TOOLS_DIR,
): Lipsync {
  const bin = findRhubarb(toolsDir);
  if (bin) return { backend: 'rhubarb', cues: runRhubarb(bin, wavFile, dialog) };
  return { backend: 'amplitude', cues: amplitudeCues(decodePcm(wavFile, 16000), fps) };
}

export { visemeAt } from './lipsync-browser.js';
