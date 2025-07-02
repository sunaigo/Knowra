from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Any
from common.schemas.model import ModelCreate, ModelUpdate, ModelOut
from common.schemas.response import BaseResponse, ListResponse
from webapi.services import model_service
from common.core.deps import get_db, get_current_user

router = APIRouter(prefix="/models", tags=["model"])

@router.post("", response_model=BaseResponse[ModelOut])
def create(model_in: ModelCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    try:
        model = model_service.create_model(db, model_in, current_user.id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="模型名称已存在，请使用其他名称"
        )
    return BaseResponse(data=ModelOut.model_validate(model))

@router.get("", response_model=ListResponse[ModelOut])
def list(skip: int = 0, limit: int = 100, model_type: str = None, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    models = model_service.get_models(db, skip=skip, limit=limit, model_type=model_type)
    return ListResponse(data=[ModelOut.model_validate(m) for m in models])

@router.get("/{model_id}", response_model=BaseResponse[ModelOut])
def get(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    model = model_service.get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    return BaseResponse(data=ModelOut.model_validate(model))

@router.put("/{model_id}", response_model=BaseResponse[ModelOut])
def update(model_id: int, model_in: ModelUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    model = model_service.update_model(db, model_id, model_in)
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    return BaseResponse(data=ModelOut.model_validate(model))

@router.delete("/{model_id}", response_model=BaseResponse)
def delete(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    ok = model_service.delete_model(db, model_id)
    if not ok:
        raise HTTPException(status_code=404, detail="模型不存在")
    return BaseResponse(message="删除成功")

@router.post("/{model_id}/set-default", response_model=BaseResponse)
def set_default(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    ok = model_service.set_default_model(db, model_id)
    if not ok:
        raise HTTPException(status_code=404, detail="模型不存在")
    return BaseResponse(message="已设为默认") 