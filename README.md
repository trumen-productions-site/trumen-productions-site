# TRU★MEN Productions — website

The company site for TRU★MEN Productions (Revelatory Productions, LLC) — *Viri Veri*.
Seven pages, a two-minute animated pitch for *Clearly Established*, a gated investor page
for the *Clearly Established* private offering, and a test suite that refuses to let any of
it ship broken.

**Live pages**

| Page | What it is |
| --- | --- |
| `/` | The company: mark, featured project, the record, the three beats, the slate, the values, the latest |
| `/clearly-established/` | The featured project in full — logline, synopsis, the case record, architecture, themes, characters, tone, director's vision, comparables, why now, scale, the ask |
| `/clearly-established/pitch/` | The 120-second animated pitch, with transport controls, chapter jumps, timecode deep links, and a complete transcript |
| `/our-story/` | The company, the spine (Provocation · Prevarication · Revocation), and the brothers |
| `/projects/` | The slate: memoir, legal volume, feature, eighty-episode vertical series, documentary |
| `/values/` | Veritas · Testimonium · Fraternitas · Ars |
| `/faq/` | Twelve questions, also emitted as `FAQPage` structured data |
| `/contact/` | Four routes: general, rights & representation, financing & production, press |

**Dark pages** — built, tested, never linked, never indexed, excluded from the company site's deploys. See
[*The investor page*](#the-investor-page).

| Page | What it is |
| --- | --- |
| `/invest/` | The CLEARLY ESTABLISHED investor page: hero, terms strip, the case, why investors participate, the six-step qualification-and-booking flow, team, marketing, perks, use of funds, FAQ, legal footer |
| `/invest/confirmed/` · `/invest/received/` · `/invest/not-accredited/` | Where the flow and its no-JavaScript fallback land |
| `/privacy/` · `/terms/` | The investor page's privacy policy and SMS terms |

---

## Run it

Node 22.13 or newer. Nothing to install — there are no dependencies.

```bash
npm run dev          # build, serve at http://localhost:8080, rebuild on change
npm run build        # build everything into dist/ (the investor page in staging mode)
npm run build:site   # the company site alone — what Netlify and GitHub Pages publish
npm run build:prod   # the investor page for production: refused until every launch gate is signed
npm test             # build, then run the full suite (690 assertions)
npm run dev:invest   # the investor page with its API, locally, no accounts needed
npm run preview      # write trumen-site-preview.html — the whole site as one file
npm run pitch        # write clearly-established-pitch.html — the pitch as one file
npm run images       # regenerate the social cards and touch icon (needs a Chromium)
```

`dist/` is the deployable artefact: plain HTML, CSS, JS, and images. No server, no runtime,
no database, no third-party scripts, no analytics, no cookies.

### Two single-file builds

Both are generated from the same source as the site, so neither can drift from it. Both are
gitignored — regenerate rather than commit.

| Command | Output | What it's for |
| --- | --- | --- |
| `npm run preview` | `trumen-site-preview.html` (~183 kB) | All nine pages in one file, with working navigation. Open it on a laptop, email it for sign-off, take it into a meeting with no wifi. |
| `npm run pitch` | `clearly-established-pitch.html` (~92 kB) | The animated pitch alone, with its transcript. The one to attach to an email. |

The preview turns internal links into in-page routing (`/faq/` becomes `#/faq/`, and
`/our-story/#the-spine` becomes `#/our-story/~the-spine`), so every link works with no
server. Three things it has to do by hand that a real page load gives for free: release the
scroll-reveal animations on the page that just appeared, re-measure the pitch stage now that
it has a width, and mark the right nav item as current.

---

## Before it goes live

Four things, all in **`src/site.config.mjs`**, each marked `TODO:`. `npm test` fails while
any placeholder contact address remains, so the site cannot go out with fake details by
accident.

1. **`site.url`** — the production domain. It drives every canonical URL, the sitemap, the
   Open Graph URLs, and the structured data.
2. **`site.contact`** — four real, monitored addresses (`general`, `rights`, `financing`,
   `press`). They can all be the same address; the four subject lines still sort the mail.
   Optionally a `phone` and a `mailingAddress` — leave them `null` to hide those lines
   entirely.
3. **`site.social`** — add profiles, or leave the list empty and nothing renders.
4. **The verification checklist** — see *Facts and verification* in
   [`docs/editing.md`](docs/editing.md). Two quotations on the site were supplied by the
   authors and have not been checked against a primary document by this build. `npm test`
   prints them as a reminder every run.

---

## The brand

Navy `#0b1f3a`, cream `#f3ebdd`, brass `#b08d57`, green `#2e6b4f`, gold `#d4af37` — the
palette locked July 12, 2026, and the same five values the reel pipeline uses
(`four-rules-reels/brand/tokens.json`). A test asserts them, so the two can never drift.

One constraint worth knowing before you reach for brass: **brass on cream is 2.6:1**, which
fails even the large-text floor. Anything brass-coloured on a light ground uses
`--brass-deep` (`#6b5836`, 5.8:1) instead. Full-strength brass is for dark grounds and for
the full-bleed field, where navy type sits on it at 5.3:1.

## How it is built

```
src/
  site.config.mjs      identity, contact routing, navigation, the load-bearing facts
  data/                the content: company, projects, film, faq, pitch timings
  lib/                 html helpers, shared components, the document shell, the pitch stage
  pages/               one module per page
  assets/              css, js, images — copied to dist/ verbatim
build.mjs              the whole toolchain, ~200 lines, zero dependencies
tools/make-images.mjs  regenerates the social card and touch icon from a headless Chromium
test/                  the suite
```

**Pages are JavaScript, not a template language.** Each module in `src/pages/` exports a
`path`, a `title`, a `description`, and a `body()` returning HTML. Loops are `map`,
conditionals are `?:`, escaping is `esc()`. There is no template syntax to learn and no
parser to maintain.

**Content is separated from markup.** Copy lives in `src/data/*.mjs` as plain objects with
comments. Changing a paragraph means editing prose in a data file, not hunting through
markup. See [`docs/editing.md`](docs/editing.md).

**Nothing is stated twice.** A fact that appears on four pages is defined once in
`site.config.mjs`. The pitch's scene timings are defined once in `src/data/pitch.mjs` and
drive the animation, the chapter buttons, the transcript timecodes, and the tests.

---

## The animated pitch

`/clearly-established/pitch/` is a faithful port of the composition authored in Claude
Design (`project/clearly-film.jsx` in the design handoff) — the same easings, the same cue
arithmetic, the same three motion primitives, rebuilt as real HTML on a 1920×1080 stage that
scales to fit.

What the port adds over the original prototype:

- **Real text.** Every word on the stage is HTML — selectable, translatable, indexable, and
  present with JavaScript switched off. The original existed only at runtime.
- **A transcript** beneath the player carrying every line in reading order with timecodes.
  The stage is `aria-hidden`, so a screen reader gets one clean pass rather than a jumble.
- **Transport.** Play/pause, restart, scrub, nine chapter jumps, live timecode and scene
  name. Space or `K` toggles, `←`/`→` skip five seconds, `Home`/`End` jump to the ends.
- **Timecode deep links.** `/clearly-established/pitch/#t=62` opens on the red field and
  holds there. Handy in an email to a financier — and it is how the frames in this repo's
  review were verified.
- **Manners.** It plays silently, pauses itself when scrolled out of view, and rests on a
  composed poster frame rather than autoplaying if the visitor has reduced motion switched
  on.
- **A homepage teaser** running the title card alone on a ten-second loop.

### The pitch as a single file

`npm run pitch` writes `clearly-established-pitch.html` — the whole piece in one
self-contained file, about 92 kB, with both stylesheets, the engine, the stage and the
transcript inlined. Double-click it and it plays; no server, no internet beyond the
webfonts, which fall back to system faces if they cannot load.

Link to `/clearly-established/pitch/` on the site; attach this file to an email, put it on a
USB stick, or open it in a room with bad wifi. It regenerates from the same source, so it
can never drift from the site's version.

To retime the piece, edit the scene durations in `src/data/pitch.mjs`. Everything else —
cues, chapter buttons, transcript timecodes, the tests — follows. `npm test` asserts the
total is still 120 seconds and that no moment of the timeline goes dark.

### Deliberate omissions

- **Casting names.** The pitch deck lists an *illustrative* casting vision naming real
  performers. None is attached, and on a public page that reads as an announcement, so it is
  off by default and a test enforces it. The switch, and the conditions for flipping it, are
  at the top of `src/data/film.mjs`.
- **The budget tier.** The deck marks it `$X–$XM placeholder`. We do not publish a number we
  cannot stand behind. Set `film.scale.budgetTier` when there is a real one.
- **The vertical-series market report.** `deck_files-…docx` in the handoff is marked
  *Confidential — internal strategy, investor and platform-negotiation use*. None of its
  figures, platform names, or deal terms appear on the public site, and a test keeps it that
  way.

---

## Tests

`npm test` builds, then runs 690 assertions across seven site files and eleven investor-page files. They are not decoration —
they caught three real defects during the build: an unreadable colour pair, a specificity
bug that flattened the pitch's spacing, and an invisible button on the dark hero.

| File | What it holds |
| --- | --- |
| `build.test.mjs` | Every declared page is written and nothing else; clean URLs; assets copied; sitemap, robots and manifest correct; no unreplaced placeholders |
| `html.test.mjs` | Doctype, `lang`, balanced tags, exactly one `h1`, no skipped heading levels, title length, description length, canonical, full Open Graph and Twitter cards, parseable JSON-LD, skip link, `<main>`, safe external links |
| `links.test.mjs` | Every internal link and every `#fragment` resolves to something that exists; nav marks itself current; nothing is more than two clicks from home; ids are unique |
| `a11y.test.mjs` | Alt text, labelled or hidden SVGs, named buttons, labelled controls, singular landmarks, no positive `tabindex`, discernible link text, **WCAG AA contrast computed from the live CSS tokens**, and the reduced-motion contract |
| `pitch.test.mjs` | The runtime is still 120s; cues derive from durations; chapters tile with no gaps; every timing attribute parses inside the runtime; the shots cover the whole timeline; the transcript carries every phrase the animation shows |
| `content.test.mjs` | The record is consistent across pages; the superseded "four and a half years" cannot come back; quotations are attributed; no placeholder contact details, casting names, budget placeholder, or confidential figures reach the build |
| `lib.test.mjs` | The template helpers, including escaping |
| `invest/*.test.mjs` | The investor page: config schemas (CFG), launch gates and the refused production build (GATE), footnotes (FN), forbidden strings, canon facts, names and required text (LINT/CANON/REQ), the flow machine (FLOW), validators, first-touch attribution (UTM), the API against the real migration on SQLite (API), security headers (SEC), and the rendered page |

The browser suite (`npm run test:e2e`: E2E-01…05, A11Y-01/02 with axe, SNAP-01) and the Lighthouse
budgets (`npm run perf`: PERF-01) are the one place the repository installs anything, and only for
the run: `npm install --no-save playwright-core axe-core lighthouse`. CI runs both.

---

## Deploying

`dist/` is a static directory. Anything that serves files will do.

**Netlify** — connect the repository; `netlify.toml` supplies the build command, the publish
directory and the Node version. The generated `_redirects` wires up the 404 page.

**Vercel** — build command `npm run build`, output directory `dist`.

**GitHub Pages** — the workflow in `.github/workflows/pages.yml` builds and publishes on
every push to `main`. Enable Pages → *Source: GitHub Actions* in repository settings. The
build writes a `.nojekyll` so files beginning with `_` are served. The site uses
root-relative paths, so it has to be served from the root of a host, not from a
`/repository-name/` sub-path: either name the repository `<owner>.github.io`, or attach a
custom domain under Pages → *Custom domain*.

**Anything else** — `npm run build`, then copy `dist/` to the web root. Serve `404.html` for
missing paths and you are done.

Set `site.url` to the real domain before the first deploy; it is baked into canonicals, the
sitemap, and structured data at build time.

---

## The investor page

`/invest/` is a single-purpose landing page for paid social: a cold accredited investor in, a
booked 30-minute call with the producer out. It is built from the owner's brief, saved verbatim
as [`HANDOFF.md`](HANDOFF.md), and it **ships dark**: `noindex, nofollow`, never linked from the
company site, left out of `npm run build:site`, and deployable to production only through a
gated workflow that refuses to build until every launch gate in
`src/invest/config/gates.json` is signed.

What is in the box:

- **A typed config layer** (`src/invest/config/`) in which every term, figure, perk, FAQ and
  disclaimer is a value — or a `pending('reason')`, which renders as a visible `[[PENDING]]`
  token on staging and fails the production build. No invented numbers, enforced.
- **A compliance layer**: a footnote engine that keeps every caveat in view, forbidden-string
  and canon-fact lints, a proper-name allowlist, required-text checks, and the launch gates.
- **The six-step flow** (`src/assets/js/invest/`): a pure state machine the tests prove can
  never reach the booking states from a "no / not sure", a real calendar grid with keyboard
  navigation, timezone handling, and a plain form that works with JavaScript off.
- **A backend** (`functions/`, Cloudflare Pages Functions + D1): leads, consents with the exact
  text shown, bookings that cannot double-book, a server-side event log, Turnstile, rate
  limits, a scheduler adapter (mock and Cal.com), text-first email with an `.ics`, and an
  abandonment sweep.
- **Scripts** for the gates, the pending terms, the lints, the comparable sources, a CSV export,
  and a counsel review packet generated from the build.
- **Documentation** in [`docs/invest/`](docs/invest/): `RUNBOOK.md`, `COMPLIANCE.md`,
  `CONTENT.md`, `ADS.md`, `DECISIONS.md`, and the generated `COUNSEL_REVIEW.md`.

`npm run demo` writes `invest-demo/` — the investor pages with relative paths and an in-page shim
that answers the API from the same mock calendar the tests use, so the whole six-step flow can be
walked from disk or any static host with nothing saved anywhere. A presentation tool, not the
staging deployment.

Start with the runbook. Everything the brief did not decide, and every place the build departs
from it, is in `DECISIONS.md`.

---

## The reel set

`four-rules-reels/` is a separate deliverable in the same repository: three 60-second
vertical reels for *Clearly Established*, built from a deterministic Python pipeline
(Pillow → ffmpeg, no framework). It shares this project's brand tokens and its facts, and
enforces them harder — `src/canon.py` derives the 77 days of the erasure and the 93 days of
over-detention from the dates on the opinion, the refiled opinion and the remittitur, and
fails the build on a contradiction, a banned phrase, or an unrecognised number.

```bash
cd four-rules-reels
make install     # ffmpeg, espeak-ng, tesseract, EB Garamond (once)
make all         # three MP4s + SRTs + thumbnails + QC_REPORT.md
```

Nothing there is published. Output is inventory behind a legal gate — see its README.

---

## Where the content came from

The design and the copy come from a Claude Design handoff, preserved unchanged in
[`docs/design-handoff/`](docs/design-handoff/README.md), `chats/`, and `project/`:

- `project/Clearly Established Video.dc.html` and `project/clearly-film.jsx` — the animated
  pitch, ported to `src/lib/pitch-stage.mjs` and `src/assets/js/pitch.js`
- `project/uploads/index.pdf` — a print of the earlier TRU★MEN site; the source for the
  brand (Poppins bold italic wordmark with the star, Georgia for prose), the three-beat
  spine, the four values, and the corrected facts
- `project/uploads/Clearly_Established_Screenplay pitch deck.pptx` — the film pitch
- `chats/chat1.md` — the conversation the copy was settled in

Where two sources disagreed, the later one wins and the choice is recorded in a comment. The
one that mattered: time served is **three years and eleven months**, not the earlier draft's
"four and a half years". A test now blocks the old figure from returning.

---

© 2026 Revelatory Productions, LLC, doing business as TRU★MEN Productions.
TRU★MEN and the star mark are trademarks of Revelatory Productions, LLC; registration
pending.
