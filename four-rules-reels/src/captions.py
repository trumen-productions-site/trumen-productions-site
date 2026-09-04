"""
Burned-in captions and the .srt sidecar.

The caption layer is deliberately independent of the voiceover render: the same
cue list drives the pixels and the sidecar, and a translated cue list can be
dropped in for auto-dubbing without touching a scene renderer.

House rules, from the brand: cream, bottom third but clear of the 320px safe
band, two lines maximum, three to five words a cue.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from PIL import Image

from .brand import CREAM, H, NAVY, SAFE, W, Box, draw_text, font, measure
from .timeline import Cut

CAPTION_SIZE = 56
WORDS_PER_CUE = (3, 5)
CAPTION_BAND_BOTTOM = H - SAFE["bottom"] - 40  # sits above the safe band, never in it
MAX_WIDTH = W - SAFE["left"] * 2 - 80


@dataclass
class Cue:
    index: int
    start: float
    end: float
    text: str  # may contain one newline — never more


def _words(vo: str) -> list[str]:
    return [w for w in re.split(r"\s+", vo.strip()) if w]


def _chunk(words: list[str]) -> list[list[str]]:
    """
    Group into 3–5 word cues, preferring a break after punctuation.

    A cue that ends on a comma or a full stop reads as speech; one that ends
    mid-clause reads as a machine transcript.
    """
    cues: list[list[str]] = []
    current: list[str] = []
    for word in words:
        current.append(word)
        ends_clause = word.endswith((".", ",", ":", ";", "—", "?"))
        if len(current) >= WORDS_PER_CUE[1] or (len(current) >= WORDS_PER_CUE[0] and ends_clause):
            cues.append(current)
            current = []
    if current:
        if cues and len(current) < WORDS_PER_CUE[0]:
            cues[-1].extend(current)  # never strand one word on its own
        else:
            cues.append(current)
    return cues


def _wrap_two_lines(text: str, f) -> str:
    """Fit a cue into at most two lines, breaking as evenly as possible."""
    if measure(text, f)[0] <= MAX_WIDTH:
        return text
    words = text.split()
    best, best_delta = None, None
    for split in range(1, len(words)):
        a, b = " ".join(words[:split]), " ".join(words[split:])
        wa, wb = measure(a, f)[0], measure(b, f)[0]
        if max(wa, wb) > MAX_WIDTH:
            continue
        delta = abs(wa - wb)
        if best_delta is None or delta < best_delta:
            best, best_delta = f"{a}\n{b}", delta
    return best or text


def cues_for(cuts: list[Cut]) -> list[Cue]:
    """
    Build the full cue list for a reel.

    Cue timing inside a scene is proportional to word count — the honest
    approximation available without forced alignment, and close enough that
    captions track a measured read.
    """
    f = font(CAPTION_SIZE, "regular")
    out: list[Cue] = []
    index = 1
    for cut in cuts:
        vo = cut.scene.get("vo", "").strip()
        if not vo:
            continue
        groups = _chunk(_words(vo))
        total_words = sum(len(g) for g in groups) or 1
        t = cut.t_start
        for group in groups:
            share = len(group) / total_words
            end = min(t + cut.duration * share, cut.t_end)
            out.append(Cue(index, t, end, _wrap_two_lines(" ".join(group), f)))
            index += 1
            t = end
    return out


def cue_at(cues: list[Cue], t: float) -> Cue | None:
    for cue in cues:
        if cue.start <= t < cue.end:
            return cue
    return None


def render_cue(cue: Cue) -> tuple[Image.Image, Box]:
    """A cue as an RGBA layer, plus the box QC audits for the safe area."""
    f = font(CAPTION_SIZE, "regular")
    w, h = measure(cue.text, f)
    pad = 26
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    # A whisper of the navy field behind the words, so a caption stays legible
    # if it ever lands over the brass rule or a document card.
    scrim = Image.new("RGBA", layer.size, NAVY + (150,))
    layer.alpha_composite(scrim)
    box = draw_text(layer, cue.text, xy=(pad, pad), f=f, fill=CREAM, anchor="lt")
    return layer, box


def caption_position(layer: Image.Image) -> tuple[int, int]:
    return (W - layer.width) // 2, CAPTION_BAND_BOTTOM - layer.height


def to_srt(cues: list[Cue]) -> str:
    def stamp(seconds: float) -> str:
        ms = int(round(seconds * 1000))
        h, rem = divmod(ms, 3_600_000)
        m, rem = divmod(rem, 60_000)
        s, ms = divmod(rem, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    blocks = [f"{c.index}\n{stamp(c.start)} --> {stamp(c.end)}\n{c.text}\n" for c in cues]
    return "\n".join(blocks)
