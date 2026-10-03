/**
 * /invest/ — the CLEARLY ESTABLISHED investor page.
 *
 * A single-purpose landing page for paid social: cold accredited investor
 * in, booked 30-minute call out. It has its own header and footer (no site
 * navigation, nothing from any other project), is never indexed, and ships
 * dark until the launch gates in src/invest/config/gates.json are signed.
 * See HANDOFF.md and docs/invest/.
 */

import { loadConfig } from '../invest/config/index.mjs';
import { investBody, header, footer, ribbon, stickyCta } from '../invest/sections.mjs';

const cfg = loadConfig();

export default {
  path: '/invest/',
  title: cfg.investSite.meta.title,
  description: cfg.investSite.meta.description,
  robots: 'noindex, nofollow',
  invest: true, // ships dark: excluded from --site-only builds
  fonts: false, // no web-font download (HANDOFF.md § 15); the system serif and sans carry the page
  sitemap: false,
  chrome: false,
  bodyClass: 'inv',
  baseCss: false, // the build cuts site.css down to what these pages use
  css: ['/assets/css/invest-base.css', '/assets/css/invest.css'],
  js: [{ src: '/assets/js/invest/flow.js', module: true }],
  // The island's import graph, declared up front so the browser fetches it in one round trip.
  preload: ['machine', 'validators', 'utm'].map((m) => ({ href: `/assets/js/invest/${m}.js`, as: 'module' })),
  ogImage: {
    src: '/assets/img/invest-keyart.png',
    width: 1200,
    height: 630,
    alt: 'Invest in Clearly Established — a private offering from TRU★MEN Productions',
  },
  frame: {
    before: `${ribbon(cfg)}\n${header(cfg, { questionnaire: true })}`,
    after: `${footer(cfg)}\n${stickyCta()}`,
  },
  body: () => investBody(cfg),
};
