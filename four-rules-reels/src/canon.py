"""
The locked record.

Every fact the reels assert lives here once. `verify()` runs before a single
frame is drawn: if a script contradicts the record, or reaches for language the
record cannot carry, the build fails rather than rendering something that would
have to be retracted.

This is the point of the whole pipeline. A film about a record that was edited
cannot itself be loose with its record.
"""

from __future__ import annotations

import re
from datetime import date

# ── The record ────────────────────────────────────────────────────────────

CANON = {
    "case": "State v. Martin, Op. No. 25093 (S.C. 2000)",
    "arrest_year": 1996,
    "age_at_arrest": 26,
    "conviction_year": 1997,
    "reversal_date": "2000-03-27",
    "refiled_date": "2000-06-12",
    # The remittitur is the Supreme Court's letter returning the case to the
    # trial court. It is in the case file, dated June 28, 2000.
    "remittitur_date": "2000-06-28",
    "days_between_filings": 77,
    "days_to_remittitur": 93,
    "incarceration": "three years and eleven months",
    "court_vote": "unanimous",
    # LOCKED 2026-09-05 by Michael: the over-detention is the span from the
    # opinion that freed him to the remittitur. Equals days_to_remittitur.
    # (Superseded 2026-09-04 lock: 77, the span between the two filings.)
    "over_detention_days": 93,
    "appellate_counsel": "Dan Stacey",
    "counsel_instruction": "get those words into a record nobody can edit",
}

# Tier D. Each of these either supplies a motive the record does not establish,
# or states a legal conclusion no court has reached. The build fails on any of
# them, in voiceover or on screen.
BANNED_PHRASES = [
    "quietly",
    "secretly",
    "conveniently",
    "suspiciously",
    "conspired",
    "they knew",
    "in order to",
    "so that",
    "illegally detained",
    "stolen land",
    "Swanson Plantation",
    "nineteen years old",
]

# The finding, in the only form it may take. Never softened to a procedural
# win, never sharpened to a declaration of proven innocence.
REQUIRED_FINDING = "impossible to convict"


class CanonError(AssertionError):
    """Raised when a script contradicts the record. Never caught by the build."""


# ── Checks ────────────────────────────────────────────────────────────────


def check_arithmetic() -> None:
    """Both day counts are derived from the dates, not asserted — so they cannot drift."""
    reversal = date.fromisoformat(CANON["reversal_date"])
    refiled = date.fromisoformat(CANON["refiled_date"])
    remittitur = date.fromisoformat(CANON["remittitur_date"])
    between = (refiled - reversal).days
    if between != CANON["days_between_filings"]:
        raise CanonError(
            f"{CANON['reversal_date']} to {CANON['refiled_date']} is {between} days, "
            f"but CANON says {CANON['days_between_filings']}"
        )
    to_remit = (remittitur - reversal).days
    if to_remit != CANON["days_to_remittitur"]:
        raise CanonError(
            f"{CANON['reversal_date']} to {CANON['remittitur_date']} is {to_remit} days, "
            f"but CANON says {CANON['days_to_remittitur']}"
        )
    if CANON["over_detention_days"] != CANON["days_to_remittitur"]:
        raise CanonError(
            "over_detention_days and days_to_remittitur must be equal "
            f"({CANON['over_detention_days']} vs {CANON['days_to_remittitur']})"
        )


def check_banned(text: str, where: str) -> None:
    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase.lower() in lowered:
            raise CanonError(f"banned phrase {phrase!r} in {where}: {text[:90]!r}")


def check_numbers(text: str, where: str) -> None:
    """
    Every number on screen or in the voiceover must be one of the record's.

    Written as a whitelist rather than a blacklist: a number that is not in the
    record has no business in a reel, so anything unrecognised fails loudly.
    """
    allowed = {
        str(CANON["age_at_arrest"]),
        str(CANON["arrest_year"]),
        str(CANON["conviction_year"]),
        str(CANON["days_between_filings"]),
        str(CANON["days_to_remittitur"]),
        "2000",
        "25093",
        "3",
        "11",
        "5",
        "0",
        "27",
        "12",
        "28",
        "6",
        "1",
        "2",
        "4",
    }
    for token in re.findall(r"\b\d+\b", text):
        if token not in allowed:
            raise CanonError(f"unrecognised number {token!r} in {where}: {text[:90]!r}")

    lowered = text.lower()
    if "seventy-seven" in lowered and CANON["days_between_filings"] != 77:
        raise CanonError(f"'seventy-seven' written out in {where} but CANON says otherwise")
    if "ninety-three" in lowered and CANON["days_to_remittitur"] != 93:
        raise CanonError(f"'ninety-three' written out in {where} but CANON says otherwise")
    # Seventy-seven is the erasure, never the detention. The detention is ninety-three.
    if re.search(r"seventy-seven\b.{0,80}?\b(locked up|held|kept me|detention|after that order)", lowered):
        raise CanonError(f"seventy-seven presented as the over-detention in {where}: {text[:90]!r}")


def check_finding(reel: dict) -> None:
    """The finding must be stated, in full, at least once per reel."""
    blob = " ".join(
        f"{scene.get('vo', '')} {scene.get('onscreen', '')}" for scene in reel["scenes"]
    ).lower()
    if REQUIRED_FINDING not in blob:
        raise CanonError(f"{reel['id']}: never states {REQUIRED_FINDING!r}")

    for soft in ("procedural win", "technicality", "overturned on a technicality"):
        if soft in blob:
            raise CanonError(f"{reel['id']}: softens the finding with {soft!r}")
    for hard in ("proven innocent", "declared innocent", "exonerated by dna"):
        if hard in blob:
            raise CanonError(f"{reel['id']}: overstates the finding with {hard!r}")


def verify(reel: dict) -> None:
    """Run every check against one script. Raises CanonError on any failure."""
    check_arithmetic()
    check_finding(reel)
    for scene in reel["scenes"]:
        for field in ("vo", "onscreen"):
            text = scene.get(field)
            if not text:
                continue
            where = f"{reel['id']} {scene['type']} {field}"
            check_banned(text, where)
            check_numbers(text, where)


def summary() -> str:
    reversal = date.fromisoformat(CANON["reversal_date"])
    refiled = date.fromisoformat(CANON["refiled_date"])
    remittitur = date.fromisoformat(CANON["remittitur_date"])
    return (
        f"{CANON['case']} · arrested {CANON['arrest_year']} at {CANON['age_at_arrest']} · "
        f"convicted {CANON['conviction_year']} · reversed {reversal:%B %-d, %Y} "
        f"({CANON['court_vote']}) · refiled {refiled:%B %-d, %Y} "
        f"({(refiled - reversal).days} days) · remittitur {remittitur:%B %-d, %Y} "
        f"({(remittitur - reversal).days} days)"
    )


if __name__ == "__main__":
    check_arithmetic()
    print(summary())
    print("canon: OK")
