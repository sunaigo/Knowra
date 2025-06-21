from typing import Any, Optional, List, Generic, TypeVar
from pydantic import BaseModel
from .user import TeamMemberOut

T = TypeVar('T')

class BaseResponse(BaseModel):
    code: int
    data: Any = None
    message: str = "success"

class TeamMemberListResponse(BaseModel):
    code: int
    data: List[TeamMemberOut]
    message: str = "success"

class ListResponse(BaseModel, Generic[T]):
    code: int
    data: List[T]
    message: str = "success" 