/**
 * Clearly Established — the feature film pitch, as it appears on the site.
 *
 * Sourced from the authors' pitch deck (Clearly_Established_Screenplay pitch
 * deck.pptx) and the TRU★MEN site PDF. Where the two disagreed on a number,
 * the site PDF wins: it is the later, more precise document. Specifically,
 * the time served is "three years and eleven months" — an earlier draft of
 * the deck said "four and a half years."
 */

/**
 * ⚠ The pitch deck carries an *illustrative* casting vision naming real
 * actors — Jamie Foxx, Michael B. Jordan, Brie Larson, Viola Davis, Delroy
 * Lindo, O'Shea Jackson Jr., Rafe Spall, Lindsay Ayliffe — to signal the
 * calibre of talent the role can attract. None of them is attached.
 *
 * That framing is fine in a deck handed to a buyer with a caption on it. On a
 * public website it reads as an announcement, and it is the kind of thing that
 * draws a letter from an agency. It is therefore OFF by default, and the
 * public page shows the roles without the names.
 *
 * Flip to `true` only if you have written permission from each performer, or
 * if the site is behind a password for buyer meetings.
 */
export const showCastingVision = false;

export const film = {
  title: 'Clearly Established',
  format: 'A feature film · Based on a true story',
  genre: 'Drama',
  source: 'Adapted from the memoir by Michael & David Martin',
  status: 'Completed screenplay · Life rights held by the authors',

  keyline:
    'The State of South Carolina overturned his conviction. It could not give him back the ' +
    'record of his innocence.',

  logline:
    'At twenty-six, a gifted young salesman is convicted of a murder South Carolina’s own ' +
    'prosecutor admitted, in open court, the State could not prove. Years later the state ' +
    'Supreme Court reverses — calling the conviction impossible — then quietly deletes that ' +
    'finding from its own opinion. Decades on, he sets out to read the erased words into a ' +
    'record no one can edit.',

  synopsis: {
    kicker: 'A life, taken on a theory.',
    paragraphs: [
      'Pickens County, 1996. Michael Martin is twenty-six — a top salesman on his Cadillac ' +
        'floor, building a business at night. When his roommate returns one evening hinting ' +
        'at something terrible, Michael says the words that will define his life: “I don’t ' +
        'want to know anything about anything.”',
      'He passes the State’s own polygraph; no evidence ever places him at the scene. When ' +
        'the prosecutor concedes in open court he will “probably never know which one of ' +
        'these defendants actually did the killing,” Michael’s attorney moves for a directed ' +
        'verdict of acquittal. The judge admits on the record, “I got heartburn over it” — then ' +
        'denies the motion and sends it to the jury anyway. Michael is convicted in 1997 and ' +
        'sentenced to natural life without parole. He serves three years and eleven months, ' +
        'ninety-three days of it past the point the law allowed.',
      'In 2000 the South Carolina Supreme Court reverses, finding the conviction impossible ' +
        'under the State’s own theory. Then it withdraws the opinion and deletes the ' +
        'paragraphs that said so. Years later — a mentor’s dying instruction in hand — ' +
        'Michael moves to put those words somewhere no court can reach them.',
    ],
  },

  /** The title is a legal term. This explains it. */
  doctrine: {
    heading: 'Two timelines. One doctrine.',
    body:
      'The title is a legal term. Under qualified immunity, a right does not count unless a ' +
      'prior court has already <em>clearly established</em> it. The film braids two true ' +
      'stories thirty years apart to show the same machinery at work — protecting the ' +
      'institution, editing the record.',
    timelines: [
      {
        label: 'Timeline A · 1996–2000',
        title: 'The conviction & the erasure',
        body:
          'Michael Martin, Pickens County. A murder the State could not place him at, a ' +
          'reversal that called it impossible — and an opinion quietly rewritten.',
      },
      {
        label: 'Timeline B · 2024',
        title: 'The same machinery, today',
        body:
          'A twelve-year-old selling flowers in a parking lot. An officer with a record. A ' +
          'rookie who writes the truth — and a department that tries to delete it.',
      },
    ],
  },

  /** The three-act spine of the pitch, matching the animated piece. */
  beats: [
    {
      number: '01',
      label: 'The prevarication',
      heading: 'A murder the State admitted it could not prove.',
      body: [
        'South Carolina charged Michael Martin with murder and tried the case on a theory — ' +
          'not on evidence that placed him at the scene. He passed the State’s own polygraph.',
        'Arrested in 1996 at twenty-six. Convicted in 1997 — sentenced to natural life ' +
          'without parole.',
      ],
      punch: [
        { text: 'Three years, eleven months in prison.', tone: 'ink' },
        { text: 'Ninety-three days of it past what the law allowed.', tone: 'red' },
      ],
    },
    {
      number: '02',
      label: 'The reversal',
      heading: 'Reversed. Impossible to convict.',
      body: [
        'On March 27, 2000, the Supreme Court of South Carolina reversed the conviction — ' +
          'unanimously — holding it should have been impossible to convict him under the ' +
          'State’s own theory.',
        'For a moment, the record told the truth.',
      ],
      punch: [],
    },
    {
      number: '03',
      label: 'The erasure',
      heading: 'Then the findings vanished.',
      body: [
        'On June 12, 2000, the Court withdrew that opinion and refiled it — with the ' +
          'language that explained his innocence deleted. He was still incarcerated, ' +
          'over-detained past what the law allowed, while the record was rewritten.',
        'The reversal stood. The words that explained it did not — a prevarication by ' +
          'erasure, rewriting the Supreme Court’s own ruling to shield the State from ' +
          'liability to the man it wronged.',
      ],
      punch: [],
    },
  ],

  questions: {
    primary: 'Why would a state erase its own finding of innocence?',
    secondary: 'How do you clear a name when the record of innocence has been erased?',
  },

  themes: [
    {
      number: '01',
      title: 'Who controls the record',
      body:
        'In 1996 there was one copy and the accusers kept it. Then they issued a revised ' +
        'edition where the truth was erased. The truth survives only where it can’t be edited.',
    },
    {
      number: '02',
      title: 'The quiet of power',
      body:
        'No conspiracy, no shout — just an erasure, after hours. How a sovereign State, ' +
        'through acts of prevarication, ensures no liability or accountability to a wronged, ' +
        'innocent citizen.',
    },
    {
      number: '03',
      title: 'The cost of being right',
      body:
        'Attaining relief and due compensation after being wrongfully convicted and ' +
        'over-detained past what the law allowed — with no relief, compensation, or justice.',
    },
  ],

  /** Roles, described without casting attributions. */
  characters: [
    {
      role: 'The lead',
      name: 'Michael Anthony Martin',
      body:
        'Convicted at twenty-six, exonerated, then erased. A man whose composure — his ' +
        'mother’s compass — becomes his weapon against the record.',
      castingVision: 'Jamie Foxx',
    },
    {
      role: 'The advocate',
      name: 'Daniel',
      body:
        'A young appellate lawyer carrying the dying instruction of his mentor, Dan Stacey — ' +
        'the attorney who won Michael’s reversal: get the words into a record no one can edit.',
      castingVision: 'Michael B. Jordan',
    },
    {
      role: 'The witness',
      name: 'Officer Reese Calloway',
      body:
        'A rookie cop, daughter of a cop, who watches a child brutalized in 2024 and writes ' +
        'the truthful report her department tries to bury. Our way into the architecture.',
      castingVision: 'Brie Larson',
    },
    {
      role: 'The foundation',
      name: 'Nita & David Martin',
      body:
        'A reverend mother and a decorated veteran father who never missed a visit in the ' +
        'years their son was held. The family whose faith outlasts the State’s patience.',
      castingVision: 'Viola Davis · Delroy Lindo',
    },
  ],

  tone: {
    heading: 'The look and the feel.',
    body:
      'Available light and patient frames. The recurring device: white Courier text on black ' +
      'that deletes itself, letter by letter. Body-cam grain of 2024 against the single, ' +
      'fragile court record of 1996.',
    textures: [
      'Title-card deletion motif',
      'Courtroom, 1996',
      'Body-cam POV, 2024',
      'Prison visitation room',
      'Case files / the record',
      'Palmetto roses, the lot',
    ],
  },

  directorsVision: {
    attribution: 'The Martin brothers',
    quote:
      'We want to make a film that never raises its voice — because the injustice at its ' +
      'center never did either.',
    body: [
      'We stay close: on faces, on hands, on the small print where a life is decided. No ' +
        'swelling score telling you how to feel. The drama lives in the quiet — a sentence ' +
        'struck from a page, and the years a man spends putting it back. The deletion device ' +
        'returns throughout, until the final frame, where the words rebuild and stay.',
      'Told by the people who lived it — in the tradition of Just Mercy and Loving: true, ' +
        'patient, and unafraid to trust its audience.',
    ],
  },

  comparables: [
    {
      title: 'Just Mercy',
      year: '2019',
      body: 'The north star: a true wrongful-conviction memoir told with dignity and zero melodrama.',
    },
    { title: 'Loving', year: '2016', body: 'Quiet, interior, Oscar-nominated. Restraint reads as prestige.' },
    { title: 'Dark Waters', year: '2019', body: 'One person against an institution that edits the truth.' },
    {
      title: 'When They See Us',
      year: '2019',
      body: 'The streaming proof point: true injustice, broad reach, awards-season weight.',
    },
  ],

  whyNow: {
    heading: 'A proven appetite, a fresh wound.',
    points: [
      {
        title: 'The audience is here',
        body:
          'Wrongful-conviction stories — from Just Mercy to When They See Us — have a ' +
          'durable, awards-friendly audience across theatrical and streaming.',
      },
      {
        title: 'A hook the genre hasn’t seen',
        body:
          'We have seen the wrongful conviction. We have not seen the court erase its own ' +
          'finding of innocence. The second act is the differentiator.',
      },
      {
        title: 'A live national debate',
        body:
          'Qualified immunity is contested in courts and legislatures right now — and South ' +
          'Carolina remains one of the last states with no wrongful-conviction compensation ' +
          'statute. The story is urgently current.',
      },
    ],
  },

  scale: {
    heading: 'Contained scale, cast-driven value.',
    body:
      'A contained, performance-led drama: two timelines, limited locations, a single state, ' +
      'and one extraordinary true story carrying the film.',
    points: [
      {
        title: 'Contained scale',
        body: 'Courtroom, law office, home, prison visitation, Lowcountry exteriors — real locations, few builds.',
      },
      { title: 'Cast-driven value', body: 'An awards-caliber lead role anchors the budget and the campaign.' },
      {
        title: 'South Carolina incentive',
        body: 'Shoot where it happened — and capture the state’s film rebate against spend.',
      },
      { title: 'Festival-first path', body: 'Built for a premiere launch into an awards and streaming run.' },
    ],
    // The deck marks the budget tier as a placeholder ("$X–$XM"). We do not
    // publish a number we cannot stand behind. Set this to a string to show it.
    budgetTier: null,
  },

  ask: [
    { number: '01', title: 'Financing partner', body: 'Equity and/or a co-financier to close the production budget.' },
    {
      number: '02',
      title: 'Production home',
      body: 'A producer or studio/streamer partner from package to premiere.',
    },
    {
      number: '03',
      title: 'Lead attachment',
      body: 'An awards-caliber actor for the title role to anchor financing and the campaign.',
    },
  ],

  closing: {
    line: 'The truth does not delete. It stays.',
    quote: 'You are a witness now, too.',
    body: 'A film about what it takes to put the truth somewhere no one can edit it.',
  },
};

export default film;
