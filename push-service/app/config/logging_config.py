import logging


import sys

LOG_FORMAT = "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"

def setup_logging(level=logging.INFO):
    """Configure global logging."""
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        stream=sys.stdout,  # ensures logs go to Docker/Fly.io stdout
    )

    # logging.getLogger("uvicorn").setLevel(logging.WARNING)  # quieten noisy loggers
    # logging.getLogger("celery").setLevel(logging.INFO)
    # logging.getLogger("pika").setLevel(logging.WARNING)