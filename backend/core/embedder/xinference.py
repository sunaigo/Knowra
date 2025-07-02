from .base import Embedder
from langchain_community.embeddings import XinferenceEmbeddings
from typing import List, Dict, Any

class XinferenceEmbedder(Embedder):
    def __init__(self, config: Dict[str, Any]):
        self.model = config.get('model_name', 'bge-small')
        self.base_url = config.get('base_url', 'http://localhost:9997')
        self.client = XinferenceEmbeddings(model=self.model, server_url=self.base_url)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.client.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.client.embed_query(text) 