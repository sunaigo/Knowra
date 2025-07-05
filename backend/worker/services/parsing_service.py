"""解析服务"""

from typing import Iterator, Tuple, Dict, Any
from loguru import logger

from common.utils.text_splitter import parse_pdf, split_text_iter
from worker.exceptions.worker_exceptions import TextParseException, ChunkException
from worker.utils.worker_utils import get_file_extension


class ParsingService:
    """解析服务，负责文本解析和分块处理"""
    
    def __init__(self):
        self.supported_types = {
            'pdf': self._parse_pdf,
            'txt': self._parse_text,
            'md': self._parse_text
        }
    
    def parse_file(self, file_path: str, file_type: str) -> str:
        """
        解析文件内容为文本
        
        Args:
            file_path: 文件路径
            file_type: 文件类型
            
        Returns:
            解析后的文本内容
            
        Raises:
            TextParseException: 解析失败
        """
        try:
            # 规范化文件类型
            file_type = file_type.lower().strip()
            
            # 如果没有指定文件类型，尝试从文件路径推断
            if not file_type:
                file_type = get_file_extension(file_path)
            
            # 检查是否支持
            if file_type not in self.supported_types:
                raise TextParseException(f"不支持的文件类型: {file_type}")
            
            # 调用对应的解析器
            parser_func = self.supported_types[file_type]
            text = parser_func(file_path)
            
            # 验证解析结果
            if not text or not text.strip():
                raise TextParseException("文件解析后无内容")
            
            logger.info(f"文件解析成功: {file_path}, 文本长度: {len(text)}")
            return text
            
        except Exception as e:
            logger.error(f"文件解析失败 {file_path}: {e}")
            raise TextParseException(f"文件解析失败: {e}")
    
    def _parse_pdf(self, file_path: str) -> str:
        """解析PDF文件"""
        try:
            return parse_pdf(file_path)
        except Exception as e:
            raise TextParseException(f"PDF解析失败: {e}")
    
    def _parse_text(self, file_path: str) -> str:
        """解析文本文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # 尝试其他编码
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    return f.read()
            except Exception:
                raise TextParseException("文本文件编码识别失败")
        except Exception as e:
            raise TextParseException(f"文本文件读取失败: {e}")
    
    def chunk_text(self, text: str, file_type: str, chunk_size: int, overlap: int) -> Iterator[Tuple[int, str]]:
        """
        将文本分割为块
        
        Args:
            text: 原始文本
            file_type: 文件类型
            chunk_size: 块大小
            overlap: 重叠大小
            
        Yields:
            (chunk_index, chunk_text) 元组
            
        Raises:
            ChunkException: 分块失败
        """
        try:
            if not text or not text.strip():
                raise ChunkException("待分块的文本为空")
            
            if chunk_size <= 0:
                raise ChunkException("块大小必须大于0")
            
            if overlap < 0 or overlap >= chunk_size:
                raise ChunkException("重叠大小必须在0到块大小之间")
            
            # 使用现有的分块功能
            chunk_iter = split_text_iter(
                text, 
                splitter_type=file_type, 
                chunk_size=chunk_size, 
                chunk_overlap=overlap
            )
            
            chunk_count = 0
            for idx, chunk in enumerate(chunk_iter):
                if not chunk or not chunk.strip():
                    logger.warning(f"跳过空分块: index={idx}")
                    continue
                
                yield idx, chunk
                chunk_count += 1
            
            if chunk_count == 0:
                raise ChunkException("文本分块后无有效内容")
            
            logger.info(f"文本分块完成: 总分块数={chunk_count}, chunk_size={chunk_size}, overlap={overlap}")
            
        except Exception as e:
            logger.error(f"文本分块失败: {e}")
            raise ChunkException(f"文本分块失败: {e}")
    
    def validate_chunk_params(self, chunk_size: int, overlap: int) -> bool:
        """
        验证分块参数
        
        Args:
            chunk_size: 块大小
            overlap: 重叠大小
            
        Returns:
            是否有效
        """
        if chunk_size <= 0:
            logger.error(f"无效的块大小: {chunk_size}")
            return False
        
        if overlap < 0:
            logger.error(f"无效的重叠大小: {overlap}")
            return False
        
        if overlap >= chunk_size:
            logger.error(f"重叠大小不能大于等于块大小: overlap={overlap}, chunk_size={chunk_size}")
            return False
        
        return True
    
    def get_supported_types(self) -> list:
        """获取支持的文件类型列表"""
        return list(self.supported_types.keys())
    
    def is_type_supported(self, file_type: str) -> bool:
        """检查文件类型是否支持"""
        return file_type.lower() in self.supported_types
    
    def estimate_chunk_count(self, text: str, chunk_size: int, overlap: int, file_type: str = 'txt') -> int:
        """
        估算分块数量（与实际分块完全一致，直接遍历chunk_text生成器）
        """
        return sum(1 for _ in self.chunk_text(text, file_type, chunk_size, overlap))
    
    def get_text_stats(self, text: str) -> Dict[str, Any]:
        """
        获取文本统计信息
        
        Args:
            text: 文本内容
            
        Returns:
            文本统计信息
        """
        if not text:
            return {
                "length": 0,
                "lines": 0,
                "words": 0,
                "chars": 0,
                "is_empty": True
            }
        
        lines = text.split('\n')
        words = text.split()
        
        return {
            "length": len(text),
            "lines": len(lines),
            "words": len(words),
            "chars": len([c for c in text if not c.isspace()]),
            "is_empty": not text.strip()
        } 