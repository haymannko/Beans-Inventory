from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import TokenData


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> TokenData | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")  # type: ignore
        username: str = payload.get("username")  # type: ignore
        role: str = payload.get("role")  # type: ignore
        if user_id is None or username is None or role is None:
            return None
        return TokenData(user_id=user_id, username=username, role=role)
    except JWTError:
        return None


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    result = await db.execute(
        select(User).where((User.username == username) | (User.email == username))
    )
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not user.password_hash:
        return None  # Google-only user, no password set
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def verify_google_token(credential: str) -> dict:
    """Verify a Google ID token and return the decoded payload."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
    except ImportError as e:
        logger.error(f"google-auth library not installed: {e}")
        raise ValueError("Google authentication is not configured on the server")

    from app.config import settings

    try:
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            raise ValueError("Google Client ID not configured")

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )

        # Verify the token was issued by Google
        valid_issuers = {"accounts.google.com", "https://accounts.google.com"}
        if idinfo.get("iss") not in valid_issuers:
            raise ValueError(f"Invalid issuer: {idinfo.get('iss')}")

        return idinfo
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise ValueError(f"Failed to verify Google token: {e}")


async def authenticate_google_user(db: AsyncSession, google_payload: dict) -> "User":
    """Find or create a user from Google token payload."""
    from app.models.user import User, UserRole
    from sqlalchemy import select, func

    google_id = google_payload.get("sub")
    email = google_payload.get("email")
    name = google_payload.get("name") or email
    avatar_url = google_payload.get("picture")

    # 1. Check if user exists by google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        user.last_login = func.now()
        if avatar_url:
            user.avatar_url = avatar_url
        return user

    # 2. Check if user exists by email (link accounts)
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_id = google_id
            user.auth_provider = "google"
            user.avatar_url = avatar_url
            user.last_login = func.now()
            return user

    # 3. Create new user
    base_username = name.split("@")[0] if "@" in (name or "") else (name or "user")
    base_username = base_username.replace(" ", "_").lower()[:30]
    username = base_username

    # Ensure uniqueness
    counter = 1
    while True:
        result = await db.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none() is None:
            break
        username = f"{base_username}_{counter}"
        counter += 1
        if counter > 100:
            raise ValueError("Could not generate unique username")

    user = User(
        username=username,
        password_hash=None,
        role=UserRole.STAFF.value,
        email=email,
        google_id=google_id,
        avatar_url=avatar_url,
        auth_provider="google",
        last_login=func.now(),
    )
    db.add(user)
    await db.flush()
    return user
