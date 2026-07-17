import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_admin_user
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.audit_service import create_audit_log
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    """List all users (admin only)."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            role=u.role,
            email=getattr(u, "email", None),
            auth_provider=getattr(u, "auth_provider", "local"),
            has_password=bool(u.password_hash),
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Create a new user (admin only)."""
    # Check if username exists
    existing = await db.execute(select(User).where(User.username == request.username))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    user = User(
        username=request.username,
        password_hash=hash_password(request.password),
        role=UserRole(request.role),
    )
    db.add(user)
    await db.flush()

    await create_audit_log(
        db, admin.id, "CREATE", "users", user.id,
        {"username": user.username, "role": user.role}
    )

    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    request: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Update a user (admin only)."""
    user_id_str = str(user_id)
    result = await db.execute(select(User).where(User.id == user_id_str))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if request.username is not None:
        # Check if new username is taken
        existing = await db.execute(
            select(User).where(User.username == request.username, User.id != user_id_str)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = request.username

    if request.role is not None:
        user.role = request.role

    db.add(user)
    await db.flush()

    await create_audit_log(
        db, admin.id, "UPDATE", "users", user.id,
        {"username": user.username, "role": user.role}
    )

    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Delete a user (admin only)."""
    user_id_str = str(user_id)
    result = await db.execute(select(User).where(User.id == user_id_str))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    await db.delete(user)
    await create_audit_log(
        db, admin.id, "DELETE", "users", user_id_str,
        {"username": user.username}
    )

    return {"message": "User deleted successfully"}
