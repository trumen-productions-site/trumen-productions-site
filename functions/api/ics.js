/**
 * GET /api/ics?id=… — the calendar file for a booking.
 * Carries the time and the host; no personal data beyond what the
 * requester's own confirmation already holds.
 */

import { json, badRequest, serverError } from './_lib/http.js';
import { getBooking } from './_lib/db.js';
import { buildIcs } from './_lib/ics.js';
import { settings } from './_lib/settings.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = settings(env);
  try {
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!UUID.test(id)) return badRequest({ id: 'a booking id is required' });
    const b = await getBooking(env.DB, id);
    if (!b || b.status !== 'confirmed') return json({ error: 'not_found' }, 404);
    const ics = buildIcs({
      uid: `${b.id}@clearly-established`,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      summary: `Clearly Established — call with ${s.hostTitle}`,
      description: `${s.durationMinutes} minutes with ${s.hostTitle} about the CLEARLY ESTABLISHED private offering. Accredited investors only. Not an offer of securities.`,
      organizerName: s.hostName,
      organizerEmail: s.producerEmail,
      url: `${s.siteUrl}/invest/confirmed/?b=${b.id}`,
    });
    return new Response(ics, {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="clearly-established-call.ics"',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return serverError(err, env);
  }
}
