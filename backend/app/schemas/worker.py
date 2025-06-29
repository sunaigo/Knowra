from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class WorkerRegisterRequest(BaseModel):
    worker_id: str = Field(..., description="worker唯一标识")
    host: str = Field(..., description="worker主机地址")
    port: int = Field(..., description="worker端口")
    max_concurrent: int = Field(..., description="最大并发任务数")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="其他worker元信息")

class WorkerStatusCallback(BaseModel):
    worker_id: str = Field(..., description="worker唯一标识")
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态，如running/paused/finished/failed")
    progress: Optional[int] = Field(default=None, description="进度百分比")
    parse_offset: Optional[int] = Field(default=None, description="断点位置")
    message: Optional[str] = Field(default=None, description="附加信息")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="其他元信息") 