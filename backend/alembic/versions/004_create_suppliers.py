"""Create suppliers table and add supplier_id FK to purchase_orders

Revision ID: 004
Revises: 003_create_purchase_orders
Create Date: 2026-07-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: str | None = "003_create_purchase_orders"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ### Create suppliers table ###
    op.create_table(
        "suppliers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_name", sa.String(200), unique=True, nullable=False, index=True),
        sa.Column("contact_person", sa.String(200), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
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

    # ### Add supplier_id FK to purchase_orders ###
    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_id",
            sa.String(36),
            sa.ForeignKey("suppliers.id"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("purchase_orders", "supplier_id")
    op.drop_table("suppliers")
