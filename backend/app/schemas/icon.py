from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SvgIconBase(BaseModel):
    name: str = Field(..., description='图标名')

class SvgIconCreate(SvgIconBase):
    content: str = Field(..., description='svg内容字符串')

class SvgIconOut(SvgIconBase):
    id: int
    uploader_id: int
    created_at: datetime
    content: Optional[str] = None  # 可选返回svg内容
    class Config:
        from_attributes = True 