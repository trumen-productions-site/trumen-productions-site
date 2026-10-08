# “Four Rules” Reel Set — *Clearly Established*

Three 60-second vertical reels (1080×1920) built from a deterministic,
re-runnable pipeline, plus a QC report.

**Nothing here is published.** Output is inventory held behind the legal gate in
§9 of the handoff — the Class 41 ITU filing, counsel review of the
deleted-language lines, and an audited pinned comment. `make all` renders;
nothing uploads, schedules, or posts.

| Reel | Archetype | Hook mechanic | Comment gate |
| --- | --- | --- | --- |
| 1 — The Four Rules | Systemic / two-fact · **hot** | “Rules they used on me” | RECORD |
| 2 — Four Documents | The document reveal · **cold** | “All four are public” | RECORD |
| 3 — Four Numbers | The clock · **medium** | “You won’t believe the fourth” | STORY |

THE MAN and the CTA shape are identical across all three — they are the control.
The only variable under test is which four-beat frame earns the turn.

---

## Run it

```bash
make install     # ffmpeg, espeak-ng, tesseract, EB Garamond, pip deps (once)
make all         # render all three reels, then QC
make reel-2      # render one
make qc          # re-run QC on existing renders, no re-encode (~2s)
make test        # pytest
make clean       # remove renders; leaves supplied voiceover alone
```

Output lands in `out/`: three MP4s, three `.srt` sidecars, five thumbnails per
reel, and `QC_REPORT.md`.

A full render is about five minutes for the set on a modest machine — 1,800
frames per reel, composed and encoded one at a time.

---

## Swapping in the real voiceover

The renders ship with a **placeholder voiceover** from espeak-ng. It sounds like
a placeholder. That is the point: it holds the timing so the cuts, the captions
and the ducking are all real, and it is meant to be replaced.

```bash
cp ~/michael-reel-1.wav audio/vo/reel-1-four-rules.wav
make reel-1
```

That is the whole procedure. No code changes, no config.

**What happens to the timing.** With the placeholder, each scene is spoken
separately, so its exact length is known and every line sits inside its own cut.
A supplied recording is one continuous file with no scene boundaries in it, and
there is no offline forced-alignment tool available here (Whisper needs a model
download; the render environment has no network). So if a human read differs
from the authored 60 seconds by more than a quarter-second, scene boundaries are
stretched **proportionally** to fit, and `QC_REPORT.md` says so explicitly, with
the factor applied. If you want the cuts to land on specific words rather than
proportionally, record scene by scene into `audio/vo/_scenes/` and say so — the
pipeline already works that way internally.

### Choosing a better placeholder while you wait

Until the real read exists, the placeholder engine is one token in
`brand/tokens.json` — `audio.vo_engine`. Every option is offline and free; the
table is ordered worst to best.

| `vo_engine` | What it is | Needs |
| --- | --- | --- |
| `espeak` | Formant synthesis. Plainly a computer. | `espeak-ng` (in `make install`) |
| `mbrola-us1`, `mbrola-us2`, `mbrola-us3` | MBROLA diphone voices; `us1` is female, `us2` and `us3` male, `us3` lower. | `apt install mbrola mbrola-us1 mbrola-us2 mbrola-us3` |
| `flite-awb` | CMU Flite clustergen, male, lighter. | `apt install flite` |
| `flite-rms` | CMU Flite clustergen, male, deep. The best male of the offline set. | `apt install flite` |
| `flite-slt` | CMU Flite clustergen, female. **The current placeholder**, chosen by Michael on September 5, 2026 until he records. | `apt install flite` |
| `piper:<file>.onnx` | Neural. A real step up from everything above. | `pip install piper-tts` and a voice file in `audio/vo/voices/` |

Piper voices (`en_US-ryan-high` is a good male read, about 115 MB with its
`.json`) are published at `huggingface.co/rhasspy/piper-voices`. They cannot be
fetched from the render environment, so download the `.onnx` and its `.json` on
a machine with a browser and drop both into `audio/vo/voices/`.

Cloud voices — ElevenLabs, OpenAI, Google — are excluded from the render by the
handoff (no paid APIs, no network at render time). If you want one for review
copies, generate each script as a single WAV on your side and drop it in exactly
as you would the real recording, above. The pipeline cannot tell the difference
and does not need to.

`QC_REPORT.md` names the engine used on every run, so a review copy can never be
mistaken for the finished read.

---

## What is a placeholder in this build

`QC_REPORT.md` lists these on every run so they can never be silently inherited.

| Thing | Status |
| --- | --- |
| **Voiceover** | Synthesis, engine named in the report (`audio.vo_engine`; currently `flite-slt`, a female clustergen voice). Replace per above. |
| **Music bed** | Synthesised pad — a sustained low drone with a slow swell. No CC0 bed can be fetched offline. See `audio/bed/LICENCE.txt`: it is an original work with nothing to clear, and it is still a placeholder. |
| **Body serif** | Georgia is a Microsoft core font and is not licensable here, so the handoff’s own named fallback is used: **EB Garamond**. Never a sans. |

### The lockup

The brand rules say the end-card lockup is supplied, must be used as-is, and
must **never be rebuilt from type**. It is: `brand/viri-veri-lockup.png` is the
2400×914 lockup rendered from the supplied `brand/viri-veri-lockup.svg` (“VIRI★VERI
VERI on navy”), whose field is the exact brand navy `#0B1F3A`, so it sits on
the end card without a seam. It is scaled to 820px wide and centred.

If the file is ever missing, the pipeline draws a structural placeholder from
type and says so in `QC_REPORT.md` on every render, so the substitution cannot
go unnoticed.

---

## How it is built

```
brand/       tokens.json (the locked palette, type scale, safe areas) + reference marks
scripts/     one JSON per reel — the locked copy, transcribed verbatim
src/
  canon.py     the record. Verified before a frame is drawn; the build FAILS on
               a contradiction, a banned phrase, or an unrecognised number
  timeline.py  script JSON → timed cuts, and voiceover reconciliation
  scenes.py    one renderer per scene type
  captions.py  burned-in cues + the .srt sidecar
  audio.py     voiceover, synthesised bed, ducking, loudness
  qc.py        the ten checks
  build.py     the entry point
  brand.py     tokens, fonts and drawn marks (added; see below)
tests/       pytest — 52 tests, none of which render a video
out/         renders, sidecars, thumbnails, QC_REPORT.md
```

**One addition to the handoff's file list:** `src/brand.py`. Three modules and
the tests all need the same answer to "which font is actually in force" and "how
big is the safe area", and three copies of that answer is how a brand drifts.

### Why not moviepy

The handoff allows moviepy or remotion, with a justification. Neither is used.

moviepy is a convenience layer over exactly the ffmpeg pipe this build already
needs, and it brings imageio, imageio-ffmpeg, decorator and proglog with it —
four dependencies whose only job is to construct that command. Every scene here
is a Pillow composite anyway, so moviepy would be wrapping our own frames to
hand them to a binary we already call directly. Piping raw frames straight to
ffmpeg is fewer moving parts, byte-for-byte reproducible, and keeps the encoder
settings visible in one place instead of behind a helper's defaults.

Total Python dependencies: Pillow, numpy, pytest.

### Determinism

Two runs of `make all` produce identical files. The only thing that would
otherwise be random is the film grain, which is generated from a fixed seed
(`src/scenes.py:_grain_tiles`) and cycled through twelve pre-rendered tiles.
There is a test for this.

---

## The record

`src/canon.py` is the single source of truth, and it is enforced, not just
documented. Every script is verified before rendering:

- **The day counts are derived, never asserted.** `check_arithmetic()` computes
  March 27 → June 12, 2000 (the erasure, 77 days) and March 27 → June 28, 2000
  (the remittitur, 93 days) and fails the build if either is off, and fails
  again if `over_detention_days` ever stops equalling `days_to_remittitur`.
  A script that presents seventy-seven as the detention fails too: seventy-seven
  is how long the erasure took, ninety-three is how long he was held.
- **Twelve banned phrases** fail the build in voiceover *or* on-screen text.
  They are the ones that supply a motive the record does not establish
  (“quietly”, “in order to”, “they knew”) or state a legal conclusion no court
  reached (“illegally detained”).
- **Every number is whitelisted.** A number that is not in the record has no
  business in a reel, so anything unrecognised fails loudly rather than
  passing quietly.
- **The finding must be stated in full**, at least once per reel, and may be
  neither softened to a procedural win nor sharpened to proven innocence.

The deletion is stated. It is never motivated.

---

## QC

Eleven checks run after every render and write `out/QC_REPORT.md`. A check that
cannot be performed is reported as **SKIP** with its reason — never as a pass.

1. Duration 59.5–60.5s, 1080×1920, 30fps, H.264/yuv420p, AAC
2. First frame carries the hook text — OCR'd with tesseract, asserted against
   the script's own string
3. Every on-screen element inside the safe area
4. No two text elements overlap, and nothing runs into the caption band
5. Canon: the 77- and 93-day arithmetic, the number whitelist, the banned
   phrases, the finding present
6. Loudness at −14 LUFS, true peak under −1 dBTP, no clipping
7. Music silent before the turn, present after
8. End card holds ≥3s and carries §, scales and the mark
9. `.srt` cue count matches the burned-in cues; no cue over two lines
10. pytest green
11. No missing glyphs — *one check beyond the handoff's ten, added because a
    render needed it*

### A note on the fonts

Two defects came out of looking at rendered frames rather than at code.

EB Garamond's cmap lists U+2013 and its outline is **empty**, so reel 3's `5–0`
rendered as `5□0` — in the middle of the beat that says *every justice, zero
dissents*. A coverage check passes that; only rendering the character catches
it. Hence check 11, which draws each character and compares it against the
font's own `.notdef` box.

The same face sets **old-style figures** — 2 at x-height, 3 and 7 descending.
Correct in running prose, wrong for a 220px number that is the whole frame:
`26` reads as a typo. The font carries no `lnum` feature to switch with (tested:
the before and after renders were byte-identical), so display figures come from
FreeSerif instead. Prose stays in EB Garamond. Numerals from a separate cut is
ordinary typographic practice, not a compromise.

### A note on the loudness stage

Getting to −14 LUFS took three attempts and the reasons are worth recording,
because the same trap is waiting for the real voiceover.

`loudnorm`'s own normalisation is dynamic — it decides how hard to work while
listening — and on material that opens in silence it lands a decibel or two off.
Measuring and applying a single linear gain is exact, but a synthesised read has
a high crest factor: peaky and quiet. Lifting it to target by fader puts the
transients through the ceiling; holding the ceiling by fader leaves it four
decibels short. So the pipeline lifts, limits the transients, measures again and
trims — and aims 1.2 dB below the true-peak ceiling because AAC reconstruction
overshoots its source by about a decibel. That last figure is
`aac_headroom_db` in `brand/tokens.json`.

---

## Gate

Do not upload, schedule, or post anything from `out/`. These reels use the title
*Clearly Established* commercially. Publication is hard-gated on:

1. Class 41 ITU filing confirmation (Alexa Whiteside, WAM Entertainment Law)
2. Counsel review of the deleted-language lines — R1 turn, R2 beat 3, R3 turn
3. Pinned-comment copy drafted and audited; it is copy, and the same rules apply

Build everything. Ship nothing.
