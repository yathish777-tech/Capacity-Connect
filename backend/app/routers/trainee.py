from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainee
from app.models.certificate import CertificateRequest, CertificateTemplate
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.enums import CertificateStatus, CourseStatus, EnrollmentStatus
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.certificate import CertificateRequestOut
from app.schemas.enrollment import EnrollmentWithCourse
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.schemas.user import ProfileUpdate, UserOut
from app.services import storage

router = APIRouter(prefix="/trainee", tags=["trainee"], dependencies=[Depends(require_trainee)])


@router.patch("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    if not trainee.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(trainee.profile, field, value)
    db.commit()
    db.refresh(trainee)
    return trainee


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


def _certificate_out(db: Session, request: CertificateRequest) -> CertificateRequestOut:
    course = db.get(Course, request.course_id)
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == request.course_id,
        Enrollment.trainee_id == request.trainee_id,
    ).first()
    download_url = None
    if request.issued_file_url:
        try:
            download_url = storage.get_file_url(request.issued_file_url)
        except Exception:
            download_url = None
    return CertificateRequestOut(
        id=request.id,
        course_id=request.course_id,
        trainee_id=request.trainee_id,
        status="pending" if request.status == CertificateStatus.requested else "approved" if request.status == CertificateStatus.issued else "rejected",
        requested_at=request.requested_at,
        reviewed_by=request.reviewed_by,
        reviewed_at=request.reviewed_at,
        remark=request.remark,
        certificate_no=request.certificate_no,
        issued_file_url=request.issued_file_url,
        download_url=download_url,
        course_title=course.title if course else None,
        enrolled_at=enrollment.enrolled_at if enrollment else None,
        completion_date=enrollment.completed_at if enrollment else None,
        progress_percent=enrollment.progress_percent if enrollment else None,
        has_template=db.query(CertificateTemplate).filter(CertificateTemplate.course_id == request.course_id).first() is not None,
    )


@router.post("/courses/{course_id}/certificate-request", response_model=CertificateRequestOut, status_code=status.HTTP_201_CREATED)
def request_certificate(course_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.trainee_id == trainee.id,
        Enrollment.status == EnrollmentStatus.completed,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="Complete the course before requesting a certificate")
    if not db.query(CertificateTemplate).filter(CertificateTemplate.course_id == course_id).first():
        raise HTTPException(status_code=400, detail="This course does not have a certificate template yet")
    existing = db.query(CertificateRequest).filter(
        CertificateRequest.course_id == course_id,
        CertificateRequest.trainee_id == trainee.id,
    ).first()
    if existing:
        if existing.status == CertificateStatus.rejected:
            existing.status = CertificateStatus.requested
            existing.remark = None
            existing.reviewed_by = None
            existing.reviewed_at = None
            existing.certificate_no = None
            existing.issued_file_url = None
            db.commit()
            db.refresh(existing)
            return _certificate_out(db, existing)
        raise HTTPException(status_code=400, detail="You already have a certificate request for this course")
    certificate_request = CertificateRequest(course_id=course_id, trainee_id=trainee.id)
    db.add(certificate_request)
    db.commit()
    db.refresh(certificate_request)
    return _certificate_out(db, certificate_request)


@router.get("/certificates", response_model=list[CertificateRequestOut])
def my_certificates(db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    requests = db.query(CertificateRequest).filter(CertificateRequest.trainee_id == trainee.id).order_by(
        CertificateRequest.requested_at.desc()
    ).all()
    return [_certificate_out(db, request) for request in requests]


@router.get("/certificates/{certificate_id}/download")
def download_certificate(certificate_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    request = db.query(CertificateRequest).filter(
        CertificateRequest.id == certificate_id,
        CertificateRequest.trainee_id == trainee.id,
        CertificateRequest.status == CertificateStatus.issued,
    ).first()
    if not request or not request.issued_file_url:
        raise HTTPException(status_code=404, detail="Approved certificate not found")
    return RedirectResponse(storage.get_file_url(request.issued_file_url))


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
