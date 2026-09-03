/**
 * The slate — one story, every format it deserves.
 *
 * `status` drives the badge on the projects page. Use one of:
 *   'complete' · 'in-development' · 'in-progress' · 'seeking-partner'
 */

export const statusLabels = {
  complete: 'Complete',
  'in-development': 'In development',
  'in-progress': 'In progress',
  'seeking-partner': 'Seeking partner',
};

export const projects = [
  {
    id: 'memoir',
    kind: 'Book · Memoir',
    title: 'Clearly Established',
    subtitle: 'A memoir',
    byline: 'Michael A. Martin & David A. Martin',
    status: 'complete',
    statusDetail: 'Manuscript complete',
    beat: 'provocation',
    summary:
      'The record of his innocence, erased. The first-person account of a conviction the ' +
      'State admitted it could not prove, a unanimous reversal, and the deletion that ' +
      'followed it.',
    body: [
      'Clearly Established is the memoir of what happened — the conviction, the unanimous ' +
        'reversal, and the erasure that followed — told by the man it happened to and the ' +
        'brother who watched, and backed, line by line, by the record.',
      'It belongs on the shelf with the genre’s defining first-person accounts of wrongful ' +
        'conviction. Its second act is something the category has never seen: not just a man ' +
        'cleared, but the official record of his innocence erased.',
    ],
    facts: [
      ['Length', '~99,000 words'],
      ['Category', 'Wrongful-conviction & social-justice memoir'],
      ['Rights', 'Held by the authors'],
    ],
    href: '/clearly-established/',
    linkLabel: 'The full story',
  },
  {
    id: 'legal-volume',
    kind: 'Book · Companion legal volume',
    title: 'The Liberty Argument',
    subtitle: 'A companion legal volume',
    byline: 'Michael A. Martin & David A. Martin',
    status: 'in-progress',
    statusDetail: 'In progress',
    beat: 'revocation',
    summary:
      'The argument beneath both stories: what a right is worth when the record that ' +
      'establishes it can be revised, and what is owed when land is taken with no lawful basis.',
    body: [
      'Where the memoir tells, the legal volume shows its work. The Liberty Argument sets ' +
        'out the doctrine — qualified immunity, the “clearly established” standard, and the ' +
        'machinery by which an institution protects itself — and then applies it to two ' +
        'documented dispossessions in one family.',
      'It also sets out the case of the 860 acres: land Neriah Fennell acquired after ' +
        'emancipation and lost to an act of racial terrorism, whose paper trail the family ' +
        'has kept for seven generations.',
    ],
    facts: [
      ['Category', 'Legal / civil rights'],
      ['Companion to', 'Clearly Established'],
      ['Rights', 'Held by the authors'],
    ],
    href: '/projects/#legal-volume',
    linkLabel: null,
  },
  {
    id: 'feature',
    kind: 'Film · Feature screenplay',
    title: 'Clearly Established',
    subtitle: 'A feature film',
    byline: 'Written by Michael & David Martin · Adapted from the memoir',
    status: 'seeking-partner',
    statusDetail: 'Completed screenplay · Life rights held by the authors',
    beat: 'provocation',
    summary:
      'A locked, performance-led drama braiding two true timelines thirty years apart to ' +
      'show the same machinery at work: protecting the institution, editing the record.',
    body: [
      'A contained drama — courtroom, law office, home, prison visitation, Lowcountry ' +
        'exteriors — carried by an awards-caliber lead role and one extraordinary true story.',
      'The screenplay is finished. We are seeking a financing partner, a production home, ' +
        'and a lead attachment.',
    ],
    facts: [
      ['Format', 'Feature film'],
      ['Status', 'Completed screenplay'],
      ['Seeking', 'Financing · Production home · Lead attachment'],
    ],
    href: '/clearly-established/',
    linkLabel: 'The pitch',
  },
  {
    id: 'series',
    kind: 'Series · Vertical drama',
    title: 'Clearly Established',
    subtitle: 'An eighty-episode vertical series',
    byline: 'Created by Michael & David Martin',
    status: 'in-development',
    statusDetail: '80 episodes mapped',
    beat: 'provocation',
    summary:
      'The same true story, architected for the phone screen: eighty episodes of one to two ' +
      'minutes, each ending where you cannot put it down.',
    body: [
      'Vertical drama has become the fastest-growing category in entertainment, and it has ' +
        'been built almost entirely on invented premises. Clearly Established brings the ' +
        'thing the format has never had at scale: a documented true story, a living ' +
        'author-subject, and a public court record behind every turn.',
      'Eighty episodes, structured to the format’s converting length, with the rights ' +
        'architecture kept clean — a licensed debut window, never the underlying rights.',
    ],
    facts: [
      ['Format', 'Vertical series'],
      ['Length', '80 episodes'],
      ['Rights', 'Licence a window; underlying rights retained'],
    ],
    href: '/projects/#series',
    linkLabel: null,
  },
  {
    id: 'documentary',
    kind: 'Documentary · Feature',
    title: 'Estelusti',
    subtitle: 'What They Outlived',
    byline: 'A TRU★MEN Productions documentary',
    status: 'in-development',
    statusDetail: 'In development',
    beat: 'revocation',
    summary:
      'The revocation of Neriah Fennell’s 860 acres — and what seven generations of one ' +
      'family outlived in order to keep the record of it.',
    body: [
      'Estelusti follows the third beat: land acquired after emancipation, taken through an ' +
        'act of racial terrorism with no lawful basis, and a family that kept the ' +
        'documentation for seven generations because no one else would.',
      'It is the companion on film to The Liberty Argument, and the proof that the pattern ' +
        'in Michael Martin’s case did not begin with Michael Martin.',
    ],
    facts: [
      ['Format', 'Feature documentary'],
      ['Subject', 'Recovery, Decatur County, Georgia'],
      ['Companion to', 'The Liberty Argument'],
    ],
    href: '/projects/#documentary',
    linkLabel: null,
  },
];

/** The four-up "what we make" summary used on the homepage. */
export const formats = [
  {
    title: 'Books',
    body: 'The memoir and its companion legal volume, The Liberty Argument.',
    href: '/projects/#memoir',
  },
  {
    title: 'Film',
    body: 'A locked feature screenplay adapted from the memoir.',
    href: '/projects/#feature',
  },
  {
    title: 'Series',
    body: 'An eighty-episode vertical drama built for the phone screen.',
    href: '/projects/#series',
  },
  {
    title: 'Documentary',
    body: 'Estelusti: What They Outlived — the revocation of Neriah Fennell’s 860 acres, and what seven generations outlived.',
    href: '/projects/#documentary',
  },
];
