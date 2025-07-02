from common.schemas.worker import VectorDBCollectionConfig
from .base import VectorDB
from langchain_core.embeddings import Embeddings

class VectorDBFactory:
    @staticmethod
    def create_vector_db(config: VectorDBCollectionConfig, embeddings: Embeddings) -> VectorDB:
        if config.type == "chroma":
            from .chroma import ChromaVectorDB
            return ChromaVectorDB(embeddings, config)
        elif config.type == "postgresql":
            from .pgvector import PostgreSQLVectorDB
            return PostgreSQLVectorDB(embeddings, config)
        elif config.type == "milvus":
            from .milvus import MilvusVectorDB
            return MilvusVectorDB(embeddings, config)
        else:
            raise ValueError(f"不支持的数据库类型: {config.type}") 