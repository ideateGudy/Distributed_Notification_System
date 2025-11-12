import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, messaging

from app.schemas.NotificationSchema import PushRequest
import dotenv, os

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
cred_path = os.path.join(BASE_DIR, "firebase_key.json")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

FCM_TOKEN = os.getenv("FCM_TOKEN")


def send_notification(data: PushRequest, token):

    message = messaging.Message(
        notification=messaging.Notification(
            title=data.title,
            body=data.body,
        ),
        token=FCM_TOKEN,
    )

    try:
        response = messaging.send(message)
        return {"success": True, "response": response}
    except Exception as e:
        return {"success": False, "error": str(e)}
