from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class CourseSubjectTag(Base):
    __tablename__ = "course_subject_tags"
    __table_args__ = (UniqueConstraint("course_id", "tag_id", name="uq_course_tag"),)

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("competency_tags.id"), nullable=False)

    course = relationship("Course", back_populates="subject_tags")
    tag = relationship("CompetencyTag")
