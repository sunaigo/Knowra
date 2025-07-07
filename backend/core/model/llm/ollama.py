from core.llm.base import LLM
from langchain_community.llms import Ollama
from typing import Any, List

class OllamaLLM(LLM):
    def __init__(self, config: dict):
        self.model = Ollama(
            model=config.get('model', 'llama2'),
            base_url=config.get('base_url')
        )

    def invoke(self, messages: List[Any], **kwargs) -> Any:
        return self.model.invoke(messages, **kwargs) 