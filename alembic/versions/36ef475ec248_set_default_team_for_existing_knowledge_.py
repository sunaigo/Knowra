"""Set default team for existing knowledge bases

Revision ID: 36ef475ec248
Revises: 
Create Date: 2025-06-23 14:03:49.451350

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = '36ef475ec248'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 定义 Team 和 KnowledgeBase 表的结构，以便在迁移脚本中使用
    teams_table = sa.table('teams',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
    )
    
    knowledge_bases_table = sa.table('knowledge_bases',
        sa.column('id', sa.Integer),
        sa.column('team_id', sa.Integer)
    )

    # 获取数据库连接
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # 1. 查找或创建"默认团队"
        default_team = session.execute(
            sa.select(teams_table).where(teams_table.c.name == '默认团队')
        ).first()
        
        if default_team:
            default_team_id = default_team.id
        else:
            # 如果不存在，则插入新团队并获取其 ID
            result = session.execute(
                teams_table.insert().values(name='默认团队').returning(teams_table.c.id)
            )
            default_team_id = result.scalar()
            
        # 2. 更新 knowledge_bases 表中 team_id 为 NULL 的记录
        op.execute(
            knowledge_bases_table.update().
            where(knowledge_bases_table.c.team_id.is_(None)).
            values(team_id=default_team_id)
        )
        
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def downgrade() -> None:
    """Downgrade schema."""
    # 在降级时，理论上可以不做任何操作，因为无法安全地恢复原来的NULL值
    pass
