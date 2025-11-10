from fastapi import FastAPI

from app.router import router

app = FastAPI(title='Push Notification Service')
app.include_router(router)