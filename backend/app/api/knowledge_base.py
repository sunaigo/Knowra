from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.knowledge_base import KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseOut
from app.services.knowledge_base_service import create_kb, get_kbs, get_kb, update_kb, delete_kb, assign_kb_to_team, add_user_to_team, get_team_members
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
    kb = create_kb(db, kb_in, owner_id=current_user.id)
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    return {"code": 200, "data": kb_out, "message": "success"}

@router.get("/", response_model=BaseResponse)
def list_knowledge_bases(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        kbs = get_kbs(db, skip=skip, limit=limit)
        data = [KnowledgeBaseOut.model_validate(kb).model_dump() for kb in kbs]
        return {"code": 200, "data": data, "message": "success"}
    except Exception as e:
        return {"code": 500, "data": None, "message": str(e)}

@router.get("/{kb_id}", response_model=BaseResponse)
def get_knowledge_base(kb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    kb = get_kb(db, kb_id)
    if not kb:
        return {"code": 404, "data": None, "message": "知识库不存在"}
    doc_count = db.query(Document).filter(Document.kb_id == kb_id).count()
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    kb_out['doc_count'] = doc_count
    return {"code": 200, "data": kb_out, "message": "success"}

@router.put("/{kb_id}", response_model=BaseResponse)
def update_knowledge_base(kb_id: int, kb_in: KnowledgeBaseUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    kb = update_kb(db, kb_id, kb_in)
    if not kb:
        return {"code": 404, "data": None, "message": "知识库不存在"}
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    return {"code": 200, "data": kb_out, "message": "success"}

@router.delete("/{kb_id}", response_model=BaseResponse)
def delete_knowledge_base(kb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    kb = delete_kb(db, kb_id)
    if not kb:
        return {"code": 404, "data": None, "message": "知识库不存在"}
    kb_out = KnowledgeBaseOut.model_validate(kb).model_dump()
    return {"code": 200, "data": kb_out, "message": "success"}

@router.post("/{kb_id}/assign-team")
def assign_team(kb_id: int, team_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """将知识库分配给团队"""
    ok = assign_kb_to_team(db, kb_id, team_id)
    return {"code": 200 if ok else 400, "data": None, "message": "success" if ok else "分配失败"}

@router.post("/team/{team_id}/add-user")
def add_team_user(team_id: int, user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """将用户加入团队"""
    ok = add_user_to_team(db, user_id, team_id)
    return {"code": 200 if ok else 400, "data": None, "message": "success" if ok else "添加失败"}

@router.get("/team/{team_id}/members")
def team_members(team_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """获取团队成员列表"""
    members = get_team_members(db, team_id)
    data = [{"id": u.id, "username": u.username, "email": u.email} for u in members]
    return {"code": 200, "data": data, "message": "success"} 