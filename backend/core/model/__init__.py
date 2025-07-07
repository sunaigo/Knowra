from typing import Any
from common.schemas.model import ModelConfig

class ModelFactory:
    @staticmethod
    def create(config: ModelConfig) -> Any:
        model_type = config.model_type.lower()
        if model_type == 'vision':
            from core.model.vision.factory import VisionModelFactory
            return VisionModelFactory.create(config.model_dump())
        elif model_type == 'llm':
            from core.model.llm.factory import LLMFactory
            return LLMFactory.create(config.model_dump())
        elif model_type == 'embedding':
            from core.model.embedder.factory import EmbedderFactory
            return EmbedderFactory.create(config.model_dump())
        else:
            raise ValueError(f'不支持的模型类型: {model_type}') 