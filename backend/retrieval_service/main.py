from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Union
import json

from common.db.session import SessionLocal
from common.db.models import KnowledgeBase, VDBCollection, VDB, Model
from common.schemas.knowledge_base import KnowledgeBaseOut
from common.schemas.response import ListResponse, BaseResponse
from core.vdb.factory import VectorDBFactory
from core.embedder.factory import EmbedderFactory
from common.schemas.worker import VectorDBCollectionConfig
from common.utils.redis_client import get_key, set_key

from loguru import logger

app = FastAPI(title="Retrieval Service API")

# 响应体统一格式
class ResponseModel(BaseModel):
    code: int
    data: Any = None
    message: str = "success"

# 检索请求参数
class RetrieveRequest(BaseModel):
    knowledge_base_id: int = Field(..., description="知识库ID")
    query: Union[str, List[float]] = Field(..., description="检索内容（文本或向量）")
    top_k: Optional[int] = Field(5, description="返回前K条，默认5，最大2000")

# 知识库列表接口
@app.get("/api/v1/kbs", response_model=ListResponse[KnowledgeBaseOut])
def list_knowledge_bases():
    cache_key = "kbs:all"
    cache = get_key(cache_key)
    if cache:
        try:
            kb_list = json.loads(cache)
            return ListResponse[KnowledgeBaseOut](data=[KnowledgeBaseOut(**kb) for kb in kb_list], code=200, message="success")
        except Exception:
            pass
    db = SessionLocal()
    try:
        kb_list = db.query(KnowledgeBase).all()
        result = [KnowledgeBaseOut.model_validate(kb).model_dump() for kb in kb_list]
        set_key(cache_key, json.dumps(result, default=str), ex=60)
        return ListResponse[KnowledgeBaseOut](data=[KnowledgeBaseOut(**kb) for kb in result], code=200, message="success")
    finally:
        db.close()

# 检索接口
@app.post("/api/v1/retrieve", response_model=BaseResponse)
def retrieve_documents(req: RetrieveRequest = Body(...)):
    top_k = req.top_k or 5
    if top_k > 2000:
        return BaseResponse(code=400, message="top_k 最大为2000", data=None)
    if req.query is None:
        return BaseResponse(code=400, message="query必须提供（文本或向量）", data=None)
    vdb_cache_key = f"vdb:kb:{req.knowledge_base_id}"
    vdb_cache = get_key(vdb_cache_key)
    vdb_config = None
    embedder_config = None
    config_source = None
    if vdb_cache:
        try:
            vdb_info = json.loads(vdb_cache)
            vdb_config = VectorDBCollectionConfig(**vdb_info["vdb_config"])
            embedder_config = vdb_info["embedder_config"]
            config_source = "redis"
        except Exception:
            vdb_cache = None
    else:
        db = SessionLocal()
        try:
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == req.knowledge_base_id).first()
            if not kb:
                return BaseResponse(code=404, message="知识库不存在", data=None)
            collection = db.query(VDBCollection).filter(VDBCollection.id == kb.collection_id).first()
            if not collection:
                return BaseResponse(code=404, message="知识库未绑定有效的向量集合", data=None)
            vdb = db.query(VDB).filter(VDB.id == collection.vdb_id).first()
            if not vdb:
                return BaseResponse(code=404, message="向量数据库不存在", data=None)
            vdb_config = VectorDBCollectionConfig(
                collection_name=collection.name,
                type=vdb.type,
                connection_config=vdb.connection_config,
                embedding_dimension=vdb.embedding_dimension,
                index_type=vdb.index_type
            )
            model = db.query(Model).filter(Model.id == kb.embedding_model_id).first()
            if not model:
                return BaseResponse(code=404, message="知识库未配置embedding模型", data=None)
            embedder_config = {
                "provider": model.connection.provider if model.connection else None,
                "model_name": model.model_name,
                "api_key": vdb.connection_config.get("api_key"),
                "base_url": vdb.connection_config.get("base_url")
            }
            knowledge_base = {
                "id": kb.id,
                "name": kb.name,
                "description": kb.description,
                "collection_id": kb.collection_id,
            }
            set_key(vdb_cache_key, json.dumps({
                "vdb_config": vdb_config.model_dump(),
                "embedder_config": embedder_config,
                "knowledge_base": knowledge_base
            }), ex=60)
            config_source = "database"
        finally:
            db.close()
    logger.debug(f"检索配置来源: {config_source}, vdb_config: {vdb_config}, embedder_config: {embedder_config}")
    try:
        embedder = EmbedderFactory.create(embedder_config)
        vectordb = VectorDBFactory.create_vector_db(vdb_config, embedder)
        vectordb.sync_connect()
        docs = vectordb.similarity_search_with_relevance_scores(req.query, k=top_k)
        results = []
        for doc in docs:
            results.append({
                "content": getattr(doc[0], 'page_content', None) or getattr(doc, 'content', None),
                "score": doc[1],
                "metadata": getattr(doc[0], 'metadata', {})
            })
        return BaseResponse(data=results, code=200, message="success")
    except Exception as e:
        return BaseResponse(code=500, message=f"检索异常: {str(e)}", data=None) 