from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainee
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.enums import CourseStatus
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.enrollment import EnrollmentWithCourse
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/trainee", tags=["trainee"], dependencies=[Depends(require_trainee)])


@router.post("/courses/{course_id}/enroll", response_model=EnrollmentWithCourse, status_code=status.HTTP_201_CREATED)
def enroll(course_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    course = db.query(Course).filter(Course.id == course_id, Course.status == CourseStatus.published).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not open for enrollment")

    existing = db.query(Enrollment).filter(
        Enrollment.course_id == course_id, Enrollment.trainee_id == trainee.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already enrolled in this course")

    enrollment = Enrollment(trainee_id=trainee.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments", response_model=list[EnrollmentWithCourse])
def my_enrollments(db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    return db.query(Enrollment).filter(Enrollment.trainee_id == trainee.id).order_by(
        Enrollment.enrolled_at.desc()
    ).all()


@router.post("/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == payload.course_id, Enrollment.trainee_id == trainee.id
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Enroll in this course before leaving feedback")

    feedback = Feedback(
        trainee_id=trainee.id, course_id=payload.course_id, rating=payload.rating, comments=payload.comments
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
