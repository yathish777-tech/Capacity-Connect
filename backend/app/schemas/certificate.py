from datetime import datetime
from typing import Literal, Optional

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
