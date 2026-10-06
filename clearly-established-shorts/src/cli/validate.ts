/**
 * npm run validate -- --episode 001      schema + canon lint for one episode
 * npm run validate -- --all              every episode
 */
import { readdirSync } from 'node:fs';
import { boolFlag, parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { gateFor, lintEpisode, loadEpisode } from '../lib/episode.js';
import { errorsOf, lintCanonFile } from '../lib/canon.js';
import { EPISODES_DIR, episodeDir } from '../lib/paths.js';

const args = parseArgs(process.argv.slice(2));
const config = loadAllConfig();

const canonFindings = lintCanonFile(config.canon);
for (const f of canonFindings)
  console.log(`${f.level.toUpperCase()} [${f.rule}] ${f.where}: ${f.message}`);

const targets = boolFlag(args, 'all')
  ? readdirSync(EPISODES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [stringFlag(args, 'episode') ?? ''];
if (targets.length === 0 || targets[0] === '') {
  console.error('usage: npm run validate -- --episode 001 | --all');
  process.exit(2);
}

let failed = errorsOf(canonFindings).length > 0;
for (const target of targets) {
  try {
    const ep = loadEpisode(episodeDir(target));
    const findings = lintEpisode(ep, config);
    const gate = gateFor(ep.spec);
    for (const f of findings)
      console.log(`${f.level.toUpperCase()} [${f.rule}] ${f.where}: ${f.message}`);
    const errors = errorsOf(findings).length;
    if (errors > 0) failed = true;
    console.log(
      `${ep.folder}: ${errors === 0 ? 'ok' : `${errors} error${errors === 1 ? '' : 's'}`} · ${ep.script.awaitingTake ? 'awaiting take (scratch)' : `${ep.script.lines.length} approved lines`}${ep.hasTake ? ', take.wav present' : ''} · gate ${gate.clean ? 'CLEAN' : 'INTERNAL'}`,
    );
  } catch (e) {
    failed = true;
    console.error(`${target}: ${(e as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
