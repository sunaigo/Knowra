from core.model.embedder.base import Embedder
from .openai import OpenAIEmbedder
from .ollama import OllamaEmbedder
from .xinference import XinferenceEmbedder

class EmbedderFactory:
    @staticmethod
    def create(config: dict) -> Embedder:
        embedder_provider = config.get('provider', '').lower()
        if embedder_provider == 'openai':
            return OpenAIEmbedder(config)
        elif embedder_provider == 'ollama':
            return OllamaEmbedder(config)
        elif embedder_provider == 'xinference':
            return XinferenceEmbedder(config)
        else:
            raise ValueError(f"不支持的embedder类型: {embedder_provider}") 