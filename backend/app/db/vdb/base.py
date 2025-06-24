from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from langchain_core.vectorstores import VectorStore
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from .types import VectorDBConfig

class BaseVectorDB(VectorStore, ABC):
    def __init__(self, embedding_function: Embeddings, config: VectorDBConfig):
        self._embedding_function = embedding_function
        self.config = config
        self.team_id = config.team_id
        self.db_config = config.connection_config
        self.is_connected = False
    
    @property
    def embedding_function(self):
        return self._embedding_function
    
    @abstractmethod
    async def connect(self) -> bool:
        pass
    
    @abstractmethod
    async def disconnect(self) -> bool:
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        pass
    
    @abstractmethod
    def check_permission(self, user_team_id: int) -> bool:
        pass
    
    @abstractmethod
    async def get_statistics(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_supported_features(self) -> Dict[str, bool]:
        """返回该VDB支持的功能，供前端展示使用"""
        pass

    # 基础功能
    def add_documents(self, documents: List[Document]) -> List[str]:
        raise NotImplementedError("add_documents not supported for this VDB")

    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        raise NotImplementedError("add_texts not supported for this VDB")

    def similarity_search(self, query: str, k: int = 4, **kwargs) -> List[Document]:
        raise NotImplementedError("similarity_search not supported for this VDB")

    def similarity_search_with_score(self, query: str, k: int = 4, **kwargs) -> List[tuple[Document, float]]:
        raise NotImplementedError("similarity_search_with_score not supported for this VDB")

    def delete(self, ids: List[str]) -> None:
        raise NotImplementedError("delete not supported for this VDB")

    def as_retriever(self, **kwargs):
        raise NotImplementedError("as_retriever not supported for this VDB")

    # 高级功能
    def max_marginal_relevance_search(self, query: str, k: int = 4, fetch_k: int = 20, lambda_mult: float = 0.5, **kwargs) -> List[Document]:
        raise NotImplementedError("max_marginal_relevance_search not supported for this VDB")

    def filter(self, filter: Dict[str, Any], k: int = 4, **kwargs) -> List[Document]:
        raise NotImplementedError("filter not supported for this VDB")

    def hybrid_search(self, query: str, k: int = 4, **kwargs) -> List[Document]:
        raise NotImplementedError("hybrid_search not supported for this VDB")

    def update_document(self, doc_id: str, document: Document) -> bool:
        raise NotImplementedError("update_document not supported for this VDB")

    def pagination(self, query: str, page: int = 1, page_size: int = 10, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError("pagination not supported for this VDB") 