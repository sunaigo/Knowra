"""重构后的Celery任务定义 - 专注于任务生命周期管理"""

import logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)

import traceback
from typing import Dict, Any
from loguru import logger

from worker.celery_app import app
from worker.services.document_processor import DocumentProcessor
from worker.managers.task_state_manager import TaskStateManager
from common.schemas.worker import TaskState
from worker.managers.progress_manager import ProgressManager
from worker.managers.resource_manager import ResourceManager
from worker.exceptions.worker_exceptions import (
    WorkerBaseException, ValidationException, TaskCancelledException
)
from common.schemas.worker import ParseFileTaskParams


# 全局管理器实例
task_state_manager = TaskStateManager()
progress_manager = ProgressManager()
resource_manager = ResourceManager()


@app.task(bind=True, name='backend.worker.tasks.parse_file_task')
def parse_file_task(self, params: dict) -> Dict[str, Any]:
    """
    分布式文件解析任务
    
    Args:
        params: 任务参数，dict，需符合 ParseFileTaskParams schema
        
    Returns:
        任务结果
    """
    try:
        task_params = ParseFileTaskParams(**params)
    except Exception as e:
        logger.error(f"[Worker] 任务参数解析失败: {e}")
        return {
            'status': 'FAILED',
            'error': f'参数解析失败: {e}',
            'task_id': params.get('task_id', 'unknown')
        }
    
    task_id = task_params.task_id
    celery_task_id = self.request.id
    
    logger.info(f"[Worker] 收到解析任务: task_id={task_id}, celery_id={celery_task_id}")
    
    # 设置Redis key用于任务状态管理
    redis_key = f"doc:parse:{task_id}"
    task_state_manager.set_task_state(task_id, TaskState.PENDING, {
        "celery_task_id": celery_task_id,
        "started_at": task_state_manager._get_current_timestamp()
    })
    
    document_processor = DocumentProcessor()
    vdb = None
    vdb_initialized = False
    doc_id = int(task_params.doc_id) if task_params.doc_id else None
    result = None
    try:
        # 统一资源管理上下文，保证vdb连接在清理前不关闭
        with resource_manager.managed_resources():
            try:
                # 业务主流程
                # 1. 参数校验、文件下载、文本解析
                # 2. 初始化vdb（在流式分块前）
                # 这里我们需要在process_document前后插入vdb初始化标记
                # 由于vdb初始化在DocumentProcessor._stream_process_chunks里，需在DocumentProcessor中加hook或返回vdb
                # 这里用一个简单方案：让process_document返回(vdb, result)，主流程只在vdb初始化后设置vdb_initialized
                # 但为兼容原有结构，采用try/except包裹vdb初始化后所有分块相关操作
                #
                # 下面是伪代码，实际需在DocumentProcessor中暴露vdb
                # 这里假设DocumentProcessor有个属性last_vdb
                result = None
                try:
                    result = document_processor.process_document(task_params)
                    vdb = getattr(document_processor, 'last_vdb', None)
                    if vdb is not None:
                        vdb_initialized = True
                except TaskCancelledException:
                    vdb = getattr(document_processor, 'last_vdb', None)
                    if vdb is not None:
                        vdb_initialized = True
                    raise
                except Exception:
                    vdb = getattr(document_processor, 'last_vdb', None)
                    if vdb is not None:
                        vdb_initialized = True
                    raise
                logger.info(f"[Worker] 解析任务完成: task_id={task_id}, result={result}")
                return {
                    'status': 'SUCCESS',
                    'task_id': task_id,
                    'celery_task_id': celery_task_id,
                    'result': result
                }
            except TaskCancelledException:
                logger.warning(f"[Worker] 任务已被取消: task_id={task_id}")
                # 只有vdb已初始化才清理分块
                if vdb_initialized and vdb:
                    try:
                        document_processor._delete_existing_chunks(doc_id, vdb)
                    except Exception as e:
                        logger.warning(f"[Worker] 任务取消时分块清理失败: {e}")
                progress_manager.notify_task_failed(
                    task_id,
                    doc_id,
                    "任务被取消",
                    cancelled=True
                )
                task_state_manager.set_task_state(task_id, TaskState.CANCELLED)
                return {
                    'status': 'CANCELLED',
                    'task_id': task_id,
                    'celery_task_id': celery_task_id,
                    'error': '任务已被取消',
                    'error_type': 'Cancelled'
                }
            except (ValidationException, WorkerBaseException) as e:
                logger.error(f"[Worker] 业务处理失败: task_id={task_id}, error={e}")
                if vdb_initialized and vdb:
                    try:
                        document_processor._delete_existing_chunks(doc_id, vdb)
                    except Exception as e2:
                        logger.warning(f"[Worker] 业务异常时分块清理失败: {e2}")
                progress_manager.notify_task_failed(
                    task_id,
                    doc_id,
                    str(e)
                )
                task_state_manager.set_task_state(task_id, TaskState.FAILED, {
                    "error": str(e),
                    "finished_at": task_state_manager._get_current_timestamp()
                })
                return {
                    'status': 'FAILED',
                    'task_id': task_id,
                    'celery_task_id': celery_task_id,
                    'error': str(e),
                    'error_type': e.__class__.__name__,
                    'error_details': getattr(e, 'details', {})
                }
            except Exception as exc:
                error_msg = str(exc)
                error_trace = traceback.format_exc()
                logger.error(f"[Worker] 未预期异常: task_id={task_id}, error={error_msg}\n{error_trace}")
                if vdb_initialized and vdb:
                    try:
                        document_processor._delete_existing_chunks(doc_id, vdb)
                    except Exception as e2:
                        logger.warning(f"[Worker] 未预期异常时分块清理失败: {e2}")
                progress_manager.notify_task_failed(
                    task_id,
                    doc_id,
                    error_msg
                )
                task_state_manager.set_task_state(task_id, TaskState.FAILED, {
                    "error": error_msg,
                    "error_trace": error_trace,
                    "finished_at": task_state_manager._get_current_timestamp()
                })
                return {
                    'status': 'FAILED',
                    'task_id': task_id,
                    'celery_task_id': celery_task_id,
                    'error': error_msg,
                    'error_type': 'UnexpectedError'
                }
    finally:
        # 清理任务状态
        task_state_manager.cleanup_task_state(task_id)
        logger.info(f"[Worker] 任务清理完成: task_id={task_id}")


@app.task(bind=True, name='backend.worker.tasks.terminate_task')
def terminate_task(self, task_id: str) -> Dict[str, Any]:
    """
    终止任务
    
    Args:
        task_id: 任务ID（使用task_id而不是filename，更语义化）
        
    Returns:
        终止结果
    """
    celery_task_id = self.request.id
    logger.info(f"[Worker] 收到终止任务请求: task_id={task_id}, celery_id={celery_task_id}")
    
    try:
        # 取消任务状态
        cancelled = task_state_manager.cancel_task(task_id)
        
        result = {
            'status': 'terminated',
            'task_id': task_id,
            'celery_task_id': celery_task_id,
            'cancelled': cancelled
        }
        
        logger.info(f"[Worker] 发出终止指令: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[Worker] 任务终止失败: task_id={task_id}, error={e}")
        return {
            'status': 'error',
            'task_id': task_id,
            'celery_task_id': celery_task_id,
            'error': str(e)
        }


@app.task(name='backend.worker.tasks.get_task_status')
def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    获取任务状态
    Args:
        task_id: 任务ID
    Returns:
        任务状态信息
    """
    try:
        # 获取任务状态
        task_state = task_state_manager.get_task_state(task_id)
        task_details = task_state_manager.get_task_details(task_id)
        if task_state is None:
            return {
                'status': 'not_found',
                'task_id': task_id,
                'message': '任务不存在或已过期'
            }
        result = {
            'status': 'success',
            'task_id': task_id,
            'state': task_state.value,
            'details': task_details
        }
        logger.debug(f"[Worker] 任务状态查询: {result}")
        return result
    except Exception as e:
        logger.error(f"[Worker] 获取任务状态失败: task_id={task_id}, error={e}")
        return {
            'status': 'error',
            'task_id': task_id,
            'error': str(e)
        }


@app.task(name='backend.worker.tasks.cleanup_expired_tasks')
def cleanup_expired_tasks() -> Dict[str, Any]:
    """
    清理过期任务状态（定时任务）
    
    Returns:
        清理结果
    """
    try:
        # 这里可以实现更复杂的清理逻辑
        # 目前Redis会自动根据TTL清理过期数据
        
        # 获取资源统计信息
        resource_stats = resource_manager.get_resource_stats()
        
        # 清理过期的临时文件
        cleaned_files = resource_manager.cleanup_temp_files()
        
        result = {
            'status': 'success',
            'cleaned_files': cleaned_files,
            'resource_stats': resource_stats,
            'timestamp': task_state_manager._get_current_timestamp()
        }
        
        logger.info(f"[Worker] 清理任务完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[Worker] 清理任务失败: {e}")
        return {
            'status': 'error',
            'error': str(e)
        } 