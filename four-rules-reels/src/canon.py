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
    "days_between_filings": 77,
    "incarceration": "three years and eleven months",
    "court_vote": "unanimous",
    # LOCKED 2026-09-04 by Michael. Equals days_between_filings.
    "over_detention_days": 77,
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
    """The 77 days are derived, not asserted — so they cannot drift."""
    reversal = date.fromisoformat(CANON["reversal_date"])
    refiled = date.fromisoformat(CANON["refiled_date"])
    actual = (refiled - reversal).days
    if actual != CANON["days_between_filings"]:
        raise CanonError(
            f"{CANON['reversal_date']} to {CANON['refiled_date']} is {actual} days, "
            f"but CANON says {CANON['days_between_filings']}"
        )
    if CANON["over_detention_days"] != CANON["days_between_filings"]:
        raise CanonError(
            "over_detention_days and days_between_filings must be equal "
            f"({CANON['over_detention_days']} vs {CANON['days_between_filings']})"
        )


def check_banned(text: str, where: str) -> None:
    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase.lower() in lowered:
            raise CanonError(f"banned phrase {phrase!r} in {where}: {text[:90]!r}")


def check_numbers(text: str, where: str) -> None:
    """
    Every 77 on screen or in the voiceover must be one of the record's 77s.

    Written as a whitelist rather than a blacklist: a number that is not in the
    record has no business in a reel, so anything unrecognised fails loudly.
    """
    allowed = {
        str(CANON["age_at_arrest"]),
        str(CANON["arrest_year"]),
        str(CANON["conviction_year"]),
        str(CANON["days_between_filings"]),
        "2000",
        "25093",
        "3",
        "11",
        "5",
        "0",
        "27",
        "12",
        "6",
        "1",
        "2",
        "4",
    }
    for token in re.findall(r"\b\d+\b", text):
        if token not in allowed:
            raise CanonError(f"unrecognised number {token!r} in {where}: {text[:90]!r}")

    if "seventy-seven" in text.lower() and CANON["days_between_filings"] != 77:
        raise CanonError(f"'seventy-seven' written out in {where} but CANON says otherwise")


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
    return (
        f"{CANON['case']} · arrested {CANON['arrest_year']} at {CANON['age_at_arrest']} · "
        f"convicted {CANON['conviction_year']} · reversed {reversal:%B %-d, %Y} "
        f"({CANON['court_vote']}) · refiled {refiled:%B %-d, %Y} · "
        f"{(refiled - reversal).days} days"
    )


if __name__ == "__main__":
    check_arithmetic()
    print(summary())
    print("canon: OK")
