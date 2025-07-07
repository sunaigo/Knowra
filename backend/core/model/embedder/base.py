from abc import ABC, abstractmethod
from typing import List
from langchain_core.embeddings import Embeddings

class Embedder(Embeddings, ABC):
    """
    通用向量化基类，所有具体 embedder 需继承
    """
    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass 