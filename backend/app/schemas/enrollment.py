from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.course import CourseOut
from app.schemas.user import UserOut

class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trainee_id: int
    course_id: int
    status: str
    progress_percent: float
    enrolled_at: datetime
    completed_at: Optional[datetime] = None


class EnrollmentWithCourse(EnrollmentOut):
    course: CourseOut


class EnrollmentWithTrainee(EnrollmentOut):
    trainee: UserOut
