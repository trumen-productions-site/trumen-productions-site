/**
 * Accessibility checks that a static build can honestly make.
 *
 * These do not replace testing with a screen reader — nothing does. They catch
 * the regressions that creep in silently: an image without alt text, a control
 * that stops announcing itself, a colour token nudged past the contrast floor.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { builtPages, imgTags, contrast, cssVar, SRC } from './helpers/dom.mjs';

const pages = await builtPages();
const siteCss = await readFile(path.join(SRC, 'assets/css/site.css'), 'utf8');

describe('markup accessibility', () => {
  for (const page of pages) {
    describe(page.sitePath, () => {
      test('every image has alt text', () => {
        for (const tag of imgTags(page.html)) {
          assert.match(tag, /\balt="/, `<img> without alt: ${tag}`);
        }
      });

      test('every inline SVG is either labelled or hidden', () => {
        const svgs = [...page.html.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0]);
        for (const svg of svgs) {
          const labelled = /aria-label=|role="img"/.test(svg);
          const hidden = /aria-hidden="true"/.test(svg);
          assert.ok(labelled || hidden, `<svg> is neither labelled nor hidden: ${svg}`);
        }
      });

      test('every button has an accessible name', () => {
        const buttons = [...page.html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
        for (const [, attrs, inner] of buttons) {
          const hasLabel = /aria-label="[^"]+"/.test(attrs) || /aria-labelledby="/.test(attrs);
          const visibleText = inner.replace(/<[^>]+>/g, '').trim();
          assert.ok(hasLabel || visibleText.length > 0, `button with no accessible name: <button${attrs}>`);
        }
      });

      test('every form control has a label or an aria-label', () => {
        const controls = [...page.html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)];
        for (const [, tagName, attrs] of controls) {
          if (/type="hidden"/.test(attrs)) continue;
          const hasAria = /aria-label="[^"]+"|aria-labelledby="/.test(attrs);
          const id = attrs.match(/\bid="([^"]+)"/)?.[1];
          const hasFor = id ? new RegExp(`<label[^>]*for="${id}"`).test(page.html) : false;
          assert.ok(hasAria || hasFor, `<${tagName}> without a label: ${attrs.trim()}`);
        }
      });

      test('landmarks are present and singular', () => {
        assert.equal((page.html.match(/<main\b/g) || []).length, 1, 'expected exactly one <main>');
        assert.ok((page.html.match(/<footer\b/g) || []).length <= 1, 'more than one <footer>');
        const navs = [...page.html.matchAll(/<nav\b([^>]*)>/g)].map((m) => m[1]);
        for (const attrs of navs) {
          assert.match(attrs, /aria-label="/, `<nav> without an aria-label: ${attrs}`);
        }
      });

      test('no positive tabindex traps the reading order', () => {
        const values = [...page.html.matchAll(/tabindex="(-?\d+)"/g)].map((m) => Number(m[1]));
        for (const value of values) {
          assert.ok(value <= 0, `positive tabindex found: ${value}`);
        }
      });

      test('links have discernible text', () => {
        const anchors = [...page.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
        for (const [, attrs, inner] of anchors) {
          const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          const labelled = /aria-label="[^"]+"/.test(attrs);
          assert.ok(text.length > 0 || labelled, `link with no text: <a${attrs}>`);
        }
      });
    });
  }
});

/*
 * Contrast.
 *
 * The tokens are read out of the stylesheet rather than restated here, so a
 * change to the palette is what the test sees. WCAG AA wants 4.5:1 for body
 * text and 3:1 for large text and UI edges.
 */
describe('colour contrast (WCAG AA)', () => {
  const paper = cssVar(siteCss, 'paper');
  const ink = cssVar(siteCss, 'ink');
  const red = cssVar(siteCss, 'red');
  const red600 = cssVar(siteCss, 'red-600');
  const redDeep = cssVar(siteCss, 'red-deep');
  const muted = cssVar(siteCss, 'muted');
  const mutedStrong = cssVar(siteCss, 'muted-strong');
  const inkMuted = cssVar(siteCss, 'muted', '.on-ink');
  const inkAccent = cssVar(siteCss, 'accent', '.on-ink');

  const pairs = [
    ['body ink on paper', ink, paper, 4.5],
    ['muted text on paper', muted, paper, 4.5],
    ['strong muted text on paper', mutedStrong, paper, 4.5],
    ['accent-ink links on paper', redDeep, paper, 4.5],
    // Small white type never sits on the full-strength brand red — that is
    // what --red-600 is for. The full red only ever carries display type.
    ['white button labels on --red-600', '#ffffff', red600, 4.5],
    ['white display type on the red field', '#ffffff', red, 3],
    ['tinted white secondary type on the red field', '#ffe9e4', red, 3],
    ['paper on ink (dark sections)', paper, ink, 4.5],
    ['muted on ink', inkMuted, ink, 4.5],
    ['accent on ink (large text and rules)', inkAccent, ink, 3],
  ];

  for (const [label, fg, bg, floor] of pairs) {
    test(`${label} meets ${floor}:1`, () => {
      assert.ok(fg && bg, `token missing for "${label}" (fg=${fg}, bg=${bg})`);
      const ratio = contrast(fg, bg);
      assert.ok(
        ratio >= floor,
        `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, below the ${floor}:1 floor`,
      );
    });
  }
});

describe('motion', () => {
  test('the stylesheet honours prefers-reduced-motion', () => {
    assert.ok(siteCss.includes('@media (prefers-reduced-motion: reduce)'), 'no reduced-motion block');
    const block = siteCss.split('@media (prefers-reduced-motion: reduce)')[1];
    assert.ok(block.includes('animation-duration: 0.001ms'), 'reduced motion does not neutralise animations');
    assert.ok(block.includes('scroll-behavior: auto'), 'reduced motion does not disable smooth scrolling');
  });

  test('reveal animations only arm themselves when JavaScript is running', () => {
    assert.ok(
      siteCss.includes('.js [data-reveal]'),
      'reveal styles must be scoped to .js so content is visible without scripting',
    );
    assert.ok(
      !/^\s*\[data-reveal\]\s*\{[^}]*opacity:\s*0/m.test(siteCss),
      'an unscoped [data-reveal] rule would hide content when scripting is off',
    );
  });

  test('the pitch player pauses itself when scrolled out of view', async () => {
    const js = await readFile(path.join(SRC, 'assets/js/pitch.js'), 'utf8');
    assert.ok(js.includes('IntersectionObserver'), 'no viewport observation');
    assert.ok(js.includes('prefers-reduced-motion'), 'the player ignores reduced-motion preferences');
  });
});
