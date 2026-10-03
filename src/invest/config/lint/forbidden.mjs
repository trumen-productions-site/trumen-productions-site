/**
 * Forbidden strings and patterns for the investor page (test LINT-01).
 *
 * Checked against the built HTML of every investor page and against every
 * file in src/invest/config. Each entry carries the reason it is here, so a
 * future editor who trips it knows whether to reword or to argue.
 *
 * Scope: the investor pages only. The company site has its own content
 * contract in test/content.test.mjs and legitimately mentions some of the
 * names below (the slate, the FAQ). This page is single-purpose and names
 * nothing but itself.
 */

export const forbidden = [
  // ── Hype and promises ───────────────────────────────────────────────
  { pattern: /\bguarantee[sd]?\b/i, reason: 'promises outcomes', exceptFiles: ['legal.mjs'] },
  { pattern: /risk[- ]free/i, reason: 'promises outcomes' },
  { pattern: /can['’]t lose/i, reason: 'promises outcomes' },
  { pattern: /sure thing/i, reason: 'promises outcomes' },
  { pattern: /safe investment/i, reason: 'promises outcomes' },
  { pattern: /passive income/i, reason: 'tax framing — only with G_TAX', gate: 'G_TAX' },

  // ── Brand ───────────────────────────────────────────────────────────
  { pattern: /TRU\*MEN/, reason: 'the mark takes the star glyph, never an asterisk' },
  { pattern: /TRUMAN Productions/i, reason: 'misspelling of the mark' },
  { pattern: /A South Carolina production house/i, reason: 'superseded tagline' },

  // ── Removed or superseded ───────────────────────────────────────────
  { pattern: /Lisa Davis/, reason: 'superseded counsel reference' },
  { pattern: /Frankfurt Kurnit/, reason: 'superseded counsel reference' },
  { pattern: /Swanson Plantation/, reason: 'removed from the canon' },
  { pattern: /sixty[- ]plus days/i, reason: 'superseded figure' },
  { pattern: /\bLoyd\b/, reason: 'superseded spelling' },
  { pattern: /Eve Stacey/, reason: 'removed entirely' },
  { pattern: /Summerville/, reason: 'superseded frame' },
  { pattern: /\bnineteen\b/i, reason: 'superseded age — he was twenty-six' },

  // ── Out of scope: no commingling, no partner names ──────────────────
  ...[
    'Green Plan',
    'Danny Boy',
    'MACRO',
    'Mansa',
    'Allen Media',
    'BuzzFeed',
    'muVpix',
    'Tyler Perry',
    'Maxscene',
    'M88',
    'ALLBLK',
    'theGrio',
    'ReelShort',
    'DramaBox',
    'MyDrama',
    'Innocent Citizen',
    'ICRA',
    'Liberty Argument',
    'Estelusti',
    'Ancestry',
    'VistaJet',
    'Flexjet',
  ].map((s) => ({ pattern: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), reason: 'out of scope for this page' })),
];

/**
 * Proper names allowed on the page. Any other two-word capitalised name in
 * the rendered copy fails the build, so a new name is always added on
 * purpose. Place names and terms of art that look like names are listed too.
 */
export const allowedNames = [
  // People
  'Michael Anthony Martin',
  'David Alexander Martin',
  'Michael Martin',
  'David Martin',
  'Michael and David Martin',
  'Alexa Whiteside', // renders only with features.counselDisplay
  // Places, courts, entities, titles
  'South Carolina',
  'Supreme Court',
  'Carolina Supreme Court',
  'Lake Wylie',
  'Charlotte Hwy',
  'Revelatory Productions',
  'Clearly Established',
  'Cadillac',
  'Executive Producer',
  'Privacy Policy',
  'SMS Terms',
  'Regulation D',
  'Rule 506',
  'Rule 501',
  'Form D',
  'Block One',
  'Episodes',
  'United States',
  'Eastern Time',
  'Social Security',
  'Op. No.',
  'State v. Martin',
  'Pending', // the token text
  'Staging',
  'Message',
  'Reply STOP',
  'Series 7',
  'Series 65',
  'Series 82',
  'Entertainment Law',
  'WAM Entertainment Law',
  'Vertical',
  'Viri Veri',
  'Productions Viri Veri', // the lockup reads "TRU★MEN Productions · Viri Veri"
  'Productions',
  'Georgia', // the typeface, in CSS comments only
  'Cal.com',
  'Cloudflare',
  'Turnstile',
  'Resend',
  'Meta',
];

/**
 * Canon facts (test CANON-01): if these subjects appear, they appear exactly.
 * Each entry is a regex that matches any phrasing of the subject, and the
 * exact string it must be.
 */
export const canon = [
  { subject: 'arrest year', loose: /arrested[^.]{0,40}?\b(19\d\d)\b/i, exact: '1996' },
  { subject: 'age at arrest', loose: /\b(twenty-\w+|nineteen|thirty-\w+)-year-old\b/i, exact: 'twenty-six' },
  { subject: 'conviction year', loose: /convicted[^.]{0,20}?\b(19\d\d)\b/i, exact: '1997' },
  { subject: 'time served', loose: /served (\w+ years? and \w+ months?)/i, exact: 'three years and eleven months' },
  { subject: 'reversal date', loose: /reversed[^.]{0,60}?on ((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})/i, exact: 'March 27, 2000' },
  { subject: 'refiling date', loose: /refiled[^.]{0,60}?on ((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})/i, exact: 'June 12, 2000' },
  { subject: 'remittitur date', loose: /remittitur of ((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})/i, exact: 'June 28, 2000' },
  { subject: 'opinion number', loose: /Op\. No\. (\d+)/, exact: '25093' },
  { subject: 'the vote', loose: /\b(unanimous|divided|split|majority)\b (?:South Carolina )?Supreme Court/i, exact: 'unanimous' },
  { subject: 'the two filings', loose: /refiled (\w+(?:-\w+)? days) later/i, exact: 'seventy-seven days' },
  { subject: 'the over-detention', loose: /held him (\w+(?:-\w+)? days) past/i, exact: 'ninety-three days' },
];

export default forbidden;
