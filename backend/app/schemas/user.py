from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    employee_id: str
    qualifications: Optional[str] = None
    work_experience: Optional[str] = None
    skills: Optional[str] = None
    current_role_title: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    status: str
    created_at: datetime
    profile: Optional[ProfileOut] = None


class ApprovalAction(BaseModel):
    action: Literal["approve", "reject"]
