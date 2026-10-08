/**
 * POST /api/lead — save a lead (HANDOFF.md § 11.2).
 *
 * Accepts JSON from the flow island or a form post from the no-JavaScript
 * fallback. Validates with the same validators the browser uses, checks
 * Turnstile (island) or the honeypot and a tighter rate limit (fallback),
 * writes the lead and its consents, logs the event, notifies the producer,
 * and answers with the lead id — or a redirect for the form.
 */

import { validateLead } from '../../src/assets/js/invest/validators.js';
import { json, badRequest, readBody, clientIp, redirect, serverError } from './_lib/http.js';
import { ipHash } from './_lib/crypto.js';
import { insertLead, insertConsent, insertEvent, rateLimit } from './_lib/db.js';
import { verifyTurnstile } from './_lib/turnstile.js';
import { getMailer, producerNewLead } from './_lib/email.js';
import { sendCapiEvent } from './_lib/capi.js';
import { settings } from './_lib/settings.js';

const TOUCH_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'landing_path', 'referrer'];

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  const s = settings(env);
  try {
    const { data, form } = await readBody(request);
    if (!data) return badRequest({ body: 'Could not read the request.' });

    const ip = clientIp(request);
    const hashed = await ipHash(ip, env.IP_SALT);

    // Rate limit: the island gets 10 per 10 minutes per address; the plain
    // form, which cannot carry a Turnstile token, gets 3 per hour.
    const limit = form ? await rateLimit(db, `lead:nojs:${hashed}`, 3, 3600) : await rateLimit(db, `lead:${hashed}`, 10, 600);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429, { 'retry-after': '600' });

    // The fallback form's honeypot: a filled "website" field is a bot. Say
    // yes, store nothing.
    if (form && data.website) return redirect('/invest/received/');

    const v = validateLead({
      ...data,
      smsConsent: data.smsConsent,
    });
    if (!v.ok) return form ? redirect('/invest/#start') : badRequest(v.errors);

    if (!form) {
      const ts = await verifyTurnstile({ token: data.turnstileToken, ip, env, fetchImpl: env.__fetch || fetch });
      if (!ts.ok) return badRequest({ turnstile: ts.reason });
    }

    // Not accredited: nothing to do with the details, so we keep none.
    if (v.value.accredited !== 'yes') {
      await insertEvent(db, { sessionId: String(data.sessionId || 'nojs'), name: 'not_accredited_end', props: { channel: form ? 'nojs' : 'flow' } });
      return form ? redirect('/invest/not-accredited/') : json({ ok: true, declined: true });
    }

    const touch = {};
    const src = data.touch && typeof data.touch === 'object' ? data.touch : data;
    for (const k of TOUCH_KEYS) if (src[k]) touch[k] = String(src[k]).slice(0, 500);

    const pageVersion = String(data.pageVersion || data.page_version || 'unknown').slice(0, 40);
    const lead = await insertLead(db, {
      ...v.value,
      touch,
      ipHash: hashed,
      userAgent: (request.headers.get('user-agent') || '').slice(0, 300),
      pageVersion,
      channel: form ? 'nojs' : 'flow',
    });

    if (s.smsEnabled && data.smsConsentText) {
      await insertConsent(db, { leadId: lead.id, kind: 'sms', granted: v.value.smsConsent, textShown: String(data.smsConsentText) });
    }
    if (data.analyticsConsent !== undefined && data.analyticsConsentText) {
      await insertConsent(db, { leadId: lead.id, kind: 'analytics', granted: Boolean(data.analyticsConsent), textShown: String(data.analyticsConsentText) });
    }

    await insertEvent(db, { leadId: lead.id, sessionId: String(data.sessionId || 'nojs'), name: 'lead_saved', props: { channel: form ? 'nojs' : 'flow' } });

    const row = { id: lead.id, ...v.value, accredited_self_report: v.value.accredited, amount_range: v.value.amountRange, page_version: pageVersion, channel: form ? 'nojs' : 'flow', ...touch };
    const mail = producerNewLead(row, { siteUrl: s.siteUrl });
    await getMailer(env).send({ to: s.producerEmail, replyTo: v.value.email, ...mail });

    if (data.analyticsConsent === true) {
      context.waitUntil?.(sendCapiEvent(env, { eventName: 'Lead', eventId: lead.id, email: v.value.email, phone: v.value.phone, ip, userAgent: request.headers.get('user-agent'), sourceUrl: `${s.siteUrl}/invest/`, fbclid: touch.fbclid, fetchImpl: env.__fetch || fetch }));
    }

    return form ? redirect('/invest/received/') : json({ leadId: lead.id }, 201);
  } catch (err) {
    return serverError(err, env);
  }
}

export function onRequestGet() {
  return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
}
