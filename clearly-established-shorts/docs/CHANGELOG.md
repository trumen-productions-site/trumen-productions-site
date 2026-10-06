# Changelog

Every platform-spec check, brand value change and rig provenance change is recorded here.

## 2026-10-06 — Rev. 1.0 build

### Platform specifications checked before the first render

Working defaults from the handoff were checked against current published specifications. Official pages were preferred; where the proxy on the build machine blocked an official page, the secondary sources used are named. Values in `config/platforms.json` after the check:

| Preset         | Max length kept     | Finding                                                                                                                                                                                                                                                                                      | Sources                                                                                                                         |
| -------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| youtube-shorts | 180 s               | The Shorts limit rose from 60 s to 3 min in October 2024; 9:16, 1080×1920, 30 fps recommended. Google's help page could not be fetched from the build machine; three secondary guides agree.                                                                                                 | piktochart.com, async.com, blitzcutai.com (2026 guides)                                                                         |
| snap-spotlight | 60 s (conservative) | Snap's help centre gives a 5-second **minimum** and confirms monetisation of videos longer than one minute since February 1, 2025; the maximum is not stated on the official page. Secondary sources report 3 min. The handoff's 60 s is kept as the working ceiling until Michael confirms. | help.snapchat.com ("What makes Snaps eligible for Spotlight?", "About Snapchat's Monetization Program"); opus.pro, ayrshare.com |
| ig-reels       | 90 s (conservative) | Instagram's help centre: reels up to 20 min; **reels over 3 min are not recommended to new audiences**; a reel boosted as an ad must be 90 s or less, 9:16. The handoff's 90 s keeps every episode boostable. 30 fps minimum, 720 px minimum resolution.                                     | help.instagram.com (1038071743007909, 570215404599013, 2720958398006062)                                                        |
| tiktok         | 180 s               | TikTok support: in-app recordings up to 10 min, uploads up to 60 min. 180 s is a series decision, not a platform limit. Secondary guidance on UI overlays (108 px top, 320 px bottom, 60 px left, 120 px right at 1920 px tall) sits inside the handoff's margins.                           | support.tiktok.com (camera tools), newsroom.tiktok.com; houseofmarketers.com                                                    |

Safe-zone margins were left at the handoff's values, which are at or beyond every figure found. Captions and cards are laid out inside the **union** of all four zones (12 % top, 22 % bottom, 6 % left, 14 % right), so one layout is inside every preset's safe zone; this is measured on rendered pixels by the test suite.

### Brand values

- Palette: the handoff's provisional values (`#0E1B33`, `#F3ECDC`, `#B08D3C`, `#2F6B4F`) were **replaced on adoption** by the locked July 12, 2026 sheet already in this repository: navy `#0B1F3A`, cream `#F3EBDD`, brass `#B08D57`, section green `#2E6B4F`, gold `#D4AF37`. Ink `#0A0A0A` is kept from the handoff. A test asserts the shorts, the reel set and the site agree.
- Company mark: the supplied lockup (`trumen-lockup.png`, 2400×1131, navy field) is used as-is on the end card, copied from the reel set's brand folder. The typeset Poppins placeholder is used only if the file is missing, and the manifest says so.
- Type: Georgia is used only where installed on the render machine; otherwise Gelasio (SIL OFL), vendored from `@fontsource/gelasio` 5.3.0 with its licence. Poppins Bold Italic vendored from `@fontsource/poppins` 5.3.0. The typeface in force is recorded in every manifest. On the build machine Georgia was not installed, so the pilots were rendered in Gelasio.

### Record

- Over-detention held at **93 days** (this repository's lock of 2026-09-05, from the remittitur of June 28, 2000); erasure 77 days. The handoff's "seventy-seven days" for the detention is logged as an open item in the counsel packet. Pilot 004 is titled _Ninety-Three Days_.
- Motive terms from the reel set's record ("quietly", "in order to", …) are carried as **warnings**, not failures, so Michael's own dictation is not blocked by them.

### Rig provenance

All rigs machine-drafted on 2026-10-06, flagged `machine-drafted` (lead rigs) or `silhouette`:

- `michael-present` — placeholder, not drawn from photos
- `michael-26` — placeholder, not drawn from photos
- `silhouette-figure`, `silhouette-seated`, `silhouette-crowd` — faceless, role-labelled

### Tooling

- Rhubarb Lip Sync 1.13.0 (MIT) installed by `npm run setup:rhubarb`, archive SHA-256 `bd260905e88d0bdadbd4d7b452cae3b78a880fe27d10d51586772f84aac69f71`. Verified on the build machine.
- whisper.cpp 1.7.4 builds via `npm run setup:whisper`; the `tiny.en` model download (huggingface.co) was blocked by the build machine's proxy, so the whisper aligner is exercised against a hand-built fixture in whisper's JSON shape and the pilots were prepared with the energy aligner. Any machine that can reach huggingface.co gets whisper word timing with the same command.
- Remotion 4.0.533; Chromium's default GL renderer. The software renderer ("swangle") measured 1.2 fps against 12.6 fps with no visible difference (SSIM 0.993 on a sampled frame), so it is off.
- Render of 001 on the build machine: 714 frames in about 60 s; the full set of 24 exports in about 10 minutes.
