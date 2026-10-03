/**
 * /invest/received/ — where the no-JavaScript form lands.
 *
 * The fallback form on /invest/ posts straight to /api/lead; the API answers
 * a form post with a redirect here. Nothing on this page needs a script.
 */

import { esc, mailto } from '../lib/html.mjs';
import { loadConfig } from '../invest/config/index.mjs';
import { header, footer, ribbon } from '../invest/sections.mjs';

const cfg = loadConfig();
const { investSite, legal } = cfg;

const body = () => `
<section class="inv-section inv-confirm" aria-labelledby="received-title">
  <div class="inv-container inv-measure">
    <p class="eyebrow">Received</p>
    <h1 class="inv-confirm__title" id="received-title">We have your details.</h1>
    <p class="inv-logline">We will reply by email within one business day with times to choose from for a ${esc(String(investSite.booking.durationMinutes))}-minute call with ${esc(investSite.booking.hostTitle)}.</p>
    <p class="inv-flow__note">If you would rather not wait, write to <a href="${esc(mailto(investSite.contact.email, investSite.contact.subject))}">${esc(investSite.contact.email)}</a>.</p>
    <p class="inv-flow__standing">${esc(legal.qualifierLong)} ${esc(legal.notAnOffer[0])} ${esc(legal.flowLines.notSubscription)}</p>
  </div>
</section>
`;

export default {
  path: '/invest/received/',
  title: 'We have your details',
  description: 'Your details have been received. We will reply by email with times for a call. Accredited investors only.',
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
