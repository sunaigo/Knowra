from fastapi import APIRouter, Request, HTTPException, status, Body
from typing import List, Dict, Any
from common.schemas.response import BaseResponse
from common.schemas.worker import WorkerRegisterRequest, WorkerStatusCallback

router = APIRouter(prefix="/worker", tags=["worker"])

# Worker注册/心跳
@router.post("/register", response_model=BaseResponse)
def register_worker(data: WorkerRegisterRequest):
    # TODO: 实现worker注册逻辑
    return BaseResponse(code=200, message="worker注册/心跳成功")

# 获取所有已注册worker
@router.get("/list", response_model=BaseResponse)
def list_workers():
    # TODO: 查询worker列表
    return BaseResponse(code=200, data=[])  # 示例

# Worker回调处理（进度、状态等）
@router.post("/callback", response_model=BaseResponse)
def worker_callback(data: WorkerStatusCallback):
    # TODO: 处理worker推送的任务进度/状态
    return BaseResponse(code=200, message="回调已处理") 