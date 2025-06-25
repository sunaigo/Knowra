from sqlalchemy.orm import Session
from app.db import models
from app.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseUpdate
from sqlalchemy import func

# 创建知识库
def create_kb(db: Session, kb_in: KnowledgeBaseCreate, owner_id: int):
    kb = models.KnowledgeBase(
        name=kb_in.name,
        description=kb_in.description,
        owner_id=owner_id,
        auto_process_on_upload=kb_in.auto_process_on_upload,
        embedding_model_id=kb_in.embedding_model_id,
        team_id=kb_in.team_id,
        icon_name=kb_in.icon_name
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb

# 获取所有知识库
def get_kbs(db: Session, team_id: int = None, skip: int = 0, limit: int = 20):
    query = db.query(models.KnowledgeBase)
    if team_id:
        query = query.filter(models.KnowledgeBase.team_id == team_id)

    kbs = query.offset(skip).limit(limit).all()
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
    for field, value in update_data.items():
        setattr(kb, field, value)
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