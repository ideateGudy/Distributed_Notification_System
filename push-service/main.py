from fastapi import FastAPI
from app.config.logging_config import setup_logging

setup_logging()

from app.routers.router import router

app = FastAPI(title='Push Notification Service')
app.include_router(router)

@app.get('/')
def read_root():
    return {"message": "Push Notification Service"}