import os
from typing import Set, List


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


DATABASE_URL: str = _env(
    "DATABASE_URL",
    "postgresql+psycopg2://daniel:daniel@db:5432/daniel_words",
)

WHISPER_MODEL: str = _env("WHISPER_MODEL", "small")
WHISPER_DEVICE: str = _env("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE: str = _env("WHISPER_COMPUTE_TYPE", "int8")

SUPPORTED_LANGUAGES: Set[str] = {"en", "he"}

CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
