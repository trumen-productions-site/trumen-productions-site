/**
 * VIRI★VERI Productions — site configuration.
 *
 * This is the single source of truth for everything that is not page prose:
 * the company identity, contact routing, navigation, and the verified facts
 * that appear in more than one place.
 *
 * ── EDITING ──────────────────────────────────────────────────────────────
 * Change a value here and it changes everywhere it appears. You do not need
 * to touch any other file to update contact details, the site URL, or the
 * headline numbers. See docs/editing.md.
 *
 * ── ⚠ PLACEHOLDERS TO REPLACE BEFORE LAUNCH ──────────────────────────────
 * Every value below marked TODO is a placeholder. `npm test` fails loudly
 * while any of them remain, so the site cannot ship with fake contact
 * details by accident. Search this file for "TODO:" to find them all.
 */

export const site = {
  // ── Identity ───────────────────────────────────────────────────────────
  // The pivot of October 7, 2026 (per counsel): the motto becomes the name.
  // Written VIRI VERI Productions in text; the lockup (the supplied SVG with
  // the faceted star between the words) wherever the mark is shown.
  name: 'VIRI VERI Productions',
  nameParts: { before: 'VIRI', after: 'VERI' }, // the star is drawn, not typed
  namePlain: 'Viri Veri Productions',
  legalEntity: 'Revelatory Productions, LLC',
  legalLine:
    'Revelatory Productions, LLC, doing business as VIRI VERI Productions. ' +
    'VIRI VERI and the star mark are trademarks of Revelatory Productions, LLC; registration pending.',
  motto: 'Viri Veri',
  mottoTranslation: 'Men of truth',
  tagline: 'We tell true stories that hold up — in court, on the page, and on screen.',
  founders: 'Michael A. Martin & David A. Martin',
  foundedLine: 'Founded by brothers David and Michael Martin.',
  founded: '2026',

  // The address the site is served from. Baked into every canonical URL, the
  // sitemap, and the link preview that unfurls when someone shares the site.
  //
  // Provisional: a free Netlify subdomain, claimed at deploy time. When a real
  // domain is registered, change this one line, rebuild, and redeploy — nothing
  // else in the project refers to the domain.
  url: 'https://viri-veri-productions.netlify.app',

  // A short description used for <meta name="description"> fallbacks,
  // Open Graph, and structured data.
  description:
    'VIRI VERI Productions is a family film and publishing company founded by brothers ' +
    'Michael and David Martin. We tell true stories that hold up — in court, on the ' +
    'page, and on screen. Featured project: Clearly Established.',

  locale: 'en_US',
  lang: 'en',

  // ── Contact routing ────────────────────────────────────────────────────
  // Forms are mailto: links — no backend, no third-party service, no data
  // leaves the visitor's own mail client. Each inquiry type gets its own
  // address so mail can be filtered on arrival.
  contact: {
    // All four route to one monitored inbox for now. The four subject lines
    // below still sort the mail, so this can be split into separate addresses
    // later — on a domain, or as Gmail "+" aliases — without touching a page.
    general: 'greenplanit1@gmail.com',
    rights: 'greenplanit1@gmail.com',
    financing: 'greenplanit1@gmail.com',
    press: 'greenplanit1@gmail.com',
    // Set to a string to show a phone line; null hides it entirely.
    phone: null,
    // Set to a string to show a postal address; null hides it entirely.
    mailingAddress: null,
  },

  // Subject lines are prefilled so inbound mail is self-sorting.
  subjects: {
    general: 'Inquiry via the VIRI VERI Productions website',
    rights: 'Rights & representation inquiry — Clearly Established',
    financing: 'Financing / production partnership inquiry — Clearly Established',
    press: 'Press inquiry — VIRI VERI Productions',
    newsletter: 'Subscribe me to VIRI VERI updates',
  },

  // ── Social ─────────────────────────────────────────────────────────────
  // Omit or set to null to hide. Nothing is rendered for an empty list.
  social: [
    // TODO: add real profiles, e.g.
    // { label: 'Instagram', href: 'https://instagram.com/viriveriproductions' },
  ],

  // ── Navigation ─────────────────────────────────────────────────────────
  nav: [
    { label: 'Clearly Established', href: '/clearly-established/' },
    { label: 'Our Story', href: '/our-story/' },
    { label: 'Projects', href: '/projects/' },
    { label: 'Values', href: '/values/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Contact', href: '/contact/' },
  ],

  footerNav: [
    {
      heading: 'The work',
      links: [
        { label: 'Clearly Established', href: '/clearly-established/' },
        { label: 'The pitch', href: '/clearly-established/pitch/' },
        { label: 'All projects', href: '/projects/' },
        { label: 'Provocation · Prevarication · Revocation', href: '/our-story/#the-spine' },
      ],
    },
    {
      heading: 'The company',
      links: [
        { label: 'Our story', href: '/our-story/' },
        { label: 'Meet the brothers', href: '/our-story/#the-brothers' },
        { label: 'Values', href: '/values/' },
        { label: 'FAQs', href: '/faq/' },
      ],
    },
    {
      heading: 'Connect',
      links: [
        { label: 'Contact', href: '/contact/' },
        { label: 'Rights & representation', href: '/contact/#rights' },
        { label: 'Financing & production', href: '/contact/#financing' },
        { label: 'Press', href: '/contact/#press' },
      ],
    },
  ],
};

/**
 * The verified record.
 *
 * These are the load-bearing facts. They appear on several pages and in the
 * animated pitch, so they live here once. Each carries its source so a
 * reader — or a lawyer — can trace it.
 *
 * ⚠ VERIFICATION NOTE: entries marked `verify: true` were supplied by the
 * authors and have not been independently confirmed against a primary
 * document by this build. `npm test` reports them as a checklist rather than
 * a failure. Confirm them against the transcript or the filed opinion before
 * the site goes public. See docs/editing.md § Facts and verification.
 */
export const facts = {
  arrested: { value: '1996', label: 'Arrested', detail: 'Pickens County, South Carolina, at twenty-six.' },
  convicted: { value: '1997', label: 'Convicted', detail: 'Sentenced to natural life without parole.' },
  reversed: {
    value: 'March 27, 2000',
    label: 'Reversed — unanimously',
    detail: 'Supreme Court of South Carolina, Opinion No. 25093.',
  },
  refiled: {
    value: 'June 12, 2000',
    label: 'Withdrawn and refiled',
    detail: 'The same opinion, seventy-seven days later, with the language explaining his innocence deleted.',
  },
  remittitur: {
    value: 'June 28, 2000',
    label: 'Remittitur issued',
    detail: 'The Supreme Court returns the case to the trial court — ninety-three days after the opinion that freed him.',
  },
  incarcerated: { value: '3 yrs 11 mos', label: 'Incarcerated', detail: 'Three years and eleven months.' },
  overDetention: {
    value: '93 days',
    label: 'Held past what the law allowed',
    detail:
      'Ninety-three days of over-detention — from the opinion of March 27, 2000 that freed him to the remittitur of June 28, 2000 that finally returned the case to the trial court.',
  },
  opinion: { value: 'Op. No. 25093', label: 'State v. Martin', detail: 'Supreme Court of South Carolina.' },
  memoirWords: { value: '~99,000', label: 'Words, memoir', detail: 'Manuscript complete.' },
  seriesEpisodes: { value: '80', label: 'Episodes, vertical series', detail: 'Built for the phone screen.' },
  acres: {
    value: '860',
    label: "Acres, Neriah Fennell's land",
    detail: 'Recovery, Decatur County, Georgia — taken without lawful basis.',
  },
};

/** Quotations reproduced on the site, with attribution and verification state. */
export const quotes = {
  prosecutor: {
    text: 'We will probably never know which one of these defendants actually did the killing.',
    attribution: 'Deputy Solicitor Mark Moyer, in open court',
    // `source` is printed beneath the attribution; `note` is the verification trail.
    source: 'Closing argument. Record on Appeal, p. 349, lines 10–14.',
    note:
      'Quoted with the citation in the Final Brief of Appellant (Argument III). The transcript ' +
      'names the speaker “Mr. Moyer” (ROA p. 356); his acceptance of service of the Notice of ' +
      'Intent to Appeal, November 5, 1997, in the Supreme Court case file, gives L. Mark Moyer, ' +
      'Deputy Solicitor, Pickens County. The memoir refers to him by a pseudonym; Michael ' +
      'confirmed on September 5, 2026 that the site names him.',
    verify: false,
  },
  judge: {
    text: 'You don’t know if either one of them did.',
    attribution: 'Judge Henry Floyd',
    source: 'To the solicitor, on the renewed motion for a directed verdict. Record on Appeal, p. 358, lines 9–15.',
    note:
      'Quoted with the citation in the Final Brief of Appellant (Argument III). An earlier draft ' +
      'of the site had “either of them”; the record says “either one of them”.',
    verify: false,
  },
  court: {
    text:
      'The State’s evidence does not place either defendant in the apartment. … it is impossible ' +
      'to hold the individual defendants collectively guilty of [the] murder under the legal ' +
      'theories used by the State since neither conspiracy nor accomplice liability were charged ' +
      'to the jury.',
    attribution: 'Supreme Court of South Carolina, Opinion No. 25093',
    source:
      'The opinion as filed March 27, 2000. The first sentence was “modified” and the second ' +
      'was among the paragraphs “deleted” by the order of June 12, 2000.',
    note:
      'From the original opinion in the Supreme Court case file (Toal, A.J.; Finney, C.J., ' +
      'Moore, Waller and Burnett, JJ., concurring). The June 12 order: “The third paragraph of ' +
      'the Law/Analysis section in the initial opinion has been modified. Furthermore, the last ' +
      'three paragraphs of that section have been deleted.” The refiled opinion keeps the ' +
      'solicitor’s admissions and drops the Court’s conclusion from them. “[the] murder” stands ' +
      'for “Victim’s murder”.',
    verify: false,
  },
  directors: {
    text:
      'We want to make a film that never raises its voice — because the injustice at its ' +
      'center never did either.',
    attribution: 'Michael & David Martin',
    source: 'Director’s statement.',
    verify: false,
  },
};

export default site;
