from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class UserCreate(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: datetime


class StockEntry(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()


class RecentlySeenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name: str
    price: Optional[float]
    viewed_at: datetime


class SavedStockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name: str
    saved_at: datetime
