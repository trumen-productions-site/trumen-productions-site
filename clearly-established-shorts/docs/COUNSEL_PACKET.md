# Counsel packet — CLEARLY ESTABLISHED: STATEMENTS (animated shorts)

_Prepared for Alexa Whiteside, Esq., counsel of record. From Revelatory Productions, LLC d/b/a TRU★MEN Productions. October 6, 2026._

## What this is

A production engine, plus six pilot episodes, for a series of short animated vertical videos drawn from _Clearly Established_, Michael Anthony Martin's account of his wrongful conviction and its unanimous reversal by the Supreme Court of South Carolina (_State v. Martin_, Op. No. 25093). In each episode an animated Michael stands in a room from the record and says one true thing; the room reacts; cut to the title card. Michael dictates and records every line himself. The engine animates them, captions them from his typed script, and exports files for YouTube Shorts, Snapchat Spotlight, Instagram Reels and TikTok.

The working title, _CLEARLY ESTABLISHED: STATEMENTS_, is held in one config file and has had no public use.

## Nothing is published

The engine renders files to a folder on disk. It contains no uploader, no scheduler, no API client for any platform, and no code that posts. The test suite scans the repository and its dependencies on every run and fails if any such code or dependency appears. Release is a human act, taken after you clear it.

## How the release gate works

`config/gate.json` is edited only by a person. It ships closed:

```json
{
  "counselCleared": false,
  "clearedBy": "",
  "clearedOn": "",
  "clearanceReference": "",
  "episodesCleared": []
}
```

While it is closed, or while an episode is not listed in `episodesCleared`, every render of that episode opens with a two-second slate reading **INTERNAL REVIEW COPY — NOT FOR RELEASE**, carries that text as a persistent watermark on every frame, and is written to a filename beginning `INTERNAL_`. A clean render requires all of: `counselCleared: true`, a named `clearedBy`, a `clearedOn` date, a `clearanceReference`, and the episode id in the list. Missing any one fails closed. There is no flag, environment variable or option that bypasses it; a repository-wide test proves the gate module reads nothing but the file and the episode id, and that no engine code writes the file.

Every exported file is accompanied by a `manifest.json` recording the SHA-256 of each output, the git commit, the gate state at render time, and the hashes of the recording and the typed script it was built from. That manifest is the provenance record for any file that leaves the building.

## The record

Every fact that appears on screen traces to a key in `config/canon.json`, and the text of a fact card must be one of that key's approved forms, word for word. The build fails on any banned term, on any real name of an official that you have not cleared, on any date or number without a canon key, and on any day count that disagrees with the arithmetic of the three dates in the record (opinion March 27, 2000; refiled opinion June 12, 2000; remittitur June 28, 2000).

**One deviation from the written handoff, for your attention.** The handoff of October 6, 2026 lists the over-detention as seventy-seven days and titles the fourth pilot _Seventy-Seven Days_. This repository's record, locked by Michael on September 5, 2026 against the Supreme Court case file and already in force on the company website and the reel set, derives **ninety-three days** from the March 27 order to the June 28 remittitur, and holds **seventy-seven** as the span of the erasure (opinion to refiled opinion). The engine follows the repository's record: pilot 004 is _Ninety-Three Days_, its card reads "Ordered freed March 27, 2000. Held ninety-three more days.", and the erasure's seventy-seven days belongs to pilot 005. The build fails if seventy-seven is ever presented as the detention. If Michael and you settle on a different figure, the change is one number in `config/canon.json` and one title; the lint then enforces the new figure everywhere.

## Third-party software and licences

| Component                                      | Licence                                                | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remotion** (renderer) 4.0.533                | Remotion Licence, two tiers                            | Free Licence terms, read from the package on October 6, 2026: free for "an individual" or "a for-profit organization with up to 3 employees", for commercial use, to create videos. Revelatory Productions, LLC, as a two-principal company, appears to qualify for the Free Licence. **Please confirm the employee count against Remotion's definition** (remotion.pro/faq); above three employees a Company Licence is required. The licence also notes terms will "slightly change" in Remotion 5.0; the engine pins 4.0.533. |
| Rhubarb Lip Sync 1.13.0 (optional)             | MIT                                                    | Lip-sync data produced by the tool "belongs to you alone" (its licence summary). Installed on demand; not vendored.                                                                                                                                                                                                                                                                                                                                                                                                              |
| whisper.cpp 1.7.4 + `tiny.en` model (optional) | MIT (code); model weights released by OpenAI under MIT | Used for word timing only, never for caption text. Installed on demand; not vendored.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Gelasio (typeface)                             | SIL Open Font License 1.1                              | Vendored with its licence. Metric-compatible stand-in for Georgia, which is used only where it is already installed.                                                                                                                                                                                                                                                                                                                                                                                                             |
| Poppins Bold Italic (wordmark)                 | SIL Open Font License 1.1                              | Vendored with its licence. Used for the TRU★MEN wordmark only, and only if the supplied lockup is missing.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ffmpeg                                         | LGPL/GPL, system install                               | Called as an external program; not distributed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

No network call is made at render time. No analytics. No third-party font is fetched at runtime.

## Authorship of the artwork

Every character rig and every set in this build was machine-drafted and is flagged `"provenance": "machine-drafted"` in its `rig.json`. Artwork generated this way may not be protectable by copyright and may carry disclosure obligations at registration. The rig format was designed so that TRU★MEN can commission a human illustrator for the final character designs without touching code: a replacement SVG with the same group names drops in. No real person's likeness was used: Michael's rigs are generic placeholders until he supplies reference photos, and every other real person is a faceless silhouette with a role label. No AI image generation of any real person occurs anywhere in the pipeline, and a test fails the build if a rig contains a raster image.

## Open questions, each with the default now in force

1. **Real names of officials in short-form.** The judge, the solicitor, the officers. _Default: role labels only ("the detective", "the chief", "the judge"). `realNamesCleared` is empty; a name outside it fails the build._ Dan Stacey's name is permitted because episode 005 honours him through the record; he is never voiced.
2. **Machine-drafted artwork versus a commissioned human illustrator, and the effect on copyright registration.** _Default: machine-drafted rigs flagged as such; the format is ready for replacement._
3. **Whether the shorts are registered as separate works or as derivative of Block One / the memoir.** _Default: no registration action taken by this build._
4. **Likeness consents for family members depicted.** Pops and Uncle JP in episode 006. _Default: no family rig is built without supplied photos and consent; both are silhouettes, logged as an open item in the spec._
5. **Whether the animated series falls inside the Class 41 filing as drafted.** _Default: no public use of the series title; it is a working title held in one file._
6. **Whether release waits for the book-deal sequencing already decided for the screen lanes.** _Default: gate closed._

A seventh item arising from this build: **the day count in open question form** — ninety-three (repository record) versus seventy-seven (handoff) for the over-detention, as described above. _Default: ninety-three, derived from the remittitur._

## What exists today

Six pilots, specified and staged, each rendering end to end on all four presets with a scratch tone track in place of Michael's voice; twenty-four INTERNAL files with captions, sidecars, posters and manifests. No dialogue has been written by anyone but Michael, and he has not yet recorded. When he does, each episode re-times itself to his take with no further changes.
