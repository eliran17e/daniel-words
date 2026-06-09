from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import ENABLE_UPLOADS, SUPPORTED_LANGUAGES
from app.database import get_db
from app.deps import get_current_user
from app.models import User, Word
from app.schemas import (
    BulkSelect,
    CreateWordResponse,
    PixabayHit,
    WordCreate,
    WordOut,
    WordUpdate,
)
from app.services import emoji_service, image_service, upload_service

router = APIRouter(prefix="/api", tags=["Words"])


def _resolve_visuals(word_text: str, language: str, explicit_emoji: Optional[str]):
    """Return (emoji, image_url) for a new word using emoji dict → Pixabay → ❓ fallback."""
    emoji = explicit_emoji or emoji_service.lookup_emoji(word_text, language)
    image_url: Optional[str] = None
    if not emoji:
        query = emoji_service.translate_to_english(word_text, language) or word_text
        image_url = image_service.fetch_pixabay_image_url(query, language)
    if not emoji and not image_url:
        emoji = "❓"
    return emoji, image_url


def _create_word(
    db: Session,
    user_id: int,
    word_text: str,
    language: str,
    explicit_emoji: Optional[str] = None,
    category: str = "general",
) -> Word:
    emoji, image_url = _resolve_visuals(word_text, language, explicit_emoji)
    word = Word(
        word=word_text,
        language=language,
        emoji=emoji,
        image_url=image_url,
        category=category or "general",
        user_id=user_id,
    )
    db.add(word)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(word)
    return word


def _user_word_or_404(db: Session, word_id: int, user: User) -> Word:
    word = db.get(Word, word_id)
    if word is None or word.user_id != user.id:
        raise HTTPException(status_code=404, detail="word not found")
    return word


@router.get("/words", response_model=List[WordOut])
def list_words(
    language: Optional[str] = Query(
        default=None,
        description="Filter by language code (e.g. 'en' or 'he'). Omit for all.",
    ),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> List[Word]:
    if language is not None and language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported language: {language}",
        )
    query = (
        db.query(Word)
        .filter(Word.user_id == current.id)
        .order_by(Word.language, Word.id)
    )
    if language:
        query = query.filter(Word.language == language)
    if category:
        query = query.filter(Word.category == category)
    return query.all()


@router.post(
    "/words",
    response_model=CreateWordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_word(
    payload: WordCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CreateWordResponse:
    word_text = payload.word.strip()
    category = (payload.category or "general").strip() or "general"

    try:
        primary = _create_word(
            db,
            current.id,
            word_text,
            payload.language,
            explicit_emoji=payload.emoji,
            category=category,
        )
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail=f"'{word_text}' already exists for language '{payload.language}'",
        )

    counterpart_lang = "he" if payload.language == "en" else "en"
    counterpart_text = emoji_service.translate(
        word_text, payload.language, counterpart_lang
    )

    counterpart_model: Optional[Word] = None
    if counterpart_text:
        counterpart_model = (
            db.query(Word)
            .filter(
                Word.word == counterpart_text,
                Word.language == counterpart_lang,
                Word.user_id == current.id,
            )
            .one_or_none()
        )
        if counterpart_model is None:
            try:
                counterpart_model = _create_word(
                    db,
                    current.id,
                    counterpart_text,
                    counterpart_lang,
                    explicit_emoji=primary.emoji if primary.emoji != "❓" else None,
                    category=category,
                )
            except IntegrityError:
                counterpart_model = None

    return CreateWordResponse(
        word=WordOut.model_validate(primary),
        counterpart=(
            WordOut.model_validate(counterpart_model) if counterpart_model else None
        ),
    )


@router.delete("/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Response:
    word = _user_word_or_404(db, word_id, current)
    db.delete(word)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/words/{word_id}", response_model=WordOut)
def update_word(
    word_id: int,
    payload: WordUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Word:
    word = _user_word_or_404(db, word_id, current)
    updates = payload.model_dump(exclude_unset=True)

    if "emoji" in updates:
        new_emoji = (updates["emoji"] or "").strip() or None
        if new_emoji:
            word.emoji = new_emoji
            word.image_url = None
        else:
            word.emoji = None

    if "image_url" in updates:
        new_image = (updates["image_url"] or "").strip() or None
        if new_image:
            word.image_url = new_image
            word.emoji = None
        else:
            word.image_url = None

    if "is_selected" in updates and updates["is_selected"] is not None:
        word.is_selected = bool(updates["is_selected"])

    db.commit()
    db.refresh(word)
    return word


@router.post("/words/bulk-select", response_model=List[WordOut])
def bulk_select(
    payload: BulkSelect,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> List[Word]:
    if not payload.ids:
        return []
    updated = (
        db.query(Word)
        .filter(Word.id.in_(payload.ids), Word.user_id == current.id)
        .all()
    )
    for w in updated:
        w.is_selected = payload.is_selected
    db.commit()
    return updated


@router.post("/words/{word_id}/upload-image", response_model=WordOut)
async def upload_word_image(
    word_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Word:
    if not ENABLE_UPLOADS:
        raise HTTPException(status_code=403, detail="uploads are disabled")
    word = _user_word_or_404(db, word_id, current)
    try:
        url_path = await upload_service.save_image(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    word.image_url = url_path
    word.emoji = None
    db.commit()
    db.refresh(word)
    return word


@router.get("/pixabay/search", response_model=List[PixabayHit])
def pixabay_search(
    q: str = Query(..., min_length=1, max_length=128),
    language: str = Query("en"),
    _current: User = Depends(get_current_user),  # require auth to avoid abuse
) -> List[PixabayHit]:
    hits = image_service.search_pixabay(q, language)
    return [
        PixabayHit(
            id=hit["id"],
            preview_url=hit.get("previewURL", ""),
            web_url=hit.get("webformatURL", ""),
            tags=hit.get("tags", ""),
        )
        for hit in hits
    ]
