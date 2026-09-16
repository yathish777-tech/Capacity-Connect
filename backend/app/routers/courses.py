from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_approved
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.enrollment import Enrollment
from app.models.enums import CourseStatus, MaterialStatus, UserRole
from app.models.user import User
from app.schemas.course import CourseOut, MaterialOut, MaterialUrlOut
from app.services import storage

router = APIRouter(prefix="/courses", tags=["courses"], dependencies=[Depends(require_approved)])


@router.get("", response_model=list[CourseOut])
def list_published_courses(db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.status == CourseStatus.published).order_by(Course.created_at.desc()).all()


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/{course_id}/materials", response_model=list[MaterialOut])
def get_course_materials(course_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    """Only ever returns Admin-approved materials - unapproved uploads stay invisible to trainees."""
    if user.role == UserRole.trainee:
        enrolled = db.query(Enrollment).filter(
            Enrollment.course_id == course_id, Enrollment.trainee_id == user.id
        ).first()
        if not enrolled:
            raise HTTPException(status_code=403, detail="Enroll in this course to view its materials")

    return (
        db.query(CourseMaterial)
        .filter(CourseMaterial.course_id == course_id, CourseMaterial.status == MaterialStatus.approved)
        .all()
    )


@router.get("/{course_id}/materials/{material_id}/url", response_model=MaterialUrlOut)
def get_course_material_url(
    course_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    if user.role == UserRole.trainee:
        enrolled = db.query(Enrollment).filter(
            Enrollment.course_id == course_id, Enrollment.trainee_id == user.id
        ).first()
        if not enrolled:
            raise HTTPException(status_code=403, detail="Enroll in this course to view its materials")

    material = (
        db.query(CourseMaterial)
        .filter(
            CourseMaterial.id == material_id,
            CourseMaterial.course_id == course_id,
            CourseMaterial.status == MaterialStatus.approved,
        )
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    try:
        url = storage.get_file_url(material.storage_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Unable to load this material. Please try again.") from exc

    return MaterialUrlOut(
        url=url,
        expires_in=3600,
        file_name=material.file_name,
        mime_type=material.mime_type,
        file_type=material.file_type.value,
    )
