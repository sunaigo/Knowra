"""文件管理服务"""

import os
import tempfile
from typing import Optional, Dict, Any
from loguru import logger

from common.utils.oss_client import OSSClient
from common.core.encryption import decrypt_api_key
from worker.config.worker_config import worker_config
from worker.utils.worker_utils import is_oss_path, get_file_extension, ensure_directory, create_temp_file
from worker.exceptions.worker_exceptions import FileDownloadException, FileHandleException
from worker.managers.resource_manager import ResourceManager


class FileManager:
    """文件管理服务，负责文件下载、管理和清理"""
    
    def __init__(self, resource_manager: ResourceManager = None, config=None):
        self.config = config or worker_config
        self.resource_manager = resource_manager or ResourceManager(config)
    
    def download_file(self, file_path: str, oss_params: Optional[Dict[str, Any]] = None) -> str:
        """
        下载文件到本地临时目录
        
        Args:
            file_path: 文件路径（本地路径或OSS路径）
            oss_params: OSS连接参数
            
        Returns:
            本地文件路径
            
        Raises:
            FileDownloadException: 文件下载失败
        """
        try:
            if is_oss_path(file_path):
                return self._download_oss_file(file_path, oss_params)
            else:
                return self._handle_local_file(file_path)
                
        except Exception as e:
            logger.error(f"文件下载失败 {file_path}: {e}")
            raise FileDownloadException(f"文件下载失败: {e}")
    
    def _download_oss_file(self, file_path: str, oss_params: Dict[str, Any]) -> str:
        """从OSS下载文件"""
        if not oss_params:
            raise FileDownloadException("缺少OSS连接参数")
        
        try:
            # 解析OSS路径
            oss_bucket = oss_params.get('bucket')
            if not oss_bucket:
                raise FileDownloadException("缺少OSS bucket信息")
            
            oss_key = file_path.replace(f'oss://{oss_bucket}/', '')
            
            # 准备临时目录
            temp_dir = self.resource_manager.ensure_temp_directory()
            
            # 创建临时文件
            file_ext = get_file_extension(oss_key)
            temp_file_path = create_temp_file(
                suffix=f".{file_ext}" if file_ext else "",
                dir=temp_dir
            )
            
            # 解密API密钥
            access_key = decrypt_api_key(oss_params['access_key'])
            secret_key = decrypt_api_key(oss_params['secret_key'])
            
            # 创建OSS客户端并下载
            oss_client = OSSClient(
                endpoint_url=oss_params['endpoint'],
                access_key=access_key,
                secret_key=secret_key,
                region=oss_params.get('region')
            )
            
            oss_client.download_file(oss_bucket, oss_key, temp_file_path)
            
            # 注册临时文件
            self.resource_manager.register_temp_file(temp_file_path)
            
            # 检查文件大小
            if not self.resource_manager.check_temp_file_size(temp_file_path):
                self.resource_manager.cleanup_temp_file(temp_file_path)
                raise FileDownloadException("下载的文件超出大小限制")
            
            logger.info(f"OSS文件下载成功: {file_path} -> {temp_file_path}")
            return temp_file_path
            
        except Exception as e:
            logger.error(f"OSS文件下载失败 {file_path}: {e}")
            raise FileDownloadException(f"OSS文件下载失败: {e}")
    
    def _handle_local_file(self, file_path: str) -> str:
        """处理本地文件"""
        try:
            if not os.path.exists(file_path):
                raise FileDownloadException(f"本地文件不存在: {file_path}")
            
            # 检查文件大小
            if not self.resource_manager.check_temp_file_size(file_path):
                raise FileDownloadException("文件超出大小限制")
            
            logger.debug(f"使用本地文件: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"本地文件处理失败 {file_path}: {e}")
            raise FileDownloadException(f"本地文件处理失败: {e}")
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        获取文件信息
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件信息字典
        """
        try:
            if not os.path.exists(file_path):
                return {
                    "path": file_path,
                    "exists": False,
                    "size": 0,
                    "extension": get_file_extension(file_path),
                    "is_oss": is_oss_path(file_path)
                }
            
            file_size = os.path.getsize(file_path)
            
            return {
                "path": file_path,
                "exists": True,
                "size": file_size,
                "size_formatted": self._format_file_size(file_size),
                "extension": get_file_extension(file_path),
                "is_oss": is_oss_path(file_path),
                "basename": os.path.basename(file_path)
            }
            
        except Exception as e:
            logger.error(f"获取文件信息失败 {file_path}: {e}")
            return {
                "path": file_path,
                "exists": False,
                "size": 0,
                "extension": "",
                "is_oss": is_oss_path(file_path),
                "error": str(e)
            }
    
    def cleanup_file(self, file_path: str) -> bool:
        """
        清理文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否清理成功
        """
        return self.resource_manager.cleanup_temp_file(file_path)
    
    def is_file_supported(self, file_path: str, supported_extensions: list = None) -> bool:
        """
        检查文件类型是否支持
        
        Args:
            file_path: 文件路径
            supported_extensions: 支持的扩展名列表
            
        Returns:
            是否支持
        """
        if not supported_extensions:
            supported_extensions = ['pdf', 'txt', 'md']
        
        file_ext = get_file_extension(file_path)
        return file_ext.lower() in [ext.lower() for ext in supported_extensions]
    
    def validate_file_access(self, file_path: str, oss_params: Optional[Dict[str, Any]] = None) -> bool:
        """
        验证文件访问权限
        
        Args:
            file_path: 文件路径
            oss_params: OSS参数
            
        Returns:
            是否可访问
        """
        try:
            if is_oss_path(file_path):
                # OSS文件访问验证
                if not oss_params:
                    return False
                # 这里可以添加更多OSS访问验证逻辑
                return True
            else:
                # 本地文件访问验证
                return os.path.exists(file_path) and os.access(file_path, os.R_OK)
                
        except Exception as e:
            logger.error(f"文件访问验证失败 {file_path}: {e}")
            return False
    
    def _format_file_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        from worker.utils.worker_utils import format_file_size
        return format_file_size(size_bytes) 