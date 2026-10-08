/**
 * Legal text: footnotes, disclaimers, the offering-structure paragraph, the
 * accredited-investor helper, consent texts.
 *
 * All of it is DRAFT for counsel review (gate G_COPY; G_SECURITIES for the
 * offering structure and verification sentences; G_TAX for anything in
 * `tax`). The word "guarantee" may appear in this file and nowhere else —
 * test LINT-01 enforces that.
 */

import { pending } from '../lib/pending.mjs';

export const legal = {
  /**
   * Footnotes, keyed by id. The footnote engine numbers them by first
   * appearance and prints each one inside the section that used it.
   */
  footnotes: {
    minimum:
      'Minimum subscription per investor. The issuer may accept a smaller amount at its sole discretion. ' +
      'Terms are set out in full in the offering documents.',
    waterfall:
      'Describes the order of distributions after expenses and reserves, as set out in the operating agreement ' +
      'of the issuer. Distributions are not assured; there may be none.',
    raise:
      'The maximum amount the issuer intends to accept. The offering may close below this amount, and the ' +
      'production budget would be adjusted accordingly.',
    target:
      'A target, not a forecast. Based on the written model on file with the issuer, which rests on ' +
      'assumptions that may not hold. Actual results may differ materially, and you may lose your entire investment.',
    tax:
      'Tax treatment depends on your individual circumstances and on current law, which may change. ' +
      'Nothing here is tax advice. Consult your own adviser.',
    format:
      'Eleven scripted episodes of a serialized drama written for vertical, phone-first viewing. ' +
      'Episode count and running times are subject to the final production schedule.',
  },

  /**
   * The offering-structure paragraph, one sentence per fact. Each renders
   * only when the matching config value is decided and true.
   */
  structure: {
    exemption506c:
      'Interests are offered under Rule 506(c) of Regulation D, which permits general solicitation and limits ' +
      'sales to accredited investors whose status has been verified.',
    verification:
      'Accredited status is verified before any subscription is accepted, by a third-party verifier or by ' +
      'review of documentation, as described in the offering documents.',
    escrow:
      'Subscription funds are held in escrow until the minimum offering amount is reached and the closing conditions are met.',
    collectionAccount:
      'Revenues from the production are paid into a third-party collection account and distributed under a ' +
      'collection account management agreement.',
  },

  /** The "not an offer" block. Always rendered, always in full. */
  notAnOffer: [
    'This page is for information only. It is not an offer to sell or a solicitation of an offer to buy any ' +
      'security. Offers are made only through definitive offering documents, and only to investors whose ' +
      'accredited status has been verified.',
    'Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and ' +
      'are not a promise of performance. Nothing here is a guarantee of any outcome.',
    'Investing in a film or television production is speculative and involves a high degree of risk, including ' +
      'the loss of your entire investment. Most independent productions do not return their budgets. Tax ' +
      'outcomes vary by investor and by jurisdiction.',
  ],

  /** The risk sentence. Test REQ-01 requires the phrase "lose some or all". */
  risk:
    'This is a high-risk investment. You could lose some or all of your money. Most independent productions ' +
    'do not return their budgets. Full risk factors are in the offering documents.',

  /** The story notice in the footer. */
  storyNotice:
    'Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.',

  /** Header and hero qualifier. Test REQ-01 requires both. */
  qualifier: 'Accredited investors only.',
  qualifierLong: 'Accredited investors only. Not an offer of securities.',

  /**
   * Helper text under step 1 of the flow — the general tests, in plain
   * language. Counsel to confirm the wording against the current definition.
   */
  accreditedHelp: [
    'Income over $200,000 in each of the last two years ($300,000 with a spouse or partner), with the same expected this year; or',
    'Net worth over $1,000,000, alone or with a spouse or partner, not counting your primary residence; or',
    'Certain professional licences in good standing (Series 7, 65 or 82), or an entity that meets its own tests.',
  ],
  accreditedHelpNote:
    'These are the general tests. The full definition is in Rule 501(a) of Regulation D; your status is verified ' +
    'before any subscription is accepted.',

  /** How accredited status is verified — the FAQ answer. */
  verification: pending('accredited-verification method and the third-party verifier — securities counsel'),

  /** Consent texts. The exact words shown are stored with each consent (API-04). */
  consents: {
    sms:
      'Yes, text me about this offering at the number above. Message and data rates may apply. Message frequency ' +
      'varies. Reply STOP to opt out at any time and HELP for help. Consent is not a condition of any purchase. ' +
      'See our SMS Terms and Privacy Policy.',
    analytics:
      'Allow analytics cookies so we can see which of our advertisements lead to conversations. We never share ' +
      'what you tell us in the questionnaire.',
    followList:
      'Email me if this offering, or a future one, becomes open to non-accredited investors. One address, no ' +
      'marketing, unsubscribe in one click.',
  },

  /**
   * Tax wording. Null until a CPA or tax counsel signs the exact text (gate
   * G_TAX). The tax card and tile read only from here.
   */
  tax: null,

  /** How long leads and consents are kept — counsel's decision (HANDOFF.md Appendix C.8). */
  retention: pending('record retention period for leads and consents — counsel'),

  /** Standing lines in the flow. */
  flowLines: {
    notConfirmed: 'Not confirmed yet. Your time is held only once you pick it.',
    notSubscription: 'This questionnaire is not a subscription agreement and commits you to nothing.',
    endScreen: 'Thank you. This offering is limited by law to accredited investors, so we can’t share more here.',
  },
};

export default legal;
