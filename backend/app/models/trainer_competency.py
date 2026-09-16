from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class TrainerCompetency(Base):
    __tablename__ = "trainer_competencies"
    __table_args__ = (UniqueConstraint("trainer_id", "tag_id", name="uq_trainer_tag"),)

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("competency_tags.id"), nullable=False)
    proficiency_level = Column(Integer, default=3)  # 1 (basic) - 5 (expert)

    trainer = relationship("User", back_populates="competencies")
    tag = relationship("CompetencyTag")
