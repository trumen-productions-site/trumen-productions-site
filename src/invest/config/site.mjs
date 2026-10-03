/**
 * Investor-page site settings: domain, contact, entity names, booking host.
 *
 * The company identity is inherited from src/site.config.mjs so the brand
 * can never fork. Only the things specific to the offering live here.
 */

import { site as company } from '../../site.config.mjs';
import { pending } from '../lib/pending.mjs';

export const investSite = {
  /** Production domain. Until decided, canonicals use the company site's URL. */
  domain: pending('production domain — owner'),

  /**
   * Public contact address. HANDOFF.md: michaelmartin@greenplanit.org for
   * notices until the revelatoryproductions.com mailbox is restored, so no
   * other company's domain appears on the page a moment longer than it must.
   */
  contact: {
    email: 'michaelmartin@greenplanit.org',
    subject: 'Clearly Established — investor inquiry',
  },

  entity: {
    legalName: company.legalEntity,
    brand: company.name,
    address: '4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710',
  },

  /** Who takes the calls, and the calendar they land on. */
  booking: {
    host: pending('booking host — who takes the calls and which calendar'),
    hostTitle: 'the producer',
    durationMinutes: 30,
    /** What to have ready, shown on the confirmation page and in the email. */
    prepare: [
      'Any questions about the production, the terms or the timeline.',
      'A sense of the range you are considering — nothing is decided on the call.',
      'Nothing to sign and nothing to bring. Verification, if you proceed, happens afterwards through a third party.',
    ],
  },

  /**
   * Cloudflare Turnstile. The site key is public. The value below is
   * Cloudflare's "always passes" test key, so staging works without an
   * account; the production build refuses it (see config/index.mjs).
   */
  turnstile: {
    siteKey: '1x00000000000000000000AA',
  },

  /** Page metadata. */
  meta: {
    title: 'Invest in CLEARLY ESTABLISHED',
    description:
      'A private offering for accredited investors financing a CLEARLY ESTABLISHED production — a true story ' +
      'drawn from State v. Martin, written and produced by the man it happened to.',
  },

  /** The UTM parameters captured on first touch. */
  utmKeys: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'],
};

export default investSite;
