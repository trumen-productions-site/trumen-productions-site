/**
 * The production gate. `node build.mjs --prod` runs this after rendering and
 * deletes dist/ if anything fails, so a production artefact cannot exist
 * with an unsigned gate, a pending term, or a forbidden phrase in it.
 *
 *   GATE-01  every required gate signed
 *   GATE-02  no [[PENDING]] token in any investor page
 *   GATE-03  506(b) refused
 *   LINT-01 / CANON-01 / NAMES / REQ-01 over the built pages
 *   SRC-01   (optional, network) every comp source reachable
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { loadConfig } from '../config/index.mjs';
import { findTokens } from './pending.mjs';
import { lintPage, INVEST_PATHS } from './lint.mjs';
import { GATE_SIGNERS } from './gates.mjs';

function fileFor(dist, sitePath) {
  return path.join(dist, sitePath.replace(/^\//, ''), 'index.html');
}

export async function productionChecks({ dist, config = loadConfig({ fresh: true }) }) {
  const failures = [];

  // GATE-01
  for (const id of config.gateState.unsigned) {
    failures.push(`GATE-01 ${id} is unsigned (${config.gates[id]?.note}). Signs: ${GATE_SIGNERS[id]}.`);
  }
  for (const p of config.gateState.problems) failures.push(`GATE-01 ${p}`);

  // GATE-03 and the other production-only config rules
  for (const p of config.derived.productionProblems) failures.push(`GATE-03 ${p}`);

  // GATE-02 and the lints, over the built pages
  for (const sitePath of INVEST_PATHS) {
    const file = fileFor(dist, sitePath);
    if (!existsSync(file)) {
      failures.push(`${sitePath} was not built`);
      continue;
    }
    const html = await readFile(file, 'utf8');
    for (const reason of findTokens(html)) failures.push(`GATE-02 ${sitePath} still carries [[PENDING: ${reason}]]`);
    for (const p of lintPage(html, sitePath, { features: config.features, extraNames: config.derived.configNames })) failures.push(`LINT ${p}`);
  }

  // The staging ribbon must not survive into production.
  const investFile = fileFor(dist, '/invest/');
  if (existsSync(investFile) && (await readFile(investFile, 'utf8')).includes('inv-ribbon')) {
    failures.push('the STAGING ribbon is in the production build');
  }

  return failures;
}

export default productionChecks;
