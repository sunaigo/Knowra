from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form, Body
import os
import json
from sqlalchemy.orm import Session
from datetime import datetime
from common.db.models import Document, DocumentStatus, KnowledgeBase, VDBCollection, VDB, OSSConnection
from common.core.deps import get_db, get_current_user
from common.core.config import config
from common.schemas.response import BaseResponse
from common.schemas.knowledge_base import DocumentUpdate
from typing import Any, Optional, List
from webapi.services.document_service import (
    create_document, 
    get_documents, 
    get_document as get_document_service, 
    delete_document as delete_document_service, 
    update_document as update_document_service
)
from webapi.services.document_task_dispatcher import dispatch_document_parse_task, celery_app
from pydantic import BaseModel
from fastapi.responses import FileResponse, StreamingResponse
from webapi.services.knowledge_base_service import get_kb
from loguru import logger
from common.utils.oss_client import OSSClient
from common.core.encryption import decrypt_api_key
from common.schemas.worker import VectorDBCollectionConfig

router = APIRouter(prefix="/docs", tags=["document"])

# 以下为文档相关接口，内容与原 knowledge_base.py 保持一致

@router.post("/{kb_id}/upload", response_model=BaseResponse)
def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    parsing_config: Optional[str] = Form(None), # JSON string
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    kb = get_kb(db, kb_id)
    if not kb:
        return BaseResponse(code=404, message="知识库不存在")

    file_ext = os.path.splitext(file.filename)[1]
    save_name = f"{int(datetime.utcnow().timestamp())}{file_ext}"
    doc_status = 'pending' if kb.auto_process_on_upload else 'not_started'
    config_dict = None
    if parsing_config:
        try:
            config_dict = json.loads(parsing_config)
        except json.JSONDecodeError:
            return BaseResponse(code=400, message="Invalid JSON in parsing_config")

    # 判断是否绑定 OSS
    if kb.oss_connection_id and kb.oss_bucket:
        oss_conn = db.query(OSSConnection).filter(OSSConnection.id == kb.oss_connection_id).first()
        if not oss_conn:
            return BaseResponse(code=400, message="OSS 连接不存在")
        # 解密 access_key/secret_key
        ak = decrypt_api_key(oss_conn.access_key)
        sk = decrypt_api_key(oss_conn.secret_key)
        uploader = OSSClient(
            endpoint_url=oss_conn.endpoint,
            access_key=ak,
            secret_key=sk,
            region=oss_conn.region
        )
        # 上传到 OSS
        file.file.seek(0)
        oss_key = save_name  # 直接用唯一文件名，不再拼接kb_id
        try:
            uploader.upload_fileobj(file.file, kb.oss_bucket, oss_key)
        except Exception as e:
            return BaseResponse(code=500, message=f"OSS 上传失败: {e}")
        file_url = f"oss://{kb.oss_bucket}/{oss_key}"
        doc = create_document(
            db, kb_id, file.filename, file_ext[1:].lower() if file_ext else '',
            file_url, current_user.id, parsing_config=config_dict, status=doc_status,
            oss_connection_id=kb.oss_connection_id, oss_bucket=kb.oss_bucket
        )
        storage_type = 'oss'
    else:
        # 本地上传
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), config.upload['dir'])
        kb_dir = os.path.join(upload_dir, str(kb_id))
        os.makedirs(kb_dir, exist_ok=True)
        save_path = os.path.join(kb_dir, save_name)
        file.file.seek(0)
        with open(save_path, "wb") as f:
            f.write(file.file.read())
        file_url = f"/static/uploads/{kb_id}/{save_name}"
        doc = create_document(
            db, kb_id, file.filename, file_ext[1:].lower() if file_ext else '',
            save_path, current_user.id, parsing_config=config_dict, status=doc_status
        )
        storage_type = 'local'

    if doc.status == 'pending':
        dispatch_document_parse_task(doc.id)

    return BaseResponse(code=200, data={
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "storage_type": storage_type,
        "file_url": file_url
    })

@router.get("/{kb_id}/list", response_model=BaseResponse)
def list_documents(kb_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    kb = get_kb(db, kb_id)
    if not kb:
        return BaseResponse(code=404, message="知识库不存在")

    docs = get_documents(db, kb_id)
    data = []
    for d in docs:
        data.append({
            "id": d.id, "filename": d.filename, "filetype": d.filetype, "status": d.status,
            "upload_time": d.upload_time, "uploader_id": d.uploader_id, "fail_reason": d.fail_reason,
            "progress": getattr(d, 'progress', 0), "parsing_config": d.parsing_config,
            "last_parsed_config": d.last_parsed_config, "chunk_count": d.chunk_count,
            "parse_offset": d.parse_offset
        })
    return BaseResponse(code=200, data=data)

@router.delete("/{doc_id}", response_model=BaseResponse)
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    try:
        if doc.filepath and os.path.exists(doc.filepath):
            os.remove(doc.filepath)
        
        # 获取知识库绑定的 vdb_collection 及其 VDB 配置
        kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc.kb_id).first()
        if kb and kb.collection_id:
            collection = db.query(VDBCollection).filter(VDBCollection.id == kb.collection_id).first()
            if collection:
                vdb_config = db.query(VDB).filter(VDB.id == collection.vdb_id).first()
                if vdb_config:
                    # 使用VDB工厂创建正确的向量数据库连接
                    from core.vdb.factory import VectorDBFactory
                    import json
                    import asyncio
                    
                    # 创建VDB配置对象并使用工厂创建向量数据库实例
                    conn_cfg = vdb_config.connection_config
                    if isinstance(conn_cfg, str):
                        conn_cfg = json.loads(conn_cfg)
                    vdb_pydantic_config = VectorDBCollectionConfig(
                        collection_name=collection.name,
                        type=vdb_config.type,
                        connection_config=conn_cfg,
                        embedding_dimension=vdb_config.embedding_dimension,
                        index_type=vdb_config.index_type
                    )
                    
                    # 使用VDB工厂创建向量数据库实例
                    vdb_instance = VectorDBFactory.create_vector_db(vdb_pydantic_config, None)
                    
                    # 连接到向量数据库并删除文档相关数据
                    connected = asyncio.run(vdb_instance.connect())
                    if connected:
                        db_chroma = vdb_instance._client
                        db_chroma.delete(where={"doc_id": doc.id})
                        logger.info(f"[Delete] 已从向量数据库 {vdb_config.name} 删除文档 {doc.id} 的分块数据")
                    else:
                        logger.warning(f"[Delete] 无法连接到向量数据库 {vdb_config.name}，跳过向量数据删除")
                else:
                    logger.warning(f"[Delete] 文档 {doc.id} 所属知识库的VDB配置未找到，跳过向量数据删除")
            else:
                logger.warning(f"[Delete] 文档 {doc.id} 所属知识库的VDBCollection未找到，跳过向量数据删除")
        else:
            logger.warning(f"[Delete] 文档 {doc.id} 所属知识库未绑定VDBCollection，跳过向量数据删除")
    except Exception as e:
        logger.warning(f"[Delete] 文件或向量库数据删除失败: {e}")

    delete_document_service(db, doc)
    return BaseResponse(code=200, message="删除成功")

@router.get("/{doc_id}", response_model=BaseResponse)
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    return BaseResponse(code=200, data={
        "id": doc.id, "filename": doc.filename, "filetype": doc.filetype, "status": doc.status,
        "upload_time": doc.upload_time, "uploader_id": doc.uploader_id, "fail_reason": doc.fail_reason,
        "progress": getattr(doc, 'progress', 0), "parsing_config": doc.parsing_config,
        "last_parsed_config": doc.last_parsed_config,
        "chunk_count": doc.chunk_count,
        "parse_offset": doc.parse_offset
    })

@router.put("/{doc_id}", response_model=BaseResponse)
def update_document_params(doc_id: int, params: DocumentUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    
    update_data = params.dict(exclude_unset=True)
    if not update_data:
        return BaseResponse(code=400, message="没有提供任何更新内容")

    updated_doc = update_document_service(db, doc, data=update_data)
    
    return BaseResponse(code=200, data={"id": updated_doc.id, "parsing_config": updated_doc.parsing_config})

@router.post("/{doc_id}/process", response_model=BaseResponse)
def process_document(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    
    # 将文档加入后台处理队列
    dispatch_document_parse_task(doc.id)
    
    return BaseResponse(code=200, message="已将文档加入处理队列")

@router.get("/{doc_id}/preview")
def preview_txt_document(doc_id: int, offset: int = Query(0, ge=0), db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)) -> dict:
    doc = get_document_service(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    max_lines = 5000
    max_chars = 50000
    lines = []
    total_chars = 0
    actual_lines = 0
    has_more = False
    try:
        # 判断是否为 OSS 文件（需全部条件满足）
        is_oss = bool(doc.oss_connection_id and doc.oss_bucket and str(doc.filepath).startswith('oss://'))
        if is_oss:
            oss_conn = db.query(OSSConnection).filter(OSSConnection.id == doc.oss_connection_id).first()
            ak = decrypt_api_key(oss_conn.access_key)
            sk = decrypt_api_key(oss_conn.secret_key)
            uploader = OSSClient(
                endpoint_url=oss_conn.endpoint,
                access_key=ak,
                secret_key=sk,
                region=oss_conn.region
            )
            # 直接用数据库存储的key，不再拼接kb_id
            oss_key = doc.filepath.replace(f'oss://{doc.oss_bucket}/', '')
            import io
            response = uploader.s3.get_object(Bucket=doc.oss_bucket, Key=oss_key)
            f = io.StringIO(response['Body'].read().decode('utf-8'))
        else:
            f = open(doc.filepath, 'r', encoding='utf-8')
        with f:
            for _ in range(offset):
                if f.readline() == '':
                    break
            for _ in range(max_lines):
                line = f.readline()
                if not line:
                    break
                if total_chars + len(line) > max_chars:
                    line = line[:max_chars - total_chars]
                    lines.append(line)
                    total_chars = max_chars
                    actual_lines += 1
                    break
                lines.append(line)
                total_chars += len(line)
                actual_lines += 1
            if f.readline():
                has_more = True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文件失败: {e}")
    return {
        "content": ''.join(lines),
        "lines": actual_lines,
        "chars": total_chars,
        "has_more": has_more,
        "next_offset": offset + actual_lines if has_more else None
    }

@router.get("/{doc_id}/chunks")
def list_document_chunks(doc_id: int, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), full_text: bool = Query(False), db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return BaseResponse(code=404, message="Document not found")

    # 获取知识库绑定的 vdb_collection 及其 VDB 配置
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc.kb_id).first()
    collection_name = None
    vdb_config = None
    if kb and kb.collection_id:
        collection = db.query(VDBCollection).filter(VDBCollection.id == kb.collection_id).first()
        if collection:
            collection_name = collection.name
            vdb_config = db.query(VDB).filter(VDB.id == collection.vdb_id).first()
    if not collection_name or not vdb_config:
        return BaseResponse(code=400, message="知识库未绑定有效的 VDBCollection 或 VDB 配置，无法查询分块")

    try:
        # 使用VDB工厂创建正确的向量数据库连接
        from core.vdb.factory import VectorDBFactory
        import json
        
        # 创建VDB配置对象并使用工厂创建向量数据库实例
        conn_cfg = vdb_config.connection_config
        if isinstance(conn_cfg, str):
            conn_cfg = json.loads(conn_cfg)
        vdb_pydantic_config = VectorDBCollectionConfig(
            collection_name=collection_name,
            type=vdb_config.type,
            connection_config=conn_cfg,
            embedding_dimension=vdb_config.embedding_dimension,
            index_type=vdb_config.index_type
        )
        
        # 使用VDB工厂创建向量数据库实例
        vdb_instance = VectorDBFactory.create_vector_db(vdb_pydantic_config, None)
        
        # 连接到向量数据库
        import asyncio
        connected = asyncio.run(vdb_instance.connect())
        if not connected:
            return BaseResponse(code=500, message=f"无法连接到向量数据库: {vdb_config.name}")
        
        # 使用真正的向量数据库进行查询
        db_chroma = vdb_instance._client
        where = {"doc_id": doc_id}
        all_chunks_result = db_chroma.get(where=where, include=["metadatas", "documents"])
        logger.info(f"[DEBUG] 查询到分块数量: documents={len(all_chunks_result.get('documents', []))}, metadatas={len(all_chunks_result.get('metadatas', []))}")
        documents = all_chunks_result.get("documents", [])
        metadatas = all_chunks_result.get("metadatas", [])
        if not documents:
            return BaseResponse(code=200, data={"items": [], "total": 0, "page": page, "limit": limit})

        combined = sorted(list(zip(documents, metadatas)), key=lambda item: item[1].get("chunk_id", 0))
        total_chunks = len(combined)
        paginated_items = combined[(page - 1) * limit : page * limit]

        chunk_list = []
        for text, meta in paginated_items:
            chunk_data = {"chunk_id": meta.get("chunk_id"), "text": text, "total_lines": text.count('\n') + 1, "truncated": False, "length": meta.get("length", len(text))}
            if not full_text:
                lines = text.splitlines()
                preview = '\n'.join(lines[:3])
                chunk_data["text"] = preview
                chunk_data["truncated"] = len(lines) > 3
            chunk_list.append(chunk_data)
        return BaseResponse(code=200, data={"items": chunk_list, "total": total_chunks, "page": page, "limit": limit})
    except Exception as e:
        logger.error(e)
        return BaseResponse(code=500, message=f"查询分块失败: {str(e)}")

@router.get("/{doc_id}/download")
def download_document_file(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    is_oss = bool(doc and doc.oss_connection_id and doc.oss_bucket and str(doc.filepath).startswith('oss://'))
    if not doc or not doc.filepath or (not is_oss and not os.path.exists(doc.filepath)):
        raise HTTPException(status_code=404, detail="文件不存在或已丢失")
    if is_oss:
        oss_conn = db.query(OSSConnection).filter(OSSConnection.id == doc.oss_connection_id).first()
        ak = decrypt_api_key(oss_conn.access_key)
        sk = decrypt_api_key(oss_conn.secret_key)
        uploader = OSSClient(
            endpoint_url=oss_conn.endpoint,
            access_key=ak,
            secret_key=sk,
            region=oss_conn.region
        )
        # 直接用数据库存储的key，不再拼接kb_id
        oss_key = doc.filepath.replace(f'oss://{doc.oss_bucket}/', '')
        response = uploader.s3.get_object(Bucket=doc.oss_bucket, Key=oss_key)
        oss_filename = os.path.basename(oss_key)
        content_disposition = f'attachment; filename="{oss_filename}"'
        return StreamingResponse(response['Body'], media_type='application/octet-stream', headers={
            'Content-Disposition': content_disposition
        })
    else:
        return FileResponse(path=doc.filepath, filename=doc.filename, media_type='application/octet-stream')

@router.post("/{doc_id}/parse_progress")
def update_document_parse_progress(
    doc_id: int,
    parse_offset: int = Body(..., embed=True),
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    if status not in [
        DocumentStatus.NOT_STARTED,
        DocumentStatus.PENDING,
        DocumentStatus.PROCESSING,
        DocumentStatus.PROCESSED,
        DocumentStatus.FAILED,
        DocumentStatus.PAUSED,
    ]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.parse_offset = parse_offset
    doc.status = status
    db.commit()
    return {"id": doc.id, "parse_offset": doc.parse_offset, "status": doc.status}

@router.post("/{doc_id}/terminate", response_model=BaseResponse)
def terminate_document_parse_task(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    filename = doc.filepath  # oss文件名
    try:
        result = celery_app.send_task('backend.worker.tasks.terminate_task', args=[filename])
        return BaseResponse(code=200, data={'task_id': result.id, 'filename': filename}, message="终止请求已发送")
    except Exception as e:
        return BaseResponse(code=500, message=f"终止任务失败: {e}")

class TeamAddUserRequest(BaseModel):
    team_id: int
    user_id: int 