from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text

from app.core.database import Base
from app.models.enums import AnnouncementCategory


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(Enum(AnnouncementCategory), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # admin
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
