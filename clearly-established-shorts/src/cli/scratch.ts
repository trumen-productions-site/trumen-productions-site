/** npm run scratch -- --episode 001 | --all   regenerates scratch tracks from scratchLines. */
import { readdirSync } from 'node:fs';
import { boolFlag, parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { loadEpisode } from '../lib/episode.js';
import { EPISODES_DIR, episodeDir } from '../lib/paths.js';
import { writeScratchTrack } from '../lib/scratch.js';

const args = parseArgs(process.argv.slice(2));
const config = loadAllConfig();
const targets = boolFlag(args, 'all')
  ? readdirSync(EPISODES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [stringFlag(args, 'episode') ?? ''];
if (!targets[0]) {
  console.error('usage: npm run scratch -- --episode 001 | --all');
  process.exit(2);
}
for (const t of targets) {
  const ep = loadEpisode(episodeDir(t));
  writeScratchTrack(
    ep.scratchPath,
    ep.spec.scratchLines,
    config.series.lineGapSeconds,
    Number.parseInt(ep.spec.id, 10),
  );
  console.log(
    `${ep.folder}: wrote ${ep.spec.audio.scratch} (${ep.spec.scratchLines.length} lines)`,
  );
}
