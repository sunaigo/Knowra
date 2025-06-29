# Worker状态管理：用于worker自身注册、心跳、健康状态等
from typing import Dict, Any

class WorkerState:
    def __init__(self):
        self.info: Dict[str, Any] = {}
        self.last_heartbeat: float = 0.0
        self.status: str = "idle"  # idle/busy/offline

    def update(self, info: Dict[str, Any]):
        self.info.update(info)

    def set_status(self, status: str):
        self.status = status

worker_state = WorkerState() 