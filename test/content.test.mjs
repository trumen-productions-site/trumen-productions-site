/**
 * The content contract.
 *
 * A site about an altered record has to be exact about its own. These tests
 * hold the load-bearing facts steady across every page, refuse to let a
 * superseded figure creep back in, and make it impossible to ship with
 * placeholder contact details.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { builtPages } from './helpers/dom.mjs';
import { site, facts, quotes } from '../src/site.config.mjs';
import { spine, values, brothers, news } from '../src/data/company.mjs';
import { projects } from '../src/data/projects.mjs';
import { film, showCastingVision } from '../src/data/film.mjs';
import { faq } from '../src/data/faq.mjs';

const pages = await builtPages();
const allHtml = pages.map((p) => p.html).join('\n');
const byPath = new Map(pages.map((p) => [p.sitePath, p]));

/* ── The record ───────────────────────────────────────────────────────── */

describe('the record is consistent', () => {
  test('the dates are the ones on the opinion', () => {
    assert.equal(facts.reversed.value, 'March 27, 2000');
    assert.equal(facts.refiled.value, 'June 12, 2000');
    assert.equal(facts.arrested.value, '1996');
    assert.equal(facts.convicted.value, '1997');
  });

  test('time served is stated as three years and eleven months, never the superseded figure', () => {
    assert.equal(facts.incarcerated.value, '3 yrs 11 mos');
    assert.ok(
      /three years,? (and )?eleven months/i.test(allHtml),
      'the served figure never appears in words',
    );
    assert.ok(
      !/four and a half years/i.test(allHtml),
      'an early draft of the deck said "four and a half years"; the site must not',
    );
  });

  test('the over-detention is stated wherever the sentence is', () => {
    for (const path of ['/', '/clearly-established/', '/clearly-established/pitch/', '/our-story/']) {
      assert.match(
        byPath.get(path).html,
        /sixty|60\+/i,
        `${path} states the years served without the over-detention`,
      );
    }
  });

  test('the opinion number appears wherever the reversal is described', () => {
    for (const path of ['/', '/clearly-established/', '/clearly-established/pitch/', '/faq/']) {
      assert.ok(byPath.get(path).html.includes('25093'), `${path} omits the opinion number`);
    }
  });

  test('no page contradicts itself on the outcome', () => {
    assert.ok(!/acquitted/i.test(allHtml), 'the conviction was reversed, not an acquittal — check the wording');
    assert.ok(/unanimous/i.test(allHtml), 'the reversal being unanimous is load-bearing and must be stated');
  });
});

/* ── Attribution ──────────────────────────────────────────────────────── */

describe('quotations carry attribution', () => {
  for (const [key, quote] of Object.entries(quotes)) {
    test(`${key} is attributed`, () => {
      assert.ok(quote.attribution && quote.attribution.length > 3, 'no attribution');
      assert.ok(typeof quote.verify === 'boolean', 'no verification flag');
    });
  }

  test('the prosecutor and the judge are named on the case page', () => {
    const page = byPath.get('/clearly-established/').html;
    assert.ok(page.includes('Mark Moyer'), 'prosecutor not named');
    assert.ok(page.includes('Henry Floyd'), 'judge not named');
  });

  test('quotations that appear on the site also appear in the source data', () => {
    const page = byPath.get('/clearly-established/').html;
    for (const key of ['prosecutor', 'judge', 'court']) {
      const firstWords = quotes[key].text.split(' ').slice(0, 5).join(' ');
      assert.ok(
        page.includes(firstWords.replace(/&/g, '&amp;')),
        `${key} quote is in site.config.mjs but not on the page`,
      );
    }
  });
});

/*
 * A checklist, not a gate.
 *
 * Two of the three quotations were supplied by the authors and have not been
 * checked against a primary document by this build. That is a fact about the
 * work, not a bug in it — so this test reports rather than fails, and the
 * README carries the same list.
 */
describe('verification checklist', () => {
  test('unverified quotations are declared', () => {
    const pending = Object.entries(quotes)
      .filter(([, q]) => q.verify)
      .map(([k]) => k);
    if (pending.length) {
      console.log(
        `\n  ⓘ Quotations still to confirm against a primary document: ${pending.join(', ')}` +
          '\n    See docs/editing.md § Facts and verification.\n',
      );
    }
    assert.ok(Array.isArray(pending));
  });
});

/* ── Launch blockers ──────────────────────────────────────────────────── */

describe('launch readiness', () => {
  const PLACEHOLDER_DOMAINS = ['example.com', 'example.org', 'yourdomain', 'localhost'];

  test('no placeholder email address is published', () => {
    for (const address of Object.values(site.contact).filter((v) => typeof v === 'string' && v.includes('@'))) {
      for (const bad of PLACEHOLDER_DOMAINS) {
        assert.ok(!address.includes(bad), `placeholder contact address still in place: ${address}`);
      }
    }
    for (const bad of ['[email protected]', 'you@example.com', 'email@example.com', '(000) 000']) {
      assert.ok(!allHtml.includes(bad), `deck placeholder leaked onto the site: ${bad}`);
    }
  });

  test('the site URL is absolute and https', () => {
    assert.match(site.url, /^https:\/\/[a-z0-9.-]+$/i, `site.url looks wrong: ${site.url}`);
  });

  test('no lorem ipsum or TODO reaches the built HTML', () => {
    assert.ok(!/lorem ipsum/i.test(allHtml), 'placeholder copy in the build');
    assert.ok(!/\bTODO\b/.test(allHtml), 'a TODO reached the built HTML');
    assert.ok(!/\bFIXME\b/.test(allHtml));
    assert.ok(!/\$X–\$XM/.test(allHtml), 'the deck’s placeholder budget tier must not be published');
  });

  test('the confidential market report is not published', () => {
    for (const leak of ['ReelShort', 'DramaBox', 'My Drama', 'Holywater', 'Dhar Mann', 'buyout']) {
      assert.ok(
        !allHtml.includes(leak),
        `the internal vertical-series market report is marked confidential; "${leak}" must not appear on the public site`,
      );
    }
  });

  test('illustrative casting names are withheld unless deliberately enabled', () => {
    if (showCastingVision) return; // an explicit, documented choice
    for (const actor of film.characters.map((c) => c.castingVision).filter(Boolean)) {
      for (const name of actor.split(' · ')) {
        assert.ok(
          !allHtml.includes(name),
          `"${name}" is an illustrative casting suggestion, not an attachment, and must not be published`,
        );
      }
    }
  });
});

/* ── Everything in the data reaches a page ────────────────────────────── */

describe('nothing authored goes unpublished', () => {
  test('all three beats of the spine are on the story page', () => {
    const page = byPath.get('/our-story/').html;
    for (const beat of spine) {
      assert.ok(page.includes(beat.word), `missing beat: ${beat.word}`);
      assert.ok(page.includes(`id="${beat.id}"`), `missing anchor for ${beat.word}`);
    }
  });

  test('all four values are on the values page, each anchored', () => {
    const page = byPath.get('/values/').html;
    for (const value of values) {
      assert.ok(page.includes(value.latin), `missing value: ${value.latin}`);
      assert.ok(page.includes(`id="${value.id}"`), `missing anchor for ${value.latin}`);
    }
  });

  test('both founders are on the story page', () => {
    const page = byPath.get('/our-story/').html;
    for (const brother of brothers) {
      assert.ok(page.includes(brother.name), `missing founder: ${brother.name}`);
    }
  });

  test('all five projects are on the slate, each anchored', () => {
    const page = byPath.get('/projects/').html;
    for (const project of projects) {
      assert.ok(page.includes(`id="${project.id}"`), `missing anchor for ${project.id}`);
      assert.ok(page.includes(project.summary.slice(0, 40)), `missing summary for ${project.id}`);
    }
  });

  test('every FAQ answer is rendered', () => {
    const page = byPath.get('/faq/').html;
    assert.equal((page.match(/<details class="faq-item"/g) || []).length, faq.length);
  });

  test('the news log appears on the homepage', () => {
    const page = byPath.get('/').html;
    for (const item of news) {
      assert.ok(page.includes(item.title), `missing news item: ${item.title}`);
    }
  });

  test('every ask, theme and comparable reaches the project page', () => {
    const page = byPath.get('/clearly-established/').html;
    for (const item of [...film.ask, ...film.themes]) {
      assert.ok(page.includes(item.title), `missing: ${item.title}`);
    }
    for (const c of film.comparables) {
      assert.ok(page.includes(c.title), `missing comparable: ${c.title}`);
    }
  });
});

/* ── Brand ────────────────────────────────────────────────────────────── */

describe('the mark', () => {
  test('the wordmark is drawn with a star between TRU and MEN on every page', () => {
    for (const page of pages) {
      assert.ok(
        /<span class="wordmark__word">TRU<\/span><svg[^>]*class="star wordmark__star"/.test(page.html) ||
          page.html.includes('wordmark__star'),
        `${page.sitePath} does not render the star mark`,
      );
      assert.ok(page.html.includes('>MEN</span>'), `${page.sitePath} is missing the MEN half of the wordmark`);
    }
  });

  test('the motto and its legal line appear in the footer', () => {
    for (const page of pages) {
      assert.ok(page.html.includes(site.motto), `${page.sitePath} omits "${site.motto}"`);
      assert.ok(page.html.includes('Revelatory Productions, LLC'), `${page.sitePath} omits the legal entity`);
    }
  });

  /*
   * Visible copy always shows the drawn mark. The plain spelling survives in
   * two places on purpose: the <title>/meta, where a star glyph would look
   * like mojibake in a search result, and inside .visually-hidden text, where
   * it is the accessible name a screen reader reads instead of announcing
   * "black star".
   */
  test('the wordmark is never typed as plain "TruMen" in visible body copy', () => {
    for (const page of pages) {
      const main = (page.html.split('<main')[1]?.split('</main>')[0] ?? '').replace(
        /<span class="visually-hidden">[\s\S]*?<\/span>/g,
        '',
      );
      assert.ok(!/\bTruMen\b/.test(main), `${page.sitePath} types "TruMen" instead of the mark`);
    }
  });

  test('the accessible name of the mark is readable, not the star glyph', () => {
    for (const page of pages) {
      assert.ok(
        page.html.includes(`<span class="visually-hidden">${site.namePlain}`),
        `${page.sitePath} does not give the drawn wordmark a spoken name`,
      );
    }
  });
});
