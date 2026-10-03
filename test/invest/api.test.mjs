/**
 * API-01 · API-02 · API-03 · API-04 — the Pages Functions, run in-process
 * against the real migration on node:sqlite through the D1 shim, with the
 * mock scheduler, mock Turnstile and the logging mailer.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from '../helpers/dom.mjs';
import { devEnv, callFunction } from '../../tools/dev-api.mjs';
import { sha256Hex } from '../../functions/api/_lib/crypto.js';
import { insertLead, getLead } from '../../functions/api/_lib/db.js';
import { CalComAdapter, ConflictError, MockAdapter } from '../../functions/api/_lib/scheduler.js';
import { buildIcs } from '../../functions/api/_lib/ics.js';

process.env.DB_FILE = ':memory:';

let env;
beforeEach(async () => {
  env = await devEnv({ DEBUG: 'false', FEATURE_SMS: 'true' }, { readDevVars: false });
});

const api = (method, url, body, headers = {}) =>
  callFunction(
    new Request(`http://localhost${url}`, {
      method,
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': headers.ip || '10.0.0.1', 'user-agent': 'test', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    url.split('?')[0],
  );

const form = (fields, ip = '10.0.0.2') =>
  callFunction(
    new Request('http://localhost/api/lead', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': ip }, body: new URLSearchParams(fields) }),
    env,
    '/api/lead',
  );

const goodLead = (extra = {}) => ({
  accredited: 'yes',
  amountRange: 'r1',
  interest: 'story',
  name: 'Test Person',
  email: 't@example.com',
  phone: '(803) 555-0100',
  timezone: 'America/New_York',
  turnstileToken: 'ok',
  touch: { utm_source: 'meta', utm_medium: 'paid-social', utm_campaign: 'ce', utm_content: 'ad-3', utm_id: '77', fbclid: 'fb.1' },
  pageVersion: 'abc123',
  sessionId: 'session-0001',
  ...extra,
});

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function bookableSlot() {
  const r = await api('GET', `/api/slots?from=${day(1)}&to=${day(14)}&tz=America/New_York`);
  const { slots } = await r.json();
  assert.ok(slots.length > 0, 'the mock scheduler offers slots');
  return slots[0];
}

describe('API-01 /api/lead', () => {
  test('rejects a missing Turnstile token', async () => {
    const r = await api('POST', '/api/lead', goodLead({ turnstileToken: undefined }));
    assert.equal(r.status, 400);
    assert.deepEqual((await r.json()).errors, { turnstile: 'missing' });
  });

  test('rejects an invalid Turnstile token', async () => {
    const r = await api('POST', '/api/lead', goodLead({ turnstileToken: 'invalid' }));
    assert.equal(r.status, 400);
    assert.equal((await r.json()).errors.turnstile, 'invalid');
  });

  test('rejects a bad payload field by field', async () => {
    const r = await api('POST', '/api/lead', goodLead({ email: 'nope', phone: '12', name: '' }));
    assert.equal(r.status, 400);
    const { errors } = await r.json();
    assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'phone']);
  });

  test('rejects an unreadable body', async () => {
    const r = await callFunction(new Request('http://localhost/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' }), env, '/api/lead');
    assert.equal(r.status, 400);
  });

  test('rate-limits the eleventh attempt from one address', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await api('POST', '/api/lead', goodLead({ email: `p${i}@example.com` }), { ip: '10.9.9.9' });
      assert.equal(r.status, 201, `attempt ${i + 1}`);
    }
    const r = await api('POST', '/api/lead', goodLead(), { ip: '10.9.9.9' });
    assert.equal(r.status, 429);
    assert.equal(r.headers.get('retry-after'), '600');
  });

  test('saves the lead with its attribution and notifies the producer', async () => {
    const r = await api('POST', '/api/lead', goodLead());
    assert.equal(r.status, 201);
    const { leadId } = await r.json();
    const lead = await getLead(env.DB, leadId);
    assert.equal(lead.name, 'Test Person');
    assert.equal(lead.phone, '+18035550100');
    assert.equal(lead.status, 'new');
    assert.equal(lead.utm_content, 'ad-3');
    assert.equal(lead.utm_id, '77');
    assert.equal(lead.fbclid, 'fb.1');
    assert.equal(lead.page_version, 'abc123');
    assert.equal(lead.channel, 'flow');
    assert.ok(lead.ip_hash && lead.ip_hash.length === 64, 'the IP is stored only as a hash');
    assert.ok(!JSON.stringify(lead).includes('10.0.0.1'), 'the raw IP never reaches the database');
    assert.equal(env.__mail.length, 1);
    assert.equal(env.__mail[0].to, 'michaelmartin@greenplanit.org');
    assert.match(env.__mail[0].subject, /New investor lead — Test Person/);
    assert.ok(env.__mail[0].text.includes('meta / paid-social / ce / ad-3'));
  });

  test('a not-accredited answer stores nothing', async () => {
    const r = await api('POST', '/api/lead', goodLead({ accredited: 'no_or_unsure' }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true, declined: true });
    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM leads').all();
    assert.equal(results[0].n, 0);
    const ev = await env.DB.prepare(`SELECT name FROM events`).all();
    assert.deepEqual(ev.results.map((e) => e.name), ['not_accredited_end']);
  });

  test('the GET method is refused', async () => {
    const r = await api('GET', '/api/lead');
    assert.equal(r.status, 405);
  });
});

describe('the no-JavaScript form', () => {
  const fields = { accredited: 'yes', name: 'Form Person', email: 'f@example.com', phone: '8035550101', fallback: '1', page_version: 'abc' };

  test('a valid post saves a lead on the nojs channel and redirects', async () => {
    const r = await form(fields);
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/invest/received/');
    const { results } = await env.DB.prepare(`SELECT channel, status FROM leads`).all();
    assert.deepEqual(results, [{ channel: 'nojs', status: 'new' }]);
    assert.ok(env.__mail[0].text.includes('plain form'));
  });

  test('the honeypot swallows bots without storing anything', async () => {
    const r = await form({ ...fields, website: 'http://spam' });
    assert.equal(r.status, 303);
    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM leads').all();
    assert.equal(results[0].n, 0);
  });

  test('not accredited goes to the end page', async () => {
    const r = await form({ ...fields, accredited: 'no_or_unsure' });
    assert.equal(r.headers.get('location'), '/invest/not-accredited/');
  });

  test('an invalid form goes back to the questionnaire', async () => {
    const r = await form({ ...fields, email: 'bad' });
    assert.equal(r.headers.get('location'), '/invest/#start');
  });

  test('is limited to three per hour per address', async () => {
    for (let i = 0; i < 3; i++) assert.equal((await form({ ...fields, email: `f${i}@example.com` }, '10.0.0.7')).status, 303);
    assert.equal((await form(fields, '10.0.0.7')).status, 429);
  });
});

describe('API-02 /api/book eligibility', () => {
  test('refuses a lead that did not self-report accredited', async () => {
    const declined = await insertLead(env.DB, { accredited: 'no_or_unsure', name: 'N', email: 'n@example.com', phone: '+18035550102', pageVersion: 'x' });
    const slot = await bookableSlot();
    const r = await api('POST', '/api/book', { leadId: declined.id, startsAt: slot.startsAt, sessionId: 'session-0001' });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, 'not_eligible');
  });

  test('refuses an unknown lead', async () => {
    const slot = await bookableSlot();
    const r = await api('POST', '/api/book', { leadId: '00000000-0000-4000-8000-000000000000', startsAt: slot.startsAt });
    assert.equal(r.status, 404);
  });

  test('refuses a malformed request', async () => {
    const r = await api('POST', '/api/book', { leadId: 'nope', startsAt: 'never' });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys((await r.json()).errors).sort(), ['leadId', 'startsAt']);
  });

  test('refuses a time inside the lead time or beyond the horizon', async () => {
    const { leadId } = await (await api('POST', '/api/lead', goodLead())).json();
    const soon = await api('POST', '/api/book', { leadId, startsAt: new Date(Date.now() + 60_000).toISOString() });
    assert.equal((await soon.json()).error, 'too_soon');
    const far = await api('POST', '/api/book', { leadId, startsAt: new Date(Date.now() + 400 * 86_400_000).toISOString() });
    assert.equal((await far.json()).error, 'too_far');
  });
});

describe('API-03 double booking', () => {
  test('the same slot booked twice answers 409 and leaves one row', async () => {
    const a = await (await api('POST', '/api/lead', goodLead())).json();
    const b = await (await api('POST', '/api/lead', goodLead({ email: 'b@example.com' }), { ip: '10.0.0.3' })).json();
    const slot = await bookableSlot();
    const first = await api('POST', '/api/book', { leadId: a.leadId, startsAt: slot.startsAt, timezone: 'America/Chicago', sessionId: 'session-0001' });
    assert.equal(first.status, 201);
    const second = await api('POST', '/api/book', { leadId: b.leadId, startsAt: slot.startsAt, sessionId: 'session-0002' });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, 'conflict');
    const { results } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM bookings WHERE status = 'confirmed'`).all();
    assert.equal(results[0].n, 1);
    assert.equal((await getLead(env.DB, a.leadId)).status, 'booked');
    assert.equal((await getLead(env.DB, a.leadId)).timezone, 'America/Chicago', 'the timezone chosen at booking is kept');
    assert.equal((await getLead(env.DB, b.leadId)).status, 'new');
  });

  test('the booked slot disappears from availability', async () => {
    const a = await (await api('POST', '/api/lead', goodLead())).json();
    const slot = await bookableSlot();
    await api('POST', '/api/book', { leadId: a.leadId, startsAt: slot.startsAt });
    const after = await (await api('GET', `/api/slots?from=${day(1)}&to=${day(14)}&tz=UTC`)).json();
    assert.ok(!after.slots.some((s) => s.startsAt === slot.startsAt));
  });

  test('the database itself refuses a racing duplicate', async () => {
    const a = await (await api('POST', '/api/lead', goodLead())).json();
    const slot = await bookableSlot();
    await env.DB.prepare(`INSERT INTO bookings (id, lead_id, provider, starts_at, ends_at, status, created_at) VALUES ('x', ?, 'mock', ?, ?, 'confirmed', 'now')`).bind(a.leadId, slot.startsAt, slot.endsAt).run();
    await assert.rejects(
      env.DB.prepare(`INSERT INTO bookings (id, lead_id, provider, starts_at, ends_at, status, created_at) VALUES ('y', ?, 'mock', ?, ?, 'confirmed', 'now')`).bind(a.leadId, slot.startsAt, slot.endsAt).run(),
      /UNIQUE/,
    );
  });

  test('a booking sends the investor a confirmation with a calendar file, and the producer a notice', async () => {
    const a = await (await api('POST', '/api/lead', goodLead())).json();
    const slot = await bookableSlot();
    env.__mail.length = 0;
    const r = await api('POST', '/api/book', { leadId: a.leadId, startsAt: slot.startsAt, sessionId: 'session-0001' });
    const booking = await r.json();
    assert.equal(env.__mail.length, 2);
    const toInvestor = env.__mail.find((m) => m.to === 't@example.com');
    assert.match(toInvestor.subject, /Your call is booked/);
    assert.ok(toInvestor.text.includes(`/invest/confirmed/?b=${booking.bookingId}`));
    assert.ok(toInvestor.text.includes('Not an offer of securities'));
    assert.ok(!toInvestor.text.includes('r1'), 'the amount range never goes to the investor');
    assert.equal(toInvestor.attachments[0].filename, 'clearly-established-call.ics');
    const ics = Buffer.from(toInvestor.attachments[0].contentBase64, 'base64').toString();
    assert.match(ics, /BEGIN:VCALENDAR\r\n/);
    assert.ok(ics.includes(`UID:${booking.bookingId}@clearly-established`));
    const toProducer = env.__mail.find((m) => m.to === 'michaelmartin@greenplanit.org');
    assert.match(toProducer.subject, /^Booked — Test Person/);
  });

  test('GET /api/book?id= returns the time and nothing personal; /api/ics returns the file', async () => {
    const a = await (await api('POST', '/api/lead', goodLead())).json();
    const slot = await bookableSlot();
    const { bookingId } = await (await api('POST', '/api/book', { leadId: a.leadId, startsAt: slot.startsAt })).json();
    const r = await api('GET', `/api/book?id=${bookingId}`);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.deepEqual(Object.keys(body).sort(), ['bookingId', 'durationMinutes', 'endsAt', 'hostTitle', 'startsAt']);
    const ics = await api('GET', `/api/ics?id=${bookingId}`);
    assert.equal(ics.status, 200);
    assert.match(ics.headers.get('content-type'), /text\/calendar/);
    assert.match(await ics.text(), /DTSTART:\d{8}T\d{6}Z/);
    assert.equal((await api('GET', '/api/book?id=00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await api('GET', '/api/ics?id=nope')).status, 400);
  });
});

describe('API-04 consents', () => {
  test('the consent row stores the exact text shown and its hash', async () => {
    const text = 'Yes, text me about this offering. Reply STOP to opt out.';
    const r = await api('POST', '/api/lead', goodLead({ smsConsent: true, smsConsentText: text, analyticsConsent: false, analyticsConsentText: 'Allow analytics cookies.' }));
    const { leadId } = await r.json();
    const { results } = await env.DB.prepare(`SELECT kind, granted, text_shown, text_hash FROM consents WHERE lead_id = ? ORDER BY kind`).bind(leadId).all();
    assert.equal(results.length, 2);
    const sms = results.find((c) => c.kind === 'sms');
    assert.equal(sms.granted, 1);
    assert.equal(sms.text_shown, text);
    assert.equal(sms.text_hash, await sha256Hex(text));
    const analytics = results.find((c) => c.kind === 'analytics');
    assert.equal(analytics.granted, 0);
  });

  test('no SMS consent row is written when the SMS feature is off', async () => {
    env = await devEnv({ DEBUG: 'false', FEATURE_SMS: 'false' }, { readDevVars: false });
    const { leadId } = await (await api('POST', '/api/lead', goodLead({ smsConsent: true, smsConsentText: 'x'.repeat(20) }))).json();
    const { results } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM consents WHERE lead_id = ?`).bind(leadId).all();
    assert.equal(results[0].n, 0);
  });
});

describe('/api/slots', () => {
  test('validates its query', async () => {
    assert.equal((await api('GET', '/api/slots?from=x&to=y&tz=Mars')).status, 400);
    assert.equal((await api('GET', `/api/slots?from=${day(1)}&to=${day(90)}&tz=UTC`)).status, 400, 'range too long');
    assert.equal((await api('GET', `/api/slots?from=${day(5)}&to=${day(1)}&tz=UTC`)).status, 400, 'range inverted');
  });

  test('returns sorted UTC slots inside the window, cached for a minute', async () => {
    const r = await api('GET', `/api/slots?from=${day(0)}&to=${day(10)}&tz=America/New_York`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'private, max-age=60');
    const { slots, provider } = await r.json();
    assert.equal(provider, 'mock');
    const times = slots.map((s) => Date.parse(s.startsAt));
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
    assert.ok(times[0] >= Date.now() + 4 * 3_600_000, 'nothing inside the lead time');
    for (const s of slots) {
      assert.equal(Date.parse(s.endsAt) - Date.parse(s.startsAt), 30 * 60_000);
      const dow = new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
      assert.ok(!['Sat', 'Sun'].includes(dow), 'the mock host does not take weekend calls');
    }
  });
});

describe('/api/event, /api/health, /api/follow, /api/cron/abandoned', () => {
  test('events are allow-listed and stored', async () => {
    assert.equal((await api('POST', '/api/event', { name: 'cta_click', props: { location: 'hero' }, sessionId: 'session-0001' })).status, 204);
    assert.equal((await api('POST', '/api/event', { name: 'drop_table', sessionId: 'session-0001' })).status, 400);
    assert.equal((await api('POST', '/api/event', { name: 'page_view', sessionId: 'short' })).status, 400);
    const { results } = await env.DB.prepare(`SELECT name, props FROM events`).all();
    assert.equal(results.length, 1);
    assert.equal(JSON.parse(results[0].props).location, 'hero');
  });

  test('health reports the database, the scheduler and the gates as booleans', async () => {
    const r = await api('GET', '/api/health');
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.db, true);
    assert.equal(body.scheduler, true);
    assert.equal(body.provider, 'mock');
    assert.equal(typeof body.gates.G_SECURITIES, 'boolean');
    assert.ok(!('by' in body.gates), 'who signed is not exposed');
  });

  test('follow is off by default and works when on', async () => {
    assert.equal((await api('POST', '/api/follow', { email: 'a@b.co', consentText: 'Email me if this opens up.' })).status, 404);
    env = await devEnv({ DEBUG: 'false', FEATURE_FOLLOW_LIST: 'true' }, { readDevVars: false });
    assert.equal((await api('POST', '/api/follow', { email: 'a@b.co', consentText: 'Email me if this opens up.' })).status, 201);
    assert.equal((await api('POST', '/api/follow', { email: 'bad', consentText: 'Email me if this opens up.' })).status, 400);
  });

  test('the abandonment sweep notifies once per lead, and needs the secret', async () => {
    const { leadId } = await (await api('POST', '/api/lead', goodLead())).json();
    await env.DB.prepare(`UPDATE leads SET created_at = ? WHERE id = ?`).bind(new Date(Date.now() - 45 * 60_000).toISOString(), leadId).run();
    assert.equal((await api('GET', '/api/cron/abandoned')).status, 401);
    env.__mail.length = 0;
    const r = await api('GET', '/api/cron/abandoned', null, { authorization: 'Bearer dev-cron' });
    assert.deepEqual(await r.json(), { ok: true, notified: 1 });
    assert.match(env.__mail[0].subject, /Lead without booking — Test Person/);
    const again = await api('GET', '/api/cron/abandoned', null, { authorization: 'Bearer dev-cron' });
    assert.deepEqual(await again.json(), { ok: true, notified: 0 });
    // A booked lead is never swept.
    const fresh = await (await api('POST', '/api/lead', goodLead({ email: 'z@example.com' }), { ip: '10.0.0.5' })).json();
    await env.DB.prepare(`UPDATE leads SET created_at = ? WHERE id = ?`).bind(new Date(Date.now() - 45 * 60_000).toISOString(), fresh.leadId).run();
    const slot = await bookableSlot();
    await api('POST', '/api/book', { leadId: fresh.leadId, startsAt: slot.startsAt });
    const third = await api('GET', '/api/cron/abandoned', null, { authorization: 'Bearer dev-cron' });
    assert.deepEqual(await third.json(), { ok: true, notified: 0 });
  });
});

describe('the scheduler adapters', () => {
  test('MockAdapter is deterministic for a date range', async () => {
    const a = new MockAdapter({});
    const b = new MockAdapter({});
    const x = await a.slots({ from: '2027-03-01', to: '2027-03-08' });
    const y = await b.slots({ from: '2027-03-01', to: '2027-03-08' });
    assert.deepEqual(x, y);
    assert.equal(x.length, 5 * 10, 'five weekdays, ten slots each');
    assert.equal(x[0].startsAt, '2027-03-01T15:00:00.000Z', '10:00 Eastern Standard Time is 15:00 UTC');
  });

  test('MockAdapter handles the DST change (E2E-05 arithmetic)', async () => {
    const a = new MockAdapter({});
    const march = await a.slots({ from: '2027-03-12', to: '2027-03-13' }); // Friday before the US spring change
    const after = await a.slots({ from: '2027-03-15', to: '2027-03-16' }); // Monday after
    assert.equal(march[0].startsAt, '2027-03-12T15:00:00.000Z');
    assert.equal(after[0].startsAt, '2027-03-15T14:00:00.000Z', '10:00 Eastern Daylight Time is 14:00 UTC');
  });

  test('CalComAdapter parses v2 slots and maps a taken slot to ConflictError', async () => {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/v2/slots')) {
        return new Response(JSON.stringify({ status: 'success', data: { '2027-03-01': [{ start: '2027-03-01T15:00:00.000Z' }, { start: '2027-03-01T15:30:00.000Z', end: '2027-03-01T16:00:00.000Z' }] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ status: 'error', error: { message: 'User either already has booking at this time or is not available' } }), { status: 400 });
    };
    const cal = new CalComAdapter({ CALCOM_API_KEY: 'k', CALCOM_EVENT_TYPE_ID: '7' }, fetchImpl);
    const slots = await cal.slots({ from: '2027-03-01', to: '2027-03-02', tz: 'UTC' });
    assert.equal(slots.length, 2);
    assert.equal(slots[0].startsAt, '2027-03-01T15:00:00.000Z');
    assert.equal(slots[0].endsAt, null, 'an end the API omits is filled in by the route');
    assert.ok(calls[0].init.headers['cal-api-version']);
    await assert.rejects(cal.book({ startsAt: '2027-03-01T15:00:00.000Z', lead: { id: 'l', name: 'n', email: 'e@x.co', phone: '+1' }, timezone: 'UTC' }), ConflictError);
    assert.throws(() => new CalComAdapter({}), /CALCOM_API_KEY/);
  });
});

describe('the calendar file', () => {
  test('is RFC 5545 shaped with CRLF, escaping and folding', () => {
    const ics = buildIcs({ uid: 'u@x', startsAt: '2027-03-01T15:00:00.000Z', endsAt: '2027-03-01T15:30:00.000Z', summary: 'A; B, C', description: 'x'.repeat(200), organizerEmail: 'o@x.co', attendeeEmail: 'a@x.co' });
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    assert.ok(ics.includes('SUMMARY:A\\; B\\, C'));
    assert.ok(ics.includes('DTSTART:20270301T150000Z'));
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line.length}`);
    assert.ok(ics.includes('\r\n x'), 'long lines are folded with a leading space');
  });
});

describe('Workers compatibility', () => {
  test('no function imports a node: module', async () => {
    async function walk(dir) {
      const out = [];
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...(await walk(full)));
        else if (e.name.endsWith('.js')) out.push(full);
      }
      return out;
    }
    const files = await walk(path.join(ROOT, 'functions'));
    assert.ok(files.length >= 8);
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      assert.ok(!/from ['"]node:/.test(src), `${path.relative(ROOT, f)} imports a node: module`);
      assert.ok(!/require\(/.test(src), `${path.relative(ROOT, f)} uses require()`);
    }
  });
});
