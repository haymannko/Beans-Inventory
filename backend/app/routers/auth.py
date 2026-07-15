from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, GoogleLoginRequest, LoginRequest, SetPasswordRequest, Token
from app.services.auth_service import (
    authenticate_google_user,
    authenticate_user,
    create_access_token,
    hash_password,
    verify_google_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = await authenticate_user(db, request.username, request.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role}
    )
    return JSONResponse(
        content={"access_token": access_token, "token_type": "bearer"},
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.post("/google", response_model=Token)
async def login_with_google(
    request: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate via Google ID token. Creates new user if needed."""
    try:
        google_payload = await verify_google_token(request.credential)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    try:
        user = await authenticate_google_user(db, google_payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role}
    )
    return JSONResponse(
        content={
            "access_token": access_token,
            "token_type": "bearer",
        },
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google login. Password change is not available.",
        )
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    db.add(current_user)
    await db.flush()

    return {"message": "Password changed successfully"}


@router.post("/set-password")
async def set_password(
    request: SetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Set a password for a Google-only user so they can also login with email/password."""
    from sqlalchemy import select as sa_select
    from app.models.user import User as UserModel

    result = await db.execute(
        sa_select(UserModel).where(UserModel.email == request.email)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email",
        )

    if user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account already has a password. Use change-password instead.",
        )

    user.password_hash = hash_password(request.password)
    db.add(user)
    await db.flush()

    return {"message": "Password set successfully. You can now login with email and password."}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "role": current_user.role,
        "email": getattr(current_user, "email", None),
        "avatar_url": getattr(current_user, "avatar_url", None),
        "auth_provider": getattr(current_user, "auth_provider", "local"),
    }
