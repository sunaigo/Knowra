"""任务状态管理器"""

from typing import Optional, Dict, Any
from loguru import logger

from common.utils.redis_client import get_redis, set_key, get_key, delete_key, exists_key
from common.schemas.worker import TaskState
from worker.config.worker_config import worker_config
from worker.exceptions.worker_exceptions import TaskStateException, TaskCancelledException


class TaskStateManager:
    """任务状态管理器，统一管理Redis中的任务状态"""
    
    def __init__(self, config=None):
        self.config = config or worker_config
        self.redis_client = get_redis()
    
    def _get_task_key(self, task_id: str) -> str:
        """获取任务状态Redis key"""
        return f"doc:parse:{task_id}"
    
    def set_task_state(self, task_id: str, state: TaskState, details: Dict[str, Any] = None) -> bool:
        """
        设置任务状态
        
        Args:
            task_id: 任务ID
            state: 任务状态
            details: 额外详情
            
        Returns:
            是否设置成功
        """
        try:
            task_key = self._get_task_key(task_id)
            task_data = {
                "state": state.value,
                "timestamp": self._get_current_timestamp(),
                "details": details or {}
            }
            
            import json
            success = set_key(task_key, json.dumps(task_data), ex=self.config.task_state_ttl)
            
            if success:
                logger.debug(f"任务状态已更新: {task_id} -> {state.value}")
            else:
                logger.error(f"任务状态更新失败: {task_id}")
            
            return bool(success)
            
        except Exception as e:
            logger.error(f"设置任务状态失败 {task_id}: {e}")
            raise TaskStateException(f"设置任务状态失败: {e}")
    
    def get_task_state(self, task_id: str) -> Optional[TaskState]:
        """
        获取任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            任务状态，如果不存在返回None
        """
        try:
            task_key = self._get_task_key(task_id)
            data = get_key(task_key)
            
            if not data:
                return None
            
            import json
            task_info = json.loads(data.decode('utf-8'))
            state_value = task_info.get('state')
            
            try:
                return TaskState(state_value)
            except ValueError:
                logger.warning(f"未知的任务状态值: {state_value}")
                return None
                
        except Exception as e:
            logger.error(f"获取任务状态失败 {task_id}: {e}")
            return None
    
    def is_task_cancelled(self, task_id: str) -> bool:
        """
        检查任务是否已被取消
        
        Args:
            task_id: 任务ID
            
        Returns:
            是否已取消
        """
        try:
            task_key = self._get_task_key(task_id)
            exists = exists_key(task_key)
            return not exists
        except Exception as e:
            logger.error(f"检查任务取消状态失败 {task_id}: {e}")
            return False
    
    def _delete_task_keys(self, task_id: str) -> int:
        """
        删除任务状态的Redis key，不打日志
        """
        task_key = self._get_task_key(task_id)
        return delete_key(task_key)
    
    def cancel_task(self, task_id: str) -> bool:
        """
        主动取消任务（用户/接口调用）
        """
        try:
            deleted_count = self._delete_task_keys(task_id)
            if deleted_count > 0:
                logger.info(f"任务已取消: {task_id}")
                return True
            else:
                logger.warning(f"任务取消失败，可能已不存在: {task_id}")
                return False
        except Exception as e:
            logger.error(f"取消任务失败 {task_id}: {e}")
            raise TaskStateException(f"取消任务失败: {e}")

    def cleanup_task_state(self, task_id: str) -> bool:
        """
        自动清理任务状态（worker正常结束/定时清理）
        """
        try:
            deleted_count = self._delete_task_keys(task_id)
            logger.info(f"任务状态已清理: {task_id}")
            return deleted_count > 0
        except Exception as e:
            logger.error(f"任务状态清理失败 {task_id}: {e}")
            return False
    
    def check_task_cancellation(self, task_id: str) -> None:
        """
        检查任务是否被取消，如果被取消则抛出异常
        
        Args:
            task_id: 任务ID
            
        Raises:
            TaskCancelledException: 任务已被取消
        """
        cancelled = self.is_task_cancelled(task_id)
        if cancelled:
            raise TaskCancelledException(f"任务已被取消: {task_id}")
    
    def _get_current_timestamp(self) -> float:
        """获取当前时间戳"""
        import time
        return time.time() 