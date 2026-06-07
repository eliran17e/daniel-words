from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str = Field(..., examples=["ok"])
    model_loaded: bool


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_word: str
    transcript: str
    is_correct: bool
    message: str
    bytes_received: int
    evaluated_at: datetime
