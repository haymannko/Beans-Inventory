"""Auto-seed database if empty (runs on startup)."""

import logging

from sqlalchemy import select

from app.db.engine import async_session_factory
from app.models.bean_type import BeanType
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)

BEAN_TYPES = [
    {"name": "ပဲတီစိမ်း", "description": "Green gram / Mung bean"},
    {"name": "ရှမ်းပဲပုတ်", "description": "Shan peas"},
    {"name": "ပဲကြီး", "description": "Black gram"},
    {"name": "မြေထောက်ပဲ", "description": "Groundnut / Peanut"},
    {"name": "ပဲလွန်းဖြူ", "description": "White beans"},
    {"name": "ပဲနီလေး", "description": "Red lentil"},
    {"name": "ကုလားပဲ", "description": "Chickpea"},
    {"name": "ပဲစင်းငုံ", "description": "Soybean"},
]

USERS = [
    {"username": "admin", "password": "admin123", "role": UserRole.ADMIN},
    {"username": "staff", "password": "staff123", "role": UserRole.STAFF},
]


async def seed_if_empty():
    """Seed default users and bean types if the database is empty."""
    async with async_session_factory() as session:
        # Check if users already exist
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none() is not None:
            logger.info("Database already seeded, skipping")
            return

        # Seed users
        for user_data in USERS:
            user = User(
                username=user_data["username"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
            )
            session.add(user)

        # Seed bean types
        for bt_data in BEAN_TYPES:
            bean_type = BeanType(
                name=bt_data["name"],
                description=bt_data["description"],
            )
            session.add(bean_type)

        await session.commit()
        logger.info(f"Seeded {len(USERS)} users and {len(BEAN_TYPES)} bean types")
