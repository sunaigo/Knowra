from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from app.core.deps import get_db
from app.schemas.oss_connection import OSSConnectionCreate, OSSConnectionUpdate, OSSConnectionOut, OSSConnectionTest, ShareOSSConnectionIn
from app.services.oss_connection_service import (
    create_oss_connection, get_oss_connections, get_oss_connection,
    update_oss_connection, delete_oss_connection, test_oss_connection,
    get_buckets_by_connection, share_oss_connection, get_shared_buckets, revoke_oss_share
)
from typing import List
from app.schemas.response import BaseResponse
from datetime import datetime
from app.db.models import OSSConnection, OSSConnectionShare, Team

router = APIRouter(prefix="/oss-connection", tags=["OSS Connection"])

@router.post("/", response_model=BaseResponse)
def create(conn_in: OSSConnectionCreate, db: Session = Depends(get_db)):
    conn = create_oss_connection(db, conn_in)
    return BaseResponse(data=OSSConnectionOut.model_validate(conn, from_attributes=True))

@router.get("", response_model=BaseResponse)
def list(team_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    all_teams = {t.id: t.name for t in db.query(Team).all()}
    data = get_oss_connections(db, team_id, skip, limit)
    result = []
    for item in data:
        d = OSSConnectionOut.model_validate(item, from_attributes=True).dict()
        d["shared_team_ids"] = [s.team_id for s in getattr(item, "shares", []) if s.status == 'active']
        d["team_name"] = all_teams.get(item.team_id, str(item.team_id))
        result.append(d)
    return BaseResponse(data=result)

@router.put("/{conn_id}", response_model=BaseResponse)
def update(conn_id: int, conn_in: OSSConnectionUpdate, db: Session = Depends(get_db)):
    conn = update_oss_connection(db, conn_id, conn_in)
    if not conn:
        return BaseResponse(code=404, message="OSS连接不存在")
    return BaseResponse(data=OSSConnectionOut.model_validate(conn, from_attributes=True))

@router.delete("/{conn_id}", response_model=BaseResponse)
def delete(conn_id: int, db: Session = Depends(get_db)):
    ok = delete_oss_connection(db, conn_id)
    if not ok:
        return BaseResponse(code=404, message="OSS连接不存在")
    return BaseResponse(message="删除成功")

@router.post("/test", response_model=BaseResponse)
def test(conn: OSSConnectionTest = Body(...)):
    try:
        ok, msg = test_oss_connection(
            endpoint=conn.endpoint,
            access_key=conn.access_key.get_secret_value(),
            secret_key=conn.secret_key.get_secret_value(),
            region=conn.region
        )
        if ok:
            return BaseResponse(code=0, message="连接成功")
        else:
            return BaseResponse(code=1, message=msg)
    except Exception:
        return BaseResponse(code=1, message="连接失败")

@router.get("/{conn_id}/buckets", response_model=BaseResponse)
def list_buckets(conn_id: int, db: Session = Depends(get_db)):
    try:
        buckets = get_buckets_by_connection(db, conn_id)
        shared_buckets = [s.bucket for s in db.query(OSSConnectionShare).filter_by(oss_connection_id=conn_id, status='active').all() if s.bucket]
        revoked_buckets = [s.bucket for s in db.query(OSSConnectionShare).filter_by(oss_connection_id=conn_id, status='revoked').all() if s.bucket]
        shares = db.query(OSSConnectionShare).filter_by(oss_connection_id=conn_id, status='active').all()
        shared_teams_map = {}
        for s in shares:
            if s.bucket:
                shared_teams_map.setdefault(s.bucket, []).append(s.team_id)
        return BaseResponse(data={"buckets": buckets, "shared_buckets": shared_buckets, "revoked_buckets": revoked_buckets, "shared_teams_map": shared_teams_map})
    except Exception as e:
        return BaseResponse(code=1, message=str(e))

@router.get("/{id}", response_model=BaseResponse)
def get_oss_connection_detail(id: int, db: Session = Depends(get_db)):
    conn = db.query(OSSConnection).options(joinedload(OSSConnection.shares)).filter_by(id=id).first()
    if not conn:
        return BaseResponse(code=404, message="未找到该OSS连接")
    data = OSSConnectionOut.model_validate(conn, from_attributes=True).dict()
    data["shared_team_ids"] = [s.team_id for s in getattr(conn, "shares", []) if s.status == 'active']
    return BaseResponse(code=200, data=data, message="success")

@router.post("/{id}/share", response_model=BaseResponse)
def share_oss(id: int, share_in: ShareOSSConnectionIn, db: Session = Depends(get_db)):
    share_oss_connection(db, id, share_in)
    return BaseResponse(code=200, message="分享成功")

@router.get("/{id}/buckets", response_model=BaseResponse)
def get_buckets(id: int, team_id: int, db: Session = Depends(get_db)):
    conn = db.query(OSSConnection).filter_by(id=id).first()
    if not conn:
        return BaseResponse(code=404, message="未找到该OSS连接")
    # owner 团队返回全部 bucket
    if conn.team_id == team_id:
        buckets = get_buckets_by_connection(db, id)
    else:
        buckets = get_shared_buckets(db, id, team_id)
    return BaseResponse(code=200, data=buckets)

@router.post("/{id}/revoke", response_model=BaseResponse)
def revoke_share(id: int, team_id: int, bucket: str = None, db: Session = Depends(get_db)):
    revoke_oss_share(db, id, team_id, bucket)
    return BaseResponse(code=200, message="撤销成功") 