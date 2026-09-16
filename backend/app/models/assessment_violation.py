from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import ViolationType


class AssessmentViolation(Base):
    __tablename__ = "assessment_violations"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id"), nullable=False)
    violation_type = Column(Enum(ViolationType), nullable=False)
    violation_number = Column(Integer, nullable=False)  # 1, 2, or 3 (3 = auto-submit trigger)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    attempt = relationship("AssessmentAttempt", back_populates="violations")
