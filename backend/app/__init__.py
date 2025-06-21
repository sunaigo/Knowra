from fastapi import FastAPI
from app.api import user, document, knowledge_base
from app.api import team

app = FastAPI()
app.include_router(user.router, prefix="/api/user")
app.include_router(document.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api/kb")
app.include_router(team.router, prefix="/api") 