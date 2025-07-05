"""Worker相关的Schema定义"""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any



class TaskState(Enum):
    """统一的任务状态枚举"""
    NOT_STARTED = "not_started"    # 未开始
    PENDING = "pending"            # 待处理
    PROCESSING = "processing"      # 处理中
    PAUSED = "paused"              # 暂停
    PROCESSED = "processed"        # 已处理
    FAILED = "failed"              # 失败
    CANCELLED = "cancelled"        # 已取消


class WorkerRegisterRequest(BaseModel):
    worker_id: str = Field(..., description="worker唯一标识")
    host: str = Field(..., description="worker主机地址")
    port: int = Field(..., description="worker端口")
    max_concurrent: int = Field(..., description="最大并发任务数")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="其他worker元信息")

class WorkerStatusCallback(BaseModel):
    worker_id: str = Field(..., description="worker唯一标识")
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态，如processing/paused/processed/failed")
    progress: Optional[int] = Field(default=None, description="进度百分比")
    parse_offset: Optional[int] = Field(default=None, description="断点位置")
    message: Optional[str] = Field(default=None, description="附加信息")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="其他元信息")

class FileInfo(BaseModel):
    path: str
    type: str
    filename: Optional[str] = None

class OSSParams(BaseModel):
    bucket: str
    endpoint: str
    access_key: str
    secret_key: str
    region: Optional[str] = None

class EmbeddingParams(BaseModel):
    model_name: str
    embedding_dim: int
    provider: str

class VectorDBCollectionConfig(BaseModel):
    collection_name: str
    type: str
    connection_config: Dict[str, Any]
    embedding_dimension: int = 1536
    index_type: str = "hnsw"

class ParseParams(BaseModel):
    chunk_size: int = 1000
    overlap: int = 100

class ParseFileTaskParams(BaseModel):
    task_id: str
    parse_params: ParseParams
    file: FileInfo
    oss: Optional[OSSParams] = None
    embedding: EmbeddingParams
    vdb: VectorDBCollectionConfig
    kb_id: Optional[str] = None
    doc_id: Optional[str] = None
    upload_time: Optional[str] = None
    uploader_id: Optional[str] = None
    parallel: Optional[int] = 3
    parse_offset: int = 0

class ChunkMetadata(BaseModel):
    doc_id: int
    chunk_id: int
    kb_id: Optional[str]
    filetype: str
    length: int
    filename: str
    upload_time: Optional[str]
    uploader_id: Optional[str]
    chunk_offset: Optional[int]
    source: str
    chunk_size: int
    overlap: int
    embedding_model_name: str
    embedding_dim: int 