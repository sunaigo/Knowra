from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, Any, Literal, Dict
from datetime import datetime
from common.schemas.user import UserOut
from common.schemas.connection import ConnectionOut

class ModelBase(BaseModel):
    model_name: str
    model_type: Literal['llm', 'embedding', 'vision'] = Field(..., description='模型类型')

    embedding_dim: Optional[int] = None
    context_length: Optional[int] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    vision_config: Optional[Any] = None
    is_default: Optional[bool] = False
    extra_config: Optional[Any] = None  # JSON
    status: Optional[str] = 'enabled'
    description: Optional[str] = None
    maintainer_id: Optional[int] = None

class ModelCreate(ModelBase):
    connection_id: int

class ModelUpdate(BaseModel):
    model_name: Optional[str] = None
    model_type: Optional[Literal['llm', 'embedding', 'vision']] = None
    connection_id: Optional[int] = None

    embedding_dim: Optional[int] = None
    context_length: Optional[int] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    vision_config: Optional[Any] = None
    is_default: Optional[bool] = None
    extra_config: Optional[Any] = None

    status: Optional[str] = None
    description: Optional[str] = None
    maintainer_id: Optional[int] = None

class ModelOut(ModelBase):
    id: int
    connection_id: Optional[int] = None
    maintainer: Optional[UserOut] = None
    connection: Optional[ConnectionOut] = None
    created_at: datetime
    updated_at: datetime
    is_default: bool
    status: str
    class Config:
        from_attributes = True

# 通用模型配置实体
class ModelConfig(BaseModel):
    model_name: str
    model_type: str  # 'llm'/'embedding'/'vision' 等
    provider: str
    api_base: str
    api_key: Optional[str] = None
    extra_config: Optional[Dict[str, Any]] = None  # 额外模型参数 