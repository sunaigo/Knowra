from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.schemas.response import BaseResponse
from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig, VectorDBType
from app.db.models import Team, VectorDBConfig  # 新增VectorDBConfig模型
from app.core.deps import get_db, get_current_user
from pydantic import BaseModel
from datetime import datetime
import json

router = APIRouter(prefix="/vdb", tags=["vector_db"])

class VectorDBConfigIn(BaseModel):
    name: str
    type: str
    team_id: int
    description: Optional[str] = None
    connection_config: dict
    is_private: bool = True
    allowed_team_ids: Optional[List[int]] = None
    embedding_dimension: int = 1536
    index_type: str = "hnsw"

@router.post("", response_model=BaseResponse)
def create_vdb(config_in: VectorDBConfigIn, db: Session = Depends(get_db), current_user: Team = Depends(get_current_user)):
    # 权限校验略
    exists = db.query(VectorDBConfig).filter_by(name=config_in.name).first()
    if exists:
        return BaseResponse(code=400, message="名称已存在")
    db_obj = VectorDBConfig(
        name=config_in.name,
        type=config_in.type,
        team_id=config_in.team_id,
        description=config_in.description,
        connection_config=json.dumps(config_in.connection_config),
        is_private=config_in.is_private,
        allowed_team_ids=json.dumps(config_in.allowed_team_ids) if config_in.allowed_team_ids else None,
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
        "allowed_team_ids": config_in.allowed_team_ids,
        "embedding_dimension": db_obj.embedding_dimension,
        "index_type": db_obj.index_type,
        "created_at": db_obj.created_at,
        "updated_at": db_obj.updated_at,
    }
    return BaseResponse(code=200, data=data, message="创建成功")

@router.get("", response_model=BaseResponse)
def list_vdbs(team_id: Optional[int] = Query(None), db: Session = Depends(get_db), current_user: Team = Depends(get_current_user)):
    q = db.query(VectorDBConfig)
    if team_id is not None:
        q = q.filter(VectorDBConfig.team_id == team_id)
    configs = q.all()
    result = []
    for c in configs:
        result.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "team_id": c.team_id,
            "description": c.description,
            "connection_config": json.loads(c.connection_config),
            "is_private": c.is_private,
            "allowed_team_ids": json.loads(c.allowed_team_ids) if c.allowed_team_ids else None,
            "embedding_dimension": c.embedding_dimension,
            "index_type": c.index_type,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        })
    return BaseResponse(code=200, data=result, message="success")

@router.get("/{id}", response_model=BaseResponse)
def get_vdb(id: int, db: Session = Depends(get_db), current_user: Team = Depends(get_current_user)):
    config = db.query(VectorDBConfig).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
    return BaseResponse(code=200, data={
        "id": config.id,
        "name": config.name,
        "type": config.type,
        "team_id": config.team_id,
        "description": config.description,
        "connection_config": json.loads(config.connection_config),
        "is_private": config.is_private,
        "allowed_team_ids": json.loads(config.allowed_team_ids) if config.allowed_team_ids else None,
        "embedding_dimension": config.embedding_dimension,
        "index_type": config.index_type,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }, message="success")

@router.put("/{id}", response_model=BaseResponse)
def update_vdb(id: int, config_in: VectorDBConfigIn, db: Session = Depends(get_db), current_user: Team = Depends(get_current_user)):
    config = db.query(VectorDBConfig).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
    for field, value in config_in.dict().items():
        if field in ["connection_config", "allowed_team_ids"]:
            setattr(config, field, json.dumps(value) if value is not None else None)
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
        "allowed_team_ids": config_in.allowed_team_ids,
        "embedding_dimension": config.embedding_dimension,
        "index_type": config.index_type,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }
    return BaseResponse(code=200, data=data, message="更新成功")

@router.delete("/{id}", response_model=BaseResponse)
def delete_vdb(id: int, db: Session = Depends(get_db), current_user: Team = Depends(get_current_user)):
    config = db.query(VectorDBConfig).filter_by(id=id).first()
    if not config:
        return BaseResponse(code=404, message="未找到该向量数据库实例")
    db.delete(config)
    db.commit()
    return BaseResponse(code=200, message="删除成功")

@router.post("/test-connection", response_model=BaseResponse)
def test_vdb_connection(config_in: VectorDBConfigIn):
    """测试向量数据库连接有效性"""
    from app.db.vdb.factory import VectorDBFactory
    from langchain_core.embeddings import FakeEmbeddings
    try:
        embeddings = FakeEmbeddings(size=config_in.embedding_dimension)
        from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig
        config = VDBPydanticConfig(
            name=config_in.name,
            type=config_in.type,
            team_id=config_in.team_id,
            description=config_in.description,
            connection_config=config_in.connection_config,
            is_private=config_in.is_private,
            allowed_team_ids=config_in.allowed_team_ids,
            embedding_dimension=config_in.embedding_dimension,
            index_type=config_in.index_type,
            created_at=None,
            updated_at=None
        )
        vdb = VectorDBFactory.create_vector_db(config, embeddings)
        import asyncio
        result = asyncio.run(vdb.connect())
        if result:
            return BaseResponse(code=200, message="连接成功")
        else:
            return BaseResponse(code=400, message="连接失败")
    except Exception as e:
        return BaseResponse(code=500, message=f"连接异常: {str(e)}") 