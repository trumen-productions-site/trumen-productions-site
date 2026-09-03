/**
 * The company: the three-beat spine, the four values, the brothers, and the
 * short news log. Prose lives here so a non-developer can edit it without
 * reading a line of markup.
 */

/**
 * The spine of the work — Provocation, Prevarication, Revocation.
 * Everything TRU★MEN makes sits on one of these three beats.
 */
export const spine = [
  {
    id: 'provocation',
    number: '01',
    word: 'Provocation',
    subtitle: 'The case. 1996–2000.',
    etymology: null,
    body: [
      'A man arrested at twenty-six, convicted in 1997, and held three years and eleven ' +
        'months — more than sixty documented days of it past what the law allowed — before ' +
        'the Supreme Court of South Carolina reversed the conviction. Unanimously.',
      'This is the story the memoir tells and the screenplay dramatizes.',
    ],
    stat: { value: '3 yrs 11 mos', label: 'Incarcerated' },
    cite: 'State v. Martin, Op. No. 25093',
    formats: ['Memoir', 'Feature', 'Series'],
  },
  {
    id: 'prevarication',
    number: '02',
    word: 'Prevarication',
    subtitle: 'The erasure. June 12, 2000.',
    etymology:
      'pre·var·i·ca·tion — from the Latin praevaricari, “to walk crookedly”: to depart ' +
      'deliberately from the truth; to speak so as to mislead.',
    body: [
      'The prevarication did not come at the start of the case. It came after the end. On ' +
        'March 27, 2000, the Supreme Court of South Carolina reversed the conviction ' +
        'unanimously. On June 12, 2000, that opinion was withdrawn and refiled — with ' +
        'language deleted. The reversal stood. The words that explained it did not.',
      'That is the crooked walk: not a falsehood told to a court, but words taken out of its ' +
        'own record. The memoir names it. The record, as first written, answers it.',
    ],
    stat: { value: 'June 12, 2000', label: 'Opinion withdrawn and refiled' },
    cite: 'Language deleted',
    formats: ['Memoir', 'Legal volume'],
  },
  {
    id: 'revocation',
    number: '03',
    word: 'Revocation',
    subtitle: 'The land. Recovery, Decatur County, Georgia.',
    etymology: null,
    body: [
      'After emancipation, Neriah Fennell acquired 860 acres. The land was taken from his ' +
        'family through an act of racial terrorism — a dispossession with no lawful basis, ' +
        'whose record the family has kept for seven generations.',
      'This is the story The Liberty Argument sets out and Estelusti follows on film.',
    ],
    stat: { value: '860', label: "Acres, Neriah Fennell's land" },
    cite: 'Taken unlawfully',
    formats: ['Legal volume', 'Documentary'],
  },
];

/** The four core values. Latin name, English name, and the promise beneath it. */
export const values = [
  {
    id: 'veritas',
    latin: 'Veritas',
    english: 'Truth',
    summary: 'We say what happened, as the record shows it happened. If we cannot source it, we do not say it.',
    body: [
      'Every project we make begins with a document, not an idea. The memoir began with a ' +
        'court file. The legal volume began with a deed. When the record is silent, we say ' +
        'the record is silent — we do not fill the gap with something more dramatic.',
      'That discipline costs us scenes. It is the reason the work will survive being ' +
        'checked.',
    ],
  },
  {
    id: 'testimonium',
    latin: 'Testimonium',
    english: 'Record',
    summary:
      'Every claim in the memoir, the legal volume, and the scripts traces to a document. The citations are the work.',
    body: [
      'A story about an erased record cannot itself be loose with the record. We keep the ' +
        'citation attached to the sentence, all the way through drafting, so that nothing ' +
        'reaches a reader that we could not hand a lawyer.',
      'Where a source is contested or a memory is unverified, we mark it as such rather ' +
        'than quietly promoting it to fact.',
    ],
  },
  {
    id: 'fraternitas',
    latin: 'Fraternitas',
    english: 'Brotherhood',
    summary: 'Two brothers, fifty-fifty, one name on the chain of title. No decision is made without the other.',
    body: [
      'One of us lived the years. One of us kept the visits, the files, and the faith. We ' +
        'write together, produce together, and own together — an even split, on paper, from ' +
        'the beginning.',
      'It means no partner ever has to guess who speaks for the company. Either brother ' +
        'does, and neither alone.',
    ],
  },
  {
    id: 'ars',
    latin: 'Ars',
    english: 'Craft',
    summary:
      'The standard is not “good enough.” It is finished, tested, and impressive to the person who asked for it.',
    body: [
      'We ship completed work: a locked screenplay, a finished manuscript, a series bible ' +
        'with all eighty episodes accounted for. Not treatments, not decks describing ' +
        'something that does not exist yet.',
      'If a thing is worth putting our family name on, it is worth finishing before anyone ' +
        'else has to look at it.',
    ],
  },
];

/** The two founders. */
export const brothers = [
  {
    id: 'michael',
    name: 'Michael Anthony Martin',
    role: 'Co-founder · Author · Producer',
    bio: [
      'Michael Martin was a top salesman on a Cadillac floor in Pickens County, South ' +
        'Carolina, building a business at night, when he was arrested in 1996 at twenty-six. ' +
        'He was convicted in 1997 of a murder no evidence placed him at, and sentenced to ' +
        'natural life without parole.',
      'In 2000 the Supreme Court of South Carolina reversed that conviction unanimously, ' +
        'holding that it was impossible to convict him under the State’s own theory. Ten ' +
        'weeks later the court withdrew the opinion and refiled it with those findings ' +
        'deleted.',
      'He is the subject and co-author of Clearly Established, and the reason the company ' +
        'exists.',
    ],
  },
  {
    id: 'david',
    name: 'David Alexander Martin',
    role: 'Co-founder · Author · Producer',
    bio: [
      'David Martin is the brother who never missed a visit. Through the trial, the ' +
        'sentence, the appeal, and the reversal, he kept the file — the transcripts, the ' +
        'filings, the two versions of the same opinion — because someone had to keep a copy ' +
        'the State could not revise.',
      'He co-writes and co-produces every TRU★MEN project, and leads the company’s research ' +
        'and rights work, including the seven generations of documentation behind The ' +
        'Liberty Argument.',
    ],
  },
];

/**
 * The short news log shown on the homepage. Newest first.
 * Add an entry at the top; the homepage shows the first three.
 */
export const news = [
  {
    date: '2026-08-01',
    dateLabel: 'August 2026',
    title: 'Introducing TRU★MEN Productions',
    body:
      'Revelatory Productions, LLC begins operating as TRU★MEN Productions — a family ' +
      'company for true stories that hold up in court, on the page, and on screen.',
  },
  {
    date: '2026-08-15',
    dateLabel: 'August 2026',
    title: 'Clearly Established: the manuscript is complete',
    body:
      'The memoir is finished at roughly ninety-nine thousand words, with the feature ' +
      'screenplay adapted from it locked and the eighty-episode vertical series mapped.',
  },
];
