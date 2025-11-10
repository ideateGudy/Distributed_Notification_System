from datetime import timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

import crud
from auth import create_access_token, get_current_user, get_db
from database import engine
from models import Base as ModelsBase
from models import User
from schemas import UserCreate, UserLogin, UserOut

ModelsBase.metadata.create_all(bind=engine)

app = FastAPI(title="user_service")


@app.post("/register")
def register_user(payload: UserCreate, db: Annotated[Session, Depends(get_db)]):
    db_user = crud.get_user_by_email(db, payload.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    created = crud.create_user(db, payload)
    return {
        "success": True,
        "data": {"user_id": created.id},
        "message": "created",
        "meta": {},
    }


@app.post("/login")
def login(form_data: UserLogin, db: Annotated[Session, Depends(get_db)]):
    user = crud.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=60)
    access_token = create_access_token(
        subject=user.email,
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


@app.get("/users", response_model=list[UserOut])
def list_users(db: Annotated[Session, Depends(get_db)]):
    users = crud.get_users(db)
    return users


@app.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, user_update: UserCreate, db: Annotated[Session, Depends(get_db)]
):
    # Implementation for updating a user will go here
    pass


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="localhost", port=8000)
