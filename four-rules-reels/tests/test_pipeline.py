"""
Tests that must be green before this build counts as done.

They are fast on purpose — nothing here renders a video. Rendering is verified
by QC on the real files; these check the things that would make a render wrong
before a single frame is drawn.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src import brand, canon, captions, scenes, timeline  # noqa: E402

REELS = (1, 2, 3)


# ── The record ────────────────────────────────────────────────────────────


def test_seventy_seven_is_derived_not_asserted():
    reversal = date.fromisoformat(canon.CANON["reversal_date"])
    refiled = date.fromisoformat(canon.CANON["refiled_date"])
    assert (refiled - reversal).days == 77
    canon.check_arithmetic()


def test_over_detention_equals_days_between_filings():
    assert canon.CANON["over_detention_days"] == canon.CANON["days_between_filings"] == 77


def test_canon_rejects_a_banned_phrase():
    with pytest.raises(canon.CanonError):
        canon.check_banned("They quietly refiled the opinion.", "test")


def test_canon_rejects_a_motive_construction():
    with pytest.raises(canon.CanonError):
        canon.check_banned("The opinion was refiled in order to shield the State.", "test")


def test_canon_rejects_an_unrecognised_number():
    with pytest.raises(canon.CanonError):
        canon.check_numbers("He served 9412 days.", "test")


def test_canon_rejects_softening_the_finding():
    reel = {
        "id": "test",
        "scenes": [{"type": "turn", "vo": "A procedural win, impossible to convict", "onscreen": ""}],
    }
    with pytest.raises(canon.CanonError):
        canon.check_finding(reel)


def test_canon_rejects_overstating_the_finding():
    reel = {"id": "test", "scenes": [{"type": "turn", "vo": "He was proven innocent", "onscreen": ""}]}
    with pytest.raises(canon.CanonError):
        canon.check_finding(reel)


# ── The scripts ───────────────────────────────────────────────────────────


@pytest.mark.parametrize("n", REELS)
def test_script_passes_canon(n):
    canon.verify(timeline.load_reel(n))  # raises on any contradiction


@pytest.mark.parametrize("n", REELS)
def test_script_states_the_finding(n):
    reel = timeline.load_reel(n)
    blob = " ".join(f"{s.get('vo','')} {s.get('onscreen','')}" for s in reel["scenes"]).lower()
    assert canon.REQUIRED_FINDING in blob


@pytest.mark.parametrize("n", REELS)
def test_timeline_tiles_sixty_seconds(n):
    _reel, cuts, _notes = timeline.build(n)
    assert cuts[0].t_start == 0
    assert cuts[-1].t_end == pytest.approx(60.0)
    for previous, nxt in zip(cuts, cuts[1:]):
        assert nxt.t_start == pytest.approx(previous.t_end)


@pytest.mark.parametrize("n", REELS)
def test_every_reel_has_the_five_part_skeleton(n):
    reel = timeline.load_reel(n)
    types = [s["type"] for s in reel["scenes"]]
    assert types[0] == "hook"
    assert types.count("beat") == 4
    assert "turn" in types and "man" in types
    assert types[-1] == "cta"


@pytest.mark.parametrize("n", REELS)
def test_music_enters_only_at_the_turn(n):
    reel = timeline.load_reel(n)
    music = [s for s in reel["scenes"] if s.get("music_in")]
    assert len(music) == 1
    assert music[0]["type"] == "turn"


def test_the_man_and_cta_are_held_constant_across_reels():
    """The control in the test design: only the four-beat frame varies."""
    man_lines = set()
    for n in REELS:
        reel = timeline.load_reel(n)
        man = next(s for s in reel["scenes"] if s["type"] == "man")
        man_lines.add(man["vo"].strip())
    assert len(man_lines) == 1, "THE MAN must be identical across all three reels"


def test_cta_shape_is_constant_but_the_prompt_varies():
    prompts = []
    for n in REELS:
        reel = timeline.load_reel(n)
        cta = next(s for s in reel["scenes"] if s["type"] == "cta")
        assert cta["vo"].startswith("This is that record. Clearly Established. Link in bio.")
        prompts.append(cta["vo"])
    assert len(set(prompts)) == 3, "each reel asks for a different comment"


def test_comment_keywords_match_the_test_design():
    keywords = {timeline.load_reel(n)["comment_keyword"] for n in REELS}
    assert keywords == {"RECORD", "STORY"}


# ── Layout ────────────────────────────────────────────────────────────────


def _inside_safe(box) -> bool:
    return (
        box.x >= brand.SAFE["left"]
        and box.right <= brand.W - brand.SAFE["right"]
        and box.y >= brand.SAFE["top"]
        and box.bottom <= brand.H - brand.SAFE["bottom"]
    )


@pytest.mark.parametrize("n", REELS)
def test_every_element_is_inside_the_safe_area(n):
    reel = timeline.load_reel(n)
    for scene in reel["scenes"]:
        rendered = scenes.build_scene(scene, reel)
        for box, label, _reveal in rendered.boxes:
            assert _inside_safe(box), f"reel {n} {scene['type']}/{label} leaves the safe area: {box}"


@pytest.mark.parametrize("n", REELS)
def test_no_two_elements_collide_within_a_scene(n):
    reel = timeline.load_reel(n)
    for scene in reel["scenes"]:
        rendered = scenes.build_scene(scene, reel)
        boxes = rendered.boxes
        for i, (a, la, _) in enumerate(boxes):
            for b, lb, _ in boxes[i + 1 :]:
                collide = not (a.right <= b.x or b.right <= a.x or a.bottom <= b.y or b.bottom <= a.y)
                assert not collide, f"reel {n} {scene['type']}: {la} overlaps {lb}"


@pytest.mark.parametrize("n", REELS)
def test_nothing_runs_into_the_caption_band(n):
    """Captions own the strip above the bottom safe band. Scenes stay out of it."""
    reel = timeline.load_reel(n)
    band_top = captions.CAPTION_BAND_BOTTOM - 200
    for scene in reel["scenes"]:
        if scene["type"] == "cta":
            continue
        rendered = scenes.build_scene(scene, reel)
        for box, label, _ in rendered.boxes:
            assert box.bottom <= band_top, f"reel {n} {scene['type']}/{label} reaches the caption band"


# ── Captions ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("n", REELS)
def test_captions_are_never_more_than_two_lines(n):
    _reel, cuts, _notes = timeline.build(n)
    for cue in captions.cues_for(cuts):
        assert cue.text.count("\n") + 1 <= 2, f"cue {cue.index} has more than two lines"


@pytest.mark.parametrize("n", REELS)
def test_captions_run_in_order_and_stay_inside_their_scene(n):
    _reel, cuts, _notes = timeline.build(n)
    cues = captions.cues_for(cuts)
    for previous, nxt in zip(cues, cues[1:]):
        assert nxt.start >= previous.start
    assert cues[-1].end <= cuts[-1].t_end + 1e-6


@pytest.mark.parametrize("n", REELS)
def test_srt_round_trips(n):
    _reel, cuts, _notes = timeline.build(n)
    cues = captions.cues_for(cuts)
    srt = captions.to_srt(cues)
    blocks = [b for b in srt.strip().split("\n\n") if b.strip()]
    assert len(blocks) == len(cues)
    assert "-->" in blocks[0]


@pytest.mark.parametrize("n", REELS)
def test_caption_text_carries_no_banned_phrase(n):
    _reel, cuts, _notes = timeline.build(n)
    for cue in captions.cues_for(cuts):
        canon.check_banned(cue.text, f"reel {n} caption {cue.index}")


# ── Brand ─────────────────────────────────────────────────────────────────


def test_brand_colours_are_the_locked_values():
    assert brand.TOKENS["colors"] == {
        "navy": "#0B1F3A",
        "cream": "#F3EBDD",
        "brass": "#B08D57",
        "green": "#2E6B4F",
        "gold": "#D4AF37",
    }


def test_canvas_is_a_vertical_reel():
    assert (brand.W, brand.H, brand.FPS) == (1080, 1920, 30)


def test_a_serif_is_in_force_never_a_sans():
    path = brand._resolve("regular").lower()
    assert not any(sans in path for sans in ("dejavusans", "liberationsans", "poppins", "arial"))


def test_end_card_carries_the_three_required_marks():
    for n in REELS:
        reel = timeline.load_reel(n)
        cta = next(s for s in reel["scenes"] if s["type"] == "cta")
        labels = {label for _b, label, _r in scenes.build_scene(cta, reel).boxes}
        assert {"endcard-section", "endcard-scales", "endcard-lockup"} <= labels


@pytest.mark.parametrize("n", REELS)
def test_no_on_screen_character_renders_as_tofu(n):
    """
    EB Garamond's cmap claims U+2013 and its outline is empty, so "5–0" shipped
    as "5□0" until a render was looked at. A coverage check would not have
    caught it; rendering the character does.
    """
    reel = timeline.load_reel(n)
    prose = brand.font(64, "regular")
    numerals = brand.numeral_font(120)
    for scene in reel["scenes"]:
        text = (scene.get("onscreen") or "") + str(scene.get("span") or "") + str(scene.get("hold_number") or "")
        if "card" in scene:
            text += scene["card"]["label"] + scene["card"]["line"]
        for c in scene.get("compare", []):
            text += c["label"] + c["line"]
        assert brand.missing_glyphs(text, prose) == [], f"reel {n} {scene['type']}: tofu in prose"
        value = (scene.get("number") or {}).get("value", "")
        assert brand.missing_glyphs(value, numerals) == [], f"reel {n} {scene['type']}: tofu in numerals"


def test_display_figures_are_lining_not_old_style():
    """The numeral face is chosen for real figures; assert it is not the prose face."""
    assert brand.numeral_font(120).path != brand.font(120, "bold").path


def test_grain_is_deterministic():
    """A re-run must produce identical files, so the grain cannot be random."""
    a = scenes._grain_tiles(2, seed=1)[0].tobytes()
    b = scenes._grain_tiles(2, seed=1)[0].tobytes()
    assert a == b


def test_hook_is_on_screen_at_frame_one():
    for n in REELS:
        reel = timeline.load_reel(n)
        hook = next(s for s in reel["scenes"] if s["type"] == "hook")
        rendered = scenes.build_scene(hook, reel)
        reveals = [reveal for _layer, _pos, reveal, label in rendered.layers if label == "hook"]
        assert reveals and min(reveals) == 0.0, "the hook must be visible at frame 1, no fade"
