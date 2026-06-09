import os
from typing import Set, List


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


DATABASE_URL: str = _env(
    "DATABASE_URL",
    "postgresql+psycopg2://daniel:daniel@db:5432/daniel_words",
)

WHISPER_MODEL: str = _env("WHISPER_MODEL", "small")
WHISPER_DEVICE: str = _env("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE: str = _env("WHISPER_COMPUTE_TYPE", "int8")

GROQ_API_KEY: str = _env("GROQ_API_KEY", "")
GROQ_WHISPER_MODEL: str = _env("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")

PIXABAY_API_KEY: str = _env("PIXABAY_API_KEY", "")

ENABLE_UPLOADS: bool = _bool("ENABLE_UPLOADS", True)

JWT_SECRET: str = _env(
    "JWT_SECRET",
    "dev-only-change-in-production-please-and-make-it-long-and-random",
)
JWT_ALGORITHM: str = _env("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(_env("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

GOOGLE_CLIENT_ID: str = _env("GOOGLE_CLIENT_ID", "")

SUPPORTED_LANGUAGES: Set[str] = {"en", "he"}


def _parse_origins(raw: str) -> List[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


_DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
CORS_ORIGINS: List[str] = _parse_origins(_env("CORS_ORIGINS", _DEFAULT_ORIGINS))
