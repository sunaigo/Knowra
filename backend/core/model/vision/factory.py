from typing import Any, Dict
from langchain_core.language_models import BaseLanguageModel
from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama, Xinference
# 这里假设未来会有更多视觉模型的langchain集成
from core.model.vision.base import VisionModel
from .openai import OpenAIVisionModel
from .ollama import OllamaVisionModel
from .xinference import XinferenceVisionModel

class VisionModelFactory:
    @staticmethod
    def create(config: dict) -> VisionModel:
        provider = config.get('provider', '').lower()
        if provider == 'openai':
            return OpenAIVisionModel(config)
        elif provider == 'ollama':
            return OllamaVisionModel(config)
        elif provider == 'xinference':
            return XinferenceVisionModel(config)
        else:
            raise ValueError(f"不支持的视觉模型类型: {provider}") 