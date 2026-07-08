"""
Seed weight_master table with Myanmar bean weight data.
Uses UPSERT logic: inserts only if bean_name does not already exist.

Usage:
    cd backend
    python scripts/seed_weight_master.py
"""

import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.engine import async_session_factory
from app.models.weight_master import WeightMaster

# Weight master seed data: bean_name -> weight (Numeric(10,2))
WEIGHT_MASTER_DATA = [
    ("ဂျုံ", 60),
    ("ကုလားပဲအဝါ", 56.25),
    ("နှမ်း", 45),
    ("ပြောင်းဖူးစေ့", 54),
    ("ခွန်ပြောင်းအနက်", 53),
    ("အထွက်တိုးပြောင်း", 53),
    ("သိပ္ပံပြောင်း", 53),
    ("ဆန်ပြောင်း", 59.25),
    ("ကုလားပဲဖြူ ကြီး", 57.25),
    ("ကုလားပဲဖြူ သေး", 57.25),
    ("ပဲဒီစိမ်း", 56.25),
    ("စွန်တာပြာ", 58.25),
    ("မတ်ပဲ", 60),
    ("ပဲစင်းငုံ", 60),
    ("နံနံ", 24),
    ("ပဲလိပ်ပြာ / ပဲကြား", 56.25),
    ("ပဲနီပြား", 55.25),
    ("မြေထောက်ပဲ", 54),
    ("တရုတ်ပဲကြီး", 50),
    ("နိုင်လွန်ပဲ", 59.25),
    ("စားတော်ပဲ", 59.25),
    ("ပဲလွန်းဖြူ", 60),
    ("ပဲလွန်းပြာ", 54.25),
    ("ပဲလွန်းဝါ", 54.25),
    ("ထောပတ်ဖြူ ကြီး/သေး", 56.25),
    ("ပဲကြီးမျိုးစုံ / ရွှေယင်းမာ", 55.25),
    ("ပဲပုတ်စေ့", 53.25),
    ("ပဲရာဇာ", 61.25),
    ("ပဲယဉ်း", 60),
    ("ခေတ်သစ် (ခ) ပဲဖြူလေး", 57.25),
    ("ဆီနေကြာ", 27),
    ("ပန်းနှမ်း", 45),
    ("မိုးလေးနှမ်း", 49.25),
    ("ကြက်ဆူအကြား (နီကြား/ဖြူကြား)", 36),
    ("ကြက်ဆူအနက်", 30),
    ("ကဇင်းသီး", 37.25),
    ("ကြို့စေ့", 38.25),
]


async def seed():
    """UPSERT: insert only if bean_name does not exist."""
    inserted = 0
    skipped = 0
    updated = 0

    async with async_session_factory() as session:
        for bean_name, weight in WEIGHT_MASTER_DATA:
            result = await session.execute(
                select(WeightMaster).where(WeightMaster.bean_name == bean_name)
            )
            existing = result.scalar_one_or_none()

            if existing is None:
                # INSERT new record
                wm = WeightMaster(bean_name=bean_name, weight=weight)
                session.add(wm)
                inserted += 1
            else:
                # UPDATE if weight changed
                if float(existing.weight) != weight:
                    existing.weight = weight
                    session.add(existing)
                    updated += 1
                else:
                    skipped += 1

        await session.commit()

    print(f"Seed complete:")
    print(f"  Inserted: {inserted}")
    print(f"  Updated:  {updated}")
    print(f"  Skipped:  {skipped} (already exist, same weight)")
    print(f"  Total:    {len(WEIGHT_MASTER_DATA)}")

    # Verify
    async with async_session_factory() as session:
        result = await session.execute(select(WeightMaster).order_by(WeightMaster.bean_name))
        records = result.scalars().all()
        print(f"\nVerification: {len(records)} records in weight_master table")
        for wm in records[:5]:
            print(f"  {wm.bean_name}: {wm.weight}")
        if len(records) > 5:
            print(f"  ... and {len(records) - 5} more")


if __name__ == "__main__":
    asyncio.run(seed())
