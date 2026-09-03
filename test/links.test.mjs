/**
 * Every internal link goes somewhere.
 *
 * A broken link on a five-page brochure site is the kind of thing nobody
 * notices until a financier clicks it. This resolves every href — page paths,
 * fragment targets on other pages, and asset URLs — against what the build
 * actually wrote to disk.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { builtPages, links, ids, DIST } from './helpers/dom.mjs';
import { site } from '../src/site.config.mjs';

const pages = await builtPages();
const byPath = new Map(pages.map((p) => [p.sitePath, p]));
const idsByPath = new Map(pages.map((p) => [p.sitePath, new Set(ids(p.html))]));

/** Resolve an asset URL to a file on disk. */
function assetExists(href) {
  return existsSync(path.join(DIST, href.replace(/^\//, '').split('?')[0]));
}

describe('internal links', () => {
  for (const page of pages) {
    const hrefs = [...new Set(links(page.html))];

    for (const href of hrefs) {
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) continue;

      test(`${page.sitePath} → ${href}`, () => {
        const [rawTarget, fragment] = href.split('#');
        const target = rawTarget === '' ? page.sitePath : rawTarget;

        if (target.startsWith('/assets/')) {
          assert.ok(assetExists(target), `asset does not exist: ${target}`);
          return;
        }

        assert.ok(target.startsWith('/'), `link is not root-relative: ${href}`);

        const targetPage = byPath.get(target);
        assert.ok(targetPage, `no page at ${target}`);

        if (fragment) {
          assert.ok(
            idsByPath.get(target).has(fragment),
            `no element with id="${fragment}" on ${target}`,
          );
        }
      });
    }
  }
});

describe('navigation', () => {
  test('every primary nav destination exists', () => {
    for (const item of site.nav) {
      assert.ok(byPath.has(item.href), `nav points at a missing page: ${item.href}`);
    }
  });

  test('every footer destination exists, fragments included', () => {
    for (const column of site.footerNav) {
      for (const link of column.links) {
        const [target, fragment] = link.href.split('#');
        assert.ok(byPath.has(target), `footer points at a missing page: ${link.href}`);
        if (fragment) {
          assert.ok(idsByPath.get(target).has(fragment), `footer fragment missing: ${link.href}`);
        }
      }
    }
  });

  test('each page marks its own nav item as current', () => {
    for (const item of site.nav) {
      const page = byPath.get(item.href);
      assert.ok(
        page.html.includes(`href="${item.href}" aria-current="page"`),
        `${item.href} does not mark itself current in the nav`,
      );
    }
  });

  test('every page is reachable from the home page in one or two hops', () => {
    const home = byPath.get('/');
    const first = new Set(links(home.html).map((h) => h.split('#')[0]).filter((h) => byPath.has(h)));
    const reachable = new Set(first);
    for (const hop of first) {
      for (const href of links(byPath.get(hop).html)) {
        const target = href.split('#')[0];
        if (byPath.has(target)) reachable.add(target);
      }
    }
    for (const page of pages) {
      if (page.sitePath === '/' || page.sitePath === '/404.html') continue;
      assert.ok(reachable.has(page.sitePath), `${page.sitePath} is more than two clicks from home`);
    }
  });

  test('no page links to itself in the body copy', () => {
    for (const page of pages) {
      const bodyOnly = page.html.split('<main')[1]?.split('</main>')[0] ?? '';
      const selfLinks = [...bodyOnly.matchAll(/<a\b[^>]*href="([^"#]*)"/g)]
        .map((m) => m[1])
        .filter((h) => h === page.sitePath);
      assert.equal(selfLinks.length, 0, `${page.sitePath} links to itself in the main content`);
    }
  });

  test('ids are unique within each page', () => {
    for (const page of pages) {
      const all = ids(page.html);
      const duplicates = all.filter((id, i) => all.indexOf(id) !== i);
      assert.deepEqual([...new Set(duplicates)], [], `${page.sitePath} has duplicate ids`);
    }
  });
});
