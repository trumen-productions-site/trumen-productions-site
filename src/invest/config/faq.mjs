/**
 * The investor FAQ.
 *
 * Six questions. `a` is either a string, or a function of the resolved
 * config so an answer can read the offering terms without restating them.
 * Pending values in the config render as tokens inside the answer.
 */

import { legal } from './legal.mjs';

export const faq = [
  {
    id: 'what',
    q: 'What is being offered?',
    a: ({ issuer, production }) =>
      `Membership interests in ${issuer((i) => i.legalName)}, a single-purpose company formed to produce ${production}.`,
  },
  {
    id: 'minimum',
    q: 'What is the minimum?',
    a: ({ minimum }) => `${minimum}.`,
  },
  {
    id: 'payback',
    q: 'How are investors paid back?',
    a: ({ waterfall }) => waterfall,
  },
  {
    id: 'rights',
    q: 'Who owns the underlying rights?',
    a:
      'Revelatory Productions, LLC. The production company holds the rights it needs for this production under a ' +
      'written agreement.',
    counselNote: 'Counsel to confirm wording.',
  },
  {
    id: 'risk',
    q: 'What are the risks?',
    a: legal.risk,
  },
  {
    id: 'verification',
    q: 'How is accredited status verified?',
    a: ({ verification }) => verification,
  },
];

export default faq;
