import enum
import uuid

from sqlalchemy import JSON, Boolean, Column, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(Text, nullable=False)
    name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    push_token = Column(String, nullable=True)
    preferences = Column(JSON, default=lambda: {"email": False, "push": False})
