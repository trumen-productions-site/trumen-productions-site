/**
 * Unit tests for the template helpers. Small surface, load-bearing behaviour:
 * escaping is what stands between a stray angle bracket and a broken page.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { esc, urlq, join, each, when, cls, attrs, mailto, slug, oneLine, clip } from '../src/lib/html.mjs';
import { wordmark, star, btn, sectionHead, statBand } from '../src/lib/components.mjs';
import { absolute } from '../src/lib/layout.mjs';
import { site } from '../src/site.config.mjs';

describe('esc', () => {
  test('escapes the five characters that matter', () => {
    assert.equal(esc(`<a href="x" class='y'>&</a>`), '&lt;a href=&quot;x&quot; class=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  test('renders nothing for null, undefined and false', () => {
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(false), '');
  });

  test('keeps zero, which is a real value', () => {
    assert.equal(esc(0), '0');
  });

  test('leaves ordinary prose, including typographic punctuation, alone', () => {
    const prose = 'Three years, eleven months — “impossible” to convict.';
    assert.equal(esc(prose), prose);
  });
});

describe('list helpers', () => {
  test('join drops empties but keeps zero', () => {
    assert.equal(join(['a', null, '', false, undefined, 'b'], '|'), 'a|b');
  });

  test('each maps then joins', () => {
    assert.equal(each([1, 2, 3], (n) => `<li>${n}</li>`, ''), '<li>1</li><li>2</li><li>3</li>');
  });

  test('each tolerates a missing list', () => {
    assert.equal(each(undefined, (x) => x), '');
  });

  test('when gates on truthiness and accepts a thunk', () => {
    assert.equal(when(true, 'yes'), 'yes');
    assert.equal(when(false, 'yes'), '');
    assert.equal(when(1, () => 'lazy'), 'lazy');
    assert.equal(when(0, () => 'never'), '');
  });
});

describe('attribute helpers', () => {
  test('cls drops falsy names and emits nothing when empty', () => {
    assert.equal(cls('a', null, 'b'), ' class="a b"');
    assert.equal(cls(null, false), '');
  });

  test('attrs renders booleans bare and skips absent values', () => {
    assert.equal(attrs({ id: 'x', hidden: true, absent: null, off: false }), ' id="x" hidden');
  });

  test('attrs escapes its values', () => {
    assert.equal(attrs({ title: 'a "b"' }), ' title="a &quot;b&quot;"');
  });
});

describe('mailto', () => {
  test('encodes the subject', () => {
    const href = mailto('a@b.com', 'Rights & representation');
    assert.equal(href, 'mailto:a@b.com?subject=Rights%20%26%20representation');
  });

  test('adds a body when given one', () => {
    assert.match(mailto('a@b.com', 'S', 'line one\nline two'), /&body=line%20one%0Aline%20two/);
  });

  test('omits the query entirely with no subject', () => {
    assert.equal(mailto('a@b.com'), 'mailto:a@b.com');
  });
});

describe('text helpers', () => {
  test('slug is URL-safe and stable', () => {
    assert.equal(slug('What does “clearly established” mean?'), 'what-does-clearly-established-mean');
    assert.equal(slug('  Provocation · Prevarication  '), 'provocation-prevarication');
  });

  test('oneLine strips tags and collapses whitespace', () => {
    assert.equal(oneLine('<p>a\n  b</p>  <em>c</em>'), 'a b c');
  });

  test('clip truncates on a word boundary', () => {
    const long = 'one two three four five six seven eight nine ten';
    const out = clip(long, 20);
    assert.ok(out.length <= 21, out);
    assert.ok(out.endsWith('…'));
    assert.ok(!out.includes('  '));
  });

  test('clip leaves short text untouched', () => {
    assert.equal(clip('short', 40), 'short');
  });

  test('urlq encodes reserved characters', () => {
    assert.equal(urlq('a b&c'), 'a%20b%26c');
  });
});

describe('components', () => {
  test('the star is the faceted mark traced from the lockup, drawn as SVG, not a glyph', () => {
    const svg = star();
    assert.match(svg, /<svg[^>]*viewBox="0 0 24 24"/);
    assert.equal((svg.match(/<polygon /g) || []).length, 10, 'ten facets');
    for (const gold of ['#E9C24A', '#C9A03A', '#8A6A22']) assert.ok(svg.includes(gold), `facet gold ${gold}`);
    assert.match(svg, /aria-hidden="true"/);
    assert.ok(!svg.includes('★'));
    assert.match(star({ fill: 'currentColor' }), /<polygon points="[^"]+" fill="currentColor"\/>/, 'a flat fill draws the outline only');
    assert.ok(!star({ fill: 'currentColor' }).includes('#E9C24A'));
  });

  test('the wordmark is the supplied lockup as an image, never typeset', () => {
    const html = wordmark();
    assert.match(html, /<img class="wordmark__lockup" src="\/assets\/img\/viri-veri-lockup-(navy|transparent)\.svg" alt=""/);
    assert.match(html, /width="2046" height="779"/, 'intrinsic size so the layout does not shift');
    assert.ok(!html.includes('>VIRI<') && !html.includes('>VERI<'), 'the letterforms are the mark, not text');
    assert.ok(html.includes('viri-veri-lockup-transparent.svg'), 'light tone takes navy letterforms');
    assert.ok(wordmark({ tone: 'dark' }).includes('viri-veri-lockup-navy.svg'), 'dark tone takes cream letterforms');
  });

  test('the wordmark sizes by class and can show or hide the motto', () => {
    assert.ok(wordmark({ size: 'lg' }).includes('wordmark--lg'));
    assert.ok(wordmark({ motto: true }).includes('Men of truth'));
    assert.ok(!wordmark({ motto: false }).includes('wordmark__motto'));
  });

  test('buttons render an accessible arrow only on filled variants', () => {
    assert.match(btn({ href: '/x', label: 'Go' }), /<span class="btn__arrow" aria-hidden="true">/);
    assert.ok(!btn({ href: '/x', label: 'Go', variant: 'ghost' }).includes('btn__arrow'));
  });

  test('external buttons get rel="noopener noreferrer"', () => {
    const html = btn({ href: 'https://example.com', label: 'Out', external: true });
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /target="_blank"/);
  });

  test('sectionHead renders the requested heading level', () => {
    assert.match(sectionHead({ title: 'X', level: 3 }), /<h3 class="section-head__title">X<\/h3>/);
  });

  test('statBand puts the label before the value in the DOM, for screen readers', () => {
    const html = statBand([{ value: '860', label: 'Acres' }]);
    assert.ok(html.indexOf('<dt') < html.indexOf('<dd'), 'a <dl> must read label then value');
    assert.match(html, /<dt class="stat__label">Acres<\/dt>/);
  });
});

describe('absolute()', () => {
  test('joins the configured origin without doubling the slash', () => {
    assert.equal(absolute('/faq/'), `${site.url}/faq/`);
    assert.ok(!absolute('/faq/').includes('//faq'));
  });
});
