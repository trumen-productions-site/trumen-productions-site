#!/usr/bin/env node
/**
 * The investor page as a self-contained demo folder.
 *
 *   npm run demo        → invest-demo/   (gitignored; regenerate, don't commit)
 *
 * Builds the site, then copies the investor pages and the assets they use
 * into one folder with relative paths, and adds a small shim that answers
 * `/api/*` in the page itself — the same weekday-afternoon mock calendar the
 * API tests use, a fake lead id, a fake booking — so the whole six-step flow
 * can be walked on any static host or straight from disk, with nothing
 * saved anywhere and no account involved. Turnstile is turned off in the
 * demo; the ribbon says what it is.
 *
 * It is a presentation tool. It is not the staging deployment (RUNBOOK § 3).
 */

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'invest-demo');

const PAGES = {
  'invest/index.html': 'index.html',
  'invest/confirmed/index.html': 'confirmed.html',
  'invest/received/index.html': 'received.html',
  'invest/not-accredited/index.html': 'not-accredited.html',
  'privacy/index.html': 'privacy.html',
  'terms/index.html': 'terms.html',
};

const ASSETS = [
  'assets/css/invest-base.css',
  'assets/css/invest.css',
  'assets/js/site.js',
  'assets/js/invest/flow.js',
  'assets/js/invest/machine.js',
  'assets/js/invest/validators.js',
  'assets/js/invest/utm.js',
  'assets/js/invest/confirmed.js',
  'assets/img/favicon.svg',
  'assets/img/invest-keyart.png',
];

/** Answers /api/* inside the page. Mirrors functions/api/_lib/scheduler.js MockAdapter. */
const SHIM = `
(() => {
  const realFetch = window.fetch.bind(window);
  const leads = new Map();
  const bookings = new Map();
  const booked = new Set();
  const DURATION = 30;
  const HOST_TZ = 'America/New_York';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'demo-' + Math.random().toString(36).slice(2));
  const zonedToUtc = (dateKey, h, m) => {
    const guess = new Date(dateKey + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00Z');
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: HOST_TZ, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(guess);
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return new Date(guess.getTime() - (wall - guess.getTime()));
  };
  function slots(from, to) {
    const out = [];
    const start = new Date(from + 'T00:00:00Z'); const end = new Date(to + 'T00:00:00Z');
    const earliest = Date.now() + 4 * 3600000;
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const dow = zonedToUtc(key, 12, 0).toLocaleDateString('en-US', { weekday: 'short', timeZone: HOST_TZ });
      if (dow === 'Sat' || dow === 'Sun') continue;
      for (const [h, m] of [[10,0],[10,30],[11,0],[11,30],[14,0],[14,30],[15,0],[15,30],[16,0],[16,30]]) {
        const s = zonedToUtc(key, h, m);
        if (s.getTime() < earliest) continue;
        const startsAt = s.toISOString();
        if (booked.has(startsAt)) continue;
        out.push({ startsAt, endsAt: new Date(s.getTime() + DURATION * 60000).toISOString() });
      }
    }
    return out;
  }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const i = url.pathname.indexOf('/api/');
    if (i === -1) return realFetch(input, init);
    const route = url.pathname.slice(i + 5).replace(/\\/$/, '');
    const method = (init.method || 'GET').toUpperCase();
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch { body = {}; }
    await new Promise((r) => setTimeout(r, 180));
    if (route === 'lead' && method === 'POST') {
      if (body.accredited !== 'yes') return json({ ok: true, declined: true });
      const id = uuid(); leads.set(id, body); return json({ leadId: id }, 201);
    }
    if (route === 'slots') return json({ slots: slots(url.searchParams.get('from'), url.searchParams.get('to')), tz: url.searchParams.get('tz'), durationMinutes: DURATION, provider: 'demo' });
    if (route === 'book' && method === 'POST') {
      if (!leads.has(body.leadId)) return json({ error: 'lead_not_found' }, 404);
      if (booked.has(body.startsAt)) return json({ error: 'conflict' }, 409);
      const id = uuid(); const endsAt = new Date(Date.parse(body.startsAt) + DURATION * 60000).toISOString();
      booked.add(body.startsAt); bookings.set(id, { bookingId: id, startsAt: body.startsAt, endsAt, hostTitle: 'the producer', durationMinutes: DURATION });
      try { sessionStorage.setItem('ce_demo_bookings', JSON.stringify([...bookings.values()])); } catch {}
      return json(bookings.get(id), 201);
    }
    if (route === 'book' && method === 'GET') {
      const id = url.searchParams.get('id');
      let b = bookings.get(id);
      if (!b) { try { b = (JSON.parse(sessionStorage.getItem('ce_demo_bookings') || '[]')).find((x) => x.bookingId === id); } catch {} }
      return b ? json(b) : json({ error: 'not_found' }, 404);
    }
    if (route === 'ics') return new Response('BEGIN:VCALENDAR\\r\\nVERSION:2.0\\r\\nPRODID:-//demo//EN\\r\\nEND:VCALENDAR\\r\\n', { headers: { 'content-type': 'text/calendar' } });
    if (route === 'event' || route === 'follow') return new Response(null, { status: 204 });
    return json({ error: 'not_found' }, 404);
  };
  if (navigator.sendBeacon) navigator.sendBeacon = () => true;
})();
`;

function relativise(html, depth = 0) {
  const prefix = depth ? '../'.repeat(depth) : './';
  return html
    .replace(/(href|src)="\/assets\//g, `$1="${prefix}assets/`)
    .replace(/<link rel="manifest"[^>]*>\n?/g, '')
    .replace(/<link rel="apple-touch-icon"[^>]*>\n?/g, '')
    .replace(/href="\/invest\/confirmed\/"/g, 'href="confirmed.html"')
    .replace(/href="\/invest\/received\/"/g, 'href="received.html"')
    .replace(/href="\/invest\/not-accredited\/"/g, 'href="not-accredited.html"')
    .replace(/href="\/privacy\/"/g, 'href="privacy.html"')
    .replace(/href="\/terms\/"/g, 'href="terms.html"')
    .replace(/href="\/invest\/"/g, 'href="index.html"')
    .replace(/action="\/api\/lead"/g, 'action="#start"');
}

async function main() {
  process.argv.push('--quiet');
  const { build } = await import(pathToFileURL(path.join(ROOT, 'build.mjs')).href);
  await build();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const a of ASSETS) {
    await mkdir(path.dirname(path.join(OUT, a)), { recursive: true });
    await cp(path.join(DIST, a), path.join(OUT, a));
  }

  for (const [from, to] of Object.entries(PAGES)) {
    let html = relativise(await readFile(path.join(DIST, from), 'utf8'));
    // Demo mode: no Turnstile, the confirmation is a sibling file, the ribbon says so.
    html = html
      .replace(/"turnstileSiteKey":"[^"]*"/, '"turnstileSiteKey":""')
      .replace(/"confirmedPath":"[^"]*"/, '"confirmedPath":"confirmed.html"')
      .replace(/(<div class="inv-ribbon" role="status">[^<]*)/, '$1 · demo: mock calendar, nothing is saved')
      .replace('</head>', `<script>${SHIM}</script>\n</head>`);
    await writeFile(path.join(OUT, to), html, 'utf8');
  }

  const manifest = { page: 'index.html', files: [...Object.values(PAGES).filter((p) => p !== 'index.html'), ...ASSETS] };
  await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n  invest-demo/ written: ${Object.keys(PAGES).length} pages, ${ASSETS.length} assets. Open invest-demo/index.html.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
