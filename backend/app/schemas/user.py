from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info):
        return dt.isoformat() + "Z"

    class Config:
        from_attributes = True

class TeamMemberOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    class Config:
        from_attributes = True 