import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import CORS_ORIGINS
from app.database import Base, SessionLocal, engine
from app.routers.audio import router as audio_router
from app.routers.auth import router as auth_router
from app.routers.words import router as words_router
from app.services import audio_service
from app.services.seed import backfill_counterparts, repair_missing_visuals, seed_words

UPLOADS_PATH = "/app/uploads"
os.makedirs(UPLOADS_PATH, exist_ok=True)


def _ensure_word_columns() -> None:
    """Poor-man's migration for additive columns until we adopt Alembic."""
    inspector = inspect(engine)
    if "words" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("words")}
    alters: list[str] = []
    if "is_selected" not in existing:
        alters.append(
            "ALTER TABLE words ADD COLUMN is_selected BOOLEAN NOT NULL DEFAULT FALSE"
        )
    if not alters:
        return
    with engine.begin() as conn:
        for stmt in alters:
            conn.execute(text(stmt))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_word_columns()
    with SessionLocal() as db:
        seed_words(db)
        repair_missing_visuals(db)
        backfill_counterparts(db)
    audio_service.init_model()
    yield


app = FastAPI(title="Daniel Words API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(audio_router)
app.include_router(words_router)
app.mount("/uploads", StaticFiles(directory=UPLOADS_PATH), name="uploads")
