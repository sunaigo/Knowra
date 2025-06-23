from sqlalchemy.orm import Session
from app.db.models import Team, User, UserTeam
from typing import List

def add_user_to_team(db: Session, user_id: int, team_id: int, role: str = 'member'):
    """将用户加入团队"""
    association = UserTeam(user_id=user_id, team_id=team_id, role=role)
    db.add(association)
    db.commit()
    return True

def get_team_members(db: Session, team_id: int) -> List[User]:
    """获取团队成员列表"""
    associations = db.query(UserTeam).filter(UserTeam.team_id == team_id).all()
    return [assoc.user for assoc in associations]

def create_team(db: Session, name: str, description: str = None):
    team = Team(name=name, description=description)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

def get_teams(db: Session):
    return db.query(Team).all()

def delete_team(db: Session, team_id: int):
    # 先删除所有 UserTeam 关联，避免外键依赖报错
    db.query(UserTeam).filter(UserTeam.team_id == team_id).delete()
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        db.delete(team)
        db.commit()
        return True
    return False 