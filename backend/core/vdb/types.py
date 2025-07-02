from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

class VectorDBType(Enum):
    CHROMA = "chroma"
    POSTGRESQL = "postgresql"
    MILVUS = "milvus"

# 删除 VectorDBCollectionConfig dataclass，全部用 Pydantic 版本替代 