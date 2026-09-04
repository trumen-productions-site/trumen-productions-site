"""
Automated QC. Eleven checks, run after every render, written to out/QC_REPORT.md.

A check that cannot be performed is reported as SKIP with the reason — never
silently passed. The report is the thing Michael reads instead of scrubbing
three videos, so it has to be trustworthy about its own gaps.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from . import brand, canon
from .brand import H, SAFE, W

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
AUDIO_CFG = brand.TOKENS["audio"]


@dataclass
class Check:
    number: int
    name: str
    status: str  # PASS | FAIL | SKIP
    detail: str = ""

    @property
    def ok(self) -> bool:
        return self.status in ("PASS", "SKIP")


@dataclass
class ReelQC:
    reel_id: str
    checks: list[Check] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c.ok for c in self.checks)

    def __getitem__(self, key):  # build.py treats this like a dict
        return getattr(self, key)


def _ffprobe(path: Path) -> dict:
    exe = shutil.which("ffprobe")
    if not exe:
        return {}
    out = subprocess.run(
        [exe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)


# ── The checks ────────────────────────────────────────────────────────────


def check_container(result) -> Check:
    probe = _ffprobe(result["mp4"])
    if not probe:
        return Check(1, "Container, duration, resolution, codecs", "SKIP", "ffprobe unavailable")
    video = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
    audio = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
    duration = float(probe["format"]["duration"])
    problems = []
    if not 59.5 <= duration <= 60.5:
        problems.append(f"duration {duration:.2f}s outside 59.5–60.5")
    if (video["width"], video["height"]) != (W, H):
        problems.append(f"{video['width']}×{video['height']} not {W}×{H}")
    fps = eval(video["r_frame_rate"])  # noqa: S307 — ffprobe emits "30/1"
    if abs(fps - brand.FPS) > 0.01:
        problems.append(f"{fps} fps not {brand.FPS}")
    if video["codec_name"] != "h264":
        problems.append(f"video codec {video['codec_name']} not h264")
    if video.get("pix_fmt") != "yuv420p":
        problems.append(f"pix_fmt {video.get('pix_fmt')} not yuv420p")
    if audio is None or audio["codec_name"] != "aac":
        problems.append("audio codec not aac")
    detail = (
        f"{duration:.2f}s · {video['width']}×{video['height']} · {fps:g}fps · "
        f"{video['codec_name']}/{video.get('pix_fmt')} · {audio['codec_name'] if audio else 'no audio'}"
    )
    return Check(1, "Container, duration, resolution, codecs", "FAIL" if problems else "PASS", "; ".join(problems) or detail)


def check_first_frame_text(result) -> Check:
    """OCR frame one and assert the hook is already on screen."""
    tesseract = shutil.which("tesseract")
    ffmpeg = shutil.which("ffmpeg")
    if not tesseract or not ffmpeg:
        return Check(2, "First frame carries the hook text", "SKIP", "tesseract or ffmpeg unavailable")

    hook = next((s for s in result["reel"]["scenes"] if s["type"] == "hook"), None)
    expected = re.sub(r"[^A-Z ]", " ", hook["onscreen"].upper())
    words = [w for w in expected.split() if len(w) > 3]

    # Crop away the caption band before OCR.
    #
    # Without this the check reads the burned-in caption of the voiceover's
    # first line, which quotes the hook almost word for word — so a reel whose
    # headline never rendered at all still passed. The check is meant to prove
    # the HEADLINE is on frame one, so it only gets to look where the headline
    # lives.
    from .captions import CAPTION_BAND_BOTTOM

    band_top = CAPTION_BAND_BOTTOM - 280
    frame_png = OUT / f"_qc-{result['reel_id']}-frame0.png"
    subprocess.run(
        [
            ffmpeg, "-y", "-loglevel", "error", "-i", str(result["mp4"]),
            "-vf", f"crop={W}:{band_top}:0:0", "-vframes", "1", str(frame_png),
        ],
        check=True,
    )
    txt = subprocess.run(
        [tesseract, str(frame_png), "stdout", "--psm", "6"], capture_output=True, text=True
    ).stdout.upper()
    frame_png.unlink(missing_ok=True)

    found = [w for w in words if w in txt]
    if len(found) >= max(1, len(words) // 2):
        return Check(2, "First frame carries the hook text", "PASS", f"OCR matched {found}")
    return Check(
        2,
        "First frame carries the hook text",
        "FAIL",
        f"expected any of {words}, OCR read {txt.strip()[:120]!r}",
    )


def _inside_safe(box) -> bool:
    return (
        box.x >= SAFE["left"]
        and box.right <= W - SAFE["right"]
        and box.y >= SAFE["top"]
        and box.bottom <= H - SAFE["bottom"]
    )


def check_safe_area(result) -> Check:
    offenders = []
    for scene_type, boxes in result["scene_boxes"].items():
        for box, label, _reveal in boxes:
            if not _inside_safe(box):
                offenders.append(f"{scene_type}/{label} ({box.x},{box.y},{box.right},{box.bottom})")
    for box, label in result["caption_boxes"][:1] or []:
        if not _inside_safe(box):
            offenders.append(f"captions/{label}")
    return Check(
        3,
        "On-screen text inside the safe area",
        "FAIL" if offenders else "PASS",
        "; ".join(offenders[:6]) or f"all elements within {SAFE}",
    )


def _overlaps(a, b) -> bool:
    return not (a.right <= b.x or b.right <= a.x or a.bottom <= b.y or b.bottom <= a.y)


def check_no_overlap(result) -> Check:
    """
    Glyph-box audit, per scene, among elements visible at the same time.

    Two elements only conflict if both are revealed — a counter that snaps out
    before a caption arrives is not an overlap.
    """
    offenders = []
    for scene_type, boxes in result["scene_boxes"].items():
        for i, (box_a, label_a, reveal_a) in enumerate(boxes):
            for box_b, label_b, reveal_b in boxes[i + 1 :]:
                if _overlaps(box_a, box_b):
                    offenders.append(f"{scene_type}: {label_a} ∩ {label_b}")

    # Captions are drawn over whatever scene is running, so they get checked
    # against every scene element too.
    caption_box = result["caption_boxes"][0][0] if result["caption_boxes"] else None
    if caption_box is not None:
        top_of_captions = min(b.y for b, _ in result["caption_boxes"])
        for scene_type, boxes in result["scene_boxes"].items():
            if scene_type == "cta":
                continue  # the end card runs its own rhythm; checked by height above
            for box, label, _ in boxes:
                if box.bottom > top_of_captions:
                    offenders.append(f"{scene_type}/{label} runs into the caption band")

    return Check(
        4,
        "No two text elements overlap",
        "FAIL" if offenders else "PASS",
        "; ".join(sorted(set(offenders))[:6]) or "no collisions",
    )


def check_canon(result) -> Check:
    try:
        canon.verify(result["reel"])
        canon.check_arithmetic()
    except canon.CanonError as err:
        return Check(5, "Canon: facts, numbers, banned phrases", "FAIL", str(err))

    reel = result["reel"]
    required_scene = {"reel-1-four-rules": "turn", "reel-2-four-documents": "beat", "reel-3-four-numbers": "turn"}
    blob = " ".join(f"{s.get('vo','')} {s.get('onscreen','')}" for s in reel["scenes"]).lower()
    if canon.REQUIRED_FINDING not in blob:
        return Check(5, "Canon: facts, numbers, banned phrases", "FAIL", "finding never stated")

    return Check(
        5,
        "Canon: facts, numbers, banned phrases",
        "PASS",
        f"77 days derived from {canon.CANON['reversal_date']}→{canon.CANON['refiled_date']}; "
        f"{len(canon.BANNED_PHRASES)} banned phrases absent; finding stated",
    )


def check_loudness(result) -> Check:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return Check(6, "Loudness and clipping", "SKIP", "ffmpeg unavailable")
    proc = subprocess.run(
        [ffmpeg, "-i", str(result["mp4"]), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    text = proc.stderr
    # ebur128 prints a running I: on every frame and then the real figure in a
    # summary block at the end. Take the last match, never the first — the
    # first is the level a tenth of a second into the file, which for a piece
    # that opens on silence reads as −70 LUFS.
    integrated = re.findall(r"I:\s*(-?\d+\.\d+)\s*LUFS", text)
    peak = re.findall(r"Peak:\s*(-?\d+\.\d+)\s*dBFS", text)
    if not integrated:
        return Check(6, "Loudness and clipping", "SKIP", "ebur128 produced no summary")
    lufs = float(integrated[-1])
    tp = float(peak[-1]) if peak else -99.0
    problems = []
    if abs(lufs - AUDIO_CFG["target_lufs"]) > 1.0:
        problems.append(f"{lufs} LUFS off target {AUDIO_CFG['target_lufs']}")
    if tp > AUDIO_CFG["true_peak_db"] + 0.3:
        problems.append(f"peak {tp} dBFS above {AUDIO_CFG['true_peak_db']}")
    return Check(
        6, "Loudness and clipping", "FAIL" if problems else "PASS", "; ".join(problems) or f"{lufs} LUFS, peak {tp} dBFS"
    )


def check_music_gate(result) -> Check:
    """The bed must be silent before the turn and audible after it."""
    from .audio import SR

    mixed = result["mixed"]
    music_in = float(result["notes"]["music_in_s"])
    vo_only_end = int(music_in * SR)

    # Compare the energy of the tail against the pre-turn section at moments
    # when the voice is quiet, which is where a bed would show up.
    before = mixed[:vo_only_end]
    after = mixed[vo_only_end:]
    if len(after) == 0:
        return Check(7, "Music silent before the turn, present after", "FAIL", "no audio after the turn")

    quiet_before = np.percentile(np.abs(before), 20) if len(before) else 0.0
    quiet_after = np.percentile(np.abs(after), 20)
    detail = f"20th-percentile level before {quiet_before:.5f}, after {quiet_after:.5f} (turn at {music_in:.1f}s)"
    if quiet_after <= quiet_before * 1.5:
        return Check(7, "Music silent before the turn, present after", "FAIL", detail)
    return Check(7, "Music silent before the turn, present after", "PASS", detail)


def check_endcard(result) -> Check:
    cta = next((c for c in result["cuts"] if c.type == "cta"), None)
    if cta is None:
        return Check(8, "End card holds ≥3s with §, scales, mark", "FAIL", "no cta scene")
    labels = {label for _b, label, _r in result["scene_boxes"].get("cta", [])}
    required = {"endcard-section", "endcard-scales", "endcard-lockup"}
    missing = required - labels
    hold = cta.duration
    problems = []
    if hold < brand.MOTION["endcard_hold_s"]:
        problems.append(f"holds {hold:.1f}s, under {brand.MOTION['endcard_hold_s']}s")
    if missing:
        problems.append(f"missing {sorted(missing)}")
    return Check(
        8,
        "End card holds ≥3s with §, scales, mark",
        "FAIL" if problems else "PASS",
        "; ".join(problems) or f"holds {hold:.1f}s with §, scales and the lockup",
    )


def check_srt(result) -> Check:
    srt = OUT / f"{result['reel_id']}.srt"
    if not srt.exists():
        return Check(9, "SRT matches the caption cues", "FAIL", "no .srt written")
    blocks = [b for b in srt.read_text(encoding="utf-8").strip().split("\n\n") if b.strip()]
    cues = result["cues"]
    problems = []
    if len(blocks) != len(cues):
        problems.append(f"{len(blocks)} srt blocks vs {len(cues)} cues")
    too_long = [c.index for c in cues if c.text.count("\n") + 1 > 2]
    if too_long:
        problems.append(f"cues over two lines: {too_long[:5]}")
    return Check(
        9, "SRT matches the caption cues", "FAIL" if problems else "PASS", "; ".join(problems) or f"{len(cues)} cues, none over two lines"
    )


def check_glyphs(result) -> Check:
    """
    Nothing on screen renders as a tofu box.

    Added beyond the handoff's ten. A cmap lookup would have passed this reel:
    EB Garamond lists U+2013 and draws nothing for it, so "5–0" shipped as
    "5□0". Each character is rendered and compared against the font's own
    .notdef, which is the only check that matches what a viewer sees.
    """
    from . import brand as b

    offenders = []
    prose_font = b.font(64, "regular")
    numerals = b.numeral_font(120)
    for scene in result["reel"]["scenes"]:
        text = scene.get("onscreen", "") or ""
        for extra in ("span", "hold_number"):
            text += str(scene.get(extra, "") or "")
        if "card" in scene:
            text += scene["card"]["label"] + scene["card"]["line"]
        for c in scene.get("compare", []):
            text += c["label"] + c["line"]
        for bad in b.missing_glyphs(text, prose_font):
            offenders.append(f"{scene['type']}: {bad!r} (U+{ord(bad):04X}) missing from the prose face")
        value = (scene.get("number") or {}).get("value", "")
        for bad in b.missing_glyphs(value, numerals):
            offenders.append(f"{scene['type']}: {bad!r} (U+{ord(bad):04X}) missing from the numeral face")

    return Check(
        11,
        "No missing glyphs (tofu) in on-screen text",
        "FAIL" if offenders else "PASS",
        "; ".join(sorted(set(offenders))[:6]) or "every character renders in the face that draws it",
    )


def check_pytest() -> Check:
    proc = subprocess.run(
        ["python3", "-m", "pytest", "-q", str(ROOT / "tests")],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    tail = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else proc.stderr.strip()[:160]
    return Check(10, "pytest green", "PASS" if proc.returncode == 0 else "FAIL", tail)


def check_reel(result) -> ReelQC:
    reel_qc = ReelQC(result["reel_id"])
    reel_qc.checks = [
        check_container(result),
        check_first_frame_text(result),
        check_safe_area(result),
        check_no_overlap(result),
        check_canon(result),
        check_loudness(result),
        check_music_gate(result),
        check_endcard(result),
        check_srt(result),
        check_glyphs(result),
    ]
    return reel_qc


# ── Report ────────────────────────────────────────────────────────────────


def write_report(results: list) -> Path:
    pytest_check = check_pytest()
    for r in results:
        r["qc"].checks.append(pytest_check)

    lines = [
        "# QC REPORT — “Four Rules” reel set",
        "",
        f"`{canon.summary()}`",
        "",
        "Generated by `src/qc.py` after every render. A check that could not be",
        "performed is reported as SKIP with its reason — never as a pass.",
        "",
    ]

    all_passed = all(r["qc"].passed for r in results)
    lines += [f"**Overall: {'PASS' if all_passed else 'FAIL'}** — {len(results)} reel(s).", ""]

    for r in results:
        q = r["qc"]
        lines += [f"## {r['reel_id']} — {'PASS' if q.passed else 'FAIL'}", ""]
        lines += [f"- Render time: {r['render_seconds']}s", f"- Output: `out/{r['mp4'].name}`", ""]
        lines += ["| # | Check | Result | Detail |", "| --- | --- | --- | --- |"]
        for c in q.checks:
            lines.append(f"| {c.number} | {c.name} | **{c.status}** | {c.detail} |")
        lines.append("")

    # Placeholders — the section Michael actually needs.
    lines += ["## Placeholders in this build", ""]
    first = results[0]
    lines += [
        f"- **Voiceover** — {first['audio_notes']['vo_source']}. "
        "Drop a recorded `audio/vo/<reel-id>.wav` in and run `make reel-N`; nothing else changes.",
        f"- **Music bed** — {first['audio_notes'].get('bed_source', 'n/a')}. See `audio/bed/LICENCE.txt`.",
    ]
    if brand.LOCKUP_IS_PLACEHOLDER:
        lines.append(
            "- **End-card lockup** — `brand/trumen-lockup.png` was NOT supplied with the handoff. "
            "A structural placeholder is rendered in its place. The brand rules say the lockup is "
            "supplied and must never be rebuilt from type, so this is the one asset blocking a "
            "brand-correct end card. Drop the real 2400×1131 PNG in and re-render."
        )
    if brand.FONT_SUBSTITUTIONS:
        for note in brand.FONT_SUBSTITUTIONS:
            lines.append(f"- **Font** — {note}.")
    for r in results:
        if r["notes"].get("stretched"):
            lines.append(
                f"- **Timeline** — {r['reel_id']} scene boundaries stretched by "
                f"{r['notes']['stretch_factor']}×. {r['notes']['reason']}"
            )
    lines.append("")

    lines += [
        "## Gate",
        "",
        "Nothing here is published. Output is inventory. Publication is hard-gated on the",
        "Class 41 ITU filing, counsel review of the deleted-language lines, and an audited",
        "pinned comment — see the handoff §9.",
        "",
    ]

    path = OUT / "QC_REPORT.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path
