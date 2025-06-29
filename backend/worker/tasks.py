from celery import current_task
from backend.worker.celery_app import app
from backend.worker.parser import parse_file_with_progress
import traceback
import requests
from typing import Optional

@app.task(bind=True, name='backend.worker.tasks.parse_file_task')
def parse_file_task(self, task_id: str, file_path: str, filetype: str, 
                   chunk_size: int, overlap: int, parse_offset: int = 0, 
                   callback_url: Optional[str] = None, **kwargs):
    """
    分布式文件解析任务
    
    Args:
        task_id: 业务任务ID
        file_path: 文件路径
        filetype: 文件类型
        chunk_size: 切块大小
        overlap: 重叠大小
        parse_offset: 断点续传位置
        callback_url: 回调URL（可选）
        **kwargs: 其他参数
    """
    celery_task_id = self.request.id
    
    def progress_callback(progress: int, status: str, current_offset: int = None):
        """进度回调函数"""
        # 更新Celery任务状态
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': progress,
                'status': status,
                'current_offset': current_offset,
                'task_id': task_id
            }
        )
        
        # 回调主后端（如果提供了回调URL）
        if callback_url:
            try:
                requests.post(
                    callback_url,
                    json={
                        'celery_task_id': celery_task_id,
                        'task_id': task_id,
                        'status': status,
                        'progress': progress,
                        'current_offset': current_offset
                    },
                    timeout=5
                )
            except Exception as e:
                print(f"回调失败: {e}")
    
    try:
        # 任务开始
        progress_callback(0, 'starting')
        
        # 执行文件解析
        result = parse_file_with_progress(
            task_id=task_id,
            file_path=file_path,
            filetype=filetype,
            chunk_size=chunk_size,
            overlap=overlap,
            parse_offset=parse_offset,
            progress_callback=progress_callback,
            celery_task=self,  # 传递celery任务实例，用于检查撤销状态
            **kwargs
        )
        
        # 任务完成
        progress_callback(100, 'completed')
        
        # 最终回调
        if callback_url:
            try:
                requests.post(
                    callback_url,
                    json={
                        'celery_task_id': celery_task_id,
                        'task_id': task_id,
                        'status': 'SUCCESS',
                        'progress': 100,
                        'result': result
                    },
                    timeout=5
                )
            except Exception as e:
                print(f"完成回调失败: {e}")
        
        return {
            'status': 'SUCCESS',
            'task_id': task_id,
            'result': result
        }
        
    except Exception as exc:
        # 任务失败
        error_msg = str(exc)
        error_trace = traceback.format_exc()
        
        progress_callback(0, 'failed')
        
        # 失败回调
        if callback_url:
            try:
                requests.post(
                    callback_url,
                    json={
                        'celery_task_id': celery_task_id,
                        'task_id': task_id,
                        'status': 'FAILURE',
                        'progress': 0,
                        'error': error_msg,
                        'traceback': error_trace
                    },
                    timeout=5
                )
            except Exception as e:
                print(f"失败回调失败: {e}")
        
        # 更新Celery任务状态
        self.update_state(
            state='FAILURE',
            meta={
                'task_id': task_id,
                'error': error_msg,
                'traceback': error_trace
            }
        )
        
        # 重新抛出异常
        raise

@app.task(bind=True, name='backend.worker.tasks.pause_task')
def pause_task(self, celery_task_id: str):
    """暂停任务"""
    app.control.revoke(celery_task_id, terminate=False)
    return {'status': 'paused', 'celery_task_id': celery_task_id}

@app.task(bind=True, name='backend.worker.tasks.terminate_task')
def terminate_task(self, celery_task_id: str):
    """终止任务"""
    app.control.revoke(celery_task_id, terminate=True)
    return {'status': 'terminated', 'celery_task_id': celery_task_id} 