import logging
import os
import subprocess
import tempfile
from typing import Optional

import requests
from faster_whisper import WhisperModel

from app.config import (
    GROQ_API_KEY,
    GROQ_WHISPER_MODEL,
    SUPPORTED_LANGUAGES,
    WHISPER_COMPUTE_TYPE,
    WHISPER_DEVICE,
    WHISPER_MODEL,
)

logger = logging.getLogger(__name__)

_whisper_model: Optional[WhisperModel] = None


def use_groq() -> bool:
    return bool(GROQ_API_KEY)


def init_model() -> Optional[WhisperModel]:
    """Initialize local Whisper model. Skipped when Groq is configured."""
    global _whisper_model
    if use_groq():
        logger.info("GROQ_API_KEY set — using hosted Whisper, skipping local model load")
        return None
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _whisper_model


def get_model() -> Optional[WhisperModel]:
    return _whisper_model


def model_ready() -> bool:
    return use_groq() or _whisper_model is not None


def normalize(text: str) -> str:
    return "".join(ch.lower() for ch in text.strip() if ch.isalnum())


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            insert = curr[j - 1] + 1
            delete = prev[j] + 1
            substitute = prev[j - 1] + (0 if ca == cb else 1)
            curr.append(min(insert, delete, substitute))
        prev = curr
    return prev[-1]


def _try_match(target: str, transcript: str, max_edits: int) -> bool:
    target_norm = normalize(target)
    if not target_norm:
        return False
    transcript_norm = normalize(transcript)
    if not transcript_norm:
        return False

    threshold = min(max_edits, max(1, len(target_norm) // 2))

    if target_norm in transcript_norm:
        return True
    if levenshtein(target_norm, transcript_norm) <= threshold:
        return True
    for word in transcript.split():
        if levenshtein(target_norm, normalize(word)) <= threshold:
            return True
    return False


def matches(
    target: str,
    transcript: str,
    max_edits: int = 2,
    alt_targets: Optional[list] = None,
) -> bool:
    if _try_match(target, transcript, max_edits):
        return True
    if alt_targets:
        for alt in alt_targets:
            if alt and _try_match(alt, transcript, max_edits):
                return True
    return False


def _to_wav(audio_bytes: bytes, suffix: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as src:
        src.write(audio_bytes)
        src_path = src.name
    wav_path = src_path + ".wav"
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", src_path,
            "-ar", "16000", "-ac", "1", "-f", "wav",
            wav_path,
        ],
        capture_output=True,
        timeout=20,
    )
    try:
        os.unlink(src_path)
    except OSError:
        pass
    if result.returncode != 0 or not os.path.exists(wav_path):
        raise RuntimeError(
            f"ffmpeg decode failed: {result.stderr.decode(errors='ignore')[:500]}"
        )
    return wav_path


def _transcribe_local(wav_path: str, language: str) -> str:
    model = get_model()
    if model is None:
        raise RuntimeError("Whisper model not initialized")
    segments, _info = model.transcribe(
        wav_path,
        language=language,
        vad_filter=True,
        beam_size=1,
    )
    return " ".join(seg.text for seg in segments).strip()


def _transcribe_groq(wav_path: str, language: str) -> str:
    with open(wav_path, "rb") as fh:
        resp = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": ("audio.wav", fh, "audio/wav")},
            data={
                "model": GROQ_WHISPER_MODEL,
                "language": language,
                "response_format": "json",
                "temperature": "0",
            },
            timeout=30,
        )
    if resp.status_code >= 400:
        logger.warning("groq transcribe failed: %s %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
    return (resp.json().get("text") or "").strip()


def transcribe(audio_bytes: bytes, suffix: str, language: str = "en") -> str:
    if language not in SUPPORTED_LANGUAGES:
        language = "en"
    wav_path = _to_wav(audio_bytes, suffix)
    try:
        if use_groq():
            return _transcribe_groq(wav_path, language)
        return _transcribe_local(wav_path, language)
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
