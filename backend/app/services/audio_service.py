import os
import subprocess
import tempfile
from typing import Optional

from faster_whisper import WhisperModel

from app.config import (
    SUPPORTED_LANGUAGES,
    WHISPER_COMPUTE_TYPE,
    WHISPER_DEVICE,
    WHISPER_MODEL,
)

_whisper_model: Optional[WhisperModel] = None


def init_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _whisper_model


def get_model() -> Optional[WhisperModel]:
    return _whisper_model


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


def matches(target: str, transcript: str, max_edits: int = 2) -> bool:
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


def transcribe(audio_bytes: bytes, suffix: str, language: str = "en") -> str:
    model = get_model()
    if model is None:
        raise RuntimeError("Whisper model not initialized")
    if language not in SUPPORTED_LANGUAGES:
        language = "en"
    wav_path = _to_wav(audio_bytes, suffix)
    try:
        segments, _info = model.transcribe(
            wav_path,
            language=language,
            vad_filter=True,
            beam_size=1,
        )
        return " ".join(seg.text for seg in segments).strip()
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
