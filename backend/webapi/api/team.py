from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from common.core.deps import get_db, get_current_user
from common.db.models import Team, User, UserTeam, KnowledgeBase
from common.schemas.user import TeamMemberOut, UserOut
from common.schemas.response import BaseResponse, ListResponse
from common.schemas.team import TeamCreate, TeamUpdate, TeamOut, TeamWithRole, TeamDetail
from webapi.services import team_service, user_service
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
    
    existing_team = db.query(Team).filter(Team.name == team_in.name).first()
    if existing_team:
        raise HTTPException(400, "团队名已存在")
    
    team = team_service.create_team(db, name=team_in.name, description=team_in.description)
    
    team_service.add_user_to_team(db, user_id=current_user.id, team_id=team.id, role='owner')
    
    return BaseResponse(data=TeamOut.model_validate(team))

@router.get("", response_model=ListResponse[TeamOut])
def list_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取所有团队列表（管理员功能）"""
    teams = db.query(Team).offset(skip).limit(limit).all()
    teams_data = [TeamOut.model_validate(team) for team in teams]
    return ListResponse(data=teams_data)

@router.get("/my", response_model=ListResponse[TeamWithRole])
def get_my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    associations = db.query(UserTeam).filter(UserTeam.user_id == current_user.id).all()
    
    teams_data = []
    for assoc in associations:
        team_with_role = TeamWithRole(
            id=assoc.team.id,
            name=assoc.team.name,
            description=assoc.team.description,
            icon_name=assoc.team.icon_name,
            created_at=assoc.team.created_at,
            role=assoc.role,
            member_count=len(assoc.team.user_associations)
        )
        teams_data.append(team_with_role)
    
    return ListResponse(data=teams_data)

@router.get("/{team_id}", response_model=BaseResponse[TeamDetail])
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "团队不存在")
    
    member_count = len(team.user_associations)
    
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
    assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == current_user.id
    ).first()
    
    if not assoc or assoc.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "团队不存在")
    
    if team_in.name != team.name:
        existing_team = db.query(Team).filter(
            Team.name == team_in.name, 
            Team.id != team_id
        ).first()
        if existing_team:
            raise HTTPException(400, "团队名已存在")
    
    team.name = team_in.name
    team.description = team_in.description
    team.icon_name = team_in.icon_name
    db.commit()
    db.refresh(team)
    
    return BaseResponse(data=TeamOut.model_validate(team))

@router.post("/{team_id}/invite", response_model=BaseResponse)
def invite_member(team_id: int, body: InviteMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == current_user.id
    ).first()
    if not assoc or assoc.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    user_to_add = user_service.get_user_by_username(db, username=body.username)
    if not user_to_add:
        raise HTTPException(404, "用户不存在")
    
    existing_assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == user_to_add.id
    ).first()
    if existing_assoc:
        return BaseResponse(code=400, message="用户已在团队中")
    
    team_service.add_user_to_team(db, user_id=user_to_add.id, team_id=team_id, role=body.role)
    
    return BaseResponse(message="邀请成功")

@router.post("/{team_id}/remove", response_model=BaseResponse)
def remove_member(team_id: int, body: RemoveMemberBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == current_user.id
    ).first()
    if not assoc or assoc.role not in ('owner', 'admin'):
        raise HTTPException(403, "无权限")
    
    if body.user_id == current_user.id and assoc.role == 'owner':
        raise HTTPException(400, "拥有者不能移除自己")
    
    db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == body.user_id
    ).delete()
    db.commit()
    
    return BaseResponse(message="移除成功")

@router.post("/{team_id}/set_role", response_model=BaseResponse)
def set_member_role(team_id: int, body: SetRoleBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == current_user.id
    ).first()
    if not assoc or assoc.role != 'owner':
        raise HTTPException(403, "无权限")
    
    db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == body.user_id
    ).update({'role': body.role})
    db.commit()
    
    return BaseResponse(message="角色设置成功")

@router.get("/{team_id}/members", response_model=ListResponse[TeamMemberOut])
def get_team_members(team_id: int, db: Session = Depends(get_db)):
    associations = team_service.get_team_members(db, team_id=team_id)
    members_data = []
    for user in associations:
        assoc = db.query(UserTeam).filter(
            UserTeam.team_id == team_id,
            UserTeam.user_id == user.id
        ).first()
        member_data = TeamMemberOut(
            id=user.id,
            username=user.username,
            email=user.email,
            role=assoc.role if assoc else 'unknown'
        )
        members_data.append(member_data)
    return ListResponse(data=members_data)

@router.delete("/{team_id}", response_model=BaseResponse)
def delete_team(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assoc = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == current_user.id
    ).first()
    if not assoc or assoc.role != 'owner':
        raise HTTPException(403, "无权限")
    
    # 新增：校验团队下是否还有知识库
    kb_count = db.query(KnowledgeBase).filter(KnowledgeBase.team_id == team_id).count()
    if kb_count > 0:
        return BaseResponse(code=400, message="请先删除该团队下所有知识库后再删除团队")

    member_count = db.query(UserTeam).filter(UserTeam.team_id == team_id).count()
    if member_count > 1:
        raise HTTPException(400, "团队成员不止拥有者，无法删除")
    
    team_service.delete_team(db, team_id=team_id)
    
    return BaseResponse(message="删除成功") 