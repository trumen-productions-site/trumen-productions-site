"""
Brand resources: tokens, fonts, and the drawn marks.

Not in the handoff's file list — added because scenes.py, qc.py and the tests
all need the same answer to "which font is actually in force" and "how big is
the safe area", and three copies of that answer is how a brand drifts.

FONT SUBSTITUTION
-----------------
The brand calls for Georgia. Georgia is a Microsoft core font and is not
licensable here, so the handoff's own named fallback is used: EB Garamond.
`FONT_SUBSTITUTIONS` records what was swapped and why; the QC report prints it
on every run so the substitution is never silently inherited.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
TOKENS = json.loads((ROOT / "brand" / "tokens.json").read_text())

W = TOKENS["canvas"]["w"]
H = TOKENS["canvas"]["h"]
FPS = TOKENS["canvas"]["fps"]
DURATION = TOKENS["canvas"]["duration_s"]

SAFE = TOKENS["safe_area"]
MOTION = TOKENS["motion"]


def rgb(name: str) -> tuple[int, int, int]:
    value = TOKENS["colors"][name].lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


NAVY = rgb("navy")
CREAM = rgb("cream")
BRASS = rgb("brass")
GREEN = rgb("green")
GOLD = rgb("gold")


# ── Fonts ─────────────────────────────────────────────────────────────────

FONT_SUBSTITUTIONS: list[str] = []

# EB Garamond defaults to old-style figures, where 2 sits at x-height and 6
# ascends. Elegant in running prose, wrong for a 220px number that IS the
# frame — "26" reads as a typo. Display numerals ask for lining figures.
LINING_FIGURES = ["lnum", "tnum"]

_SERIF_CANDIDATES = {
    "regular": [
        "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Regular.otf",
        "/usr/share/fonts/truetype/ebgaramond/EBGaramond12-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ],
    "bold": [
        "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ],
    "italic": [
        "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Italic.otf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
    ],
}


def _resolve(style: str) -> str:
    # A font bundled into brand/fonts/ always wins — that is how Georgia (or a
    # licensed Poppins) gets used once someone drops it in.
    local = ROOT / "brand" / "fonts"
    if local.is_dir():
        wanted = {"regular": "Regular", "bold": "Bold", "italic": "Italic"}[style]
        for candidate in sorted(local.glob("*.[to]tf")):
            if wanted.lower() in candidate.name.lower():
                return str(candidate)
    for path in _SERIF_CANDIDATES[style]:
        if os.path.exists(path):
            if "ebgaramond" not in path and "brand/fonts" not in path:
                note = f"{style}: Georgia unavailable, EB Garamond unavailable, using {Path(path).name}"
            else:
                note = f"{style}: Georgia unavailable, substituted EB Garamond ({Path(path).name})"
            if note not in FONT_SUBSTITUTIONS:
                FONT_SUBSTITUTIONS.append(note)
            return path
    raise RuntimeError(f"no serif font available for style {style!r}")


@lru_cache(maxsize=256)
def font(size: int, style: str = "regular") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(_resolve(style), size)


# ── Text helpers ──────────────────────────────────────────────────────────


@dataclass
class Box:
    x: int
    y: int
    w: int
    h: int

    @property
    def right(self) -> int:
        return self.x + self.w

    @property
    def bottom(self) -> int:
        return self.y + self.h


def measure(text: str, f: ImageFont.FreeTypeFont, line_spacing: float = 1.25) -> tuple[int, int]:
    lines = text.split("\n")
    probe = Image.new("L", (1, 1))
    draw = ImageDraw.Draw(probe)
    widths, line_h = [], 0
    for line in lines:
        box = draw.textbbox((0, 0), line or " ", font=f)
        widths.append(box[2] - box[0])
        line_h = max(line_h, box[3] - box[1])
    step = int(line_h * line_spacing)
    return max(widths), step * (len(lines) - 1) + line_h


def draw_text(
    img: Image.Image,
    text: str,
    *,
    xy: tuple[int, int],
    f: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    anchor: str = "lt",
    line_spacing: float = 1.25,
    tracking: int = 0,
    features: list[str] | None = None,
) -> Box:
    """
    Draw one or more lines and return the bounding box actually painted.

    The returned box is what qc.py checks against the safe area, so it has to
    be the truth rather than an estimate — which is why every line is measured
    rather than assumed.
    """
    draw = ImageDraw.Draw(img)
    kw = {"features": features} if features else {}
    lines = text.split("\n")
    width, height = measure(text, f, line_spacing)
    if tracking:
        width += tracking * max(len(line) for line in lines)

    x, y = xy
    if anchor[0] == "m":
        x -= width // 2
    elif anchor[0] == "r":
        x -= width
    if anchor[1] == "m":
        y -= height // 2
    elif anchor[1] == "b":
        y -= height

    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    line_h = max(probe.textbbox((0, 0), line or " ", font=f)[3] for line in lines)
    step = int(line_h * line_spacing)

    for i, line in enumerate(lines):
        ly = y + i * step
        if tracking:
            lw = sum(probe.textbbox((0, 0), ch, font=f)[2] for ch in line) + tracking * len(line)
            lx = x + (width - lw) // 2 if anchor[0] == "m" else x
            for ch in line:
                draw.text((lx, ly), ch, font=f, fill=fill, **kw)
                lx += probe.textbbox((0, 0), ch, font=f)[2] + tracking
        else:
            lw = probe.textbbox((0, 0), line or " ", font=f)[2]
            lx = x + (width - lw) // 2 if anchor[0] == "m" else x
            draw.text((lx, ly), line, font=f, fill=fill, **kw)

    return Box(x, y, width, height)


# ── Marks ─────────────────────────────────────────────────────────────────


def section_mark(size: int = 64, color: tuple[int, int, int] = BRASS) -> Image.Image:
    """The § corner mark. A typographic character, not an illustration."""
    img = Image.new("RGBA", (size, int(size * 1.4)), (0, 0, 0, 0))
    draw_text(img, "§", xy=(size // 2, 0), f=font(int(size * 1.2), "regular"), fill=color, anchor="mt")
    return img


def scales(width: int = 220, color: tuple[int, int, int] = BRASS) -> Image.Image:
    """
    A balance, drawn rather than illustrated: a post, a beam, two pans.

    Deliberately plain. The brand note is "restraint", and an ornate scales
    would be the one decorative thing in sixty seconds of straight lines.
    """
    h = int(width * 0.62)
    img = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = width // 2
    stroke = max(2, width // 90)

    beam_y = int(h * 0.30)
    d.line([(cx, int(h * 0.14)), (cx, int(h * 0.80))], fill=color, width=stroke)          # post
    d.line([(int(width * 0.12), beam_y), (int(width * 0.88), beam_y)], fill=color, width=stroke)  # beam
    d.line([(int(width * 0.30), int(h * 0.82)), (int(width * 0.70), int(h * 0.82))], fill=color, width=stroke)  # foot
    d.ellipse([cx - stroke * 2, int(h * 0.10), cx + stroke * 2, int(h * 0.10) + stroke * 4], fill=color)

    for side in (0.12, 0.88):
        px = int(width * side)
        pan_w = int(width * 0.18)
        d.line([(px, beam_y), (px - pan_w // 2, beam_y + int(h * 0.22))], fill=color, width=stroke)
        d.line([(px, beam_y), (px + pan_w // 2, beam_y + int(h * 0.22))], fill=color, width=stroke)
        d.arc(
            [px - pan_w // 2, beam_y + int(h * 0.14), px + pan_w // 2, beam_y + int(h * 0.32)],
            start=0,
            end=180,
            fill=color,
            width=stroke,
        )
    return img


def _placeholder_lockup(width: int) -> Image.Image:
    """
    Stand-in for brand/trumen-lockup.png.

    The brand rules say the lockup is supplied and must never be rebuilt from
    type. It was not supplied with this handoff, so this is a structural
    placeholder that satisfies the end card's composition and is flagged in
    QC_REPORT.md on every render. Drop the real 2400×1131 PNG into
    brand/trumen-lockup.png and it is used instead, with no code change.
    """
    height = int(width * 1131 / 2400)
    img = Image.new("RGBA", (width, height), NAVY + (255,))
    mark_size = int(width * 0.13)

    star = Image.new("RGBA", (mark_size, mark_size), (0, 0, 0, 0))
    ImageDraw.Draw(star).polygon(_star_points(mark_size), fill=GOLD)

    f_mark = font(mark_size, "italic")
    left = draw_text(img, "TRU", xy=(0, height // 2), f=f_mark, fill=CREAM, anchor="lm")
    gap = int(mark_size * 0.16)
    total = left.w + gap + mark_size + gap + measure("MEN", f_mark)[0]
    x = (width - total) // 2
    img.paste(NAVY + (255,), (0, 0, width, height))
    draw_text(img, "TRU", xy=(x, int(height * 0.42)), f=f_mark, fill=CREAM, anchor="lm")
    img.alpha_composite(star, (x + left.w + gap, int(height * 0.42) - mark_size // 2))
    draw_text(img, "MEN", xy=(x + left.w + gap + mark_size + gap, int(height * 0.42)), f=f_mark, fill=CREAM, anchor="lm")

    sub = font(int(width * 0.035), "regular")
    draw_text(img, "PRODUCTIONS", xy=(width // 2, int(height * 0.70)), f=sub, fill=BRASS, anchor="mt", tracking=int(width * 0.022))
    d = ImageDraw.Draw(img)
    d.line(
        [(int(width * 0.10), int(height * 0.80)), (int(width * 0.90), int(height * 0.80))],
        fill=BRASS,
        width=max(2, width // 600),
    )
    draw_text(img, "VIRI VERI", xy=(width // 2, int(height * 0.84)), f=sub, fill=BRASS, anchor="mt", tracking=int(width * 0.012))
    return img


def _star_points(size: int) -> list[tuple[float, float]]:
    import math

    cx = cy = size / 2
    outer, inner = size / 2, size / 2 * 0.42
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


LOCKUP_IS_PLACEHOLDER = False


def lockup(width: int = 900) -> Image.Image:
    """The end-card lockup, scaled to `width`. Supplied PNG wins if present."""
    global LOCKUP_IS_PLACEHOLDER
    supplied = ROOT / "brand" / "trumen-lockup.png"
    if supplied.exists():
        LOCKUP_IS_PLACEHOLDER = False
        img = Image.open(supplied).convert("RGBA")
        height = int(img.height * width / img.width)
        return img.resize((width, height), Image.LANCZOS)
    LOCKUP_IS_PLACEHOLDER = True
    return _placeholder_lockup(width)
