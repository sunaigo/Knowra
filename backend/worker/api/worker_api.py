from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.worker.celery_app import app as celery_app
from backend.worker.tasks import parse_file_task, pause_task, terminate_task
import time

router = APIRouter(prefix="/worker", tags=["worker"])

class WorkerRegisterRequest(BaseModel):
    worker_id: str
    host: str
    port: int
    max_concurrent: int
    meta: Optional[Dict[str, Any]] = None

class WorkerStatusCallback(BaseModel):
    worker_id: str
    task_id: str
    status: str
    progress: Optional[int] = None
    parse_offset: Optional[int] = None
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class StartTaskRequest(BaseModel):
    task_id: str
    file_path: str
    filetype: str
    chunk_size: int
    overlap: int
    parse_offset: Optional[int] = 0
    callback_url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class TaskControlRequest(BaseModel):
    celery_task_id: str

# Worker信息管理（简化版，实际可存储到Redis）
worker_info = {}

@router.post("/register")
def register_worker(data: WorkerRegisterRequest):
    """Worker注册/心跳"""
    worker_info.update(data.dict())
    worker_info['last_heartbeat'] = time.time()
    return {"code": 200, "message": "worker注册/心跳成功"}

@router.get("/list")
def list_workers():
    """获取worker信息"""
    return {"code": 200, "data": [worker_info] if worker_info else []}

@router.post("/callback")
def worker_callback(data: WorkerStatusCallback):
    """处理worker推送的任务进度/状态（保留兼容性）"""
    return {"code": 200, "message": "回调已处理"}

@router.post("/start_task")
def start_task(data: StartTaskRequest):
    """启动新任务 - 使用Celery分布式处理"""
    try:
        # 提交任务到Celery队列
        celery_task = parse_file_task.delay(
            task_id=data.task_id,
            file_path=data.file_path,
            filetype=data.filetype,
            chunk_size=data.chunk_size,
            overlap=data.overlap,
            parse_offset=data.parse_offset or 0,
            callback_url=data.callback_url,
            **(data.meta or {})
        )
        
        return {
            "code": 200, 
            "message": "任务已提交到分布式队列",
            "data": {
                "celery_task_id": celery_task.id,
                "task_id": data.task_id,
                "status": "submitted"
            }
        }
    except Exception as e:
        return {"code": 500, "message": f"任务提交失败: {str(e)}"}

@router.post("/pause_task")
def pause_task_endpoint(data: TaskControlRequest):
    """暂停任务"""
    try:
        # 撤销Celery任务（不终止正在运行的进程）
        celery_app.control.revoke(data.celery_task_id, terminate=False)
        return {"code": 200, "message": "任务已暂停"}
    except Exception as e:
        return {"code": 500, "message": f"暂停任务失败: {str(e)}"}

@router.post("/resume_task")
def resume_task(data: StartTaskRequest):
    """恢复任务 - 实际上是重新提交任务"""
    # 注意：Celery撤销的任务无法直接恢复，需要重新提交
    return start_task(data)

@router.post("/terminate_task")
def terminate_task_endpoint(data: TaskControlRequest):
    """终止任务"""
    try:
        # 撤销并终止Celery任务
        celery_app.control.revoke(data.celery_task_id, terminate=True)
        return {"code": 200, "message": "任务已终止"}
    except Exception as e:
        return {"code": 500, "message": f"终止任务失败: {str(e)}"}

@router.get("/task_status")
def task_status(celery_task_id: str):
    """查询任务状态"""
    try:
        result = celery_app.AsyncResult(celery_task_id)
        
        status_data = {
            "celery_task_id": celery_task_id,
            "status": result.status,
            "progress": 0,
            "meta": {}
        }
        
        if result.info:
            if isinstance(result.info, dict):
                status_data.update({
                    "progress": result.info.get('progress', 0),
                    "meta": result.info,
                    "task_id": result.info.get('task_id'),
                    "current_offset": result.info.get('current_offset')
                })
            else:
                status_data["meta"] = {"info": str(result.info)}
        
        return {"code": 200, "data": status_data}
    except Exception as e:
        return {"code": 500, "message": f"查询任务状态失败: {str(e)}"}

@router.get("/heartbeat")
def heartbeat():
    """心跳检查"""
    worker_info['last_heartbeat'] = time.time()
    
    # 获取Celery worker状态
    try:
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        stats = inspect.stats()
        
        return {
            "code": 200, 
            "message": "ok", 
            "data": {
                "timestamp": worker_info['last_heartbeat'],
                "celery_workers": list(active_tasks.keys()) if active_tasks else [],
                "active_tasks_count": sum(len(tasks) for tasks in active_tasks.values()) if active_tasks else 0,
                "worker_stats": stats
            }
        }
    except Exception as e:
        return {
            "code": 200, 
            "message": "ok", 
            "data": {
                "timestamp": worker_info['last_heartbeat'],
                "celery_error": str(e)
            }
        }

@router.get("/celery_status")
def celery_status():
    """获取Celery集群状态"""
    try:
        inspect = celery_app.control.inspect()
        
        return {
            "code": 200,
            "data": {
                "active_tasks": inspect.active(),
                "scheduled_tasks": inspect.scheduled(),
                "reserved_tasks": inspect.reserved(),
                "stats": inspect.stats(),
                "registered_tasks": inspect.registered()
            }
        }
    except Exception as e:
        return {"code": 500, "message": f"获取Celery状态失败: {str(e)}"} 