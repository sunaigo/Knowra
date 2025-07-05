"""Worker工具函数"""

import os
import time
import tempfile
import functools
from typing import Optional, Any, Callable
from pathlib import Path
from loguru import logger


def ensure_directory(directory: str) -> str:
    """确保目录存在，返回绝对路径"""
    abs_dir = os.path.abspath(directory)
    os.makedirs(abs_dir, exist_ok=True)
    return abs_dir


def get_file_extension(file_path: str) -> str:
    """获取文件扩展名（不含点号）"""
    return Path(file_path).suffix.lstrip('.').lower()


def get_file_size(file_path: str) -> int:
    """获取文件大小（字节）"""
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0


def is_oss_path(file_path: str) -> bool:
    """判断是否为OSS路径"""
    return str(file_path).startswith('oss://')


def create_temp_file(suffix: str = "", dir: str = None) -> str:
    """创建临时文件，返回文件路径"""
    if dir:
        ensure_directory(dir)
    
    temp_file = tempfile.NamedTemporaryFile(
        delete=False, 
        suffix=suffix, 
        dir=dir
    )
    temp_file.close()
    return temp_file.name


def cleanup_file(file_path: str) -> bool:
    """清理文件"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"已清理文件: {file_path}")
            return True
        return False
    except Exception as e:
        logger.warning(f"清理文件失败 {file_path}: {e}")
        return False


def format_file_size(size_bytes: int) -> str:
    """格式化文件大小显示"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"


def performance_monitor(func: Callable) -> Callable:
    """性能监控装饰器"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed_time = time.time() - start_time
            logger.debug(f"{func.__name__} 执行时间: {elapsed_time:.2f}秒")
            return result
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"{func.__name__} 执行失败 ({elapsed_time:.2f}秒): {e}")
            raise
    return wrapper


def safe_execute(func: Callable, *args, default=None, log_error=True, **kwargs) -> Any:
    """安全执行函数，捕获异常并返回默认值"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        if log_error:
            logger.error(f"执行函数 {func.__name__} 失败: {e}")
        return default


def validate_task_params(params: dict) -> bool:
    """验证任务参数完整性"""
    required_fields = ['task_id', 'file', 'parse_params']
    for field in required_fields:
        if field not in params:
            logger.error(f"缺少必需字段: {field}")
            return False
    return True


def format_progress_message(current: int, total: int, task_type: str = "处理") -> str:
    """格式化进度消息"""
    if total > 0:
        percentage = (current / total) * 100
        return f"{task_type}进度: {current}/{total} ({percentage:.1f}%)"
    return f"{task_type}进度: {current}" 