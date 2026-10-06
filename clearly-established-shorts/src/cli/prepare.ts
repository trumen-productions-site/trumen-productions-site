/** npm run prepare-episodes -- --episode 001 | --all   writes .cache/episodes/<folder>/render.json */
import { readdirSync } from 'node:fs';
import { boolFlag, parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { loadEpisode } from '../lib/episode.js';
import { EPISODES_DIR, episodeDir } from '../lib/paths.js';
import { prepareEpisode } from '../lib/prepare.js';

const args = parseArgs(process.argv.slice(2));
const config = loadAllConfig();
const targets = boolFlag(args, 'all')
  ? readdirSync(EPISODES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [stringFlag(args, 'episode') ?? ''];
if (!targets[0]) {
  console.error('usage: npm run prepare-episodes -- --episode 001 | --all');
  process.exit(2);
}
for (const t of targets) {
  const ep = loadEpisode(episodeDir(t));
  const p = prepareEpisode(ep, config);
  console.log(
    `${ep.folder}: ${p.data.mode} · ${p.data.durationInFrames} frames · gate ${p.data.gate.clean ? 'CLEAN' : 'INTERNAL'} → ${p.renderJson}`,
  );
  for (const w of p.warnings) console.log(`  note: ${w}`);
}
