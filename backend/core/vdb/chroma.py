from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from .base import VectorDB
from common.schemas.worker import VectorDBCollectionConfig
from typing import List, Dict, Any, Optional
from loguru import logger


from langchain_core.retrievers import BaseRetriever


class ChromaRetrieverWithScore(BaseRetriever):
    def __init__(
        self,
        vectorstore: "ChromaVectorDB",
        search_type: str = "similarity",
        search_kwargs: Optional[Dict[str, Any]] = None,
    ):
        self._vectorstore = vectorstore
        self._search_type = search_type
        self._search_kwargs = search_kwargs or {"k": 4}

    @property
    def vectorstore(self):
        return self._vectorstore

    @property
    def search_type(self):
        return self._search_type

    @search_type.setter
    def search_type(self, value):
        self._search_type = value

    @property
    def search_kwargs(self):
        return self._search_kwargs

    @search_kwargs.setter
    def search_kwargs(self, value):
        self._search_kwargs = value

    @property
    def tags(self):
        return []
    

    def _get_relevant_documents(self, query: str) -> List[Document]:
        if self.search_type == "similarity":
            results = self.vectorstore.similarity_search_with_relevance_scores(query, **self.search_kwargs)
        elif self.search_type == "mmr":
            # MMR 不返回分数，因此只能构造空分数（或跳过）
            docs = self.vectorstore.max_marginal_relevance_search(query, **self.search_kwargs)
            for doc in docs:
                doc.metadata["relevance_score"] = None  # 标记为无分数
            return docs
        else:
            raise ValueError(f"Unsupported search_type: {self.search_type}")

        # 添加分数到 metadata
        return [
            Document(page_content=doc.page_content, metadata={**doc.metadata, "relevance_score": score})
            for doc, score in results
        ]



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
            embedding_function=self.embedding_function,
            collection_metadata={"hnsw:space": "cosine"}
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

    def similarity_search_with_relevance_scores(self, query: str, k: int = 4, **kwargs) -> list[tuple[Document, float]]:
        return self._client.similarity_search_with_relevance_scores(query, k=k, **kwargs)
    

    # TODO：暂不支持向量格式输入
    def as_retriever_with_score(self, search_type: str = "similarity", search_kwargs: Optional[Dict[str, Any]] = None):
        """
        返回一个带 relevance_score 的 retriever。
        支持 search_type = "similarity"（带分数）或 "mmr"（无分数）。
        支持传入 filter、k、lambda_mult 等参数。
        """
        return ChromaRetrieverWithScore(
            vectorstore=self,
            search_type=search_type,
            search_kwargs=search_kwargs
        )


    @classmethod
    def from_texts(cls, texts, embedding, metadatas=None, **kwargs):
        raise NotImplementedError("from_texts not implemented for this VDB")

    @classmethod
    def from_documents(cls, documents, embedding, **kwargs):
        raise NotImplementedError("from_documents not implemented for this VDB") 