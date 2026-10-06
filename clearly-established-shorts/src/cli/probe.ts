/** npm run probe -- --episode 001 | --all   re-runs the checks on existing exports. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { boolFlag, parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { manifestsUnder } from '../lib/export.js';
import type { Manifest } from '../lib/export.js';
import { OUT_DIR } from '../lib/paths.js';
import { probeExport, reportMarkdown, verifyManifest, type Check } from '../lib/probe.js';

const args = parseArgs(process.argv.slice(2));
const config = loadAllConfig();
const episode = stringFlag(args, 'episode');
if (!episode && !boolFlag(args, 'all')) {
  console.error('usage: npm run probe -- --episode 001 | --all');
  process.exit(2);
}
const manifests = manifestsUnder(OUT_DIR).filter(
  (m) =>
    !episode ||
    path.relative(OUT_DIR, m).startsWith(`${episode}-`) ||
    path.relative(OUT_DIR, m).startsWith(episode),
);
if (manifests.length === 0) {
  console.error(`no exports found under ${OUT_DIR}; run npm run render first`);
  process.exit(1);
}
const groups: Array<{ heading: string; checks: Check[] }> = [];
let failed = false;
for (const mf of manifests) {
  const m = JSON.parse(readFileSync(mf, 'utf8')) as Manifest;
  const video = path.join(
    path.dirname(mf),
    Object.keys(m.outputs).find((n) => n.endsWith('.mp4')) ?? '',
  );
  const checks = existsSync(video)
    ? [...probeExport(video, m.preset, config, m.durationSeconds), ...verifyManifest(mf)]
    : [{ name: 'exists', ok: false, detail: `${video} missing` }];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) failed = true;
  groups.push({ heading: `${m.episode.folder} · ${m.preset}`, checks });
  console.log(
    `${m.episode.folder} · ${m.preset}: ${bad.length === 0 ? 'all checks passed' : `${bad.length} FAILED`}`,
  );
  for (const c of bad) console.log(`  FAIL ${c.name}: ${c.detail}`);
}
const report = path.join(OUT_DIR, 'PROBE_REPORT.md');
writeFileSync(report, reportMarkdown(`Probe report — ${new Date().toISOString()}`, groups));
console.log(`report: ${path.relative(process.cwd(), report)}`);
process.exit(failed ? 1 : 0);
