import base64
import os
from pathlib import Path
from typing import List, Generator
from .base_parser import BaseFileParser, ParsedContent
from prompt_hub import get_prompt
from core.model.vision.base import VisionModel

class ImgFileParser(BaseFileParser):
    """
    Image file parser for extracting knowledge from images using a local multimodal prompt and vision model.
    Inherits from BaseFileParser for unified interface.
    """
    def __init__(self, vision_model: VisionModel | None = None):
        super().__init__()
        self.vision_model = vision_model
        if vision_model is not None:
            self.vision_model_func = vision_model.invoke
        else:
            self.vision_model_func = None
        self.chat_prompt = get_prompt("vision_image_description.zh")

    def get_supported_extensions(self) -> List[str]:
        """
        Supported image file extensions.
        """
        return ["jpg", "jpeg", "png", "gif", "bmp", "webp"]

    def parse_file_lazy(self, file_path: str | None = None, file_content: bytes | str | None = None) -> Generator[ParsedContent, None, None]:
        """
        Parse a single image file by path or content lazily.
        Args:
            file_path: Path to the image file
            file_content: Image file content (bytes: binary file, str: base64 string)
        Returns:
            Generator[ParsedContent, None, None]: Generator yielding ParsedContent
        """
        if file_path:
            if not self.validate_file(file_path):
                raise ValueError(f"Unsupported file format or file not found: {file_path}")
            yield self.parse_image(image_path=file_path)
        elif file_content is not None:
            yield self.parse_image(file_content=file_content)
        else:
            raise ValueError("Either file_path or file_content must be provided.")

    def parse_image(self, image_path: str | None = None, file_content: bytes | str | None = None, context: str = "") -> ParsedContent:
        """
        Parse an image by path or content and extract knowledge using the vision model and prompt.
        Args:
            image_path: Path to the image file
            file_content: bytes: binary file, str: base64 string
            context: Optional context string
        Returns:
            ParsedContent: Structured knowledge extracted from the image
        """
        if file_content is not None:
            if isinstance(file_content, str):
                # str视为base64
                image_b64 = file_content
                image_data = base64.b64decode(image_b64)
                image_mime = self._get_mime_type(image_path or "unknown.png")
                path_meta = None
            else:
                # bytes视为二进制图片
                image_data = file_content
                image_b64 = base64.b64encode(image_data).decode()
                image_mime = self._get_mime_type(image_path or "unknown.png")
                path_meta = None
        elif image_path:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            with open(image_path, "rb") as f:
                image_data = f.read()
            image_b64 = base64.b64encode(image_data).decode()
            image_mime = self._get_mime_type(image_path)
            path_meta = image_path
        else:
            raise ValueError("Either image_path or file_content must be provided.")

        prompt_vars = {
            "image_description": "",
            "context": context or "",
            "image_data": image_b64,
            "image_mime_type": image_mime,
            "cache_type": "ephemeral"
        }
        messages = self.chat_prompt.format_messages(**prompt_vars)
        image_desc = self.vision_model_func(messages)
        # 兼容 AIMessage、dict、str 等类型，始终转为 str
        if hasattr(image_desc, 'content'):
            image_desc = image_desc.content
        elif isinstance(image_desc, dict):
            image_desc = image_desc.get('content', str(image_desc))
        else:
            image_desc = str(image_desc)
        metadata = {
            "image_path": path_meta,
            "image_size": len(image_data),
            "image_mime_type": image_mime
        }
        return ParsedContent(
            content_type="image",
            content=image_desc,
            metadata=metadata
        )

    def _get_mime_type(self, image_path: str) -> str:
        ext = Path(image_path).suffix.lower()
        if ext in [".jpg", ".jpeg"]:
            return "image/jpeg"
        elif ext == ".png":
            return "image/png"
        elif ext == ".gif":
            return "image/gif"
        elif ext == ".bmp":
            return "image/bmp"
        elif ext == ".webp":
            return "image/webp"
        else:
            return "application/octet-stream" 