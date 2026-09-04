"""
Voiceover, music bed, and the mix.

Everything here runs offline. No API, no download, no network call at render
time — which constrains two things and the README says so plainly:

  Voiceover  espeak-ng, male, unhurried. It is a placeholder and sounds like
             one. Michael drops audio/vo/reel-N.wav in and `make reel-N`
             uses it instead, with no code change.

  Music bed  No CC0 bed can be fetched offline, so the bed is synthesised: a
             sustained low string-like pad, built from summed detuned
             harmonics with a slow swell. Flagged as a placeholder in QC.

The mix targets −14 LUFS integrated and −1 dBTP, per platform norms, with the
bed sitting at −18 LUFS under the voice and ducking 6 dB when the voice speaks.
"""

from __future__ import annotations

import json
import math
import re
import shutil
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

from .brand import TOKENS
from .timeline import Cut

ROOT = Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "audio" / "vo"
BED_DIR = ROOT / "audio" / "bed"
SR = 48000
AUDIO = TOKENS["audio"]

ESPEAK = shutil.which("espeak-ng") or shutil.which("espeak")


class AudioNotes(dict):
    """Whatever QC needs to report about how the audio was made."""


# ── Reading and writing ───────────────────────────────────────────────────


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        frames = w.readframes(w.getnframes())
        data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() == 2:
            data = data.reshape(-1, 2).mean(axis=1)
        if w.getframerate() != SR:
            n = int(len(data) * SR / w.getframerate())
            data = np.interp(np.linspace(0, len(data), n, endpoint=False), np.arange(len(data)), data)
    return data.astype(np.float32)


def write_wav(path: Path, samples: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ── Voiceover ─────────────────────────────────────────────────────────────


FLITE = shutil.which("flite")
PIPER = shutil.which("piper")


def synth_scene_vo(text: str, out: Path) -> np.ndarray:
    """
    One scene, spoken. Male, low, ~140 wpm — unhurried, per the brief.

    Which synthesiser is `audio.vo_engine` in brand/tokens.json. All of them
    run offline; none of them is the voice this reel should ship with — that
    is Michael's, and it drops in via audio/vo/<reel-id>.wav. The engines
    exist so the timing, ducking and captions can be judged against something
    less grating than formant synthesis while that recording is made.
    """
    out.parent.mkdir(parents=True, exist_ok=True)
    engine = AUDIO.get("vo_engine", "espeak")

    if engine == "espeak":
        if not ESPEAK:
            raise RuntimeError("espeak-ng is not installed")
        cmd = [ESPEAK, "-v", "en-us+m3", "-s", "140", "-p", "28", "-a", "170", "-w", str(out), text]

    elif engine.startswith("mbrola-"):
        # espeak-ng drives the MBROLA diphone voices: mb-us2, mb-us3.
        if not ESPEAK:
            raise RuntimeError("espeak-ng is not installed (needed to drive MBROLA)")
        voice = "mb-" + engine.split("-", 1)[1]
        cmd = [ESPEAK, "-v", voice, "-s", "130", "-w", str(out), text]

    elif engine.startswith("flite-"):
        if not FLITE:
            raise RuntimeError("flite is not installed")
        voice = engine.split("-", 1)[1]
        cmd = [FLITE, "-voice", voice, "--setf", "duration_stretch=1.12", "-t", text, "-o", str(out)]

    elif engine.startswith("piper:"):
        # A neural voice, if someone has placed the .onnx (and its .json) in
        # audio/vo/voices/. The models live on Hugging Face, which this render
        # environment cannot reach, so this path is never taken by default.
        model = ROOT / "audio" / "vo" / "voices" / engine.split(":", 1)[1]
        if not model.exists():
            raise RuntimeError(f"piper voice not found: {model}")
        if PIPER:
            cmd = [PIPER, "--model", str(model), "--output_file", str(out)]
            subprocess.run(cmd, input=text, text=True, check=True, capture_output=True)
            return read_wav(out)
        from piper import PiperVoice  # pip install piper-tts
        import wave as _wave
        voice = PiperVoice.load(str(model))
        with _wave.open(str(out), "wb") as w:
            voice.synthesize(text, w)
        return read_wav(out)

    else:
        raise RuntimeError(f"unknown vo_engine {engine!r} — see brand/tokens.json audio._vo_engines")

    subprocess.run(cmd, check=True, capture_output=True)
    return read_wav(out)


def _fit(samples: np.ndarray, target_len: int) -> np.ndarray:
    """
    Fit a spoken line into its slot.

    Only ever a small correction, and resampling rather than truncating: a
    clipped word is a defect a viewer hears, where two percent of tempo is not.
    """
    if len(samples) == 0:
        return np.zeros(target_len, dtype=np.float32)
    if len(samples) <= target_len:
        padded = np.zeros(target_len, dtype=np.float32)
        padded[: len(samples)] = samples
        return padded
    idx = np.linspace(0, len(samples) - 1, target_len)
    return np.interp(idx, np.arange(len(samples)), samples).astype(np.float32)


def build_vo(reel_id: str, cuts: list[Cut], notes: AudioNotes) -> np.ndarray:
    """
    The voiceover track for a whole reel.

    A supplied human recording is used whole and untouched. Otherwise each
    scene is synthesised separately and placed at its own cut, so the cuts and
    the words stay locked together.
    """
    supplied = VO_DIR / f"{reel_id}.wav"
    total_len = int(round(cuts[-1].t_end * SR))

    if supplied.exists():
        notes["vo_source"] = f"supplied recording ({supplied.name})"
        notes["vo_is_placeholder"] = False
        track = read_wav(supplied)
        out = np.zeros(total_len, dtype=np.float32)
        out[: min(len(track), total_len)] = track[:total_len]
        return out

    notes["vo_source"] = f"PLACEHOLDER — {AUDIO.get('vo_engine', 'espeak')} synthesis"
    notes["vo_is_placeholder"] = True
    scratch = VO_DIR / "_scenes"
    out = np.zeros(total_len, dtype=np.float32)
    for cut in cuts:
        text = cut.scene.get("vo", "").strip()
        if not text:
            continue
        raw = synth_scene_vo(text, scratch / f"{reel_id}-{cut.type}-{int(cut.t_start)}.wav")
        # Leave a beat of air at the head and tail of each slot.
        slot = int(round(cut.duration * SR))
        head = int(0.12 * SR)
        body = _fit(raw, max(slot - head - int(0.18 * SR), 1))
        start = int(round(cut.t_start * SR)) + head
        out[start : start + len(body)] += body
    return out


# ── Music bed ─────────────────────────────────────────────────────────────


def synth_bed(duration_s: float, notes: AudioNotes) -> np.ndarray:
    """
    A sustained low pad.

    No clean CC0 bed can be sourced without a network call, so this is
    synthesised and flagged. Two detuned voices a fifth apart, a slow swell,
    and a gentle low-pass — enough to lift the turn without ever becoming
    something a viewer notices.
    """
    notes["bed_source"] = "PLACEHOLDER — synthesised pad (no CC0 bed available offline)"
    notes["bed_is_placeholder"] = True

    n = int(duration_s * SR)
    t = np.arange(n) / SR
    pad = np.zeros(n, dtype=np.float32)
    root = 110.0  # A2
    for freq, gain in ((root, 0.5), (root * 1.5, 0.32), (root * 2, 0.2), (root * 3, 0.08)):
        for detune in (-0.6, 0.0, 0.7):
            pad += gain * np.sin(2 * np.pi * (freq + detune) * t + freq).astype(np.float32)
    pad /= np.max(np.abs(pad)) or 1.0

    # Slow swell in, long tail out.
    swell = np.clip(t / 3.0, 0, 1) ** 1.5
    tail = np.clip((duration_s - t) / 2.5, 0, 1)
    pad *= (swell * tail).astype(np.float32)

    # One-pole low-pass — takes the edge off the harmonics.
    alpha = 0.06
    filtered = np.zeros_like(pad)
    acc = 0.0
    for i, sample in enumerate(pad):
        acc += alpha * (sample - acc)
        filtered[i] = acc
    return filtered.astype(np.float32)


# ── Mix ───────────────────────────────────────────────────────────────────


def _rms_db(x: np.ndarray) -> float:
    if len(x) == 0:
        return -120.0
    rms = float(np.sqrt(np.mean(np.square(x))))
    return 20 * math.log10(rms) if rms > 1e-9 else -120.0


def _envelope(vo: np.ndarray, window: int) -> np.ndarray:
    """A smoothed magnitude envelope of the voice, for sidechain ducking."""
    mag = np.abs(vo)
    kernel = np.ones(window, dtype=np.float32) / window
    env = np.convolve(mag, kernel, mode="same")
    return env / (np.max(env) or 1.0)


def mix(vo: np.ndarray, cuts: list[Cut], music_in_s: float, notes: AudioNotes) -> np.ndarray:
    """Voice plus bed, bed ducked under voice, bed silent before the turn."""
    total = len(vo)
    bed = np.zeros(total, dtype=np.float32)

    start = int(round(music_in_s * SR))
    if start < total:
        bed_part = synth_bed((total - start) / SR, notes)
        bed[start : start + len(bed_part)] = bed_part[: total - start]

    # Level the bed roughly AUDIO['bed_lufs'] under the voice, then duck.
    vo_level = _rms_db(vo[vo != 0]) if np.any(vo) else -20.0
    target = vo_level + (AUDIO["bed_lufs"] - AUDIO["target_lufs"])
    bed_level = _rms_db(bed[bed != 0]) if np.any(bed) else -120.0
    if bed_level > -119:
        bed *= 10 ** ((target - bed_level) / 20)

    duck_gain = 10 ** (AUDIO["duck_db"] / 20)
    env = _envelope(vo, int(0.15 * SR))
    bed *= 1.0 - (1.0 - duck_gain) * env

    notes["music_in_s"] = music_in_s
    notes["bed_silent_before_turn"] = bool(np.max(np.abs(bed[:start])) < 1e-6) if start > 0 else True
    return np.clip(vo + bed, -1.0, 1.0)


def write_track(path: Path, samples: np.ndarray, notes: AudioNotes) -> Path:
    """
    Write the mix, then let ffmpeg do the loudness normalisation.

    loudnorm is a proper EBU R128 implementation; approximating it by hand
    would be the kind of shortcut this pipeline exists to avoid.
    """
    raw = path.with_suffix(".raw.wav")
    write_wav(raw, samples)

    # Measure, then apply one linear gain.
    #
    # loudnorm's own normalisation is a dynamic process: it decides how hard to
    # work while listening, and lands a decibel or so off target on material
    # that opens in silence — which every one of these reels does. Integrated
    # loudness moves one-for-one with gain, so measuring and then applying a
    # single computed gain hits the number exactly and changes nothing about
    # the dynamics of the read.
    measured_i, measured_tp = measure_loudness(raw)
    notes["loudness_measured_before"] = f"{measured_i:.1f} LUFS, peak {measured_tp:.1f} dBFS"

    # Gain alone cannot get here. A synthesised read is peaky and quiet — a
    # high crest factor — so lifting it to −14 LUFS by fader would put the
    # transients through the ceiling, and holding the ceiling by fader leaves
    # it four decibels short. So: lift to target, then limit the transients,
    # then measure again and trim. The limiter touches only the peaks, which is
    # exactly the part of a spoken track nobody is listening to.
    # AAC reconstruction peaks roughly a decibel above its source, measured on
    # these renders, so the wav aims that far below the true-peak ceiling.
    ceiling_db = AUDIO["true_peak_db"] - AUDIO["aac_headroom_db"]
    limit = 10 ** (ceiling_db / 20)
    gain = AUDIO["target_lufs"] - measured_i
    source = raw

    for attempt in range(5):
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(source),
                "-af",
                f"volume={gain:.3f}dB,alimiter=limit={limit:.4f}:attack=5:release=60:level=disabled",
                "-ar", str(SR), "-ac", "1", str(path),
            ],
            check=True,
            capture_output=True,
        )
        result_i, result_tp = measure_loudness(path)
        notes["loudness_passes"] = attempt + 1
        if abs(result_i - AUDIO["target_lufs"]) <= 0.25:
            break
        # Limiting pulled it down; ask for the difference back and go again
        # from the original, so gain never compounds on already-limited audio.
        gain += AUDIO["target_lufs"] - result_i

    raw.unlink(missing_ok=True)
    notes["loudness_target"] = f"{AUDIO['target_lufs']} LUFS / {AUDIO['true_peak_db']} dBTP"
    notes["loudness_applied_gain_db"] = round(gain, 2)
    notes["loudness_measured_after"] = f"{result_i:.1f} LUFS, peak {result_tp:.1f} dBFS"
    return path


def measure_loudness(path: Path) -> tuple[float, float]:
    """
    Integrated loudness and sample peak, from ffmpeg's EBU R128 meter.

    ebur128 prints a running figure on every frame and the real one in a
    summary at the end, so the last match is the only one worth reading.
    """
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    integrated = re.findall(r"I:\s*(-?\d+\.\d+)\s*LUFS", proc.stderr)
    peak = re.findall(r"Peak:\s*(-?\d+\.\d+)\s*dBFS", proc.stderr)
    return (float(integrated[-1]) if integrated else -70.0, float(peak[-1]) if peak else -1.0)


def bed_license_text() -> str:
    return (
        "MUSIC BED — LICENCE\n"
        "===================\n\n"
        "The bed in these renders is not licensed third-party music. It is\n"
        "synthesised at render time by src/audio.py:synth_bed() — summed detuned\n"
        "harmonics with a slow swell and a one-pole low-pass filter.\n\n"
        "It is therefore an original work owned by Revelatory Productions, LLC,\n"
        "with no third-party rights attached and nothing to clear.\n\n"
        "It is also a PLACEHOLDER. It exists so the turn has lift and so the\n"
        "ducking and loudness stages have something real to act on. Replace it\n"
        "with a scored or licensed bed before publication, and record the licence\n"
        "here when you do.\n"
    )
