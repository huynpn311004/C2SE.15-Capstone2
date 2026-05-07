"""Add delivery_distance column to orders table

Revision ID: add_delivery_distance
Revises:
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_delivery_distance'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('delivery_distance', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'delivery_distance')
