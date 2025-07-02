from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from .base import VectorDB
from common.schemas.worker import VectorDBCollectionConfig
from typing import List, Dict, Any, Optional
from loguru import logger

class ChromaVectorDB(VectorDB):
    def __init__(self, embedding_function: Embeddings, config: VectorDBCollectionConfig):
        super().__init__(embedding_function, config)
        self._client = None
        self._collection = None
        self.is_connected = False

    async def connect(self) -> bool:
        persist_dir = self.db_config.get("persist_directory", "./vector_store")
        collection_name = self.config.collection_name
        self._client = Chroma(
            collection_name=collection_name,
            persist_directory=persist_dir,
            embedding_function=self.embedding_function
        )
        logger.info('vdb connect')
        self.is_connected = True
        return True

    async def disconnect(self) -> bool:
        logger.info('vdb disconnect')
        self._client = None
        self.is_connected = False
        return True

    async def health_check(self) -> bool:
        return self.is_connected

    def check_permission(self, user_team_id: int) -> bool:
        if self.config.is_private:
            return user_team_id == self.team_id
        return True

    async def get_statistics(self) -> Dict[str, Any]:
        # 这里只做简单统计，实际可扩展
        return {
            "doc_count": len(self._client.get()) if self._client else 0,
            "is_connected": self.is_connected
        }

    def get_supported_features(self) -> Dict[str, bool]:
        return {
            "add_documents": True,
            "add_texts": True,
            "similarity_search": True,
            "similarity_search_with_score": True,
            "delete": True,
            "as_retriever": True,
            "max_marginal_relevance_search": True,
            "filter": True,
            "hybrid_search": False,
            "pagination": False,
            "update_document": False,
            "statistics": True
        }

    # 直接复用Chroma的检索/添加接口
    def add_documents(self, documents: List[Document]) -> List[str]:
        return self._client.add_documents(documents)

    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        return self._client.add_texts(texts, metadatas=metadatas)

    def similarity_search(self, query: str, k: int = 4, **kwargs) -> List[Document]:
        return self._client.similarity_search(query, k=k, **kwargs)

    def similarity_search_with_score(self, query: str, k: int = 4, **kwargs) -> List[tuple[Document, float]]:
        return self._client.similarity_search_with_score(query, k=k, **kwargs)

    def delete(self, ids: list = None, where: dict = None):
        """
        支持通过 ids 或 where 条件删除分块。
        """
        if where is not None:
            self._client.delete(where=where)
        elif ids is not None:
            self._client.delete(ids=ids)
        else:
            raise ValueError("delete 需要指定 where 或 ids")

    def as_retriever(self, **kwargs):
        return self._client.as_retriever(**kwargs)

    # 高级功能
    def max_marginal_relevance_search(self, query: str, k: int = 4, fetch_k: int = 20, lambda_mult: float = 0.5, **kwargs) -> List[Document]:
        return self._client.max_marginal_relevance_search(query, k=k, fetch_k=fetch_k, lambda_mult=lambda_mult, **kwargs)

    def filter(self, filter: Dict[str, Any], k: int = 4, **kwargs) -> List[Document]:
        return self._client.similarity_search("", k=k, filter=filter, **kwargs)

    @classmethod
    def from_texts(cls, texts, embedding, metadatas=None, **kwargs):
        raise NotImplementedError("from_texts not implemented for this VDB")

    @classmethod
    def from_documents(cls, documents, embedding, **kwargs):
        raise NotImplementedError("from_documents not implemented for this VDB") 