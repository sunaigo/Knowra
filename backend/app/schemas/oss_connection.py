from pydantic import BaseModel, Field, SecretStr
from typing import Optional, List, Dict
from datetime import datetime

class OSSConnectionBase(BaseModel):
    name: str = Field(..., description="连接名称")
    endpoint: str = Field(..., description="S3/OSS Endpoint")
    access_key: SecretStr = Field(..., description="Access Key")
    secret_key: SecretStr = Field(..., description="Secret Key")
    region: Optional[str] = Field(None, description="区域")
    description: Optional[str] = Field(None, description="描述")
    team_id: int = Field(..., description="所属团队ID")
    maintainer_id: int = Field(..., description="添加人ID")
    status: Optional[str] = Field("enabled", description="状态")

class OSSConnectionCreate(OSSConnectionBase):
    pass

class OSSConnectionUpdate(BaseModel):
    name: Optional[str] = None
    endpoint: Optional[str] = None
    access_key: Optional[SecretStr] = None
    secret_key: Optional[SecretStr] = None
    region: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class OSSConnectionOut(OSSConnectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    shared_team_ids: List[int] = []

    class Config:
        from_attributes = True

class OSSConnectionTest(BaseModel):
    endpoint: str
    access_key: SecretStr
    secret_key: SecretStr
    region: Optional[str] = None

class ShareTeamBuckets(BaseModel):
    team_id: int
    buckets: List[str]

class ShareOSSConnectionIn(BaseModel):
    team_buckets: List[ShareTeamBuckets] 