/**
 * The build produces what it says it produces.
 * Run `npm test`, which builds first, then runs this.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { DIST, builtPages } from './helpers/dom.mjs';
import { site } from '../src/site.config.mjs';
import { loadPages } from '../build.mjs';

const EXPECTED = [
  '/',
  '/clearly-established/',
  '/clearly-established/pitch/',
  '/our-story/',
  '/projects/',
  '/values/',
  '/faq/',
  '/contact/',
  '/404.html',
];

describe('build output', () => {
  test('every expected page is written', async () => {
    const built = (await builtPages()).map((p) => p.sitePath);
    for (const expected of EXPECTED) {
      assert.ok(built.includes(expected), `missing built page: ${expected}`);
    }
  });

  test('no page is written that no module declares', async () => {
    const declared = new Set((await loadPages()).map((p) => p.path));
    for (const page of await builtPages()) {
      assert.ok(declared.has(page.sitePath), `orphan output: ${page.file}`);
    }
  });

  test('clean URLs are directories with an index.html', async () => {
    for (const page of await builtPages()) {
      if (page.sitePath === '/404.html') continue;
      assert.ok(page.file.endsWith('index.html'), `${page.sitePath} should be a clean URL, got ${page.file}`);
    }
  });

  test('assets are copied', async () => {
    for (const asset of [
      'assets/css/site.css',
      'assets/css/pitch.css',
      'assets/js/site.js',
      'assets/js/pitch.js',
      'assets/img/favicon.svg',
      'assets/img/og-default.png',
      'assets/img/apple-touch-icon.png',
    ]) {
      const s = await stat(path.join(DIST, asset));
      assert.ok(s.size > 0, `${asset} is empty`);
    }
  });

  test('sitemap lists every indexable page and nothing else', async () => {
    const xml = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const base = site.url.replace(/\/$/, '');

    for (const p of EXPECTED.filter((x) => x !== '/404.html')) {
      assert.ok(locs.includes(base + p), `sitemap missing ${p}`);
    }
    assert.ok(!locs.some((l) => l.includes('404')), 'sitemap must not list the 404 page');
    assert.equal(new Set(locs).size, locs.length, 'sitemap has duplicate URLs');
  });

  test('robots.txt points at the sitemap', async () => {
    const txt = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
    assert.match(txt, /User-agent: \*/);
    assert.ok(txt.includes(`${site.url.replace(/\/$/, '')}/sitemap.xml`));
  });

  test('web manifest is valid JSON with icons that exist', async () => {
    const raw = await readFile(path.join(DIST, 'site.webmanifest'), 'utf8');
    const manifest = JSON.parse(raw);
    assert.equal(manifest.start_url, '/');
    assert.ok(manifest.icons.length >= 2);
    for (const icon of manifest.icons) {
      const s = await stat(path.join(DIST, icon.src.replace(/^\//, '')));
      assert.ok(s.size > 0, `manifest icon missing: ${icon.src}`);
    }
  });

  test('no page contains an unreplaced template placeholder', async () => {
    for (const page of await builtPages()) {
      // JSON-LD legitimately ends nested objects with }}, so markup is checked
      // with the script blocks removed.
      const markup = page.html.replace(/<script[\s\S]*?<\/script>/g, '');
      assert.doesNotMatch(markup, /\{\{|\}\}/, `${page.sitePath} contains {{ }} placeholders`);
      assert.doesNotMatch(page.html, /\[object Object\]/, `${page.sitePath} stringified an object`);
      assert.doesNotMatch(markup, /\bundefined\b(?![-\w])/, `${page.sitePath} rendered "undefined"`);
      assert.ok(!markup.includes('NaN'), `${page.sitePath} rendered "NaN"`);
    }
  });
});
