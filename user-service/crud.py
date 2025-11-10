from auth import get_password_hash, verify_password
from models import User
from schemas import UserCreate
from sqlalchemy.orm import Session


def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()


def get_users(db: Session):
    return db.query(User).all()


def create_user(db: Session, user_create: UserCreate):
    hashed_pw = get_password_hash(user_create.password)
    db_user = User(
        email=user_create.email,
        password=hashed_pw,
        name=user_create.name,
        preferences=user_create.preferences.model_dump(),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return False
    return user
