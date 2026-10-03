"""align SQLite role storage with expanded role names

Revision ID: ac23de45f067
Revises: ab12cd34ef56
"""
from alembic import op
import sqlalchemy as sa

revision = "ac23de45f067"
down_revision = "ab12cd34ef56"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("role", existing_type=sa.String(length=8), type_=sa.String(length=9))


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("role", existing_type=sa.String(length=9), type_=sa.String(length=8))
