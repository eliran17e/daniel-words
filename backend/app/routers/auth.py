from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import GoogleLogin, Token, UserCreate, UserLogin, UserOut
from app.services import auth_service
from app.services.seed import clone_seed_for_user

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
    # Give the new user their own copy of the curated seed deck
    clone_seed_for_user(db, user.id)
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


@router.post("/google", response_model=Token)
def google_login(payload: GoogleLogin, db: Session = Depends(get_db)) -> Token:
    info = auth_service.verify_google_id_token(payload.id_token)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid Google token",
        )
    google_sub = info.get("sub")
    email = (info.get("email") or "").lower()
    name = info.get("name") or info.get("given_name")
    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account missing required fields",
        )

    # 1) Try matching by Google ID (returning user who's used Google before)
    user = db.query(User).filter(User.google_id == google_sub).one_or_none()
    is_new_user = False

    # 2) Else try matching by email — link Google to an existing email account
    if user is None:
        user = db.query(User).filter(User.email == email).one_or_none()
        if user is not None:
            user.google_id = google_sub
            if not user.display_name and name:
                user.display_name = name
            db.commit()

    # 3) Else create a brand new account (no password, Google-only)
    if user is None:
        user = User(
            email=email,
            google_id=google_sub,
            display_name=name,
            hashed_password=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True

    if is_new_user:
        clone_seed_for_user(db, user.id)

    return Token(
        access_token=auth_service.create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> User:
    return current
