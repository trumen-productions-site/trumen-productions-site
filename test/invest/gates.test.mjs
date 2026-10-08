/**
 * GATE-01 · GATE-02 · GATE-03 (build level)
 *
 * The production build is refused while a gate is unsigned, a Pending
 * remains, or 506(b) is the exemption — and it succeeds, with no tokens and
 * no ribbon, for a fully decided fixture with every gate signed. Each build
 * runs in a scratch directory so dist/ is never touched.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ROOT } from '../helpers/dom.mjs';
import { evaluateGates, GATE_IDS } from '../../src/invest/lib/gates.mjs';
import { readGates } from '../../src/invest/config/index.mjs';
import { findTokens } from '../../src/invest/lib/pending.mjs';

const run = promisify(execFile);
const FIXTURE = path.join(ROOT, 'test', 'invest', 'fixtures', 'decided.json');

async function buildProd(env = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ce-prod-'));
  try {
    const result = await run('node', ['build.mjs', '--prod', '--quiet'], { cwd: ROOT, env: { ...process.env, DIST_DIR: dir, ...env } });
    return { code: 0, stdout: result.stdout, stderr: result.stderr, dir };
  } catch (err) {
    return { code: err.code, stdout: err.stdout, stderr: err.stderr, dir };
  }
}

describe('GATE-01 the gate logic', () => {
  const blank = Object.fromEntries(GATE_IDS.map((id) => [id, { signed: false, by: '', date: '', note: '' }]));

  test('with nothing signed, every gate but G_TAX is required and unsigned', () => {
    const r = evaluateGates(blank, { taxSection: false });
    assert.equal(r.ok, false);
    assert.deepEqual(r.required, GATE_IDS.filter((g) => g !== 'G_TAX'));
    assert.equal(r.unsigned.length, 7);
    assert.deepEqual(r.problems, []);
  });

  test('G_TAX becomes required when the tax section is on', () => {
    const r = evaluateGates(blank, { taxSection: true });
    assert.ok(r.required.includes('G_TAX'));
    assert.equal(r.unsigned.length, 8);
  });

  test('a signature needs a name and a real date', () => {
    const gates = { ...blank, G_COPY: { signed: true, by: '', date: '2026-10-03', note: '' }, G_ADS: { signed: true, by: 'M', date: 'tomorrow', note: '' } };
    const r = evaluateGates(gates, { taxSection: false });
    assert.ok(r.problems.some((p) => p.startsWith('G_COPY') && p.includes('"by" is empty')));
    assert.ok(r.problems.some((p) => p.startsWith('G_ADS') && p.includes('YYYY-MM-DD')));
    assert.ok(!r.signed.includes('G_COPY'));
  });

  test('a name or date without signed:true is flagged', () => {
    const gates = { ...blank, G_DBA: { signed: false, by: 'Someone', date: '', note: '' } };
    const r = evaluateGates(gates, { taxSection: false });
    assert.ok(r.problems.some((p) => p.includes('sign it or clear the fields')));
  });

  test('all signed properly is ok', () => {
    const gates = Object.fromEntries(GATE_IDS.map((id) => [id, { signed: true, by: 'X', date: '2026-10-03', note: '' }]));
    assert.equal(evaluateGates(gates, { taxSection: true }).ok, true);
  });

  test('the committed gates.json is unsigned — the page ships dark', () => {
    const gates = readGates();
    for (const id of GATE_IDS) assert.equal(gates[id].signed, false, `${id} must not be signed by the build`);
  });
});

describe('the company-site build ships without the investor pages', () => {
  test('--site-only writes the company pages and none of the dark ones', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ce-site-'));
    await run('node', ['build.mjs', '--site-only', '--quiet'], { cwd: ROOT, env: { ...process.env, DIST_DIR: dir } });
    assert.ok(existsSync(path.join(dir, 'index.html')));
    assert.ok(existsSync(path.join(dir, 'clearly-established', 'index.html')));
    for (const p of ['invest', 'invest/confirmed', 'privacy', 'terms']) {
      assert.ok(!existsSync(path.join(dir, p, 'index.html')), `${p} must not be in a company-site build`);
    }
    await rm(dir, { recursive: true, force: true });
  });
});

describe('the production build', () => {
  test('GATE-01/02: is refused on the committed config, and leaves no artefact', async () => {
    const r = await buildProd();
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Production build refused/);
    assert.match(r.stderr, /GATE-01 G_SECURITIES is unsigned/);
    assert.match(r.stderr, /GATE-02 \/invest\/ still carries \[\[PENDING/);
    assert.match(r.stderr, /Turnstile/);
    assert.ok(!existsSync(path.join(r.dir, 'invest', 'index.html')), 'a refused production build must not leave pages behind');
    await rm(r.dir, { recursive: true, force: true });
  });

  test('GATE-03: 506(b) is refused with the stated message', async () => {
    const fixture = JSON.parse(await readFile(FIXTURE, 'utf8'));
    fixture.offering.exemption = '506(b)';
    const file = path.join(os.tmpdir(), `ce-506b-${process.pid}.json`);
    await writeFile(file, JSON.stringify(fixture));
    const r = await buildProd({ INVEST_CONFIG_OVERRIDE: file });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /506\(b\) does not permit general solicitation; this page cannot be advertised/);
    await rm(r.dir, { recursive: true, force: true });
    await rm(file, { force: true });
  });

  test('succeeds for a fully decided fixture with every gate signed: no tokens, no ribbon, terms rendered', async () => {
    const r = await buildProd({ INVEST_CONFIG_OVERRIDE: FIXTURE });
    assert.equal(r.code, 0, r.stderr);
    const html = await readFile(path.join(r.dir, 'invest', 'index.html'), 'utf8');
    assert.deepEqual(findTokens(html), []);
    assert.ok(!html.includes('inv-ribbon'), 'the staging ribbon must not render in production');
    assert.ok(html.includes('$25K'), 'the minimum renders from the fixture');
    assert.ok(html.includes('120%'), 'the waterfall renders from the fixture');
    assert.ok(html.includes('$1.5M'), 'the raise renders from the fixture');
    assert.ok(html.includes('Rule 506(c)'), 'the structure paragraph renders');
    assert.ok(html.includes('held in escrow'), 'the escrow sentence renders when escrow is true');
    assert.ok(html.includes('inv-funds__bar'), 'the use-of-funds bar renders');
    assert.ok(html.includes('d/b/a') === false, 'the brand is not in the entity line until brandCleared is true');
    await rm(r.dir, { recursive: true, force: true });
  });
});
