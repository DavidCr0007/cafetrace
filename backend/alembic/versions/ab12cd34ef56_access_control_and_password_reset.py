"""expanded RBAC and admin-approved password reset workflow

Revision ID: ab12cd34ef56
Revises: 9c2e3f4a5b66
"""
from alembic import op
import sqlalchemy as sa

revision = "ab12cd34ef56"
down_revision = "9c2e3f4a5b66"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("access_code_hash", sa.String(), nullable=True))
    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("requested_email", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_password_reset_requests_id", "password_reset_requests", ["id"])
    if op.get_bind().dialect.name == "postgresql":
        for value in ("ACCOUNTANT", "SELLER", "MARKETING", "BUYER", "AUDITOR"):
            op.execute(sa.text(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{value}'"))


def downgrade() -> None:
    op.drop_table("password_reset_requests")
    op.drop_column("users", "access_code_hash")
