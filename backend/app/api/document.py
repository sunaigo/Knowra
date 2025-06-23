from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form, Body
import os
import json
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.models import Document, DocumentStatus
from app.core.deps import get_db, get_current_user
from app.core.config import config
from app.langchain_utils.vector_store import get_chroma_collection, get_embedding_model
from app.schemas.response import BaseResponse
from app.schemas.knowledge_base import DocumentUpdate
from typing import Any, Optional, List
from app.services.document_service import (
    create_document, 
    get_documents, 
    get_document as get_document_service, 
    delete_document as delete_document_service, 
    update_document as update_document_service
)
from app.core.file_queue import add_file_to_queue
from pydantic import BaseModel
from fastapi.responses import FileResponse
from app.services.knowledge_base_service import get_kb
from loguru import logger

router = APIRouter(prefix="/kb", tags=["document"])

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

    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), config.upload['dir'])
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    save_name = f"kb{kb_id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    save_path = os.path.join(upload_dir, save_name)
    with open(save_path, "wb") as f:
        f.write(file.file.read())

    doc_status = 'pending' if kb.auto_process_on_upload else 'not_started'
    
    config_dict = None
    if parsing_config:
        try:
            config_dict = json.loads(parsing_config)
        except json.JSONDecodeError:
            return BaseResponse(code=400, message="Invalid JSON in parsing_config")

    doc = create_document(
        db, kb_id, file.filename, file_ext[1:].lower() if file_ext else '',
        save_path, current_user.id, parsing_config=config_dict, status=doc_status
    )
    
    if doc.status == 'pending':
        add_file_to_queue(doc.id)
    
    return BaseResponse(code=200, data={"id": doc.id, "filename": doc.filename, "status": doc.status})

@router.get("/{kb_id}/documents", response_model=BaseResponse)
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

@router.delete("/documents/{doc_id}", response_model=BaseResponse)
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    try:
        if doc.filepath and os.path.exists(doc.filepath):
            os.remove(doc.filepath)
        embedder = get_embedding_model()
        db_chroma = get_chroma_collection(f"kb_{doc.kb_id}", embedder)
        db_chroma.delete(where={"doc_id": doc.id})
    except Exception as e:
        logger.warning(f"[Delete] 文件或向量库数据删除失败: {e}")

    delete_document_service(db, doc)
    return BaseResponse(code=200, message="删除成功")

@router.get("/documents/{doc_id}", response_model=BaseResponse)
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

@router.put("/documents/{doc_id}", response_model=BaseResponse)
def update_document_params(doc_id: int, params: DocumentUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    
    update_data = params.dict(exclude_unset=True)
    if not update_data:
        return BaseResponse(code=400, message="没有提供任何更新内容")

    updated_doc = update_document_service(db, doc, data=update_data)
    
    return BaseResponse(code=200, data={"id": updated_doc.id, "parsing_config": updated_doc.parsing_config})

@router.post("/documents/{doc_id}/process", response_model=BaseResponse)
def process_document(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc:
        return BaseResponse(code=404, message="文档不存在")
    
    # 将文档加入后台处理队列
    add_file_to_queue(doc.id)
    
    return BaseResponse(code=200, message="已将文档加入处理队列")

@router.get("/documents/{doc_id}/preview")
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
        with open(doc.filepath, 'r', encoding='utf-8') as f:
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

@router.get("/documents/{doc_id}/chunks")
def list_document_chunks(doc_id: int, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), full_text: bool = Query(False), db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return BaseResponse(code=404, message="Document not found")

    embedder = get_embedding_model()
    db_chroma = get_chroma_collection(f"kb_{doc.kb_id}", embedder)
    
    all_chunks_result = db_chroma.get(where={"doc_id": doc_id}, include=["metadatas", "documents"])
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

@router.get("/documents/{doc_id}/download")
def download_document_file(doc_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    doc = get_document_service(db, doc_id)
    if not doc or not doc.filepath or not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="文件不存在或已丢失")
    return FileResponse(path=doc.filepath, filename=doc.filename, media_type='application/octet-stream')

class TeamAddUserRequest(BaseModel):
    team_id: int
    user_id: int 