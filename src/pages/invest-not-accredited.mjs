/**
 * /invest/not-accredited/ — where the no-JavaScript form lands when the
 * answer to the first question was "no, or not sure". The same respectful
 * end screen the island shows: no offering details, no upsell.
 */

import { esc } from '../lib/html.mjs';
import { loadConfig } from '../invest/config/index.mjs';
import { header, footer, ribbon } from '../invest/sections.mjs';

const cfg = loadConfig();
const { legal } = cfg;

const body = () => `
<section class="inv-section inv-confirm" aria-labelledby="na-title">
  <div class="inv-container inv-measure">
    <p class="eyebrow">Thank you</p>
    <h1 class="inv-confirm__title" id="na-title">${esc(legal.flowLines.endScreen)}</h1>
    <p class="inv-flow__standing">${esc(legal.qualifierLong)} ${esc(legal.notAnOffer[0])}</p>
  </div>
</section>
`;

export default {
  path: '/invest/not-accredited/',
  title: 'Thank you',
  description: 'This offering is limited by law to accredited investors. Thank you for your interest in Clearly Established.',
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
