from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.core.config import settings
from app.core.database import Base


class MaterialChunk(Base):
    """One embedded text chunk of an admin-approved course material, used for RAG retrieval."""

    __tablename__ = "material_chunks"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("course_materials.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)  # denormalized for fast scoping
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(settings.embedding_dimensions), nullable=True)

    material = relationship("CourseMaterial", back_populates="chunks")
