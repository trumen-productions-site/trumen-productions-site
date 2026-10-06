/**
 * Integration: the fixture episode (three synthesised lines) rendered for real.
 * Proves: take mode re-times the episode with no spec edit; the four exports
 * probe clean; the gate marks every frame; caption plates and cards sit
 * inside every preset's safe zone (measured on rendered pixels); still frames
 * match their committed baselines; manifest hashes match the files.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadAllConfig } from '../src/lib/config.js';
import { loadEpisode } from '../src/lib/episode.js';
import { buildAudio, exportPresets, type Manifest } from '../src/lib/export.js';
import { safeBox } from '../src/lib/layout.js';
import { prepareEpisode, type Prepared } from '../src/lib/prepare.js';
import { probeExport, verifyManifest } from '../src/lib/probe.js';
import { bundleProject, renderFrame, renderMaster } from '../src/lib/render.js';
import type { EpisodeRenderData } from '../src/lib/types.js';

const FIXTURE_SRC = path.join(import.meta.dirname, 'fixtures', 'episodes', '900-fixture-take');
const SNAPSHOTS = path.join(import.meta.dirname, 'snapshots');
const config = loadAllConfig();

let work: string;
let serveUrl: string;
let prepared: Prepared;
let scratchPrepared: Prepared;
let outRoot: string;
let exportsByPreset: Record<
  string,
  { video: string; manifest: string; srt: string; vtt: string; poster: string }
>;

/** Decode a PNG to RGB bytes via ffmpeg, so no image library is needed. */
function rgb(file: string): { width: number; height: number; data: Buffer } {
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  const [w, h] = probe.stdout.trim().split(',').map(Number);
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28 },
  );
  return { width: w!, height: h!, data: r.stdout };
}

/** Bounding box of near-magenta pixels, or null. */
function magentaBox(
  img: ReturnType<typeof rgb>,
): { x0: number; y0: number; x1: number; y1: number; count: number } | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1,
    count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 3;
      const r = img.data[i]!,
        g = img.data[i + 1]!,
        b = img.data[i + 2]!;
      if (r > 200 && g < 80 && b > 200) {
        count++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return count === 0 ? null : { x0, y0, x1, y1, count };
}

function ssim(a: string, b: string): number {
  const r = spawnSync(
    'ffmpeg',
    ['-i', a, '-i', b, '-filter_complex', '[0][1]scale2ref[a][b];[a][b]ssim', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const m = /All:([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error(`ssim failed: ${r.stderr.slice(-400)}`);
  return Number.parseFloat(m[1]!);
}

beforeAll(async () => {
  work = mkdtempSync(path.join(tmpdir(), 'ce-render-'));
  const episodesDir = path.join(work, 'episodes');
  cpSync(FIXTURE_SRC, path.join(episodesDir, '900-fixture-take'), { recursive: true });
  const ep = loadEpisode(path.join(episodesDir, '900-fixture-take'));
  const cacheDir = path.join(work, 'cache');
  scratchPrepared = prepareEpisode(ep, config, {
    ignoreTake: true,
    cacheDir,
    toolsDir: '/nonexistent',
  });
  prepared = prepareEpisode(ep, config, { cacheDir, toolsDir: '/nonexistent' });
  serveUrl = await bundleProject(true);
  const master = path.join(work, 'master.mp4');
  await renderMaster(serveUrl, prepared.data, master, { concurrency: 2 });
  const audio = path.join(work, 'audio.wav');
  buildAudio(
    prepared.audioFile,
    prepared.data.slateFrames / prepared.data.fps,
    prepared.data.durationInFrames / prepared.data.fps,
    audio,
    config.platforms.audio,
  );
  outRoot = path.join(work, 'out');
  const results = exportPresets(prepared, master, audio, config, outRoot);
  exportsByPreset = Object.fromEntries(results.map((r) => [r.preset, r]));
}, 900_000);

afterAll(() => {
  if (work && existsSync(work)) rmSync(work, { recursive: true, force: true });
});

describe('a real take re-times the episode with no code or spec change', () => {
  test('scratch and take modes resolve line anchors to different moments from the same spec', () => {
    expect(scratchPrepared.data.mode).toBe('scratch');
    expect(prepared.data.mode).toBe('take');
    const scratchDecl = scratchPrepared.data.beats.find((b) => b.id === 'declaration')!.seconds;
    const takeDecl = prepared.data.beats.find((b) => b.id === 'declaration')!.seconds;
    expect(scratchDecl).not.toBe(takeDecl);
    expect(prepared.data.alignment.backend).toBe('energy');
    expect(prepared.data.alignment.lines.length).toBe(3);
    expect(takeDecl).toBeCloseTo(prepared.data.alignment.lines[1]!.start, 3);
  });

  test('captions carry the approved script verbatim in take mode and placeholders in scratch mode', () => {
    const text = prepared.data.captions.flatMap((p) => p.words.map((w) => w.text)).join(' ');
    const script = readFileSync(path.join(FIXTURE_SRC, 'script.approved.txt'), 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .join(' ');
    expect(text).toBe(script);
    expect(scratchPrepared.data.captions.every((p) => p.placeholder)).toBe(true);
    for (const p of prepared.data.captions) expect(p.words.length).toBeLessThanOrEqual(3);
  });

  test('the hook lands inside the first two seconds in both modes', () => {
    for (const d of [prepared.data, scratchPrepared.data])
      expect(d.beats.find((b) => b.id === 'hook')!.seconds).toBeLessThanOrEqual(2);
  });
});

describe('exports', () => {
  test('all four presets exist, are INTERNAL, and pass every probe', () => {
    expect(Object.keys(exportsByPreset).sort()).toEqual([
      'ig-reels',
      'snap-spotlight',
      'tiktok',
      'youtube-shorts',
    ]);
    for (const [preset, e] of Object.entries(exportsByPreset)) {
      expect(path.basename(e.video).startsWith('INTERNAL_')).toBe(true);
      const checks = probeExport(
        e.video,
        preset,
        config,
        prepared.data.durationInFrames / prepared.data.fps,
      );
      expect(
        checks.filter((c) => !c.ok),
        preset,
      ).toEqual([]);
      expect(existsSync(e.srt) && existsSync(e.vtt) && existsSync(e.poster)).toBe(true);
    }
  });

  test('manifests hash the files on disk and record the take and script hashes, the gate and the commit', () => {
    for (const e of Object.values(exportsByPreset)) {
      expect(verifyManifest(e.manifest).filter((c) => !c.ok)).toEqual([]);
      const m = JSON.parse(readFileSync(e.manifest, 'utf8')) as Manifest;
      expect(m.inputs.audioSha256).toBe(prepared.audioSha256);
      expect(m.inputs.scriptSha256).toBe(prepared.scriptSha256);
      expect(m.gate.clean).toBe(false);
      expect(m.gate.snapshot.counselCleared).toBe(false);
      expect(m.gitCommit.length).toBeGreaterThan(6);
      expect(m.engine.alignment).toBe('energy');
      expect(Object.keys(m.outputs).length).toBe(4);
    }
  });

  test('a tampered output fails manifest verification', () => {
    const e = exportsByPreset['tiktok']!;
    const copy = path.join(work, 'tamper');
    mkdirSync(copy, { recursive: true });
    for (const f of [e.video, e.srt, e.vtt, e.poster, e.manifest])
      copyFileSync(f, path.join(copy, path.basename(f)));
    writeFileSync(path.join(copy, path.basename(e.srt)), 'tampered');
    const bad = verifyManifest(path.join(copy, 'manifest.json')).filter((c) => !c.ok);
    expect(bad.length).toBe(1);
    expect(bad[0]!.name).toContain('.srt');
  });

  test('sidecar cues are shifted by the slate and carry the script text', () => {
    const srt = readFileSync(exportsByPreset['youtube-shorts']!.srt, 'utf8');
    expect(srt).toContain('This is a');
    const first = /00:00:(\d{2}),(\d{3})/.exec(srt)!;
    const t = +first[1]! + +first[2]! / 1000;
    expect(t).toBeCloseTo(prepared.data.captions[0]!.start + 2, 2);
    const vtt = readFileSync(exportsByPreset['youtube-shorts']!.vtt, 'utf8');
    expect(vtt.startsWith('WEBVTT')).toBe(true);
  });
});

describe('the gate on rendered pixels', () => {
  test('the first two seconds are the slate: navy with cream text, no scene', () => {
    const png = path.join(work, 'slate.png');
    spawnSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-ss',
      '1.0',
      '-i',
      exportsByPreset['youtube-shorts']!.video,
      '-frames:v',
      '1',
      png,
    ]);
    const img = rgb(png);
    // Navy ground dominates; the showroom/courtroom cream wall would not.
    let navy = 0;
    for (let i = 0; i < img.data.length; i += 3 * 97) {
      const r = img.data[i]!,
        g = img.data[i + 1]!,
        b = img.data[i + 2]!;
      if (r < 40 && g < 60 && b > 30 && b < 90) navy++;
    }
    expect(navy / (img.data.length / (3 * 97))).toBeGreaterThan(0.8);
  });

  test('the watermark is present inside the safe zone on a mid-episode frame', async () => {
    const png = path.join(work, 'wm.png');
    const box = safeBox(prepared.data.safeZone, 1080, 1920);
    await renderFrame(serveUrl, prepared.data, prepared.data.slateFrames + 45, png);
    const img = rgb(png);
    // The watermark plate is dark with a cream border at the top-left of the safe box.
    let cream = 0;
    for (let y = box.y + 16; y < box.y + 60; y++) {
      for (let x = box.x; x < box.x + 400; x++) {
        const i = (y * img.width + x) * 3;
        if (img.data[i]! > 200 && img.data[i + 1]! > 190 && img.data[i + 2]! > 170) cream++;
      }
    }
    expect(cream).toBeGreaterThan(300);
  });
});

describe('safe zones, measured on rendered pixels', () => {
  const sampleFrames = (d: EpisodeRenderData) => {
    const fps = d.fps;
    const mid = (p: { start: number; end: number }) =>
      d.slateFrames + Math.round(((p.start + p.end) / 2) * fps);
    const frames = d.captions.map(mid);
    const fact = d.cards.find((c) => c.type === 'fact')!;
    frames.push(d.slateFrames + Math.round((fact.seconds + 0.5) * fps));
    return [...new Set(frames)];
  };

  test("every caption plate and the fact card sit inside every preset's safe zone", async () => {
    const probeData: EpisodeRenderData = { ...prepared.data, probeMask: true };
    const frames = sampleFrames(prepared.data);
    expect(frames.length).toBeGreaterThanOrEqual(5);
    let seen = 0;
    for (const frame of frames) {
      const png = path.join(work, `mask-${frame}.png`);
      await renderFrame(serveUrl, probeData, frame, png);
      const bbox = magentaBox(rgb(png));
      if (!bbox) continue;
      seen++;
      for (const [name, preset] of Object.entries(config.platforms.presets)) {
        const box = safeBox(preset.safeZone, 1080, 1920);
        expect(bbox.x0, `${name} frame ${frame} left`).toBeGreaterThanOrEqual(box.x);
        expect(bbox.y0, `${name} frame ${frame} top`).toBeGreaterThanOrEqual(box.y);
        expect(bbox.x1, `${name} frame ${frame} right`).toBeLessThanOrEqual(box.x + box.width);
        expect(bbox.y1, `${name} frame ${frame} bottom`).toBeLessThanOrEqual(box.y + box.height);
      }
    }
    expect(seen).toBe(frames.length);
  }, 600_000);
});

describe('still-frame snapshots', () => {
  const update = existsSync(path.join(SNAPSHOTS, '.update'));

  test('hook, declaration, reaction and end card match the committed baselines', async () => {
    const d = prepared.data;
    const at: Record<string, number> = {
      hook:
        d.slateFrames + Math.round((d.beats.find((b) => b.id === 'hook')!.seconds + 0.6) * d.fps),
      declaration:
        d.slateFrames +
        Math.round((d.beats.find((b) => b.id === 'declaration')!.seconds + 0.5) * d.fps),
      reaction:
        d.slateFrames +
        Math.round((d.beats.find((b) => b.id === 'reaction')!.seconds + 0.8) * d.fps),
      'end-card': d.slateFrames + Math.round((d.endCard.companyStart + 0.5) * d.fps),
    };
    mkdirSync(SNAPSHOTS, { recursive: true });
    for (const [name, frame] of Object.entries(at)) {
      const full = path.join(work, `snap-${name}.png`);
      await renderFrame(serveUrl, d, frame, full);
      const small = path.join(work, `snap-${name}-small.png`);
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-vf', 'scale=270:480', small]);
      const baseline = path.join(SNAPSHOTS, `fixture-${name}.png`);
      if (!existsSync(baseline) || update) {
        copyFileSync(small, baseline);
        continue;
      }
      const score = ssim(small, baseline);
      expect(
        score,
        `${name}: SSIM ${score.toFixed(4)} against ${path.basename(baseline)}`,
      ).toBeGreaterThan(0.97);
    }
  }, 600_000);
});

describe('brand on rendered pixels', () => {
  test('the end card is drawn only in brand tokens', async () => {
    const d = prepared.data;
    const png = path.join(work, 'endcard-palette.png');
    await renderFrame(
      serveUrl,
      { ...d, gate: { ...d.gate } },
      d.slateFrames + Math.round((d.endCard.titleStart + 0.6) * d.fps),
      png,
    );
    const img = rgb(png);
    const tokens = Object.values(config.brand.palette).map(
      (h) =>
        [
          Number.parseInt(h.slice(1, 3), 16),
          Number.parseInt(h.slice(3, 5), 16),
          Number.parseInt(h.slice(5, 7), 16),
        ] as const,
    );
    let off = 0,
      total = 0;
    for (let i = 0; i < img.data.length; i += 3 * 13) {
      total++;
      const r = img.data[i]!,
        g = img.data[i + 1]!,
        b = img.data[i + 2]!;
      // Anti-aliased edges blend two tokens; accept any pixel within reach of a token or on a line between navy and another token.
      const near = tokens.some(
        ([tr, tg, tb]) => Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb) < 60,
      );
      if (!near) {
        const [nr, ng, nb] = tokens[0]!; // navy
        const onLine = tokens.some(([tr, tg, tb]) => {
          const t = (r - nr) / (tr - nr || 1);
          return (
            t > 0 &&
            t < 1 &&
            Math.abs(ng + (tg - ng) * t - g) < 30 &&
            Math.abs(nb + (tb - nb) * t - b) < 30
          );
        });
        if (!onLine) off++;
      }
    }
    expect(off / total).toBeLessThan(0.02);
  });
});
