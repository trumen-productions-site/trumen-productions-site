/**
 * Investor perks.
 *
 * Six cards. Levels are pending the minimum and tier structure; the EP-credit
 * wording needs counsel's review against guild and distributor practice.
 * Illustration is iconographic (a drawn glyph per card) — no photographs.
 */

import { pending } from '../lib/pending.mjs';

export const perks = [
  {
    id: 'credit',
    title: 'Executive Producer credit',
    body: 'An on-screen credit on the production, in the form the distributor’s credit rules allow.',
    level: pending('perk level — owner'),
    icon: 'credit',
  },
  {
    id: 'set',
    title: 'Set visit',
    body: 'A day on set in South Carolina during principal photography, with the producers.',
    level: pending('perk level — owner'),
    icon: 'set',
  },
  {
    id: 'premiere',
    title: 'Premiere',
    body: 'Two seats at the South Carolina premiere and the reception that follows.',
    level: pending('perk level — owner'),
    icon: 'premiere',
  },
  {
    id: 'festivals',
    title: 'Festival run',
    body: 'Invitations to festival screenings as the production travels.',
    level: pending('perk level — owner'),
    icon: 'festival',
  },
  {
    id: 'dinner',
    title: 'Dinner with the authors',
    body: 'A private dinner with Michael and David Martin — the people who lived the story and wrote it.',
    level: pending('perk level — owner'),
    icon: 'dinner',
  },
  {
    id: 'updates',
    title: 'Insider updates',
    body: 'Production updates, dailies where permitted, and first word on release.',
    level: pending('perk level — owner'),
    icon: 'updates',
  },
];

export const caption = 'Perks vary by investment level. Details on your call.';

export default perks;
