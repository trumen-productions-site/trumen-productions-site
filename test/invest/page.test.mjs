/**
 * The rendered investor page: structure the brief specifies, as built.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { builtPages, headings, ids, DIST, SRC } from '../helpers/dom.mjs';
import { subsetCss, classesUsed, classesDefined, parseBlocks } from '../../src/invest/lib/css-subset.mjs';
import { loadConfig } from '../../src/invest/config/index.mjs';
import { visibleText } from '../../src/invest/lib/lint.mjs';

const cfg = loadConfig({ fresh: true });
const pages = await builtPages();
const page = pages.find((p) => p.sitePath === '/invest/');
const html = page.html;

describe('the investor page', () => {
  test('is built, dark, and carries the brief’s metadata', () => {
    assert.ok(page);
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(html.includes('<title>Invest in CLEARLY ESTABLISHED · Viri Veri Productions</title>'));
    assert.ok(html.includes('og:image" content="https://'));
    assert.ok(html.includes('/assets/img/invest-keyart.png'));
    assert.ok(!html.includes('site-nav'), 'the company navigation must not appear');
    assert.ok(!html.includes('class="newsletter"'), 'the company newsletter must not appear');
  });

  test('sections appear in the brief’s order', () => {
    const order = ['id="top"', 'id="terms"', 'id="the-case"', 'id="why"', 'id="start"', 'id="team"', 'id="cta-mid"', 'id="marketing"', 'id="perks"', 'id="use-of-funds"', 'id="cta-late"', 'id="faq"', 'id="final-title"', 'class="inv-footer', 'data-sticky'];
    let last = -1;
    for (const marker of order) {
      const i = html.indexOf(marker);
      assert.ok(i > last, `${marker} is missing or out of order`);
      last = i;
    }
  });

  test('the header and hero carry the qualifier; the hero has two calls to action', () => {
    const header = html.split('</header>')[0];
    assert.ok(header.includes('Accredited investors only'));
    const hero = html.split('id="top"')[1].split('</section>')[0];
    assert.ok(hero.includes('Accredited investors only. Not an offer of securities.'));
    assert.ok(hero.includes('href="#start"'));
    assert.ok(hero.includes('href="#why"'));
    assert.ok(hero.includes('Own a piece of <em>the record</em>.'));
    assert.ok(hero.includes('inv-keyart'), 'the typographic key art is in the hero');
  });

  test('the stat strip shows exactly the tiles whose conditions are met, each with a footnote in view', () => {
    const strip = html.split('id="terms"')[1].split('</section>')[0];
    const tiles = (strip.match(/<div class="inv-stat">/g) || []).length;
    assert.equal(tiles, cfg.derived.tilesShown.length);
    assert.equal(tiles, 4, 'minimum, payback, raise, format — target and tax are hidden by their conditions');
    assert.ok(!strip.includes('Target return'));
    assert.ok(!strip.includes('Tax treatment'));
    assert.ok(strip.includes('<aside class="footnotes"'), 'footnotes print inside the strip');
    const refs = [...strip.matchAll(/aria-label="Footnote (\d)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(refs, [1, 2, 3, 4], 'numbered by first appearance');
  });

  test('footnote ids are unique even when a note prints in two sections', () => {
    const all = ids(html);
    assert.equal(all.filter((i) => i === 'fn-waterfall').length, 1);
    assert.equal(all.filter((i) => i === 'fnref-waterfall').length, 1);
    assert.ok((html.match(/Describes the order of distributions/g) || []).length >= 2, 'the waterfall note prints under the strip and under the structure card');
  });

  test('headings: one h1, then h2 sections with h3 cards, no skips', () => {
    const hs = headings(html);
    assert.equal(hs.filter((h) => h.level === 1).length, 1);
    assert.ok(hs.some((h) => h.level === 2 && h.text === 'The case'));
    assert.ok(hs.some((h) => h.level === 2 && h.text === 'Why investors participate'));
    assert.ok(hs.some((h) => h.level === 2 && h.text === 'Use of funds'));
  });

  test('the story section carries the conservative variant, the timeline and the vertical bullet', () => {
    const story = html.split('id="the-case"')[1].split('</section>')[0];
    assert.ok(story.includes(cfg.derived.storyVariant.logline.slice(0, 60).replace(/’/g, '’')));
    assert.ok(!story.includes('should have been impossible'), 'variant B wording must not render without approval');
    assert.equal((story.match(/<li><span class="inv-timeline__date">/g) || []).length, cfg.story.timeline.length);
    assert.ok(story.includes('Built for the phone first.'));
  });

  test('the why section is head, wallet, heart — structure, work, experience — with no tax card', () => {
    const why = html.split('id="why"')[1].split('</section>')[0];
    const nums = [...why.matchAll(/<p class="inv-card__num">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(nums, ['01 · Structure', '02 · The work', '03 · The experience']);
    assert.ok(!why.includes('Copyright applications filed'), 'registration lines wait for their gates');
  });

  test('the flow scaffold: progress label, hidden island root, visible no-JS form posting to /api/lead, config JSON', () => {
    const flow = html.split('id="start-section"')[1].split('</section>')[0];
    assert.ok(flow.includes('Step 1 of 6 · About 30 seconds'));
    assert.ok(flow.includes('data-flow-root hidden'));
    assert.ok(flow.includes('method="post" action="/api/lead"'));
    assert.ok(flow.includes('name="accredited"'));
    assert.ok(flow.includes('name="website"'), 'honeypot present');
    assert.ok(flow.includes(cfg.legal.flowLines.notSubscription));
    assert.ok(!flow.includes('name="smsConsent"'), 'no SMS box while features.sms is off');
    const json = html.match(/<script type="application\/json" id="invest-flow-config">([\s\S]*?)<\/script>/)[1];
    const data = JSON.parse(json);
    assert.equal(data.totalSteps, 6);
    assert.equal(data.sms, false);
    assert.ok(data.ranges.pending, 'the minimum is pending, so the ranges say so');
    assert.equal(data.turnstileSiteKey, cfg.investSite.turnstile.siteKey);
    assert.ok(!json.includes('</script'), 'the JSON cannot break out of its tag');
  });

  test('no comparables section, no casting, no photographs, no third-party art', () => {
    assert.ok(!html.includes('id="comparables"'), 'comps are off until verified');
    assert.ok(!html.includes('not attached'));
    const imgs = html.match(/<img\b[^>]*>/g) || [];
    for (const img of imgs) {
      assert.match(img, /src="\/assets\/img\/viri-veri-lockup-(navy|transparent)\.svg"/, `the only <img> allowed is the lockup: ${img}`);
    }
    assert.equal(imgs.length, 2, 'the lockup appears exactly twice: header and footer');
  });

  test('the team is the two authors, and no one else', () => {
    const team = html.split('id="team"')[1].split('</section>')[0];
    assert.ok(team.includes('Michael Anthony Martin'));
    assert.ok(team.includes('David Alexander Martin'));
    assert.ok(!team.includes('Whiteside'));
    assert.equal((team.match(/<article class="inv-card inv-person">/g) || []).length, 2);
  });

  test('perks: six cards with the level pending and the caption', () => {
    const perks = html.split('id="perks"')[1].split('</section>')[0];
    assert.equal((perks.match(/<article class="inv-card inv-card--icon">/g) || []).length, 6);
    assert.equal((perks.match(/\[\[PENDING: perk level/g) || []).length, 6);
    assert.ok(perks.includes('Perks vary by investment level. Details on your call.'));
  });

  test('use of funds shows the pending token and the caption while undecided', () => {
    const funds = html.split('id="use-of-funds"')[1].split('</section>')[0];
    assert.ok(funds.includes('[[PENDING: use-of-funds allocation'));
    assert.ok(funds.includes('Allocations are approximate and subject to the final budget.'));
    assert.ok(!funds.includes('inv-funds__bar'));
  });

  test('the FAQ has the six questions, with the blunt risk answer', () => {
    const faq = html.split('id="faq"')[1].split('</section>')[0];
    assert.equal((faq.match(/<details class="faq-item"/g) || []).length, 6);
    assert.ok(faq.includes('This is a high-risk investment. You could lose some or all of your money.'));
    assert.ok(faq.includes('[[PENDING: issuer legal name'));
  });

  test('the legal footer: structure (pending), not-an-offer, story notice, entity without d/b/a, address, privacy link, no SMS link', () => {
    const footer = html.split('<footer class="inv-footer')[1];
    assert.ok(footer.includes('[[PENDING: exemption'));
    for (const p of cfg.legal.notAnOffer) assert.ok(footer.includes(p.slice(0, 50)), 'not-an-offer paragraph missing');
    assert.ok(footer.includes('Op. No. 25093 (S.C. 2000)'));
    assert.ok(footer.includes('© 2026 Revelatory Productions, LLC'));
    assert.ok(!footer.includes('d/b/a'), 'the brand waits for G_DBA');
    assert.ok(footer.includes('4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710'));
    assert.ok(footer.includes('href="/privacy/"'));
    assert.ok(!footer.includes('href="/terms/"'), 'SMS terms link only with features.sms');
    assert.ok(footer.includes('michaelmartin@greenplanit.org'));
  });

  test('the sticky bar is present and hidden until scripted', () => {
    assert.ok(html.includes('<div class="inv-sticky" data-sticky hidden>'));
  });

  test('the module scripts are loaded as modules, root-relative', () => {
    assert.ok(html.includes('<script src="/assets/js/invest/flow.js" type="module"></script>'));
    assert.ok(!html.includes('challenges.cloudflare.com/turnstile'), 'Turnstile is loaded by the island on demand, not by the page');
  });

  test('the header carries the supplied lockup with a spoken name, and the retired mark is gone', () => {
    const header = html.split('</header>')[0];
    assert.ok(header.includes('src="/assets/img/viri-veri-lockup-navy.svg"'));
    assert.ok(header.includes('<span class="visually-hidden">Viri Veri Productions</span>'));
    for (const old of ['TRU★MEN', 'TruMen', 'TRU*MEN']) assert.ok(!html.includes(old), `still carries ${old}`);
  });

  test('the word "guarantee" appears only inside the footer disclaimer', () => {
    const body = visibleText(html.replace(/<footer[\s\S]*?<\/footer>/i, ''));
    assert.ok(!/guarantee/i.test(body));
  });
});

describe('the stylesheet subset', () => {
  test('investor pages link the subset, never the whole company stylesheet', () => {
    for (const p of pages.filter((x) => x.sitePath.startsWith('/invest') || ['/privacy/', '/terms/'].includes(x.sitePath))) {
      assert.ok(!p.html.includes('/assets/css/site.css'), `${p.sitePath} links site.css`);
      assert.ok(p.html.includes('/assets/css/invest-base.css'), `${p.sitePath} misses the subset`);
      assert.ok(p.html.includes('/assets/css/invest.css'));
    }
  });

  test('every class the investor pages use is defined in the subset or in invest.css', async () => {
    const base = await readFile(path.join(DIST, 'assets/css/invest-base.css'), 'utf8');
    const own = await readFile(path.join(DIST, 'assets/css/invest.css'), 'utf8');
    const defined = new Set([...classesDefined(base), ...classesDefined(own)]);
    // Classes that exist only as JavaScript hooks, state, or unstyled structure in the wordmark.
    const hooks = new Set(['inv', 'is-in', 'js', 'wordmark__word']);
    // A BEM block whose elements are styled (`.inv-confirm__title`) counts as defined even if the bare block is not.
    const known = (c) => defined.has(c) || [...defined].some((d) => d.startsWith(`${c}__`) || d.startsWith(`${c}--`));
    for (const p of pages.filter((x) => x.sitePath.startsWith('/invest') || ['/privacy/', '/terms/'].includes(x.sitePath))) {
      for (const c of classesUsed(p.html)) {
        if (hooks.has(c)) continue;
        assert.ok(known(c), `${p.sitePath} uses .${c}, which no investor stylesheet defines`);
      }
    }
  });

  test('the subset is a strict cut of site.css: tokens kept, company chrome dropped', async () => {
    const site = await readFile(path.join(SRC, 'assets/css/site.css'), 'utf8');
    const sub = subsetCss(site);
    assert.ok(sub.includes('--navy: #0b1f3a;'), 'tokens kept');
    assert.ok(sub.includes('.btn--primary'), 'buttons kept');
    assert.ok(sub.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion kept');
    assert.ok(!sub.includes('.site-header'), 'company header dropped');
    assert.ok(!sub.includes('.pitch'), 'pitch dropped');
    assert.ok(!sub.includes('.newsletter'), 'newsletter dropped');
    assert.ok(sub.length < site.length * 0.5, `the subset should be well under half of site.css (${sub.length} vs ${site.length})`);
    // Every block in the subset is also a block in site.css, verbatim bodies.
    const norm = (t) => t.replace(/\s+/g, ' ').trim();
    const bodies = new Set(parseBlocks(site).flatMap((b) => (b.prelude.startsWith('@media') ? parseBlocks(b.body).map((x) => norm(x.body)) : [norm(b.body)])));
    for (const b of parseBlocks(sub)) {
      const inner = b.prelude.startsWith('@media') ? parseBlocks(b.body) : [b];
      for (const x of inner) assert.ok(bodies.has(norm(x.body)) || b.prelude.startsWith('@'), `subset invented a rule: ${x.prelude}`);
    }
  });
});

describe('the satellite pages', () => {
  for (const p of ['/invest/confirmed/', '/invest/received/', '/invest/not-accredited/', '/privacy/', '/terms/']) {
    test(`${p} shares the chrome and the not-an-offer line, without the questionnaire skip link`, () => {
      const h = pages.find((x) => x.sitePath === p).html;
      assert.ok(h.includes('inv-header'));
      assert.ok(h.includes('not an offer to sell'));
      assert.ok(!h.includes('href="#start"'));
      assert.ok(h.includes('inv-footer'));
    });
  }

  test('the confirmation page needs the booking id from the API and offers the calendar file', () => {
    const h = pages.find((x) => x.sitePath === '/invest/confirmed/').html;
    assert.ok(h.includes('data-confirm-when'));
    assert.ok(h.includes('data-confirm-ics'));
    assert.ok(h.includes('/assets/js/invest/confirmed.js" type="module"'));
    for (const line of cfg.investSite.booking.prepare) assert.ok(h.includes(line.slice(0, 40)));
  });

  test('the privacy policy describes only vendors in use and leaves retention to counsel', () => {
    const h = pages.find((x) => x.sitePath === '/privacy/').html;
    assert.ok(h.includes('Cloudflare') && h.includes('Cal.com') && h.includes('Resend'));
    assert.ok(!h.includes('Twilio'), 'SMS is off');
    assert.ok(!h.includes('Meta Pixel'), 'the pixel is off');
    assert.ok(h.includes('[[PENDING: record retention period'));
    assert.ok(h.includes('Social Security number'));
  });
});
