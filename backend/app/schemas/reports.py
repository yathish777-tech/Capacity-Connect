from typing import List

from pydantic import BaseModel


class RoleCount(BaseModel):
    role: str
    count: int


class CourseEnrollmentCount(BaseModel):
    course: str
    enrollments: int
    completions: int


class OverviewStats(BaseModel):
    pending_approvals: int
    total_users: int
    active_courses: int
    total_enrollments: int
    completion_rate: float
    users_by_role: List[RoleCount]
    enrollments_by_course: List[CourseEnrollmentCount]
