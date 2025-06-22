from typing import Any, Optional, List, Generic, TypeVar
from pydantic import BaseModel, Field
from .user import TeamMemberOut

T = TypeVar('T')

class BaseResponse(BaseModel, Generic[T]):
    code: int = Field(200, description="Status code")
    message: str = Field("success", description="Response message")
    data: Optional[T] = None

    def __init__(self, data: Optional[T] = None, code: int = 200, message: str = "success", **kwargs: Any):
        super().__init__(data=data, code=code, message=message, **kwargs)

class TeamMemberListResponse(BaseModel):
    code: int
    data: List[TeamMemberOut]
    message: str = "success"

class ListResponse(BaseModel, Generic[T]):
    code: int = Field(200, description="Status code")
    message: str = Field("success", description="Response message")
    data: List[T] = Field(default_factory=list)

    def __init__(self, data: List[T] = [], code: int = 200, message: str = "success", **kwargs: Any):
        super().__init__(data=data, code=code, message=message, **kwargs) 