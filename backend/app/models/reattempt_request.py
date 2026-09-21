from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import ReAttemptStatus


class ReAttemptRequest(Base):
    __tablename__ = "reattempt_requests"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id"), nullable=False)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    reason = Column(String, nullable=True)
    status = Column(Enum(ReAttemptStatus), default=ReAttemptStatus.requested, nullable=False)
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    attempt = relationship("AssessmentAttempt")
    trainee = relationship("User", foreign_keys=[trainee_id])
    questionnaire = relationship("Questionnaire")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

