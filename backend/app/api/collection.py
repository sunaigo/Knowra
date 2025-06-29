from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.schemas.response import BaseResponse
from app.db.models import Collection, VectorDBConfig, User, Team, VDBShare, UserTeam
from app.core.deps import get_db, get_current_user
from app.schemas.collection import CollectionCreate, CollectionOut, CollectionUpdate
from datetime import datetime
import json

router = APIRouter(prefix="/collection", tags=["collection"])

# 获取某VDB下所有collection
@router.get("", response_model=BaseResponse)
def list_collections(
    vdb_id: int = Query(...),
    team_id: int = Query(...),
    exclude_bound: bool = Query(False, description="是否排除已绑定知识库的collection"),
    editing_kb_id: Optional[int] = Query(None, description="编辑知识库时的ID，允许显示该知识库已绑定的collection"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vdb = db.query(VectorDBConfig).filter(VectorDBConfig.id == vdb_id).first()
    if not vdb:
        return BaseResponse(code=404, message="未找到对应向量数据库")
    # 新逻辑：查 vdb_share
    share = db.query(VDBShare).filter(VDBShare.vdb_id == vdb_id, VDBShare.team_id == team_id).first()
    share_status = share.status if share else None
    # 拥有者团队也只返回本团队的 collection
    collections = (
        db.query(Collection, Team)
        .join(Team, Collection.team_id == Team.id)
        .filter(Collection.vdb_id == vdb_id, Collection.team_id == team_id)
        .all()
    )
    
    # 如果需要排除已绑定的 collection
    if exclude_bound:
        from app.db.models import KnowledgeBase
        # 查询所有已绑定的 collection_id
        bound_collection_ids = db.query(KnowledgeBase.collection_id).filter(
            KnowledgeBase.collection_id.isnot(None)
        ).all()
        bound_collection_ids = [cid[0] for cid in bound_collection_ids if cid[0] is not None]
        
        # 如果是编辑模式，允许显示当前知识库绑定的 collection
        if editing_kb_id:
            current_kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == editing_kb_id).first()
            if current_kb and current_kb.collection_id:
                # 从排除列表中移除当前知识库绑定的 collection
                if current_kb.collection_id in bound_collection_ids:
                    bound_collection_ids.remove(current_kb.collection_id)
        
        # 过滤掉已绑定的 collection
        collections = [(c, t) for c, t in collections if c.id not in bound_collection_ids]
    
    data = []
    for c, t in collections:
        # 状态判断
        if team_id == vdb.team_id or share_status == "active":
            status = "normal"
        elif share_status == "revoked":
            status = "revoked"
        else:
            status = "revoked"  # 兜底
        data.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "vdb_id": c.vdb_id,
            "owner_id": c.owner_id,
            "team_id": c.team_id,
            "team_name": t.name if c.team_id != team_id else None,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "status": status,
        })
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
@router.post("")
def create_collection(
    collection_in: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vdb = db.query(VectorDBConfig).filter_by(id=collection_in.vdb_id).first()
    if not vdb:
        return BaseResponse(code=404, message="未找到对应向量数据库")
    # 只有 collection_in.team_id 对应团队的 owner/admin 才能创建
    user_team_link = db.query(UserTeam).filter_by(user_id=current_user.id, team_id=collection_in.team_id).first()
    if not user_team_link or user_team_link.role not in ['admin', 'owner']:
        return BaseResponse(code=403, message="无权限在该 VDB 下创建 collection，需为本团队 owner/admin")
    # 连接测试
    from app.db.vdb.factory import VectorDBFactory
    from langchain_core.embeddings import FakeEmbeddings
    try:
        embeddings = FakeEmbeddings(size=vdb.embedding_dimension)
        from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig
        config = VDBPydanticConfig(
            name=vdb.name,
            type=vdb.type,
            team_id=vdb.team_id,
            description=vdb.description,
            connection_config=json.loads(vdb.connection_config),
            is_private=vdb.is_private,
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
    # 创建collection
    collection = Collection(
        name=collection_in.name,
        description=collection_in.description,
        vdb_id=collection_in.vdb_id,
        owner_id=current_user.id,
        team_id=collection_in.team_id,
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
        "team_id": collection.team_id,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at,
    }
    return BaseResponse(code=200, data=data, message="创建成功")

@router.delete("/{collection_id}", response_model=BaseResponse)
def delete_collection(
    collection_id: int,
    team_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        return BaseResponse(code=404, message="未找到对应 collection")
    if collection.team_id != team_id:
        return BaseResponse(code=403, message="无权限删除该 collection")
    db.delete(collection)
    db.commit()
    return BaseResponse(code=200, message="删除成功")

@router.put("/{collection_id}", response_model=BaseResponse)
def update_collection(
    collection_id: int,
    team_id: int = Body(...),
    name: Optional[str] = Body(None),
    description: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        return BaseResponse(code=404, message="未找到对应 collection")
    if collection.team_id != team_id:
        return BaseResponse(code=403, message="无权限编辑该 collection")
    if name is not None:
        collection.name = name
    if description is not None:
        collection.description = description
    collection.updated_at = datetime.now()
    db.commit()
    db.refresh(collection)
    data = {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "vdb_id": collection.vdb_id,
        "owner_id": collection.owner_id,
        "team_id": collection.team_id,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at,
    }
    return BaseResponse(code=200, data=data, message="更新成功")

@router.get("/{collection_id}", response_model=BaseResponse)
def get_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        return BaseResponse(code=404, message="未找到对应 Collection")
    vdb = db.query(VectorDBConfig).filter(VectorDBConfig.id == collection.vdb_id).first()
    data = {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "vdb_id": collection.vdb_id,
        "team_id": collection.team_id,
        "owner_id": collection.owner_id,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at,
        "vdb_name": vdb.name if vdb else None,
    }
    return BaseResponse(code=200, data=data, message="success") 