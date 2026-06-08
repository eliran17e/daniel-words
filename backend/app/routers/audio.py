from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import ENABLE_UPLOADS
from app.database import get_db
from app.models import AttemptLog, Word
from app.schemas import EvaluationResponse, HealthResponse, ServerCapabilities
from app.services import audio_service, emoji_service

router = APIRouter(prefix="/api", tags=["Audio Evaluation"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=audio_service.model_ready(),
    )


@router.get("/capabilities", response_model=ServerCapabilities)
def capabilities() -> ServerCapabilities:
    return ServerCapabilities(uploads_enabled=ENABLE_UPLOADS)


@router.post("/evaluate-audio", response_model=EvaluationResponse)
async def evaluate_audio(
    audio: UploadFile = File(...),
    target_word: str = Form(...),
    target_language: str = Form("en"),
    db: Session = Depends(get_db),
) -> EvaluationResponse:
    if not target_word.strip():
        raise HTTPException(status_code=400, detail="target_word is required")
    if audio.content_type and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="audio/* content type expected")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio payload")

    suffix = ".webm" if (audio.filename or "").lower().endswith(".webm") else ".audio"
    transcript = audio_service.transcribe(
        audio_bytes, suffix, language=target_language
    )

    other_lang = "he" if target_language == "en" else "en"
    counterpart = emoji_service.translate(target_word, target_language, other_lang)
    alt_targets = [counterpart] if counterpart else []
    is_correct = audio_service.matches(target_word, transcript, alt_targets=alt_targets)

    word = (
        db.query(Word)
        .filter(Word.word == target_word, Word.language == target_language)
        .one_or_none()
    )
    if word is None:
        word = Word(word=target_word, language=target_language, category="general")
        db.add(word)
        db.commit()
        db.refresh(word)

    db.add(AttemptLog(word_id=word.id, is_correct=is_correct))
    db.commit()

    if not transcript:
        message = "I didn't hear anything — try again!"
    elif is_correct:
        message = "Great job!"
    else:
        message = f"I heard '{transcript.strip()}' — try again!"

    return EvaluationResponse(
        target_word=target_word,
        transcript=transcript,
        is_correct=is_correct,
        message=message,
        bytes_received=len(audio_bytes),
        evaluated_at=datetime.utcnow(),
    )
