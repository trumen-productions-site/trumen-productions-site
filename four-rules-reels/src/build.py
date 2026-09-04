"""
The build.

    python -m src.build --reel 1        one reel
    python -m src.build --reel all      all three
    python -m src.build --reel 1 --no-qc

Frames are drawn with Pillow and piped straight into ffmpeg as raw video.

WHY NOT MOVIEPY (the handoff asks for a justification)
------------------------------------------------------
moviepy is a convenience layer over exactly this pipe, and it brings imageio,
imageio-ffmpeg, decorator and proglog with it — four dependencies whose only
job is to build the command below. Every scene here is a Pillow composite
anyway, so moviepy would be wrapping our own frames to hand them to a binary we
already call. Piping directly is fewer moving parts, byte-for-byte
reproducible, and leaves the encoder settings visible in one place instead of
behind a helper's defaults.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

from . import audio as audio_mod
from . import captions as captions_mod
from . import brand, canon, qc, scenes, timeline

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
THUMBS = OUT / "thumbnails"
THUMB_TIMES = (0.0, 6.0, 32.0, 44.0, 58.0)

FPS = brand.FPS
W, H = brand.W, brand.H


def _ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg is not installed and is required to encode")
    return exe


def render_reel(reel_number: int, run_qc: bool = True) -> dict:
    started = time.time()
    OUT.mkdir(parents=True, exist_ok=True)
    THUMBS.mkdir(parents=True, exist_ok=True)

    # 1. Timeline. A supplied human voiceover sets the real duration, so its
    #    length is measured before the cuts are resolved.
    reel_probe = timeline.load_reel(reel_number)
    reel_id = reel_probe["id"]
    supplied = audio_mod.VO_DIR / f"{reel_id}.wav"
    supplied_len = len(audio_mod.read_wav(supplied)) / audio_mod.SR if supplied.exists() else None

    reel, cuts, notes = timeline.build(reel_number, supplied_len)
    total_s = cuts[-1].t_end
    print(f"  {reel_id}: {len(cuts)} scenes, {total_s:.2f}s")

    # 2. Audio.
    anotes = audio_mod.AudioNotes()
    vo = audio_mod.build_vo(reel_id, cuts, anotes)
    mixed = audio_mod.mix(vo, cuts, timeline.music_in_at(cuts), anotes)
    audio_path = audio_mod.write_track(OUT / f"{reel_id}.m4a.wav", mixed, anotes)
    print(f"  audio: {anotes['vo_source']}")

    # 3. Captions.
    cues = captions_mod.cues_for(cuts)
    (OUT / f"{reel_id}.srt").write_text(captions_mod.to_srt(cues), encoding="utf-8")

    # 4. Frames → ffmpeg.
    built = {id(cut): scenes.build_scene(cut.scene, reel) for cut in cuts}
    video_only = OUT / f"{reel_id}.video.mp4"
    proc = subprocess.Popen(
        [
            _ffmpeg(), "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(video_only),
        ],
        stdin=subprocess.PIPE,
    )

    total_frames = int(round(total_s * FPS))
    thumbs_wanted = {int(round(t * FPS)): t for t in THUMB_TIMES if t < total_s}
    cut_index = 0
    caption_boxes: list = []

    try:
        for frame_index in range(total_frames):
            t = frame_index / FPS
            while cut_index + 1 < len(cuts) and t >= cuts[cut_index].t_end:
                cut_index += 1
            cut = cuts[cut_index]
            rendered = built[id(cut)]
            frame = rendered.frame(t - cut.t_start, frame_index)

            cue = captions_mod.cue_at(cues, t)
            if cue is not None:
                layer, local = captions_mod.render_cue(cue)
                pos = captions_mod.caption_position(layer)
                frame.paste(layer, pos, layer)
                caption_boxes.append(
                    (brand.Box(pos[0] + local.x, pos[1] + local.y, local.w, local.h), f"caption-{cue.index}")
                )

            if frame_index in thumbs_wanted:
                frame.save(THUMBS / f"{reel_id}-{thumbs_wanted[frame_index]:04.1f}s.png")

            proc.stdin.write(frame.tobytes())

            if frame_index % 300 == 0:
                pct = 100 * frame_index / total_frames
                print(f"    {pct:5.1f}%  ({frame_index}/{total_frames})", flush=True)
    finally:
        proc.stdin.close()
        proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed encoding {reel_id} (exit {proc.returncode})")

    # 5. Mux.
    final = OUT / f"{reel_id}.mp4"
    subprocess.run(
        [
            _ffmpeg(), "-y", "-loglevel", "error",
            "-i", str(video_only), "-i", str(audio_path),
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", "-shortest", str(final),
        ],
        check=True,
    )
    video_only.unlink(missing_ok=True)
    _enforce_true_peak(final, audio_path, anotes)

    elapsed = time.time() - started
    print(f"  wrote out/{final.name} in {elapsed:.0f}s")

    result = {
        "reel": reel,
        "reel_id": reel_id,
        "cuts": cuts,
        "cues": cues,
        "notes": notes,
        "audio_notes": anotes,
        "mp4": final,
        "audio_wav": audio_path,
        "scene_boxes": {cut.type: built[id(cut)].boxes for cut in cuts},
        "caption_boxes": caption_boxes,
        "render_seconds": round(elapsed, 1),
        "mixed": mixed,
    }
    if run_qc:
        result["qc"] = qc.check_reel(result)
    return result


def _enforce_true_peak(mp4: Path, audio_wav: Path, notes) -> None:
    """
    Hold the true-peak ceiling on the ENCODED file, not on its source.

    AAC reconstruction overshoots the sample peak of the wav it was given, by
    an amount that depends on the material — about a decibel on one of these
    reels and nearly two on another. Budgeting a fixed headroom is therefore a
    guess that is wrong for at least one reel. So: measure what actually came
    out, and if it is over the line, re-encode the audio a touch quieter and
    re-mux. The video stream is copied, so a correction costs about a second.
    """
    ceiling = brand.TOKENS["audio"]["true_peak_db"]
    trim = 0.0  # cumulative, because each re-encode starts from the same wav
    for attempt in range(2):
        _integrated, peak = audio_mod.measure_loudness(mp4)
        if peak <= ceiling:
            if attempt:
                notes["true_peak_corrections"] = attempt
            return
        trim += ceiling - peak - 0.2  # negative; 0.2 dB of margin
        fixed = mp4.with_suffix(".fixed.mp4")
        subprocess.run(
            [
                _ffmpeg(), "-y", "-loglevel", "error",
                "-i", str(mp4), "-i", str(audio_wav),
                "-map", "0:v:0", "-map", "1:a:0",
                "-af", f"volume={trim:.2f}dB",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", "-shortest", str(fixed),
            ],
            check=True,
        )
        fixed.replace(mp4)
        notes["true_peak_trim_db"] = round(trim, 2)
    notes["true_peak_corrections"] = 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Render the Four Rules reel set.")
    parser.add_argument("--reel", default="all", help="1, 2, 3, or all")
    parser.add_argument("--no-qc", action="store_true", help="skip QC (not for a real build)")
    args = parser.parse_args(argv)

    canon.check_arithmetic()
    print(f"canon: {canon.summary()}")

    numbers = [1, 2, 3] if args.reel == "all" else [int(args.reel)]
    results = []
    for n in numbers:
        print(f"\nreel {n}")
        results.append(render_reel(n, run_qc=not args.no_qc))

    if not args.no_qc:
        report = qc.write_report(results)
        print(f"\nQC report: {report}")
        failed = [r for r in results if not r["qc"]["passed"]]
        if failed:
            print(f"QC FAILED for: {', '.join(r['reel_id'] for r in failed)}", file=sys.stderr)
            return 1
        print("QC: all checks passed on all reels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
