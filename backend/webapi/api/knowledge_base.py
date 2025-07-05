from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from common.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseOut
from webapi.services.knowledge_base_service import create_kb, get_kbs, get_kb, update_kb, delete_kb
from webapi.api.user import get_db
from fastapi.security import OAuth2PasswordBearer
from common.db import models
from common.db.models import Document, OSSConnection
from common.core.config import config
from common.schemas.response import BaseResponse
from common.core.deps import get_db, get_current_user
from webapi.services.document_service import create_document, get_documents
from webapi.services.document_task_dispatcher import dispatch_document_parse_task
from common.utils.oss_client import OSSClient
from common.core.encryption import decrypt_api_key
from datetime import datetime
from typing import Optional, Any
import os
import json
from loguru import logger

SECRET_KEY = config.jwt['secret_key']
ALGORITHM = config.jwt['algorithm']
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/login")

router = APIRouter(prefix="/kb", tags=["knowledge_base"])

@router.post("/", response_model=BaseResponse)
def create_knowledge_base(kb_in: KnowledgeBaseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 校验 collection_id 必须存在且有效
    if not kb_in.collection_id or kb_in.collection_id <= 0:
        return BaseResponse(code=400, data=None, message="必须选择并绑定一个 VDBCollection")
    kb = create_kb(db, kb_in, owner_id=current_user.id)
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    return BaseResponse(code=200, data=kb_out, message="success")

@router.get("", response_model=BaseResponse)
def list_knowledge_bases(
    team_id: int = Query(None),
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    try:
        kbs = get_kbs(db, team_id=team_id, skip=skip, limit=limit)
        data = [KnowledgeBaseOut.model_validate(kb).model_dump() for kb in kbs]
        return BaseResponse(code=200, data=data, message="success")
    except Exception as e:
        return BaseResponse(code=500, data=None, message=str(e))

@router.get("/{kb_id}", response_model=BaseResponse)
def get_knowledge_base(kb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    kb = get_kb(db, kb_id)
    if not kb:
        return BaseResponse(code=404, data=None, message="知识库不存在")
    doc_count = db.query(Document).filter(Document.kb_id == kb_id).count()
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    kb_out['doc_count'] = doc_count
    return BaseResponse(code=200, data=kb_out, message="success")

@router.put("/{kb_id}", response_model=BaseResponse)
def update_knowledge_base(kb_id: int, kb_in: KnowledgeBaseUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 校验 collection_id（如果有传）
    if kb_in.collection_id is not None and kb_in.collection_id <= 0:
        return BaseResponse(code=400, data=None, message="必须选择并绑定一个 VDBCollection")
    kb = update_kb(db, kb_id, kb_in)
    if not kb:
        return BaseResponse(code=404, data=None, message="知识库不存在")
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    return BaseResponse(code=200, data=kb_out, message="success")

@router.delete("/{kb_id}", response_model=BaseResponse)
def delete_knowledge_base(kb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 校验知识库下是否还有文件
    doc_count = db.query(Document).filter(Document.kb_id == kb_id).count()
    if doc_count > 0:
        return BaseResponse(code=400, data=None, message="请先删除该知识库下所有文件后再删除知识库")
    kb = delete_kb(db, kb_id)
    if not kb:
        return BaseResponse(code=404, data=None, message="知识库不存在")
    return BaseResponse(code=200, data=None, message="知识库删除成功")

@router.post("/{kb_id}/upload", response_model=BaseResponse)
def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    parsing_config: Optional[str] = Form(None), # JSON string
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    上传文档到指定知识库
    """
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

    logger.info(f"文档上传成功: kb_id={kb_id}, doc_id={doc.id}, filename={file.filename}")
    
    return BaseResponse(code=200, data={
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "storage_type": storage_type,
        "file_url": file_url
    }, message="文档上传成功")

@router.get("/{kb_id}/documents", response_model=BaseResponse)
def list_documents(kb_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    """
    获取指定知识库下的文档列表
    """
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
    return BaseResponse(code=200, data=data, message="success") 