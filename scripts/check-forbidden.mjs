#!/usr/bin/env node
/**
 * LINT-01 · CANON-01 · NAMES · REQ-01 — run the compliance lints over the
 * built investor pages and the config sources. Exit 1 on any problem.
 *
 *   npm run check:forbidden          (builds first)
 *   node scripts/check-forbidden.mjs [dist-dir]
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadConfig } from '../src/invest/config/index.mjs';
import { lintPage, lintForbidden, INVEST_PATHS } from '../src/invest/lib/lint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.argv[2] || process.env.DIST_DIR || 'dist');
const cfg = loadConfig({ fresh: true });
const problems = [];

for (const sitePath of INVEST_PATHS) {
  const file = path.join(dist, sitePath.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) {
    problems.push(`${sitePath}: not built`);
    continue;
  }
  problems.push(...lintPage(await readFile(file, 'utf8'), sitePath, { features: cfg.features, extraNames: cfg.derived.configNames }));
}

const configDir = path.join(ROOT, 'src', 'invest', 'config');
for (const file of (await readdir(configDir)).filter((f) => f.endsWith('.mjs'))) {
  problems.push(...lintForbidden(await readFile(path.join(configDir, file), 'utf8'), { file, features: cfg.features }));
}

if (problems.length) {
  console.log(`\n  ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.log(`  ✘ ${p}`);
  console.log('\n  Rules and reasons: src/invest/config/lint/forbidden.mjs · docs/invest/COMPLIANCE.md\n');
  process.exit(1);
}
console.log(`\n  ✔ ${INVEST_PATHS.length} pages and the config sources are clean.\n`);
