"""Password hashing and JWT issuing/verification.

This is where every "how does auth actually work" question gets answered:
- Passwords go through bcrypt (a slow hash that resists brute force) plus
  a per-password salt so two identical passwords have different hashes.
- JWTs are signed with HMAC-SHA256 over (header + payload). The signature
  proves the token was minted by us. We never store the token server-side —
  the user holds it and presents it on every request.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd.verify(plain, hashed)
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    """Issue a signed JWT carrying the user's ID and an expiration timestamp."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),  # JWT convention: subject = the user being identified
        "exp": expire,
        "iat": datetime.now(timezone.utc),  # issued-at, debugging convenience
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    """Verify a JWT signature + expiration, return the user_id or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None
