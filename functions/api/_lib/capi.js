/**
 * Meta Conversions API (HANDOFF.md § 12).
 *
 * Fires only when the pixel feature is configured server-side
 * (META_PIXEL_ID and META_CAPI_TOKEN) AND the visitor accepted analytics.
 * Sends `Lead` and `Schedule` only, with hashed email and phone as the
 * matching keys. Never the amount range, never accredited status.
 */

import { capiHash } from './crypto.js';

export async function sendCapiEvent(env, { eventName, eventId, email, phone, ip, userAgent, sourceUrl, fbclid, fetchImpl = fetch }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { skipped: 'unconfigured' };
  if (!['Lead', 'Schedule'].includes(eventName)) return { skipped: 'event_not_allowed' };
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: {
          em: email ? [await capiHash(email)] : undefined,
          ph: phone ? [await capiHash(phone.replace(/\D/g, ''))] : undefined,
          client_ip_address: ip,
          client_user_agent: userAgent,
          fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined,
        },
      },
    ],
  };
  try {
    const res = await fetchImpl(`https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
