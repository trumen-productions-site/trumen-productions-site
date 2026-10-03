/**
 * The team.
 *
 * Two entries. Each bullet is pending the named person's approval of the
 * exact wording (gate G_COPY). No development partner, studio, platform,
 * agent, manager or prospective sponsor is named here — or anywhere on the
 * page. Counsel's line renders only when `features.counselDisplay` is on.
 */

export const team = [
  {
    name: 'Michael Anthony Martin',
    credits: 'Writer · Producer · Subject',
    bullets: [
      'Arrested in 1996 at twenty-six; convicted in 1997; conviction reversed unanimously by the South Carolina Supreme Court on March 27, 2000.',
      'Co-author of the memoir and the screenplay; the series is drawn from both.',
      'Vice-President, Revelatory Productions, LLC.',
    ],
    photo: null,
  },
  {
    name: 'David Alexander Martin',
    credits: 'Writer · President, Revelatory Productions, LLC',
    bullets: [
      'Co-author of the memoir, the screenplay, and Episodes 1–11.',
      'Kept the visits, the files and the record through the years his brother was held.',
      'President, Revelatory Productions, LLC — a fifty-fifty company, one name on the chain of title.',
    ],
    photo: null,
  },
];

/** Rendered only when features.counselDisplay is true. */
export const counsel = {
  name: 'Alexa Whiteside, Esq.',
  firm: 'WAM Entertainment Law',
  role: 'Counsel of record for the project',
};

export default team;
