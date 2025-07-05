"""资源管理器"""

import os
import atexit
from typing import List, Set, Optional
from contextlib import contextmanager
from loguru import logger

from worker.config.worker_config import worker_config
from worker.utils.worker_utils import ensure_directory, cleanup_file, get_file_size, format_file_size
from worker.exceptions.worker_exceptions import ResourceException


class ResourceManager:
    """资源管理器，负责临时文件和其他资源的生命周期管理"""
    
    def __init__(self, config=None):
        self.config = config or worker_config
        self.temp_files: Set[str] = set()
        self.temp_dirs: Set[str] = set()
        self._setup_cleanup_handlers()
    
    def _setup_cleanup_handlers(self):
        """设置清理处理器"""
        # 注册退出时的清理函数
        atexit.register(self.cleanup_all_resources)
    
    def ensure_temp_directory(self) -> str:
        """确保临时目录存在，返回绝对路径"""
        try:
            temp_dir = ensure_directory(self.config.temp_dir)
            self.temp_dirs.add(temp_dir)
            logger.debug(f"临时目录已准备: {temp_dir}")
            return temp_dir
        except Exception as e:
            logger.error(f"创建临时目录失败: {e}")
            raise ResourceException(f"创建临时目录失败: {e}")
    
    def register_temp_file(self, file_path: str) -> str:
        """
        注册临时文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件路径
        """
        if file_path and os.path.exists(file_path):
            self.temp_files.add(os.path.abspath(file_path))
            logger.debug(f"已注册临时文件: {file_path}")
        return file_path
    
    def unregister_temp_file(self, file_path: str) -> bool:
        """
        取消注册临时文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否成功取消注册
        """
        abs_path = os.path.abspath(file_path)
        if abs_path in self.temp_files:
            self.temp_files.remove(abs_path)
            logger.debug(f"已取消注册临时文件: {file_path}")
            return True
        return False
    
    def cleanup_temp_file(self, file_path: str) -> bool:
        """
        清理单个临时文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否清理成功
        """
        try:
            # 先从注册表中移除
            self.unregister_temp_file(file_path)
            
            # 清理文件
            return cleanup_file(file_path)
            
        except Exception as e:
            logger.error(f"清理临时文件失败 {file_path}: {e}")
            return False
    
    def cleanup_temp_files(self) -> int:
        """
        清理所有注册的临时文件
        
        Returns:
            成功清理的文件数量
        """
        cleaned_count = 0
        files_to_clean = list(self.temp_files)  # 复制列表避免迭代时修改
        
        for file_path in files_to_clean:
            if self.cleanup_temp_file(file_path):
                cleaned_count += 1
        
        logger.info(f"已清理 {cleaned_count}/{len(files_to_clean)} 个临时文件")
        return cleaned_count
    
    @contextmanager
    def temp_file_context(self, file_path: str):
        """
        临时文件上下文管理器
        
        Args:
            file_path: 文件路径
        """
        try:
            # 注册文件
            self.register_temp_file(file_path)
            yield file_path
        finally:
            # 自动清理
            if self.config.auto_cleanup_temp_files:
                self.cleanup_temp_file(file_path)
    
    @contextmanager
    def managed_resources(self):
        """资源管理上下文"""
        try:
            yield self
        finally:
            if self.config.auto_cleanup_temp_files:
                self.cleanup_temp_files()
    
    def cleanup_all_resources(self) -> None:
        """清理所有资源"""
        try:
            # 清理临时文件
            if self.temp_files:
                logger.info(f"开始清理 {len(self.temp_files)} 个临时文件...")
                self.cleanup_temp_files()
            
            # 清理其他资源...
            logger.debug("资源清理完成")
            
        except Exception as e:
            logger.error(f"资源清理过程中出现异常: {e}")
    
    def get_resource_stats(self) -> dict:
        """获取资源统计信息"""
        total_files = len(self.temp_files)
        total_size = sum(get_file_size(f) for f in self.temp_files if os.path.exists(f))
        
        return {
            "temp_files_count": total_files,
            "temp_files_total_size": total_size,
            "temp_files_total_size_formatted": format_file_size(total_size),
            "temp_dirs_count": len(self.temp_dirs),
            "max_file_size_limit": self.config.max_temp_file_size,
            "max_file_size_limit_formatted": format_file_size(self.config.max_temp_file_size)
        }
    
    def check_temp_file_size(self, file_path: str) -> bool:
        """检查临时文件大小是否超限"""
        if not os.path.exists(file_path):
            return True
        file_size = os.path.getsize(file_path)
        if file_size > self.config.max_temp_file_size:
            logger.warning(
                f"临时文件超出大小限制: {file_path} "
                f"({file_size} > {self.config.max_temp_file_size})"
            )
            return False
        return True 