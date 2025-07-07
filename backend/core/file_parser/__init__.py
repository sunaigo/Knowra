"""文件解析器模块"""

from .base_parser import BaseFileParser
from .doc_parser import WordFileParser
from .text_parser import TextFileParser
from .img_parser import ImgFileParser

__all__ = [
    "BaseFileParser",
    "WordFileParser",
    "TextFileParser",
    "ImgFileParser",
] 