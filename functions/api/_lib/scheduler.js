/**
 * The scheduler boundary (HANDOFF.md § 6).
 *
 *   SchedulerAdapter
 *     slots({ from, to, tz })           → [{ startsAt, endsAt }]   (ISO 8601, UTC)
 *     book({ startsAt, endsAt, lead })  → { providerRef }          throws ConflictError when taken
 *     ping()                            → true | false
 *
 * `MockAdapter` is deterministic — weekday afternoons, Eastern time — and
 * respects bookings already in the database, so the whole flow runs locally
 * and in CI with no account anywhere.
 *
 * `CalComAdapter` talks to the Cal.com v2 API.
 * ⚠ The endpoints, headers and payloads below were written from the Cal.com
 * API v2 documentation as remembered on October 3, 2026, and could not be
 * verified from this build environment (api.cal.com and cal.com docs were
 * unreachable). Phase 4 acceptance — a real test booking landing on the
 * host's calendar from staging — is the check. See docs/invest/DECISIONS.md.
 */

import { confirmedBookingsBetween } from './db.js';

export class ConflictError extends Error {
  constructor(message = 'That time is no longer available') {
    super(message);
    this.name = 'ConflictError';
  }
}

export function getScheduler(env) {
  return env.SCHEDULER === 'calcom' ? new CalComAdapter(env) : new MockAdapter(env);
}

/* ── Mock ─────────────────────────────────────────────────────────────── */

/** Minutes past UTC midnight for a wall-clock time in a zone, on a date. */
function zonedToUtc(dateKey, hour, minute, tz) {
  // Build the instant as if UTC, read back its wall time in `tz`, and shift by the difference.
  const guess = new Date(`${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(guess);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  const diff = wall - guess.getTime();
  return new Date(guess.getTime() - diff);
}

export class MockAdapter {
  constructor(env = {}) {
    this.env = env;
    this.db = env.DB;
    this.duration = Number(env.BOOKING_DURATION_MINUTES || 30);
    this.hostTz = env.HOST_TIMEZONE || 'America/New_York';
    this.name = 'mock';
  }

  async ping() {
    return true;
  }

  /** Weekdays, 10:00–12:00 and 14:00–17:00 host time, on the half hour. */
  async slots({ from, to }) {
    const out = [];
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    const booked = new Set(this.db ? await confirmedBookingsBetween(this.db, start.toISOString(), end.toISOString()) : []);
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const dow = zonedToUtc(key, 12, 0, this.hostTz).getUTCDay();
      // Day of week as the host sees it: use noon to avoid DST edges.
      const localDow = new Date(zonedToUtc(key, 12, 0, this.hostTz)).toLocaleDateString('en-US', { weekday: 'short', timeZone: this.hostTz });
      void dow;
      if (localDow === 'Sat' || localDow === 'Sun') continue;
      for (const [h, m] of [[10, 0], [10, 30], [11, 0], [11, 30], [14, 0], [14, 30], [15, 0], [15, 30], [16, 0], [16, 30]]) {
        const s = zonedToUtc(key, h, m, this.hostTz);
        const e = new Date(s.getTime() + this.duration * 60_000);
        const startsAt = s.toISOString();
        if (booked.has(startsAt)) continue;
        out.push({ startsAt, endsAt: e.toISOString() });
      }
    }
    return out;
  }

  async book({ startsAt }) {
    if (this.db && (await confirmedBookingsBetween(this.db, startsAt, new Date(new Date(startsAt).getTime() + 1).toISOString())).length) {
      throw new ConflictError();
    }
    return { providerRef: `mock-${startsAt}` };
  }
}

/* ── Cal.com ──────────────────────────────────────────────────────────── */

export class CalComAdapter {
  constructor(env = {}, fetchImpl = fetch) {
    this.apiKey = env.CALCOM_API_KEY;
    this.eventTypeId = env.CALCOM_EVENT_TYPE_ID;
    this.base = (env.CALCOM_BASE_URL || 'https://api.cal.com').replace(/\/$/, '');
    this.fetch = fetchImpl;
    this.name = 'calcom';
    if (!this.apiKey || !this.eventTypeId) throw new Error('CALCOM_API_KEY and CALCOM_EVENT_TYPE_ID must be set when SCHEDULER=calcom');
  }

  headers(version) {
    return { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json', 'cal-api-version': version };
  }

  async ping() {
    try {
      const res = await this.fetch(`${this.base}/v2/me`, { headers: this.headers('2024-06-14') });
      return res.ok;
    } catch {
      return false;
    }
  }

  async slots({ from, to, tz }) {
    const url = new URL(`${this.base}/v2/slots`);
    url.searchParams.set('eventTypeId', String(this.eventTypeId));
    url.searchParams.set('start', `${from}T00:00:00Z`);
    url.searchParams.set('end', `${to}T00:00:00Z`);
    url.searchParams.set('timeZone', tz || 'UTC');
    const res = await this.fetch(url, { headers: this.headers('2024-09-04') });
    if (!res.ok) throw new Error(`Cal.com slots failed: ${res.status}`);
    const body = await res.json();
    // v2 returns { status, data: { "YYYY-MM-DD": [{ start: ISO, end?: ISO }, …] } }
    const days = body?.data || {};
    const out = [];
    for (const list of Object.values(days)) {
      for (const slot of list) {
        const startsAt = new Date(slot.start).toISOString();
        const endsAt = slot.end ? new Date(slot.end).toISOString() : null;
        out.push({ startsAt, endsAt });
      }
    }
    return out;
  }

  async book({ startsAt, lead, timezone, notes }) {
    const res = await this.fetch(`${this.base}/v2/bookings`, {
      method: 'POST',
      headers: this.headers('2024-08-13'),
      body: JSON.stringify({
        start: startsAt,
        eventTypeId: Number(this.eventTypeId),
        attendee: { name: lead.name, email: lead.email, timeZone: timezone || 'UTC', phoneNumber: lead.phone, language: 'en' },
        metadata: { leadId: lead.id, source: 'invest-page' },
        bookingFieldsResponses: notes ? { notes } : undefined,
      }),
    });
    if (res.status === 409 || res.status === 400) {
      const body = await res.json().catch(() => ({}));
      const msg = JSON.stringify(body).toLowerCase();
      if (res.status === 409 || msg.includes('not available') || msg.includes('already')) throw new ConflictError();
      throw new Error(`Cal.com booking rejected: ${res.status}`);
    }
    if (!res.ok) throw new Error(`Cal.com booking failed: ${res.status}`);
    const body = await res.json();
    return { providerRef: body?.data?.uid || body?.data?.id || null };
  }
}
