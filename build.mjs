#!/usr/bin/env node
/**
 * The build.
 *
 * Reads every module in src/pages, renders it through the shared layout, and
 * writes clean-URL static files into dist/ along with the assets, a sitemap, a
 * robots.txt and a web manifest.
 *
 * Zero dependencies by design: `node build.mjs` is the whole toolchain. There
 * is nothing to `npm install`, nothing to keep up to date, and nothing that
 * can rot between now and the next time somebody needs to change a sentence.
 *
 *   node build.mjs            build into dist/
 *   node build.mjs --serve    build, then serve dist/ on http://localhost:8080
 *   node build.mjs --watch    rebuild whenever a source file changes
 *   node build.mjs --quiet    only report errors
 *   node build.mjs --prod     a production build of the investor pages: the
 *                             launch gates, pending tokens and forbidden
 *                             strings are checked and any failure aborts
 *   node build.mjs --site-only  the company site alone — no investor pages.
 *                             What Netlify and GitHub Pages publish, so the
 *                             investor page only ever leaves the repository
 *                             through its own gated deployment.
 */

import { readdir, mkdir, writeFile, rm, cp, stat, readFile } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const PAGES = path.join(SRC, 'pages');
const ASSETS = path.join(SRC, 'assets');
// DIST_DIR lets a test build into a scratch directory without touching dist/.
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT, 'dist');

const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');
const PROD = args.has('--prod') || process.env.INVEST_ENV === 'production';
if (PROD) process.env.INVEST_ENV = 'production';
const SITE_ONLY = args.has('--site-only') || process.env.SITE_ONLY === '1';

const log = (...m) => {
  if (!QUIET) console.log(...m);
};

/* ── Page discovery ───────────────────────────────────────────────────── */

/**
 * Load every page module. A cache-busting query keeps --watch honest: without
 * it Node would hand back the module it already imported and the rebuild would
 * silently emit stale HTML.
 */
export async function loadPages(bust = '') {
  const files = (await readdir(PAGES)).filter((f) => f.endsWith('.mjs')).sort();
  const pages = [];
  for (const file of files) {
    const url = pathToFileURL(path.join(PAGES, file)).href + bust;
    const mod = await import(url);
    const page = mod.default;
    if (!page || !page.path) throw new Error(`src/pages/${file} does not export a default page with a \`path\``);
    pages.push({ ...page, source: `src/pages/${file}` });
  }
  return pages;
}

/** '/'          → dist/index.html
 *  '/faq/'      → dist/faq/index.html
 *  '/404.html'  → dist/404.html                                            */
function outputPath(sitePath) {
  if (sitePath.endsWith('.html')) return path.join(DIST, sitePath.replace(/^\//, ''));
  const clean = sitePath.replace(/^\/|\/$/g, '');
  return path.join(DIST, clean, 'index.html');
}

/* ── Generated files ──────────────────────────────────────────────────── */

function sitemap(pages, siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .filter((p) => p.sitemap !== false && !p.noindex)
    .map(
      (p) => `  <url>
    <loc>${base}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function robots(siteUrl) {
  return `# VIRI VERI Productions
User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/$/, '')}/sitemap.xml
`;
}

function manifest(site) {
  return JSON.stringify(
    {
      name: site.namePlain,
      short_name: 'VIRI VERI',
      description: site.tagline,
      start_url: '/',
      display: 'standalone',
      background_color: '#f6f4f2',
      theme_color: '#201e1d',
      icons: [
        { src: '/assets/img/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    null,
    2,
  );
}

/* ── Build ────────────────────────────────────────────────────────────── */

export async function build({ bust = '' } = {}) {
  const started = Date.now();
  const { render } = await import(pathToFileURL(path.join(SRC, 'lib/layout.mjs')).href + bust);
  const { site } = await import(pathToFileURL(path.join(SRC, 'site.config.mjs')).href + bust);

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const all = await loadPages(bust);
  // Pages flagged `invest: true` ship dark: a --site-only build leaves them out.
  const pages = SITE_ONLY ? all.filter((p) => !p.invest) : all;
  const written = [];

  for (const page of pages) {
    const html = render({ ...page, body: typeof page.body === 'function' ? page.body() : page.body });
    const out = outputPath(page.path);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html, 'utf8');
    written.push({ page, out, bytes: Buffer.byteLength(html) });
  }

  await cp(ASSETS, path.join(DIST, 'assets'), { recursive: true });

  // The investor pages' share of site.css, cut at build time (src/invest/lib/css-subset.mjs).
  const { subsetCss } = await import(pathToFileURL(path.join(SRC, 'invest/lib/css-subset.mjs')).href + bust);
  await writeFile(path.join(DIST, 'assets/css/invest-base.css'), subsetCss(await readFile(path.join(ASSETS, 'css/site.css'), 'utf8')), 'utf8');
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(pages, site.url), 'utf8');
  await writeFile(path.join(DIST, 'robots.txt'), robots(site.url), 'utf8');
  await writeFile(path.join(DIST, 'site.webmanifest'), manifest(site), 'utf8');

  // Netlify/Vercel-style redirect for hosts that read it; harmless elsewhere.
  await writeFile(path.join(DIST, '_redirects'), '/*  /404.html  404\n', 'utf8');

  // Security headers for the hosts that read a _headers file (Cloudflare
  // Pages, Netlify). The investor pages' CSP is in src/invest/headers.mjs.
  const { headersFile } = await import(pathToFileURL(path.join(SRC, 'invest/headers.mjs')).href + bust);
  await writeFile(path.join(DIST, '_headers'), headersFile(), 'utf8');

  // The investor pages ship dark. A production build must clear every gate.
  if (PROD) {
    const { productionChecks } = await import(pathToFileURL(path.join(SRC, 'invest/lib/checks.mjs')).href + bust);
    const failures = await productionChecks({ dist: DIST });
    if (failures.length) {
      await rm(DIST, { recursive: true, force: true });
      throw new Error(`Production build refused:\n  - ${failures.join('\n  - ')}`);
    }
  }

  const ms = Date.now() - started;
  if (!QUIET) {
    for (const w of written) {
      log(`  ${w.page.path.padEnd(34)} ${(w.bytes / 1024).toFixed(1).padStart(6)} kB  ${path.relative(ROOT, w.out)}`);
    }
    log(`\n  ${written.length} pages · assets copied · sitemap, robots, manifest, headers written · ${SITE_ONLY ? 'company site only' : PROD ? 'PRODUCTION' : 'staging'} · ${ms} ms\n`);
  }
  return { pages, written, ms };
}

/* ── Dev server ───────────────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(port = 8080) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file = path.join(DIST, decodeURIComponent(url.pathname));
      if (existsSync(file) && (await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      if (!existsSync(file)) {
        const notFound = path.join(DIST, '404.html');
        res.writeHead(404, { 'content-type': MIME['.html'] });
        res.end(existsSync(notFound) ? await readFile(notFound) : 'Not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  server.listen(port, () => log(`\n  Serving dist/ at http://localhost:${port}\n`));
  return server;
}

/* ── Entry ────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await build();
  } catch (err) {
    console.error(`\n  ${err.message}\n`);
    process.exit(1);
  }

  if (args.has('--serve') || args.has('--watch')) {
    if (args.has('--serve')) serve(Number(process.env.PORT) || 8080);

    if (args.has('--watch')) {
      let timer = null;
      const rebuild = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            await build({ bust: `?t=${Date.now()}` });
          } catch (err) {
            console.error('\n  Build failed:', err.message, '\n');
          }
        }, 60);
      };
      watch(SRC, { recursive: true }, rebuild);
      log('  Watching src/ for changes…\n');
    }
  }
}
