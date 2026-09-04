"""
Re-run QC against renders already in out/, without re-encoding anything.

    python -m src.qc_cli            all reels present in out/
    python -m src.qc_cli --reel 2

Everything QC needs except the frames is cheap to rebuild: the timeline, the
scene boxes, the cue list. The audio is read back off disk. So a QC pass costs
a second or two rather than five minutes, which is what makes it usable as a
check on a hand-edited script.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import audio as audio_mod
from . import brand, captions as captions_mod, qc, scenes, timeline

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"


def rebuild_result(reel_number: int) -> dict | None:
    reel_probe = timeline.load_reel(reel_number)
    reel_id = reel_probe["id"]
    mp4 = OUT / f"{reel_id}.mp4"
    if not mp4.exists():
        return None

    supplied = audio_mod.VO_DIR / f"{reel_id}.wav"
    supplied_len = len(audio_mod.read_wav(supplied)) / audio_mod.SR if supplied.exists() else None
    reel, cuts, notes = timeline.build(reel_number, supplied_len)

    audio_wav = OUT / f"{reel_id}.m4a.wav"
    mixed = audio_mod.read_wav(audio_wav) if audio_wav.exists() else audio_mod.np.zeros(1)

    built = {cut.type: scenes.build_scene(cut.scene, reel) for cut in cuts}
    cues = captions_mod.cues_for(cuts)

    # The caption boxes are geometry, not pixels, so they rebuild exactly.
    caption_boxes = []
    for cue in cues:
        layer, local = captions_mod.render_cue(cue)
        pos = captions_mod.caption_position(layer)
        caption_boxes.append(
            (brand.Box(pos[0] + local.x, pos[1] + local.y, local.w, local.h), f"caption-{cue.index}")
        )

    return {
        "reel": reel,
        "reel_id": reel_id,
        "cuts": cuts,
        "cues": cues,
        "notes": notes,
        "audio_notes": audio_mod.AudioNotes(
            vo_source="(re-checked from disk — see the render log for provenance)",
            bed_source="(re-checked from disk)",
        ),
        "mp4": mp4,
        "audio_wav": audio_wav,
        "scene_boxes": {t: rs.boxes for t, rs in built.items()},
        "caption_boxes": caption_boxes,
        "render_seconds": 0.0,
        "mixed": mixed,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Re-run QC on existing renders.")
    parser.add_argument("--reel", default="all")
    args = parser.parse_args(argv)

    numbers = [1, 2, 3] if args.reel == "all" else [int(args.reel)]
    results = []
    for n in numbers:
        result = rebuild_result(n)
        if result is None:
            print(f"reel {n}: no render in out/ — skipping")
            continue
        result["qc"] = qc.check_reel(result)
        status = "PASS" if result["qc"].passed else "FAIL"
        print(f"{result['reel_id']}: {status}")
        for check in result["qc"].checks:
            if check.status != "PASS":
                print(f"    {check.number}. {check.name}: {check.status} — {check.detail}")
        results.append(result)

    if not results:
        print("nothing to check; run `make all` first", file=sys.stderr)
        return 1

    print(f"\nQC report: {qc.write_report(results)}")
    return 0 if all(r["qc"].passed for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
