from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.deps import get_db, get_current_user
from app.db.models import Team, User, user_team
from app.schemas.user import TeamMemberOut
from app.schemas.response import BaseResponse, ListResponse
from app.schemas.team import TeamCreate, TeamUpdate, TeamOut, TeamWithRole, TeamDetail
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/teams", tags=["team"])

class InviteMemberBody(BaseModel):
    username: str
    role: str = 'member'

class RemoveMemberBody(BaseModel):
    user_id: int

class SetRoleBody(BaseModel):
    user_id: int
    role: str

@router.post("", response_model=BaseResponse[TeamOut])
def create_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not team_in.name.strip():
        raise HTTPException(400, "团队名称不能为空")
    if db.query(Team).filter(Team.name == team_in.name).first():
        raise HTTPException(400, "团队名已存在")
    
    team = Team(name=team_in.name, description=team_in.description)
    db.add(team)
    db.commit()
    db.refresh(team)
    
    # 将创建者设为owner
    db.execute(user_team.insert().values(user_id=current_user.id, team_id=team.id, role='owner'))
    db.commit()
    
    return BaseResponse(data=TeamOut.model_validate(team))

@router.get("", response_model=ListResponse[TeamOut])
def list_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有团队列表（管理员功能）"""
    teams = db.query(Team).offset(skip).limit(limit).all()
    teams_data = [TeamOut.model_validate(team) for team in teams]
    return ListResponse(data=teams_data)

@router.get("/my", response_model=ListResponse[TeamWithRole])
def get_my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sql = db.execute(
        text("""
        SELECT DISTINCT t.id, t.name, t.description, t.created_at, ut.role,
            (SELECT COUNT(*) FROM user_team ut2 WHERE ut2.team_id = t.id) as member_count
        FROM teams t
        JOIN user_team ut ON t.id = ut.team_id
        WHERE ut.user_id = :uid
        """), {"uid": current_user.id}
    )
    teams = [dict(row._mapping) for row in sql]
    teams_data = [TeamWithRole(**team) for team in teams]
    return ListResponse(data=teams_data)

@router.get("/{team_id}", response_model=BaseResponse[TeamDetail])
def get_team(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "团队不存在")
    
    # 获取成员数量
    member_count = db.execute(
        text("SELECT COUNT(*) as count FROM user_team WHERE team_id = :tid"),
        {"tid": team_id}
    ).scalar()
    
    team_dict = TeamOut.model_validate(team).model_dump()
    team_dict['member_count'] = member_count
    
    return BaseResponse(data=TeamDetail(**team_dict))

@router.put("/{team_id}", response_model=BaseResponse[TeamOut])
def update_team(
    team_id: int, 
    team_in: TeamUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 检查权限：只有owner/admin可以编辑
    role_row = db.execute(
        user_team.select().where(
            (user_team.c.team_id == team_id) & 
            (user_team.c.user_id == current_user.id)
        )
    ).first()
    
    if not role_row or role_row.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "团队不存在")
    
    # 检查团队名是否重复（排除自己）
    if team_in.name != team.name:
        existing_team = db.query(Team).filter(
            Team.name == team_in.name, 
            Team.id != team_id
        ).first()
        if existing_team:
            raise HTTPException(400, "团队名已存在")
    
    team.name = team_in.name
    team.description = team_in.description
    db.commit()
    db.refresh(team)
    
    return BaseResponse(data=TeamOut.model_validate(team))

@router.post("/{team_id}/invite", response_model=BaseResponse)
def invite_member(team_id: int, body: InviteMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 只有owner/admin可邀请
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    
    if db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == user.id))).first():
        raise HTTPException(400, "用户已在团队中")
    
    db.execute(user_team.insert().values(user_id=user.id, team_id=team_id, role=body.role))
    db.commit()
    
    return BaseResponse(message="邀请成功")

@router.post("/{team_id}/remove", response_model=BaseResponse)
def remove_member(team_id: int, body: RemoveMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 只有owner/admin可移除，且owner不能移除自己
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    # 禁止owner移除自己
    if body.user_id == current_user.id and role_row.role == 'owner':
        raise HTTPException(400, "拥有者不能移除自己")
    
    db.execute(user_team.delete().where((user_team.c.team_id == team_id) & (user_team.c.user_id == body.user_id)))
    db.commit()
    
    return BaseResponse(message="移除成功")

@router.post("/{team_id}/set_role", response_model=BaseResponse)
def set_member_role(team_id: int, body: SetRoleBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 只有owner可设置角色
    role_row = db.execute(user_team.select().where((user_team.c.team_id == team_id) & (user_team.c.user_id == current_user.id))).first()
    if not role_row or role_row.role != 'owner':
        raise HTTPException(403, "无权限")
    
    db.execute(
        user_team.update().where(
            (user_team.c.team_id == team_id) & 
            (user_team.c.user_id == body.user_id)
        ).values(role=body.role)
    )
    db.commit()
    
    return BaseResponse(message="角色设置成功")

@router.get("/{team_id}/members", response_model=ListResponse[TeamMemberOut])
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
    members_data = [TeamMemberOut(**m) for m in members]
    return ListResponse(data=members_data)

@router.delete("/{team_id}", response_model=BaseResponse)
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
    
    return BaseResponse(message="删除成功") 