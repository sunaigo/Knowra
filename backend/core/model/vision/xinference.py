from core.model.vision.base import VisionModel
from langchain_community.llms import Xinference
from typing import Any, List

class XinferenceVisionModel(VisionModel):
    def __init__(self, config: dict):
        self.model = Xinference(
            server_url=config.get('api_base', 'http://localhost:9997'),
            model_uid=config.get('model_name')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 