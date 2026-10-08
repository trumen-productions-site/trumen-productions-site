/**
 * The offering — terms, stat tiles, use of funds.
 *
 * Everything here that is not yet decided is a `pending(...)`. Nothing in
 * this file is an assumption: a Pending renders as a visible token on staging
 * and fails the production build. See HANDOFF.md § 5 for the owner decisions
 * and docs/invest/COUNSEL_REVIEW.md for the printable checklist.
 *
 * Numbers are numbers (dollars, percentages) and are formatted at render time
 * by src/invest/lib/format.mjs, so "$25,000" and "$25K" never disagree.
 */

import { pending } from '../lib/pending.mjs';

export const offering = {
  /**
   * Which production the raise finances. One production per page.
   * The default placeholder from the brief: Block One of the vertical series.
   * Alternatives: the feature, or a limited series. Owner decision.
   */
  production: {
    title: 'Clearly Established',
    format: 'vertical-series',
    descriptor: 'an eleven-episode first block of a vertical drama series',
    formatLabel: 'Vertical series · Episodes 1–11',
    shootLocation: 'South Carolina',
    // Decided value reads in the hero as "{shootWindow}, South Carolina." — e.g. 'Shooting spring 2027'.
    shootWindow: pending('shoot window'),
  },

  /** The single-purpose LLC that issues the interests. Not yet formed. */
  issuer: pending('issuer legal name and state of formation — securities counsel'),

  /** The sponsor. `brandCleared` flips when gate G_DBA is signed. */
  sponsor: {
    legalName: 'Revelatory Productions, LLC',
    brand: 'VIRI VERI Productions',
    brandCleared: false,
  },

  /**
   * The exemption relied on. Page copy assumes 506(c). `506(b)` hard-fails
   * the production build: it does not permit general solicitation, and this
   * page exists to be advertised.
   */
  exemption: pending('exemption — securities counsel (page copy assumes Rule 506(c))'),

  totalRaise: pending('total raise'),
  minimum: pending('minimum investment — interacts with the verification method'),

  /** Recoupment: what percentage goes to investors first, then the split. */
  waterfall: pending('waterfall — investor-first recoupment % and the profit split after it'),

  /**
   * Optional. The tile is hidden unless `basisDocOnFile` is true and a
   * written model is on file. Leave undefined to hide the tile entirely.
   */
  targetReturn: undefined,

  escrow: pending('whether subscription funds are escrowed'),
  collectionAccount: pending('whether a third-party collection account is used'),

  /** Must sum to 100 (test CFG-03). */
  useOfFunds: pending('use-of-funds allocation — must sum to 100%'),

  /**
   * The stat strip, in display order. A tile renders only when `show` is
   * true and its `requires` condition is met. Each tile's footnote must exist
   * in legal.footnotes (test FN-02).
   */
  tiles: [
    { id: 'minimum', label: 'Minimum investment', value: 'minimum', footnoteId: 'minimum', show: true },
    { id: 'payback', label: 'Investor-first payback', value: 'waterfall', footnoteId: 'waterfall', show: true },
    { id: 'raise', label: 'Total raise', value: 'totalRaise', footnoteId: 'raise', show: true },
    {
      id: 'target',
      label: 'Target return',
      value: 'targetReturn',
      footnoteId: 'target',
      requires: 'targetReturnBasis',
      show: true,
    },
    { id: 'tax', label: 'Tax treatment', value: 'tax', footnoteId: 'tax', requires: 'G_TAX', show: true },
    { id: 'format', label: 'Production', value: 'format', footnoteId: 'format', show: true },
  ],
};

export default offering;
