import uuid
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas.UserSchema import UserData


class Notification(BaseModel):
    notification_type: Literal["email", "push"]
    user_id: uuid
    template_code: str
    status: Literal["delivered", "pending", "failed"]
    variables: UserData
    request_id: str
    priority: int
    metadata: Optional[dict]