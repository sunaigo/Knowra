from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.user import UserCreate, UserLogin, UserOut, TeamMemberOut
from app.schemas.token import Token
from app.services.user_service import create_user, authenticate_user, get_user_by_username, assign_role_to_user, user_has_permission
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import timedelta, datetime
from app.schemas.response import BaseResponse
from app.core.deps import get_db, get_current_user
from app.db.models import User, Team, user_team
from typing import List

SECRET_KEY = "knowra-secret-key"  # 实际项目请用更安全的方式存储
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

router = APIRouter(prefix="/user", tags=["user"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=BaseResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        return {"code": 400, "data": None, "message": "用户名已存在"}
    user = create_user(db, user_in)
    user_out = UserOut.model_validate(user).model_dump()
    return {"code": 200, "data": user_out, "message": "success"}

@router.post("/login", response_model=BaseResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        return {"code": 401, "data": None, "message": "用户名或密码错误"}
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user.username, "exp": datetime.utcnow() + access_token_expires}
    access_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"code": 200, "data": {"access_token": access_token, "token_type": "bearer"}, "message": "success"}

@router.post("/assign-role")
def assign_role(user_id: int, role_name: str, db: Session = Depends(get_db)):
    """为用户分配角色"""
    user_role = assign_role_to_user(db, user_id, role_name)
    return {"code": 200, "data": {"user_id": user_id, "role": role_name}, "message": "success"}

@router.get("/check-permission")
def check_permission(user_id: int, permission: str, db: Session = Depends(get_db)):
    """检查用户是否有某权限"""
    has_perm = user_has_permission(db, user_id, permission)
    return {"code": 200, "data": {"user_id": user_id, "permission": permission, "has_permission": has_perm}, "message": "success"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/teams", response_model=List[TeamMemberOut])
def get_my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sql = db.execute(
        """
        SELECT t.id, t.name, ut.role
        FROM teams t
        JOIN user_team ut ON t.id = ut.team_id
        WHERE ut.user_id = :uid
        """, {"uid": current_user.id}
    )
    teams = [dict(row) for row in sql]
    return [TeamMemberOut(id=row["id"], username=row["name"], role=row["role"]) for row in teams]

@router.get("/search")
def search_users(keyword: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.username.contains(keyword)).limit(20).all()
    return {"code": 200, "data": [{"id": u.id, "username": u.username, "email": u.email} for u in users], "message": "success"} 