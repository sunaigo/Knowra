from sqlalchemy.orm import Session
from app.db import models
from app.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseUpdate
from sqlalchemy import func
from app.db.models import Team, KnowledgeBase, team_kb, User, user_team, Permission
from typing import List

# 创建知识库
def create_kb(db: Session, kb_in: KnowledgeBaseCreate, owner_id: int):
    kb = models.KnowledgeBase(
        name=kb_in.name,
        description=kb_in.description,
        owner_id=owner_id
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb

# 获取所有知识库
def get_kbs(db: Session, skip: int = 0, limit: int = 20):
    kbs = db.query(models.KnowledgeBase).offset(skip).limit(limit).all()
    kb_ids = [kb.id for kb in kbs]
    doc_counts = dict(db.query(models.Document.kb_id, func.count(models.Document.id)).filter(models.Document.kb_id.in_(kb_ids)).group_by(models.Document.kb_id).all())
    last_file_times = dict(
        db.query(models.Document.kb_id, func.max(models.Document.upload_time))
        .filter(models.Document.kb_id.in_(kb_ids))
        .group_by(models.Document.kb_id)
        .all()
    )
    for kb in kbs:
        kb.doc_count = doc_counts.get(kb.id, 0)
        kb.last_file_time = last_file_times.get(kb.id)
    return kbs

# 获取单个知识库
def get_kb(db: Session, kb_id: int):
    return db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == kb_id).first()

# 更新知识库
def update_kb(db: Session, kb_id: int, kb_in: KnowledgeBaseUpdate):
    kb = get_kb(db, kb_id)
    if not kb:
        return None
    update_data = kb_in.dict(exclude_unset=True)
    print(f"[update_kb] update_data: {update_data}")
    print(f"[update_kb] before: chunk_size={kb.chunk_size}, overlap={kb.overlap}")
    for field, value in update_data.items():
        setattr(kb, field, value)
    print(f"[update_kb] after: chunk_size={kb.chunk_size}, overlap={kb.overlap}")
    db.commit()
    db.refresh(kb)
    return kb

# 删除知识库
def delete_kb(db: Session, kb_id: int):
    kb = get_kb(db, kb_id)
    if not kb:
        return None
    db.delete(kb)
    db.commit()
    return kb

def assign_kb_to_team(db: Session, kb_id: int, team_id: int):
    """将知识库分配给团队"""
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    team = db.query(Team).filter(Team.id == team_id).first()
    if kb and team:
        team.knowledge_bases.append(kb)
        db.commit()
        return True
    return False

def add_user_to_team(db: Session, user_id: int, team_id: int):
    """将用户加入团队"""
    user = db.query(User).filter(User.id == user_id).first()
    team = db.query(Team).filter(Team.id == team_id).first()
    if user and team:
        team.users.append(user)
        db.commit()
        return True
    return False

def get_team_members(db: Session, team_id: int) -> List[User]:
    """获取团队成员列表"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        return team.users
    return []

def create_team(db: Session, name: str):
    team = Team(name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

def get_teams(db: Session):
    return db.query(Team).all()

def delete_team(db: Session, team_id: int):
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        db.delete(team)
        db.commit()
        return True
    return False

def create_role(db: Session, name: str, description: str = ""):
    role = Role(name=name, description=description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

def get_roles(db: Session):
    return db.query(Role).all()

def delete_role(db: Session, role_id: int):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role:
        db.delete(role)
        db.commit()
        return True
    return False

def create_permission(db: Session, name: str, description: str = ""):
    perm = Permission(name=name, description=description)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm

def get_permissions(db: Session):
    return db.query(Permission).all()

def delete_permission(db: Session, perm_id: int):
    perm = db.query(Permission).filter(Permission.id == perm_id).first()
    if perm:
        db.delete(perm)
        db.commit()
        return True
    return False 