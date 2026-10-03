#!/usr/bin/env node
/**
 * GATE-02 — list every [[PENDING]] token in the built investor pages, and
 * every undecided value in config, then exit 1 if any remain.
 *
 *   npm run check:pending           (builds first)
 *   node scripts/check-pending.mjs [dist-dir]
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { loadConfig } from '../src/invest/config/index.mjs';
import { findTokens } from '../src/invest/lib/pending.mjs';
import { INVEST_PATHS } from '../src/invest/lib/lint.mjs';

const dist = path.resolve(process.argv[2] || process.env.DIST_DIR || 'dist');
const cfg = loadConfig({ fresh: true });

console.log('\n  Undecided values in config\n');
for (const p of cfg.derived.pending) console.log(`  · ${p.path.padEnd(34)} ${p.reason}`);
if (!cfg.derived.pending.length) console.log('  (none)');

let total = 0;
console.log('\n  Tokens rendered on the built pages\n');
for (const sitePath of INVEST_PATHS) {
  const file = path.join(dist, sitePath.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) {
    console.log(`  ${sitePath.padEnd(26)} not built`);
    continue;
  }
  const tokens = findTokens(await readFile(file, 'utf8'));
  total += tokens.length;
  console.log(`  ${sitePath.padEnd(26)} ${tokens.length} token${tokens.length === 1 ? '' : 's'}`);
  for (const t of [...new Set(tokens)]) console.log(`      [[PENDING: ${t.replace(/&quot;/g, '"').replace(/&amp;/g, '&')}]]`);
}

console.log(`\n  ${total} token${total === 1 ? '' : 's'} on staging. ${total ? 'The production build is blocked until each is decided in src/invest/config/.' : 'Nothing pending.'}\n`);
process.exit(total ? 1 : 0);
