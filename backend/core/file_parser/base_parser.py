from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Generator
from pathlib import Path
import os
from dataclasses import dataclass
from pydantic import BaseModel
from langchain.text_splitter import RecursiveCharacterTextSplitter


class ChunkParams(BaseModel):
    chunk_size: int = 1000
    overlap: int = 100



class ParsedContent:
    """解析内容数据结构"""
    
    def __init__(self, content_type: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        self.type = content_type
        self.content = content
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'type': self.type,
            'content': self.content,
            'metadata': self.metadata
        }


class BaseFileParser(ABC):
    """文件解析器基类"""
    
    def __init__(self):
        pass
    
    @abstractmethod
    def get_supported_extensions(self) -> List[str]:
        """
        获取支持的文件扩展名列表
        
        Returns:
            支持的文件扩展名列表，如 ['docx', 'doc']
        """
        pass
    
    def parse_file(self, file_path: str | None = None, file_content: bytes | str | None = None) -> List[ParsedContent]:
        """
        Parse file by path or content.
        Args:
            file_path: Path to file (optional)
            file_content: File content, can be bytes or str (optional)
        Returns:
            List[ParsedContent]: Parsed content list
        Raises:
            ValueError: If neither file_path nor file_content is provided
        Note:
            file_content can be either bytes (binary) or str (text), depending on the file type and parser implementation.
        """
        return list(self.parse_file_lazy(file_path=file_path, file_content=file_content))
    
    @abstractmethod
    def parse_file_lazy(self, file_path: str | None = None, file_content: bytes | str | None = None) -> Generator[ParsedContent, None, None]:
        """
        懒加载方式解析文件内容（流式处理）
        
        Args:
            file_path: 文件路径（可选）
            file_content: 文件内容（可选）
        Yields:
            ParsedContent: 解析后的内容块
        """
        # 默认实现：直接调用parse_file然后yield每个内容
        # 子类可以重写此方法以实现真正的流式处理
        pass
    
    def parse_to_text_lazy(self, file_path: str | None = None, file_content: bytes | str | None = None) -> Generator[str, None, None]:
        """
        懒加载方式解析文件并返回文本块
        
        Args:
            file_path: 文件路径
            
        Yields:
            str: 文本内容块
        """
        for item in self.parse_file_lazy(file_path, file_content):
            yield item.content
    
    
    def parse_to_text_chunks_lazy(
        self,
        file_path: str | None = None,
        file_content: bytes | str | None = None,
        chunk_params: Optional[ChunkParams] = None
    ) -> Generator[str, None, None]:
        """
        Parse file and yield text chunks. chunk_args is an object for chunking parameters.
        Args:
            file_path: file path (optional)
            file_content: file content (optional)
            chunk_args: dict, supports 'chunk_size' and 'overlap' (optional)
        Yields:
            ParsedContent: parsed content chunk
        """    

        chunk_size = chunk_params.chunk_size if chunk_params else 1000
        overlap = chunk_params.overlap if chunk_params else 100
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)
        text = self.parse_to_text(file_path, file_content)
        for chunk in text_splitter.split_text(text):
            yield chunk
    
    
    def parse_to_text(self, file_path: str | None = None, file_content: bytes | str | None = None) -> str:
        """
        解析文件并合并为纯文本
        
        Args:
            file_path: 文件路径
            
        Returns:
            合并后的文本内容
        """
        return '\n'.join([item.content for item in self.parse_file_lazy(file_path=file_path, file_content=file_content)])
    
    def parse_to_text_chunks(self, file_path: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """
        解析文件并按指定大小分块返回
        """
        return list(self.parse_to_text_chunks_lazy(file_path, chunk_size, overlap))
    

    def check_path(self, file_path: str | None = None) -> bool:
        if file_path is None:
            return False
        return os.path.exists(file_path) and os.path.isfile(file_path)