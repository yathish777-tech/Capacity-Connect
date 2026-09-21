from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainee
from app.models.certificate import Certificate, CertificateRequest, CertificateTemplate
from app.models.enrollment import Enrollment
from app.models.enums import CertificateStatus, EnrollmentStatus
from app.models.user import User
from app.schemas.certificate import CertificateOut, CertificateRequestIn

router = APIRouter(prefix="/certificates", tags=["certificates"], dependencies=[Depends(require_trainee)])


@router.post("/request", response_model=CertificateOut, status_code=status.HTTP_201_CREATED)
def request_certificate(
    payload: CertificateRequestIn, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == payload.course_id,
        Enrollment.trainee_id == trainee.id,
        Enrollment.status == EnrollmentStatus.completed,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="Complete the course (pass its assessment) before requesting a certificate")

    if not db.query(CertificateTemplate).filter(CertificateTemplate.course_id == payload.course_id).first():
        raise HTTPException(status_code=400, detail="This course does not have a certificate template yet")

    existing_new = db.query(CertificateRequest).filter(
        CertificateRequest.course_id == payload.course_id,
        CertificateRequest.trainee_id == trainee.id,
    ).first()
    if existing_new and existing_new.status != CertificateStatus.rejected:
        raise HTTPException(status_code=400, detail="You already have a certificate request for this course")

    certificate = Certificate(trainee_id=trainee.id, course_id=payload.course_id)
    if existing_new:
        existing_new.status = CertificateStatus.requested
        existing_new.remark = None
        existing_new.reviewed_by = None
        existing_new.reviewed_at = None
    else:
        db.add(CertificateRequest(trainee_id=trainee.id, course_id=payload.course_id))
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate


@router.get("/mine", response_model=list[CertificateOut])
def my_certificates(db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    return db.query(Certificate).filter(Certificate.trainee_id == trainee.id).order_by(
        Certificate.requested_at.desc()
    ).all()
