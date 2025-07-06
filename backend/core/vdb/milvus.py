from langchain_community.vectorstores.milvus import Milvus
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from .base import VectorDB
from common.schemas.worker import VectorDBCollectionConfig
from typing import List, Dict, Any, Optional

class MilvusVectorDB(VectorDB):
    def __init__(self, embedding_function: Embeddings, config: VectorDBCollectionConfig):
        super().__init__(embedding_function, config)
        self._client = None
        self.is_connected = False

    async def connect(self) -> bool:
        host = self.db_config.get("host", "localhost")
        port = self.db_config.get("port", 19530)
        protocol = self.db_config.get("protocol", "http")
        user = self.db_config.get("user")
        password = self.db_config.get("password")
        db_name = self.db_config.get("db_name")
        collection_name = self.config.collection_name
        connection_args = {"host": host, "port": port, "protocol": protocol}
        if user:
            connection_args["user"] = user
        if password:
            connection_args["password"] = password
        if db_name:
            connection_args["db_name"] = db_name
        self._client = Milvus(
            embedding_function=self.embedding_function,
            collection_name=collection_name,
            connection_args=connection_args
        )
        self.is_connected = True
        return True

    async def disconnect(self) -> bool:
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
            "pagination": True,
            "update_document": False,
            "statistics": True
        }

    def add_documents(self, documents: List[Document]) -> List[str]:
        return self._client.add_documents(documents)

    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        return self._client.add_texts(texts, metadatas=metadatas)

    def similarity_search(self, query: str, k: int = 4, **kwargs) -> List[Document]:
        return self._client.similarity_search(query, k=k, **kwargs)

    def similarity_search_with_score(self, query: str, k: int = 4, **kwargs) -> List[tuple[Document, float]]:
        return self._client.similarity_search_with_score(query, k=k, **kwargs)

    def similarity_search_with_relevance_scores(self, query: str, k: int = 4, **kwargs) -> list[tuple[Document, float]]:
        return self._client.similarity_search_with_relevance_scores(query, k=k, **kwargs)

    # TODO: where删除可优化
    def delete(self, ids: list = None, where: dict = None):
        """
        支持通过 ids 或 where 条件删除分块。where 需先查 id 再删。
        """
        if where is not None:
            results = self._client.get(where=where, include=["ids"])
            ids_to_delete = results.get("ids", [])
            if ids_to_delete:
                self._client.delete(ids=ids_to_delete)
        elif ids is not None:
            self._client.delete(ids=ids)
        else:
            raise ValueError("delete 需要指定 where 或 ids")

    def as_retriever(self, **kwargs):
        return self._client.as_retriever(**kwargs)

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
