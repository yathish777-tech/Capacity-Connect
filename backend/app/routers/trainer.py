from datetime import datetime, timezone
import mimetypes

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainer
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.course_request import CourseRequest
from app.models.enums import AssignmentStatus, CourseStatus, MaterialStatus, MaterialType
from app.models.material_chunk import MaterialChunk
from app.models.user import User
from app.schemas.course import CourseOut, CourseRequestOut, CourseRequestRespond, MaterialOut, MaterialUrlOut
from app.schemas.enrollment import EnrollmentWithTrainee
from app.schemas.user import ProfileUpdate, UserOut
from app.services import storage

router = APIRouter(prefix="/trainer", tags=["trainer"], dependencies=[Depends(require_trainer)])


@router.patch("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    if not trainer.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(trainer.profile, field, value)
    db.commit()
    db.refresh(trainer)
    return trainer

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "video/mp4",
    "video/webm",
    "video/ogg",
}


def _material_type_from_upload(file_type: str, filename: str, content_type: str | None) -> MaterialType:
    normalized = (file_type or "").lower()
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mime_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    if normalized in ("pdf", "ppt", "video", "document"):
        return MaterialType(normalized)
    if normalized == "pptx":
        return MaterialType.ppt
    if mime_type == "application/pdf" or suffix == "pdf":
        return MaterialType.pdf
    if mime_type in {
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    } or suffix in {"ppt", "pptx"}:
        return MaterialType.ppt
    if mime_type.startswith("video/") or suffix in {"mp4", "webm", "ogg"}:
        return MaterialType.video
    return MaterialType.document


def _assert_supported_file(filename: str, content_type: str | None) -> str:
    mime_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed_suffix = suffix in {"pdf", "ppt", "pptx", "mp4", "webm", "ogg"}
    if mime_type not in ALLOWED_MIME_TYPES and not allowed_suffix:
        return mime_type
    return mime_type


@router.get("/course-requests", response_model=list[CourseRequestOut])
def my_course_requests(db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    return db.query(CourseRequest).filter(CourseRequest.trainer_id == trainer.id).order_by(
        CourseRequest.requested_at.desc()
    ).all()


@router.post("/course-requests/{request_id}/respond", response_model=CourseRequestOut)
def respond_to_course_request(
    request_id: int,
    payload: CourseRequestRespond,
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    course_request = db.query(CourseRequest).filter(
        CourseRequest.id == request_id, CourseRequest.trainer_id == trainer.id
    ).first()
    if not course_request:
        raise HTTPException(status_code=404, detail="Course request not found")
    if course_request.status != AssignmentStatus.requested:
        raise HTTPException(status_code=400, detail="This request has already been responded to")

    course = db.get(Course, course_request.course_id)
    course_request.responded_at = datetime.now(timezone.utc)

    if payload.accept:
        course_request.status = AssignmentStatus.accepted
        course.assigned_trainer_id = trainer.id
        course.assignment_status = AssignmentStatus.accepted
        course.status = CourseStatus.published  # unlocks enrollment now that a trainer owns it
    else:
        course_request.status = AssignmentStatus.declined
        course.assignment_status = AssignmentStatus.unassigned

    db.commit()
    db.refresh(course_request)
    return course_request


@router.get("/courses", response_model=list[CourseOut])
def my_courses(db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    return db.query(Course).filter(Course.assigned_trainer_id == trainer.id).all()


def _assert_owns_course(db: Session, course_id: int, trainer: User) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.assigned_trainer_id == trainer.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="You are not the assigned trainer for this course")
    return course

@router.get("/courses/{course_id}/trainees", response_model=list[EnrollmentWithTrainee])
def my_course_trainees(course_id: int, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    _assert_owns_course(db, course_id, trainer)
    from app.models.enrollment import Enrollment
    return db.query(Enrollment).filter(Enrollment.course_id == course_id).all()


def _get_owned_material(db: Session, course_id: int, material_id: int, trainer: User) -> CourseMaterial:
    _assert_owns_course(db, course_id, trainer)
    material = db.query(CourseMaterial).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.course_id == course_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


def _remove_material_embeddings(db: Session, material: CourseMaterial) -> None:
    db.query(MaterialChunk).filter(MaterialChunk.material_id == material.id).delete()
    material.embedding_indexed = "no"


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def my_course_materials(course_id: int, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    _assert_owns_course(db, course_id, trainer)
    return db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).all()


@router.get("/courses/{course_id}/materials/{material_id}", response_model=MaterialOut)
def my_course_material(
    course_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    return _get_owned_material(db, course_id, material_id, trainer)


@router.get("/courses/{course_id}/materials/{material_id}/url", response_model=MaterialUrlOut)
def my_course_material_url(
    course_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    material = _get_owned_material(db, course_id, material_id, trainer)
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


@router.post("/courses/{course_id}/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_material(
    course_id: int,
    title: str = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    _assert_owns_course(db, course_id, trainer)

    file_bytes = await file.read()
    file_name = file.filename or title
    mime_type = _assert_supported_file(file_name, file.content_type)
    material_type = _material_type_from_upload(file_type, file_name, mime_type)
    try:
        storage_path = storage.upload_file(
            file_bytes, file_name, folder=f"course-{course_id}", content_type=mime_type
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    material = CourseMaterial(
        course_id=course_id,
        uploaded_by=trainer.id,
        title=title,
        file_name=file_name,
        file_type=material_type,
        file_size=len(file_bytes),
        storage_path=storage_path,
        mime_type=mime_type,
        status=MaterialStatus.pending,  # Admin must approve before trainees / the doubt bot see it
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.put("/courses/{course_id}/materials/{material_id}", response_model=MaterialOut)
async def replace_material(
    course_id: int,
    material_id: int,
    title: str | None = Form(None),
    file_type: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    material = _get_owned_material(db, course_id, material_id, trainer)
    file_bytes = await file.read()
    file_name = file.filename or material.file_name or material.title
    mime_type = _assert_supported_file(file_name, file.content_type)
    material_type = _material_type_from_upload(file_type or material.file_type.value, file_name, mime_type)
    try:
        storage_path = storage.replace_file(
            material.storage_path,
            file_bytes,
            file_name,
            folder=f"course-{course_id}",
            content_type=mime_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    material.title = title or material.title
    material.file_name = file_name
    material.file_type = material_type
    material.file_size = len(file_bytes)
    material.mime_type = mime_type
    material.storage_path = storage_path
    material.status = MaterialStatus.pending
    _remove_material_embeddings(db, material)
    material.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/courses/{course_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    course_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    trainer: User = Depends(require_trainer),
):
    material = _get_owned_material(db, course_id, material_id, trainer)
    _remove_material_embeddings(db, material)
    try:
        storage.delete_file(material.storage_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        pass
    db.delete(material)
    db.commit()
    return None
