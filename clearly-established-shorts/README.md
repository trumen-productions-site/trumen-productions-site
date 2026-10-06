# CLEARLY ESTABLISHED: STATEMENTS — the shorts engine

A production engine, plus six pilot episodes, for an animated vertical-shorts series drawn from _Clearly Established_: the true story of Michael Anthony Martin's wrongful conviction and its unanimous reversal by the Supreme Court of South Carolina (_State v. Martin_, Op. No. 25093).

One episode spec plus one human-recorded voice take in; one finished, captioned, brand-correct 9:16 video out, exported for YouTube Shorts, Snapchat Spotlight, Instagram Reels and TikTok, with tests proving each export is correct.

**Status: build privately. Nothing in this folder is published until the release gate is open.**

## Three rules that override everything else

1. **No publishing code.** There is no uploader, scheduler or platform client here, and a test fails the build if one appears. The engine renders files to `out/`. Release is a human act, taken after counsel clears it.
2. **Canon is fixed.** Every fact on screen traces to a key in `config/canon.json`, and a fact card's text must be one of that key's approved forms, verbatim. Banned terms, uncleared real names, untagged facts and day counts that disagree with the dates fail the build.
3. **Human words, human voice.** Michael dictates the lines and records the takes. The engine never writes dialogue, never generates a voice, and never puts recognised speech on screen: captions come from `script.approved.txt` and from nowhere else.

## Install

Node 20 or newer and ffmpeg (with ffprobe) on the path. Then:

```bash
cd clearly-established-shorts
npm install
npm test
```

Remotion needs a Chromium. If a Playwright headless shell is installed at `/opt/pw-browsers` it is used; otherwise Remotion downloads one on first use.

Two optional tools, each one command, each GET-only and done at setup time, never at render time:

```bash
npm run setup:rhubarb    # Rhubarb Lip Sync 1.13.0 (MIT), checksum pinned → tools/rhubarb/
npm run setup:whisper    # whisper.cpp 1.7.4 + the tiny.en model → tools/whisper/
```

Without Rhubarb the mouth is driven by the audio envelope (three shapes); without whisper.cpp the script is aligned to the take by its speech envelope, one segment per line. Both fallbacks are tested. Every manifest names the backends that produced it.

## The seven commands

```bash
npm run new -- --id 007 --slug the-phone-call     # scaffold an episode folder
npm run validate -- --episode 001                 # schema + canon lint (or --all)
npm run preview -- --episode 001                  # Remotion Studio
npm run render -- --episode 001 --preset all      # all four exports, then the probes
npm run render -- --all                           # every episode, every preset
npm run probe -- --episode 001                    # re-run the ffprobe/loudness/manifest checks
npm test                                          # the suite, including a real render of the fixture episode
```

Also: `npm run scratch -- --all` regenerates scratch tracks, `npm run test:renders` probes everything under `out/`, and `npm run check` runs typecheck, lint and tests together.

## How to add an episode in five steps

1. `npm run new -- --id 007 --slug the-phone-call --title "The Phone Call"`.
2. Edit `episodes/007-the-phone-call/episode.json`: pick the set and cast, write the beats against `line:N` anchors, choose the fact card from the canon's approved forms. Put the beat list in `script.approved.txt` as `#` comments. See [docs/EPISODE_AUTHORING.md](docs/EPISODE_AUTHORING.md).
3. `npm run validate -- --episode 007` until it says `ok`.
4. `npm run render -- --episode 007`. With no take yet it renders on the scratch tone bed with `AWAITING TAKE` caption plates.
5. When Michael records: drop `take.wav` into `audio/`, type the lines into `script.approved.txt` exactly as spoken ([docs/RECORDING_GUIDE.md](docs/RECORDING_GUIDE.md)), and render again. The episode re-times itself. No code, no spec edits.

## The release gate

`config/gate.json` ships closed and is edited only by a person:

```json
{
  "counselCleared": false,
  "clearedBy": "",
  "clearedOn": "",
  "clearanceReference": "",
  "episodesCleared": []
}
```

Closed, or episode not listed: a two-second **INTERNAL REVIEW COPY — NOT FOR RELEASE** slate, a persistent watermark, and an `INTERNAL_` filename prefix. Clean renders need every field filled and the episode listed; missing any one fails closed. No flag or environment variable reaches the gate, and `tests/gate.test.ts` scans the repository to prove it on every run.

## What is a placeholder in this build

| Thing              | Status                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Voice**          | Scratch tone bed with one burst per planned line. Replace per the recording guide.                                                                                                                                |
| **Lines**          | None written. Each `script.approved.txt` holds the beat list as comments and `AWAITING MICHAEL'S DICTATED TAKE`.                                                                                                  |
| **Michael's rigs** | Machine-drafted generic figures, flagged `machine-drafted` and `likeness: placeholder` in `rig.json`. To be redrawn from his photos (1996 and today) or by a commissioned illustrator; same group names, drop-in. |
| **Pops, Uncle JP** | Silhouettes until family photos and consents are supplied. Open item on episode 006.                                                                                                                              |
| **Officials**      | Silhouettes with role labels, by rule, until counsel clears names.                                                                                                                                                |
| **Georgia**        | Used only where installed. Otherwise Gelasio, vendored. The manifest says which.                                                                                                                                  |

## The six pilots

| ID  | Title                    | Room                             | The one true thing                                                                    | Canon keys                   |
| --- | ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| 001 | Number One               | Cadillac showroom floor          | At twenty-six he was the top salesman on the board. This is who they arrested.        | cadillac, arrest             |
| 002 | Back Seat                | Inside the car at the drive-thru | The detective driving, the chief beside him, Michael in the back seat.                | driveThru                    |
| 003 | Unanimous                | Courtroom gallery                | He tells the room what the Court said: it should have been impossible to convict him. | reversal, framing            |
| 004 | Ninety-Three Days        | A cell, a wall calendar          | The order was dated March 27. He was still inside. Count the days.                    | overDetention, reversal      |
| 005 | A Record Nobody Can Edit | A telephone, split frame         | Dan's instruction, over the phone; Michael reports the words.                         | dansInstruction, erasure     |
| 006 | The Limousine            | The curb on release day          | A stretch limousine. Pops and Uncle JP. Three years and eleven months.                | releaseDay, timeIncarcerated |

Pilot 004 deviates from the handoff's title (_Seventy-Seven Days_): this repository's record, locked against the case file on September 5, 2026, derives ninety-three days of over-detention from the remittitur; seventy-seven is the erasure. See [docs/COUNSEL_PACKET.md](docs/COUNSEL_PACKET.md).

## How it is built

```
config/        series.json · brand.json · platforms.json · canon.json · gate.json
episodes/      one folder per episode: episode.json, script.approved.txt, audio/
src/
  lib/         schema (zod), canon lint, gate, timing, script, alignment, lipsync,
               captions, scratch, stage, layout, prepare, render, export, probe
  rigs/        one folder per rig: rig.json + SVG with named groups
  sets/        six rooms, cut-paper style
  components/  Rig, Captions, FactCard, TitleLockup, EndCard, Gate, Grain, Scales
  compositions/Episode.tsx   the one Remotion composition
  cli/         new · validate · prepare · preview · render · probe · scratch · setup-tools
assets/        fonts (OFL, with licences) · marks (the supplied TRU★MEN lockup)
tests/         vitest; fixtures include a three-line synthesised take
docs/          RECORDING_GUIDE · EPISODE_AUTHORING · COUNSEL_PACKET · CHANGELOG · REFERENCE_NOTES
out/           renders (gitignored)
```

**Prepare, then render.** `src/lib/prepare.ts` turns an episode folder into one JSON of render data: the alignment, the mouth cues, the resolved beats and cards, the caption plates, the gate decision, the rigs' SVG text. The Remotion composition is a pure function of that data and the frame number. ffmpeg then normalises the audio to −14 LUFS under a −1 dBTP ceiling (measured gain plus a peak limiter, corrected until it lands), muxes, and writes each preset's MP4, `.srt`, `.vtt`, poster and `manifest.json` (SHA-256 of every output, the git commit, the gate state, the hashes of the take and the script).

**Rigs are data.** The engine reads group names only (`head`, `brow_l`, `eye_r`, `mouth-D`, `arm_l`…), prefixes the ids so several rigs share a page, and drives them with a stylesheet per frame. An illustrator's SVG with the same groups drops in.

**Captions sit inside every preset.** Plates are laid out in the union of the four safe zones, and the suite measures that on rendered pixels using a probe-mask render.

## Tests

`npm test` runs 134 tests in 11 files: the unit suites, then a real render of the fixture episode (about two minutes on four cores):

| Area      | What is proved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema    | the fixture spec passes; removing each required field fails with a message naming it; anchors accept four forms only                                                                                                                                                                                                                                                                                                                                                                                                     |
| Canon     | every banned term fails; an unlisted real name fails; a title followed by a name fails; an untagged fact card fails; a non-approved form fails; every key resolves; the day counts derive from the dates; the record agrees with the reel set                                                                                                                                                                                                                                                                            |
| Timing    | line anchors resolve from a fixture alignment; a new alignment re-times with no spec edit; the hook deadline                                                                                                                                                                                                                                                                                                                                                                                                             |
| Alignment | the energy aligner finds the three lines of the fixture take at full confidence; mismatched line counts drop confidence and name the line; the whisper aligner parses token JSON and matches a deliberately imperfect recognition without ever replacing script text                                                                                                                                                                                                                                                     |
| Lip-sync  | the fixture WAV yields a contiguous viseme sequence; the fallback engages when Rhubarb is absent; Rhubarb's nine-shape output when present                                                                                                                                                                                                                                                                                                                                                                               |
| Captions  | plates never exceed three words; reassembled text equals the approved script byte for byte after normalisation; sidecars                                                                                                                                                                                                                                                                                                                                                                                                 |
| Gate      | the default gate renders INTERNAL; each clearance field missing in turn fails closed; an unlisted episode fails closed with the series cleared; no environment variable or flag reaches the gate; nothing writes gate.json; no dependency or source references a platform API or upload client                                                                                                                                                                                                                           |
| Brand     | TRU★MEN is the only form of the name outside the banned list; the palette matches the reel set and the site; fonts carry their licences; nothing fetches from the network                                                                                                                                                                                                                                                                                                                                                |
| Render    | the fixture episode exports on all four presets; ffprobe (codec, profile, 1080×1920, 30 fps, yuv420p, AAC 48 kHz stereo, duration); loudness within ±0.5 LU of −14 LUFS and true peak ≤ −1 dBTP; the slate and watermark on rendered pixels; caption and card bounding boxes inside every preset's safe zone on sampled frames; still frames at hook, declaration, reaction and end card against committed baselines; manifest hashes match the files and a tampered file is caught; the end card uses brand tokens only |

`npm run render -- --all` followed by `npm run test:renders` probes all twenty-four exports.

## Documentation

- [docs/RECORDING_GUIDE.md](docs/RECORDING_GUIDE.md) — for Michael: how to record and drop in a take
- [docs/EPISODE_AUTHORING.md](docs/EPISODE_AUTHORING.md) — the spec, anchors, beats, cards, canon keys, rig format
- [docs/COUNSEL_PACKET.md](docs/COUNSEL_PACKET.md) — for Alexa Whiteside: what this is, that nothing is published, the gate, licences, open questions
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — platform checks, brand values, rig provenance
- [docs/REFERENCE_NOTES.md](docs/REFERENCE_NOTES.md) — Michael's notes on the reference short, which take precedence over defaults

© 2026 Revelatory Productions, LLC, doing business as TRU★MEN Productions.
