from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    category: Literal["course", "staff", "assessment", "achievement"]


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    category: str
    created_at: datetime
