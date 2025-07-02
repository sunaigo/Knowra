from pydantic import BaseModel, Field, SecretStr
from typing import Optional, Literal
from datetime import datetime
from common.schemas.user import UserOut


class ConnectionBase(BaseModel):
    name: str = Field(..., description="连接名称")
    provider: Literal['openai', 'ollama', 'xinference', 'other'] = Field(..., description="模型提供商")
    api_base: str = Field(..., description="API Base URL")
    api_key: Optional[SecretStr] = Field(None, description="API Key")
    status: Optional[str] = Field("enabled", description="状态")
    description: Optional[str] = None
    maintainer_id: Optional[int] = None


class ConnectionCreate(ConnectionBase):
    api_key: Optional[str] = None


class ConnectionUpdate(ConnectionCreate):
    pass


class ConnectionConfig(BaseModel):
    base_url: str
    api_key: Optional[SecretStr] = None


class ConnectionTest(BaseModel):
    provider: str
    config: ConnectionConfig
    model_name: Optional[str] = None


class ConnectionOut(ConnectionBase):
    id: int
    has_api_key: bool = False
    maintainer: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 