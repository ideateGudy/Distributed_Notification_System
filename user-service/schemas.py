from pydantic import BaseModel, EmailStr


class UserPreferences(BaseModel):
    email: bool = False
    push: bool = False


class UserOut(BaseModel):
    email: EmailStr
    name: str
    push_token: str | None = None
    password: str | None = None
    preferences: UserPreferences

    class Config:
        orm_mode = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    preferences: UserPreferences


class UserLogin(BaseModel):
    email: EmailStr
    password: str
