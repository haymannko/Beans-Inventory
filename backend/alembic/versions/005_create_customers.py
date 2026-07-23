"""Create customers table and add customer_id FK to sales

Revision ID: 005
Revises: 004_create_suppliers
Create Date: 2026-07-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: str | None = "004_create_suppliers"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, index=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1"), index=True),
        sa.Column("outstanding_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
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

    op.add_column(
        "sales",
        sa.Column(
            "customer_id",
            sa.String(36),
            sa.ForeignKey("customers.id"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("sales", "customer_id")
    op.drop_table("customers")
