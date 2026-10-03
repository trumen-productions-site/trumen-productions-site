/**
 * /invest/confirmed/ — the booking confirmation.
 *
 * The page is static; the booking details come from /api/book?id=… and are
 * rendered by confirmed.js in the investor's own timezone, with a calendar
 * file to download. Without JavaScript the page still says what happened
 * and how to reach us.
 */

import { esc, each, mailto } from '../lib/html.mjs';
import { loadConfig } from '../invest/config/index.mjs';
import { header, footer, ribbon } from '../invest/sections.mjs';
import { icon } from '../invest/icons.mjs';

const cfg = loadConfig();
const { investSite, legal } = cfg;

const body = () => `
<section class="inv-section inv-confirm" aria-labelledby="confirm-title">
  <div class="inv-container inv-measure">
    <p class="eyebrow">Confirmed</p>
    <h1 class="inv-confirm__title" id="confirm-title" data-confirm-title>Your time is booked.</h1>
    <div class="inv-confirm__card" data-confirm-card>
      <p class="inv-confirm__when" data-confirm-when>${icon('calendar', { size: 22 })} <span>Loading your booking…</span></p>
      <p class="inv-confirm__who" data-confirm-who>${icon('clock', { size: 22 })} <span>${esc(String(investSite.booking.durationMinutes))} minutes with ${esc(investSite.booking.hostTitle)}</span></p>
      <p class="inv-confirm__tz" data-confirm-tz></p>
      <div class="btn-row">
        <a class="btn btn--primary" data-confirm-ics hidden>Add to your calendar<span class="btn__arrow" aria-hidden="true">→</span></a>
      </div>
    </div>
    <noscript>
      <p class="inv-flow__note">The booking details and calendar file need JavaScript to display here. They are also in the confirmation email we have just sent you.</p>
    </noscript>
    <h2 class="inv-subhead">What to have ready</h2>
    <ul class="inv-bullets">
      ${each(investSite.booking.prepare, (p) => `<li>${esc(p)}</li>`)}
    </ul>
    <p class="inv-flow__note">Need to change the time? Reply to the confirmation email, or write to <a href="${esc(mailto(investSite.contact.email, 'Rescheduling my call — Clearly Established'))}">${esc(investSite.contact.email)}</a>.</p>
    <p class="inv-flow__standing">${esc(legal.qualifierLong)} ${esc(legal.notAnOffer[0])}</p>
  </div>
</section>
`;

export default {
  path: '/invest/confirmed/',
  title: 'Your call is booked',
  description: 'Confirmation of a 30-minute call about the CLEARLY ESTABLISHED private offering. Accredited investors only.',
  robots: 'noindex, nofollow',
  invest: true, // ships dark: excluded from --site-only builds
  fonts: false, // no web-font download (HANDOFF.md § 15); the system serif and sans carry the page
  sitemap: false,
  chrome: false,
  bodyClass: 'inv',
  baseCss: false, // the build cuts site.css down to what these pages use
  css: ['/assets/css/invest-base.css', '/assets/css/invest.css'],
  js: [{ src: '/assets/js/invest/confirmed.js', module: true }],
  frame: {
    before: `${ribbon(cfg)}\n${header(cfg)}`,
    after: footer(cfg, { includeStructure: false }),
  },
  body,
};
