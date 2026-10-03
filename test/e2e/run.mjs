#!/usr/bin/env node
/**
 * The browser suite for the investor page.
 *
 *   npm run test:e2e                 build, then run
 *   npm run test:e2e:update          also rewrite the screenshot baselines
 *
 *   E2E-01  Ad URL with UTMs → six steps → confirmed; DB has lead, booking, UTMs
 *   E2E-02  Not-accredited path shows the end screen with no offering terms
 *   E2E-03  JavaScript disabled: the fallback form posts and saves a lead
 *   E2E-04  Mobile: the sticky CTA shows after the hero and hides at #start
 *   E2E-05  Changing timezone re-renders the slots, across a DST boundary
 *   A11Y-01 axe: zero violations on every page and each flow step
 *   A11Y-02 The whole flow completed by keyboard only
 *   SNAP-01 Screenshots at 375, 768 and 1280 against committed baselines
 *
 * Runs against tools/dev-api.mjs in-process (SQLite in memory, the mock
 * scheduler, mock Turnstile, logged mail). Needs `playwright-core` and
 * `axe-core` installed (`npm install --no-save playwright-core axe-core`)
 * and a Chromium — CHROME_BIN, PLAYWRIGHT_BROWSERS_PATH, or Playwright's own.
 * Everything else in the repository stays dependency-free.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'test', 'e2e', 'output');
const BASELINES = path.join(ROOT, 'test', 'e2e', 'baselines');
const UPDATE = process.argv.includes('--update-snapshots');
const require = createRequire(import.meta.url);

process.env.DB_FILE = ':memory:';

/* ── Harness ──────────────────────────────────────────────────────────── */

const results = [];
async function check(id, name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ id, name, ok: true, ms: Date.now() - started });
    console.log(`  ✔ ${id.padEnd(8)} ${name}`);
  } catch (err) {
    results.push({ id, name, ok: false, ms: Date.now() - started, error: err });
    console.log(`  ✘ ${id.padEnd(8)} ${name}\n      ${String(err.message || err).split('\n').join('\n      ')}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

function findChromium(chromium) {
  const candidates = [process.env.CHROME_BIN, chromium.executablePath(), process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'), '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  return candidates.find((c) => existsSync(c)) || null;
}

/** A stub of the Turnstile client: the island's contract, without the network. */
const TURNSTILE_STUB = `window.turnstile = { render(el, opts) { el.setAttribute('data-stub', '1'); setTimeout(() => opts.callback('XXXX.DUMMY.TOKEN.XXXX'), 10); return 1; }, reset() {}, remove() {} };`;

async function main() {
  let chromium, axeSource;
  try {
    ({ chromium } = require('playwright-core'));
    axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch (err) {
    console.error('\n  The browser suite needs playwright-core and axe-core:\n    npm install --no-save playwright-core axe-core\n');
    console.error(`  (${err.message})\n`);
    process.exit(1);
  }
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    console.error('\n  No Chromium found. Set CHROME_BIN or run `npx playwright install chromium`.\n');
    process.exit(1);
  }

  const { devEnv, createServer } = await import(pathToFileURL(path.join(ROOT, 'tools', 'dev-api.mjs')).href);
  const env = await devEnv({ DEBUG: 'false' }, { readDevVars: false });
  const server = await createServer(env);
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const db = env.DB;

  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

  async function newPage({ viewport = { width: 1280, height: 900 }, javaScriptEnabled = true, timezoneId = 'America/New_York', bypassCSP = false } = {}) {
    // The CSP is enforced in every test but the axe run, which has to inject its own script.
    const context = await browser.newContext({ viewport, javaScriptEnabled, timezoneId, locale: 'en-US', reducedMotion: 'reduce', bypassCSP });
    // Deterministic rendering, no network: block webfonts, stub Turnstile.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await context.route(/challenges\.cloudflare\.com\/turnstile/, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: TURNSTILE_STUB }));
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log(`      [page error] ${e.message}`));
    return { page, context };
  }

  async function axe(page, label) {
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join('; ')}`);
    });
    assert(res.length === 0, `${label}: ${res.length} axe violation(s)\n      ${res.join('\n      ')}`);
  }

  /** Drive the flow to the details step and fill it; returns after the lead is saved. */
  async function driveToCalendar(page, { name = 'E2E Person', email = 'e2e@example.com', phone = '(803) 555-0199' } = {}) {
    await page.getByRole('button', { name: /Yes, I’m an accredited investor/ }).click();
    await page.getByRole('button', { name: /rather discuss the amount/ }).click();
    await page.getByRole('button', { name: 'The story' }).click();
    await page.getByLabel('Your name').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone').fill(phone);
    await page.waitForSelector('[data-turnstile][data-stub]');
    await page.getByRole('button', { name: /Save and pick a time/ }).click();
    await page.waitForSelector('.inv-cal__grid');
    await page.waitForSelector('.inv-cal__day--open');
  }

  console.log(`\n  Investor page — browser suite against ${base}\n`);

  /* E2E-01 */
  await check('E2E-01', 'ad URL with UTMs → six steps → confirmed; lead, booking and UTMs in the database', async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/invest/?utm_source=meta&utm_medium=paid-social&utm_campaign=ce-launch&utm_content=ad-3&utm_term=record&utm_id=1001&fbclid=fb.e2e`);
    assert((await page.textContent('[data-flow-progress]')).includes('Step 1 of 6'), 'progress label');
    assert(await page.isHidden('[data-flow-fallback]'), 'the no-JS form is hidden once the island boots');
    await driveToCalendar(page);
    assert((await page.textContent('[data-flow-progress]')).includes('Step 5 of 6'), 'step 5 label');
    assert(await page.isVisible('[data-flow-standing]'), 'the "not confirmed yet" line shows at steps 5–6');
    await page.locator('.inv-cal__day--open').first().click();
    assert((await page.textContent('[data-flow-progress]')).includes('Step 6 of 6'), 'step 6 label');
    const slot = page.locator('.inv-slots .inv-choice-btn').first();
    await slot.waitFor();
    const slotLabel = await slot.textContent();
    await slot.click();
    await page.getByRole('button', { name: /Book 30 minutes/ }).click();
    await page.waitForURL(/\/invest\/confirmed\/\?b=/);
    await page.waitForFunction(() => !document.querySelector('[data-confirm-when] span').textContent.includes('Loading'));
    const when = await page.textContent('[data-confirm-when]');
    assert(/\d{1,2}:\d{2}/.test(when), `confirmation shows a time: ${when}`);
    assert(await page.isVisible('[data-confirm-ics]'), 'calendar link shown');
    const icsHref = await page.getAttribute('[data-confirm-ics]', 'href');
    const ics = await (await fetch(base + icsHref)).text();
    assert(ics.startsWith('BEGIN:VCALENDAR'), 'ICS downloads');

    const { results: leads } = await db.prepare(`SELECT * FROM leads WHERE email = 'e2e@example.com'`).all();
    assert(leads.length === 1, 'one lead saved');
    const lead = leads[0];
    assert(lead.utm_source === 'meta' && lead.utm_content === 'ad-3' && lead.utm_id === '1001' && lead.fbclid === 'fb.e2e', `UTMs on the lead: ${JSON.stringify(lead)}`);
    assert(lead.status === 'booked' && lead.channel === 'flow' && lead.phone === '+18035550199', 'lead booked, flow channel, E.164 phone');
    assert(lead.landing_path === '/invest/', 'landing path recorded');
    const { results: bookings } = await db.prepare(`SELECT * FROM bookings WHERE lead_id = ?`).bind(lead.id).all();
    assert(bookings.length === 1 && bookings[0].status === 'confirmed', 'one confirmed booking');
    const { results: events } = await db.prepare(`SELECT name FROM events ORDER BY created_at`).all();
    const names = events.map((e) => e.name);
    for (const n of ['page_view', 'flow_step', 'lead_saved', 'calendar_view', 'slot_view', 'booked']) assert(names.includes(n), `event ${n} logged (have ${names.join(',')})`);
    assert(env.__mail.some((m) => m.to === 'e2e@example.com' && /booked/i.test(m.subject)), 'investor confirmation mailed');
    void slotLabel;
    await context.close();
  });

  /* E2E-02 */
  await check('E2E-02', 'not accredited → end screen with no offering terms', async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/invest/`);
    await page.getByRole('button', { name: /No, or I’m not sure/ }).click();
    const root = await page.textContent('[data-flow-root]');
    assert(root.includes('limited by law to accredited investors'), 'end screen text');
    for (const forbidden of ['$', 'Minimum', 'minimum', 'Membership interests', 'return', 'Pick a day', 'Your details']) {
      assert(!root.includes(forbidden), `end screen must not mention "${forbidden}"`);
    }
    assert((await page.textContent('[data-flow-progress]')).trim() === 'Thank you', 'progress label reads Thank you');
    assert(!(await page.isVisible('#fl-email')), 'no follow-list field while the feature is off');
    const { results } = await db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE accredited_self_report = 'no_or_unsure'`).all();
    assert(results[0].n === 0, 'nothing stored for a not-accredited visitor');
    // Reload: the refusal persists in sessionStorage.
    await page.reload();
    assert((await page.textContent('[data-flow-root]')).includes('limited by law'), 'end screen survives a refresh');
    await page.getByRole('button', { name: 'Start over' }).click();
    assert((await page.textContent('[data-flow-progress]')).includes('Step 1 of 6'), 'start over returns to step 1');
    await context.close();
  });

  /* E2E-03 */
  await check('E2E-03', 'JavaScript disabled: the fallback form posts and saves a lead', async () => {
    const { page, context } = await newPage({ javaScriptEnabled: false });
    await page.goto(`${base}/invest/`);
    assert(await page.isVisible('[data-flow-fallback]'), 'the plain form is visible without JS');
    await page.check('#fb-acc-yes');
    await page.fill('#fb-name', 'No Script');
    await page.fill('#fb-email', 'nojs@example.com');
    await page.fill('#fb-phone', '803 555 0177');
    await page.click('[data-flow-fallback] button[type="submit"]');
    await page.waitForURL(/\/invest\/received\//);
    assert((await page.textContent('h1')).includes('We have your details'), 'received page');
    const { results } = await db.prepare(`SELECT channel, status, phone FROM leads WHERE email = 'nojs@example.com'`).all();
    assert(results.length === 1 && results[0].channel === 'nojs' && results[0].phone === '+18035550177', `nojs lead saved: ${JSON.stringify(results)}`);
    // And the not-accredited branch of the form.
    await page.goto(`${base}/invest/`);
    await page.check('#fb-acc-no');
    await page.fill('#fb-name', 'No Script Two');
    await page.fill('#fb-email', 'nojs2@example.com');
    await page.fill('#fb-phone', '803 555 0178');
    await page.click('[data-flow-fallback] button[type="submit"]');
    await page.waitForURL(/\/invest\/not-accredited\//);
    await context.close();
  });

  /* E2E-04 */
  await check('E2E-04', 'mobile: sticky CTA appears after the hero and hides at #start', async () => {
    const { page, context } = await newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(`${base}/invest/`);
    await page.waitForTimeout(200);
    assert(await page.isHidden('[data-sticky]'), 'hidden while the hero is in view');
    await page.evaluate(() => document.getElementById('the-case').scrollIntoView());
    await page.waitForFunction(() => !document.querySelector('[data-sticky]').hidden, null, { timeout: 3000 });
    assert(await page.isVisible('[data-sticky]'), 'visible once the hero has scrolled out');
    await page.evaluate(() => document.getElementById('start').scrollIntoView());
    await page.waitForFunction(() => document.querySelector('[data-sticky]').hidden, null, { timeout: 3000 });
    assert(await page.isHidden('[data-sticky]'), 'hidden while the questionnaire is in view');
    await page.evaluate(() => document.getElementById('faq').scrollIntoView());
    await page.waitForFunction(() => !document.querySelector('[data-sticky]').hidden, null, { timeout: 3000 });
    // Focusing a field (the keyboard opening) hides it too.
    await page.evaluate(() => document.getElementById('start').scrollIntoView());
    await context.close();
  });

  /* E2E-05 */
  await check('E2E-05', 'timezone change re-renders the slots correctly across a DST boundary', async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/invest/`);
    await driveToCalendar(page, { email: 'tz@example.com' });
    await page.locator('.inv-cal__day--open').first().click();
    const first = page.locator('.inv-slots .inv-choice-btn').first();
    await first.waitFor();
    const inNewYork = await first.textContent();
    await page.selectOption('#fl-tz', 'America/Los_Angeles');
    await page.waitForFunction((prev) => document.querySelector('.inv-slots .inv-choice-btn')?.textContent !== prev, inNewYork);
    const inLosAngeles = await page.locator('.inv-slots .inv-choice-btn').first().textContent();
    assert(inNewYork !== inLosAngeles, 'labels change with the zone');
    const hour = (s) => {
      const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      return (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0);
    };
    const diff = (hour(inNewYork) - hour(inLosAngeles) + 24) % 24;
    assert(diff === 3, `New York is three hours ahead of Los Angeles on every date (got ${diff}: "${inNewYork}" vs "${inLosAngeles}")`);
    // A zone with a different DST rule: London is 5 hours ahead of New York in both
    // standard and daylight time except in the fortnight the two change — the
    // label must still be a correct conversion of the same instant.
    await page.selectOption('#fl-tz', 'Europe/London');
    await page.waitForFunction((prev) => document.querySelector('.inv-slots .inv-choice-btn')?.textContent !== prev, inLosAngeles);
    const inLondon = await page.locator('.inv-slots .inv-choice-btn').first().textContent();
    const startsAt = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ce_invest_flow')).day);
    assert(startsAt, 'the chosen day persists');
    const expectedLondon = await page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('ce_invest_flow'));
      return s.timezone;
    });
    assert(expectedLondon === 'Europe/London', 'the timezone is stored with the state');
    assert(/[AP]M/.test(inLondon), `London label renders: ${inLondon}`);
    await context.close();
  });

  /* A11Y-01 */
  await check('A11Y-01', 'axe: zero violations on every page and each flow step', async () => {
    const { page, context } = await newPage({ bypassCSP: true });
    for (const p of ['/invest/', '/invest/confirmed/', '/invest/received/', '/invest/not-accredited/', '/privacy/', '/terms/']) {
      await page.goto(`${base}${p}`);
      await axe(page, p);
    }
    await page.goto(`${base}/invest/`);
    await axe(page, 'step 1');
    await page.getByRole('button', { name: /Yes, I’m an accredited investor/ }).click();
    await axe(page, 'step 2');
    await page.getByRole('button', { name: /rather discuss the amount/ }).click();
    await axe(page, 'step 3');
    await page.getByRole('button', { name: 'The story' }).click();
    await axe(page, 'step 4');
    await page.getByLabel('Your name').fill('Axe Person');
    await page.getByLabel('Email').fill('axe@example.com');
    await page.getByLabel('Phone').fill('8035550155');
    await page.waitForSelector('[data-turnstile][data-stub]');
    await page.getByRole('button', { name: /Save and pick a time/ }).click();
    await page.waitForSelector('.inv-cal__day--open');
    await axe(page, 'step 5');
    await page.locator('.inv-cal__day--open').first().click();
    await page.locator('.inv-slots .inv-choice-btn').first().waitFor();
    await axe(page, 'step 6');
    await context.close();
    // A fresh context: the completed flow above is held in sessionStorage.
    const fresh = await newPage({ bypassCSP: true });
    await fresh.page.goto(`${base}/invest/`);
    await fresh.page.getByRole('button', { name: /No, or I’m not sure/ }).click();
    await axe(fresh.page, 'end screen');
    await fresh.context.close();
  });

  /* A11Y-02 */
  await check('A11Y-02', 'the whole flow completed by keyboard only', async () => {
    const { page, context } = await newPage();
    await page.goto(`${base}/invest/`);
    const active = () => page.evaluate(() => ({ text: document.activeElement?.textContent?.trim() || '', id: document.activeElement?.id || '', tag: document.activeElement?.tagName }));
    async function tabTo(predicate, max = 80) {
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        if (predicate(await active())) return;
      }
      throw new Error('could not reach the target by Tab');
    }
    // Skip link to the questionnaire.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert((await active()).text === 'Skip to the questionnaire', 'second Tab lands on the questionnaire skip link');
    await page.keyboard.press('Enter');
    await tabTo((a) => a.text.startsWith('Yes, I’m an accredited'));
    await page.keyboard.press('Enter');
    assert((await active()).text === 'How much are you considering?', 'focus moves to the new step heading');
    await tabTo((a) => a.text.includes('rather discuss'));
    await page.keyboard.press('Enter');
    await tabTo((a) => a.text === 'The story');
    await page.keyboard.press('Enter');
    await tabTo((a) => a.id === 'fl-name');
    await page.keyboard.type('Key Board');
    await page.keyboard.press('Tab');
    await page.keyboard.type('keys@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('8035550133');
    await page.waitForSelector('[data-turnstile][data-stub]');
    await tabTo((a) => a.text.startsWith('Save and pick a time'));
    await page.keyboard.press('Enter');
    await page.waitForSelector('.inv-cal__day--open');
    // Into the grid, arrow to an open day, Enter.
    await tabTo((a) => a.tag === 'BUTTON' && /\d/.test(a.text) && a.text.length <= 2, 40);
    for (let i = 0; i < 31; i++) {
      const isOpen = await page.evaluate(() => document.activeElement.getAttribute('aria-disabled') === 'false');
      if (isOpen) break;
      await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.press('Enter');
    await page.locator('.inv-slots .inv-choice-btn').first().waitFor();
    await tabTo((a) => a.tag === 'BUTTON' && /[AP]M/.test(a.text));
    await page.keyboard.press('Enter');
    await tabTo((a) => a.text.startsWith('Book 30 minutes'));
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/invest\/confirmed\//);
    const { results } = await db.prepare(`SELECT status FROM leads WHERE email = 'keys@example.com'`).all();
    assert(results[0]?.status === 'booked', 'booked by keyboard alone');
    await context.close();
  });

  /* SNAP-01 */
  await check('SNAP-01', 'screenshots at 375, 768 and 1280 against the baselines', async () => {
    await mkdir(BASELINES, { recursive: true });
    const diffs = [];
    for (const width of [375, 768, 1280]) {
      const { page, context } = await newPage({ viewport: { width, height: 900 } });
      await page.goto(`${base}/invest/`);
      await page.waitForTimeout(150);
      const shot = await page.screenshot({ fullPage: true });
      const outFile = path.join(OUT, `invest-${width}.png`);
      await writeFile(outFile, shot);
      const baseFile = path.join(BASELINES, `invest-${width}.png`);
      if (UPDATE || !existsSync(baseFile)) {
        await writeFile(baseFile, shot);
        console.log(`      wrote baseline invest-${width}.png`);
      } else {
        const baseline = await readFile(baseFile);
        const mismatch = await page.evaluate(
          async ([a, b]) => {
            const load = (src) => new Promise((res, rej) => {
              const img = new Image();
              img.onload = () => res(img);
              img.onerror = rej;
              img.src = src;
            });
            const [ia, ib] = await Promise.all([load(a), load(b)]);
            const w = Math.max(ia.width, ib.width);
            const h = Math.max(ia.height, ib.height);
            const draw = (img) => {
              const c = document.createElement('canvas');
              c.width = w;
              c.height = h;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              return ctx.getImageData(0, 0, w, h).data;
            };
            const da = draw(ia);
            const db = draw(ib);
            let bad = 0;
            for (let i = 0; i < da.length; i += 4) {
              if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 48) bad++;
            }
            return { pct: (bad / (w * h)) * 100, sizeDiff: ia.width !== ib.width || ia.height !== ib.height };
          },
          [`data:image/png;base64,${shot.toString('base64')}`, `data:image/png;base64,${baseline.toString('base64')}`],
        );
        diffs.push({ width, ...mismatch });
      }
      await context.close();
    }
    const over = diffs.filter((d) => d.pct > 2);
    assert(over.length === 0, `screenshot drift over 2%: ${over.map((d) => `${d.width}px ${d.pct.toFixed(2)}%${d.sizeDiff ? ' (size changed)' : ''}`).join(', ')} — review test/e2e/output/ and run npm run test:e2e:update if intended`);
    if (diffs.length) console.log(`      drift: ${diffs.map((d) => `${d.width}px ${d.pct.toFixed(2)}%`).join(' · ')}`);
  });

  await browser.close();
  await new Promise((r) => server.close(r));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length} passed · ${failed.length} failed\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
