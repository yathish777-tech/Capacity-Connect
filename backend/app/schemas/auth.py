from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["trainer", "trainee"]

    full_name: str
    employee_id: str
    qualifications: Optional[str] = None
    work_experience: Optional[str] = None
    skills: Optional[str] = None  # comma-separated, e.g. "Radar Maintenance, AWS Calibration"
    current_role_title: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    status: str
    full_name: str
