import csv
import io
from datetime import datetime, timezone
import mimetypes
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.announcement import Announcement
from app.models.assessment_attempt import AssessmentAttempt
from app.models.assessment_violation import AssessmentViolation
from app.models.certificate import Certificate, CertificateRequest, CertificateTemplate
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
from app.models.material_chunk import MaterialChunk
from app.models.profile import Profile
from app.models.questionnaire import Questionnaire
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.schemas.certificate import (
    CertificateIssueAction,
    CertificateOut,
    CertificateRequestAction,
    CertificateRequestOut,
    CertificateTemplateOut,
)
from app.schemas.competency import TrainerSuggestion
from app.schemas.course import CourseCreate, CourseOut, CourseRequestCreate, CourseRequestOut, CourseUpdate, MaterialApproval, MaterialOut, MaterialUrlOut
from app.schemas.reports import CourseEnrollmentCount, OverviewStats, RoleCount
from app.schemas.user import ApprovalAction, UserApprovalBulkAction, UserOut
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


def _remove_material_embeddings(db: Session, material: CourseMaterial) -> None:
    db.query(MaterialChunk).filter(MaterialChunk.material_id == material.id).delete()
    material.embedding_indexed = "no"


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


def _approval_query(db: Session, role: str | None = None, approval_status: str | None = None, q: str | None = None):
    query = db.query(User).filter(User.role.in_([UserRole.trainer, UserRole.trainee]))
    if role and role != "all":
        query = query.filter(User.role == UserRole(role))
    if approval_status and approval_status != "all":
        query = query.filter(User.status == UserStatus(approval_status))
    if q:
        needle = f"%{q.lower()}%"
        query = query.outerjoin(User.profile).filter(
            or_(
                func.lower(User.email).like(needle),
                func.lower(Profile.full_name).like(needle),
                func.lower(Profile.employee_id).like(needle),
                func.lower(Profile.skills).like(needle),
            )
        )
    return query.order_by(User.created_at.desc())


def _review_user(db: Session, user_id: int, action: ApprovalAction, admin: User, expected_role: UserRole | None = None) -> User:
    query = db.query(User).filter(User.id == user_id, User.role.in_([UserRole.trainer, UserRole.trainee]))
    if expected_role:
        query = query.filter(User.role == expected_role)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="No trainer or trainee signup with that id")

    user.status = UserStatus.approved if action.action == "approve" else UserStatus.rejected
    user.reviewed_at = datetime.now(timezone.utc)
    user.reviewed_by = admin.id
    user.rejection_reason = action.reason if action.action == "reject" else None
    db.commit()
    db.refresh(user)

    if user.profile:
        try:
            email_service.notify_account_reviewed(user.email, user.profile.full_name, approved=action.action == "approve")
        except Exception as e:
            print(f"Warning: Failed to send approval email to {user.email}: {e}")
    return user


@router.get("/user-approvals", response_model=list[UserOut])
def user_approvals(
    role: Literal["all", "trainer", "trainee"] | None = None,
    status: Literal["all", "pending", "approved", "rejected"] | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return _approval_query(db, role, status, q).all()


@router.post("/user-approvals/bulk", response_model=list[UserOut])
def bulk_review_users(
    payload: UserApprovalBulkAction,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    reviewed = []
    for user_id in payload.user_ids:
        reviewed.append(_review_user(db, user_id, ApprovalAction(action=payload.action, reason=payload.reason), admin))
    return reviewed


@router.post("/user-approvals/{user_id}/approve", response_model=UserOut)
def approve_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return _review_user(db, user_id, ApprovalAction(action="approve"), admin)


@router.post("/user-approvals/{user_id}/reject", response_model=UserOut)
def reject_user(
    user_id: int,
    payload: ApprovalAction | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return _review_user(db, user_id, ApprovalAction(action="reject", reason=payload.reason if payload else None), admin)


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


def _replace_course_tags(db: Session, course: Course, tag_names: list[str]) -> None:
    db.query(CourseSubjectTag).filter(CourseSubjectTag.course_id == course.id).delete()
    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue
        tag = db.query(CompetencyTag).filter(CompetencyTag.name == tag_name).first()
        if not tag:
            tag = CompetencyTag(name=tag_name)
            db.add(tag)
            db.flush()
        db.add(CourseSubjectTag(course_id=course.id, tag_id=tag.id))


@router.get("/courses", response_model=list[CourseOut])
def list_courses_admin(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.created_at.desc()).all()


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field in ["title", "description", "category", "duration_hours"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(course, field, value)
    if payload.status is not None:
        course.status = CourseStatus(payload.status)
    if payload.assigned_trainer_id is not None:
        trainer = db.query(User).filter(
            User.id == payload.assigned_trainer_id,
            User.role == UserRole.trainer,
            User.status == UserStatus.approved,
        ).first()
        if not trainer:
            raise HTTPException(status_code=404, detail="No approved trainer with that id")
        course.assigned_trainer_id = trainer.id
        course.assignment_status = AssignmentStatus.accepted
    if payload.subject_tag_names is not None:
        _replace_course_tags(db, course, payload.subject_tag_names)

    db.commit()
    db.refresh(course)
    return course


@router.post("/courses/{course_id}/archive", response_model=CourseOut)
def archive_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.archived
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for material in list(course.materials):
        try:
            storage.delete_file(material.storage_path)
        except Exception:
            pass
    db.delete(course)
    db.commit()
    return None


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
        try:
            email_service.notify_course_request(trainer.email, trainer.profile.full_name, course.title)
        except Exception as e:
            print(f"Warning: Failed to send course request email to {trainer.email}: {e}")
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
    material.review_remark = payload.remark
    if material.status in (MaterialStatus.rejected, MaterialStatus.approved):
        _remove_material_embeddings(db, material)
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


@router.post("/courses/{course_id}/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_material_admin(
    course_id: int,
    title: str = Form(...),
    file_type: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    file_bytes = await file.read()
    file_name = file.filename or title
    mime_type = _mime_type_for_upload(file_name, file.content_type)
    material_type = MaterialType(_material_type_from_upload(file_type, file_name, mime_type))
    try:
        storage_path = storage.upload_file(file_bytes, file_name, folder=f"course-{course_id}", content_type=mime_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    material = CourseMaterial(
        course_id=course_id,
        uploaded_by=admin.id,
        title=title,
        file_name=file_name,
        file_type=material_type,
        file_size=len(file_bytes),
        storage_path=storage_path,
        mime_type=mime_type,
        status=MaterialStatus.pending,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
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
    material.status = MaterialStatus.pending
    material.review_remark = None
    _remove_material_embeddings(db, material)
    material.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/courses/{course_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material_admin(course_id: int, material_id: int, db: Session = Depends(get_db)):
    material = _get_material_for_course(db, course_id, material_id)
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


# ---------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------

def _certificate_file_type(filename: str, content_type: str | None) -> str:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mime_type = content_type or mimetypes.guess_type(filename)[0] or ""
    if suffix == "pdf" or mime_type == "application/pdf":
        return "pdf"
    if suffix in {"png", "jpg", "jpeg"} or mime_type in {"image/png", "image/jpeg"}:
        return "image"
    raise HTTPException(status_code=400, detail="Certificate template must be PDF, PNG, JPG, or JPEG")


def _template_out(template: CertificateTemplate) -> CertificateTemplateOut:
    preview_url = None
    try:
        preview_url = storage.get_file_url(template.file_url)
    except Exception:
        preview_url = None
    return CertificateTemplateOut.model_validate(template).model_copy(update={"preview_url": preview_url})


def _request_summary(db: Session, request: CertificateRequest) -> CertificateRequestOut:
    course = db.get(Course, request.course_id)
    trainee = db.get(User, request.trainee_id)
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == request.course_id,
        Enrollment.trainee_id == request.trainee_id,
    ).first()
    questionnaire_ids = [row[0] for row in db.query(Questionnaire.id).filter(Questionnaire.course_id == request.course_id).all()]
    attempts = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.trainee_id == request.trainee_id,
        AssessmentAttempt.questionnaire_id.in_(questionnaire_ids or [0]),
    ).all()
    score = None
    violation_count = 0
    if attempts:
        best = max(attempts, key=lambda a: (a.score or 0))
        score = best.score
        violation_count = db.query(AssessmentViolation).filter(
            AssessmentViolation.attempt_id.in_([attempt.id for attempt in attempts])
        ).count()
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
        trainee_name=trainee.profile.full_name if trainee and trainee.profile else None,
        enrolled_at=enrollment.enrolled_at if enrollment else None,
        completion_date=enrollment.completed_at if enrollment else None,
        progress_percent=enrollment.progress_percent if enrollment else None,
        assessment_score=score,
        violation_count=violation_count,
        has_template=db.query(CertificateTemplate).filter(CertificateTemplate.course_id == request.course_id).first() is not None,
    )


def _generate_certificate_pdf(
    template: CertificateTemplate,
    trainee_name: str,
    course_title: str,
    completion_date: datetime | None,
    certificate_no: str,
) -> bytes:
    import fitz

    template_bytes = storage.download_file(template.file_url)
    if template.file_type == "pdf":
        doc = fitz.open(stream=template_bytes, filetype="pdf")
        page = doc[0]
    else:
        doc = fitz.open()
        page = doc.new_page(width=842, height=595)
        page.insert_image(page.rect, stream=template_bytes)

    pos = template.name_position or {}
    x = float(pos.get("x", 120))
    y = float(pos.get("y", 320))
    font_size = float(pos.get("font_size", 28))
    page.insert_text((x, y), trainee_name, fontsize=font_size, fontname="helv", color=(0.05, 0.16, 0.24))
    detail_size = max(10, font_size * 0.45)
    completed = completion_date.strftime("%d %b %Y") if completion_date else datetime.now(timezone.utc).strftime("%d %b %Y")
    page.insert_text((x, y + font_size + 18), course_title, fontsize=detail_size, fontname="helv", color=(0.05, 0.16, 0.24))
    page.insert_text((x, y + font_size + 38), f"Completed: {completed}", fontsize=detail_size, fontname="helv", color=(0.05, 0.16, 0.24))
    page.insert_text((x, y + font_size + 58), f"Certificate No: {certificate_no}", fontsize=detail_size, fontname="helv", color=(0.05, 0.16, 0.24))
    return doc.tobytes()


@router.put("/courses/{course_id}/certificate-template", response_model=CertificateTemplateOut)
async def upsert_certificate_template(
    course_id: int,
    x: float = Form(120),
    y: float = Form(320),
    font_size: float = Form(28),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not db.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Certificate template must be 5 MB or smaller")
    file_name = file.filename or f"course-{course_id}-certificate.pdf"
    file_type = _certificate_file_type(file_name, file.content_type)
    mime_type = _mime_type_for_upload(file_name, file.content_type)
    existing = db.query(CertificateTemplate).filter(CertificateTemplate.course_id == course_id).first()
    try:
        storage_path = storage.replace_file(existing.file_url, file_bytes, file_name, folder=f"course-{course_id}/certificates", content_type=mime_type) if existing else storage.upload_file(file_bytes, file_name, folder=f"course-{course_id}/certificates", content_type=mime_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    template = existing or CertificateTemplate(course_id=course_id, uploaded_by=admin.id, file_url=storage_path, file_type=file_type)
    template.file_url = storage_path
    template.file_type = file_type
    template.name_position = {"x": x, "y": y, "font_size": font_size}
    template.uploaded_by = admin.id
    template.uploaded_at = datetime.now(timezone.utc)
    db.add(template)
    db.commit()
    db.refresh(template)
    return _template_out(template)


@router.get("/courses/{course_id}/certificate-template", response_model=CertificateTemplateOut)
def get_certificate_template(course_id: int, db: Session = Depends(get_db)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Certificate template not found")
    return _template_out(template)


@router.delete("/courses/{course_id}/certificate-template", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificate_template(course_id: int, db: Session = Depends(get_db)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Certificate template not found")
    try:
        storage.delete_file(template.file_url)
    except Exception:
        pass
    db.delete(template)
    db.commit()
    return None


@router.get("/certificate-requests", response_model=list[CertificateRequestOut])
def certificate_requests(status: Literal["all", "pending", "approved", "rejected", "requested", "issued"] | None = None, db: Session = Depends(get_db)):
    query = db.query(CertificateRequest)
    if status and status != "all":
        if status == "pending":
            mapped = CertificateStatus.requested
        elif status == "approved":
            mapped = CertificateStatus.issued
        else:
            mapped = CertificateStatus(status)
        query = query.filter(CertificateRequest.status == mapped)
    return [_request_summary(db, request) for request in query.order_by(CertificateRequest.requested_at.desc()).all()]


@router.post("/certificate-requests/{request_id}/approve", response_model=CertificateRequestOut)
def approve_certificate_request(
    request_id: int,
    payload: CertificateRequestAction | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    request = db.get(CertificateRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Certificate request not found")
    template = db.query(CertificateTemplate).filter(CertificateTemplate.course_id == request.course_id).first()
    if not template:
        raise HTTPException(status_code=400, detail="Upload a certificate template before approving requests")
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == request.course_id,
        Enrollment.trainee_id == request.trainee_id,
        Enrollment.status == EnrollmentStatus.completed,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="Trainee has not completed this course")
    course = db.get(Course, request.course_id)
    trainee = db.get(User, request.trainee_id)
    certificate_no = request.certificate_no or f"IMD-CC-{request.id:06d}"
    pdf_bytes = _generate_certificate_pdf(
        template,
        trainee.profile.full_name if trainee and trainee.profile else f"Trainee #{request.trainee_id}",
        course.title if course else f"Course #{request.course_id}",
        enrollment.completed_at,
        certificate_no,
    )
    try:
        issued_path = storage.upload_file(pdf_bytes, f"{certificate_no}.pdf", folder=f"course-{request.course_id}/issued-certificates", content_type="application/pdf")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    request.status = CertificateStatus.issued
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.remark = payload.remark if payload else None
    request.certificate_no = certificate_no
    request.issued_file_url = issued_path
    db.commit()
    db.refresh(request)
    return _request_summary(db, request)


@router.post("/certificate-requests/{request_id}/reject", response_model=CertificateRequestOut)
def reject_certificate_request(
    request_id: int,
    payload: CertificateRequestAction,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    request = db.get(CertificateRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Certificate request not found")
    request.status = CertificateStatus.rejected
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.remark = payload.remark
    db.commit()
    db.refresh(request)
    return _request_summary(db, request)


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
