/**
 * npm run render -- --episode 001 [--preset all|youtube-shorts] [--skip-probe]
 * npm run render -- --all
 *
 * Produces, per episode and preset: the MP4, .srt, .vtt, a poster PNG and a
 * manifest.json under out/<folder>/<preset>/. Then probes each file.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { boolFlag, parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { loadEpisode } from '../lib/episode.js';
import { exportPresets } from '../lib/export.js';
import { buildAudio } from '../lib/export.js';
import { CACHE_DIR, EPISODES_DIR, OUT_DIR, episodeDir } from '../lib/paths.js';
import { prepareEpisode } from '../lib/prepare.js';
import { probeExport, reportMarkdown, verifyManifest, type Check } from '../lib/probe.js';
import { bundleProject, renderMaster } from '../lib/render.js';

const args = parseArgs(process.argv.slice(2));
const config = loadAllConfig();
const quiet = boolFlag(args, 'quiet');
const presetArg = stringFlag(args, 'preset') ?? 'all';
if (presetArg !== 'all' && !config.platforms.presets[presetArg]) {
  console.error(
    `unknown preset "${presetArg}"; presets: ${Object.keys(config.platforms.presets).join(', ')}, all`,
  );
  process.exit(2);
}
const targets = boolFlag(args, 'all')
  ? readdirSync(EPISODES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [stringFlag(args, 'episode') ?? ''];
if (!targets[0]) {
  console.error('usage: npm run render -- --episode 001 [--preset all] | --all');
  process.exit(2);
}
const concurrencyFlag = stringFlag(args, 'concurrency');
const concurrency = concurrencyFlag ? Number.parseInt(concurrencyFlag, 10) : undefined;

const log = (s: string) => {
  if (!quiet) console.log(s);
};

const started = Date.now();
log('bundling the composition…');
const serveUrl = await bundleProject(true);
const allGroups: Array<{ heading: string; checks: Check[] }> = [];
let failed = false;

for (const t of targets) {
  const ep = loadEpisode(episodeDir(t));
  const prepared = prepareEpisode(ep, config);
  const { data } = prepared;
  log(
    `\n${ep.folder} — ${data.mode} mode, ${data.durationInFrames} frames, gate ${data.gate.clean ? 'CLEAN' : 'INTERNAL'}`,
  );
  for (const w of prepared.warnings) log(`  note: ${w}`);

  const workDir = path.join(CACHE_DIR, 'render', ep.folder);
  const master = path.join(workDir, 'master.mp4');
  const t0 = Date.now();
  await renderMaster(serveUrl, data, master, {
    concurrency,
    onProgress: quiet
      ? undefined
      : (f) => process.stdout.write(`\r  rendering ${(f * 100).toFixed(0)}%   `),
  });
  log(`\r  rendered master in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const audioWav = path.join(workDir, 'audio.wav');
  const measured = buildAudio(
    prepared.audioFile,
    data.slateFrames / data.fps,
    data.durationInFrames / data.fps,
    audioWav,
    config.platforms.audio,
  );
  log(
    `  audio normalised: ${measured.inputLufs.toFixed(1)} → ${measured.outputLufs.toFixed(1)} LUFS, true peak ${measured.outputTruePeakDbtp.toFixed(1)} dBTP, ${measured.passes} pass${measured.passes === 1 ? '' : 'es'}`,
  );

  const presetsToWrite =
    presetArg === 'all'
      ? config.platforms
      : { ...config.platforms, presets: { [presetArg]: config.platforms.presets[presetArg]! } };
  const exports = exportPresets(prepared, master, audioWav, {
    ...config,
    platforms: presetsToWrite,
  });
  for (const e of exports) log(`  ${e.preset}: ${path.relative(process.cwd(), e.video)}`);

  if (!boolFlag(args, 'skip-probe')) {
    for (const e of exports) {
      const checks = [
        ...probeExport(e.video, e.preset, config, data.durationInFrames / data.fps),
        ...verifyManifest(e.manifest),
      ];
      const bad = checks.filter((c) => !c.ok);
      if (bad.length > 0) failed = true;
      allGroups.push({ heading: `${ep.folder} · ${e.preset}`, checks });
      log(
        `  probe ${e.preset}: ${bad.length === 0 ? 'all checks passed' : `${bad.length} FAILED — ${bad.map((c) => `${c.name} (${c.detail})`).join('; ')}`}`,
      );
    }
  }
}

if (allGroups.length > 0) {
  const report = path.join(OUT_DIR, 'PROBE_REPORT.md');
  writeFileSync(report, reportMarkdown(`Probe report — ${new Date().toISOString()}`, allGroups));
  log(`\nprobe report: ${path.relative(process.cwd(), report)}`);
}
log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
