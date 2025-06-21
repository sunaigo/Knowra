from sqlalchemy.orm import Session
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password
from loguru import logger
from app.db.models import User, UserRole, Role, Permission, UserRoleConst, PermissionConst
from typing import Optional

# 创建用户
def create_user(db: Session, user_in: UserCreate):
    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info(f"[create_user] username={user_in.username}, hashed_password={hashed_password}")
    return db_user

# 通过用户名查找用户
def get_user_by_username(db: Session, username: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    logger.info(f"[get_user_by_username] username={username}, user_found={user is not None}")
    return user

# 用户认证
def authenticate_user(db: Session, username: str, password: str):
    logger.info(f"[authenticate_user] username={username}, password={password}")
    user = get_user_by_username(db, username)
    if not user:
        logger.warning(f"[authenticate_user] 用户不存在: {username}")
        return None
    logger.info(f"[authenticate_user] user.id={user.id}, hashed_password={user.hashed_password}")
    try:
        result = verify_password(password, user.hashed_password)
        logger.info(f"[authenticate_user] verify_password result={result}")
    except Exception as e:
        logger.exception(f"[authenticate_user] verify_password error: {e}")
        return None
    if not result:
        logger.warning(f"[authenticate_user] 密码校验失败: {username}")
        return None
    return user

def assign_role_to_user(db: Session, user_id: int, role_name: str):
    """为用户分配角色"""
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        db.commit()
        db.refresh(role)
    user_role = UserRole(user_id=user_id, role_id=role.id)
    db.add(user_role)
    db.commit()
    logger.info(f"[assign_role_to_user] user_id={user_id}, role={role_name}")
    return user_role

def user_has_permission(db: Session, user_id: int, permission_name: str) -> bool:
    """判断用户是否拥有某权限"""
    roles = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == user_id).all()
    for role in roles:
        perms = db.query(Permission).join('role_permissions').filter_by(role_id=role.id).all()
        if any(p.name == permission_name for p in perms):
            return True
    return False 