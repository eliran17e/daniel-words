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
