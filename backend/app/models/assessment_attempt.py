from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Enum, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import AttemptStatus


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(AttemptStatus), default=AttemptStatus.in_progress, nullable=False)
    answers = Column(JSON, default=dict)  # {"<question_id>": "a" | "b" | "c" | "d"}
    score = Column(Float, nullable=True)
    total_marks = Column(Float, nullable=True)

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime, nullable=True)

    violations = relationship("AssessmentViolation", back_populates="attempt", cascade="all, delete-orphan")
