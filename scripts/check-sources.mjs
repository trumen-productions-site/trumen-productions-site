#!/usr/bin/env node
/**
 * SRC-01 — every comparable's source URL must answer 200.
 *
 *   npm run check:sources
 *
 * `comps` (what renders) must all pass or the script exits 1. `candidates`
 * (the research shortlist) are reported, never failed: they are not on the
 * page. The report is the worksheet for promoting a candidate — open the
 * URL, confirm the budget and gross figures match, add `verifiedOn`, move
 * it into `comps`, and turn `features.comps` on once three are there.
 *
 * Needs outbound network access. In an environment without it, the script
 * says so and exits 2 so CI can tell "unreachable" from "wrong".
 */

import { comps, candidates } from '../src/invest/config/comps.mjs';

const UA = 'Mozilla/5.0 (compatible; TRU-MEN-source-check/1.0; +https://trumen-productions.netlify.app)';

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': UA } });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': UA } });
    return { status: res.status, finalUrl: res.url };
  } catch (err) {
    return { status: 0, error: err.name === 'AbortError' ? 'timeout' : err.cause?.code || err.message };
  } finally {
    clearTimeout(timer);
  }
}

let failures = 0;
let unreachable = 0;

async function report(list, label, { mustPass }) {
  console.log(`\n  ${label} (${list.length})\n`);
  for (const c of list) {
    const r = await probe(c.sourceUrl);
    const ok = r.status === 200;
    if (r.status === 0) unreachable++;
    if (!ok && mustPass) failures++;
    const mark = ok ? '✔' : r.status === 0 ? '…' : '✘';
    console.log(`  ${mark} ${c.title} (${c.year})  ${c.budget} → ${c.gross}`);
    console.log(`      ${c.sourceUrl}  ${r.status ? `HTTP ${r.status}` : `unreachable (${r.error})`}${c.verifiedOn ? `  verified ${c.verifiedOn}` : '  NOT VERIFIED'}`);
    if (c.note) console.log(`      ${c.note}`);
  }
}

await report(comps, 'Comparables on the page', { mustPass: true });
await report(candidates, 'Candidates (not on the page)', { mustPass: false });

if (unreachable && unreachable === comps.length + candidates.length) {
  console.log('\n  No source could be reached from this environment. Run where outbound HTTPS is allowed.\n');
  process.exit(2);
}
if (failures) {
  console.log(`\n  ✘ ${failures} source${failures === 1 ? '' : 's'} on the page did not answer 200. Fix the URL or remove the comparable.\n`);
  process.exit(1);
}
console.log(`\n  ✔ Every source on the page answers. ${candidates.length} candidate${candidates.length === 1 ? '' : 's'} awaiting a human check of the figures.\n`);
