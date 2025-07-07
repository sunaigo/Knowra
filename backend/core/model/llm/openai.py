from core.llm.base import LLM
from langchain_openai import ChatOpenAI
from typing import Any, List

class OpenAILLM(LLM):
    def __init__(self, config: dict):
        self.model = ChatOpenAI(
            api_key=config.get('api_key'),
            model=config.get('model', 'gpt-3.5-turbo'),
            temperature=config.get('temperature', 0.7),
            base_url=config.get('base_url')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 