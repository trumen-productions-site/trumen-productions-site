"""
Script JSON → a timed scene list.

The authored times in scripts/ are the intent. If a voiceover runs long or
short, the cuts have to follow the voice rather than the other way round, so
this module is where a human read gets reconciled with a written timeline.

Two modes:

  synthesised VO   Each scene is spoken separately, so its exact duration is
                   known. A scene that overruns its slot is fitted to it by
                   tempo, which is exact and leaves the authored timeline
                   untouched.

  supplied VO      Michael drops one reel-N.wav in. There are no scene
                   boundaries in a single file and no forced-alignment tool
                   available offline, so scene boundaries are stretched
                   proportionally to the file's real duration — and QC says so
                   in as many words.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from . import canon

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Cut:
    """One scene, resolved onto the real timeline."""

    scene: dict
    t_start: float
    t_end: float

    @property
    def duration(self) -> float:
        return self.t_end - self.t_start

    @property
    def type(self) -> str:
        return self.scene["type"]


def load_reel(reel_number: int) -> dict:
    matches = sorted(ROOT.glob(f"scripts/reel-{reel_number}-*.json"))
    if not matches:
        raise FileNotFoundError(f"no script for reel {reel_number} in scripts/")
    reel = json.loads(matches[0].read_text())
    canon.verify(reel)  # never render a script that contradicts the record
    return reel


def authored_cuts(reel: dict) -> list[Cut]:
    return [Cut(scene, float(scene["t_start"]), float(scene["t_end"])) for scene in reel["scenes"]]


def validate(cuts: list[Cut], total: float) -> None:
    """The timeline must tile the full duration with no gap and no overlap."""
    if abs(cuts[0].t_start) > 1e-6:
        raise ValueError(f"timeline starts at {cuts[0].t_start}, not 0")
    for previous, nxt in zip(cuts, cuts[1:]):
        if abs(nxt.t_start - previous.t_end) > 1e-6:
            raise ValueError(
                f"gap or overlap between {previous.type} (ends {previous.t_end}) "
                f"and {nxt.type} (starts {nxt.t_start})"
            )
    if abs(cuts[-1].t_end - total) > 1e-6:
        raise ValueError(f"timeline ends at {cuts[-1].t_end}, not {total}")


def stretch_to(cuts: list[Cut], actual_total: float) -> tuple[list[Cut], float]:
    """
    Scale every boundary by one factor so the cuts land with a longer or
    shorter read. Returns the new cuts and the factor applied.
    """
    authored_total = cuts[-1].t_end
    factor = actual_total / authored_total
    return (
        [Cut(c.scene, c.t_start * factor, c.t_end * factor) for c in cuts],
        factor,
    )


def music_in_at(cuts: list[Cut]) -> float:
    """When the bed enters. Silence before it — the four beats carry no music."""
    for cut in cuts:
        if cut.scene.get("music_in"):
            return cut.t_start
    return cuts[-1].t_start


def build(reel_number: int, actual_vo_duration: float | None = None) -> tuple[dict, list[Cut], dict]:
    """
    Resolve a reel onto the timeline.

    Returns (reel, cuts, notes) where notes records anything QC should report.
    """
    reel = load_reel(reel_number)
    cuts = authored_cuts(reel)
    total = cuts[-1].t_end
    validate(cuts, total)

    notes: dict[str, object] = {"authored_total_s": total, "stretched": False}

    if actual_vo_duration is not None and abs(actual_vo_duration - total) > 0.25:
        cuts, factor = stretch_to(cuts, actual_vo_duration)
        notes.update(
            stretched=True,
            stretch_factor=round(factor, 4),
            reason=(
                "Voiceover duration differs from the authored timeline and no offline "
                "forced-alignment tool is available, so scene boundaries were stretched "
                "proportionally rather than aligned to word timings."
            ),
        )
        validate(cuts, cuts[-1].t_end)

    notes["music_in_s"] = music_in_at(cuts)
    notes["final_total_s"] = cuts[-1].t_end
    return reel, cuts, notes
