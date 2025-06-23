"""add svg_icons table

Revision ID: 20240701_add_svg_icon_table
Revises: 36ef475ec248
Create Date: 2024-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '20240701_add_svg_icon_table'
down_revision = '36ef475ec248'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'svg_icons',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False, comment='图标名'),
        sa.Column('content', sa.Text, nullable=False, comment='svg内容字符串'),
        sa.Column('uploader_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False, comment='上传者id'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('svg_icons') 