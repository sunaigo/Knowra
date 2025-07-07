from core.llm.base import LLM
from langchain_community.llms import Xinference
from typing import Any, List

class XinferenceLLM(LLM):
    def __init__(self, config: dict):
        self.model = Xinference(
            server_url=config.get('base_url', 'http://localhost:9997'),
            model_uid=config.get('model_uid')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 