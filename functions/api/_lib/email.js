/**
 * Email. Text-first templates and two senders behind one interface:
 * `ResendMailer` when RESEND_API_KEY is set, otherwise `LogMailer`, which
 * records what would have been sent (the tests read `env.__mail`).
 *
 * Templates never include offering terms beyond what the page shows, and
 * never include the amount range or accredited status in the investor's mail.
 */

export function getMailer(env) {
  return env.RESEND_API_KEY ? new ResendMailer(env) : new LogMailer(env);
}

export class LogMailer {
  constructor(env) {
    this.env = env;
    if (!Array.isArray(env.__mail)) env.__mail = [];
    this.name = 'log';
  }
  async send(message) {
    this.env.__mail.push(message);
    if (this.env.DEBUG === 'true') console.log(`[mail] to ${message.to}: ${message.subject}`);
    return { id: `log-${this.env.__mail.length}` };
  }
}

export class ResendMailer {
  constructor(env, fetchImpl = fetch) {
    this.key = env.RESEND_API_KEY;
    this.from = env.MAIL_FROM;
    this.fetch = fetchImpl;
    this.name = 'resend';
    if (!this.from) throw new Error('MAIL_FROM must be set when RESEND_API_KEY is set');
  }
  async send({ to, subject, text, replyTo, attachments }) {
    const res = await this.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject,
        text,
        reply_to: replyTo || undefined,
        attachments: attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64 })),
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text().catch(() => '')}`);
    return res.json();
  }
}

/* ── Templates ────────────────────────────────────────────────────────── */

const INTEREST_LABEL = { return: 'The return', story: 'The story', participation: 'Being part of the production' };

function when(iso, tz) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d);
  return `${date} at ${time}`;
}

export function producerNewLead(lead, { siteUrl }) {
  return {
    subject: `New investor lead — ${lead.name}`,
    text: [
      `A new lead saved their details on the investor page.`,
      ``,
      `Name:      ${lead.name}`,
      `Email:     ${lead.email}`,
      `Phone:     ${lead.phone}`,
      `Accredited (self-reported): ${lead.accredited_self_report}`,
      `Range:     ${lead.amount_range || '—'}`,
      `Interest:  ${INTEREST_LABEL[lead.interest] || '—'}`,
      `Timezone:  ${lead.timezone || '—'}`,
      `Channel:   ${lead.channel}`,
      `Source:    ${[lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content].filter(Boolean).join(' / ') || 'direct'}`,
      `Page build: ${lead.page_version}`,
      `Lead id:   ${lead.id}`,
      ``,
      lead.channel === 'nojs' ? `This lead came through the plain form, so no call is booked. Reply with times to choose from.` : `They are picking a time now. You will get a second note when the booking lands.`,
      ``,
      `${siteUrl}/invest/`,
    ].join('\n'),
  };
}

export function producerLeadWithoutBooking(lead, { minutes }) {
  return {
    subject: `Lead without booking — ${lead.name}`,
    text: [
      `${lead.name} saved their details ${minutes} minutes ago and has not picked a time.`,
      ``,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone}`,
      `Range: ${lead.amount_range || '—'} · Interest: ${INTEREST_LABEL[lead.interest] || '—'}`,
      `Lead id: ${lead.id}`,
      ``,
      `No automated follow-up has gone to them. A personal note from you is the next step, if you want one.`,
    ].join('\n'),
  };
}

export function producerBooked(lead, booking, { tz }) {
  return {
    subject: `Booked — ${lead.name}, ${when(booking.starts_at, tz)}`,
    text: [
      `${lead.name} booked a call.`,
      ``,
      `When:  ${when(booking.starts_at, tz)} (your time)`,
      `Theirs: ${when(booking.starts_at, lead.timezone || tz)} (${lead.timezone || tz})`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone}`,
      `Range: ${lead.amount_range || '—'} · Interest: ${INTEREST_LABEL[lead.interest] || '—'}`,
      `Provider: ${booking.provider}${booking.provider_ref ? ` (${booking.provider_ref})` : ''}`,
      `Lead id: ${lead.id} · Booking id: ${booking.id}`,
    ].join('\n'),
  };
}

export function investorConfirmation(lead, booking, { hostTitle, durationMinutes, siteUrl, contactEmail, prepare, notAnOffer, icsText }) {
  const tz = lead.timezone || 'America/New_York';
  return {
    subject: `Your call is booked — ${when(booking.starts_at, tz)}`,
    text: [
      `${lead.name.split(' ')[0]},`,
      ``,
      `Your ${durationMinutes}-minute call with ${hostTitle} about CLEARLY ESTABLISHED is booked for:`,
      ``,
      `    ${when(booking.starts_at, tz)}`,
      `    (shown in ${tz.replace(/_/g, ' ')}; the attached calendar file carries the exact time)`,
      ``,
      `What to have ready:`,
      ...prepare.map((p) => `  • ${p}`),
      ``,
      `Need to change the time? Reply to this email, or write to ${contactEmail}.`,
      ``,
      `Your confirmation page: ${siteUrl}/invest/confirmed/?b=${booking.id}`,
      ``,
      `—`,
      `Accredited investors only. Not an offer of securities.`,
      notAnOffer,
      ``,
      `Revelatory Productions, LLC · 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710`,
    ].join('\n'),
    attachments: icsText ? [{ filename: 'clearly-established-call.ics', contentBase64: toBase64(icsText) }] : undefined,
  };
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
