/**
 * LINT-01 · CANON-01 · NAMES · REQ-01
 *
 * The compliance lints, both as unit tests on samples that must fail and as
 * integration tests over the built investor pages and the config sources,
 * which must pass.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { builtPages, ROOT } from '../helpers/dom.mjs';
import { visibleText, lintForbidden, lintCanon, lintNames, lintRequired, lintPage, INVEST_PATHS } from '../../src/invest/lib/lint.mjs';
import { loadConfig } from '../../src/invest/config/index.mjs';
import { findTokens } from '../../src/invest/lib/pending.mjs';

const cfg = loadConfig({ fresh: true });
const pages = await builtPages();
const invest = pages.filter((p) => INVEST_PATHS.includes(p.sitePath));

describe('LINT-01 forbidden strings', () => {
  test('hype is caught', () => {
    for (const bad of ['a guaranteed return', 'risk-free', 'you can’t lose', 'a sure thing', 'a safe investment', 'TRU*MEN', 'Truman Productions']) {
      assert.ok(lintForbidden(bad).length > 0, `"${bad}" should be forbidden`);
    }
  });

  test('out-of-scope names are caught', () => {
    for (const bad of ['Danny Boy', 'MACRO', 'Tyler Perry', 'ReelShort', 'Liberty Argument', 'Estelusti', 'Green Plan']) {
      assert.ok(lintForbidden(bad).length > 0, `"${bad}" should be forbidden`);
    }
  });

  test('superseded facts are caught', () => {
    for (const bad of ['Lisa Davis', 'Swanson Plantation', 'sixty-plus days', 'Loyd', 'Eve Stacey', 'Summerville', 'nineteen']) {
      assert.ok(lintForbidden(bad).length > 0, `"${bad}" should be forbidden`);
    }
  });

  test('"guarantee" is permitted in legal.mjs and in the rendered disclaimer footer only', () => {
    assert.equal(lintForbidden('no guarantee', { file: 'legal.mjs' }).length, 0);
    assert.ok(lintForbidden('no guarantee', { file: 'story.mjs' }).length > 0);
    assert.equal(lintForbidden('a guarantee in the footer', { disclaimerText: 'the rest of the page' }).length, 0);
  });

  test('"passive income" is gated on G_TAX', () => {
    assert.ok(lintForbidden('passive income').length > 0);
    assert.equal(lintForbidden('passive income', { features: { taxSection: true } }).length, 0);
  });

  test('every investor page is clean', () => {
    assert.ok(invest.length >= 5, 'the investor pages were built');
    for (const page of invest) {
      const problems = lintForbidden(visibleText(page.html), { features: cfg.features, disclaimerText: visibleText(page.html.replace(/<footer[\s\S]*?<\/footer>/i, ' ')) });
      assert.deepEqual(problems, [], `${page.sitePath}: ${problems.join('; ')}`);
    }
  });

  test('every config source file is clean', async () => {
    const dir = path.join(ROOT, 'src', 'invest', 'config');
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.mjs'))) {
      const source = await readFile(path.join(dir, file), 'utf8');
      const problems = lintForbidden(source, { file, features: cfg.features });
      assert.deepEqual(problems, [], `${file}: ${problems.join('; ')}`);
    }
  });
});

describe('CANON-01 the record is exact', () => {
  test('wrong facts are caught', () => {
    assert.ok(lintCanon('He was arrested in 1995.').length > 0);
    assert.ok(lintCanon('a twenty-five-year-old salesman').length > 0);
    assert.ok(lintCanon('convicted in 1998').length > 0);
    assert.ok(lintCanon('served four years and six months').length > 0);
    assert.ok(lintCanon('reversed the conviction on March 28, 2000').length > 0);
    assert.ok(lintCanon('refiled on June 13, 2000').length > 0);
    assert.ok(lintCanon('the remittitur of June 29, 2000').length > 0);
    assert.ok(lintCanon('Op. No. 25094').length > 0);
    assert.ok(lintCanon('a divided Supreme Court').length > 0);
    assert.ok(lintCanon('refiled seventy-six days later').length > 0);
    assert.ok(lintCanon('held him seventy-seven days past the order').length > 0, 'the over-detention is ninety-three days in this repository');
  });

  test('the right facts pass', () => {
    const good =
      'arrested in 1996, a twenty-six-year-old, convicted in 1997, served three years and eleven months, reversed on March 27, 2000, ' +
      'refiled on June 12, 2000, the remittitur of June 28, 2000, Op. No. 25093, a unanimous South Carolina Supreme Court, ' +
      'refiled seventy-seven days later, held him ninety-three days past';
    assert.deepEqual(lintCanon(good), []);
  });

  test('every investor page is exact', () => {
    for (const page of invest) {
      const problems = lintCanon(visibleText(page.html));
      assert.deepEqual(problems, [], `${page.sitePath}: ${problems.join('; ')}`);
    }
    // And the load-bearing facts are actually present on the page.
    const main = visibleText(invest.find((p) => p.sitePath === '/invest/').html);
    for (const fact of ['1996', 'twenty-six', '1997', 'three years and eleven months', 'March 27, 2000', 'June 12, 2000', 'seventy-seven days', 'ninety-three days', 'Op. No. 25093', 'unanimous']) {
      assert.ok(main.includes(fact), `/invest/ omits "${fact}"`);
    }
  });
});

describe('NAMES the allowlist', () => {
  test('a stray proper name is caught; an allowed one is not; a sentence start is ignored', () => {
    assert.ok(lintNames('Produced with Jamie Foxx in mind.').length > 0);
    assert.equal(lintNames('Written by Michael Anthony Martin and David Alexander Martin.').length, 0);
    assert.equal(lintNames('Pick Your time. Still Reading this?').length, 0, 'the first word of a sentence never starts a name');
    assert.equal(lintNames('the office at Charlotte Hwy, Suite 7').length, 0, 'a comma ends a name');
  });

  test('no officials, counsel or partners are named on any investor page', () => {
    for (const page of invest) {
      const problems = lintNames(visibleText(page.html));
      assert.deepEqual(problems, [], `${page.sitePath}: ${problems.join('; ')}`);
      const text = visibleText(page.html);
      for (const never of ['Floyd', 'Moyer', 'Stacey', 'Godfrey', 'Ariail', 'Maw', 'Gibbs', 'Whiteside', 'Foxx', 'Jordan', 'Larson', 'Viola']) {
        assert.ok(!new RegExp(`\\b${never}\\b`).test(text), `${page.sitePath} names "${never}"`);
      }
    }
  });
});

describe('REQ-01 required text and noindex', () => {
  test('a page missing the qualifier is caught', () => {
    assert.ok(lintRequired('<html><head></head><body>hello</body></html>', '/invest/').length >= 3);
  });

  test('every investor page carries noindex,nofollow, the qualifier and the not-an-offer block', () => {
    for (const page of invest) {
      const problems = lintRequired(page.html, page.sitePath);
      assert.deepEqual(problems, [], `${page.sitePath}: ${problems.join('; ')}`);
      assert.ok(page.html.includes('<meta name="robots" content="noindex, nofollow">'), `${page.sitePath} is indexable`);
    }
  });

  test('/invest/ carries the risk sentence and the qualifier twice', () => {
    const text = visibleText(invest.find((p) => p.sitePath === '/invest/').html);
    assert.ok(text.includes('lose some or all'));
    assert.ok((text.match(/Accredited investors only/g) || []).length >= 2);
  });

  test('the whole lint passes over every investor page', () => {
    for (const page of invest) {
      assert.deepEqual(lintPage(page.html, page.sitePath, { features: cfg.features, extraNames: cfg.derived.configNames }), []);
    }
  });

  test('no investor page is in the sitemap', async () => {
    const sitemap = await readFile(path.join(ROOT, 'dist', 'sitemap.xml'), 'utf8');
    for (const p of INVEST_PATHS) assert.ok(!sitemap.includes(`${p}</loc>`), `${p} is in the sitemap`);
  });

  test('the company site never links to the investor page before launch', () => {
    for (const page of pages.filter((p) => !INVEST_PATHS.includes(p.sitePath))) {
      assert.ok(!/href="\/invest\/?"/.test(page.html), `${page.sitePath} links to /invest/`);
    }
  });
});

describe('staging renders what is undecided', () => {
  test('the staging build shows every pending term as a token and the ribbon', () => {
    const html = invest.find((p) => p.sitePath === '/invest/').html;
    assert.ok(findTokens(html).length >= 10, 'the undecided terms must be visible on staging');
    assert.ok(html.includes('inv-ribbon'));
    assert.ok(html.includes('Staging — not an offering'));
  });
});
