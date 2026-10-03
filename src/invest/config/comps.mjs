/**
 * Comparable titles.
 *
 * Two lists. `comps` is what renders: every entry has a reachable source and
 * a `verifiedOn` date, and the section only appears when `features.comps` is
 * on and there are at least three of them. `candidates` is the research
 * shortlist — titles that are honest fits for a true-story legal drama, with
 * the figures as remembered and the source each figure must be checked
 * against. `npm run check:sources` fetches every URL, prints what it finds,
 * and a human moves an entry up once the number on the page matches.
 *
 * Nothing in `candidates` is published. A candidate's figures are NOT
 * verified and must not be quoted anywhere until they are.
 *
 * No studio artwork, ever: the cards are typographic (HANDOFF.md § 3).
 */

/** @type {Array<{title:string, year:number, budget:string, gross:string, grossLabel:string, sourceUrl:string, sourceName:string, verifiedOn:string}>} */
export const comps = [];

export const candidates = [
  {
    title: 'Just Mercy',
    year: 2019,
    budget: '$25M',
    gross: '$50.4M',
    grossLabel: 'worldwide box office',
    sourceUrl: 'https://www.boxofficemojo.com/title/tt4916630/',
    sourceName: 'Box Office Mojo',
    note: 'True wrongful-conviction memoir adaptation. The north star for tone.',
  },
  {
    title: 'Loving',
    year: 2016,
    budget: '$9M',
    gross: '$12.9M',
    grossLabel: 'worldwide box office',
    sourceUrl: 'https://www.boxofficemojo.com/title/tt4669986/',
    sourceName: 'Box Office Mojo',
    note: 'Quiet, interior true story; Oscar-nominated lead.',
  },
  {
    title: 'Dark Waters',
    year: 2019,
    budget: '$20M',
    gross: '$23.1M',
    grossLabel: 'worldwide box office',
    sourceUrl: 'https://www.boxofficemojo.com/title/tt9071322/',
    sourceName: 'Box Office Mojo',
    note: 'One person against an institution that edits the truth.',
  },
  {
    title: 'Spotlight',
    year: 2015,
    budget: '$20M',
    gross: '$98.3M',
    grossLabel: 'worldwide box office',
    sourceUrl: 'https://www.boxofficemojo.com/title/tt1895587/',
    sourceName: 'Box Office Mojo',
    note: 'Document-driven true story; Best Picture.',
  },
  {
    title: 'The Mauritanian',
    year: 2021,
    budget: '$10M',
    gross: '$7.6M',
    grossLabel: 'worldwide box office (pandemic release)',
    sourceUrl: 'https://www.boxofficemojo.com/title/tt4761112/',
    sourceName: 'Box Office Mojo',
    note: 'Included for honesty: a legal drama that did not return its budget theatrically.',
  },
];

/** The caption under the cards. */
export const caption =
  'Examples from the category, not projections for this production. Figures as publicly reported; sources linked.';

export default comps;
