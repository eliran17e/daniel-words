"""Shared FastAPI dependencies — most importantly, current_user.

How it works:
1. Client sends `Authorization: Bearer <jwt>` on each request.
2. `OAuth2PasswordBearer` extracts the token string (or None if absent).
3. `get_current_user` decodes it, looks up the user in the DB, returns it.
4. Any route that wants protection just adds `user = Depends(get_current_user)`.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services import auth_service

# auto_error=False lets us also build "optional user" deps without 401s
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login", auto_error=False
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = auth_service.decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user no longer exists",
        )
    return user


def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    user_id = auth_service.decode_access_token(token)
    if user_id is None:
        return None
    return db.get(User, user_id)
