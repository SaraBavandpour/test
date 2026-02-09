# models/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    """مدل برای ایجاد کاربر جدید"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    fullname: str = Field(..., min_length=2)
    email: EmailStr
    disabled: bool = False
    role_id: int = 0
    phone_number: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "user123",
                "password": "password123",
                "fullname": "کاربر نمونه",
                "email": "user@example.com",
                "disabled": False,
                "role_id": 1,
                "phone_number": "09123456789"
            }
        }

class UserUpdate(BaseModel):
    """مدل برای بروزرسانی کاربر"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6)
    fullname: Optional[str] = Field(None, min_length=2)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role_id: Optional[int] = None
    disabled: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "fullname": "کاربر ویرایش شده",
                "email": "updated@example.com",
                "phone_number": "09999999999"
            }
        }

class UserResponse(BaseModel):
    """مدل برای نمایش کاربر"""
    id: Optional[int] = None
    username: str
    fullname: str
    email: str
    disabled: bool
    role_id: int
    phone_number: Optional[str] = None
    
    class Config:
        from_attributes = True