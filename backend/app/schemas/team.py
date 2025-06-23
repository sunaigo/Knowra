from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(TeamBase):
    pass

class TeamOut(TeamBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TeamWithRole(TeamOut):
    role: str  # 当前用户在该团队中的角色
    member_count: Optional[int] = None

class TeamDetail(TeamOut):
    member_count: int
    # 可以添加更多详细信息，如知识库数量等 