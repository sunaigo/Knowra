from fastapi import FastAPI
from backend.worker.api import worker_api

def register_worker_routers(app: FastAPI):
    app.include_router(worker_api.router) 