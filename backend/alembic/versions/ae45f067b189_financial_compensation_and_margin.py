"""financial rules, order margin and payroll foundations

Revision ID: ae45f067b189
Revises: ad34ef56a078
"""
from alembic import op
import sqlalchemy as sa

revision = "ae45f067b189"
down_revision = "ad34ef56a078"
branch_labels = None
depends_on = None


def upgrade() -> None:
    order_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("orders")}
    if "seller_id" not in order_columns:
        with op.batch_alter_table("orders") as batch_op:
            batch_op.add_column(sa.Column("seller_id", sa.Integer(), nullable=True))
    op.create_table(
        "compensation_rules",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("role", sa.String()), sa.Column("category", sa.String()), sa.Column("basis", sa.String(), nullable=False),
        sa.Column("rate", sa.Numeric(12, 4), nullable=False, server_default="0"), sa.Column("fixed_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(), nullable=False, server_default="COP"), sa.Column("active", sa.String(), nullable=False, server_default="true"),
        sa.Column("valid_from", sa.DateTime(timezone=True)), sa.Column("valid_to", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_compensation_rules_id", "compensation_rules", ["id"])
    op.create_table(
        "order_settlements",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), unique=True, nullable=False),
        sa.Column("gross_sales", sa.Numeric(12, 2), nullable=False), sa.Column("direct_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("logistics_cost", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("producer_payout", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("seller_commission", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("platform_margin", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="calculated"), sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("approved_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_order_settlements_id", "order_settlements", ["id"])
    op.create_table(
        "settlement_allocations",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("settlement_id", sa.Integer(), sa.ForeignKey("order_settlements.id"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("participant_type", sa.String(), nullable=False), sa.Column("basis", sa.String(), nullable=False), sa.Column("category", sa.String()), sa.Column("volume_kg", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("sales_amount", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("rate", sa.Numeric(12, 4), nullable=False, server_default="0"), sa.Column("amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_settlement_allocations_id", "settlement_allocations", ["id"])
    op.create_table(
        "payroll_entries",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("period_start", sa.DateTime(timezone=True), nullable=False), sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fixed_salary", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("variable_amount", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("deductions", sa.Numeric(12, 2), nullable=False, server_default="0"), sa.Column("net_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_payroll_entries_id", "payroll_entries", ["id"])


def downgrade() -> None:
    op.drop_table("payroll_entries")
    op.drop_table("settlement_allocations")
    op.drop_table("order_settlements")
    op.drop_table("compensation_rules")
    op.drop_column("orders", "seller_id")
