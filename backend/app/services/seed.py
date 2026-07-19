"""Auto-seed database if empty (runs on startup)."""

import logging

from sqlalchemy import select

from app.db.engine import async_session_factory
from app.models.bean_type import BeanType
from app.models.user import User, UserRole
from app.models.weight_master import WeightMaster
from app.services.auth_service import hash_password, verify_password

logger = logging.getLogger(__name__)

BEAN_TYPES = [
    {"name": "ဂျုံ", "description": "Wheat"},
    {"name": "ကုလားပဲအဝါ", "description": "Yellow chickpea"},
    {"name": "နှမ်း", "description": "Sesame"},
    {"name": "ပြောင်းဖူးစေ့", "description": "Corn kernel"},
    {"name": "ခွန်ပြောင်းအနက်", "description": "Black corn"},
    {"name": "အထွက်တိုးပြောင်း", "description": "Improved corn"},
    {"name": "သိပ္ပံပြောင်း", "description": "Scientific corn"},
    {"name": "ဆန်ပြောင်း", "description": "Rice corn"},
    {"name": "ကုလားပဲဖြူ ကြီး", "description": "White chickpea large"},
    {"name": "ကုလားပဲဖြူ သေး", "description": "White chickpea small"},
    {"name": "ပဲဒီစိမ်း", "description": "Green gram / Mung bean"},
    {"name": "စွန်တာပြာ", "description": "Suntar purple"},
    {"name": "မတ်ပဲ", "description": "Pigeon pea"},
    {"name": "ပဲစင်းငုံ", "description": "Soybean"},
    {"name": "နံနံ", "description": "Cumin"},
    {"name": "ပဲလိပ်ပြာ / ပဲကြား", "description": "Butterfly pea / In-between pea"},
    {"name": "ပဲနီပြား", "description": "Red flat pea"},
    {"name": "မြေထောက်ပဲ", "description": "Groundnut / Peanut"},
    {"name": "တရုတ်ပဲကြီး", "description": "Chinese large bean"},
    {"name": "နိုင်လွန်ပဲ", "description": "Nylon pea"},
    {"name": "စားတော်ပဲ", "description": "Premium pea"},
    {"name": "ပဲလွန်းဖြူ", "description": "White bean"},
    {"name": "ပဲလွန်းပြာ", "description": "Purple bean"},
    {"name": "ပဲလွန်းဝါ", "description": "Yellow bean"},
    {"name": "ထောပတ်ဖြူ ကြီး/သေး", "description": "Butter pea large/small"},
    {"name": "ပဲကြီးမျိုးစုံ / ရွှေယင်းမာ", "description": "Mixed large beans / Shwe Yin Mar"},
    {"name": "ပဲပုတ်စေ့", "description": "Black gram seed"},
    {"name": "ပဲရာဇာ", "description": "Raja pea"},
    {"name": "ပဲယဉ်း", "description": "Smooth pea"},
    {"name": "ခေတ်သစ် (ခ) ပဲဖြူလေး", "description": "Modern white small pea"},
    {"name": "ဆီနေကြာ", "description": "Sunflower"},
    {"name": "ပန်းနှမ်း", "description": "Flower sesame"},
    {"name": "မိုးလေးနှမ်း", "description": "Rain sesame"},
    {"name": "ကြက်ဆူအကြား (နီကြား/ဖြူကြား)", "description": "Castor bean mixed"},
    {"name": "ကြက်ဆူအနက်", "description": "Black castor bean"},
    {"name": "ကဇင်းသီး", "description": "Kazin fruit"},
    {"name": "ကြို့စေ့", "description": "Kyet seed"},
]

# Weight master seed data: bean_name -> weight
WEIGHT_MASTER_DATA = {
    "ဂျုံ": 60,
    "ကုလားပဲအဝါ": 56.25,
    "နှမ်း": 45,
    "ပြောင်းဖူးစေ့": 54,
    "ခွန်ပြောင်းအနက်": 53,
    "အထွက်တိုးပြောင်း": 53,
    "သိပ္ပံပြောင်း": 53,
    "ဆန်ပြောင်း": 59.25,
    "ကုလားပဲဖြူ ကြီး": 57.25,
    "ကုလားပဲဖြူ သေး": 57.25,
    "ပဲဒီစိမ်း": 56.25,
    "စွန်တာပြာ": 58.25,
    "မတ်ပဲ": 60,
    "ပဲစင်းငုံ": 60,
    "နံနံ": 24,
    "ပဲလိပ်ပြာ / ပဲကြား": 56.25,
    "ပဲနီပြား": 55.25,
    "မြေထောက်ပဲ": 54,
    "တရုတ်ပဲကြီး": 50,
    "နိုင်လွန်ပဲ": 59.25,
    "စားတော်ပဲ": 59.25,
    "ပဲလွန်းဖြူ": 60,
    "ပဲလွန်းပြာ": 54.25,
    "ပဲလွန်းဝါ": 54.25,
    "ထောပတ်ဖြူ ကြီး/သေး": 56.25,
    "ပဲကြီးမျိုးစုံ / ရွှေယင်းမာ": 55.25,
    "ပဲပုတ်စေ့": 53.25,
    "ပဲရာဇာ": 61.25,
    "ပဲယဉ်း": 60,
    "ခေတ်သစ် (ခ) ပဲဖြူလေး": 57.25,
    "ဆီနေကြာ": 27,
    "ပန်းနှမ်း": 45,
    "မိုးလေးနှမ်း": 49.25,
    "ကြက်ဆူအကြား (နီကြား/ဖြူကြား)": 36,
    "ကြက်ဆူအနက်": 30,
    "ကဇင်းသီး": 37.25,
    "ကြို့စေ့": 38.25,
}

USERS = [
    {"username": "admin", "password": "admin123", "role": UserRole.ADMIN},
    {"username": "staff", "password": "staff123", "role": UserRole.STAFF},
]


async def ensure_google_users_have_passwords():
    """Set a default password for Google-only users so they can also login with email/password."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.auth_provider == "google", User.password_hash.is_(None))
        )
        google_users = result.scalars().all()
        for user in google_users:
            user.password_hash = hash_password("admin123")
            session.add(user)
            logger.info(f"Set default password for Google user: {user.email}")
        if google_users:
            await session.commit()


async def seed_if_empty():
    """Seed default users and bean types if the database is empty."""
    async with async_session_factory() as session:
        # Check if admin user exists
        result = await session.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()

        if admin is not None:
            try:
                hash_ok = verify_password("admin123", admin.password_hash)
            except Exception:
                hash_ok = False
            if not hash_ok:
                logger.warning("Resetting default passwords...")
                all_users = await session.execute(select(User))
                for user in all_users.scalars().all():
                    for user_data in USERS:
                        if user.username == user_data["username"]:
                            user.password_hash = hash_password(user_data["password"])
                            session.add(user)
                await session.commit()
                logger.info("Passwords reset.")
            else:
                logger.info("Database already seeded.")

            # Seed missing bean types for existing DBs
            try:
                await _seed_bean_types(session)
            except Exception:
                pass

            # Seed weight master for existing DBs that don't have it yet
            try:
                await _seed_weight_master(session)
            except Exception:
                pass
            return

        logger.info("Seeding database...")

        # Seed users
        for user_data in USERS:
            logger.info(f"Creating user: {user_data['username']}")
            user = User(
                username=user_data["username"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
            )
            session.add(user)

        # Seed bean types
        bean_type_map = {}
        for bt_data in BEAN_TYPES:
            bean_type = BeanType(
                name=bt_data["name"],
                description=bt_data["description"],
            )
            session.add(bean_type)
            bean_type_map[bt_data["name"]] = bean_type

        await session.flush()

        # Seed weight master
        for bean_name, weight in WEIGHT_MASTER_DATA.items():
            wm = WeightMaster(bean_name=bean_name, weight=weight)
            session.add(wm)

        await session.commit()
        logger.info(f"Seeded {len(USERS)} users, {len(BEAN_TYPES)} bean types, and {len(WEIGHT_MASTER_DATA)} weight master records")


async def _seed_bean_types(session):
    """Seed missing bean types for existing databases."""
    result = await session.execute(select(BeanType.name))
    existing_names = {row[0] for row in result.all()}

    missing = [bt for bt in BEAN_TYPES if bt["name"] not in existing_names]
    if not missing:
        return

    for bt_data in missing:
        bean_type = BeanType(name=bt_data["name"], description=bt_data["description"])
        session.add(bean_type)

    await session.commit()
    logger.info(f"Seeded {len(missing)} missing bean types")


async def _seed_weight_master(session):
    """Seed weight master records for existing databases."""
    result = await session.execute(select(WeightMaster).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # Already seeded

    count = 0
    for bean_name, weight in WEIGHT_MASTER_DATA.items():
        wm = WeightMaster(bean_name=bean_name, weight=weight)
        session.add(wm)
        count += 1

    if count > 0:
        await session.commit()
        logger.info(f"Seeded {count} weight master records")
