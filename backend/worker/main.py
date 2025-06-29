import os
import sys
import signal
import subprocess
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI

# 添加项目根目录到Python路径，确保能正确导入模块
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)

# 将项目根目录添加到Python路径
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.worker.routers import register_worker_routers
from backend.worker.celery_app import app as celery_app

# 全局变量存储Celery worker进程
celery_worker_process = None

def start_celery_worker():
    """启动Celery worker"""
    global celery_worker_process
    try:
        # 启动Celery worker进程
        cmd = [
            sys.executable, '-m', 'celery',
            '-A', 'backend.worker.celery_app',
            'worker',
            '--loglevel=info',
            '--hostname=worker@%h',
            '--concurrency=2'
        ]
        
        # 设置工作目录为项目根目录
        celery_worker_process = subprocess.Popen(
            cmd,
            cwd=project_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=dict(os.environ, PYTHONPATH=project_root)
        )
        print(f"Celery worker started with PID: {celery_worker_process.pid}")
        print(f"Working directory: {project_root}")
        
    except Exception as e:
        print(f"Failed to start Celery worker: {e}")

def stop_celery_worker():
    """停止Celery worker"""
    global celery_worker_process
    if celery_worker_process:
        try:
            celery_worker_process.terminate()
            celery_worker_process.wait(timeout=10)
            print("Celery worker stopped")
        except subprocess.TimeoutExpired:
            celery_worker_process.kill()
            print("Celery worker killed")
        except Exception as e:
            print(f"Error stopping Celery worker: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI生命周期管理"""
    # 启动时
    print("Starting Celery worker...")
    start_celery_worker()
    
    yield
    
    # 关闭时
    print("Stopping Celery worker...")
    stop_celery_worker()

# 创建FastAPI应用
app = FastAPI(
    title="Knowra Worker Service",
    description="分布式文件解析Worker服务",
    version="1.0.0",
    lifespan=lifespan
)

# 注册路由
register_worker_routers(app)

# 信号处理器，确保优雅关闭
def signal_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")
    stop_celery_worker()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    import uvicorn
    print(f"Starting FastAPI server from: {os.getcwd()}")
    print(f"Project root: {project_root}")
    uvicorn.run(app, host="0.0.0.0", port=8001) 