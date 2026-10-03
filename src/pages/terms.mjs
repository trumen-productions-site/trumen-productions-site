/**
 * /terms/ — SMS terms.
 *
 * Linked from the investor page only when features.sms is on, and required
 * by carriers before an A2P 10DLC campaign is approved. Draft for counsel.
 */

import { esc, mailto } from '../lib/html.mjs';
import { loadConfig } from '../invest/config/index.mjs';
import { header, footer, ribbon } from '../invest/sections.mjs';

const cfg = loadConfig();
const { investSite, legal } = cfg;

const body = () => `
<article class="inv-section inv-legal" aria-labelledby="terms-title">
  <div class="inv-container inv-measure">
    <p class="eyebrow">SMS Terms</p>
    <h1 class="inv-legal__title" id="terms-title">Text message terms</h1>
    <p class="inv-legal__meta">Applies to text messages about the CLEARLY ESTABLISHED private offering. Draft for counsel review.</p>

    <h2>The program</h2>
    <p>By checking the box on the questionnaire you agree to receive text messages from ${esc(investSite.entity.legalName)} about this offering — the call you booked, a reminder before it, and a reply if you text us. Consent is not a condition of any purchase or investment.</p>
    <p>The words you agreed to were: <q>${esc(legal.consents.sms)}</q></p>

    <h2>Frequency and cost</h2>
    <p>Message frequency varies and is low — expect a handful of messages around your call. Message and data rates may apply according to your mobile plan.</p>

    <h2>Stopping and help</h2>
    <p>Reply <strong>STOP</strong> to any message to opt out. You will receive one confirmation and nothing further. Reply <strong>HELP</strong> for help, or write to <a href="${esc(mailto(investSite.contact.email, 'SMS help — Clearly Established'))}">${esc(investSite.contact.email)}</a>.</p>

    <h2>Carriers</h2>
    <p>Carriers are not liable for delayed or undelivered messages.</p>

    <h2>Privacy</h2>
    <p>Your number is used only for this program and is handled as described in our <a href="/privacy/">privacy policy</a>. ${esc(legal.qualifierLong)}</p>
  </div>
</article>
`;

export default {
  path: '/terms/',
  title: 'SMS terms',
  description: 'Terms for text messages about the CLEARLY ESTABLISHED private offering: frequency, cost, and how to stop.',
  robots: 'noindex, nofollow',
  invest: true, // ships dark: excluded from --site-only builds
  fonts: false, // no web-font download (HANDOFF.md § 15); the system serif and sans carry the page
  sitemap: false,
  chrome: false,
  bodyClass: 'inv',
  baseCss: false, // the build cuts site.css down to what these pages use
  css: ['/assets/css/invest-base.css', '/assets/css/invest.css'],
  frame: {
    before: `${ribbon(cfg)}\n${header(cfg)}`,
    after: footer(cfg, { includeStructure: false }),
  },
  body,
};
