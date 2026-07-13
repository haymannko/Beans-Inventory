"""Add Google OAuth columns to users table.

Revision ID: 002_google_oauth
Revises: 001_weight_master
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "002_google_oauth"
down_revision = "001_weight_master"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(255), nullable=True, unique=True))
    op.add_column("users", sa.Column("google_id", sa.String(50), nullable=True, unique=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("auth_provider", sa.String(20), nullable=False, server_default="local"))
    op.add_column("users", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_google_id", "users", ["google_id"])
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "last_login")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "google_id")
    op.drop_column("users", "email")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
