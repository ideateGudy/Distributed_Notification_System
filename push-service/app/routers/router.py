from fastapi import APIRouter

from app.services.notifier import send_notification
from app.schemas.NotificationSchema import PushRequest

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "OK",
        "service": "Push Notification Service"
    }
