import logging
from typing import List, Optional

import requests

from app.config import PIXABAY_API_KEY
from app.services import emoji_service

PIXABAY_URL = "https://pixabay.com/api/"

logger = logging.getLogger(__name__)


def _request(query: str, language: str, per_page: int) -> List[dict]:
    if not PIXABAY_API_KEY:
        logger.info("PIXABAY_API_KEY not set; skipping image lookup")
        return []
    if not query.strip():
        return []
    try:
        resp = requests.get(
            PIXABAY_URL,
            params={
                "key": PIXABAY_API_KEY,
                "q": query.strip(),
                "image_type": "illustration",
                "safesearch": "true",
                "per_page": max(3, min(per_page, 50)),
                "lang": language if language in {"en", "he"} else "en",
            },
            timeout=8,
        )
        resp.raise_for_status()
        return resp.json().get("hits", [])
    except requests.RequestException as e:
        logger.warning("pixabay request failed: %s", e)
        return []


def _to_english_query(query: str, language: str) -> str:
    """Convert a query to its best English form for Pixabay search."""
    if language != "he":
        return query.strip()
    translated = emoji_service.translate_phrase_to_english(query, "he")
    return translated.strip() or query.strip()


def fetch_pixabay_image_url(query: str, language: str = "en") -> Optional[str]:
    english_query = _to_english_query(query, language)
    hits = _request(english_query, "en", per_page=3)
    if not hits:
        return None
    return hits[0].get("webformatURL")


def search_pixabay(query: str, language: str = "en", per_page: int = 12) -> List[dict]:
    english_query = _to_english_query(query, language)
    return _request(english_query, "en", per_page)
