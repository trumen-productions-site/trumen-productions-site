# Editing the investor page

Companion to [`docs/editing.md`](../editing.md), which covers the company site. The same rule applies: **copy lives
in config, layout lives in sections.** After any change, `npm test`.

## Where things are

| To change | Open |
|---|---|
| The terms — minimum, raise, waterfall, escrow, use of funds, the stat tiles | `src/invest/config/offering.mjs` |
| The production the raise finances, and its descriptor | `src/invest/config/offering.mjs → production` |
| Footnotes, disclaimers, the risk sentence, consent texts, the accredited helper, tax wording | `src/invest/config/legal.mjs` |
| The logline (two variants), the timeline, the "why this travels" bullets | `src/invest/config/story.mjs` |
| Comparables and the research shortlist | `src/invest/config/comps.mjs` |
| The two bios; counsel's line | `src/invest/config/team.mjs` |
| The six perks | `src/invest/config/perks.mjs` |
| The FAQ | `src/invest/config/faq.mjs` |
| The three marketing cards | `src/invest/config/marketing.mjs` |
| Contact address, entity address, booking host, call length, Turnstile site key, page title and description | `src/invest/config/site.mjs` |
| Feature flags | `src/invest/config/features.mjs` |
| Launch gates | `src/invest/config/gates.json` |
| Forbidden strings, the name allowlist, the canon facts | `src/invest/config/lint/forbidden.mjs` |
| The section markup (hero, strip, cards, flow scaffold, footer) | `src/invest/sections.mjs` |
| The key art | `src/invest/keyart.mjs` (then `npm run images` for the social card) |
| Styles | `src/assets/css/invest.css` (tokens come from `site.css`) |
| The flow's behaviour | `src/assets/js/invest/flow.js`; its rules in `machine.js`; field rules in `validators.js` |
| The emails | `functions/api/_lib/email.js` |

## Deciding a pending term

Find the `pending('…')` and replace it with the value. Numbers are numbers, not strings:

```js
minimum: pending('minimum investment — interacts with the verification method'),
// becomes
minimum: 25000,
```

Formatting is automatic (`$25,000` in prose, `$25K` on a tile). The stat tile, the FAQ answer, the step-2 ranges
and the counsel packet all update from this one line. `npm run check:pending` shows what is still open.

Some values are small objects:

```js
waterfall: { investorFirstPct: 120, thenSplit: 'net receipts are split evenly between investors and the producers' },
issuer: { legalName: 'Block One Productions, LLC', state: 'South Carolina' },
useOfFunds: [
  { label: 'Above the line', pct: 20 },
  { label: 'Production', pct: 45 },
  { label: 'Post-production', pct: 15 },
  { label: 'Marketing and release', pct: 12 },
  { label: 'Contingency and fees', pct: 8 },   // must sum to 100
],
```

## Changing the story variant

`src/invest/config/story.mjs → variant`. Variant B adds the sentence "The Court said it should have been impossible
to convict him." and needs `approvedBy` and `approvedOn` on its entry, or the build refuses it.

## Adding a footnote

Add it to `legal.footnotes` with a short id, then cite it where the claim is made — on a tile with `footnoteId`,
or in a section with `fn.mark('id')`. The engine numbers it by first appearance and prints it under that section.
A footnote nothing cites fails the build; so does a citation of a footnote that does not exist.

## Adding a comparable

1. Put it in `comps.mjs → candidates` with the title, year, budget, gross, label, source URL and source name.
2. `npm run check:sources` — the URL must answer 200.
3. Open the source and confirm the figures match exactly. Add `verifiedOn: 'YYYY-MM-DD'` and move the entry into
   `comps`.
4. When three are there, set `features.comps = true`. The cards are typographic — never studio artwork.

## Adding or changing a perk

`perks.mjs`. Six entries with `id`, `title`, `body`, `level` (a string, or `pending`) and an `icon` from the list in
`src/invest/icons.mjs`. The EP-credit wording needs counsel's review.

## Adding an FAQ

`faq.mjs`. `a` is a string, or a function of the resolved terms (`({ minimum, waterfall, issuer, production,
verification }) => …`) so an answer can read a term without restating it.

## Adding a name

If a new proper name must appear — a verifier, a named host — add it to `allowedNames` in
`config/lint/forbidden.mjs` **on purpose**, and only once counsel has cleared it. The issuer's legal name and the
booking host's name are allowed automatically once decided in config. No judge, prosecutor, officer, lawyer, other
person's case, studio, platform, agent, manager or sponsor is ever named on this page.

## Words to avoid

The lint will tell you. In short: nothing that promises an outcome (`guarantee`, `risk-free`, `safe`), nothing
from another company or project, nothing superseded in the canon, nothing in the retired `TRU★MEN` mark, and the name always written
`VIRI VERI Productions` (the star is drawn in the lockup, never typed).

## The emails

`functions/api/_lib/email.js`. Text-first. The investor's confirmation never carries the amount range or the
accredited answer; the producer's notices carry both. The `.ics` is built in `ics.js`.

## Regenerating the counsel packet

`npm run counsel:packet` rewrites `docs/invest/COUNSEL_REVIEW.md` from the current config and build. Do it after
any copy change, and send the packet, not a screenshot.
