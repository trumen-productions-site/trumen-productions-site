/**
 * Probes: ffprobe and ebur128 checks on exported files, and manifest
 * verification. A check that cannot run is reported as a failure, never a pass.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { AllConfig } from './config.js';
import type { Manifest } from './export.js';
import { sha256 } from './export.js';

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface StreamInfo {
  codec_type: string;
  codec_name: string;
  profile?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  pix_fmt?: string;
  sample_rate?: string;
  channels?: number;
}

export function ffprobeStreams(file: string): { streams: StreamInfo[]; duration: number } {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout) as { streams: StreamInfo[]; format: { duration: string } };
  return { streams: j.streams, duration: Number.parseFloat(j.format.duration) };
}

export interface Loudness {
  integratedLufs: number;
  truePeakDbtp: number;
}

export function measureLoudness(file: string): Loudness {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'info', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 28 },
  );
  const text = r.stderr;
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const i = /I:\s+(-?[\d.]+) LUFS/.exec(summary);
  const tp = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary);
  if (!i || !tp) throw new Error(`could not read loudness from ffmpeg output for ${file}`);
  return { integratedLufs: Number.parseFloat(i[1]!), truePeakDbtp: Number.parseFloat(tp[1]!) };
}

export function probeExport(
  video: string,
  presetName: string,
  config: AllConfig,
  expectedSeconds?: number,
): Check[] {
  const checks: Check[] = [];
  const preset = config.platforms.presets[presetName];
  if (!preset) return [{ name: 'preset', ok: false, detail: `unknown preset ${presetName}` }];
  if (!existsSync(video)) return [{ name: 'exists', ok: false, detail: `${video} is missing` }];
  const { streams, duration } = ffprobeStreams(video);
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  const cv = config.platforms.video;
  const ca = config.platforms.audio;
  checks.push({ name: 'video codec', ok: v?.codec_name === cv.codec, detail: `${v?.codec_name}` });
  checks.push({
    name: 'video profile',
    ok: (v?.profile ?? '').toLowerCase() === cv.profile,
    detail: `${v?.profile}`,
  });
  checks.push({
    name: 'resolution',
    ok: v?.width === config.platforms.canvas.width && v?.height === config.platforms.canvas.height,
    detail: `${v?.width}×${v?.height}`,
  });
  checks.push({
    name: 'frame rate',
    ok: v?.r_frame_rate === `${config.platforms.canvas.fps}/1`,
    detail: `${v?.r_frame_rate}`,
  });
  checks.push({ name: 'pixel format', ok: v?.pix_fmt === cv.pixelFormat, detail: `${v?.pix_fmt}` });
  checks.push({ name: 'audio codec', ok: a?.codec_name === ca.codec, detail: `${a?.codec_name}` });
  checks.push({
    name: 'audio sample rate',
    ok: a?.sample_rate === String(ca.sampleRate),
    detail: `${a?.sample_rate}`,
  });
  checks.push({
    name: 'audio channels',
    ok: a?.channels === ca.channels,
    detail: `${a?.channels}`,
  });
  checks.push({
    name: 'duration within preset limit',
    ok: duration <= preset.maxSeconds,
    detail: `${duration.toFixed(2)}s ≤ ${preset.maxSeconds}s`,
  });
  if (expectedSeconds !== undefined) {
    checks.push({
      name: 'duration matches the episode',
      ok: Math.abs(duration - expectedSeconds) < 0.25,
      detail: `${duration.toFixed(2)}s vs ${expectedSeconds.toFixed(2)}s`,
    });
  }
  const loud = measureLoudness(video);
  checks.push({
    name: 'integrated loudness',
    ok: Math.abs(loud.integratedLufs - ca.targetLufs) <= ca.loudnessToleranceLu,
    detail: `${loud.integratedLufs.toFixed(1)} LUFS (target ${ca.targetLufs} ± ${ca.loudnessToleranceLu})`,
  });
  checks.push({
    name: 'true peak',
    ok: loud.truePeakDbtp <= ca.truePeakDbtp + 0.05,
    detail: `${loud.truePeakDbtp.toFixed(1)} dBTP (ceiling ${ca.truePeakDbtp})`,
  });
  return checks;
}

export function verifyManifest(manifestFile: string): Check[] {
  const checks: Check[] = [];
  const dir = path.dirname(manifestFile);
  const m = JSON.parse(readFileSync(manifestFile, 'utf8')) as Manifest;
  for (const [name, info] of Object.entries(m.outputs)) {
    const file = path.join(dir, name);
    if (!existsSync(file)) {
      checks.push({ name: `manifest: ${name}`, ok: false, detail: 'missing' });
      continue;
    }
    const actual = sha256(file);
    checks.push({
      name: `manifest: ${name}`,
      ok: actual === info.sha256,
      detail:
        actual === info.sha256
          ? 'sha256 matches'
          : `sha256 ${actual.slice(0, 12)}… ≠ ${info.sha256.slice(0, 12)}…`,
    });
  }
  const videoName = Object.keys(m.outputs).find((n) => n.endsWith('.mp4')) ?? '';
  const prefixed = videoName.startsWith('INTERNAL_');
  checks.push({
    name: 'gate marking on filename',
    ok: prefixed === !m.gate.clean,
    detail: `${videoName} · gate ${m.gate.clean ? 'clean' : 'INTERNAL'}`,
  });
  return checks;
}

export function reportMarkdown(
  title: string,
  groups: Array<{ heading: string; checks: Check[] }>,
): string {
  const lines = [`# ${title}`, ''];
  let fails = 0;
  for (const g of groups) {
    lines.push(`## ${g.heading}`, '', '| Check | Result | Detail |', '| --- | --- | --- |');
    for (const c of g.checks) {
      if (!c.ok) fails++;
      lines.push(`| ${c.name} | ${c.ok ? 'PASS' : '**FAIL**'} | ${c.detail} |`);
    }
    lines.push('');
  }
  lines.splice(
    2,
    0,
    fails === 0 ? 'All checks passed.' : `**${fails} check${fails === 1 ? '' : 's'} failed.**`,
    '',
  );
  return lines.join('\n');
}
