"""use decimal types for monetary values

Revision ID: 4d4f2d7a8f2b
Revises: 232412e459a1
"""
from alembic import op
import sqlalchemy as sa


revision = "4d4f2d7a8f2b"
down_revision = "232412e459a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table, columns in {
        "products": ["price"],
        "orders": ["total_amount"],
        "order_items": ["unit_price", "subtotal"],
    }.items():
        current_columns = {item["name"]: item["type"] for item in sa.inspect(op.get_bind()).get_columns(table)}
        pending = [column for column in columns if isinstance(current_columns.get(column), sa.Float)]
        if pending:
            with op.batch_alter_table(table) as batch_op:
                for column in pending:
                    batch_op.alter_column(
                        column,
                        existing_type=sa.Float(),
                        type_=sa.Numeric(12, 2),
                        existing_nullable=False,
                    )


def downgrade() -> None:
    for table, columns in {
        "products": ["price"],
        "orders": ["total_amount"],
        "order_items": ["unit_price", "subtotal"],
    }.items():
        current_columns = {item["name"]: item["type"] for item in sa.inspect(op.get_bind()).get_columns(table)}
        pending = [column for column in columns if isinstance(current_columns.get(column), sa.Numeric)]
        if pending:
            with op.batch_alter_table(table) as batch_op:
                for column in pending:
                    batch_op.alter_column(
                        column,
                        existing_type=sa.Numeric(12, 2),
                        type_=sa.Float(),
                        existing_nullable=False,
                    )
