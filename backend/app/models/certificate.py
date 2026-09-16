from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String

from app.core.database import Base
from app.models.enums import CertificateStatus


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    certificate_number = Column(String(50), unique=True, nullable=True)
    status = Column(Enum(CertificateStatus), default=CertificateStatus.requested, nullable=False)
    score_at_issue = Column(Float, nullable=True)

    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # admin
    issued_at = Column(DateTime, nullable=True)
