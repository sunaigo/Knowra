from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.schemas.response import BaseResponse
from app.db.models import Collection, VectorDBConfig, User
from app.core.deps import get_db, get_current_user
from app.schemas.collection import CollectionCreate, CollectionOut
from datetime import datetime

router = APIRouter(prefix="/collection", tags=["collection"])

# 获取某VDB下所有collection
@router.get("", response_model=BaseResponse)
def list_collections(vdb_id: int = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    collections = db.query(Collection).filter(Collection.vdb_id == vdb_id).all()
    data = [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "vdb_id": c.vdb_id,
            "owner_id": c.owner_id,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        } for c in collections
    ]
    return BaseResponse(code=200, data=data, message="success")

# 测试连接（直接复用vdb的测试逻辑）
@router.post("/test-connection", response_model=BaseResponse)
def test_collection_connection(vdb_id: int = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vdb = db.query(VectorDBConfig).filter_by(id=vdb_id).first()
    if not vdb:
        return BaseResponse(code=404, message="未找到对应向量数据库")
    # 复用vdb的连接测试逻辑
    from app.db.vdb.factory import VectorDBFactory
    from langchain_core.embeddings import FakeEmbeddings
    try:
        embeddings = FakeEmbeddings(size=vdb.embedding_dimension)
        from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig
        import json
        config = VDBPydanticConfig(
            name=vdb.name,
            type=vdb.type,
            team_id=vdb.team_id,
            description=vdb.description,
            connection_config=json.loads(vdb.connection_config),
            is_private=vdb.is_private,
            allowed_team_ids=json.loads(vdb.allowed_team_ids) if vdb.allowed_team_ids else None,
            embedding_dimension=vdb.embedding_dimension,
            index_type=vdb.index_type,
            created_at=None,
            updated_at=None
        )
        vdb_instance = VectorDBFactory.create_vector_db(config, embeddings)
        import asyncio
        result = asyncio.run(vdb_instance.connect())
        if result:
            return BaseResponse(code=200, message="连接成功")
        else:
            return BaseResponse(code=400, message="连接失败")
    except Exception as e:
        return BaseResponse(code=500, message=f"连接异常: {str(e)}")

# 新建collection（先测试连接）
@router.post("", response_model=BaseResponse)
def create_collection(collection_in: CollectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 先测试连接
    vdb = db.query(VectorDBConfig).filter_by(id=collection_in.vdb_id).first()
    if not vdb:
        return BaseResponse(code=404, message="未找到对应向量数据库")
    from app.db.vdb.factory import VectorDBFactory
    from langchain_core.embeddings import FakeEmbeddings
    try:
        embeddings = FakeEmbeddings(size=vdb.embedding_dimension)
        from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig
        import json
        config = VDBPydanticConfig(
            name=vdb.name,
            type=vdb.type,
            team_id=vdb.team_id,
            description=vdb.description,
            connection_config=json.loads(vdb.connection_config),
            is_private=vdb.is_private,
            allowed_team_ids=json.loads(vdb.allowed_team_ids) if vdb.allowed_team_ids else None,
            embedding_dimension=vdb.embedding_dimension,
            index_type=vdb.index_type,
            created_at=None,
            updated_at=None
        )
        vdb_instance = VectorDBFactory.create_vector_db(config, embeddings)
        import asyncio
        result = asyncio.run(vdb_instance.connect())
        if not result:
            return BaseResponse(code=400, message="连接测试失败，无法创建collection")
    except Exception as e:
        return BaseResponse(code=500, message=f"连接异常: {str(e)}")
    # 连接测试通过，创建collection
    collection = Collection(
        name=collection_in.name,
        description=collection_in.description,
        vdb_id=collection_in.vdb_id,
        owner_id=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)
    data = {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "vdb_id": collection.vdb_id,
        "owner_id": collection.owner_id,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at,
    }
    return BaseResponse(code=200, data=data, message="创建成功") 