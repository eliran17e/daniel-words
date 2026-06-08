from typing import List, TypedDict

from sqlalchemy.orm import Session

from app.models import Word
from app.services.emoji_service import lookup_emoji, translate


class SeedWord(TypedDict, total=False):
    word: str
    language: str
    emoji: str
    category: str


_HEBREW_SEED: List[SeedWord] = [
    # food
    {"word": "תפוח", "category": "food"},
    {"word": "בננה", "category": "food"},
    {"word": "תפוז", "category": "food"},
    {"word": "לחם", "category": "food"},
    {"word": "חלה", "category": "food"},
    {"word": "עוגה", "category": "food"},
    {"word": "ביצה", "category": "food"},
    {"word": "פיצה", "category": "food"},
    {"word": "פיתה", "category": "food"},
    {"word": "שוקו", "category": "food"},
    {"word": "אורז", "category": "food"},
    {"word": "גזר", "category": "food"},
    {"word": "פלפל", "category": "food"},
    {"word": "סלט", "category": "food"},
    {"word": "ארטיק", "category": "food"},
    {"word": "קרטיב", "category": "food"},
    {"word": "מתוק", "category": "food"},
    # animals
    {"word": "כלב", "category": "animal"},
    {"word": "חתול", "category": "animal"},
    {"word": "דג", "category": "animal"},
    {"word": "פרה", "category": "animal"},
    {"word": "אריה", "category": "animal"},
    {"word": "נמר", "category": "animal"},
    {"word": "שועל", "category": "animal"},
    {"word": "ברווז", "category": "animal"},
    {"word": "עכבר", "category": "animal"},
    {"word": "כבשה", "category": "animal"},
    {"word": "כריש", "category": "animal"},
    {"word": "זברה", "category": "animal"},
    {"word": "דולפין", "category": "animal"},
    {"word": "פרפר", "category": "animal"},
    {"word": "תוכי", "category": "animal"},
    {"word": "עורב", "category": "animal"},
    # nature
    {"word": "שמש", "category": "nature"},
    {"word": "ירח", "category": "nature"},
    {"word": "כוכב", "category": "nature"},
    {"word": "פרח", "category": "nature"},
    {"word": "קשת", "category": "nature"},
    {"word": "גשם", "category": "nature"},
    {"word": "קרח", "category": "nature"},
    {"word": "דשא", "category": "nature"},
    # vehicles
    {"word": "מטוס", "category": "vehicle"},
    {"word": "מסוק", "category": "vehicle"},
    {"word": "סירה", "category": "vehicle"},
    {"word": "אוטו", "category": "vehicle"},
    # objects
    {"word": "כדור", "category": "object"},
    {"word": "שעון", "category": "object"},
    {"word": "ספר", "category": "object"},
    {"word": "בלון", "category": "object"},
    {"word": "סכין", "category": "object"},
    {"word": "מזלג", "category": "object"},
    {"word": "פאזל", "category": "object"},
    {"word": "דגל", "category": "object"},
    {"word": "דלת", "category": "object"},
    {"word": "ברז", "category": "object"},
    {"word": "סרט", "category": "object"},
    {"word": "גשר", "category": "object"},
    {"word": "קופסא", "category": "object"},
    {"word": "ארגז", "category": "object"},
    {"word": "רדיו", "category": "object"},
    {"word": "קומקום", "category": "object"},
    {"word": "ארנק", "category": "object"},
    {"word": "משחק", "category": "object"},
    {"word": "מגדל", "category": "object"},
    {"word": "כרטיס", "category": "object"},
    {"word": "ילקוט", "category": "object"},
    {"word": "מחברת", "category": "object"},
    {"word": "מברג", "category": "object"},
    {"word": "גלגל", "category": "object"},
    {"word": "בקבוק", "category": "object"},
    {"word": "כפתור", "category": "object"},
    {"word": "רמזור", "category": "object"},
    {"word": "קסדה", "category": "object"},
    {"word": "וילון", "category": "object"},
    {"word": "פטיש", "category": "object"},
    {"word": "עיתון", "category": "object"},
    {"word": "נרות", "category": "object"},
    {"word": "ספה", "category": "object"},
    {"word": "דובי", "category": "object"},
    {"word": "סיכה", "category": "object"},
    {"word": "כיתה", "category": "object"},
    {"word": "מפה", "category": "object"},
    {"word": "בועות", "category": "object"},
    {"word": "מיטה", "category": "object"},
    {"word": "כיסא", "category": "object"},
    {"word": "שולחן", "category": "object"},
    {"word": "מחשב", "category": "object"},
    {"word": "כובע", "category": "object"},
    # clothing
    {"word": "חולצה", "category": "clothing"},
    {"word": "שמלה", "category": "clothing"},
    {"word": "מעיל", "category": "clothing"},
    {"word": "גרב", "category": "clothing"},
    {"word": "סנדל", "category": "clothing"},
    {"word": "צעיף", "category": "clothing"},
    # body
    {"word": "רגל", "category": "body"},
    {"word": "אוזן", "category": "body"},
    {"word": "אצבע", "category": "body"},
    # people
    {"word": "תינוק", "category": "people"},
    {"word": "ילדה", "category": "people"},
    {"word": "סבתא", "category": "people"},
    {"word": "שוטר", "category": "people"},
    {"word": "מורה", "category": "people"},
    # holiday
    {"word": "שבת", "category": "holiday"},
    {"word": "סוכה", "category": "holiday"},
    # abstract
    {"word": "שלום", "category": "abstract"},
    {"word": "תודה", "category": "abstract"},
    # color / shape / number
    {"word": "אדום", "category": "color"},
    {"word": "עיגול", "category": "shape"},
    {"word": "ארבע", "category": "number"},
    {"word": "מספר", "category": "number"},
]

_ENGLISH_SEED: List[SeedWord] = [
    {"word": "apple", "category": "food"},
    {"word": "banana", "category": "food"},
    {"word": "fish", "category": "animal"},
    {"word": "dog", "category": "animal"},
    {"word": "cat", "category": "animal"},
    {"word": "star", "category": "nature"},
    {"word": "sun", "category": "nature"},
    {"word": "moon", "category": "nature"},
]


def _build_seed_words() -> List[SeedWord]:
    out: List[SeedWord] = []
    for entry in _HEBREW_SEED:
        emoji = lookup_emoji(entry["word"], "he")
        if not emoji:
            continue
        out.append({
            "word": entry["word"],
            "language": "he",
            "emoji": emoji,
            "category": entry.get("category", "general"),
        })
    for entry in _ENGLISH_SEED:
        emoji = lookup_emoji(entry["word"], "en")
        out.append({
            "word": entry["word"],
            "language": "en",
            "emoji": emoji or "❓",
            "category": entry.get("category", "general"),
        })
    return out


SEED_WORDS: List[SeedWord] = _build_seed_words()


def seed_words(db: Session) -> int:
    added = 0
    for entry in SEED_WORDS:
        exists = (
            db.query(Word)
            .filter(
                Word.word == entry["word"],
                Word.language == entry["language"],
            )
            .first()
        )
        if exists:
            continue
        db.add(Word(**entry))
        added += 1
    if added:
        db.commit()
    return added


def repair_missing_visuals(db: Session) -> int:
    rows = (
        db.query(Word)
        .filter(Word.emoji == "❓", Word.image_url.is_(None))
        .all()
    )
    fixed = 0
    for w in rows:
        emoji = lookup_emoji(w.word, w.language)
        if emoji:
            w.emoji = emoji
            fixed += 1
    if fixed:
        db.commit()
    return fixed


def backfill_counterparts(db: Session) -> int:
    """For every word, ensure its translated counterpart exists in the other language."""
    added = 0
    sources = db.query(Word).all()
    existing_keys = {(s.word, s.language) for s in sources}
    queued_keys: set = set()

    for source in sources:
        other_lang = "he" if source.language == "en" else "en"
        other_text = translate(source.word, source.language, other_lang)
        if not other_text:
            continue
        key = (other_text, other_lang)
        if key in existing_keys or key in queued_keys:
            continue
        target_emoji = lookup_emoji(other_text, other_lang)
        if not target_emoji and source.emoji and source.emoji != "❓":
            target_emoji = source.emoji
        target_image = None
        if not target_emoji:
            if source.image_url:
                target_image = source.image_url
            else:
                target_emoji = "❓"
        db.add(
            Word(
                word=other_text,
                language=other_lang,
                emoji=target_emoji,
                image_url=target_image,
                category=source.category or "general",
            )
        )
        queued_keys.add(key)
        added += 1
    if added:
        db.commit()
    return added
