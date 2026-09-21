from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint

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


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), unique=True, nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)
    name_position = Column(JSON, default=lambda: {"x": 120, "y": 320, "font_size": 28}, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CertificateRequest(Base):
    __tablename__ = "certificate_requests"
    __table_args__ = (UniqueConstraint("course_id", "trainee_id", name="uq_certificate_request_course_trainee"),)

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(CertificateStatus), default=CertificateStatus.requested, nullable=False)
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    remark = Column(Text, nullable=True)
    certificate_no = Column(String(50), unique=True, nullable=True)
    issued_file_url = Column(String(500), nullable=True)
