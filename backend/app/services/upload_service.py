import secrets
from pathlib import Path

from fastapi import UploadFile

UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


async def save_image(file: UploadFile) -> str:
    """Persist an uploaded image and return its public path (relative to backend host)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise ValueError(
            f"unsupported image type '{ext}' (allowed: {', '.join(sorted(ALLOWED_EXTS))})"
        )

    data = await file.read()
    if not data:
        raise ValueError("empty file")
    if len(data) > MAX_BYTES:
        raise ValueError(f"file too large (max {MAX_BYTES // (1024 * 1024)}MB)")

    name = f"{secrets.token_hex(12)}{ext}"
    dest = UPLOADS_DIR / name
    dest.write_bytes(data)
    return f"/uploads/{name}"
