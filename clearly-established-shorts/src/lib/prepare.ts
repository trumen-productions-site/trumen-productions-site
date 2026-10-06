/**
 * Prepare: everything the composition needs, computed once per episode and
 * written to .cache/episodes/<folder>/render.json.
 *
 * mode "take"     audio/take.wav exists: align the approved script to it,
 *                 lip-sync from it, captions from the script.
 * mode "scratch"  no take yet: the scratch track (generated from scratchLines
 *                 if missing), placeholder captions, amplitude mouth.
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { alignScratch, alignTake } from './alignment.js';
import { errorsOf } from './canon.js';
import { buildPlates } from './captions.js';
import { type AllConfig } from './config.js';
import { gateFor, lintEpisode, type LoadedEpisode } from './episode.js';
import { safeZoneUnion } from './layout.js';
import { amplitudeCues, lipsyncFor } from './lipsync.js';
import { ASSETS_DIR, CACHE_DIR, PROJECT_ROOT, PUBLIC_DIR, TOOLS_DIR } from './paths.js';
import { loadRig } from './rigs-node.js';
import { writeScratchTrack } from './scratch.js';
import { resolveAnchor, round3 } from './timing.js';
import type {
  EpisodeRenderData,
  ResolvedBeat,
  ResolvedCard,
  RigBundle,
  Typeface,
} from './types.js';
import { decodePcm, probeDuration } from './wav.js';

export interface PrepareOptions {
  toolsDir?: string;
  /** Force scratch mode even when a take exists (used by tests to prove re-timing). */
  ignoreTake?: boolean;
  cacheDir?: string;
}

export interface Prepared {
  data: EpisodeRenderData;
  /** The audio file the export muxes (take or scratch). */
  audioFile: string;
  audioSha256: string;
  scriptSha256: string;
  renderJson: string;
  warnings: string[];
}

export function sha256File(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Georgia is used only when it is actually installed on this machine. */
export function detectTypeface(): Typeface {
  const candidates = [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    '/Library/Fonts',
    '/System/Library/Fonts',
    'C:\\Windows\\Fonts',
    path.join(homeDirSafe(), '.fonts'),
    path.join(homeDirSafe(), 'Library', 'Fonts'),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    if (walkHas(dir, /^georgia(\.ttf|\.ttc|\.otf)$/i, 3)) return 'Georgia';
  }
  const fc = spawnSync('fc-list', [], { encoding: 'utf8' });
  if (fc.status === 0 && /georgia/i.test(fc.stdout)) return 'Georgia';
  return 'Gelasio';
}

function homeDirSafe(): string {
  // Not an environment read: resolved from the process's user info so no variable can steer it.
  try {
    return homedir();
  } catch {
    return '/';
  }
}

function walkHas(dir: string, re: RegExp, depth: number): boolean {
  if (depth < 0) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (walkHas(path.join(dir, entry.name), re, depth - 1)) return true;
    } else if (re.test(entry.name)) return true;
  }
  return false;
}

/** Copy fonts and marks into public/ for staticFile(). Idempotent. */
export function syncPublicAssets(): void {
  for (const sub of ['fonts', 'marks']) {
    const from = path.join(ASSETS_DIR, sub);
    const to = path.join(PUBLIC_DIR, sub);
    mkdirSync(to, { recursive: true });
    if (!existsSync(from)) continue;
    for (const f of readdirSync(from)) {
      if (f.endsWith('.txt')) continue;
      copyFileSync(path.join(from, f), path.join(to, f));
    }
  }
}

export function prepareEpisode(
  ep: LoadedEpisode,
  config: AllConfig,
  opts: PrepareOptions = {},
): Prepared {
  const toolsDir = opts.toolsDir ?? TOOLS_DIR;
  const fps = config.platforms.canvas.fps;
  const { width, height } = config.platforms.canvas;
  const warnings: string[] = [];

  // Scratch track: generated from the plan when missing.
  if (!existsSync(ep.scratchPath)) {
    mkdirSync(path.dirname(ep.scratchPath), { recursive: true });
    writeScratchTrack(
      ep.scratchPath,
      ep.spec.scratchLines,
      config.series.lineGapSeconds,
      Number.parseInt(ep.spec.id, 10),
    );
  }

  const useTake = ep.hasTake && !opts.ignoreTake;
  const mode: 'take' | 'scratch' = useTake ? 'take' : 'scratch';
  const audioFile = useTake ? ep.takePath : ep.scratchPath;
  const takeEnd = round3(probeDuration(audioFile));

  const alignment = useTake
    ? alignTake(ep.takePath, ep.script.lines, toolsDir)
    : alignScratch(ep.spec.scratchLines, config.series.lineGapSeconds);
  const lipsync = useTake
    ? lipsyncFor(ep.takePath, fps, ep.script.lines.join('\n'), toolsDir)
    : { backend: 'amplitude' as const, cues: amplitudeCues(decodePcm(ep.scratchPath, 16000), fps) };
  if (!useTake && ep.hasTake) warnings.push('a take exists but was ignored (scratch mode forced)');
  if (useTake && ep.script.awaitingTake)
    throw new Error(`${ep.folder}: take.wav exists but ${ep.spec.script} has no lines`);

  // Lint against the real timings.
  const findings = lintEpisode(ep, config, alignment.lines);
  const errors = errorsOf(findings);
  if (errors.length > 0) {
    throw new Error(
      `${ep.folder} failed validation:\n  - ${errors.map((f) => `[${f.rule}] ${f.where}: ${f.message}`).join('\n  - ')}`,
    );
  }
  for (const w of findings.filter((f) => f.level === 'warning'))
    warnings.push(`[${w.rule}] ${w.where}: ${w.message}`);
  for (const n of alignment.notes) warnings.push(n);

  const ctx = { lines: alignment.lines, takeEnd };
  const beats: ResolvedBeat[] = ep.spec.beats.map((b) => ({
    ...b,
    seconds: round3(resolveAnchor(b.at, ctx)),
  }));
  const cards: ResolvedCard[] = ep.spec.cards.map((c) => ({
    ...c,
    seconds: round3(resolveAnchor(c.at, ctx)),
  }));
  const title = cards.find((c) => c.type === 'title')!;
  for (const c of cards) {
    if (c.type === 'fact' && c.seconds >= title.seconds)
      throw new Error(
        `${ep.folder}: the fact card at ${c.at} (${c.seconds}s) must come before the title card at ${title.at} (${title.seconds}s)`,
      );
  }
  const ec = config.series.endCard;
  const titleStart = title.seconds;
  const writtenByStart = round3(Math.max(takeEnd, titleStart) + ec.titleHoldSeconds);
  const companyStart = round3(writtenByStart + ec.writtenBySeconds);
  const end = round3(companyStart + ec.companySeconds);

  const captions = buildPlates(
    alignment,
    ep.script.lines,
    config.brand.captions.wordsPerPlateMax,
    config.brand.captions.wordsPerPlateMin,
  );
  const gate = gateFor(ep.spec);
  const slateFrames = gate.clean ? 0 : Math.round(config.brand.gateMarking.slateSeconds * fps);
  const durationInFrames = slateFrames + Math.round(end * fps);

  const rigs: Record<string, RigBundle> = {};
  for (const member of ep.spec.cast) rigs[member.rig] = rigs[member.rig] ?? loadRig(member.rig);

  const lockupFile = path.join(PROJECT_ROOT, config.brand.companyMark.lockupFile);
  const lockupAvailable = existsSync(lockupFile);
  if (!lockupAvailable)
    warnings.push(
      'the supplied TRU★MEN lockup is missing; the end card uses a typeset placeholder',
    );
  syncPublicAssets();

  const data: EpisodeRenderData = {
    kind: 'episode',
    folder: ep.folder,
    spec: ep.spec,
    mode,
    fps,
    width,
    height,
    durationInFrames,
    slateFrames,
    takeEnd,
    typeface: detectTypeface(),
    gate,
    brand: config.brand,
    series: config.series,
    safeZone: safeZoneUnion(config.platforms),
    alignment,
    lipsync,
    captions,
    beats,
    cards,
    endCard: { titleStart, writtenByStart, companyStart, end },
    rigs,
    lockup: { available: lockupAvailable, file: config.brand.companyMark.lockupFile },
  };

  const cacheDir = path.join(opts.cacheDir ?? CACHE_DIR, 'episodes', ep.folder);
  mkdirSync(cacheDir, { recursive: true });
  const renderJson = path.join(cacheDir, 'render.json');
  writeFileSync(renderJson, JSON.stringify(data, null, 2));

  return {
    data,
    audioFile,
    audioSha256: sha256File(audioFile),
    scriptSha256: createHash('sha256').update(ep.scriptRaw).digest('hex'),
    renderJson,
    warnings,
  };
}
