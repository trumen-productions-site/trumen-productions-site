# Compliance — the investor page

Every gate, lint rule and required text, with its reason in two lines, so a future editor who trips one knows
whether to reword or to argue. The rules are code: `src/invest/config/gates.json`,
`src/invest/config/lint/forbidden.mjs`, `src/invest/lib/lint.mjs`, `src/invest/lib/checks.mjs`. The tests that
hold them are in `test/invest/`.

## The two rules that override everything

**The site ships dark.** A staging build (`npm run build`) renders the pending tokens and a red ribbon and ignores
the gates. A production build (`npm run build:prod`) runs every check below and deletes its own output on the
first failure, so a production artefact with an unsigned gate cannot exist. The company site's own deploys use
`npm run build:site`, which does not include these pages at all (D-13).

**No invented numbers.** Every term, figure, name and statistic is a value in `src/invest/config/`. An undecided
one is a `pending('reason')`, which renders as `[[PENDING: reason]]` on staging and fails production.

## Launch gates (GATE-01)

`src/invest/config/gates.json`. Sign one by setting `signed: true`, `by` and `date` (`YYYY-MM-DD`). Half a
signature — a name without `signed`, or `signed` without a date — is refused. `npm run check:gates` prints the table.

| Gate | Meaning | Who signs | Why it is a gate |
|---|---|---|---|
| `G_TRADEMARK` | Class 41 ITU filed for the mark (Gate G) | Alexa Whiteside | The mark is on every page. Public use before filing weakens the position the Plan of Action is built around. |
| `G_COPYRIGHT` | Copyright applications filed for the works named on the page | Alexa Whiteside | The page names the memoir, the screenplay and Episodes 1–11 as material that exists. |
| `G_DBA` | VIRI VERI Productions name cleared and DBA registered — or the footer set to the legal name only | Alexa Whiteside | The footer says `d/b/a VIRI VERI Productions` only when `offering.sponsor.brandCleared` is true. The pivot from TRU★MEN on October 7, 2026 reset this gate: the new name needs its own clearance. |
| `G_SECURITIES` | Securities counsel approved the structure, issuer, documents, Form D and state notice plan, verification method | Securities counsel, via Alexa | A public page promoted with paid ads is general solicitation. Lawful only under an exemption that permits it (the page assumes Rule 506(c)) with real obligations: accredited investors only, reasonable verification, Form D, state notices. Entertainment counsel's sign-off does not cover it. |
| `G_COPY` | Every word approved, including story claims and names | Alexa Whiteside | The page makes factual claims about a court case and two living people. |
| `G_TAX` | Tax wording approved | CPA / tax counsel | Required only when `features.taxSection` is on; the tax card and tile read nothing but the signed text in `legal.tax`. |
| `G_OUTREACH` | Counsel cleared public solicitation relative to the introductions in progress | Alexa Whiteside + Michael | A public raise can affect negotiations under way elsewhere. |
| `G_ADS` | Ad account configured per `ADS.md`; creative approved | Michael | The UTMs and the ad copy rules are what make the funnel readable and lawful. |

## Pending tokens (GATE-02)

`src/invest/lib/pending.mjs`. `collectPending()` lists every undecided config value; `findTokens()` finds every
rendered one. `npm run check:pending` prints both. Production fails on any.

## The exemption (GATE-03)

`offering.exemption === '506(b)'` fails production with the message *"506(b) does not permit general solicitation;
this page cannot be advertised"*. 506(b) forbids exactly what this page is for. Two more production-only rules sit
beside it: a `targetReturn` without `basisDocOnFile`, and the Cloudflare Turnstile *test* site key.

## Forbidden strings (LINT-01)

`src/invest/config/lint/forbidden.mjs`. Checked against the visible text of every investor page and against every
file in `src/invest/config/`. `npm run check:forbidden`.

- **Hype and promises** — `guarantee` (permitted only in `legal.mjs` and the rendered disclaimer footer),
  `risk-free`, `can't lose`, `sure thing`, `safe investment`; `passive income` unless `G_TAX`. A private offering
  page that promises an outcome is a liability, not a sales page.
- **Brand** — the retired mark in every spelling (`TRU★MEN`, `TRU*MEN`, `TruMen`, `TRU MEN`, `Truman Productions`), the
  misspellings of the new one (`Veri Veri`, `Viri Viri`, `VIRI*VERI`), and `A South Carolina production house`
  (superseded tagline). The name is always `VIRI VERI Productions`; the mark is the supplied lockup, never typeset.
- **Removed or superseded** — `Lisa Davis`, `Frankfurt Kurnit`, `Swanson Plantation`, `sixty-plus days`, `Loyd`,
  `Eve Stacey`, `Summerville`, `nineteen`. Each was corrected in the canon; none may come back.
- **Out of scope** — `Green Plan`, `Danny Boy`, `MACRO`, `Mansa`, `Allen Media`, `BuzzFeed`, `muVpix`,
  `Tyler Perry`, `Maxscene`, `M88`, `ALLBLK`, `theGrio`, `ReelShort`, `DramaBox`, `MyDrama`, `Innocent Citizen`,
  `ICRA`, `Liberty Argument`, `Estelusti`, `Ancestry`, `VistaJet`, `Flexjet`. The owner's no-commingling rule: this
  page names no other company, project, partner, platform or campaign. (The company site may mention its own slate;
  this lint is scoped to the investor pages.)

## Proper names (NAMES)

Every pair of consecutive capitalised words in the visible copy, other than the first word of a sentence, must be
part of an allowed name (`allowedNames`) or be a name the config itself supplies (the issuer, the booking host). Any
other name fails the build, so a new name is always added on purpose. No judge, prosecutor, officer, trial or
appellate lawyer, other person's case, studio, platform, agent, manager or sponsor appears — `test/invest/lint.test.mjs`
also checks a list of names that must never appear.

## Canon facts (CANON-01)

If a subject appears, it appears exactly: arrest `1996`; age `twenty-six`; conviction `1997`;
`three years and eleven months`; reversal `March 27, 2000`; refiling `June 12, 2000`; `Op. No. 25093`; `unanimous`;
`seventy-seven days` between the two filings; `ninety-three days` from the order to the remittitur of
`June 28, 2000`. See `DECISIONS.md` D-04 on the two day counts.

## Required text (REQ-01)

Every investor page: `<meta name="robots" content="noindex, nofollow">`, the words *Accredited investors only*, the
*not an offer to sell* block. `/invest/` additionally: the qualifier in both header and hero, *Not an offer of
securities*, and the risk sentence containing *lose some or all*. The `_headers` file adds `X-Robots-Tag` and
`Cache-Control: no-store` on the same paths (SEC-01).

## Footnotes (FN-01, FN-02)

Every stat tile cites a footnote that must exist in `legal.footnotes`; numbering is by first appearance; each
section prints the notes it used. An unknown id, an unused definition (other than a hidden tile's), or a reference
that is never printed fails the build. The reader never sees an aggressive number without its caveat in view.

## Sources (SRC-01)

Every comparable on the page has a `sourceUrl` that answers 200 and a `verifiedOn` date. `npm run check:sources`.
Candidates are reported, never published.

## Feature flags

`src/invest/config/features.mjs`. All default to the conservative setting.

| Flag | Unlocks | Gate |
|---|---|---|
| `taxSection` | Tax card and tax tile, from `legal.tax` only | `G_TAX` |
| `castingComps` | Text-only names labelled "not attached", never photos | counsel |
| `followList` | Optional email field on the end screen, and `/api/follow` (`FEATURE_FOLLOW_LIST`) | counsel |
| `sms` | SMS opt-in checkbox, `/terms/` link, Twilio A2P 10DLC (`FEATURE_SMS`) | registered campaign |
| `metaPixel` | Consent banner, pixel, Conversions API, Meta hosts in the CSP | `G_ADS` |
| `counselDisplay` | Counsel's name on the team section | her written consent |
| `comps` | The comparables section, when three verified entries exist | SRC-01 |
| `marketing` | The marketing-plan section | `G_COPY` |

## What the system stores, and never stores

See `COUNSEL_REVIEW.md` § 10 and `db/migrations/0001_init.sql`. IP addresses only as a salted hash; consents with
the exact text shown and its hash; the git SHA of the build each investor saw. Never a Social Security number,
financial document or verification file.
