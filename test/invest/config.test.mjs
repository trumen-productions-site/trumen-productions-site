/**
 * CFG-01 · CFG-03 · GATE-03 (config level)
 * The investor config parses against its schemas, the cross-file rules hold,
 * and the schema validator itself refuses what it should.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { s, SchemaError } from '../../src/invest/lib/schema.mjs';
import { pending, isPending } from '../../src/invest/lib/pending.mjs';
import { rawConfig, validateConfig, productionProblems, loadConfig, mergeConfig, ConfigError } from '../../src/invest/config/index.mjs';
import { features } from '../../src/invest/config/features.mjs';

describe('CFG-01 the config parses', () => {
  test('every config module matches its schema', () => {
    assert.doesNotThrow(() => validateConfig(rawConfig()));
  });

  test('loadConfig returns the derived facts', () => {
    const cfg = loadConfig({ fresh: true });
    assert.equal(cfg.env, 'staging');
    assert.ok(cfg.pageVersion.length >= 7);
    assert.ok(Array.isArray(cfg.derived.tilesShown));
    assert.ok(cfg.derived.pending.length > 0, 'the brief leaves the terms undecided; the config must say so');
    assert.equal(cfg.derived.storyVariant.id, 'A_conservative');
  });

  test('a tile pointing at an undefined footnote is refused', () => {
    const cfg = rawConfig();
    const broken = { ...cfg, offering: { ...cfg.offering, tiles: [...cfg.offering.tiles, { id: 'x', label: 'X', value: 'minimum', footnoteId: 'nope', show: true }] } };
    assert.throws(() => validateConfig(broken), ConfigError);
    assert.throws(() => validateConfig(broken), /footnote "nope" is not defined/);
  });

  test('variant B requires an approver', () => {
    const cfg = rawConfig();
    const broken = { ...cfg, story: { ...cfg.story, variant: 'B_canon' } };
    assert.throws(() => validateConfig(broken), /B_canon requires approvedBy/);
  });

  test('comps on with fewer than three verified comps is refused', () => {
    const cfg = rawConfig();
    const broken = { ...cfg, features: { ...cfg.features, comps: true } };
    assert.throws(() => validateConfig(broken), /need 3, or turn the flag off/);
  });

  test('the tax section cannot be on without signed wording', () => {
    const cfg = rawConfig();
    const broken = { ...cfg, features: { ...cfg.features, taxSection: true } };
    assert.throws(() => validateConfig(broken), /legal.tax is null/);
  });

  test('the conservative defaults are in force', () => {
    assert.equal(features.taxSection, false);
    assert.equal(features.castingComps, false);
    assert.equal(features.followList, false);
    assert.equal(features.sms, false);
    assert.equal(features.metaPixel, false);
    assert.equal(features.counselDisplay, false);
  });
});

describe('CFG-03 use of funds', () => {
  const UseOfFunds = s.refine(
    s.array(s.object({ label: s.string({ min: 1 }), pct: s.number({ min: 0, max: 100 }) }), { min: 2 }),
    (list) => Math.abs(list.reduce((sum, x) => sum + x.pct, 0) - 100) < 0.001,
    'use of funds must sum to 100 (test CFG-03)',
  );

  test('a config whose allocations do not sum to 100 is refused', () => {
    const cfg = rawConfig();
    const broken = { ...cfg, offering: { ...cfg.offering, useOfFunds: [{ label: 'A', pct: 60 }, { label: 'B', pct: 30 }] } };
    assert.throws(() => validateConfig(broken), /must sum to 100/);
  });

  test('allocations summing to 100 pass', () => {
    assert.doesNotThrow(() => UseOfFunds.parse([{ label: 'A', pct: 60 }, { label: 'B', pct: 40 }]));
  });
});

describe('GATE-03 the exemption', () => {
  test('506(b) is refused for production with the stated message', () => {
    const cfg = rawConfig();
    const problems = productionProblems({ ...cfg, offering: { ...cfg.offering, exemption: '506(b)' } });
    assert.ok(problems.includes('506(b) does not permit general solicitation; this page cannot be advertised'));
  });

  test('506(c) raises no exemption problem', () => {
    const cfg = rawConfig();
    const problems = productionProblems({ ...cfg, offering: { ...cfg.offering, exemption: '506(c)' } });
    assert.ok(!problems.some((p) => p.includes('506(b)')));
  });

  test('a target return without a basis document is refused for production', () => {
    const cfg = rawConfig();
    const problems = productionProblems({ ...cfg, offering: { ...cfg.offering, targetReturn: { multiple: 2, basisDocOnFile: false } } });
    assert.ok(problems.some((p) => p.includes('basis document')));
  });

  test('the Turnstile test key is refused for production', () => {
    const problems = productionProblems(rawConfig());
    assert.ok(problems.some((p) => p.includes('Turnstile')));
  });
});

describe('the schema validator', () => {
  test('reports every problem, with its path', () => {
    const Schema = s.object({ a: s.string({ min: 2 }), b: s.number({ min: 0 }), c: s.array(s.boolean()) });
    const problems = Schema.problems({ a: 'x', b: -1, c: [true, 'no'], d: 1 }, 'root');
    assert.deepEqual(problems, [
      'root.a: expected at least 2 characters',
      'root.b: -1 is below the minimum 0',
      'root.c[1]: expected boolean, got string',
      'root.d: unexpected key',
    ]);
  });

  test('parse throws a SchemaError', () => {
    assert.throws(() => s.string().parse(5), SchemaError);
  });

  test('pendingOr accepts a Pending with a reason and rejects one without', () => {
    const P = s.pendingOr(s.number());
    assert.doesNotThrow(() => P.parse(pending('why')));
    assert.doesNotThrow(() => P.parse(3));
    assert.throws(() => P.parse({ pending: '  ' }), /must say why/);
    assert.throws(() => P.parse('3'), /expected number/);
  });

  test('enum, literal, nullable, optional, union, record', () => {
    assert.doesNotThrow(() => s.enum(['a', 'b']).parse('a'));
    assert.throws(() => s.enum(['a', 'b']).parse('c'));
    assert.throws(() => s.literal('x').parse('y'));
    assert.doesNotThrow(() => s.nullable(s.string()).parse(null));
    assert.doesNotThrow(() => s.optional(s.string()).parse(undefined));
    assert.doesNotThrow(() => s.union(s.string(), s.number()).parse(1));
    assert.throws(() => s.union(s.string(), s.number()).parse(true));
    assert.doesNotThrow(() => s.record(s.number()).parse({ a: 1 }));
    assert.throws(() => s.record(s.number()).parse({ a: '1' }));
  });
});

describe('mergeConfig (the test fixture mechanism)', () => {
  test('replaces a Pending, merges objects, merges arrays by index', () => {
    const base = { a: pending('x'), b: { c: 1, d: 2 }, list: [{ k: 1 }, { k: 2 }] };
    const out = mergeConfig(base, { a: 5, b: { d: 3 }, list: [{ k: 9 }] });
    assert.equal(out.a, 5);
    assert.deepEqual(out.b, { c: 1, d: 3 });
    assert.deepEqual(out.list, [{ k: 9 }, { k: 2 }]);
    assert.ok(!isPending(out.a));
  });
});
