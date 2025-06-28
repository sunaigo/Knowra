from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

class VectorDBType(Enum):
    CHROMA = "chroma"
    POSTGRESQL = "postgresql"
    MILVUS = "milvus"

@dataclass
class VectorDBConfig:
    name: str
    type: str  # chroma, postgresql, milvus
    team_id: int
    description: Optional[str] = None
    connection_config: Dict[str, Any] = None
    is_private: bool = True
    embedding_dimension: int = 1536
    index_type: str = "hnsw"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None 