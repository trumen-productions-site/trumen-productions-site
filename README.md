# TRU★MEN Productions — website

The company site for TRU★MEN Productions (Revelatory Productions, LLC) — *Viri Veri*.
Seven pages, a two-minute animated pitch for *Clearly Established*, and a test suite that
refuses to let it ship broken.

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

---

## Run it

Node 20 or newer. Nothing to install — there are no dependencies.

```bash
npm run dev      # build, serve at http://localhost:8080, rebuild on change
npm run build    # build into dist/
npm test         # build, then run the full suite (400+ assertions)
npm run pitch    # write clearly-established-pitch.html — the pitch as one file
npm run images   # regenerate the social card and touch icon (needs a Chromium)
```

`dist/` is the deployable artefact: plain HTML, CSS, JS, and images. No server, no runtime,
no database, no third-party scripts, no analytics, no cookies.

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

`npm test` builds, then runs 400+ assertions across seven files. They are not decoration —
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

---

## Deploying

`dist/` is a static directory. Anything that serves files will do.

**Netlify** — build command `npm run build`, publish directory `dist`. The generated
`_redirects` wires up the 404 page.

**Vercel** — build command `npm run build`, output directory `dist`.

**GitHub Pages** — the workflow in `.github/workflows/pages.yml` builds and publishes on
every push to `main`. Enable Pages → *Source: GitHub Actions* in repository settings. The
build writes a `.nojekyll` so files beginning with `_` are served.

**Anything else** — `npm run build`, then copy `dist/` to the web root. Serve `404.html` for
missing paths and you are done.

Set `site.url` to the real domain before the first deploy; it is baked into canonicals, the
sitemap, and structured data at build time.

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
