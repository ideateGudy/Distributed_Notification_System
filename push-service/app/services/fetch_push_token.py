import os

import requests
from dotenv import load_dotenv

from app.config.logging_config import setup_logging

logger = setup_logging()

load_dotenv()
USER_SERVICE_URL= os.getenv("USER_SERVICE_URL")

def get_push_token(user_id: str):
    url = f"{USER_SERVICE_URL}/api/v1/users/{user_id}/push-token"
    try:
        response =  requests.get(url)
        response.raise_for_status()
        return response.json()

    except Exception as e:
        logger.error(f"Failed to fetch token: {e}")
        raise

# print(get_push_token("4f727a4f-d3be-4afa-82c1-d15cc514efb3"))
