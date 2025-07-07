from .base_parser import BaseFileParser, ParsedContent
from typing import List, Generator, Optional
import os

class TextFileParser(BaseFileParser):
    """TXT/Markdown 文本文件解析器"""
    def get_supported_extensions(self) -> List[str]:
        return ["txt", "md"]

    def parse_file_lazy(self, file_path: str | None = None, file_content: bytes | str | None = None) -> Generator[ParsedContent, None, None]:
        if not self.check_path(file_path):
            raise ValueError(f"Unsupported file format or file not found: {file_path}")
        try:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
            except UnicodeDecodeError:
                with open(file_path, 'r', encoding='gbk') as f:
                    text = f.read()
            yield ParsedContent(content_type="text", content=text)
        except Exception as e:
            raise ValueError(f"Text file read failed: {e}") 