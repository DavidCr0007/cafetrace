"""payments and logistics foundations

Revision ID: 9c2e3f4a5b66
Revises: 8b1d2e3f4a55
"""
from alembic import op
import sqlalchemy as sa

revision = "9c2e3f4a5b66"
down_revision = "8b1d2e3f4a55"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("payments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False, unique=True), sa.Column("provider", sa.String(), nullable=False), sa.Column("amount", sa.Numeric(12, 2), nullable=False), sa.Column("status", sa.String(), nullable=False), sa.Column("provider_reference", sa.String()), sa.Column("metadata_json", sa.JSON()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True)))
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_table("shipments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False, unique=True), sa.Column("carrier", sa.String()), sa.Column("tracking_number", sa.String()), sa.Column("status", sa.String(), nullable=False), sa.Column("cold_chain_required", sa.String(), nullable=False), sa.Column("last_temperature_c", sa.Numeric(5, 2)), sa.Column("metadata_json", sa.JSON()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True)))
    op.create_index("ix_shipments_id", "shipments", ["id"])


def downgrade() -> None:
    op.drop_table("shipments")
    op.drop_table("payments")
