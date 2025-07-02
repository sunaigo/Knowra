from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from common.db.session import SessionLocal
from common.schemas.user import UserCreate, UserLogin, UserOut
from common.schemas.token import Token
from webapi.services.user_service import create_user, authenticate_user, get_user_by_username, assign_role_to_user, user_has_permission
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import timedelta, datetime
from common.schemas.response import BaseResponse
from common.core.deps import get_db, get_current_user
from common.core.config import config
from common.db.models import User, UserTeam
from common.schemas.team import TeamWithRole
from typing import List
from math import ceil

SECRET_KEY = config.jwt['secret_key']
ALGORITHM = config.jwt['algorithm']
ACCESS_TOKEN_EXPIRE_MINUTES = config.jwt['access_token_expire_minutes']

router = APIRouter(prefix="/users", tags=["user"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=BaseResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        return BaseResponse(code=400, data=None, message="用户名已存在")
    user = create_user(db, user_in)
    user_out = UserOut.model_validate(user).model_dump()
    return BaseResponse(code=200, data=user_out, message="success")

@router.post("/login", response_model=BaseResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        return BaseResponse(code=401, data=None, message="用户名或密码错误")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user.username, "exp": datetime.utcnow() + access_token_expires}
    access_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return BaseResponse(code=200, data={"access_token": access_token, "token_type": "bearer"}, message="success")

@router.get("", response_model=BaseResponse)
def get_users(db: Session = Depends(get_db), page: int = Query(1, gt=0), limit: int = Query(10, gt=0)):
    total = db.query(User).count()
    users = db.query(User).offset((page - 1) * limit).limit(limit).all()
    users_out = [UserOut.model_validate(user).model_dump() for user in users]
    
    return BaseResponse(code=200, data={
        "data": users_out,
        "total": total,
        "page": page,
        "limit": limit,
        "page_count": ceil(total / limit)
    }, message="success")

@router.get("/me", response_model=BaseResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from common.schemas.user import UserOut
    from common.schemas.team import TeamWithRole
    # 查询用户所在团队及成员数量
    associations = db.query(UserTeam).filter(UserTeam.user_id == current_user.id).all()
    teams_with_role = []
    for assoc in associations:
        member_count = db.query(UserTeam).filter(UserTeam.team_id == assoc.team.id).count()
        team_data = TeamWithRole(
            id=assoc.team.id,
            name=assoc.team.name,
            description=assoc.team.description,
            icon_name=assoc.team.icon_name,
            created_at=assoc.team.created_at,
            role=assoc.role,
            member_count=member_count
        )
        teams_with_role.append(team_data)
    user_out = UserOut.model_validate(current_user).model_dump()
    user_out["teams"] = [team.model_dump() for team in teams_with_role]
    return BaseResponse(code=200, data=user_out, message="success")

@router.get("/me/teams", response_model=BaseResponse)
def get_my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    associations = db.query(UserTeam).filter(UserTeam.user_id == current_user.id).all()
    teams_with_role = []
    for assoc in associations:
        member_count = db.query(UserTeam).filter(UserTeam.team_id == assoc.team.id).count()
        team_data = TeamWithRole(
            id=assoc.team.id,
            name=assoc.team.name,
            description=assoc.team.description,
            icon_name=assoc.team.icon_name,
            created_at=assoc.team.created_at,
            role=assoc.role,
            member_count=member_count
        )
        teams_with_role.append(team_data)
    return BaseResponse(code=200, data=teams_with_role, message="success")

@router.get("/search")
def search_users(keyword: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.username.contains(keyword)).limit(20).all()
    users_out = [UserOut.model_validate(user).model_dump() for user in users]
    return BaseResponse(code=200, data=users_out, message="success")

@router.post("/assign-role")
def assign_role(user_id: int, role_name: str, db: Session = Depends(get_db)):
    """为用户分配角色"""
    user_role = assign_role_to_user(db, user_id, role_name)
    return {"code": 200, "data": {"user_id": user_id, "role": role_name}, "message": "success"}

@router.get("/check-permission")
def check_permission(user_id: int, permission: str, db: Session = Depends(get_db)):
    """检查用户是否有某权限"""
    has_perm = user_has_permission(db, user_id, permission)
    return BaseResponse(code=200, data={"user_id": user_id, "permission": permission, "has_permission": has_perm}, message="success") 