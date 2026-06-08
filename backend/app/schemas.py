from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str = Field(..., examples=["ok"])
    model_loaded: bool


class ServerCapabilities(BaseModel):
    uploads_enabled: bool


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_word: str
    transcript: str
    is_correct: bool
    message: str
    bytes_received: int
    evaluated_at: datetime


class WordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    word: str
    language: str
    emoji: Optional[str] = None
    image_url: Optional[str] = None
    category: str
    is_selected: bool = False


class WordCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=128)
    language: str = Field(..., pattern="^(en|he)$")
    emoji: Optional[str] = Field(default=None, max_length=16)
    category: Optional[str] = Field(default="general", max_length=64)


class CreateWordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    word: WordOut
    counterpart: Optional[WordOut] = None


class WordUpdate(BaseModel):
    emoji: Optional[str] = Field(default=None, max_length=16)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    is_selected: Optional[bool] = None


class BulkSelect(BaseModel):
    ids: List[int] = Field(default_factory=list)
    is_selected: bool


class PixabayHit(BaseModel):
    id: int
    preview_url: str
    web_url: str
    tags: str = ""
