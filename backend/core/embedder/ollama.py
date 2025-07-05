from .base import Embedder
from langchain_ollama import OllamaEmbeddings
from typing import List, Dict, Any
import threading

class OllamaEmbedder(Embedder):
    def __init__(self, config: Dict[str, Any]):
        self.model = config.get('model_name', 'bge-small')
        self.base_url = config.get('base_url', 'http://localhost:11434')
        self._thread_local = threading.local()

    def _get_client(self):
        if not hasattr(self._thread_local, "client"):
            self._thread_local.client = OllamaEmbeddings(model=self.model, base_url=self.base_url)
        return self._thread_local.client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        client = self._get_client()
        return client.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        client = self._get_client()
        return client.embed_query(text) 