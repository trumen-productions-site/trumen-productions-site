/**
 * Feature flags for the investor page.
 *
 * Every flag defaults to the conservative setting from HANDOFF.md § 3 and § 8.
 * Turning one on is a deliberate act with a counsel gate behind it — see
 * docs/invest/COMPLIANCE.md for what each flag unlocks and who signs for it.
 */
export const features = Object.freeze({
  /** Tax card and tax tile. Requires gate G_TAX and signed wording in legal.tax. */
  taxSection: false,
  /** Text-only casting comparables, labelled "not attached". Never photos. */
  castingComps: false,
  /** Optional email field on the not-accredited end screen. On hold pending counsel. */
  followList: false,
  /** SMS opt-in checkbox and the /terms page link. Needs a registered A2P 10DLC campaign. */
  sms: false,
  /** Meta Pixel + Conversions API, behind the consent banner. */
  metaPixel: false,
  /** Name counsel on the page. Requires her written consent. */
  counselDisplay: false,
  /**
   * The comparables section. Off until `comps` in config/comps.mjs holds at
   * least three entries with a reachable source and a `verifiedOn` date —
   * `npm run check:sources` is how candidates earn their place.
   */
  comps: false,
  /** The marketing-plan section. */
  marketing: true,
});

export default features;
