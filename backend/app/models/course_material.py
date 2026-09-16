from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import MaterialStatus, MaterialType


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # trainer

    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_type = Column(Enum(MaterialType), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    storage_path = Column(String(500), nullable=False)  # Supabase Storage object path
    mime_type = Column(String(150), nullable=True)

    status = Column(Enum(MaterialStatus), default=MaterialStatus.pending, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # admin
    approved_at = Column(DateTime, nullable=True)

    embedding_indexed = Column(String(20), default="no")  # "no" | "yes" - set once chunks are embedded
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="materials")
    chunks = relationship("MaterialChunk", back_populates="material", cascade="all, delete-orphan")
