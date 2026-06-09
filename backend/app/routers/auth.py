from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    user = User(
        email=payload.email.lower(),
        hashed_password=auth_service.hash_password(payload.password),
        display_name=(payload.display_name or "").strip() or None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email already registered",
        )
    db.refresh(user)
    return Token(
        access_token=auth_service.create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .one_or_none()
    )
    if (
        user is None
        or not user.hashed_password
        or not auth_service.verify_password(payload.password, user.hashed_password)
    ):
        # Same generic message on either "no such email" or "wrong password" so
        # an attacker can't enumerate which emails exist.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid email or password",
        )
    return Token(
        access_token=auth_service.create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> User:
    return current
