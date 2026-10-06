/**
 * Export: the master video + the normalised audio → one MP4 per preset, with
 * .srt, .vtt, a poster frame and a manifest.json whose hashes are the
 * provenance record. Renders to disk. Publishes nothing.
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { toSrt, toVtt } from './captions.js';
import type { AllConfig } from './config.js';
import { outputBaseName } from './gate.js';
import { OUT_DIR, PROJECT_ROOT } from './paths.js';
import type { Prepared } from './prepare.js';
import type { Preset } from './schema.js';
import { probeDuration } from './wav.js';

export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}

function run(cmd: string, args: string[], what: string): string {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new ExportError(`${what} failed:\n${r.stderr}`);
  return r.stdout + r.stderr;
}

export interface LoudnormMeasurement {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

/**
 * The episode's audio: slate silence, then the take (or scratch), padded to the
 * end card, normalised in two passes to the target loudness and true peak.
 */
export function buildAudio(
  audioFile: string,
  slateSeconds: number,
  totalSeconds: number,
  outWav: string,
  audio: AllConfig['platforms']['audio'],
): LoudnormMeasurement {
  mkdirSync(path.dirname(outWav), { recursive: true });
  const delayMs = Math.round(slateSeconds * 1000);
  const base = `adelay=${delayMs}|${delayMs},apad=whole_dur=${totalSeconds.toFixed(3)},atrim=0:${totalSeconds.toFixed(3)}`;
  const target = `I=${audio.targetLufs}:TP=${audio.truePeakDbtp}:LRA=11`;
  const pass1 = run(
    'ffmpeg',
    [
      '-v',
      'info',
      '-i',
      audioFile,
      '-af',
      `${base},loudnorm=${target}:print_format=json`,
      '-f',
      'null',
      '-',
    ],
    'loudness measurement',
  );
  const jsonText = pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1);
  const m = JSON.parse(jsonText) as LoudnormMeasurement;
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-i',
      audioFile,
      '-af',
      `${base},loudnorm=${target}:${measured}`,
      '-ar',
      String(audio.sampleRate),
      '-ac',
      String(audio.channels),
      '-c:a',
      'pcm_s16le',
      outWav,
    ],
    'loudness normalisation',
  );
  return m;
}

export function encodeFinal(
  master: string,
  audioWav: string,
  out: string,
  cfg: AllConfig['platforms'],
): void {
  mkdirSync(path.dirname(out), { recursive: true });
  const v = cfg.video;
  const a = cfg.audio;
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-i',
      master,
      '-i',
      audioWav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-profile:v',
      v.profile,
      '-pix_fmt',
      v.pixelFormat,
      '-b:v',
      `${v.bitrateKbps}k`,
      '-maxrate',
      `${v.maxrateKbps}k`,
      '-bufsize',
      `${v.bufsizeKbps}k`,
      '-g',
      String(v.gopSeconds * cfg.canvas.fps),
      '-r',
      String(cfg.canvas.fps),
      '-c:a',
      a.codec,
      '-b:a',
      `${a.bitrateKbps}k`,
      '-ar',
      String(a.sampleRate),
      '-ac',
      String(a.channels),
      '-movflags',
      '+faststart',
      '-shortest',
      out,
    ],
    'final encode',
  );
}

export function extractPoster(video: string, seconds: number, out: string): void {
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-ss',
      seconds.toFixed(3),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      'scale=1080:1920',
      out,
    ],
    'poster frame',
  );
}

export function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function gitCommit(): string {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  if (r.status !== 0) return 'unknown';
  const dirty = spawnSync('git', ['status', '--porcelain', '--', '.'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
  return r.stdout.trim() + (dirty.stdout.trim() ? '-dirty' : '');
}

export interface Manifest {
  episode: { id: string; slug: string; title: string; folder: string };
  preset: string;
  presetLimits: Preset;
  mode: 'scratch' | 'take';
  gate: { clean: boolean; reasons: string[]; snapshot: Prepared['data']['gate']['snapshot'] };
  renderedAt: string;
  gitCommit: string;
  engine: { remotion: string; typeface: string; alignment: string; lipsync: string };
  inputs: { audio: string; audioSha256: string; script: string; scriptSha256: string };
  durationSeconds: number;
  outputs: Record<string, { sha256: string; bytes: number }>;
}

export interface PresetExport {
  preset: string;
  dir: string;
  video: string;
  srt: string;
  vtt: string;
  poster: string;
  manifest: string;
}

export function exportPresets(
  prepared: Prepared,
  master: string,
  audioWav: string,
  config: AllConfig,
  outRoot = OUT_DIR,
): PresetExport[] {
  const { data } = prepared;
  const slate = data.slateFrames / data.fps;
  const total = data.durationInFrames / data.fps;
  const encoded = path.join(path.dirname(master), 'final.mp4');
  encodeFinal(master, audioWav, encoded, config.platforms);
  const duration = probeDuration(encoded);
  const remotionVersion = (
    JSON.parse(
      readFileSync(path.join(PROJECT_ROOT, 'node_modules', 'remotion', 'package.json'), 'utf8'),
    ) as { version: string }
  ).version;
  const posterAt = Math.min(
    duration - 0.1,
    slate +
      (data.beats.find((b) => b.id === 'declaration')?.seconds ?? data.beats[0]!.seconds) +
      0.6,
  );
  const results: PresetExport[] = [];

  for (const [presetName, preset] of Object.entries(config.platforms.presets)) {
    if (total > preset.maxSeconds + 1e-6) {
      throw new ExportError(
        `${data.folder}: ${total.toFixed(2)}s exceeds the ${preset.label} maximum of ${preset.maxSeconds}s. Shorten the take; the engine does not truncate.`,
      );
    }
    const dir = path.join(outRoot, data.folder, presetName);
    mkdirSync(dir, { recursive: true });
    const base = outputBaseName(
      data.gate,
      data.spec.slug,
      presetName,
      config.brand.gateMarking.filenamePrefix,
    );
    const video = path.join(dir, `${base}.mp4`);
    const srt = path.join(dir, `${base}.srt`);
    const vtt = path.join(dir, `${base}.vtt`);
    const poster = path.join(dir, `${base}.poster.png`);
    const manifestFile = path.join(dir, 'manifest.json');
    // Every preset shares the canvas, codec and audio spec, so the encode is shared and each preset receives its own copy.
    copyFileSync(encoded, video);
    writeFileSync(srt, toSrt(data.captions, slate));
    writeFileSync(
      vtt,
      toVtt(
        data.captions,
        slate,
        data.mode === 'scratch'
          ? 'SCRATCH TRACK — placeholder cues, no approved text yet'
          : `${data.series.workingTitle} · No. ${data.spec.id}`,
      ),
    );
    extractPoster(video, posterAt, poster);
    const outputs: Manifest['outputs'] = {};
    for (const f of [video, srt, vtt, poster])
      outputs[path.basename(f)] = { sha256: sha256(f), bytes: readFileSync(f).length };
    const manifest: Manifest = {
      episode: {
        id: data.spec.id,
        slug: data.spec.slug,
        title: data.spec.title,
        folder: data.folder,
      },
      preset: presetName,
      presetLimits: preset,
      mode: data.mode,
      gate: { clean: data.gate.clean, reasons: data.gate.reasons, snapshot: data.gate.snapshot },
      renderedAt: new Date().toISOString(),
      gitCommit: gitCommit(),
      engine: {
        remotion: remotionVersion,
        typeface: data.typeface,
        alignment: data.alignment.backend,
        lipsync: data.lipsync.backend,
      },
      inputs: {
        audio: path.relative(PROJECT_ROOT, prepared.audioFile),
        audioSha256: prepared.audioSha256,
        script: data.spec.script,
        scriptSha256: prepared.scriptSha256,
      },
      durationSeconds: Math.round(duration * 1000) / 1000,
      outputs,
    };
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    results.push({ preset: presetName, dir, video, srt, vtt, poster, manifest: manifestFile });
  }
  return results;
}

export function manifestsUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'manifest.json') out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}
