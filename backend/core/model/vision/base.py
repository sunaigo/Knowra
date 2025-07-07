from abc import ABC, abstractmethod
from typing import Any, List

class VisionModel(ABC):
    """
    通用视觉模型基类，所有具体视觉模型需继承
    """
    @abstractmethod
    def invoke(self, messages: List[Any], **kwargs) -> Any:
        pass 