/**
 * Every page is well-formed, findable, and complete in its <head>.
 *
 * These are the checks that would otherwise be "someone should look at the
 * page source before we ship" — done once, for every page, every time.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { builtPages, unbalancedTags, headings, title, meta, jsonLdBlocks, links } from './helpers/dom.mjs';
import { site } from '../src/site.config.mjs';

const pages = await builtPages();

describe('document structure', () => {
  for (const page of pages) {
    describe(page.sitePath, () => {
      test('starts with a doctype and declares its language', () => {
        assert.match(page.html, /^<!doctype html>/i);
        assert.ok(page.html.includes(`<html lang="${site.lang}">`), 'missing lang attribute');
      });

      test('tags balance', () => {
        const problems = unbalancedTags(page.html);
        assert.deepEqual(problems, [], `unbalanced markup: ${problems.join('; ')}`);
      });

      test('has exactly one <h1>', () => {
        const h1s = headings(page.html).filter((h) => h.level === 1);
        assert.equal(h1s.length, 1, `expected 1 h1, found ${h1s.length}: ${h1s.map((h) => h.text).join(' | ')}`);
      });

      test('heading levels never skip a step', () => {
        const levels = headings(page.html).map((h) => h.level);
        let previous = levels[0];
        for (const level of levels.slice(1)) {
          assert.ok(
            level <= previous + 1,
            `heading jumped from h${previous} to h${level} on ${page.sitePath}`,
          );
          previous = level;
        }
      });

      test('has a title, a description, and a canonical URL', () => {
        const t = title(page.html);
        assert.ok(t && t.length > 8, 'missing or trivial <title>');
        assert.ok(t.length <= 70, `<title> is ${t.length} chars; keep it under 70 — "${t}"`);
        assert.ok(t.includes(site.namePlain), '<title> should carry the company name');

        const description = meta(page.html, 'description');
        assert.ok(description, 'missing meta description');
        assert.ok(
          description.length >= 50 && description.length <= 320,
          `meta description is ${description.length} chars`,
        );

        assert.ok(
          page.html.includes(`<link rel="canonical" href="${site.url}${page.sitePath}">`),
          'missing or wrong canonical URL',
        );
      });

      test('carries complete Open Graph and Twitter cards', () => {
        for (const key of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
          assert.ok(meta(page.html, key), `missing ${key}`);
        }
        assert.equal(meta(page.html, 'twitter:card'), 'summary_large_image');
        assert.ok(meta(page.html, 'og:image').startsWith('http'), 'og:image must be an absolute URL');
      });

      test('structured data parses and is typed', () => {
        const blocks = jsonLdBlocks(page.html);
        assert.ok(blocks.length >= 2, 'expected at least Organization and WebSite');
        for (const block of blocks) {
          const parsed = JSON.parse(block); // throws on malformed JSON-LD
          assert.ok(parsed['@type'], 'JSON-LD block without an @type');
          assert.equal(parsed['@context'], 'https://schema.org');
        }
      });

      test('has a skip link, a main landmark, and viewport meta', () => {
        assert.ok(page.html.includes('class="skip-link" href="#main"'), 'missing skip link');
        assert.ok(page.html.includes('id="main"'), 'missing #main target');
        assert.ok(page.html.includes('<main'), 'missing <main> landmark');
        assert.ok(meta(page.html, 'viewport'), 'missing viewport meta');
      });

      test('loads its stylesheets and scripts by absolute path', () => {
        assert.ok(page.html.includes('href="/assets/css/site.css"'), 'site.css not linked');
        assert.ok(page.html.includes('src="/assets/js/site.js" defer'), 'site.js not deferred');
        const localRefs = [...page.html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        for (const ref of localRefs) {
          assert.ok(ref.startsWith('/assets/'), `asset reference is not root-relative: ${ref}`);
        }
      });

      test('external links are safe', () => {
        const external = [...page.html.matchAll(/<a\b[^>]*href="https?:[^"]*"[^>]*>/g)].map((m) => m[0]);
        for (const tag of external) {
          if (!tag.includes('target="_blank"')) continue;
          assert.ok(tag.includes('rel="'), `target=_blank without rel: ${tag}`);
          assert.match(tag, /rel="[^"]*noopener/, `target=_blank without noopener: ${tag}`);
        }
      });

      test('mailto links carry a prefilled subject', () => {
        for (const href of links(page.html).filter((h) => h.startsWith('mailto:'))) {
          assert.ok(href.includes('?subject='), `mailto without a subject: ${href}`);
        }
      });
    });
  }
});

describe('the 404 page', () => {
  test('is excluded from indexing', () => {
    const notFound = pages.find((p) => p.sitePath === '/404.html');
    assert.ok(notFound, 'no 404 page built');
    assert.equal(meta(notFound.html, 'robots'), 'noindex, follow');
  });
});
