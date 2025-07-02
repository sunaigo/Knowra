import logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)
from worker.celery_app import app
from worker.parser_service import FileParserService
import traceback
import requests
from typing import Optional
from loguru import logger
import os
from common.schemas.worker import ParseFileTaskParams
import redis

def progress_callback(doc_id: int, status: str, current_offset: int = None):
    """进度回调工具方法"""
    # 主动上报到API服务
    api_base_url = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')
    if doc_id:
        try:
            params = {
                "parse_offset": current_offset if current_offset is not None else 0,
                "status": status
            }
            requests.post(
                f"{api_base_url}/api/docs/{doc_id}/parse_progress",
                json=params,
                timeout=5
            )
            logger.debug(f"主动上报解析进度成功: {params}")
        except Exception as e:
            logger.warning(f"主动上报解析进度失败: {e}")

@app.task(bind=True, name='backend.worker.tasks.parse_file_task')
def parse_file_task(self, params: dict):
    """
    分布式文件解析任务
    Args:
        params: 任务参数，dict，需符合 ParseFileTaskParams schema
    """
    def cb(doc_id: int, status: str, current_offset: int = None):
        progress_callback(doc_id, status, current_offset)
    args = ParseFileTaskParams(**params)
    logger.info(f"[Worker] 收到解析任务: task_id={args.task_id}, params={params}")
    # redis写入，key为doc_parse:{filename}，filename为oss文件名（带oss://...路径）
    filename = args.file.path  # oss文件名
    redis_key = f'doc_parse:{filename}'
    r = redis.StrictRedis(host='127.0.0.1', port=6379, db=0)
    r.set(redis_key, self.request.id)
    try:
        parser_service = FileParserService(progress_callback=cb)
        result = parser_service.parse(args)
        logger.info(f"[Worker] 解析任务完成: task_id={args.task_id}, result={result}")
        return {
            'status': 'SUCCESS',
            'task_id': args.task_id,
            'result': result
        }
    except Exception as exc:
        error_msg = str(exc)
        error_trace = traceback.format_exc()
        logger.error(f"[Worker] 解析任务失败: task_id={args.task_id}, error={error_msg}\n{error_trace}")
        cb(args.doc_id, 'failed')
        raise
    finally:
        # 删除redis key
        r.delete(redis_key)
        logger.info(f"[Worker] 任务结束，已删除redis key: {redis_key}")
        # 优先删除 result 里的 file_path（即 ensure_local_file 返回的本地路径）
        local_file_path = None
        try:
            if 'result' in locals() and result and isinstance(result, dict):
                local_file_path = result.get('file_path')
        except Exception:
            pass
        # 兜底用 args.file.path
        file_path = local_file_path or args.file.path
        if file_path and not str(file_path).startswith('oss://') and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"[Worker] 已自动删除解析文件: {file_path}")
            except Exception as e:
                logger.error(f"[Worker] 删除文件失败: {file_path}, 错误: {e}")



@app.task(bind=True, name='backend.worker.tasks.terminate_task')
def terminate_task(self, filename: str):
    """终止任务：删除redis中doc_parse:{filename}对应的key，filename为oss文件名"""
    redis_key = f'doc_parse:{filename}'
    r = redis.StrictRedis(host='127.0.0.1', port=6379, db=0)
    deleted = r.delete(redis_key)
    logger.info(f"[Worker] 终止任务请求，已删除redis key: {redis_key}，结果: {deleted}")
    return {'status': 'terminated', 'filename': filename, 'deleted': bool(deleted)} 