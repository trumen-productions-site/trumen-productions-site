/**
 * POST /api/follow — the optional "tell me if this opens up" address from
 * the not-accredited end screen. Refused unless FEATURE_FOLLOW_LIST is on,
 * matching features.followList in the page config.
 */

import { validateEmail } from '../../src/assets/js/invest/validators.js';
import { json, badRequest, readBody, clientIp, serverError } from './_lib/http.js';
import { ipHash } from './_lib/crypto.js';
import { insertFollow, rateLimit } from './_lib/db.js';
import { settings } from './_lib/settings.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const s = settings(env);
  try {
    if (!s.followListEnabled) return json({ error: 'disabled' }, 404);
    const { data } = await readBody(request);
    if (!data) return badRequest({ body: 'Could not read the request.' });
    const email = validateEmail(data.email);
    if (!email.ok) return badRequest({ email: email.error });
    if (!data.consentText || String(data.consentText).length < 10) return badRequest({ consentText: 'required' });
    const hashed = await ipHash(clientIp(request), env.IP_SALT);
    const limit = await rateLimit(env.DB, `follow:${hashed}`, 5, 3600);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429);
    await insertFollow(env.DB, { email: email.value, textShown: String(data.consentText), ipHash: hashed });
    return json({ ok: true }, 201);
  } catch (err) {
    return serverError(err, env);
  }
}
