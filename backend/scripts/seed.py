"""Seed script for initial data."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.engine import engine, async_session_factory
from app.models import Base
from app.models.bean_type import BeanType
from app.models.user import User, UserRole
from app.services.auth_service import hash_password


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


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
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
        print(f"Seeded {len(USERS)} users and {len(BEAN_TYPES)} bean types")


if __name__ == "__main__":
    asyncio.run(seed())
