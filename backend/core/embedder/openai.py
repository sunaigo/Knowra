from .base import Embedder
from langchain_openai import OpenAIEmbeddings
from typing import List, Dict, Any

class OpenAIEmbedder(Embedder):
    def __init__(self, config: Dict[str, Any]):
        self.model = config.get('model_name', 'text-embedding-ada-002')
        self.api_key = config.get('api_key')
        self.base_url = config.get('base_url')
        kwargs = {}
        if self.base_url:
            kwargs['base_url'] = self.base_url
        self.client = OpenAIEmbeddings(model=self.model, openai_api_key=self.api_key, **kwargs)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.client.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.client.embed_query(text) 