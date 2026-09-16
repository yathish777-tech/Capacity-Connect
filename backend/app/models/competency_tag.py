from sqlalchemy import Column, Integer, String

from app.core.database import Base


class CompetencyTag(Base):
    __tablename__ = "competency_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=True)  # e.g. "Instrumentation", "Forecasting"
