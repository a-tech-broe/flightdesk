from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bfr_date: Optional[date] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    bfr_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
