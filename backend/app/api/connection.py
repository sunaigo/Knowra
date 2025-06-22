from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Any
from app.schemas.connection import ConnectionCreate, ConnectionUpdate, ConnectionOut, ConnectionTest
from app.schemas.response import BaseResponse, ListResponse
from app.services import connection_service
from app.core.deps import get_db, get_current_user
from app.db.models import User

router = APIRouter(prefix="/connections", tags=["connection"])

@router.post("", response_model=BaseResponse[ConnectionOut])
def create(conn_in: ConnectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        connection = connection_service.create_connection(db, conn_in, current_user.id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="连接名称已存在，请使用其他名称"
        )
    return BaseResponse(data=ConnectionOut.model_validate(connection))

@router.get("", response_model=ListResponse[ConnectionOut])
def list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    connections = connection_service.get_connections(db, skip=skip, limit=limit)
    return ListResponse(data=[ConnectionOut.model_validate(c) for c in connections])

@router.get("/{conn_id}", response_model=BaseResponse[ConnectionOut])
def get(conn_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    connection = connection_service.get_connection(db, conn_id)
    if not connection:
        raise HTTPException(status_code=404, detail="连接不存在")
    return BaseResponse(data=ConnectionOut.model_validate(connection))

@router.put("/{conn_id}", response_model=BaseResponse[ConnectionOut])
def update(conn_id: int, conn_in: ConnectionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    connection = connection_service.update_connection(db, conn_id, conn_in)
    if not connection:
        raise HTTPException(status_code=404, detail="连接不存在")
    return BaseResponse(data=ConnectionOut.model_validate(connection))

@router.delete("/{conn_id}", response_model=BaseResponse)
def delete(conn_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ok = connection_service.delete_connection(db, conn_id)
    if not ok:
        raise HTTPException(status_code=404, detail="连接不存在")
    return BaseResponse(data=None, message="删除成功")

@router.post("/test", response_model=BaseResponse)
def test_connection(
    connection_in: ConnectionTest,
):
    try:
        connection_service.test_connection(connection_in)
        return BaseResponse(message="Connection test successful")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection test failed: {e}")

@router.post("/{id}/test", response_model=BaseResponse)
def test_connection_by_id(
    id: int,
    db: Session = Depends(get_db),
    model_name: str = Query(None, description="The name of the model to test"),
):
    try:
        connection_service.test_connection_by_id(db, id, model_name)
        return BaseResponse(message="Connection test successful")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection test failed: {e}") 