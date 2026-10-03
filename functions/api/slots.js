/**
 * GET /api/slots?from=YYYY-MM-DD&to=YYYY-MM-DD&tz=Area/City
 *
 * Availability from the scheduler adapter, trimmed to the booking window
 * (not before the lead time, not past the horizon), cached for 60 seconds.
 */

import { json, badRequest, clientIp, serverError } from './_lib/http.js';
import { ipHash } from './_lib/crypto.js';
import { rateLimit } from './_lib/db.js';
import { getScheduler } from './_lib/scheduler.js';
import { settings } from './_lib/settings.js';
import { TIMEZONE } from '../../src/assets/js/invest/validators.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = settings(env);
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const tz = url.searchParams.get('tz') || 'UTC';
    const errors = {};
    if (!DATE.test(from || '') || Number.isNaN(Date.parse(from))) errors.from = 'from must be YYYY-MM-DD';
    if (!DATE.test(to || '') || Number.isNaN(Date.parse(to))) errors.to = 'to must be YYYY-MM-DD';
    if (!TIMEZONE.test(tz)) errors.tz = 'tz must be an IANA zone';
    if (Object.keys(errors).length) return badRequest(errors);
    const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (span <= 0 || span > 62) return badRequest({ to: 'the range must be 1–62 days' });

    const hashed = await ipHash(clientIp(request), env.IP_SALT);
    const limit = await rateLimit(env.DB, `slots:${hashed}`, 60, 600);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429, { 'retry-after': '600' });

    const now = Date.now();
    const earliest = now + s.leadTimeHours * 3_600_000;
    const latest = now + s.horizonDays * 86_400_000;

    const scheduler = getScheduler(env);
    const raw = await scheduler.slots({ from, to, tz });
    const slots = raw
      .map((x) => ({ startsAt: x.startsAt, endsAt: x.endsAt || new Date(Date.parse(x.startsAt) + s.durationMinutes * 60_000).toISOString() }))
      .filter((x) => {
        const t = Date.parse(x.startsAt);
        return t >= earliest && t <= latest;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    return json({ slots, tz, durationMinutes: s.durationMinutes, provider: scheduler.name }, 200, { 'cache-control': 'private, max-age=60' });
  } catch (err) {
    return serverError(err, env);
  }
}
