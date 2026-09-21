from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict


class CertificateRequestIn(BaseModel):
    course_id: int


class CertificateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trainee_id: int
    course_id: int
    certificate_number: Optional[str] = None
    status: str
    score_at_issue: Optional[float] = None
    requested_at: datetime
    issued_at: Optional[datetime] = None


class CertificateIssueAction(BaseModel):
    action: Literal["issue", "reject"]
    remark: Optional[str] = None


class CertificateTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    file_url: str
    file_type: str
    name_position: dict[str, Any]
    uploaded_by: int
    uploaded_at: datetime
    preview_url: Optional[str] = None


class CertificateRequestAction(BaseModel):
    remark: Optional[str] = None


class CertificateRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    trainee_id: int
    status: str
    requested_at: datetime
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    remark: Optional[str] = None
    certificate_no: Optional[str] = None
    issued_file_url: Optional[str] = None
    download_url: Optional[str] = None
    course_title: Optional[str] = None
    trainee_name: Optional[str] = None
    enrolled_at: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    progress_percent: Optional[float] = None
    assessment_score: Optional[float] = None
    violation_count: int = 0
    has_template: bool = False
