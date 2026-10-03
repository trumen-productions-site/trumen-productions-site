/**
 * POST /api/book — book a slot for a saved lead.
 * GET  /api/book?id=… — the booking's time and host, no personal data.
 *
 * A booking requires a lead that self-reported accredited (API-02). A slot
 * can be booked once: the application checks, the adapter checks, and the
 * database's partial unique index refuses a race (API-03). Conflicts answer
 * 409 so the island can refresh the calendar and say so plainly.
 */

import { json, badRequest, readBody, clientIp, serverError } from './_lib/http.js';
import { ipHash } from './_lib/crypto.js';
import { getLead, getBooking, confirmedBookingAt, insertBooking, insertEvent, rateLimit } from './_lib/db.js';
import { getScheduler, ConflictError } from './_lib/scheduler.js';
import { getMailer, investorConfirmation, producerBooked } from './_lib/email.js';
import { buildIcs } from './_lib/ics.js';
import { sendCapiEvent } from './_lib/capi.js';
import { settings } from './_lib/settings.js';
import { TIMEZONE } from '../../src/assets/js/invest/validators.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  const s = settings(env);
  try {
    const { data } = await readBody(request);
    if (!data) return badRequest({ body: 'Could not read the request.' });

    const hashed = await ipHash(clientIp(request), env.IP_SALT);
    const limit = await rateLimit(db, `book:${hashed}`, 20, 600);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429, { 'retry-after': '600' });

    const errors = {};
    if (!UUID.test(String(data.leadId || ''))) errors.leadId = 'leadId is required';
    const startsMs = Date.parse(data.startsAt || '');
    if (Number.isNaN(startsMs)) errors.startsAt = 'startsAt must be an ISO 8601 time';
    const timezone = data.timezone && TIMEZONE.test(String(data.timezone)) ? String(data.timezone) : null;
    if (Object.keys(errors).length) return badRequest(errors);

    const lead = await getLead(db, data.leadId);
    if (!lead) return json({ error: 'lead_not_found' }, 404);
    if (lead.accredited_self_report !== 'yes') return json({ error: 'not_eligible' }, 403);

    const startsAt = new Date(startsMs).toISOString();
    if (startsMs < Date.now() + s.leadTimeHours * 3_600_000) return json({ error: 'too_soon' }, 400);
    if (startsMs > Date.now() + s.horizonDays * 86_400_000) return json({ error: 'too_far' }, 400);
    const endsAt = new Date(startsMs + s.durationMinutes * 60_000).toISOString();

    if (await confirmedBookingAt(db, startsAt)) return json({ error: 'conflict' }, 409);

    const scheduler = getScheduler(env);
    let providerRef = null;
    try {
      ({ providerRef } = await scheduler.book({ startsAt, endsAt, lead, timezone: timezone || lead.timezone, notes: `Interest: ${lead.interest || '—'}; range: ${lead.amount_range || '—'}` }));
    } catch (err) {
      if (err instanceof ConflictError) return json({ error: 'conflict' }, 409);
      throw err;
    }

    let bookingId;
    try {
      bookingId = await insertBooking(db, { leadId: lead.id, provider: scheduler.name, providerRef, startsAt, endsAt });
    } catch (err) {
      // The unique index caught a race: two requests for the same slot.
      if (/UNIQUE|constraint/i.test(String(err.message))) return json({ error: 'conflict' }, 409);
      throw err;
    }
    if (timezone && timezone !== lead.timezone) await db.prepare(`UPDATE leads SET timezone = ? WHERE id = ?`).bind(timezone, lead.id).run();

    await insertEvent(db, { leadId: lead.id, sessionId: String(data.sessionId || 'unknown'), name: 'booked', props: { startsAt } });

    const booking = { id: bookingId, starts_at: startsAt, ends_at: endsAt, provider: scheduler.name, provider_ref: providerRef };
    const leadForMail = { ...lead, timezone: timezone || lead.timezone };
    const ics = buildIcs({
      uid: `${bookingId}@clearly-established`,
      startsAt,
      endsAt,
      summary: `Clearly Established — call with ${s.hostTitle}`,
      description: `${s.durationMinutes} minutes with ${s.hostTitle} about the CLEARLY ESTABLISHED private offering. Accredited investors only. Not an offer of securities.`,
      organizerName: s.hostName,
      organizerEmail: s.producerEmail,
      attendeeName: lead.name,
      attendeeEmail: lead.email,
      url: `${s.siteUrl}/invest/confirmed/?b=${bookingId}`,
    });
    const mailer = getMailer(env);
    await mailer.send({ to: lead.email, replyTo: s.producerEmail, ...investorConfirmation(leadForMail, booking, { ...s, icsText: ics }) });
    await mailer.send({ to: s.producerEmail, replyTo: lead.email, ...producerBooked(leadForMail, booking, { tz: s.hostTimezone }) });

    if (data.analyticsConsent === true) {
      context.waitUntil?.(sendCapiEvent(env, { eventName: 'Schedule', eventId: bookingId, email: lead.email, phone: lead.phone, ip: clientIp(request), userAgent: request.headers.get('user-agent'), sourceUrl: `${s.siteUrl}/invest/`, fbclid: lead.fbclid, fetchImpl: env.__fetch || fetch }));
    }

    return json({ bookingId, startsAt, endsAt, hostTitle: s.hostTitle, durationMinutes: s.durationMinutes }, 201);
  } catch (err) {
    return serverError(err, env);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = settings(env);
  try {
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!UUID.test(id)) return badRequest({ id: 'a booking id is required' });
    const b = await getBooking(env.DB, id);
    if (!b || b.status !== 'confirmed') return json({ error: 'not_found' }, 404);
    return json({ bookingId: b.id, startsAt: b.starts_at, endsAt: b.ends_at, hostTitle: s.hostTitle, durationMinutes: s.durationMinutes });
  } catch (err) {
    return serverError(err, env);
  }
}
