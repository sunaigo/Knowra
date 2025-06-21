from pydantic import BaseModel, Field
from typing import Optional, Any, Literal
from datetime import datetime
from app.schemas.user import UserOut

class ModelBase(BaseModel):
    model_name: str
    provider: Literal['openai', 'ollama', 'xinference', 'other'] = Field(..., description='模型提供商')
    model_type: Literal['llm', 'embedding', 'vision'] = Field(..., description='模型类型')
    api_base: Optional[str] = None
    api_key: Optional[str] = None
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
    pass

class ModelUpdate(BaseModel):
    model_name: Optional[str] = None
    provider: Optional[Literal['openai', 'ollama', 'xinference', 'other']] = None
    model_type: Optional[Literal['llm', 'embedding', 'vision']] = None
    api_base: Optional[str] = None
    api_key: Optional[str] = None
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
    maintainer: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True 