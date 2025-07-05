"""进度管理器"""

import requests
from typing import Optional
from loguru import logger

from worker.config.worker_config import worker_config
from worker.utils.worker_utils import format_progress_message


class ProgressManager:
    """进度管理器，仅负责进度回调和日志"""
    
    def __init__(self, config=None):
        self.config = config or worker_config
    
    def update_progress(self, task_id: str, current: int, total: int = None) -> None:
        """
        更新进度（仅日志）
        """
        try:
            progress_msg = format_progress_message(current, total or 0, "任务")
            logger.debug(f"任务 {task_id} {progress_msg}")
        except Exception as e:
            logger.error(f"更新进度失败 {task_id}: {e}")
    
    def send_progress_callback(self, doc_id: int, status: str, current_offset: Optional[int] = None, retry_count: int = 0, chunk_count: Optional[int] = None, fail_reason: Optional[str] = None) -> bool:
        """
        发送进度回调到API服务
        """
        if not doc_id:
            logger.warning("doc_id为空，跳过进度回调")
            return False
        try:
            params = {"status": status}
            if current_offset is not None:
                params["parse_offset"] = current_offset
            if chunk_count is not None:
                params["chunk_count"] = chunk_count
            if fail_reason is not None:
                params["fail_reason"] = fail_reason
            url = f"{self.config.api_base_url}/api/docs/{doc_id}/parse_progress"
            response = requests.post(
                url,
                json=params,
                timeout=self.config.callback_timeout
            )
            if response.status_code == 200:
                logger.debug(f"进度回调成功: doc_id={doc_id}, status={status}, offset={current_offset}, chunk_count={chunk_count}, fail_reason={fail_reason}")
                return True
            else:
                logger.warning(f"进度回调失败: HTTP {response.status_code}, doc_id={doc_id}")
                return False
        except requests.exceptions.Timeout:
            logger.warning(f"进度回调超时: doc_id={doc_id}")
            return self._retry_callback(doc_id, status, current_offset, retry_count)
        except requests.exceptions.RequestException as e:
            logger.warning(f"进度回调网络异常: doc_id={doc_id}, error={e}")
            return self._retry_callback(doc_id, status, current_offset, retry_count)
        except Exception as e:
            logger.error(f"进度回调未知异常: doc_id={doc_id}, error={e}")
            return False
    
    def _retry_callback(self, doc_id: int, status: str, current_offset: Optional[int], retry_count: int) -> bool:
        if retry_count >= self.config.callback_retry_times:
            logger.error(f"进度回调重试次数已用尽: doc_id={doc_id}")
            return False
        logger.info(f"准备重试进度回调: doc_id={doc_id}, 重试次数={retry_count + 1}")
        import time
        time.sleep(min(2 ** retry_count, 10))
        return self.send_progress_callback(doc_id, status, current_offset, retry_count + 1)
    
    def send_status_callback(self, doc_id: int, status: str) -> bool:
        """
        发送状态回调
        """
        return self.send_progress_callback(doc_id, status, None)
    
    def notify_task_start(self, task_id: str, doc_id: int) -> None:
        """
        通知任务开始
        """
        self.update_progress(task_id, 0, None)
        self.send_progress_callback(doc_id, "processing", current_offset=0)
    
    def notify_task_complete(self, task_id: str, doc_id: int, total_processed: int, chunk_count: Optional[int] = None) -> None:
        """
        通知任务完成
        """
        self.update_progress(task_id, total_processed, total_processed)
        self.send_progress_callback(doc_id, "processed", current_offset=chunk_count, chunk_count=chunk_count)
    
    def notify_task_failed(self, task_id: str, doc_id: int, error_message: str, chunk_count: Optional[int] = None, cancelled: bool = False) -> None:
        """
        通知任务失败或取消
        """
        self.update_progress(task_id, 0, None)
        status = "cancelled" if cancelled else "failed"
        self.send_progress_callback(doc_id, status, 0, chunk_count=chunk_count, fail_reason=error_message) 