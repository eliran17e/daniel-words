"""Pure-function unit tests for the audio matching logic.

These don't need a DB, a network, or the FastAPI app — they exercise the
algorithms directly. Fastest tests in the suite.
"""

import pytest

from app.services.audio_service import levenshtein, matches, normalize


# ─── normalize ────────────────────────────────────────────────────────────────


def test_normalize_lowercases():
    assert normalize("APPLE") == "apple"


def test_normalize_strips_whitespace_and_punctuation():
    assert normalize("  Hello, World! ") == "helloworld"


def test_normalize_keeps_alphanumeric():
    assert normalize("apple-123") == "apple123"


def test_normalize_preserves_hebrew():
    """Hebrew letters are alphanumeric in Unicode — they survive normalize."""
    assert normalize(" שעון! ") == "שעון"


def test_normalize_empty_string():
    assert normalize("") == ""
    assert normalize("   ") == ""
    assert normalize("...") == ""


# ─── levenshtein ──────────────────────────────────────────────────────────────


def test_levenshtein_identical_strings():
    assert levenshtein("apple", "apple") == 0


def test_levenshtein_one_substitution():
    assert levenshtein("apple", "ample") == 1


def test_levenshtein_one_insertion():
    assert levenshtein("apple", "apples") == 1


def test_levenshtein_one_deletion():
    assert levenshtein("apple", "appl") == 1


def test_levenshtein_empty_inputs():
    assert levenshtein("", "") == 0
    assert levenshtein("apple", "") == 5
    assert levenshtein("", "apple") == 5


def test_levenshtein_completely_different():
    assert levenshtein("cat", "dog") == 3


def test_levenshtein_hebrew_one_edit():
    assert levenshtein("שעון", "שעוז") == 1


# ─── matches ──────────────────────────────────────────────────────────────────


def test_matches_exact():
    assert matches("apple", "apple") is True


def test_matches_substring_in_phrase():
    """If the user said 'I see an apple', the transcript contains 'apple'."""
    assert matches("apple", "I see an apple") is True


def test_matches_one_edit_within_threshold():
    """Length 5 → threshold 2 → 1 edit is fine."""
    assert matches("apple", "ample") is True


def test_matches_completely_wrong():
    assert matches("apple", "elephant") is False


def test_matches_short_word_strict_threshold():
    """Short words (length 2-3) only allow 1 edit, not 2."""
    assert matches("cat", "cot") is True   # 1 edit
    assert matches("cat", "dog") is False  # 3 edits — way over threshold


def test_matches_empty_transcript():
    assert matches("apple", "") is False


def test_matches_empty_target():
    assert matches("", "apple") is False


def test_matches_uses_alt_targets():
    """If main target doesn't match, alt_targets (e.g. translation) might."""
    # User said the Hebrew word but Whisper transcribed phonetically as 'salat'
    assert matches("סלט", "salat", alt_targets=["salad"]) is True


def test_matches_alt_targets_irrelevant_for_exact_match():
    """If the main target matches, alt_targets aren't even consulted."""
    assert matches("apple", "apple", alt_targets=["banana"]) is True


@pytest.mark.parametrize("target,transcript,expected", [
    ("שעון", "שעון", True),
    ("שעון", "שעו", True),   # 1 edit
    ("שעון", "שעוננ", True),  # 1 edit (insertion)
    ("שעון", "מגדל", False),  # totally different
])
def test_matches_hebrew_variants(target, transcript, expected):
    assert matches(target, transcript) is expected
