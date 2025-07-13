from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from common.db.session import SessionLocal
from common.schemas.response import BaseResponse
from core.vdb.types import VectorDBType
from common.db.models import Team, VDB, VDBCollection, User, UserTeam, VDBShare  # 新增 VDBShare
from common.core.deps import get_db, get_current_user
from pydantic import BaseModel
from datetime import datetime
import json
from common.schemas.worker import VectorDBCollectionConfig

router = APIRouter(prefix="/vdb", tags=["vector_db"])

class VDBIn(BaseModel):
    name: str
    type: str
    team_id: int
    description: Optional[str] = None
    connection_config: dict
    is_private: bool = True
    embedding_dimension: int = 1536
    index_type: str = "hnsw"

class ShareVDBIn(BaseModel):
    team_ids: List[int]

@router.post("", response_model=BaseResponse)
def create_vdb(config_in: VDBIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 权限校验：只有团队 admin 或 owner 才能创建
    if not current_user.is_superuser:
        user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=config_in.team_id).first()
        if not user_team_link or user_team_link.role not in ['admin', 'owner']:
            return BaseResponse(code=403, message="无权在此团队创建向量数据库")

    exists = db.query(VDB).filter_by(name=config_in.name).first()
    if exists:
        return BaseResponse(code=400, message="名称已存在")
    # 处理connection_config，移除collection_name
    conn_cfg = dict(config_in.connection_config)
    collection_name = conn_cfg.pop('collection_name', None)
    db_obj = VDB(
        name=config_in.name,
        type=config_in.type,
        team_id=config_in.team_id,
        description=config_in.description,
        connection_config=json.dumps(conn_cfg),
        is_private=config_in.is_private,
        embedding_dimension=config_in.embedding_dimension,
        index_type=config_in.index_type,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # 只返回可序列化字段
    data = {
        "id": db_obj.id,
        "name": db_obj.name,
        "type": db_obj.type,
        "team_id": db_obj.team_id,
        "description": db_obj.description,
        "connection_config": config_in.connection_config,
        "is_private": db_obj.is_private,
        "embedding_dimension": db_obj.embedding_dimension,
        "index_type": db_obj.index_type,
        "created_at": db_obj.created_at,
        "updated_at": db_obj.updated_at,
    }
    return BaseResponse(code=200, data=data, message="创建成功")

@router.get("", response_model=BaseResponse)
def list_vdbs(team_id: Optional[int] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not team_id:
        return BaseResponse(code=200, data=[], message="请指定团队")
    # 查询所有团队，避免 N+1
    all_teams = {t.id: t.name for t in db.query(Team).all()}
    # 拥有的
    owned = db.query(VDB).filter(VDB.team_id == team_id).all()
    owned_ids = set([v.id for v in owned])
    # 被分享的（active）
    shared_ids = set()
    shared_vdbs = []
    for share in db.query(VDBShare).filter(VDBShare.team_id == team_id, VDBShare.status == 'active').all():
        vdb = db.query(VDB).filter(VDB.id == share.vdb_id).first()
        if vdb and vdb.id not in owned_ids:
            shared_vdbs.append(vdb)
            shared_ids.add(vdb.id)
    # 被撤销但有数据的
    revoked_vdbs = []
    for share in db.query(VDBShare).filter(VDBShare.team_id == team_id, VDBShare.status == 'revoked').all():
        vdb = db.query(VDB).filter(VDB.id == share.vdb_id).first()
        if vdb and vdb.id not in owned_ids and vdb.id not in shared_ids:
            # 只展示有 collection 的
            has_collection = db.query(VDBCollection).filter(VDBCollection.vdb_id == vdb.id, VDBCollection.team_id == team_id).first()
            if has_collection:
                revoked_vdbs.append(vdb)
    result = []
    for c in owned:
        result.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "team_id": c.team_id,
            "team_name": all_teams.get(c.team_id, str(c.team_id)),
            "description": c.description,
            "connection_config": c.connection_config,
            "is_private": c.is_private,
            "embedding_dimension": c.embedding_dimension,
            "index_type": c.index_type,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "status": "owned",
            "shared_team_ids": [s.team_id for s in c.shares if s.status == 'active'],
        })
    for c in shared_vdbs:
        result.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "team_id": c.team_id,
            "team_name": all_teams.get(c.team_id, str(c.team_id)),
            "description": c.description,
            "connection_config": c.connection_config,
            "is_private": c.is_private,
            "embedding_dimension": c.embedding_dimension,
            "index_type": c.index_type,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "status": "shared",
            "shared_team_ids": [s.team_id for s in c.shares if s.status == 'active'],
        })
    for c in revoked_vdbs:
        result.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "team_id": c.team_id,
            "team_name": all_teams.get(c.team_id, str(c.team_id)),
            "description": c.description,
            "connection_config": c.connection_config,
            "is_private": c.is_private,
            "embedding_dimension": c.embedding_dimension,
            "index_type": c.index_type,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "status": "revoked",
            "shared_team_ids": [s.team_id for s in c.shares if s.status == 'active'],
        })
    return BaseResponse(code=200, data=result, message="success")

@router.get("/{id}", response_model=BaseResponse)
def get_vdb(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = db.query(VDB).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
    # 权限检查
    if not current_user.is_superuser:
        user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=config.team_id).first()
        if not user_team_link:
            return BaseResponse(code=403, message="无权访问该向量数据库")
    return BaseResponse(code=200, data={
        "id": config.id,
        "name": config.name,
        "type": config.type,
        "team_id": config.team_id,
        "description": config.description,
        "connection_config": json.loads(config.connection_config),
        "is_private": config.is_private,
        "embedding_dimension": config.embedding_dimension,
        "index_type": config.index_type,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
        "shared_team_ids": [s.team_id for s in config.shares if s.status == 'active'],
    }, message="success")

@router.put("/{id}", response_model=BaseResponse)
def update_vdb(id: int, config_in: VDBIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = db.query(VDB).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")

    # 权限检查
    if not current_user.is_superuser:
        user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=config.team_id).first()
        if not user_team_link or user_team_link.role not in ['admin', 'owner']:
            return BaseResponse(code=403, message="只有团队的 admin 或 owner 才能修改")

    for field, value in config_in.model_dump().items():
        if field in ["connection_config"]:
            cfg = dict(value)
            cfg.pop('collection_name', None)
            setattr(config, field, json.dumps(cfg) if value is not None else None)
        else:
            setattr(config, field, value)
    config.updated_at = datetime.now()
    db.commit()
    db.refresh(config)
    data = {
        "id": config.id,
        "name": config.name,
        "type": config.type,
        "team_id": config.team_id,
        "description": config.description,
        "connection_config": config_in.connection_config,
        "is_private": config.is_private,
        "embedding_dimension": config.embedding_dimension,
        "index_type": config.index_type,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }
    return BaseResponse(code=200, data=data, message="更新成功")

@router.delete("/{id}", response_model=BaseResponse)
def delete_vdb(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = db.query(VDB).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
        
    # 权限检查
    if not current_user.is_superuser:
        user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=config.team_id).first()
        if not user_team_link or user_team_link.role not in ['admin', 'owner']:
            return BaseResponse(code=403, message="只有团队的 admin 或 owner 才能删除")

    db.delete(config)
    db.commit()
    return BaseResponse(code=200, message="删除成功")

@router.post("/test-connection", response_model=BaseResponse)
def test_vdb_connection(config_in: VDBIn):
    """测试向量数据库连接有效性（只检测连通性和表结构，不实例化client）"""
    from core.vdb.factory import VectorDBFactory
    from langchain_core.embeddings import FakeEmbeddings
    try:
        embeddings = FakeEmbeddings(size=config_in.embedding_dimension)
        from common.schemas.worker import VectorDBCollectionConfig
        config = VectorDBCollectionConfig(
            name=config_in.name,
            type=config_in.type,
            team_id=config_in.team_id,
            description=config_in.description,
            connection_config=config_in.connection_config,
            is_private=config_in.is_private,
            embedding_dimension=config_in.embedding_dimension,
            index_type=config_in.index_type,
            created_at=None,
            updated_at=None
        )
        vdb = VectorDBFactory.create_vector_db(config, embeddings)
        import asyncio
        result = asyncio.run(vdb.test_connection())
        if result:
            return BaseResponse(code=200, message="连接成功")
        else:
            return BaseResponse(code=400, message="连接失败或表结构不符")
    except Exception as e:
        return BaseResponse(code=500, message=f"连接异常: {str(e)}")

@router.post("/{id}/share", response_model=BaseResponse)
def share_vdb(id: int, share_in: ShareVDBIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vdb = db.query(VDB).filter_by(id=id).first()
    if not vdb:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
    # 权限校验：仅拥有者团队 admin/owner 可操作
    if not current_user.is_superuser:
        user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=vdb.team_id).first()
        if not user_team_link or user_team_link.role not in ['admin', 'owner']:
            return BaseResponse(code=403, message="只有拥有者团队的管理员可分享")
    # 1. 先将该 vdb_id 下所有非本次 team_ids 的 active 分享置为 revoked
    db.query(VDBShare).filter(VDBShare.vdb_id == id, VDBShare.status == 'active', ~VDBShare.team_id.in_(share_in.team_ids)).update({VDBShare.status: 'revoked', VDBShare.updated_at: datetime.now()}, synchronize_session=False)
    # 2. 对本次 team_ids：如已存在 revoked 记录则恢复为 active，否则插入新 active 记录
    for team_id in share_in.team_ids:
        share = db.query(VDBShare).filter_by(vdb_id=id, team_id=team_id).first()
        if share:
            if share.status == 'revoked':
                share.status = 'active'
                share.updated_at = datetime.now()
        else:
            new_share = VDBShare(vdb_id=id, team_id=team_id, status='active')
            db.add(new_share)
    vdb.updated_at = datetime.now()
    db.commit()
    db.refresh(vdb)
    return BaseResponse(code=200, message="分享成功") 