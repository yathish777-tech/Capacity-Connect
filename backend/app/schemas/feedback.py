from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    course_id: int
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trainee_id: int
    course_id: int
    rating: int
    comments: Optional[str] = None
    submitted_at: datetime
