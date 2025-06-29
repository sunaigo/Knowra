from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.schemas.user import UserOut
from app.schemas.model import ModelOut

class KnowledgeBaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: int
    collection_id: int  # 新增，必须绑定

class KnowledgeBaseCreate(KnowledgeBaseBase):
    auto_process_on_upload: Optional[bool] = True
    embedding_model_id: Optional[int] = None
    icon_name: Optional[str] = None

class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    chunk_size: Optional[int] = None
    overlap: Optional[int] = None
    auto_process_on_upload: Optional[bool] = None
    embedding_model_id: Optional[int] = None
    icon_name: Optional[str] = None
    collection_id: Optional[int] = None  # 可选，编辑时可变

class KnowledgeBaseOut(KnowledgeBaseBase):
    id: int
    owner_id: int
    owner: Optional[UserOut] = None
    created_at: datetime
    doc_count: int = 0  # 设置默认值，避免校验报错
    chunk_size: int = 1000
    overlap: int = 100
    auto_process_on_upload: bool = True
    last_file_time: Optional[datetime] = None
    embedding_model_id: Optional[int] = None
    embedding_model: Optional[ModelOut] = None
    icon_name: Optional[str] = None
    collection_id: int  # 新增
    class Config:
        from_attributes = True  # pydantic v2写法，替代orm_mode 

# --- Document Schemas ---

class DocumentBase(BaseModel):
    filename: str
    filetype: Optional[str] = None
    status: Optional[str] = 'not_started'
    meta: Optional[Dict[str, Any]] = None

class DocumentCreate(DocumentBase):
    kb_id: int
    uploader_id: int
    filepath: str
    parsing_config: Optional[Dict[str, Any]] = None

class DocumentUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    fail_reason: Optional[str] = None
    parsing_config: Optional[Dict[str, Any]] = None
    last_parsed_config: Optional[Dict[str, Any]] = None # 主要在后台服务更新时使用
    parse_offset: Optional[int] = None

class Document(DocumentBase):
    id: int
    kb_id: int
    uploader_id: int
    upload_time: datetime
    progress: Optional[int] = 0
    fail_reason: Optional[str] = None
    parsing_config: Optional[Dict[str, Any]] = None
    last_parsed_config: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True 