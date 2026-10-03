/**
 * The story as it appears on the investor page.
 *
 * Two approved variants of the logline. Variant A is the conservative
 * default; variant B adds the Court's own characterisation and may only be
 * used once `approvedBy` is filled in. No official, judge, prosecutor,
 * officer or lawyer is named anywhere in this file, and no other person's
 * case is mentioned — test LINT-01 enforces the allowlist.
 *
 * ── A note on the day counts ─────────────────────────────────────────────
 * HANDOFF.md phrases the detention as "seventy-seven days past the Court's
 * order". This repository's locked record (site.config.mjs → facts;
 * four-rules-reels/src/canon.py, locked by Michael on September 5, 2026)
 * derives two numbers from the dates in the case file: seventy-seven days
 * between the two filings of the opinion (March 27 → June 12, 2000) and
 * ninety-three days from the opinion to the remittitur of June 28, 2000 —
 * the over-detention. The existing site tests refuse "seventy-seven days
 * past". The copy below states both numbers for what each one is, and the
 * question is carried into docs/invest/COUNSEL_REVIEW.md for Michael to
 * settle. See docs/invest/DECISIONS.md § D-04.
 */

export const story = {
  /** Which variant renders. 'A_conservative' | 'B_canon'. */
  variant: 'A_conservative',

  variants: [
    {
      id: 'A_conservative',
      logline:
        'In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina. In 1997 he was ' +
        'convicted. He served three years and eleven months before a unanimous South Carolina Supreme Court ' +
        'reversed the conviction on March 27, 2000. Then the opinion that freed him was withdrawn and refiled ' +
        'seventy-seven days later, on June 12, 2000, with language removed — while the State held him ' +
        'ninety-three days past the Court’s order, until the remittitur of June 28, 2000.',
    },
    {
      id: 'B_canon',
      logline:
        'In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina. In 1997 he was ' +
        'convicted. He served three years and eleven months before a unanimous South Carolina Supreme Court ' +
        'reversed the conviction on March 27, 2000. The Court said it should have been impossible to convict ' +
        'him. Then the opinion that freed him was withdrawn and refiled seventy-seven days later, on ' +
        'June 12, 2000, with language removed — while the State held him ninety-three days past the ' +
        'Court’s order, until the remittitur of June 28, 2000.',
      approvedBy: undefined,
      approvedOn: undefined,
    },
  ],

  /** Section heading. */
  heading: 'The case',

  /**
   * "Why this travels" — three bullets. The vertical-viewing bullet is only
   * shown when the production is the vertical series, and carries no market
   * statistic: any statistic here would need a sourceUrl (HANDOFF.md § 9.4).
   */
  bullets: [
    {
      title: 'A true story with a public record.',
      body: 'Opinion No. 25093 is on file. The story stands on documents anyone can read.',
    },
    {
      title: 'Built for the phone first.',
      body: 'Written for vertical viewing, where serialized drama is finding its audience.',
      onlyFor: 'vertical-series',
    },
    {
      title: 'Written by the people who lived it.',
      body: 'Michael Anthony Martin and David Alexander Martin.',
    },
  ],

  /** The dated timeline beneath the logline. Each date is from the case file. */
  timeline: [
    { date: '1996', label: 'Arrested, at twenty-six' },
    { date: '1997', label: 'Convicted' },
    { date: 'March 27, 2000', label: 'Reversed — unanimously. Op. No. 25093' },
    { date: 'June 12, 2000', label: 'Opinion withdrawn and refiled, language deleted' },
    { date: 'June 28, 2000', label: 'Remittitur — ninety-three days after the order that freed him' },
  ],
};

export default story;
