import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

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
    preferences = Column(JSON, default=lambda: {"email": False, "push": False})
    push_token = relationship("PushToken", back_populates="user", uselist=False)


class PushToken(Base):
    __tablename__ = "push_tokens"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="push_token")
