import os

import requests
from dotenv import load_dotenv

from app.config.logging_config import setup_logging

logger = setup_logging()

load_dotenv()
TEMPLATE_SERVICE_URL= os.getenv("TEMPLATE_SERVICE_URL")

def get_template(code: str):
    url = f"{TEMPLATE_SERVICE_URL}/api/v1/templates/{code}"
    try:
        response  = requests.get(url)
        response.raise_for_status()
        return response.json()

    except Exception as e:
        logger.error(f"Failed to fetch template: {e}")
        raise


# print(get_template("TEMPLATE_001"))
# x = {'id': 'e48b3350-d1fc-44af-8965-f4b92ac516a2',
#      'template_code': 'TEMPLATE_001',
#      'version': 1,
#      'subject': 'Welcome Email',
#      'body': 'Hello {{name}}, welcome to our platform!',
#      'language': 'en'
#      }