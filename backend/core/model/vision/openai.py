from core.model.vision.base import VisionModel
from langchain_openai import ChatOpenAI
from typing import Any, List

class OpenAIVisionModel(VisionModel):
    def __init__(self, config: dict):
        self.model = ChatOpenAI(
            api_key=config.get('api_key'),
            model=config.get('model_name', 'gpt-4-vision-preview'),
            temperature=config.get('temperature', 0.7),
            base_url=config.get('api_base')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 