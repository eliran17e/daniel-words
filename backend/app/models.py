from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    # nullable so OAuth-only users (Google) can exist without a password
    hashed_password = Column(String(255), nullable=True)
    # Google's "sub" claim — stable user ID. Unique, nullable.
    google_id = Column(String(64), nullable=True, unique=True, index=True)
    display_name = Column(String(128), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (
        UniqueConstraint("word", "language", name="uq_word_language"),
    )

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String(128), nullable=False, index=True)
    language = Column(String(8), nullable=False, default="en", index=True)
    emoji = Column(String(16), nullable=True)
    category = Column(String(64), nullable=False, default="general")
    image_url = Column(String(512), nullable=True)
    is_selected = Column(Boolean, nullable=False, default=False, index=True)

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
