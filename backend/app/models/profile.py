from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String(255), nullable=False)
    employee_id = Column(String(100), unique=True, nullable=False)
    qualifications = Column(Text, nullable=True)
    work_experience = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # comma-separated free text tags
    current_role_title = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)

    user = relationship("User", back_populates="profile")
