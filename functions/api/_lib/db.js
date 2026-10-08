/**
 * Database access. Every query the routes run lives here, against the
 * schema in db/migrations/0001_init.sql, so the SQL is in one place and
 * the tests run it against the same migration through tools/d1-sqlite.mjs.
 */

import { uuid, sha256Hex } from './crypto.js';
import { nowIso } from './http.js';

export async function insertLead(db, lead) {
  const id = uuid();
  const created = nowIso();
  await db
    .prepare(
      `INSERT INTO leads (id, created_at, accredited_self_report, amount_range, interest, name, email, phone, timezone, status,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id, fbclid, landing_path, referrer,
        ip_hash, user_agent, page_version, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      created,
      lead.accredited,
      lead.amountRange ?? null,
      lead.interest ?? null,
      lead.name,
      lead.email,
      lead.phone,
      lead.timezone ?? null,
      lead.accredited === 'yes' ? 'new' : 'declined',
      lead.touch?.utm_source ?? null,
      lead.touch?.utm_medium ?? null,
      lead.touch?.utm_campaign ?? null,
      lead.touch?.utm_content ?? null,
      lead.touch?.utm_term ?? null,
      lead.touch?.utm_id ?? null,
      lead.touch?.fbclid ?? null,
      lead.touch?.landing_path ?? null,
      lead.touch?.referrer ?? null,
      lead.ipHash ?? null,
      lead.userAgent ?? null,
      lead.pageVersion,
      lead.channel ?? 'flow',
    )
    .run();
  return { id, created_at: created };
}

export async function insertConsent(db, { leadId, kind, granted, textShown }) {
  const id = uuid();
  await db
    .prepare(`INSERT INTO consents (id, lead_id, kind, granted, text_shown, text_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, leadId, kind, granted ? 1 : 0, textShown, await sha256Hex(textShown), nowIso())
    .run();
  return id;
}

export function getLead(db, id) {
  return db.prepare(`SELECT * FROM leads WHERE id = ?`).bind(id).first();
}

export function getConsents(db, leadId) {
  return db
    .prepare(`SELECT * FROM consents WHERE lead_id = ? ORDER BY created_at`)
    .bind(leadId)
    .all()
    .then((r) => r.results);
}

export function confirmedBookingAt(db, startsAt) {
  return db.prepare(`SELECT id FROM bookings WHERE starts_at = ? AND status = 'confirmed'`).bind(startsAt).first();
}

export function confirmedBookingsBetween(db, from, to) {
  return db
    .prepare(`SELECT starts_at FROM bookings WHERE status = 'confirmed' AND starts_at >= ? AND starts_at < ?`)
    .bind(from, to)
    .all()
    .then((r) => r.results.map((x) => x.starts_at));
}

export async function insertBooking(db, { leadId, provider, providerRef, startsAt, endsAt }) {
  const id = uuid();
  await db
    .prepare(`INSERT INTO bookings (id, lead_id, provider, provider_ref, starts_at, ends_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`)
    .bind(id, leadId, provider, providerRef ?? null, startsAt, endsAt, nowIso())
    .run();
  await db.prepare(`UPDATE leads SET status = 'booked' WHERE id = ?`).bind(leadId).run();
  return id;
}

export function getBooking(db, id) {
  return db.prepare(`SELECT * FROM bookings WHERE id = ?`).bind(id).first();
}

export async function insertEvent(db, { leadId = null, sessionId, name, props = null }) {
  await db
    .prepare(`INSERT INTO events (id, lead_id, session_id, name, props, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(uuid(), leadId, sessionId, name, props ? JSON.stringify(props).slice(0, 2000) : null, nowIso())
    .run();
}

/**
 * Fixed-window rate limit. Returns true when the request is allowed.
 * One row per (route, caller) key; the window restarts when it has aged out.
 */
export async function rateLimit(db, key, max, windowSeconds, now = Date.now()) {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const row = await db.prepare(`SELECT window_start, count FROM ratelimit WHERE key = ?`).bind(key).first();
  if (!row || row.window_start !== windowStart) {
    await db.prepare(`INSERT OR REPLACE INTO ratelimit (key, window_start, count) VALUES (?, ?, 1)`).bind(key, windowStart).run();
    return { allowed: true, remaining: max - 1 };
  }
  if (row.count >= max) return { allowed: false, remaining: 0 };
  await db.prepare(`UPDATE ratelimit SET count = count + 1 WHERE key = ?`).bind(key).run();
  return { allowed: true, remaining: max - row.count - 1 };
}

/** Leads saved more than `minutes` ago with no booking and no notice yet. */
export function abandonedLeads(db, minutes, now = Date.now()) {
  const cutoff = new Date(now - minutes * 60_000).toISOString();
  return db
    .prepare(
      `SELECT l.* FROM leads l
       WHERE l.status = 'new' AND l.accredited_self_report = 'yes' AND l.abandon_notified_at IS NULL AND l.created_at <= ?
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = l.id AND b.status = 'confirmed')
       ORDER BY l.created_at LIMIT 50`,
    )
    .bind(cutoff)
    .all()
    .then((r) => r.results);
}

export function markAbandonNotified(db, leadId) {
  return db.prepare(`UPDATE leads SET abandon_notified_at = ? WHERE id = ?`).bind(nowIso(), leadId).run();
}

export async function insertFollow(db, { email, textShown, ipHash }) {
  const id = uuid();
  await db
    .prepare(`INSERT INTO follow_list (id, email, text_shown, text_hash, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, email, textShown, await sha256Hex(textShown), nowIso(), ipHash ?? null)
    .run();
  return id;
}
