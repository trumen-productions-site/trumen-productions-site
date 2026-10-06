/** Remotion: bundle once, render a video-only master per episode. */
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { findLocalBrowser } from './browser.js';
import { PROJECT_ROOT, PUBLIC_DIR } from './paths.js';
import { webpackOverride } from './webpack-override.js';
import type { EpisodeRenderData } from './types.js';

const ENTRY = path.join(PROJECT_ROOT, 'src', 'index.ts');

export async function bundleProject(quiet = true): Promise<string> {
  return bundle({
    entryPoint: ENTRY,
    publicDir: PUBLIC_DIR,
    webpackOverride,
    onProgress: quiet ? undefined : (p) => process.stdout.write(`\r  bundling ${p}%`),
  });
}

function browserOptions() {
  const browserExecutable = findLocalBrowser();
  // logLevel "error" also silences Remotion's cgroup memory notice, which repeats once per frame batch on some hosts.
  return { browserExecutable: browserExecutable ?? undefined, logLevel: 'error' as const };
}

export async function renderMaster(
  serveUrl: string,
  data: EpisodeRenderData,
  outFile: string,
  opts: { concurrency?: number; onProgress?: (fraction: number) => void } = {},
): Promise<void> {
  mkdirSync(path.dirname(outFile), { recursive: true });
  const inputProps = data as unknown as Record<string, unknown>;
  const composition = await selectComposition({
    serveUrl,
    id: 'Episode',
    inputProps,
    ...browserOptions(),
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 14,
    imageFormat: 'jpeg',
    jpegQuality: 95,
    pixelFormat: 'yuv420p',
    muted: true,
    outputLocation: outFile,
    inputProps,
    concurrency: opts.concurrency ?? null,
    onProgress: opts.onProgress ? ({ progress }) => opts.onProgress!(progress) : undefined,
    ...browserOptions(),
  });
}

/** One frame as PNG, for the safe-zone probe and snapshots. */
export async function renderFrame(
  serveUrl: string,
  data: EpisodeRenderData,
  frame: number,
  outFile: string,
): Promise<void> {
  mkdirSync(path.dirname(outFile), { recursive: true });
  const inputProps = data as unknown as Record<string, unknown>;
  const composition = await selectComposition({
    serveUrl,
    id: 'Episode',
    inputProps,
    ...browserOptions(),
  });
  await renderStill({
    composition,
    serveUrl,
    frame,
    output: outFile,
    imageFormat: 'png',
    inputProps,
    ...browserOptions(),
  });
}
