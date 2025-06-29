from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseOut
from app.services.knowledge_base_service import create_kb, get_kbs, get_kb, update_kb, delete_kb
from app.api.user import get_db
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.db import models
from app.schemas.user import UserOut
from app.schemas.token import TokenData
from typing import List, Any
from app.db.models import Document
from datetime import datetime
from fastapi.responses import PlainTextResponse, JSONResponse
from app.langchain_utils.text_splitter import split_text
from app.langchain_utils.vector_store import add_texts_to_chroma, get_chroma_collection
from app.core.config import config
from app.schemas.response import BaseResponse
from app.core.deps import get_db, get_current_user

SECRET_KEY = config.jwt['secret_key']
ALGORITHM = config.jwt['algorithm']
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/login")

router = APIRouter(prefix="/kb", tags=["knowledge_base"])

@router.post("/", response_model=BaseResponse)
def create_knowledge_base(kb_in: KnowledgeBaseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 校验 collection_id 必须存在且有效
    if not kb_in.collection_id or kb_in.collection_id <= 0:
        return BaseResponse(code=400, data=None, message="必须选择并绑定一个 Collection")
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
        return BaseResponse(code=400, data=None, message="必须选择并绑定一个 Collection")
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