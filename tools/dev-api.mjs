#!/usr/bin/env node
/**
 * Local server for the investor page: dist/ plus the Pages Functions,
 * backed by a SQLite file through the D1 shim and the mock scheduler.
 *
 *   npm run dev:invest          build, then serve at http://localhost:8788
 *   PORT=9000 npm run dev:invest
 *   DB_FILE=:memory: …          throwaway database (the E2E suite does this)
 *
 * Applies the _headers file the way Cloudflare Pages would, so the CSP is
 * exercised locally. `wrangler pages dev` is the vendor's own equivalent;
 * this one needs nothing installed.
 */

import http from 'node:http';
import { gzipSync, brotliCompressSync, constants as zlib } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { D1Sqlite } from './d1-sqlite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT, 'dist');
const FUNCTIONS = path.join(ROOT, 'functions');
const PORT = Number(process.env.PORT || 8788);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ics': 'text/calendar; charset=utf-8',
};

/** The environment a Pages Function would see, from .dev.vars or defaults. */
export async function devEnv(overrides = {}, { readDevVars = true } = {}) {
  const vars = {};
  const devVars = path.join(ROOT, '.dev.vars');
  if (readDevVars && existsSync(devVars)) {
    for (const line of (await readFile(devVars, 'utf8')).split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) vars[m[1]] = m[2];
    }
  }
  const dbFile = process.env.DB_FILE || vars.DB_FILE || path.join(ROOT, '.data', 'invest.sqlite');
  if (dbFile !== ':memory:') {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(path.dirname(dbFile), { recursive: true });
  }
  const db = new D1Sqlite(dbFile).migrate();
  return {
    SCHEDULER: 'mock',
    TURNSTILE_MODE: 'mock',
    IP_SALT: 'dev-salt',
    CRON_SECRET: 'dev-cron',
    SITE_URL: `http://localhost:${PORT}`,
    DEBUG: 'true',
    ...vars,
    ...process.env.SCHEDULER ? { SCHEDULER: process.env.SCHEDULER } : {},
    ...overrides,
    DB: db,
  };
}

/** Route /api/* to a module in functions/, the way Pages does. */
export async function callFunction(request, env, pathname) {
  const rel = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const file = path.join(FUNCTIONS, `${rel}.js`);
  if (!existsSync(file)) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  const mod = await import(pathToFileURL(file).href);
  const handler = mod[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`] || mod.onRequest;
  if (!handler) return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  const tasks = [];
  const res = await handler({ request, env, params: {}, waitUntil: (p) => tasks.push(p), next: () => new Response('', { status: 404 }) });
  await Promise.allSettled(tasks);
  return res;
}

export async function createServer(env) {
  const { parseHeadersFile, headersFor } = await import(pathToFileURL(path.join(ROOT, 'src/invest/headers.mjs')).href);
  const headersText = existsSync(path.join(DIST, '_headers')) ? await readFile(path.join(DIST, '_headers'), 'utf8') : '';
  const parsed = parseHeadersFile(headersText);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    try {
      const extra = headersFor(url.pathname, parsed);
      if (url.pathname.startsWith('/api/')) {
        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readRaw(req);
        const request = new Request(url, { method: req.method, headers: req.headers, body });
        const out = await callFunction(request, env, url.pathname);
        const headers = Object.fromEntries(out.headers.entries());
        res.writeHead(out.status, { ...headers, ...extra });
        res.end(Buffer.from(await out.arrayBuffer()));
        return;
      }
      let file = path.join(DIST, decodeURIComponent(url.pathname));
      if (existsSync(file) && (await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404, { 'content-type': MIME['.html'], ...extra });
        res.end(existsSync(path.join(DIST, '404.html')) ? await readFile(path.join(DIST, '404.html')) : 'Not found');
        return;
      }
      // Compress text the way the edge will, so local performance numbers mean something.
      const body = await readFile(file);
      const type = MIME[path.extname(file)] || 'application/octet-stream';
      const encoded = compress(body, type, req.headers['accept-encoding'] || '');
      res.writeHead(200, { 'content-type': type, vary: 'accept-encoding', ...encoded.headers, ...extra });
      res.end(encoded.body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err.stack || err));
    }
  });
}

function compress(body, type, accept) {
  if (!/^(text\/|application\/(json|javascript|xml|manifest))/.test(type) || body.length < 512) return { body, headers: {} };
  if (/\bbr\b/.test(accept)) {
    return { body: brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } }), headers: { 'content-encoding': 'br' } };
  }
  if (/\bgzip\b/.test(accept)) return { body: gzipSync(body, { level: 6 }), headers: { 'content-encoding': 'gzip' } };
  return { body, headers: {} };
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(DIST)) {
    const { build } = await import(pathToFileURL(path.join(ROOT, 'build.mjs')).href);
    await build();
  }
  const env = await devEnv();
  const server = await createServer(env);
  server.listen(PORT, () => {
    console.log(`\n  Investor page at http://localhost:${PORT}/invest/  (API: mock scheduler, mock Turnstile, mail logged)\n`);
  });
}
