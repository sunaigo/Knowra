from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from common.schemas.user import UserOut

class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(BaseModel):
    name: str
    vdb_id: int
    team_id: int
    description: Optional[str] = None

class CollectionOut(CollectionBase):
    id: int
    vdb_id: int
    owner_id: int
    owner: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None 