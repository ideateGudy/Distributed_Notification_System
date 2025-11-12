from typing import Optional
from pydantic import BaseModel, HttpUrl


class UserPreference(BaseModel):
    email: bool
    push: bool

class UserData(BaseModel):
    name: str
    link: HttpUrl
    meta: Optional[dict]
    preference: UserPreference


