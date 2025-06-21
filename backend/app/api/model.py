from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Any
from app.db.session import SessionLocal
from app.schemas.model import ModelCreate, ModelUpdate, ModelOut
from app.schemas.response import BaseResponse, ListResponse
from app.services.model_service import (
    create_model, get_models, get_model,
    update_model, delete_model, set_default_model,
    test_model, import_models, export_models
)
from app.core.deps import get_db, get_current_user
from types import SimpleNamespace

router = APIRouter(prefix="/models", tags=["model"])

@router.post("", response_model=BaseResponse)
def create(model_in: ModelCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    # 自动设置维护人ID为当前用户
    # 兼容历史 type 字段
    data = model_in.dict()
    if 'provider' not in data and 'type' in data:
        data['provider'] = data['type']
    model = create_model(db, {**data, 'maintainer_id': current_user.id})
    return {"code": 200, "data": ModelOut.model_validate(model).model_dump(), "message": "success"}

@router.get("/", response_model=ListResponse[ModelOut])
def list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    models = get_models(db, skip=skip, limit=limit)
    return {"code": 200, "data": [ModelOut.model_validate(m).model_dump() for m in models], "message": "success"}

@router.get("/{model_id}", response_model=BaseResponse)
def get(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    return {"code": 200, "data": ModelOut.model_validate(model).model_dump(), "message": "success"}

@router.put("/{model_id}", response_model=BaseResponse)
def update(model_id: int, model_in: ModelUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    data = model_in.dict(exclude_unset=True)
    if 'provider' not in data and 'type' in data:
        data['provider'] = data['type']
    model = update_model(db, model_id, ModelUpdate(**data))
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    return {"code": 200, "data": ModelOut.model_validate(model).model_dump(), "message": "success"}

@router.delete("/{model_id}", response_model=BaseResponse)
def delete(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    ok = delete_model(db, model_id)
    if not ok:
        raise HTTPException(status_code=404, detail="模型不存在")
    return {"code": 200, "data": None, "message": "删除成功"}

@router.post("/{model_id}/set-default", response_model=BaseResponse)
def set_default(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    ok = set_default_model(db, model_id)
    if not ok:
        raise HTTPException(status_code=404, detail="模型不存在")
    return {"code": 200, "data": None, "message": "已设为默认"}

@router.post("/{model_id}/test", response_model=BaseResponse)
def test(model_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    ok = test_model(model)
    return {"code": 200, "data": ok, "message": "测试成功" if ok else "测试失败"}

@router.post("/import", response_model=BaseResponse)
def import_(models: List[ModelCreate], db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    # 兼容历史 type 字段
    for m in models:
        d = m.dict()
        if 'provider' not in d and 'type' in d:
            d['provider'] = d['type']
    count = import_models(db, [m.dict() for m in models])
    return {"code": 200, "data": count, "message": f"导入{count}个模型"}

@router.get("/export", response_model=BaseResponse)
def export(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    data = export_models(db)
    return {"code": 200, "data": data, "message": "success"}

@router.post("/test", response_model=BaseResponse)
def test_by_params(model_in: ModelCreate):
    # 用 SimpleNamespace 动态构造参数对象，兼容所有 schema 字段
    data = model_in.dict()
    if 'provider' not in data and 'type' in data:
        data['provider'] = data['type']
    from types import SimpleNamespace
    model = SimpleNamespace(**data)
    ok = test_model(model)
    return {"code": 200, "data": ok, "message": "测试成功" if ok else "测试失败"} 