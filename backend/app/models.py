from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String(128), unique=True, nullable=False, index=True)
    category = Column(String(64), nullable=False, default="general")
    image_url = Column(String(512), nullable=True)

    attempts = relationship(
        "AttemptLog",
        back_populates="word",
        cascade="all, delete-orphan",
    )


class AttemptLog(Base):
    __tablename__ = "attempt_logs"

    id = Column(Integer, primary_key=True, index=True)
    word_id = Column(
        Integer,
        ForeignKey("words.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    word = relationship("Word", back_populates="attempts")
