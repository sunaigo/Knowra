from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.deps import get_db, get_current_user
from app.db.models import Team, User, user_team
from app.schemas.user import TeamMemberOut
from app.schemas.response import BaseResponse, TeamMemberListResponse
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/teams", tags=["team"])

class InviteMemberBody(BaseModel):
    username: str
    role: str = 'member'

class RemoveMemberBody(BaseModel):
    user_id: int

@router.post("", response_model=BaseResponse)
def create_team(
    name: str = Body(..., min_length=1, description="团队名称"),
    description: Optional[str] = Body('', description="团队描述"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not name.strip():
        raise HTTPException(400, "团队名称不能为空")
    if db.query(Team).filter(Team.name == name).first():
        raise HTTPException(400, "团队名已存在")
    team = Team(name=name, description=description)
    db.add(team)
    db.commit()
    db.execute(user_team.insert().values(user_id=current_user.id, team_id=team.id, role='owner'))
    db.commit()
    return {"code": 200, "data": {"id": team.id, "name": team.name, "description": team.description}, "message": "success"}

@router.get("/my", response_model=BaseResponse)
def get_my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sql = db.execute(
        text("""
        SELECT DISTINCT t.id, t.name, t.description, ut.role,
            (SELECT COUNT(*) FROM user_team ut2 WHERE ut2.team_id = t.id) as member_count
        FROM teams t
        JOIN user_team ut ON t.id = ut.team_id
        WHERE ut.user_id = :uid
        """), {"uid": current_user.id}
    )
    teams = [dict(row._mapping) for row in sql]
    return {"code": 200, "data": teams, "message": "success"}

@router.post("/{team_id}/invite", response_model=BaseResponse)
def invite_member(team_id: int, body: InviteMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    username = body.username
    role = body.role
    # 只有owner/admin可邀请
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == user.id))).first():
        raise HTTPException(400, "用户已在团队中")
    db.execute(user_team.insert().values(user_id=user.id, team_id=team_id, role=role))
    db.commit()
    return {"code": 200, "message": "邀请成功"}

@router.post("/{team_id}/remove", response_model=BaseResponse)
def remove_member(team_id: int, body: RemoveMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = body.user_id
    # 只有owner/admin可移除，且owner不能移除自己
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    # 禁止owner移除自己
    if user_id == current_user.id and role_row.role == 'owner':
        raise HTTPException(400, "拥有者不能移除自己")
    db.execute(user_team.delete().where((user_team.c.team_id == team_id) & (user_team.c.user_id == user_id)))
    db.commit()
    return {"code": 200, "message": "移除成功"}

@router.post("/{team_id}/set_role", response_model=BaseResponse)
def set_member_role(team_id: int, user_id: int = Body(...), role: str = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 只有owner可设置角色
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role != 'owner':
        raise HTTPException(403, "无权限")
    db.execute(user_team.update().where((user_team.c.team_id == team_id) & (user_team.c.user_id == user_id)).values(role=role))
    db.commit()
    return {"code": 200, "message": "角色设置成功"}

@router.get("/{team_id}/members", response_model=TeamMemberListResponse)
def get_team_members(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sql = db.execute(
        text("""
        SELECT u.id, u.username, u.email, ut.role
        FROM users u
        JOIN user_team ut ON u.id = ut.user_id
        WHERE ut.team_id = :tid
        """), {"tid": team_id}
    )
    members = [dict(row._mapping) for row in sql]
    return {"code": 200, "data": [TeamMemberOut(**m) for m in members], "message": "success"}

@router.post("/{team_id}/delete", response_model=BaseResponse)
def delete_team(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 只有owner且团队只有1人时可删除
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role != 'owner':
        raise HTTPException(403, "无权限")
    member_count = db.execute(user_team.select().where(user_team.c.team_id == team_id)).fetchall()
    if len(member_count) > 1:
        raise HTTPException(400, "团队成员不止拥有者，无法删除")
    db.query(Team).filter(Team.id == team_id).delete()
    db.commit()
    return {"code": 200, "message": "删除成功"} 