from abc import ABC, abstractmethod
from typing import Any, List

class LLM(ABC):
    """
    通用LLM基类，所有具体LLM需继承
    """
    @abstractmethod
    def invoke(self, messages: List[Any], **kwargs) -> Any:
        pass 