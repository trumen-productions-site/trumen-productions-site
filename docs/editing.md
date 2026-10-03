# Editing the site

Written for whoever has to change a sentence at nine at night. You do not need to know
JavaScript to use this. You need to be able to open a text file, find a sentence, and type a
new one between the same quote marks.

After any change:

```bash
npm test     # builds the site and checks it
```

If that prints `fail 0`, the site is sound. If it fails, the message says which file and
what it expected — nothing is ever half-published.

---

> **The investor page** (`/invest/`) has its own guide: [`docs/invest/CONTENT.md`](invest/CONTENT.md).
> Its copy lives in `src/invest/config/`, and undecided terms are `pending(…)` values, not blanks.

## The one rule

**Copy lives in `src/data/`. Layout lives in `src/pages/`.**

Nine times out of ten the sentence you want is in a data file, in ordinary quotes, with a
comment above it explaining what it is. You can change it without touching a single angle
bracket.

Two things to watch:

- **Keep the quote marks.** `'A murder the State could not prove.'` — change the words
  inside, leave the `'` at each end and the `,` after.
- **An apostrophe inside a single-quoted string needs to be the curly one** (`’`, as in
  `State’s`) or the line will break. Every string in this project already uses curly
  quotes; copy the style of the line above.

---

## Where things are

| To change | Open |
| --- | --- |
| Email addresses, phone, the domain, social links | `src/site.config.mjs` |
| The menu, or the footer link columns | `src/site.config.mjs` → `nav`, `footerNav` |
| Dates, years served, the opinion number, headline figures | `src/site.config.mjs` → `facts` |
| Quotations and their attributions | `src/site.config.mjs` → `quotes` |
| Provocation / Prevarication / Revocation | `src/data/company.mjs` → `spine` |
| The four values | `src/data/company.mjs` → `values` |
| The brothers' biographies | `src/data/company.mjs` → `brothers` |
| News items on the homepage | `src/data/company.mjs` → `news` |
| The five projects and their status badges | `src/data/projects.mjs` |
| Everything about the film — logline, synopsis, themes, characters, comparables, the ask | `src/data/film.mjs` |
| The FAQ | `src/data/faq.mjs` |
| How long each scene of the pitch runs | `src/data/pitch.mjs` |
| The words on the animated pitch itself | `src/lib/pitch-stage.mjs` |
| The transcript beneath the pitch | `src/pages/pitch.mjs` → `TRANSCRIPT` |
| Colours, type sizes, spacing | `src/assets/css/site.css` → the tokens at the top |

---

## Common jobs

### Change an email address

`src/site.config.mjs`, in `contact`. Change it once; it updates the footer, the contact
page, the newsletter button, and the structured data.

```js
contact: {
  general: 'hello@trumenproductions.com',
  …
}
```

To hide the phone or postal address entirely, set them to `null`.

### Add a news item

`src/data/company.mjs`, in `news`. Add an entry at the end; the homepage shows the newest
four, newest first.

```js
{
  date: '2026-09-14',            // machine-readable, YYYY-MM-DD
  dateLabel: 'September 2026',   // what a reader sees
  title: 'A new title here',
  body: 'One or two sentences.',
},
```

### Add a project to the slate

`src/data/projects.mjs`, in `projects`. Copy an existing entry and change the fields. `id`
becomes the anchor (`/projects/#your-id`) and must be unique. `status` must be one of
`complete`, `in-development`, `in-progress`, `seeking-partner`.

### Add an FAQ

`src/data/faq.mjs`. Add `{ q: '…', a: '…' }`. Answers may contain simple HTML — `<em>` and
`<a href="/contact/">links</a>` — and are also emitted as structured data, so keep each
answer able to stand on its own.

### Retime a scene in the pitch

`src/data/pitch.mjs`. Change a `dur`. Everything downstream — the cue each element animates
from, the chapter buttons, the transcript timecodes — recalculates. `npm test` will tell you
if the total is no longer 120 seconds, which is deliberate: it should be a decision, not an
accident.

### Change a word on the animated pitch

`src/lib/pitch-stage.mjs`. It is markup, but the words are plainly visible in it. **Change
the same words in the transcript too** (`src/pages/pitch.mjs`, the `TRANSCRIPT` block) —
`npm test` checks that key phrases appear in both, because the transcript is what a screen
reader and a search engine actually read.

### Add a page

1. Copy `src/pages/values.mjs` to `src/pages/your-page.mjs`.
2. Change `path` (must start and end with `/`), `title`, `description`, and the `body`.
3. Add it to `nav` or `footerNav` in `src/site.config.mjs` if it should be linked.
4. `npm test`.

The build finds it, renders it, adds it to the sitemap, and checks it. There is no list of
pages to keep in sync.

### Publish the casting vision

Off by default, for good reason — see `src/data/film.mjs`. If you have written permission
from each performer, or the site is behind a password for buyer meetings, set
`showCastingVision = true` there.

---

## Facts and verification

The site is about a record that was altered. Its own record has to be exact.

Facts that appear on more than one page are defined once in `src/site.config.mjs` under
`facts`, and quotations under `quotes`. Each quotation carries a `verify` flag.

**Confirmed against the court record** (the *Final Brief of Appellant*, filed by Daniel T.
Stacey in *State v. Martin*, which quotes the transcript with page and line citations):

| Quotation | Source |
| --- | --- |
| “We will probably never know which one of these defendants actually did the killing.” | Solicitor’s closing argument, Record on Appeal p. 349, lines 10–14. The full sentence continues “…which one actually held Dwayne Cobb’s head under the pot of water, submerged his face into water.” |
| “You don’t know if either one of them did.” | The court to the solicitor, in colloquy on the renewed directed-verdict motion, ROA p. 358, lines 9–15. An earlier draft of the site had “either of them”; the record says “either **one** of them”. |
| “I got heartburn over it” | The court denying the directed verdict, ROA p. 344, lines 18–21: “Okay. Motion for DV is denied. But solicitor I got heartburn over it and I am not through thinking about it yet so let’s see what happens.” An earlier draft said “considerable heartburn”; that phrase is not in the record. |

Two more lines from the same colloquy are verified and available if the site ever wants them:
the solicitor’s “the whole point is we don’t know if they acted in concert” (ROA p. 361,
lines 12–13) and the court’s “I will also have to admit that I have never had the state say
they can’t prove who did what” (ROA p. 362, lines 18–19).

**Confirmed against the Supreme Court case file** (the State’s petition for rehearing, the
order of June 12, 2000, both versions of the opinion, and the remittitur):

| Item | Source |
| --- | --- |
| The prosecutor is **L. Mark Moyer, Deputy Solicitor**, Pickens County. | His acceptance of service of the Notice of Intent to Appeal, November 5, 1997. Robert M. Ariail, Solicitor of the Thirteenth Circuit, is the solicitor of record on the opinion; Moyer tried the case. The memoir refers to him by a pseudonym. |
| “The State’s evidence does not place either defendant in the apartment.” | Opinion No. 25093 as filed March 27, 2000, third paragraph of the Law/Analysis. The June 12 order says this paragraph was “modified”: the refiled version reads “failed to place either defendant inside the apartment” and moves the solicitor’s admissions into it. |
| “…it is impossible to hold the individual defendants collectively guilty of Victim’s murder under the legal theories used by the State since neither conspiracy nor accomplice liability were charged to the jury.” | Opinion as filed March 27, 2000, closing sentence of the last three paragraphs of the Law/Analysis. The June 12 order says those paragraphs were “deleted”. The site prints “[the] murder” for “Victim’s murder”. |
| The order of June 12, 2000 | “The opinion heretofore filed in this case … is withdrawn and the attached opinion is substituted in its place. The third paragraph of the Law/Analysis section in the initial opinion has been modified. Furthermore, the last three paragraphs of that section have been deleted. Respondent’s petition for rehearing is denied.” |
| The remittitur | Issued June 28, 2000, to the Clerk of Court, Pickens County. |

**Nothing on the site is now unverified.** `npm test` prints any quotation whose `verify`
flag is set back to `true`, so a new quotation cannot quietly become permanent.

**Three corrections already applied.**

1. The pitch deck said "four and a half years"; the later site PDF says three years and
   eleven months. The site uses three years and eleven months throughout, and a test fails
   if the old figure reappears anywhere.
2. The site said "60+ documented days" of over-detention, then "77 days" — the span between
   the opinion of March 27, 2000 and the version refiled June 12, 2000. That span is real
   and the site still states it, as the timing of the erasure.
3. The over-detention itself is **93 days**, corrected by Michael on September 5, 2026 from
   the case file: the remittitur, the document that returns the case to the trial court,
   issued June 28, 2000, ninety-three days after the opinion that freed him. The reel
   pipeline derives both numbers from the three dates rather than trusting them
   (`four-rules-reels/src/canon.py`), and a test fails if seventy-seven or sixty is ever
   again presented as the over-detention. The Department of Corrections’ actual release
   date is the subject of a pending FOIA request; when it arrives, it can only lengthen the
   figure.

---

## What the tests will not let you do

Not to be obstructive — each one is a mistake that would otherwise reach a reader.

- Publish a placeholder email address, or one of the deck's `[email protected]` leftovers
- Publish the placeholder budget tier `$X–$XM`
- Publish an actor's name as if attached
- Publish figures from the confidential vertical-series market report
- Bring back "four and a half years"
- Link to a page or an anchor that does not exist
- Ship a page with no `h1`, two `h1`s, a skipped heading level, or an unbalanced tag
- Ship an image with no alt text, a button with no accessible name, or a colour pair below
  the WCAG AA contrast floor
- Break the pitch's timeline so a stretch of it renders nothing

---

## If something goes wrong

```bash
rm -rf dist && npm test
```

The build writes `dist/` from scratch every time; there is no cache and no state. If the
tests pass, the site is exactly what the source says it is.
