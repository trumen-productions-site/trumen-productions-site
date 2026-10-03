/**
 * /privacy/ — the privacy policy for the investor page.
 *
 * Draft for counsel review (gate G_COPY). It describes exactly what the
 * system in functions/ does and nothing it does not: the fields in
 * db/migrations/0001_init.sql, the vendors in docs/invest/RUNBOOK.md, and a
 * retention period that is pending counsel's decision.
 */

import { esc, each, mailto } from '../lib/html.mjs';
import { loadConfig } from '../invest/config/index.mjs';
import { header, footer, ribbon } from '../invest/sections.mjs';
import { val } from '../invest/lib/pending.mjs';

const cfg = loadConfig();
const { investSite, features, legal } = cfg;

const vendors = [
  { name: 'Cloudflare', role: 'hosts the page, runs the form handlers, stores the database, and screens the form for automated abuse (Turnstile).' },
  { name: 'Cal.com', role: 'provides the calendar availability and creates the booking on the host’s calendar.' },
  { name: 'Resend', role: 'sends the confirmation email to you and the notification to us.' },
  ...(features.sms ? [{ name: 'Twilio', role: 'sends text messages, only if you opted in.' }] : []),
  ...(features.metaPixel ? [{ name: 'Meta', role: 'receives two events — that a lead was saved and that a call was scheduled — only if you accepted analytics. Never the amount you are considering or your accredited status.' }] : []),
];

const body = () => `
<article class="inv-section inv-legal" aria-labelledby="privacy-title">
  <div class="inv-container inv-measure">
    <p class="eyebrow">Privacy</p>
    <h1 class="inv-legal__title" id="privacy-title">Privacy policy</h1>
    <p class="inv-legal__meta">Applies to the investor page at /invest and its forms. Draft for counsel review.</p>

    <h2>What we collect</h2>
    <p>When you complete the questionnaire we store: your name, email address and phone number; your answers to the questions about accredited status, the range you are considering and what matters most to you; the timezone you chose; the time you booked; and, if you gave it, your consent to text messages, together with the exact words you agreed to.</p>
    <p>We also record how you reached the page — the advertising parameters in the link you clicked (such as <code>utm_source</code> and <code>utm_campaign</code>), the page you landed on and the site that referred you — a one-way hash of your IP address (not the address itself), your browser’s user-agent string, and the version of this page you saw.</p>
    <p>We do not collect, and the questionnaire never asks for, your Social Security number, financial statements or any verification documents. If you proceed, accredited-investor verification is carried out separately by a third party, and none of it passes through this website.</p>

    <h2>Why</h2>
    <ul>
      <li>To hold the call you booked and to send you its details.</li>
      <li>To let the person taking the call prepare — your three answers are shown to them beforehand.</li>
      <li>To know which advertisement led to a conversation, so we spend less on the ones that don’t.</li>
      <li>To keep a record of what you were shown and what you agreed to, which the law governing private offerings requires of us.</li>
    </ul>

    <h2>Who else sees it</h2>
    <p>The service providers that run this page, each only for its own job:</p>
    <ul>
      ${each(vendors, (v) => `<li><strong>${esc(v.name)}</strong> ${esc(v.role)}</li>`)}
    </ul>
    <p>We do not sell your information, and we do not share it with anyone else except as the law requires.</p>

    <h2>Cookies and storage</h2>
    <p>The page sets no advertising or analytics cookies by default. Your progress through the questionnaire and the link parameters are kept in your browser’s session storage and are gone when you close the tab.${features.metaPixel ? ' If you accept analytics in the banner, a Meta Pixel is loaded and sets its own cookies; decline and it never loads.' : ''}</p>

    <h2>How long we keep it</h2>
    <p>${val(legal.retention, (r) => esc(r))}</p>

    <h2>Your choices</h2>
    <p>Write to <a href="${esc(mailto(investSite.contact.email, 'Privacy request — Clearly Established investor page'))}">${esc(investSite.contact.email)}</a> to see what we hold about you, to correct it, or to have it deleted. We will confirm within thirty days. If you opted in to text messages, reply STOP to any message to end them.</p>

    <h2>Who we are</h2>
    <p>${esc(investSite.entity.legalName)}, ${esc(investSite.entity.address)}.</p>
  </div>
</article>
`;

export default {
  path: '/privacy/',
  title: 'Privacy policy',
  description: 'How the CLEARLY ESTABLISHED investor page collects, uses and keeps the details you give it.',
  robots: 'noindex, nofollow',
  invest: true, // ships dark: excluded from --site-only builds
  fonts: false, // no web-font download (HANDOFF.md § 15); the system serif and sans carry the page
  sitemap: false,
  chrome: false,
  bodyClass: 'inv',
  css: ['/assets/css/invest.css'],
  frame: {
    before: `${ribbon(cfg)}\n${header(cfg)}`,
    after: footer(cfg, { includeStructure: false }),
  },
  body,
};
