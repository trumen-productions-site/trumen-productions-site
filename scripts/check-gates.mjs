#!/usr/bin/env node
/**
 * GATE-01 — print the launch gates and exit 1 if a required one is unsigned.
 *
 *   npm run check:gates
 */

import { loadConfig } from '../src/invest/config/index.mjs';
import { GATE_SIGNERS } from '../src/invest/lib/gates.mjs';

const cfg = loadConfig({ fresh: true });
const { gates, gateState } = cfg;

console.log('\n  Launch gates (src/invest/config/gates.json)\n');
for (const id of Object.keys(gates)) {
  const g = gates[id];
  const required = gateState.required.includes(id);
  const mark = g.signed ? '✔' : required ? '✘' : '–';
  const who = g.signed ? `${g.by}, ${g.date}` : `signs: ${GATE_SIGNERS[id]}`;
  console.log(`  ${mark} ${id.padEnd(14)} ${(required ? '' : '(not required) ').padEnd(0)}${g.note}`);
  console.log(`    ${who}`);
}
for (const p of gateState.problems) console.log(`\n  ⚠ ${p}`);

console.log(`\n  ${gateState.signed.length} signed · ${gateState.unsigned.length} required and unsigned\n`);
if (!gateState.ok) {
  console.log('  The production build is blocked. Staging builds are unaffected.\n');
  process.exit(1);
}
console.log('  All required gates are signed.\n');
