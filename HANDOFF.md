# CLEARLY ESTABLISHED — Investor Page
## Claude Code Handoff Brief · Rev. 1.0 · October 3, 2026

**Owner:** Michael Anthony Martin, Vice-President, Revelatory Productions, LLC (TRU★MEN Productions)
**Counsel of record for the project:** Alexa Whiteside, Esq., WAM Entertainment Law
**Reference product:** ND Global Media, "Invest in Clawed Butterfly" (`ndglobalmedia.com/invest`), captured Oct 3, 2026
**Scope:** CLEARLY ESTABLISHED only. Nothing from any other company, project, or campaign enters this repo.

---

> **Repository note (October 3, 2026).** This is the owner's brief, saved verbatim as it instructs.
> The build it describes lives in this repository as the `/invest/` pages: `src/invest/`, `src/pages/invest*.mjs`,
> `functions/`, `db/`, `scripts/`, `test/invest/`, `test/e2e/` and `docs/invest/`. Where the implementation
> departs from a line below, the reason is in `docs/invest/DECISIONS.md`; the standing choice is that the page is
> built inside this site's existing zero-dependency toolchain rather than a second framework (D-01).
>
> **Brand note (October 8, 2026).** Every `TRU★MEN Productions` below is the brief as written. On October 7, 2026,
> per counsel, the company became **VIRI VERI Productions**; the build renders the new name and the supplied
> lockup everywhere the brief says the mark goes, and the retired name is now a forbidden string (D-26).

## 0. How to use this file

Save this file at the repo root as `HANDOFF.md`. Section 19 is the kickoff prompt to paste into Claude Code. Work the phases in Section 18 in order; each phase has acceptance criteria and tests that must pass before the next begins.

Two rules override everything else in this brief:

1. **The site ships dark.** It builds, tests, and deploys to a password-protected staging URL. It cannot be built for production until the launch gates in Section 4 are signed. The build enforces this itself (test `GATE-01`).
2. **No invented numbers.** Every financial term, return figure, tax claim, market statistic, and comparable lives in config with a source or a sign-off. Anything unset renders as a visible `[[PENDING: …]]` token on staging and fails the production build (test `GATE-02`).

---

## 1. Mission and definition of done

Build a single-purpose, paid-social-ready landing page at `/invest` that takes a cold accredited investor from an ad to a booked 30-minute call with the producer, for a private offering financing a CLEARLY ESTABLISHED production.

Done means all of the following:

- One long-scroll page plus `/privacy`, `/terms` (SMS terms), and `/invest/confirmed`.
- A six-step qualification-and-booking flow with real calendar availability.
- Lead capture with UTM attribution, consent records, producer notification, and investor confirmation.
- A typed config layer so every term, stat, perk, FAQ, and disclaimer changes without touching components.
- A compliance layer: footnote engine, required-disclaimer checks, forbidden-claim lint, launch gates.
- Unit, end-to-end, accessibility, performance, and compliance tests green in CI.
- Documentation: `README.md`, `docs/RUNBOOK.md`, `docs/COMPLIANCE.md`, `docs/CONTENT.md`, `docs/COUNSEL_REVIEW.md`, `docs/ADS.md`.

---

## 2. Reference teardown

What the reference page does, top to bottom. This is structure and mechanics only; none of its copy, art, or figures is reused.

| # | Section | What it does | Mechanic worth keeping |
|---|---|---|---|
| 1 | Skip link + slim header | Brand name left, "Accredited investors only" right | Qualifier is visible before the first scroll |
| 2 | Hero | Eyebrow ("private film offering"), short possessive headline, one-paragraph pitch stating budget, genre, shoot year and the team's edge, primary CTA to the questionnaire, secondary CTA to an explainer anchor, one-line legal qualifier, key art | Two CTAs: one for ready buyers, one for learners |
| 3 | Stat strip | Six tiles: minimum, tax write-off, target multiple, multiple with tax benefit, investor-first payback %, total raise. Numbered footnotes directly beneath | Every aggressive number carries a footnote in view |
| 4 | About the story | One-sentence logline, a three-market fit list, a two-bullet "why this genre now" with sourced stats | Story takes under 100 words |
| 5 | Why investors choose film | Three numbered cards: tax, return/waterfall, experience. CTA | Head, wallet, heart, in that order |
| 6 | Start here (flow) | "Step 1 of 6, about 30 seconds." Accredited yes / not-sure with a plain-language definition; contact form with phone and optional SMS opt-in with full carrier disclosure; month calendar with available days highlighted; time picker; "not confirmed until you pick a time" | Booking is inside the page, not a link out |
| 7 | Comparable titles | Six poster cards, each "budget → gross," with a "not projections" caption | Budget-to-gross arrows are instantly legible |
| 8 | Team + casting comps | Two bios with three bullets each, then a headshot grid labeled "not attached" | (We do not copy the headshot grid. See Section 3.) |
| 9 | Mid-page CTA band | "Still reading? The quickest way is 30 minutes." | Re-asks after each proof block |
| 10 | Marketing plan | Three image cards: on-set creator content, premiere as content event, owned email/SMS list | Marketing is sold as risk reduction |
| 11 | Investor perks | Six image cards: EP credit, set visit, premiere, festivals, dinner, insider updates. "Perks vary by level." | Perks are specific and concrete |
| 12 | Use of funds | Bar plus list: five allocations summing to 100% | One glance |
| 13 | CTA band | "Seen enough?" | |
| 14 | FAQ | Four questions, each answered in one or two sentences, including a blunt risk answer | Brevity signals confidence |
| 15 | Final CTA | "No commitment. No pressure. Just answers." | |
| 16 | Legal footer | Offering structure paragraph (Rule 506(c), accredited verification, escrow), not-an-offer paragraph, third-party-art notice, entity names, privacy and SMS links | Structure stated in plain English |
| 17 | Sticky mobile CTA bar | Persistent "See if you qualify" | Paid-social traffic is mobile |

Page metadata on the reference: `noindex`, a meta description that states budget and "accredited investors." Traffic source is Meta paid social with full UTM strings (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_id`, `utm_term`).

---

## 3. What we keep and what we change

**Keep:** the section order, the stat strip with in-view footnotes, the in-page six-step booking flow, repeated CTA bands, plain-language offering structure, sticky mobile CTA, `noindex`, UTM capture.

**Change, deliberately:**

1. **No casting-comp headshots.** Showing named actors who are not attached invites right-of-publicity and implied-endorsement claims. Omitted. If counsel later approves, the section exists behind `features.castingComps` (default `false`) as text-only names with a "not attached" label, never photos.
2. **No third-party poster art.** Comparables render as typographic cards (title, year, budget → gross, source link). No studio artwork.
3. **Every stat needs a source or a sign-off in config.** The reference footnotes its claims; we enforce it in the build.
4. **Tax claims are off by default.** `features.taxSection = false` until a CPA or tax counsel signs the exact wording.
5. **Tone.** The reference sells a genre bet. This page sells a true record. Restraint, primary sources, no hype adjectives. The word "guaranteed" never appears outside a disclaimer.
6. **Not-accredited path.** A respectful end screen with no offering details. No list signup unless `features.followList` is turned on (default `false`; audience-building is on hold pending counsel's direction).

---

## 4. Launch gates (enforced in code)

`config/gates.json` holds one object per gate: `{ "signed": false, "by": "", "date": "", "note": "" }`. `npm run build:prod` fails unless every gate is signed. Staging builds ignore gates but show a red "STAGING — NOT AN OFFERING" ribbon.

| Gate | Meaning | Who signs |
|---|---|---|
| `G_TRADEMARK` | Class 41 ITU filed for the mark (Gate G) | Alexa Whiteside |
| `G_COPYRIGHT` | Copyright applications filed for the works named on the page | Alexa Whiteside |
| `G_DBA` | TRU★MEN Productions name cleared and DBA registered, or footer set to legal name only | Alexa Whiteside |
| `G_SECURITIES` | Securities counsel has approved offering structure, issuer entity, offering documents, Form D and state notice filing plan, and accredited-verification method | Securities counsel (via Alexa) |
| `G_COPY` | Every word on the page approved, including story claims and names | Alexa Whiteside |
| `G_TAX` | Tax language approved (only required if `features.taxSection` is `true`) | CPA / tax counsel |
| `G_OUTREACH` | Counsel has cleared public investor solicitation relative to the studio and agent introductions in progress | Alexa Whiteside + Michael |
| `G_ADS` | Ad account configured per `docs/ADS.md`; creative approved | Michael |

Why `G_SECURITIES` is its own gate: a public page promoted with paid ads is general solicitation. That is only lawful under an exemption that permits it (the reference uses Rule 506(c)), which carries real obligations: sales to accredited investors only, reasonable steps to verify status, a Form D filing with the SEC, and state notice filings. This is securities work, distinct from entertainment and IP work. The page must not go live on the strength of this brief.

---

## 5. Open decisions (owner inputs)

These are unset. They are placeholders in config, not assumptions. `docs/COUNSEL_REVIEW.md` lists them as a one-page checklist.

| Key | Decision | Notes |
|---|---|---|
| `offering.production` | Which production the raise finances | Default placeholder: Block One of the vertical series (Episodes 1–11), shot in South Carolina. Alternatives: feature, limited series. One production per page. |
| `offering.issuer` | Legal name and state of the single-purpose LLC | Not yet formed |
| `offering.totalRaise` | Total raise | |
| `offering.minimum` | Minimum investment | Interacts with verification method; ask securities counsel |
| `offering.waterfall` | Recoupment % to investors first, then profit split | |
| `offering.targetReturn` | Target multiple and the model behind it | Optional. Tile hidden if unset. Requires a written basis on file. |
| `offering.exemption` | Exemption relied on | Page copy assumes 506(c) |
| `offering.escrow` / `collectionAccount` | Whether funds are escrowed; third-party collection account | |
| `offering.useOfFunds` | Allocation percentages | Must sum to 100 (test `CFG-03`) |
| `perks[]` | Which perks, at which levels | EP-credit language needs counsel review against guild and distributor practice |
| `team[]` | Who appears, exact credits, approved photos | |
| `counselDisplay` | Whether counsel is named on the page | Default `false`; requires her written consent |
| `booking.host` | Who takes the calls and which calendar | |
| `contact.email` | Public contact address | Currently `michaelmartin@greenplanit.org`; switch to the `revelatoryproductions.com` address when mail is restored so no other company's domain appears |
| `site.domain` | Production domain | |
| `story.variant` | Which approved story-claim wording to use | See Section 9.4 |

---

## 6. Architecture

Chosen for a static, fast, auditable page with one small interactive island and a thin server layer.

- **Framework:** Astro (latest stable), TypeScript strict. Static output for all pages.
- **Interactive island:** Preact for the qualification flow only. Everything else is zero-JS HTML.
- **Styling:** Tailwind with a locked token file (Section 14). No UI kit.
- **Hosting:** Cloudflare Pages. Staging behind Cloudflare Access (email allowlist).
- **Server:** Pages Functions for `/api/lead`, `/api/slots`, `/api/book`, `/api/health`.
- **Data:** Cloudflare D1 (SQLite). Schema in Section 11.
- **Scheduling:** A `SchedulerAdapter` interface with two implementations: `CalComAdapter` (real availability and bookings through the Cal.com API) and `MockAdapter` (deterministic, for tests and local dev). Verify current Cal.com API docs before coding; do not rely on remembered endpoints.
- **Email:** Resend (or Postmark) for producer notification and investor confirmation. Plain, text-first templates.
- **SMS:** off by default (`features.sms = false`). When enabled, Twilio with a registered A2P 10DLC campaign. The opt-in checkbox does not render when the flag is off.
- **Bot protection:** Cloudflare Turnstile on the contact step; per-IP rate limit on all API routes.
- **Analytics:** Server-side event log in D1 as the source of truth. Meta Pixel and Conversions API behind a consent banner and `features.metaPixel`.
- **Secrets:** Wrangler secrets only. `.dev.vars.example` committed; no real keys in the repo.

If any choice above is unavailable in the owner's accounts, keep the adapter boundaries and swap the vendor; do not restructure the app.

---

## 7. Repo layout

```
/
├─ HANDOFF.md
├─ README.md
├─ astro.config.mjs  ·  tailwind.config.ts  ·  wrangler.toml
├─ config/
│  ├─ offering.ts        # terms, stat tiles, use of funds
│  ├─ story.ts           # logline, approved story variants, timeline
│  ├─ comps.ts           # comparables with sources
│  ├─ team.ts  ·  perks.ts  ·  faq.ts  ·  marketing.ts
│  ├─ legal.ts           # disclaimers, footnotes, offering-structure text
│  ├─ features.ts        # feature flags
│  ├─ site.ts            # domain, contact, entity names, booking host
│  ├─ gates.json         # launch gates
│  └─ lint/forbidden.ts  # forbidden strings and patterns
├─ src/
│  ├─ pages/  index.astro(→/invest)  invest.astro  privacy.astro  terms.astro  invest/confirmed.astro
│  ├─ sections/  Hero  StatStrip  Story  WhyInvest  Flow  Comps  Team  Marketing  Perks  UseOfFunds  Faq  FinalCta  LegalFooter  CtaBand  StickyCta
│  ├─ islands/flow/  Flow.tsx  steps/*  machine.ts  validators.ts
│  ├─ components/  Footnote  Stat  Card  Button  Mark  KeyArt  StagingRibbon  ConsentBanner
│  ├─ lib/  utm.ts  footnotes.ts  pending.ts  format.ts
│  └─ styles/tokens.css
├─ functions/api/  lead.ts  slots.ts  book.ts  health.ts  _lib/(db, scheduler, email, turnstile, ratelimit, capi)
├─ db/migrations/0001_init.sql
├─ scripts/  check-gates.ts  check-pending.ts  check-forbidden.ts  check-sources.ts  export-leads.ts
├─ tests/  unit/  e2e/  a11y/  compliance/
├─ docs/  RUNBOOK.md  COMPLIANCE.md  CONTENT.md  COUNSEL_REVIEW.md  ADS.md  DECISIONS.md
└─ .github/workflows/ci.yml
```

---

## 8. Config contracts

```ts
// config/offering.ts
export type Pending = { pending: string };            // renders [[PENDING: …]]
export type Val<T> = T | Pending;

export interface StatTile {
  id: string;
  value: Val<string>;          // "$25K", "120%"
  label: string;               // "MINIMUM INVESTMENT"
  footnoteId?: string;         // must exist in legal.footnotes
  requires?: 'G_TAX' | 'targetReturnBasis';
  show: boolean;
}

export interface Offering {
  production: Val<{ title: string; format: 'vertical-series' | 'feature' | 'limited-series'; descriptor: string; shootLocation: string; shootWindow: string }>;
  issuer: Val<{ legalName: string; state: string }>;
  sponsor: { legalName: 'Revelatory Productions, LLC'; brand: 'TRU★MEN Productions'; brandCleared: boolean };
  exemption: Val<'506(c)' | '506(b)' | 'other'>;
  totalRaise: Val<number>;
  minimum: Val<number>;
  waterfall: Val<{ investorFirstPct: number; thenSplit: string }>;
  targetReturn?: { multiple: number; basisDocOnFile: boolean };
  escrow: Val<boolean>;
  collectionAccount: Val<boolean>;
  useOfFunds: Val<Array<{ label: string; pct: number }>>;
  tiles: StatTile[];
}

// config/comps.ts
export interface Comp { title: string; year: number; budget: string; gross: string; grossLabel: string; sourceUrl: string; sourceName: string; verifiedOn: string; }

// config/story.ts
export interface StoryVariant { id: 'A_conservative' | 'B_canon'; logline: string; approvedBy?: string; approvedOn?: string; }

// config/features.ts
export const features = {
  taxSection: false, castingComps: false, followList: false, sms: false,
  metaPixel: false, counselDisplay: false, comps: true, marketing: true,
} as const;
```

`506(b)` in `exemption` must hard-fail the production build with the message "506(b) does not permit general solicitation; this page cannot be advertised" (test `GATE-03`).

---

## 9. Page specification and draft copy

All copy below is draft for counsel review. Tokens in `{{ }}` come from config. The company name is always written `TRU★MEN Productions` with the star glyph (U+2605), never an asterisk.

### 9.1 Header
Left: the TRU★MEN mark (SVG). Right: "Accredited investors only". Skip link: "Skip to the questionnaire".

### 9.2 Hero
- Eyebrow: `Private offering`
- H1: `Own a piece of *the record*.`
- Body: `CLEARLY ESTABLISHED is {{production.descriptor}}, drawn from State v. Martin, the case in which a unanimous South Carolina Supreme Court reversed a wrongful conviction on March 27, 2000. The man it happened to is writing and producing it. {{production.shootWindow}}, {{production.shootLocation}}.`
- Primary CTA: `See if you qualify →` (to `#start`)
- Secondary CTA: `How this offering works` (to `#why`)
- Qualifier: `Accredited investors only. Not an offer of securities.`
- Art: `KeyArt` component, typographic, built in SVG from the locked identity: green § above the title, title in Georgia, scales beneath, navy field, brass rule. No photography, no generated faces.

### 9.3 Stat strip
Up to six tiles from `offering.tiles`, in this order when shown: minimum · investor-first payback · total raise · target return (only with basis on file) · tax tile (only with `G_TAX`) · production format. Footnotes render immediately below the strip, numbered by the footnote engine in order of first appearance. A tile whose footnote is missing fails the build (test `FN-02`).

### 9.4 The story
- H2: `The case`
- Logline, variant A (conservative, default):
  `In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina. In 1997 he was convicted. He served three years and eleven months before a unanimous South Carolina Supreme Court reversed the conviction on March 27, 2000. Then the opinion that freed him was withdrawn and refiled with language removed, while the State held him seventy-seven days past the Court's order.`
- Logline, variant B (canon framing, requires `approvedBy`):
  adds one sentence: `The Court said it should have been impossible to convict him.`
- Three "why this travels" bullets (draft):
  - `A true story with a public record.` Opinion No. 25093 is on file; the story stands on documents anyone can read.
  - `Built for the phone first.` {{production.descriptor}} is written for vertical viewing, where serialized drama is finding its audience. *(Only if production is the vertical series. Any market statistic here needs a `sourceUrl`.)*
  - `Written by the people who lived it.` Michael Anthony Martin and David Alexander Martin.
- No officials, judges, prosecutors, or officers are named anywhere on the page. No other persons' cases are mentioned.

### 9.5 Why investors participate (`#why`)
Three numbered cards.
1. `01 · Structure` — `First-position payback`: `{{waterfall.investorFirstPct}}% returned to investors before producers share in profit`; collection account and escrow lines only if those config values are `true`.
2. `02 · The work` — `Material that exists`: completed memoir manuscript; locked feature screenplay; Episodes 1–11 scripted; rights held by Revelatory Productions, LLC. (Registration and trademark lines appear only once `G_COPYRIGHT` and `G_TRADEMARK` are signed, and are worded as filed, not as registered, unless registered.)
3. `03 · The experience` — perks summary from `perks[]`.

When `features.taxSection` is `true`, a tax card replaces card 2's position as `01` and the others shift, using only the signed wording in `legal.tax`.

### 9.6 Start here (`#start`) — see Section 10

### 9.7 Comparables
- H2: `True stories, modest budgets`
- Typographic cards from `comps[]`. Each shows `budget → gross`, label, and a "Source" link.
- Caption: `Examples from the category, not projections for this production. Figures as publicly reported; sources linked.`
- Claude Code researches candidates and fills `comps.ts` with a live `sourceUrl` and `verifiedOn` date for each. Candidates must be honest fits: true-story or legal dramas and vertical-series market data relevant to `production.format`. If fewer than three verifiable, favorable-but-honest comps exist, set `features.comps = false` rather than stretch. `scripts/check-sources.ts` requests every `sourceUrl` in CI and fails on non-200 (test `SRC-01`).

### 9.8 Team
From `team[]`. Draft entries:
- **Michael Anthony Martin** — Writer · Producer · Subject. Three bullets, pending his approval.
- **David Alexander Martin** — Writer · President, Revelatory Productions, LLC. Three bullets, pending his approval.
Counsel line renders only if `features.counselDisplay`. No development partners, studios, platforms, agents, managers, or prospective sponsors are named.

### 9.9 CTA band
`Still reading? The fastest way through is 30 minutes with the producer.`

### 9.10 Marketing
- H2: `The record is the campaign`
- Three cards (draft; each needs owner approval):
  - `Primary sources as content` — the filed opinions and trial record, presented on screen.
  - `South Carolina premiere` — a hometown premiere event for cast, investors, and press.
  - `Owned audience` — an email list built at release, converted with tickets and editions. *(Describes the plan; no list is collected before counsel's direction.)*
- Illustration is typographic or iconographic. No stock photos of people.

### 9.11 Perks
Six cards from `perks[]`. Caption: `Perks vary by investment level. Details on your call.`

### 9.12 Use of funds
Accessible stacked bar plus list from `offering.useOfFunds`. Caption: `Allocations are approximate and subject to the final budget.`

### 9.13 FAQ (draft)
- **What is being offered?** `Membership interests in {{issuer.legalName}}, a single-purpose company formed to produce {{production.title}}.`
- **What is the minimum?** `{{minimum}}.`
- **How are investors paid back?** from `waterfall`.
- **Who owns the underlying rights?** `Revelatory Productions, LLC. The production company holds the rights it needs for this production under a written agreement.` *(Counsel to confirm wording.)*
- **What are the risks?** `This is a high-risk investment. You could lose some or all of your money. Most independent productions do not return their budgets. Full risk factors are in the offering documents.`
- **How is accredited status verified?** from `legal.verification`.

### 9.14 Final CTA
`Questions answered? Let's talk.` / `30 minutes with the producer. Pick your time.` / `No commitment.`

### 9.15 Legal footer
From `legal.ts`, three blocks:
1. **Offering structure** — exemption, verification, escrow, each sentence conditional on config.
2. **Not an offer** — informational only; offers only through definitive documents to verified accredited investors; projections are estimates; high risk including total loss; tax outcomes vary.
3. **Story notice** — `Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.`
Entity line: `© 2026 Revelatory Productions, LLC` and, only if `sponsor.brandCleared`, `d/b/a TRU★MEN Productions`. Address: 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. Links: Privacy, SMS Terms (if `features.sms`).

### 9.16 Sticky mobile CTA
Appears after the hero scrolls out; hides while `#start` is in view and when the keyboard is open.

### 9.17 Meta
`<meta name="robots" content="noindex,nofollow">` on every page, always. Title: `Invest in CLEARLY ESTABLISHED · TRU★MEN Productions`. Open Graph image is the typographic key art. No investor terms in OG text.

---

## 10. Qualification and booking flow

State machine in `islands/flow/machine.ts`. Progress label: `Step n of 6 · About 30 seconds`.

| Step | Prompt | Input | Rules |
|---|---|---|---|
| 1 | Are you an accredited investor? | Yes / No or not sure | Helper text gives the general tests (income, net worth excluding primary residence, certain licenses), worded by counsel. "No / not sure" goes to the end screen. |
| 2 | How much are you considering? | Ranges generated from `minimum` | Stored, not gating |
| 3 | What matters most to you? | Return · The story · Being part of the production | Stored; shown to the producer before the call |
| 4 | Your details | Name, email, phone, optional SMS checkbox (only if `features.sms`) | Turnstile; SMS box unchecked by default with full disclosure text; lead is saved on submit of this step, before booking |
| 5 | Pick a day | Month grid; days with open slots are marked | Slots from `/api/slots`; investor's timezone shown and changeable |
| 6 | Pick a time | Slot list for the day | `/api/book` creates the booking; on conflict, re-fetch and say so plainly |

Standing line under steps 5–6: `Not confirmed yet. Your time is held only once you pick it.`
Standing line under the whole flow: `This questionnaire is not a subscription agreement and commits you to nothing.`

**End screen (not accredited):** `Thank you. This offering is limited by law to accredited investors, so we can't share more here.` Nothing else. No offering details, no upsell. If `features.followList` is `true`, one optional email field with its own consent line.

**Confirmation (`/invest/confirmed`):** date and time in the investor's timezone, calendar file download, who they are meeting, what to have ready, and the not-an-offer line. Confirmation email mirrors it.

**Abandonment:** if step 4 is saved and no booking follows in 30 minutes, the producer gets a "lead without booking" notice. No automated investor follow-up in v1.

**Resilience:** flow state persists in `sessionStorage` so a refresh does not lose progress; wrap access in try/catch and fall back to in-memory state where storage is blocked. With JavaScript disabled, `#start` shows a plain form that posts to `/api/lead` and promises a reply by email.

---

## 11. Backend

### 11.1 Schema (`db/migrations/0001_init.sql`)
```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
  accredited_self_report TEXT NOT NULL,           -- 'yes' | 'no_or_unsure'
  amount_range TEXT, interest TEXT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  timezone TEXT, status TEXT NOT NULL DEFAULT 'new', -- new|booked|held|verified|declined
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, utm_id TEXT,
  fbclid TEXT, landing_path TEXT, referrer TEXT,
  ip_hash TEXT, user_agent TEXT, page_version TEXT NOT NULL
);
CREATE TABLE consents (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id),
  kind TEXT NOT NULL,                             -- 'sms' | 'analytics' | 'follow_list'
  granted INTEGER NOT NULL, text_shown TEXT NOT NULL, text_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id),
  provider TEXT NOT NULL, provider_ref TEXT, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE events (
  id TEXT PRIMARY KEY, lead_id TEXT, session_id TEXT NOT NULL,
  name TEXT NOT NULL, props TEXT, created_at TEXT NOT NULL
);
```
`page_version` is the git SHA of the deployed build, so there is a record of exactly which copy and disclaimers each investor saw. `consents.text_shown` stores the exact words displayed.

### 11.2 Routes
- `POST /api/lead` — validate (zod), Turnstile, rate limit, insert lead and consents, notify producer. Returns `lead_id`.
- `GET /api/slots?from&to&tz` — adapter call, cached 60 seconds.
- `POST /api/book` — verifies lead exists and self-reported accredited, books through the adapter, inserts booking, sends confirmation with `.ics`.
- `GET /api/health` — DB and adapter reachability; reports which gates are signed (booleans only).

### 11.3 Data handling
IP stored only as a salted hash. No SSN, no financial documents, no verification files ever touch this system; verification happens with the third party counsel selects. `scripts/export-leads.ts` writes a CSV for the producer. `docs/RUNBOOK.md` documents deletion on request and a retention period set by counsel.

---

## 12. Attribution and analytics

`lib/utm.ts` reads `utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id, fbclid` on first load, keeps the first touch for the session, and attaches it to the lead. Events logged server-side: `page_view, cta_click{location}, flow_step{n}, lead_saved, slot_view, booked, not_accredited_end`. `docs/RUNBOOK.md` includes the SQL for the funnel by `utm_content` so each ad creative can be read by booked calls, not clicks.

Meta Pixel and Conversions API fire only when `features.metaPixel` is on and the visitor has accepted analytics. Send `Lead` and `Schedule` only; never send amount ranges or accredited status to any third party.

---

## 13. Compliance layer

- **Footnote engine (`lib/footnotes.ts`):** components call `fn('id')`; numbering is by first appearance; each section that uses a note prints it within that section, as the reference does. Unknown or unused ids fail the build.
- **Pending tokens (`lib/pending.ts`):** any `Pending` value renders `[[PENDING: reason]]` in a brass outline on staging; `scripts/check-pending.ts` fails production.
- **Required text (`tests/compliance`):** the rendered HTML must contain the accredited-only qualifier in header and hero, the not-an-offer block, the risk sentence including "lose some or all," and `noindex`.
- **Forbidden strings (`config/lint/forbidden.ts`, test `LINT-01`), checked against built HTML and all config:**
  - Hype and promises: `guarantee` outside `legal.ts`, `risk-free`, `can't lose`, `sure thing`, `safe investment`, `passive income` unless `G_TAX`.
  - Brand: `TRU*MEN`, `TRUMAN Productions`, `Truman Productions`, `A South Carolina production house`.
  - Removed or superseded: `Lisa Davis`, `Frankfurt Kurnit`, `Swanson Plantation`, `sixty-plus days`, `Loyd`, `Eve Stacey`, `Summerville`, `nineteen`.
  - Out of scope for this page (no commingling, no partner names): `Green Plan`, `Danny Boy`, `MACRO`, `Mansa`, `Allen Media`, `BuzzFeed`, `muVpix`, `Tyler Perry`, `Maxscene`, `M88`, `ALLBLK`, `theGrio`, `ReelShort`, `DramaBox`, `MyDrama`, `Innocent Citizen`, `ICRA`, `Liberty Argument`, `Estelusti`, `Ancestry`, `VistaJet`, `Flexjet`.
  - Named individuals other than those in `team[]` and counsel (when enabled): maintained as an allowlist test, so any new proper name in copy must be added on purpose.
- **Canon facts (test `CANON-01`):** if these appear, they must appear exactly: arrest `1996`; age `twenty-six`; conviction `1997`; `three years and eleven months`; reversal `March 27, 2000`; refiling `June 12, 2000`; `seventy-seven days`; `Op. No. 25093`; `unanimous`.
- **`docs/COMPLIANCE.md`** explains each rule in two lines so a future editor knows why it exists.

---

## 14. Design system

Locked identity; do not improvise a palette.

- **Color tokens:** `--navy` (field), `--cream` (text on navy, light sections), `--brass` (rules, accents, focus ring, available-day marker), `--green` (the § only). Sample exact values from the existing TRU★MEN letterhead and deck assets the owner supplies in `/brand`; until then use `#0E1B2E`, `#F4EDE0`, `#B08D57`, `#2F6B4F` as named placeholders flagged in `docs/DECISIONS.md`.
- **Type:** Georgia for headings and body (system serif stack fallback). The wordmark is the supplied SVG; never typeset it.
- **Marks:** `Mark.astro` renders the TRU★MEN mark from `/brand/trumen-mark.svg`; the star is never smaller than the letters. `VIRI VERI` appears only inside the supplied lockup.
- **Layout:** single column, 68-character measure, generous vertical rhythm. Brass hairline rules between sections with a centered diamond. Stat strip is a 2×3 grid on mobile, 6×1 on desktop.
- **Motion:** none beyond a 150 ms fade on flow steps; honors `prefers-reduced-motion`.
- **Imagery:** typographic key art, document textures drawn from the public opinion text only after `G_COPY`. No stock people.
- **Dark-on-light check:** every text/background pair meets WCAG AA; brass on navy is for large text and rules only.

---

## 15. Accessibility and performance budgets

- WCAG 2.2 AA. Flow is fully keyboard-operable; calendar is a proper grid with arrow-key navigation and announced availability; errors are associated with fields and announced.
- Mobile Lighthouse: Performance ≥ 95, Accessibility 100, Best Practices ≥ 95. LCP ≤ 1.8 s on throttled 4G, CLS ≤ 0.02, total JS ≤ 60 KB gzipped, no web-font downloads.
- Works at 320 px width and with 200% text zoom.

---

## 16. Test plan

| ID | Type | Asserts |
|---|---|---|
| GATE-01 | script | Production build fails if any required gate is unsigned |
| GATE-02 | script | Production build fails if any `Pending` remains |
| GATE-03 | script | `exemption: '506(b)'` fails production with the stated message |
| CFG-01 | unit | All config parses against zod schemas |
| CFG-03 | unit | Use of funds sums to 100 |
| FN-01 | unit | Footnotes number by first appearance |
| FN-02 | unit | Tile with missing footnote throws |
| FLOW-01 | unit | Machine: "no / not sure" can never reach contact or booking states |
| FLOW-02 | unit | Validators: email, phone (E.164), name |
| UTM-01 | unit | First-touch UTMs captured and persisted to lead |
| API-01 | integration | `/api/lead` rejects missing Turnstile, bad payloads, rate-limit overflow |
| API-02 | integration | `/api/book` rejects a lead not self-reported accredited |
| API-03 | integration | Double-booking the same slot returns a conflict and no duplicate row |
| API-04 | integration | Consent row stores exact text shown and its hash |
| E2E-01 | Playwright | Ad URL with UTMs → six steps → confirmed; DB has lead, booking, UTMs |
| E2E-02 | Playwright | Not-accredited path shows end screen; no offering terms present in that screen |
| E2E-03 | Playwright | JavaScript disabled: fallback form posts and saves a lead |
| E2E-04 | Playwright | Mobile viewport: sticky CTA shows, hides at `#start` |
| E2E-05 | Playwright | Timezone change re-renders slots correctly across a DST boundary |
| A11Y-01 | axe | Zero violations on all pages and each flow step |
| A11Y-02 | Playwright | Entire flow completed by keyboard only |
| PERF-01 | Lighthouse CI | Budgets in Section 15 |
| LINT-01 | script | No forbidden strings in built HTML or config |
| CANON-01 | script | Canon facts exact where present |
| REQ-01 | script | Required legal text and `noindex` present on every page |
| SRC-01 | script | Every stat and comp has a reachable source URL |
| SEC-01 | integration | Security headers present (CSP, HSTS, frame-ancestors, referrer-policy); no secrets in bundle |
| SNAP-01 | visual | Screenshot baselines at 375, 768, 1280 px |

CI runs everything on each push. Staging deploys on green. Production deploy is a manual workflow that runs the three `GATE` scripts first.

---

## 17. Documentation deliverables

- `README.md` — what this is, quick start, commands, where to change what.
- `docs/RUNBOOK.md` — deploy, rollback, rotate keys, export leads, funnel SQL, handle a deletion request, turn features on, what to do when the scheduler is down.
- `docs/COMPLIANCE.md` — every gate, lint rule, and required text with its reason.
- `docs/CONTENT.md` — how to edit copy, add a comp, add a perk, change the story variant, add a footnote.
- `docs/COUNSEL_REVIEW.md` — a printable packet: every open decision from Section 5, the full page copy as plain text, each disclaimer, the consent texts, and a signature line per gate. Generated by `npm run counsel:packet` so it always matches the build.
- `docs/ADS.md` — UTM naming convention matching the reference's pattern; ad-copy rules (accredited-only language, no return figures in ad text, no tax claims); a note to confirm Meta's current rules for financial-product advertising and whether a special ad category applies before any campaign is created; creative checklist.
- `docs/DECISIONS.md` — every choice Claude Code makes that this brief did not dictate, with the reason.

---

## 18. Build phases

**Phase 0 — Scaffold.** Astro, TypeScript strict, Tailwind tokens, CI skeleton, staging ribbon, gates and pending scripts. *Accept:* GATE-01/02/03, CFG-01 green; empty page deploys to protected staging.

**Phase 1 — Config and compliance layer.** All config files with `Pending` values, zod schemas, footnote engine, forbidden and canon lints, required-text test. *Accept:* FN, LINT, CANON, REQ, CFG green.

**Phase 2 — Static page.** All sections from Section 9 with draft copy, key art, mark, legal footer, privacy and terms pages from counsel-reviewable templates. *Accept:* A11Y-01, PERF-01, SNAP-01, E2E-04 green.

**Phase 3 — Flow and backend.** State machine, steps, D1 schema, API routes, MockAdapter, emails, Turnstile, rate limit, no-JS fallback. *Accept:* FLOW, API, UTM, E2E-01/02/03/05, A11Y-02, SEC-01 green.

**Phase 4 — Real scheduler and comps research.** CalComAdapter against current docs; research and fill `comps.ts` with sources or switch the section off; consent banner and optional pixel behind flags. *Accept:* SRC-01 green; a real test booking lands on the host calendar from staging.

**Phase 5 — Documentation and counsel packet.** All docs in Section 17; `npm run counsel:packet` produces the review PDF or Markdown. *Accept:* a new engineer can deploy staging from the README alone; the packet matches the staged page word for word.

**Phase 6 — Launch (blocked).** Only after all gates are signed in `gates.json`: fill config, re-run everything, production deploy, live booking test, ad URL test with UTMs.

---

## 19. Kickoff prompt for Claude Code

```
Read HANDOFF.md in full before writing any code. You are building the CLEARLY ESTABLISHED
investor page described there.

Rules:
1. Follow the phases in Section 18 in order. Do not start a phase until the previous
   phase's acceptance tests pass. Show me test output at the end of each phase.
2. Never invent a financial term, return figure, tax claim, statistic, credit, or
   biographical fact. If config is unset, use a Pending value. If you need a fact,
   ask me or leave it Pending.
3. The production build must stay blocked by config/gates.json. Do not sign gates.
4. Use only the names, facts, and wording allowed by Sections 9 and 13. The company
   name is always "TRU★MEN Productions" with the star glyph.
5. Do not copy text, images, or figures from the reference site. Structure only.
6. Check current vendor documentation (Astro, Cloudflare Pages/D1/Turnstile, Cal.com
   API, Resend) before using an API; do not rely on memory for endpoints or options.
7. Record every decision the brief did not make in docs/DECISIONS.md.
8. When a phase is done, stop and summarize: what was built, test results, open
   questions for the owner.

Start with Phase 0.
```

---

## 20. Appendix

### A. Facts cleared for use on this page (subject to `G_COPY`)
Arrested 1996 at age twenty-six · convicted 1997 · three years and eleven months incarcerated · unanimous South Carolina Supreme Court reversal, March 27, 2000, State v. Martin, Op. No. 25093 · opinion withdrawn and refiled June 12, 2000 with language deleted · held seventy-seven days past the March 27 order · written by Michael Anthony Martin and David Alexander Martin · rights held by Revelatory Productions, LLC · memoir manuscript complete · feature screenplay locked · Episodes 1–11 scripted.

### B. Not on this page
Names of any judge, prosecutor, officer, or trial or appellate lawyer · any other person's case · the family land history · legislation or advocacy · any studio, platform, manager, agent, sponsor, or co-financing party · any other company the owners are involved with · casting names or photos · third-party artwork.

### C. Questions for securities counsel (carry into `docs/COUNSEL_REVIEW.md`)
1. Exemption, issuer entity, and state of formation.
2. Accredited-verification method for the chosen minimum, and the third-party verifier.
3. Form D timing relative to the first ad and first sale; state notice filings.
4. Whether any person taking investor calls needs to be mindful of broker-dealer registration issues, and the script boundaries for those calls.
5. Whether a public raise affects the pending studio, manager, and agent introductions or the reserved-rights position.
6. Approved wording for the accredited definition, verification sentence, risk sentence, and any return or tax language.
7. Bad-actor questionnaire for covered persons.
8. Record retention period for leads and consents.

### D. Revision log
- Rev. 1.0 — Oct 3, 2026 — initial handoff.
