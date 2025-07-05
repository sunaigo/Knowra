import os
from typing import Optional
from pydantic import BaseModel, Field


class WorkerConfig(BaseModel):
    """Worker配置管理"""
    
    # Redis配置
    redis_host: str = Field(default="127.0.0.1", description="Redis主机地址")
    redis_port: int = Field(default=6379, description="Redis端口")
    redis_db: int = Field(default=0, description="Redis数据库")
    redis_password: Optional[str] = Field(default=None, description="Redis密码")
    
    # 临时文件配置
    temp_dir: str = Field(default="./uploads/tmp", description="临时文件目录")
    temp_file_ttl: int = Field(default=3600, description="临时文件生存时间(秒)")
    
    # 任务配置
    task_timeout: int = Field(default=3600, description="任务超时时间(秒)")
    max_parallel_workers: int = Field(default=3, description="最大并行worker数")
    progress_report_interval: int = Field(default=10, description="进度上报间隔(处理块数)")
    
    # 回调配置
    api_base_url: str = Field(default="http://127.0.0.1:8000", description="API服务基础URL")
    callback_timeout: int = Field(default=5, description="回调请求超时时间(秒)")
    callback_retry_times: int = Field(default=3, description="回调重试次数")
    
    # 任务状态管理
    task_state_prefix: str = Field(default="task:parse", description="任务状态Redis key前缀")
    task_state_ttl: int = Field(default=86400, description="任务状态TTL(秒)")
    
    # 资源管理
    auto_cleanup_temp_files: bool = Field(default=True, description="是否自动清理临时文件")
    max_temp_file_size: int = Field(default=100 * 1024 * 1024, description="最大临时文件大小(字节)")
    
    @classmethod
    def from_env(cls) -> "WorkerConfig":
        """从环境变量创建配置"""
        return cls(
            redis_host=os.getenv("REDIS_HOST", "127.0.0.1"),
            redis_port=int(os.getenv("REDIS_PORT", "6379")),
            redis_db=int(os.getenv("REDIS_DB", "0")),
            redis_password=os.getenv("REDIS_PASSWORD"),
            
            temp_dir=os.getenv("TMP_UPLOAD_DIR", "./uploads/tmp"),
            temp_file_ttl=int(os.getenv("TEMP_FILE_TTL", "3600")),
            
            task_timeout=int(os.getenv("TASK_TIMEOUT", "3600")),
            max_parallel_workers=int(os.getenv("MAX_PARALLEL_WORKERS", "3")),
            progress_report_interval=int(os.getenv("PROGRESS_REPORT_INTERVAL", "10")),
            
            api_base_url=os.getenv("API_BASE_URL", "http://127.0.0.1:8000"),
            callback_timeout=int(os.getenv("CALLBACK_TIMEOUT", "5")),
            callback_retry_times=int(os.getenv("CALLBACK_RETRY_TIMES", "3")),
            
            task_state_prefix=os.getenv("TASK_STATE_PREFIX", "task:parse"),
            task_state_ttl=int(os.getenv("TASK_STATE_TTL", "86400")),
            
            auto_cleanup_temp_files=os.getenv("AUTO_CLEANUP_TEMP_FILES", "true").lower() == "true",
            max_temp_file_size=int(os.getenv("MAX_TEMP_FILE_SIZE", str(100 * 1024 * 1024))),
        )


# 全局配置实例
worker_config = WorkerConfig.from_env() 