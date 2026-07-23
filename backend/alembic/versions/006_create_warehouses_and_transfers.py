"""Create warehouses and warehouse_transfers tables, add warehouse_id to storages

Revision ID: 006
Revises: 005
Create Date: 2026-07-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Create warehouses table
    op.create_table(
        "warehouses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, index=True, unique=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.String(200), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1"), index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Create warehouse_transfers table
    op.create_table(
        "warehouse_transfers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("from_warehouse_id", sa.String(36),
                  sa.ForeignKey("warehouses.id"), nullable=False, index=True),
        sa.Column("to_warehouse_id", sa.String(36),
                  sa.ForeignKey("warehouses.id"), nullable=False, index=True),
        sa.Column("bean_type_id", sa.String(36),
                  sa.ForeignKey("bean_types.id"), nullable=False, index=True),
        sa.Column("quantity_bags", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("transfer_date", sa.Date(), nullable=False, index=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(36),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Add warehouse_id column to storages
    op.add_column(
        "storages",
        sa.Column(
            "warehouse_id",
            sa.String(36),
            sa.ForeignKey("warehouses.id"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("storages", "warehouse_id")
    op.drop_table("warehouse_transfers")
    op.drop_table("warehouses")
