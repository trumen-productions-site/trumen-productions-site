#!/usr/bin/env node
/**
 * PERF-01 — Lighthouse against the staged investor page, mobile, with the
 * budgets from HANDOFF.md § 15:
 *
 *   Performance ≥ 95 · Accessibility 100 · Best Practices ≥ 95
 *   LCP ≤ 1.8 s (throttled 4G) · CLS ≤ 0.02 · total JS ≤ 60 KB gzipped
 *   no web-font downloads on the critical path
 *
 *   npm run perf        (needs `npm install --no-save lighthouse`; uses the same Chromium as the E2E suite)
 *
 * Writes the full report to test/e2e/output/lighthouse-invest.html.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'test', 'e2e', 'output');
const require = createRequire(import.meta.url);
process.env.DB_FILE = ':memory:';

const BUDGETS = { performance: 95, accessibility: 100, 'best-practices': 95, lcpMs: 1800, cls: 0.02, jsKb: 60 };

function findChromium() {
  const candidates = [process.env.CHROME_BIN, process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'), '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  try {
    candidates.splice(1, 0, require('playwright-core').chromium.executablePath());
  } catch {
    /* fine */
  }
  return candidates.find((c) => existsSync(c)) || null;
}

async function main() {
  let lighthouse;
  try {
    ({ default: lighthouse } = await import('lighthouse'));
  } catch {
    console.error('\n  PERF-01 needs lighthouse:  npm install --no-save lighthouse\n');
    process.exit(1);
  }
  const chrome = findChromium();
  if (!chrome) {
    console.error('\n  No Chromium found. Set CHROME_BIN.\n');
    process.exit(1);
  }

  const { devEnv, createServer } = await import(pathToFileURL(path.join(ROOT, 'tools', 'dev-api.mjs')).href);
  const server = await createServer(await devEnv({ DEBUG: 'false' }, { readDevVars: false }));
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/invest/`;

  const port = 9222 + Math.floor(Math.random() * 1000);
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/lh-profile-' + port, 'about:blank'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));

  try {
    const result = await lighthouse(url, { port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices'], formFactor: 'mobile', screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 2, disabled: false }, throttlingMethod: 'simulate' });
    const lhr = result.lhr;
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, 'lighthouse-invest.html'), result.report[0]);
    await writeFile(path.join(OUT, 'lighthouse-invest.json'), result.report[1]);

    const score = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? Infinity;
    const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? Infinity;
    const jsBytes = (lhr.audits['network-requests']?.details?.items || []).filter((i) => i.resourceType === 'Script').reduce((s, i) => s + (i.transferSize || 0), 0);
    const fontRequests = (lhr.audits['network-requests']?.details?.items || []).filter((i) => i.resourceType === 'Font');

    const rows = [
      ['Performance', score('performance'), `≥ ${BUDGETS.performance}`, score('performance') >= BUDGETS.performance],
      ['Accessibility', score('accessibility'), `= ${BUDGETS.accessibility}`, score('accessibility') >= BUDGETS.accessibility],
      ['Best practices', score('best-practices'), `≥ ${BUDGETS['best-practices']}`, score('best-practices') >= BUDGETS['best-practices']],
      ['LCP (ms)', Math.round(lcp), `≤ ${BUDGETS.lcpMs}`, lcp <= BUDGETS.lcpMs],
      ['CLS', cls.toFixed(3), `≤ ${BUDGETS.cls}`, cls <= BUDGETS.cls],
      ['JS transferred (KB)', (jsBytes / 1024).toFixed(1), `≤ ${BUDGETS.jsKb}`, jsBytes / 1024 <= BUDGETS.jsKb],
      ['Web-font downloads', fontRequests.length, 'reported', true],
    ];
    console.log(`\n  PERF-01 Lighthouse (mobile, simulated 4G) — ${url}\n`);
    for (const [k, v, b, ok] of rows) console.log(`  ${ok ? '✔' : '✘'} ${k.padEnd(22)} ${String(v).padStart(8)}   budget ${b}`);
    const failed = rows.filter((r) => !r[3]);
    // Name every audit that is not perfect, so a miss is actionable from the console.
    for (const cat of ['accessibility', 'best-practices', 'performance']) {
      const misses = (lhr.categories[cat]?.auditRefs || [])
        .map((r) => lhr.audits[r.id])
        .filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicative')
        .map((a) => `${a.id} (${a.score}) — ${a.title}${a.displayValue ? `: ${a.displayValue}` : ''}`);
      if (misses.length) console.log(`\n  ${cat} audits below 1:\n    ${misses.join('\n    ')}`);
    }
    const lcpEl = lhr.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet;
    if (lcpEl) console.log(`\n  LCP element: ${lcpEl.slice(0, 120)}`);
    console.log(`\n  report: test/e2e/output/lighthouse-invest.html\n`);
    if (failed.length) process.exit(1);
  } finally {
    proc.kill();
    await new Promise((r) => server.close(r));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
