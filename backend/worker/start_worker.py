#!/usr/bin/env python3
"""
Knowra Worker服务启动脚本
"""

import sys
import os
import uvicorn

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

def main():
    """启动Worker服务"""
    print("Starting Knowra Worker Service...")
    print("FastAPI server will start on http://0.0.0.0:8001")
    print("Celery worker will start automatically")
    print("Press Ctrl+C to stop")
    
    try:
        # 启动FastAPI服务，Celery worker会自动启动
        uvicorn.run(
            "backend.worker.main:app",
            host="0.0.0.0",
            port=8001,
            reload=False,  # 禁用reload，避免Celery worker重复启动
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Error starting service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 