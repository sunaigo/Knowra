from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from common.db.session import SessionLocal
from common.db import models
from common.core.config import config
from common.db.models import User, Team, UserTeam, SvgIcon, Connection, Model, KnowledgeBase, VDB
from fastapi import Path

SECRET_KEY = config.jwt['secret_key']
ALGORITHM = config.jwt['algorithm']
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user 

def get_current_active_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user

def get_vdb_or_404(
    vdb_id: int = Path(..., description="向量数据库ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> VDB:
    """
    获取向量数据库实例，如果不存在或无权限则抛出404/403异常
    """
    vdb = db.query(VDB).filter(VDB.id == vdb_id).first()
    if not vdb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="向量数据库不存在")

    # 超级管理员直接放行
    if current_user.is_superuser:
        vdb.current_user_role = 'admin'  # 赋予超管admin角色权限
        return vdb

    # 检查用户是否属于该VDB的团队
    user_team_link = db.query(UserTeam).filter_by(
        user_id=current_user.id,
        team_id=vdb.team_id
    ).first()

    if not user_team_link:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该向量数据库")

    # 将用户在团队的角色附加到vdb对象上，方便后续使用
    vdb.current_user_role = user_team_link.role
    return vdb 