from core.llm.base import LLM
from .openai import OpenAILLM
from .ollama import OllamaLLM
from .xinference import XinferenceLLM

class LLMFactory:
    @staticmethod
    def create(config: dict) -> LLM:
        provider = config.get('provider', '').lower()
        if provider == 'openai':
            return OpenAILLM(config)
        elif provider == 'ollama':
            return OllamaLLM(config)
        elif provider == 'xinference':
            return XinferenceLLM(config)
        else:
            raise ValueError(f"不支持的LLM类型: {provider}") 