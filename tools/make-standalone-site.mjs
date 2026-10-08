#!/usr/bin/env node
/**
 * Build the WHOLE SITE as one self-contained HTML file.
 *
 *   node tools/make-standalone-site.mjs [outfile]
 *
 * Every page, the shared header and footer, both stylesheets and both scripts,
 * inlined into a single document. Internal links become in-page navigation, so
 * the file browses like the real site with no server and no internet beyond the
 * webfonts.
 *
 * This is the review copy: the version to open on a laptop, email to someone
 * for sign-off, or take into a meeting with no wifi. `npm run build` remains
 * the thing you deploy — this is the thing you hand over.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { render } from '../src/lib/layout.mjs';
import { site } from '../src/site.config.mjs';
import { esc, each } from '../src/lib/html.mjs';
import { loadPages } from '../build.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = process.argv[2] || path.join(ROOT, 'viri-veri-site-preview.html');

/* ── Slice the rendered pages apart ───────────────────────────────────── */

function between(html, startMarker, endMarker, { includeEnd = true } = {}) {
  const start = html.indexOf(startMarker);
  if (start === -1) throw new Error(`marker not found: ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  if (end === -1) throw new Error(`end marker not found: ${endMarker}`);
  return html.slice(start, includeEnd ? end + endMarker.length : end);
}

/** The contents of <main>, without the wrapper. */
function mainOf(html) {
  const open = html.indexOf('<main id="main" class="site-main">');
  const close = html.lastIndexOf('</main>');
  if (open === -1 || close === -1) throw new Error('could not find <main> in a rendered page');
  return html.slice(open + '<main id="main" class="site-main">'.length, close);
}

/**
 * Rewrite internal links into router links.
 *   /faq/                 → #/faq/
 *   /our-story/#the-spine → #/our-story/~the-spine
 * mailto:, tel:, http(s):, and same-page #anchors are left alone.
 */
function rewriteLinks(html) {
  return html.replace(/href="(\/[^"]*)"/g, (whole, href) => {
    if (href.startsWith('/assets/')) return whole; // no assets in a single file
    const [pagePath, fragment] = href.split('#');
    const target = pagePath === '' ? '/' : pagePath;
    return `href="#${target}${fragment ? `~${fragment}` : ''}" data-route="${target}"`;
  });
}

/**
 * Inline every `<img src="/assets/img/*.svg">` as a data: URI so the brand
 * lockup travels inside the one file. Other image formats are left as they are
 * (none are referenced by the pages' chrome today; the build will say so).
 */
const inlined = new Map();
async function inlineImages(html) {
  const refs = [...html.matchAll(/src="(\/assets\/img\/[^"]+\.svg)"/g)].map((m) => m[1]);
  for (const ref of new Set(refs)) {
    if (inlined.has(ref)) continue;
    const file = path.join(ROOT, 'src', ref);
    if (!existsSync(file)) throw new Error(`image referenced by a page is missing: ${ref}`);
    const svg = await readFile(file, 'utf8');
    inlined.set(ref, `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`);
  }
  return html.replace(/src="(\/assets\/img\/[^"]+\.svg)"/g, (whole, ref) => `src="${inlined.get(ref)}"`);
}

/* ── Assemble ─────────────────────────────────────────────────────────── */

const pages = await loadPages();
const rendered = [];
for (const page of pages) {
  const html = render({ ...page, body: typeof page.body === 'function' ? page.body() : page.body });
  rendered.push({ page, html: await inlineImages(html) });
}

const home = rendered.find((r) => r.page.path === '/');
if (!home) throw new Error('no home page to take the chrome from');

const header = await inlineImages(between(home.html, '<a class="skip-link"', '</header>'));
const chrome = await inlineImages(between(home.html, '<section class="newsletter"', '</footer>'));

const [siteCss, pitchCss, siteJs, pitchJs] = await Promise.all([
  readFile(path.join(ROOT, 'src/assets/css/site.css'), 'utf8'),
  readFile(path.join(ROOT, 'src/assets/css/pitch.css'), 'utf8'),
  readFile(path.join(ROOT, 'src/assets/js/site.js'), 'utf8'),
  readFile(path.join(ROOT, 'src/assets/js/pitch.js'), 'utf8'),
]);

for (const [name, text, needle] of [
  ['site.css', siteCss, '</style'],
  ['pitch.css', pitchCss, '</style'],
  ['site.js', siteJs, '</script'],
  ['pitch.js', pitchJs, '</script'],
]) {
  if (text.includes(needle)) throw new Error(`${name} contains "${needle}" and cannot be inlined verbatim`);
}

// Order the pages the way the navigation does, so tabbing through the document
// matches the order a reader would expect.
const order = ['/', ...site.nav.map((n) => n.href), '/clearly-established/pitch/', '/404.html'];
const sorted = rendered
  .slice()
  .sort((a, b) => {
    const ai = order.indexOf(a.page.path);
    const bi = order.indexOf(b.page.path);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

const routes = sorted.map((r) => ({
  path: r.page.path,
  title: r.page.path === '/' ? `${site.namePlain} — ${site.motto}` : `${r.page.title} · ${site.namePlain}`,
}));

const html = `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.namePlain)} — ${esc(site.motto)}</title>
<meta name="description" content="${esc(site.description)}">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,700&family=Archivo:wght@400;600;700;800&display=swap">
<style>
${siteCss}
${pitchCss}

/* Preview-only chrome. */
.preview-bar {
  background: var(--red-deep);
  color: #fff;
  font-family: var(--font-sign);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.55rem 0;
}
.preview-bar__inner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-5);
  align-items: baseline;
  justify-content: space-between;
}
.preview-bar span { font-weight: 400; letter-spacing: 0.06em; text-transform: none; opacity: 0.85; }
[data-page][hidden] { display: none !important; }
</style>
</head>
<body>

<div class="preview-bar">
  <div class="container container--wide preview-bar__inner">
    <strong>Offline preview · ${routes.length} pages</strong>
    <span>One self-contained file. Every link works; nothing is fetched from a server.</span>
  </div>
</div>

${rewriteLinks(header)}

<main id="main" class="site-main">
${each(
  sorted,
  (r, i) => `
<div data-page="${esc(r.page.path)}"${i === 0 ? '' : ' hidden'}>
${rewriteLinks(mainOf(r.html))}
</div>`,
)}
</main>

${rewriteLinks(chrome)}

<script>
document.documentElement.classList.add('js');
${siteJs}
${pitchJs}
</script>
<script>
/*
 * The preview router.
 *
 * Every page is already in the document; navigating swaps which one is
 * visible. Three things need doing by hand that a real page load would give
 * us for free: the reveal animations have to be released on the page that
 * just appeared, the pitch stage has to be re-measured now that it has a
 * width, and the header has to mark the right nav item as current.
 */
(function () {
  'use strict';

  var ROUTES = ${JSON.stringify(Object.fromEntries(routes.map((r) => [r.path, r.title])))};
  var pages = document.querySelectorAll('[data-page]');

  function show(routePath, fragment, push) {
    var target = ROUTES[routePath] ? routePath : '/404.html';

    for (var i = 0; i < pages.length; i++) {
      var isTarget = pages[i].getAttribute('data-page') === target;
      pages[i].hidden = !isTarget;
    }

    document.title = ROUTES[target] || document.title;

    // Mark the current nav item, as the server-rendered pages do.
    var navLinks = document.querySelectorAll('.site-nav a[data-route], .site-header__brand[data-route]');
    for (var n = 0; n < navLinks.length; n++) {
      var route = navLinks[n].getAttribute('data-route');
      var current = route === target || (route !== '/' && target.indexOf(route) === 0);
      if (current) navLinks[n].setAttribute('aria-current', 'page');
      else navLinks[n].removeAttribute('aria-current');
    }

    // Release the reveal animations on the page that just appeared: their
    // observer fired while the page was display:none and will not fire again.
    var shown = document.querySelector('[data-page="' + target + '"]');
    if (shown) {
      var reveals = shown.querySelectorAll('[data-reveal]');
      for (var r = 0; r < reveals.length; r++) reveals[r].classList.add('is-in');
    }

    // The pitch stage measured itself at zero width while hidden.
    window.dispatchEvent(new Event('resize'));

    if (push) {
      var hash = '#' + target + (fragment ? '~' + fragment : '');
      if (location.hash !== hash) history.pushState(null, '', hash);
    }

    if (fragment) {
      var el = document.getElementById(fragment);
      if (el) {
        var d = el.closest && el.closest('details');
        if (d) d.open = true;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  function parse(hash) {
    if (!hash || hash.charAt(1) !== '/') return null;
    var raw = hash.slice(1).split('~');
    return { path: raw[0], fragment: raw[1] || null };
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-route]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    var parsed = parse(link.getAttribute('href'));
    if (parsed) show(parsed.path, parsed.fragment, true);
  });

  window.addEventListener('popstate', function () {
    var parsed = parse(location.hash);
    show(parsed ? parsed.path : '/', parsed ? parsed.fragment : null, false);
  });

  var initial = parse(location.hash);
  show(initial ? initial.path : '/', initial ? initial.fragment : null, false);

  /*
   * Re-apply a deep link's scroll once the document has finished loading.
   * The first attempt runs during parse, and the browser's own scroll
   * restoration then returns the window to the top — so on a link like
   * #/our-story/~prevarication the reader would land on the right page but at
   * the wrong end of it.
   */
  if (initial && initial.fragment) {
    window.addEventListener('load', function () {
      var el = document.getElementById(initial.fragment);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
})();
</script>
</body>
</html>
`;

await writeFile(OUT, html, 'utf8');
console.log(
  `  wrote ${path.relative(ROOT, OUT)}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} kB, ${routes.length} pages, self-contained)`,
);
