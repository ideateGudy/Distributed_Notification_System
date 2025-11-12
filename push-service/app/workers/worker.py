import json
import ssl
import uuid
from kombu.serialization import register
import certifi
from celery import Celery

from app.config.logging_config import setup_logging
from app.config.worker_config import RABBITMQ_URL
from app.schemas.NotificationSchema import PushRequest
from app.services.fetch_push_token import get_push_token
from app.services.fetch_template import get_template

from app.services.notifier import send_notification
from app.services.render_template import render_template

logger = setup_logging()


def rawjson_dumps(data):
    """Serialize Python objects to JSON string."""
    return json.dumps(data)

def rawjson_loads(s):
    """
    Deserialize JSON message.
    If the producer sent plain JSON (no 'task' field),
    wrap it into a fake Celery task envelope so Celery can execute it.
    """
    data = json.loads(s)
    # If message already Celery-formatted, just return
    if isinstance(data, dict) and "task" in data:
        return data
    # Otherwise, wrap raw payload as args to 'push'
    return {
        "task": "push",
        "id": None,
        "args": [data],
        "kwargs": {},
    }

register(
    "rawjson",
    rawjson_dumps,
    rawjson_loads,
    content_type="application/json",
    content_encoding="utf-8",
)

celery_app = Celery(
    "push_service",
    broker=RABBITMQ_URL,
    broker_use_ssl={
        "cert_reqs": ssl.CERT_REQUIRED,
        "ca_certs": certifi.where(),
    },
)

celery_app.conf.update(
    task_serializer="rawjson",
    accept_content=["json", "rawjson"],
    result_serializer="json",
)

@celery_app.task(name="push", queue="push.queue")
def push(message: dict):
    logger.info(f"Received push message: {message}")
    try:
        # unpack message
        user_id = message.get("user_id")
        name = message.get('name')
        template_code = message.get("template_code", "TEMPLATE_001")


        # build notif message details
        template = get_template(template_code)

        title = template.get("subject")
        body = render_template(template.get("body"), context={"name": name})

        logger.info(f"Sending push notif: {title}, {body} to {name}")



        # get push token
        push_payload = PushRequest(title=title, body=body)

        token = get_push_token(user_id)
        push_token = token.get("token")

        result = send_notification(push_payload, push_token)

        if result.get("success"):
            logger.info(f"Push notification sent successfully for message: {message}")
        else:
            logger.warning(f"Push notification failed for message: {message}. Response: {result}")

    except Exception as e:
        logger.exception(f"Error while sending push notification: {e}")
        raise




def publish_multiple_messages():
    messages = [
        {
            "notification_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "template_body": "Hello {{name}}, welcome to our platform!",
            "template_subject": "Welcome Email",
            "template_code": "TEMPLATE_001",
            "recipient": "user1@example.com",
            "user_contact": {
                "email": "user1@example.com",
                "push_token": None
            },
            "user_id": "u001",
            "request_id": f"req-{uuid.uuid4()}",
            "priority": 1,
            "notification_type": "push",
            "variables": {
                "name": "Alice Johnson",
                "link": "https://example.com/welcome",
                "meta": {"key": "value"}
            },
            "metadata": {"campaign_id": "summer_2025"}
        },
        {
            "notification_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "template_body": "Hello {{name}}, welcome to our platform!",
            "template_subject": "Welcome Email",
            "template_code": "TEMPLATE_001",
            "recipient": "user2@example.com",
            "user_contact": {
                "email": "user2@example.com",
                "push_token": None
            },
            "user_id": "u002",
            "request_id": f"req-{uuid.uuid4()}",
            "priority": 1,
            "notification_type": "push",
            "variables": {
                "name": "Bob Smith",
                "link": "https://example.com/welcome",
                "meta": {"key": "value"}
            },
            "metadata": {"campaign_id": "summer_2025"}
        },
        {
            "notification_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "template_body": "Hello {{name}}, welcome to our platform!",
            "template_subject": "Welcome Email",
            "template_code": "TEMPLATE_001",
            "recipient": "user3@example.com",
            "user_contact": {
                "email": "user3@example.com",
                "push_token": None
            },
            "user_id": "u003",
            "request_id": f"req-{uuid.uuid4()}",
            "priority": 1,
            "notification_type": "push",
            "variables": {
                "name": "Charlie Davis",
                "link": "https://example.com/welcome",
                "meta": {"key": "value"}
            },
            "metadata": {"campaign_id": "summer_2025"}
        },
        {
            "notification_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "template_body": "Hello {{name}}, welcome to our platform!",
            "template_subject": "Welcome Email",
            "template_code": "TEMPLATE_001",
            "recipient": "user4@example.com",
            "user_contact": {
                "email": "user4@example.com",
                "push_token": None
            },
            "user_id": "u004",
            "request_id": f"req-{uuid.uuid4()}",
            "priority": 1,
            "notification_type": "push",
            "variables": {
                "name": "Diana Evans",
                "link": "https://example.com/welcome",
                "meta": {"key": "value"}
            },
            "metadata": {"campaign_id": "summer_2025"}
        },
        {
            "notification_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "template_body": "Hello {{name}}, welcome to our platform!",
            "template_subject": "Welcome Email",
            "template_code": "TEMPLATE_001",
            "recipient": "user5@example.com",
            "user_contact": {
                "email": "user5@example.com",
                "push_token": None
            },
            "user_id": "u005",
            "request_id": f"req-{uuid.uuid4()}",
            "priority": 1,
            "notification_type": "push",
            "variables": {
                "name": "Ethan Williams",
                "link": "https://example.com/welcome",
                "meta": {"key": "value"}
            },
            "metadata": {"campaign_id": "summer_2025"}
        }
    ]

    for msg in messages:
        celery_app.send_task("push", args=[msg], queue="push.queue")
        print(f"✅ Sent: {msg['user_id']}")

if __name__ == "__main__":
    publish_multiple_messages()