from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import AssignmentStatus, CourseStatus


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(150), nullable=True)
    duration_hours = Column(Integer, default=1)

    status = Column(Enum(CourseStatus), default=CourseStatus.draft, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # admin

    assigned_trainer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignment_status = Column(Enum(AssignmentStatus), default=AssignmentStatus.unassigned, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    subject_tags = relationship("CourseSubjectTag", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("CourseMaterial", back_populates="course", cascade="all, delete-orphan")

    @property
    def subject_tag_names(self) -> list[str]:
        return [link.tag.name for link in self.subject_tags if link.tag]

    @property
    def assigned_trainer_name(self) -> str | None:
        return self.assigned_trainer.profile.full_name if getattr(self, "assigned_trainer", None) and self.assigned_trainer.profile else None

    assigned_trainer = relationship("User", foreign_keys=[assigned_trainer_id])
    certificate_template = relationship("CertificateTemplate", uselist=False)

    @property
    def has_certificate_template(self) -> bool:
        return self.certificate_template is not None
