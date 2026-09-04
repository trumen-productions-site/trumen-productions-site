"""
One renderer per scene type.

Each renderer builds its static layers once, then composes a frame for a given
time. Nothing is drawn twice that does not change, and nothing moves except the
three things the brand allows: a snap-in, a count-up, and a slow push.

Restraint is the brand. Every renderer here is written to do less than it could.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFilter

from . import brand
from .brand import (
    BRASS,
    LINING_FIGURES,
    CREAM,
    GOLD,
    GREEN,
    H,
    MOTION,
    NAVY,
    SAFE,
    W,
    Box,
    draw_text,
    font,
    lockup,
    measure,
    scales,
    section_mark,
)

TYPE = brand.TOKENS["type"]

# The band text may occupy: inside the safe area, and clear of the caption
# strip that sits above the bottom safe band.
CONTENT_TOP = SAFE["top"]
CONTENT_BOTTOM = H - SAFE["bottom"] - 260  # 260px reserved for captions
CONTENT_LEFT = SAFE["left"]
CONTENT_RIGHT = W - SAFE["right"]
CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT


# ── Shared texture ────────────────────────────────────────────────────────


def _grain_tiles(count: int = 12, seed: int = 20260904) -> list[Image.Image]:
    """
    Pre-rendered film grain, cycled per frame.

    Generated from a fixed seed so two runs of the pipeline produce identical
    files — the handoff asks for a deterministic, re-runnable build, and grain
    is the only thing here that would otherwise be random.
    """
    rng = random.Random(seed)
    tiles = []
    small_w, small_h = W // 3, H // 3
    for _ in range(count):
        noise = Image.new("L", (small_w, small_h))
        noise.putdata([rng.randint(96, 160) for _ in range(small_w * small_h)])
        tiles.append(noise.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(0.4)))
    return tiles


GRAIN = _grain_tiles()


def _base_field() -> Image.Image:
    """Navy field with the brass § corner mark. Identical on every scene."""
    img = Image.new("RGB", (W, H), NAVY)
    mark = section_mark(56, BRASS)
    img.paste(mark, (CONTENT_LEFT, SAFE["top"] - 120), mark)
    return img


BASE = _base_field()


def _apply_grain(img: Image.Image, frame_index: int) -> Image.Image:
    tile = GRAIN[frame_index % len(GRAIN)]
    grain_rgb = Image.merge("RGB", (tile, tile, tile))
    return Image.blend(img, grain_rgb, MOTION["grain_opacity"])


def _push_in(img: Image.Image, progress: float) -> Image.Image:
    """A 3% push over the life of the scene. The only camera move in the set."""
    scale = 1.0 + MOTION["push_in_pct"] * max(0.0, min(1.0, progress))
    if scale <= 1.0005:
        return img
    nw, nh = int(W * scale), int(H * scale)
    zoomed = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - W) // 2, (nh - H) // 2
    return zoomed.crop((left, top, left + W, top + H))


def _snap(t_local: float, at: float) -> float:
    """
    Snap-in opacity: nothing longer than 120 ms, per the brand rules.

    A reveal at 0.0 is a HARD CUT, fully opaque on the scene's first frame.
    Ramping from zero there would mean the hook is invisible at frame 1 — which
    the brand rules forbid outright, and which costs the swipe-or-stay window
    the two seconds it is supposed to have.
    """
    if at <= 0.0:
        return 1.0 if t_local >= 0.0 else 0.0
    if t_local < at:
        return 0.0
    return min(1.0, (t_local - at) / (MOTION["counter_snap_ms"] / 1000.0))


# The band a viewer's eye actually has: below the top safe area, above where
# the captions sit. Content is centred in this, not in the raw canvas — a block
# centred on 960 would sit behind the caption strip.
VISIBLE_TOP = CONTENT_TOP
VISIBLE_BOTTOM = H - SAFE["bottom"] - 240
VISIBLE_MID = (VISIBLE_TOP + VISIBLE_BOTTOM) // 2


def _centred_top(block_h: int) -> int:
    """Top edge for a block of this height, centred in the visible band."""
    return max(VISIBLE_TOP + 20, VISIBLE_MID - block_h // 2)


def _fit_font(text: str, style: str, start_px: int, max_w: int, max_h: int) -> "brand.ImageFont.FreeTypeFont":
    """Step a type size down until the block fits the content column."""
    size = start_px
    while size > 24:
        f = font(size, style)
        w, h = measure(text, f)
        if w <= max_w and h <= max_h:
            return f
        size -= 4
    return font(24, style)


# ── Scene renderers ───────────────────────────────────────────────────────


@dataclass
class RenderedScene:
    """A scene ready to emit frames, plus the boxes QC will audit."""

    scene: dict
    reel: dict
    layers: list = field(default_factory=list)  # (Image RGBA, (x, y), reveal_t, label)
    boxes: list = field(default_factory=list)  # (Box, label, reveal_t)
    push: bool = False

    @property
    def duration(self) -> float:
        return self.scene["t_end"] - self.scene["t_start"]

    def frame(self, t_local: float, frame_index: int) -> Image.Image:
        img = BASE.copy()
        for layer, pos, reveal, _label in self.layers:
            alpha = _snap(t_local, reveal)
            if alpha <= 0:
                continue
            if alpha >= 1:
                img.paste(layer, pos, layer)
            else:
                faded = layer.copy()
                faded.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
                img.paste(faded, pos, faded)
        if self.push:
            img = _push_in(img, t_local / max(self.duration, 0.001))
        return _apply_grain(img, frame_index)


def _text_layer(text: str, f, fill, *, features=None) -> tuple[Image.Image, Box]:
    w, h = measure(text, f)
    pad = 8
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    box = draw_text(layer, text, xy=(pad, pad), f=f, fill=fill, anchor="lt", features=features)
    return layer, Box(box.x, box.y, box.w, box.h)


def _place(rs: RenderedScene, text: str, f, fill, *, x: int, y: int, reveal: float, label: str, center: bool = False, features=None):
    layer, local = _text_layer(text, f, fill, features=features)
    px = x - layer.width // 2 if center else x
    rs.layers.append((layer, (px, y), reveal, label))
    rs.boxes.append((Box(px + local.x, y + local.y, local.w, local.h), label, reveal))


def render_hook(scene: dict, reel: dict) -> RenderedScene:
    rs = RenderedScene(scene, reel, push=True)
    text = scene["onscreen"]
    f = _fit_font(text, "bold", TYPE["hook_size_px"], CONTENT_W, 620)
    _, h = measure(text, f)
    top = _centred_top(h + 60 + 3)
    # Hook text is on screen at frame 1 — reveal 0.0, hard cut, no fade.
    _place(rs, text, f, CREAM, x=W // 2, y=top, reveal=0.0, label="hook", center=True)
    rule_y = top + h + 60
    rule = Image.new("RGBA", (int(CONTENT_W * 0.34), 3), BRASS + (255,))
    rs.layers.append((rule, ((W - rule.width) // 2, rule_y), 0.35, "hook-rule"))
    return rs


def render_beat(scene: dict, reel: dict) -> RenderedScene:
    rs = RenderedScene(scene, reel)
    n = scene.get("n", 1)

    if "card" in scene:
        return _render_document_beat(rs, scene)
    if "number" in scene:
        return _render_number_beat(rs, scene)

    counter_f = font(180, "bold")
    _, counter_h = measure(str(n), counter_f)
    text = scene["onscreen"]
    f = _fit_font(text, "regular", TYPE["beat_size_px"], CONTENT_W, 520)
    _, text_h = measure(text, f)

    gap = 110
    top = _centred_top(counter_h + gap + text_h)
    _place(rs, str(n), counter_f, BRASS, x=W // 2, y=top, reveal=0.0, label=f"counter-{n}", center=True, features=LINING_FIGURES)
    _place(rs, text, f, CREAM, x=W // 2, y=top + counter_h + gap, reveal=0.30, label=f"beat-{n}", center=True)
    return rs


def _render_document_beat(rs: RenderedScene, scene: dict) -> RenderedScene:
    """Reel 2: a cream card on navy, sliding in from the right."""
    card = _document_card(scene["card"]["label"], scene["card"]["line"], int(CONTENT_W * 0.92))
    text = scene["onscreen"]
    f = _fit_font(text, "regular", 64, CONTENT_W, 280)
    _, text_h = measure(text, f)

    gap = 90
    x = (W - card.width) // 2
    y = _centred_top(card.height + gap + text_h)
    rs.layers.append((card, (x, y), 0.0, f"card-{scene['n']}"))
    rs.boxes.append((Box(x, y, card.width, card.height), f"card-{scene['n']}", 0.0))
    _place(rs, text, f, CREAM, x=W // 2, y=y + card.height + gap, reveal=0.35, label=f"beat-{scene['n']}", center=True)
    return rs


def _document_card(label: str, line: str, width: int) -> Image.Image:
    height = int(width * 0.52)
    shadow_pad = 18
    canvas = Image.new("RGBA", (width + shadow_pad, height + shadow_pad), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 90))
    canvas.paste(shadow, (shadow_pad, shadow_pad), shadow)

    card = Image.new("RGBA", (width, height), CREAM + (255,))
    d = ImageDraw.Draw(card)
    d.line([(48, int(height * 0.30)), (width - 48, int(height * 0.30))], fill=BRASS, width=3)
    for i, y in enumerate((0.44, 0.56, 0.68, 0.80)):
        w = (0.72, 0.62, 0.78, 0.40)[i]
        d.line(
            [(48, int(height * y)), (48 + int((width - 96) * w), int(height * y))],
            fill=(NAVY[0], NAVY[1], NAVY[2], 60),
            width=8,
        )
    draw_text(card, label, xy=(48, int(height * 0.12)), f=font(46, "bold"), fill=NAVY, anchor="lt")
    draw_text(card, line, xy=(width - 48, int(height * 0.12)), f=font(38, "regular"), fill=BRASS, anchor="rt")
    canvas.paste(card, (0, 0), card)
    return canvas


def _render_number_beat(rs: RenderedScene, scene: dict) -> RenderedScene:
    """Reel 3: the number counts up over 400 ms, then locks."""
    value = scene["number"]["value"]
    f = _fit_font(value, "bold", TYPE["number_size_px"], CONTENT_W, 320)
    _, nh = measure(value, f)
    text = scene["onscreen"]
    tf = _fit_font(text, "regular", 62, CONTENT_W, 300)
    _, th = measure(text, tf)

    gap = 90
    top = _centred_top(nh + gap + th)
    _place(rs, value, f, GOLD, x=W // 2, y=top, reveal=0.0, label=f"number-{scene['n']}", center=True, features=LINING_FIGURES)
    _place(rs, text, tf, CREAM, x=W // 2, y=top + nh + gap, reveal=0.35, label=f"beat-{scene['n']}", center=True)
    return rs


def render_turn(scene: dict, reel: dict) -> RenderedScene:
    rs = RenderedScene(scene, reel, push=True)
    y = CONTENT_TOP + 80

    if "compare" in scene:  # Reel 2 — two cards, the span between them
        card_w = int(CONTENT_W * 0.44)
        for i, spec in enumerate(scene["compare"]):
            card = _document_card(spec["label"], spec["line"], card_w)
            x = CONTENT_LEFT + i * (CONTENT_W - card.width)
            # The first card cuts in with the scene; the second lands a beat
            # later, which is the comparison. A reveal after the boundary would
            # also leave the 0:32 thumbnail blank, and the thumbnails exist so
            # the reels can be eyeballed without downloading them.
            reveal = 0.0 if i == 0 else 0.45
            rs.layers.append((card, (x, y), reveal, f"compare-{i}"))
            rs.boxes.append((Box(x, y, card.width, card.height), f"compare-{i}", reveal))
        span_y = y + int(card_w * 0.52) + 70
        _place(rs, scene["span"], font(64, "bold"), BRASS, x=W // 2, y=span_y, reveal=0.9, label="span", center=True, features=LINING_FIGURES)
        text_y = span_y + 140
    elif "hold_number" in scene:  # Reel 3 — the 77 stays, the span draws in beneath
        f = font(TYPE["number_size_px"], "bold")
        _place(rs, scene["hold_number"], f, GOLD, x=W // 2, y=y, reveal=0.0, label="hold-number", center=True, features=LINING_FIGURES)
        _, nh = measure(scene["hold_number"], f)
        _place(rs, scene["span"], font(58, "regular"), BRASS, x=W // 2, y=y + nh + 60, reveal=0.8, label="span", center=True, features=LINING_FIGURES)
        text_y = y + nh + 200
    else:  # Reel 1 — the citation block
        text_y = y + 40

    text = scene["onscreen"]
    f = _fit_font(text, "regular", 66, CONTENT_W, CONTENT_BOTTOM - text_y - 20)
    _place(rs, text, f, CREAM, x=W // 2, y=text_y, reveal=1.2, label="turn", center=True)
    return rs


def render_man(scene: dict, reel: dict) -> RenderedScene:
    """The one held constant across all three reels. Deliberately the quietest."""
    rs = RenderedScene(scene, reel, push=True)
    name = scene.get("onscreen", "") or "Dan Stacey"
    nf = font(72, "italic")
    _, name_h = measure(name, nf)
    top = _centred_top(3 + 60 + name_h)

    rule = Image.new("RGBA", (int(CONTENT_W * 0.22), 3), BRASS + (255,))
    rs.layers.append((rule, ((W - rule.width) // 2, top), 0.0, "man-rule"))
    _place(rs, name, nf, CREAM, x=W // 2, y=top + 60, reveal=0.5, label="man", center=True)
    return rs


def render_cta(scene: dict, reel: dict) -> RenderedScene:
    """
    The end card: green § → title → scales → the lockup.

    Held for the full six seconds of the CTA, which clears the three-second
    minimum with room for the voiceover to land.
    """
    rs = RenderedScene(scene, reel)

    # Fixed vertical rhythm rather than a stack that grows downward: the end
    # card is the one composition that has to clear the caption band exactly,
    # and a stack whose height depends on the title's line-breaking would drift
    # into it the first time the title changed.
    mark = section_mark(88, GREEN)
    rs.layers.append((mark, ((W - mark.width) // 2, 260), 0.0, "endcard-section"))
    rs.boxes.append((Box((W - mark.width) // 2, 260, mark.width, mark.height), "endcard-section", 0.0))

    title = "CLEARLY\nESTABLISHED"
    tf = _fit_font(title, "bold", 118, CONTENT_W, 300)
    _place(rs, title, tf, CREAM, x=W // 2, y=420, reveal=0.15, label="endcard-title", center=True)

    sc = scales(220, BRASS)
    rs.layers.append((sc, ((W - sc.width) // 2, 770), 0.4, "endcard-scales"))
    rs.boxes.append((Box((W - sc.width) // 2, 770, sc.width, sc.height), "endcard-scales", 0.4))

    lk = lockup(820)
    rs.layers.append((lk, ((W - lk.width) // 2, 960), 0.6, "endcard-lockup"))
    rs.boxes.append((Box((W - lk.width) // 2, 960, lk.width, lk.height), "endcard-lockup", 0.6))
    return rs


RENDERERS = {
    "hook": render_hook,
    "beat": render_beat,
    "turn": render_turn,
    "man": render_man,
    "cta": render_cta,
}


def build_scene(scene: dict, reel: dict) -> RenderedScene:
    try:
        renderer = RENDERERS[scene["type"]]
    except KeyError:
        raise ValueError(f"unknown scene type {scene['type']!r}") from None
    return renderer(scene, reel)
