# Authoring an episode

An episode is a folder under `episodes/` named `<id>-<slug>` holding four things:

| File                  | What it is                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `episode.json`        | The spec: set, cast, beats, cards, scratch plan. Validated by zod and the canon lint.                                   |
| `script.approved.txt` | Michael's dictated lines, exactly as recorded. Ships as the beat list in comments until the take exists.                |
| `audio/take.wav`      | Michael's recording. Absent until he records; the engine then switches from scratch to take mode on its own.            |
| `audio/scratch.wav`   | Placeholder tone bed with one burst per planned line, generated from `scratchLines`. Regenerate with `npm run scratch`. |

Scaffold one with `npm run new -- --id 007 --slug the-phone-call --title "The Phone Call"`, then edit `episode.json`.

## The spec

```json
{
  "id": "003",
  "slug": "unanimous",
  "title": "Unanimous",
  "targetSeconds": 45,
  "set": "courtroom-gallery",
  "cast": [
    { "rig": "michael-present", "role": "lead", "position": "center" },
    { "rig": "silhouette-crowd", "role": "room", "position": "background" }
  ],
  "audio": { "take": "audio/take.wav", "scratch": "audio/scratch.wav" },
  "script": "script.approved.txt",
  "scratchLines": [3.0, 3.8, 3.4, 3.0, 2.6],
  "beats": [
    { "id": "hook", "at": "0.0", "action": "lead_enters", "expression": "level" },
    {
      "id": "declaration",
      "at": "line:3",
      "action": "lead_steps_forward",
      "camera": "push",
      "expression": "resolve"
    },
    { "id": "reaction", "at": "line:5", "action": "room_reacts", "variant": "stillness" },
    { "id": "button", "at": "end-3.0", "action": "hold_on_lead" }
  ],
  "cards": [
    {
      "at": "end-2.5",
      "type": "fact",
      "text": "March 27, 2000. Unanimous.",
      "canonKey": "reversal"
    },
    { "at": "end-1.5", "type": "title" }
  ]
}
```

### Anchors

Every `at` is one of:

| Form                            | Meaning                                         |
| ------------------------------- | ----------------------------------------------- |
| `"12.5"`                        | seconds from the start of the take              |
| `"line:3"`                      | the moment line 3 of the approved script begins |
| `"line:3.end"`                  | the moment line 3 ends                          |
| `"end"`, `"end-2.5"`, `"end+1"` | relative to the end of the take                 |

Line anchors resolve from the alignment of the take, so re-recording re-times the whole episode with no spec edit. Before the take exists they resolve from `scratchLines`, which gives each placeholder line a length in seconds; the scratch track is built from the same numbers.

**The hook must land inside the first 2.0 seconds** (`hookDeadlineSeconds` in `config/series.json`). Validation fails otherwise.

### Sets

`cadillac-showroom`, `car-back-seat`, `courtroom-gallery`, `cell-calendar`, `telephone-split`, `release-curb`. Each is a React component in `src/sets/`, drawn in the cut-paper style from the brand palette. A set receives the time, the room's dim level and the reaction variant.

### Cast

| Field      | Values                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `rig`      | a folder under `src/rigs/`: `michael-present`, `michael-26`, `silhouette-figure`, `silhouette-seated`, `silhouette-crowd` |
| `role`     | `lead` (exactly one; speaks, lip-syncs, takes the lead actions), `room` (reacts), `support` (present, reacts)             |
| `position` | `center`, `left`, `right`, `background`, `split-left`, `split-right`, `back-seat`, `front-left`, `front-right`            |
| `label`    | optional role label drawn beneath a silhouette: `"the detective"`, `"the chief"`, `"Pops"`                                |

Real people other than Michael, David, Pops and Uncle JP are silhouettes with role labels. Labels pass through the canon lint, so `"Judge Floyd"` fails until counsel adds the name to `realNamesCleared`.

### Beats

| `action`                           | What happens                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lead_enters`                      | the lead slides in from the left over 0.9 s                                                                                                                                         |
| `lead_steps_forward`               | scale up 7 %, pose to `address`                                                                                                                                                     |
| `lead_turns_to_room`               | head turns 12°                                                                                                                                                                      |
| `lead_looks_down`, `lead_looks_up` | pose to `hands_down` / `open`                                                                                                                                                       |
| `lead_lifts_receiver`              | pose to `receiver` (the telephone)                                                                                                                                                  |
| `room_reacts`                      | the room reacts per `variant`: `stillness` (idle stops, light drops 10 %), `turn` (silhouettes turn to the lead), `look_away`, `lights_down` (38 %), `murmur` (staggered head bobs) |
| `hold_on_lead`                     | the lead settles; idle motion halves                                                                                                                                                |

`expression` on a lead action sets the face and persists: `level`, `resolve`, `quiet`, `weary`, `warm`, `hard`. `camera`: `hold`, `push` (6 % over 3.2 s), `pull`, `drift`.

Every beat needs a unique `id`; `hook` is required. Beats named `declaration` and `reaction` also pick the poster frame and the snapshot frames.

### Cards

A `fact` card needs `text` and a `canonKey`. The text must be, verbatim, one of that key's `forms` in `config/canon.json`; anything else fails. A card with a date, a number, or a word like _unanimous_ and no `canonKey` is untagged factual text and fails. The `title` card takes no text; its anchor is where the title lockup begins.

The end card runs in a fixed order: fact card, title lockup (green § above the title, scales beneath), _Written by Michael Anthony Martin & David Alexander Martin_, then the TRU★MEN lockup with VIRI VERI. Durations are in `config/series.json → endCard`. The episode's length is the take plus those three holds.

### Canon keys

`case`, `arrest`, `conviction`, `trialCourt`, `trialCounsel`, `appellateCounsel`, `reversal`, `framing`, `erasure`, `timeIncarcerated`, `overDetention`, `cadillac`, `driveThru`, `dansInstruction`, `releaseDay`, `birthplace`. `familyLand` exists but is out of scope for the pilots and fails if carded. Add approved forms to a key's `forms` list, never to a spec.

## Commands

```bash
npm run validate -- --episode 003     # schema + canon lint, prints the gate state
npm run preview -- --episode 003      # Remotion Studio, scrub it frame by frame
npm run render -- --episode 003       # all four presets, then the probes
npm run render -- --episode 003 --preset tiktok
npm run render -- --all
npm run probe -- --episode 003        # re-run the checks on existing exports
npm run scratch -- --episode 003      # regenerate the scratch track after changing scratchLines
```

Output: `out/<folder>/<preset>/` with the MP4, `.srt`, `.vtt`, a poster PNG and `manifest.json`. Filenames carry `INTERNAL_` while the gate is closed.

## Rigs

A rig is a folder under `src/rigs/<name>/` with `rig.json` and one SVG. The SVG has named groups: `head`, `brow_l`, `brow_r`, `eye_l`, `eye_r`, `mouth` (with children `mouth-A` … `mouth-H`, `mouth-X`, the Rhubarb set), `torso`, `arm_l`, `arm_r`, `hand_l`, `hand_r`. The engine reads group names only; it prefixes the ids so several rigs share a page and drives the groups with a stylesheet each frame. `rig.json` lists the pivot points, the poses (arm, hand, head and lean angles) and the expressions (brow lift, brow tilt, eye openness, head tilt), the blink cadence, the provenance (`machine-drafted`, `human-illustrated`, `silhouette`) and what the likeness is based on.

To replace a rig with a commissioned illustration: draw it on the same 600×1000 viewBox with the same group names, update the pivots and `likeness`, set `provenance` to `human-illustrated`, and run `npm test`. Nothing in the code changes.
