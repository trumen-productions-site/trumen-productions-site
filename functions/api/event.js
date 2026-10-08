/**
 * POST /api/event — the server-side event log (HANDOFF.md § 12).
 * The source of truth for the funnel. Names are allow-listed; props are
 * capped; everything is keyed by the browser's session id.
 */

import { json, badRequest, readBody, clientIp, serverError } from './_lib/http.js';
import { ipHash } from './_lib/crypto.js';
import { insertEvent, rateLimit } from './_lib/db.js';

export const EVENT_NAMES = ['page_view', 'cta_click', 'flow_step', 'lead_saved', 'slot_view', 'calendar_view', 'booked', 'not_accredited_end', 'consent'];

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { data } = await readBody(request);
    if (!data) return badRequest({ body: 'Could not read the request.' });
    const name = String(data.name || '');
    const sessionId = String(data.sessionId || '').slice(0, 64);
    if (!EVENT_NAMES.includes(name)) return badRequest({ name: 'unknown event' });
    if (sessionId.length < 8) return badRequest({ sessionId: 'required' });

    const hashed = await ipHash(clientIp(request), env.IP_SALT);
    const limit = await rateLimit(env.DB, `event:${hashed}`, 240, 600);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429);

    let props = null;
    if (data.props && typeof data.props === 'object') {
      const text = JSON.stringify(data.props);
      props = text.length > 1000 ? { truncated: true } : data.props;
    }
    await insertEvent(env.DB, { sessionId, name, props: { ...(props || {}), pageVersion: String(data.pageVersion || '').slice(0, 40) } });
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return serverError(err, env);
  }
}
