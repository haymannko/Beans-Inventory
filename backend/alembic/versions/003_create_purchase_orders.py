"""Create purchase_orders and purchase_order_items tables

Revision ID: 003
Revises: 002_add_google_oauth
Create Date: 2026-07-22

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: str | None = "002_add_google_oauth"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ### Purchase Orders ###
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("po_number", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("supplier_name", sa.String(200), nullable=False),
        sa.Column(
            "status",
            sa.String(10),
            nullable=False,
            server_default="draft",
            index=True,
        ),
        sa.Column("order_date", sa.Date(), nullable=False, index=True),
        sa.Column("expected_delivery_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
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
        sa.CheckConstraint(
            "status IN ('draft', 'approved', 'ordered', 'received', 'cancelled')",
            name="ck_purchase_orders_status",
        ),
    )

    # ### Purchase Order Items ###
    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "purchase_order_id",
            sa.String(36),
            sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "bean_type_id",
            sa.String(36),
            sa.ForeignKey("bean_types.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("quantity_bags", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("received_quantity_bags", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "quantity_bags > 0",
            name="ck_po_items_quantity_bags_positive",
        ),
        sa.CheckConstraint(
            "unit_price >= 0",
            name="ck_po_items_unit_price_non_negative",
        ),
        sa.CheckConstraint(
            "total_price >= 0",
            name="ck_po_items_total_price_non_negative",
        ),
        sa.CheckConstraint(
            "received_quantity_bags >= 0",
            name="ck_po_items_received_quantity_bags_non_negative",
        ),
        sa.CheckConstraint(
            "received_quantity_bags <= quantity_bags",
            name="ck_po_items_received_quantity_bags_not_exceed",
        ),
    )


def downgrade() -> None:
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
