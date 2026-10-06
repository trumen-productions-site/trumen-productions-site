/** npm run new -- --id 007 --slug the-phone-call [--title "The Phone Call"]   scaffolds episodes/007-the-phone-call/ */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs, stringFlag } from './args.js';
import { loadAllConfig } from '../lib/config.js';
import { EPISODES_DIR } from '../lib/paths.js';
import { writeScratchTrack } from '../lib/scratch.js';

const args = parseArgs(process.argv.slice(2));
const id = stringFlag(args, 'id');
const slug = stringFlag(args, 'slug');
if (!id || !/^\d{3}$/.test(id) || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('usage: npm run new -- --id 007 --slug the-phone-call [--title "The Phone Call"]');
  process.exit(2);
}
const title =
  stringFlag(args, 'title') ??
  slug
    .split('-')
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
const dir = path.join(EPISODES_DIR, `${id}-${slug}`);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
const config = loadAllConfig();
mkdirSync(path.join(dir, 'audio'), { recursive: true });
const scratchLines = [3.0, 3.0, 3.5, 3.0];
const spec = {
  id,
  slug,
  title,
  targetSeconds: 45,
  set: 'courtroom-gallery',
  cast: [
    { rig: 'michael-present', role: 'lead', position: 'center' },
    { rig: 'silhouette-crowd', role: 'room', position: 'background' },
  ],
  audio: { take: 'audio/take.wav', scratch: 'audio/scratch.wav' },
  script: 'script.approved.txt',
  scratchLines,
  beats: [
    { id: 'hook', at: '0.0', action: 'lead_enters', expression: 'level' },
    {
      id: 'declaration',
      at: 'line:2',
      action: 'lead_steps_forward',
      camera: 'push',
      expression: 'resolve',
    },
    { id: 'reaction', at: 'line:3', action: 'room_reacts', variant: 'stillness' },
    { id: 'button', at: 'end-3.0', action: 'hold_on_lead' },
  ],
  cards: [
    { at: 'end-2.5', type: 'fact', text: 'March 27, 2000. Unanimous.', canonKey: 'reversal' },
    { at: 'end-1.5', type: 'title' },
  ],
  notes:
    'Scaffolded by npm run new. Replace the set, cast, beats and the fact card; see docs/EPISODE_AUTHORING.md.',
};
writeFileSync(path.join(dir, 'episode.json'), JSON.stringify(spec, null, 2) + '\n');
writeFileSync(
  path.join(dir, 'script.approved.txt'),
  [
    `# ${id} — ${title}`,
    "# AWAITING MICHAEL'S DICTATED TAKE",
    '#',
    '# Beat list (not dialogue). One spoken line per beat, in order:',
    '#   1. the hook: where we are and who is speaking',
    '#   2. the one true thing',
    '#   3. what the room did',
    '#   4. the button',
    '#',
    '# When the take is recorded: type each line below exactly as spoken, one per line, no comments needed.',
    '',
  ].join('\n'),
);
writeScratchTrack(
  path.join(dir, 'audio', 'scratch.wav'),
  scratchLines,
  config.series.lineGapSeconds,
  Number.parseInt(id, 10),
);
console.log(
  `scaffolded ${path.relative(process.cwd(), dir)}\n  episode.json · script.approved.txt · audio/scratch.wav\nnext: edit episode.json, then npm run validate -- --episode ${id}`,
);
