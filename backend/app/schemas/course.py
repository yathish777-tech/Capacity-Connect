from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    duration_hours: int = 1
    subject_tag_names: List[str] = []


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    duration_hours: Optional[int] = None
    status: Optional[Literal["draft", "published", "archived"]] = None
    assigned_trainer_id: Optional[int] = None
    subject_tag_names: Optional[List[str]] = None


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    duration_hours: int
    status: str
    assigned_trainer_id: Optional[int] = None
    assigned_trainer_name: Optional[str] = None
    assignment_status: str
    created_at: datetime
    subject_tag_names: List[str] = []
    has_certificate_template: bool = False


class CourseRequestCreate(BaseModel):
    trainer_id: int
    message: Optional[str] = None


class CourseRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    trainer_id: int
    status: str
    message: Optional[str] = None
    requested_at: datetime


class CourseRequestRespond(BaseModel):
    accept: bool


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    file_name: Optional[str] = None
    file_type: str
    file_size: Optional[int] = None
    storage_path: str
    mime_type: Optional[str] = None
    uploaded_by: Optional[int] = None
    status: str
    review_remark: Optional[str] = None
    uploaded_at: datetime
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MaterialUrlOut(BaseModel):
    url: str
    expires_in: int
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_type: str


class MaterialApproval(BaseModel):
    action: Literal["approve", "reject"]
    remark: Optional[str] = None
