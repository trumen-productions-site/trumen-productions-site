/**
 * GET /api/cron/abandoned — the "lead without booking" sweep.
 *
 * A lead saved at step 4 with no booking after ABANDON_MINUTES (30) earns
 * the producer one notice. Pages Functions have no scheduler of their own,
 * so this endpoint is called by a Worker cron trigger or any external cron
 * (docs/invest/RUNBOOK.md), authenticated with CRON_SECRET. Idempotent: a
 * lead is notified once.
 */

import { json } from './../_lib/http.js';
import { abandonedLeads, markAbandonNotified } from './../_lib/db.js';
import { getMailer, producerLeadWithoutBooking } from './../_lib/email.js';
import { settings } from './../_lib/settings.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const s = settings(env);
  const auth = request.headers.get('authorization') || '';
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) return json({ error: 'unauthorized' }, 401);
  const leads = await abandonedLeads(env.DB, s.abandonMinutes);
  const mailer = getMailer(env);
  let notified = 0;
  for (const lead of leads) {
    const minutes = Math.round((Date.now() - Date.parse(lead.created_at)) / 60_000);
    await mailer.send({ to: s.producerEmail, replyTo: lead.email, ...producerLeadWithoutBooking(lead, { minutes }) });
    await markAbandonNotified(env.DB, lead.id);
    notified++;
  }
  return json({ ok: true, notified });
}
