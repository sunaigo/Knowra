from core.model.vision.base import VisionModel
from langchain_community.llms import Ollama
from typing import Any, List

class OllamaVisionModel(VisionModel):
    def __init__(self, config: dict):
        self.model = Ollama(
            model=config.get('model_name', 'llava'),
            base_url=config.get('api_base')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 