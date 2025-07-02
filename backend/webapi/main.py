# -*- coding: utf-8 -*-
"""
Knowra WebAPI 启动脚本
依赖于 common 目录下的 core/config、core/log、schemas/response 等通用模块

启动命令示例：
    uvicorn webapi.main:app --reload --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from webapi.api import user, knowledge_base, document, team, model, connection, icon_router, vdb, collection, oss_connection
from common.core.log import logger
from common.core.config import config
from contextlib import asynccontextmanager
from common.schemas.response import BaseResponse

@asynccontextmanager
async def lifespan(app):
    # file_queue.start()  # 已废弃
    yield

app = FastAPI(title="Knowra 知识库管理系统", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors['allow_origins'],
    allow_credentials=config.cors['allow_credentials'],
    allow_methods=config.cors['allow_methods'],
    allow_headers=config.cors['allow_headers']
)

@app.get("/")
def read_root():
    return {"msg": "Welcome to Knowra!"}

app.include_router(user.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api")
app.include_router(document.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(model.router, prefix="/api")
app.include_router(connection.router, prefix="/api")
app.include_router(icon_router, prefix="/api")
app.include_router(vdb.router, prefix="/api")
app.include_router(collection.router, prefix="/api")
app.include_router(oss_connection.router, prefix="/api")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=BaseResponse(code=exc.status_code, message=exc.detail, data=None).model_dump()
    )
