from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import user, knowledge_base, document, team, model, connection, icon_router, vdb, collection
from app.core.log import logger
from app.core.config import config
from app.core.file_queue import file_queue
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    file_queue.start()
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
