/** npm run preview -- --episode 001   prepares the episode and opens it in Remotion Studio. */
import { spawnSync } from 'node:child_process';
import { parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { loadEpisode } from '../lib/episode.js';
import { PROJECT_ROOT, episodeDir } from '../lib/paths.js';
import { prepareEpisode } from '../lib/prepare.js';

const args = parseArgs(process.argv.slice(2));
const episode = stringFlag(args, 'episode') ?? '001';
const config = loadAllConfig();
const prepared = prepareEpisode(loadEpisode(episodeDir(episode)), config);
console.log(`opening ${prepared.data.folder} in Remotion Studio (${prepared.data.mode} mode)…`);
const r = spawnSync('npx', ['remotion', 'studio', 'src/index.ts', '--props', prepared.renderJson], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
