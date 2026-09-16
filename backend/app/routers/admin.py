import csv
import io
from datetime import datetime, timezone
import mimetypes

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.announcement import Announcement
from app.models.certificate import Certificate
from app.models.competency_tag import CompetencyTag
from app.models.course import Course
from app.models.course_material import CourseMaterial
from app.models.course_request import CourseRequest
from app.models.course_subject_tag import CourseSubjectTag
from app.models.enrollment import Enrollment
from app.models.enums import (
    AssignmentStatus,
    CertificateStatus,
    CourseStatus,
    EnrollmentStatus,
    MaterialStatus,
    MaterialType,
    UserRole,
    UserStatus,
)
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.schemas.certificate import CertificateIssueAction, CertificateOut
from app.schemas.competency import TrainerSuggestion
from app.schemas.course import CourseCreate, CourseOut, CourseRequestCreate, CourseRequestOut, MaterialApproval, MaterialOut, MaterialUrlOut
from app.schemas.reports import CourseEnrollmentCount, OverviewStats, RoleCount
from app.schemas.user import ApprovalAction, UserOut
from app.services import email as email_service
from app.services import storage
from app.services.competency_matching import rank_trainers_for_course

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

public_router = APIRouter(prefix="/admin", tags=["admin-public"])


def _material_type_from_upload(file_type: str | None, filename: str, content_type: str | None):
    mime_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    normalized = (file_type or "").lower()
    if normalized in ("pdf", "ppt", "video", "document"):
        return normalized
    if normalized == "pptx" or suffix in {"ppt", "pptx"} or mime_type in {
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }:
        return "ppt"
    if suffix == "pdf" or mime_type == "application/pdf":
        return "pdf"
    if suffix in {"mp4", "webm", "ogg"} or mime_type.startswith("video/"):
        return "video"
    return "document"


def _mime_type_for_upload(filename: str, content_type: str | None) -> str:
    return content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"


def _get_material_for_course(db: Session, course_id: int, material_id: int) -> CourseMaterial:
    material = db.query(CourseMaterial).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.course_id == course_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


# ---------------------------------------------------------------------------
# Overview dashboard
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=OverviewStats)
def overview(db: Session = Depends(get_db)):
    pending_approvals = db.query(User).filter(User.status == UserStatus.pending).count()
    total_users = db.query(User).count()
    active_courses = db.query(Course).filter(Course.status == CourseStatus.published).count()
    total_enrollments = db.query(Enrollment).count()
    completed = db.query(Enrollment).filter(Enrollment.status == EnrollmentStatus.completed).count()
    completion_rate = round((completed / total_enrollments) * 100, 1) if total_enrollments else 0.0

    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_role = [RoleCount(role=role.value, count=count) for role, count in role_rows]

    course_rows = db.query(Course).all()
    enrollments_by_course = []
    for course in course_rows:
        course_enrollments = db.query(Enrollment).filter(Enrollment.course_id == course.id)
        enrollments_by_course.append(
            CourseEnrollmentCount(
                course=course.title,
                enrollments=course_enrollments.count(),
                completions=course_enrollments.filter(Enrollment.status == EnrollmentStatus.completed).count(),
            )
        )

    return OverviewStats(
        pending_approvals=pending_approvals,
        total_users=total_users,
        active_courses=active_courses,
        total_enrollments=total_enrollments,
        completion_rate=completion_rate,
        users_by_role=users_by_role,
        enrollments_by_course=enrollments_by_course,
    )


@router.get("/reports/export.csv")
def export_report(db: Session = Depends(get_db)):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["course", "status", "enrollments", "completions", "assigned_trainer_id"])
    for course in db.query(Course).all():
        course_enrollments = db.query(Enrollment).filter(Enrollment.course_id == course.id)
        writer.writerow(
            [
                course.title,
                course.status.value,
                course_enrollments.count(),
                course_enrollments.filter(Enrollment.status == EnrollmentStatus.completed).count(),
                course.assigned_trainer_id or "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=capacity_connect_report.csv"},
    )


# ---------------------------------------------------------------------------
# User management + approvals
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


def _review_user(db: Session, user_id: int, action: ApprovalAction, admin: User, expected_role: UserRole) -> User:
    user = db.query(User).filter(User.id == user_id, User.role == expected_role).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No pending {expected_role.value} with that id")

    user.status = UserStatus.approved if action.action == "approve" else UserStatus.rejected
    user.reviewed_at = datetime.now(timezone.utc)
    user.reviewed_by = admin.id
    db.commit()
    db.refresh(user)

    if user.profile:
        email_service.notify_account_reviewed(user.email, user.profile.full_name, approved=action.action == "approve")
    return user


@router.get("/trainees/pending", response_model=list[UserOut])
def pending_trainees(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.trainee, User.status == UserStatus.pending).all()


@router.post("/trainees/{user_id}/review", response_model=UserOut)
def review_trainee(user_id: int, payload: ApprovalAction, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _review_user(db, user_id, payload, admin, UserRole.trainee)


@router.get("/trainers/pending", response_model=list[UserOut])
def pending_trainers(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.trainer, User.status == UserStatus.pending).all()


@router.post("/trainers/{user_id}/review", response_model=UserOut)
def review_trainer(user_id: int, payload: ApprovalAction, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _review_user(db, user_id, payload, admin, UserRole.trainer)


# ---------------------------------------------------------------------------
# Courses + competency engine + course requests
# ---------------------------------------------------------------------------

@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    course = Course(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        duration_hours=payload.duration_hours,
        status=CourseStatus.draft,
        created_by=admin.id,
    )
    db.add(course)
    db.flush()

    for tag_name in payload.subject_tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue
        tag = db.query(CompetencyTag).filter(CompetencyTag.name == tag_name).first()
        if not tag:
            tag = CompetencyTag(name=tag_name)
            db.add(tag)
            db.flush()
        db.add(CourseSubjectTag(course_id=course.id, tag_id=tag.id))

    db.commit()
    db.refresh(course)
    return course


@router.get("/courses", response_model=list[CourseOut])
def list_courses_admin(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.created_at.desc()).all()


@router.get("/courses/{course_id}/trainer-suggestions", response_model=list[TrainerSuggestion])
def trainer_suggestions(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return rank_trainers_for_course(db, course)


@router.post("/courses/{course_id}/course-requests", response_model=CourseRequestOut, status_code=status.HTTP_201_CREATED)
def send_course_request(course_id: int, payload: CourseRequestCreate, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    trainer = db.query(User).filter(
        User.id == payload.trainer_id, User.role == UserRole.trainer, User.status == UserStatus.approved
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="No approved trainer with that id")

    course_request = CourseRequest(
        course_id=course.id,
        trainer_id=trainer.id,
        message=payload.message,
        status=AssignmentStatus.requested,
    )
    course.assignment_status = AssignmentStatus.requested
    db.add(course_request)
    db.commit()
    db.refresh(course_request)

    if trainer.profile:
        email_service.notify_course_request(trainer.email, trainer.profile.full_name, course.title)
    return course_request


# ---------------------------------------------------------------------------
# Course material review (gate for trainee visibility AND the RAG doubt bot)
# ---------------------------------------------------------------------------

@router.get("/materials/pending", response_model=list[MaterialOut])
def pending_materials(db: Session = Depends(get_db)):
    return db.query(CourseMaterial).filter(CourseMaterial.status == MaterialStatus.pending).all()


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def list_course_materials_admin(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).order_by(
        CourseMaterial.uploaded_at.desc()
    ).all()


@router.get("/materials/{material_id}/url", response_model=MaterialUrlOut)
def material_url_admin(material_id: int, db: Session = Depends(get_db)):
    material = db.get(CourseMaterial, material_id)
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


@router.post("/materials/{material_id}/review", response_model=MaterialOut)
def review_material(material_id: int, payload: MaterialApproval, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    material = db.get(CourseMaterial, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    material.status = MaterialStatus.approved if payload.action == "approve" else MaterialStatus.rejected
    material.approved_by = admin.id
    material.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(material)

    if material.status == MaterialStatus.approved and material.file_type.value in ("pdf", "ppt"):
        # Best-effort: only PDFs/PPTs get OCR'd + embedded. If Supabase/Ollama
        # aren't reachable yet in this environment, approval still succeeds -
        # ingestion can be retried once they're configured.
        try:
            from app.services import storage
            from app.services.rag_pipeline import ingest_material

            file_bytes = storage.download_file(material.storage_path)
            ingest_material(db, material, file_bytes)
        except Exception as exc:  # noqa: BLE001 - deliberately broad, see comment above
            material.embedding_indexed = f"error: {exc}"[:20]
            db.commit()

    return material


@router.put("/courses/{course_id}/materials/{material_id}", response_model=MaterialOut)
async def replace_material_admin(
    course_id: int,
    material_id: int,
    title: str | None = Form(None),
    file_type: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    material = _get_material_for_course(db, course_id, material_id)
    file_bytes = await file.read()
    file_name = file.filename or material.file_name or material.title
    mime_type = _mime_type_for_upload(file_name, file.content_type)
    material_type = MaterialType(_material_type_from_upload(file_type or material.file_type.value, file_name, mime_type))
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
    material.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/courses/{course_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material_admin(course_id: int, material_id: int, db: Session = Depends(get_db)):
    material = _get_material_for_course(db, course_id, material_id)
    try:
        storage.delete_file(material.storage_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        pass
    db.delete(material)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------

@router.get("/certificates/pending", response_model=list[CertificateOut])
def pending_certificates(db: Session = Depends(get_db)):
    return db.query(Certificate).filter(Certificate.status == CertificateStatus.requested).all()


@router.post("/certificates/{certificate_id}/review", response_model=CertificateOut)
def review_certificate(certificate_id: int, payload: CertificateIssueAction, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    certificate = db.get(Certificate, certificate_id)
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate request not found")

    if payload.action == "issue":
        certificate.status = CertificateStatus.issued
        certificate.certificate_number = f"IMD-CC-{certificate.id:06d}"
        certificate.issued_at = datetime.now(timezone.utc)
        certificate.issued_by = admin.id
    else:
        certificate.status = CertificateStatus.rejected

    db.commit()
    db.refresh(certificate)
    return certificate


# ---------------------------------------------------------------------------
# Announcements (creation is admin-only; reading is public - shown on homepage)
# ---------------------------------------------------------------------------

@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    announcement = Announcement(
        title=payload.title, body=payload.body, category=payload.category, created_by=admin.id
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@public_router.get("/announcements", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db)):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).limit(50).all()
