from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainee, require_trainer
from app.models.assessment_attempt import AssessmentAttempt
from app.models.assessment_violation import AssessmentViolation
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.enums import AttemptStatus, EnrollmentStatus, ViolationType
from app.models.question import Question
from app.models.questionnaire import Questionnaire
from app.models.user import User
from app.schemas.assessment import (
    AttemptOut,
    AttemptStartResponse,
    AttemptSubmit,
    AttemptWithViolations,
    QuestionnaireCreate,
    QuestionnaireDetailTrainer,
    QuestionnaireOutTrainee,
    QuestionnaireSummary,
    ViolationLog,
    ViolationLogResult,
    AttemptReview,
    ReAttemptRequestCreate,
    ReAttemptRequestOut,
    ReAttemptRequestReview,
)
from app.services.integrity_checker import record_violation
from app.models.reattempt_request import ReAttemptRequest
from app.models.enums import ReAttemptStatus

router = APIRouter(prefix="/assessments", tags=["assessments"])


# ---------------------------------------------------------------------------
# Trainer: question bank + monitoring
# ---------------------------------------------------------------------------

@router.post("/questionnaires", response_model=QuestionnaireDetailTrainer, status_code=201)
def create_questionnaire(
    payload: QuestionnaireCreate, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)
):
    course = db.query(Course).filter(
        Course.id == payload.course_id, Course.assigned_trainer_id == trainer.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="You are not the assigned trainer for this course")

    questionnaire = Questionnaire(
        course_id=course.id,
        trainer_id=trainer.id,
        title=payload.title,
        deadline=payload.deadline,
        duration_minutes=payload.duration_minutes,
        passing_score_percent=payload.passing_score_percent,
    )
    db.add(questionnaire)
    db.flush()

    for q in payload.questions:
        correct_options = q.correct_options or ([q.correct_option] if q.correct_option else [])
        correct_options = sorted(set(correct_options))
        if not correct_options:
            raise HTTPException(status_code=400, detail="Each question needs at least one correct option")
        db.add(
            Question(
                questionnaire_id=questionnaire.id,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_option=correct_options[0],
                correct_options=",".join(correct_options),
                marks=q.marks,
            )
        )
    db.commit()
    db.refresh(questionnaire)
    return questionnaire


@router.get("/questionnaires/mine", response_model=list[QuestionnaireDetailTrainer])
def my_questionnaires(
    course_id: Optional[int] = None, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)
):
    query = db.query(Questionnaire).filter(Questionnaire.trainer_id == trainer.id)
    if course_id is not None:
        query = query.filter(Questionnaire.course_id == course_id)
    return query.order_by(Questionnaire.created_at.desc()).all()


@router.get("/questionnaires/{questionnaire_id}/attempts", response_model=list[AttemptWithViolations])
def monitor_attempts(
    questionnaire_id: int, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)
):
    questionnaire = db.query(Questionnaire).filter(
        Questionnaire.id == questionnaire_id, Questionnaire.trainer_id == trainer.id
    ).first()
    if not questionnaire:
        raise HTTPException(status_code=403, detail="Not your questionnaire")

    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.questionnaire_id == questionnaire_id).all()
    results = []
    for attempt in attempts:
        violation_count = db.query(AssessmentViolation).filter(
            AssessmentViolation.attempt_id == attempt.id
        ).count()
        trainee = db.get(User, attempt.trainee_id)
        trainee_name = trainee.profile.full_name if trainee and trainee.profile else (trainee.email if trainee else "Unknown")
        results.append(
            AttemptWithViolations(
                id=attempt.id,
                questionnaire_id=attempt.questionnaire_id,
                trainee_id=attempt.trainee_id,
                status=attempt.status.value,
                score=attempt.score,
                total_marks=attempt.total_marks,
                started_at=attempt.started_at,
                submitted_at=attempt.submitted_at,
                trainee_name=trainee_name,
                violation_count=violation_count,
            )
        )
    return results


# ---------------------------------------------------------------------------
# Trainee: browse + take
# ---------------------------------------------------------------------------

@router.get("/course/{course_id}/available", response_model=list[QuestionnaireSummary])
def available_questionnaires(
    course_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == course_id, Enrollment.trainee_id == trainee.id
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Enroll in this course to view its assessments")

    questionnaires = db.query(Questionnaire).filter(Questionnaire.course_id == course_id).all()
    return [
        QuestionnaireSummary(
            id=q.id,
            course_id=q.course_id,
            title=q.title,
            deadline=q.deadline,
            duration_minutes=q.duration_minutes,
            passing_score_percent=q.passing_score_percent,
            question_count=len(q.questions),
        )
        for q in questionnaires
    ]


@router.post("/questionnaires/{questionnaire_id}/start", response_model=AttemptStartResponse)
def start_attempt(
    questionnaire_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    questionnaire = db.get(Questionnaire, questionnaire_id)
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Assessment not found")

    enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == questionnaire.course_id, Enrollment.trainee_id == trainee.id
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Enroll in this course to take its assessments")

    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.questionnaire_id == questionnaire_id,
        AssessmentAttempt.trainee_id == trainee.id,
        AssessmentAttempt.status == AttemptStatus.in_progress,
    ).first()

    if not attempt:
        already_done = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.questionnaire_id == questionnaire_id,
            AssessmentAttempt.trainee_id == trainee.id,
        ).first()
        if already_done:
            raise HTTPException(status_code=400, detail="You have already attempted this assessment")
        attempt = AssessmentAttempt(questionnaire_id=questionnaire_id, trainee_id=trainee.id)
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    return AttemptStartResponse(
        attempt=AttemptOut.model_validate(attempt),
        questionnaire=QuestionnaireOutTrainee.model_validate(questionnaire),
    )


@router.post("/attempts/{attempt_id}/violation", response_model=ViolationLogResult)
def log_violation(
    attempt_id: int, payload: ViolationLog, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id, AssessmentAttempt.trainee_id == trainee.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != AttemptStatus.in_progress:
        raise HTTPException(status_code=400, detail="This attempt is no longer in progress")

    result = record_violation(db, attempt, ViolationType(payload.violation_type))
    return ViolationLogResult(**result)


def _normalize_answer(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(set(value))
    return [value]


def _grade_attempt(db: Session, attempt: AssessmentAttempt, answers: dict[int, str | list[str]]) -> None:
    questions = db.query(Question).filter(Question.questionnaire_id == attempt.questionnaire_id).all()
    total_marks = sum(q.marks for q in questions)
    score = sum(
        q.marks
        for q in questions
        if _normalize_answer(answers.get(q.id)) == sorted(q.correct_option_list)
    )

    question_by_id = {q.id: q for q in questions}
    attempt.answers = {
        str(k): _normalize_answer(v) if question_by_id.get(k) and question_by_id[k].is_multi_answer else (_normalize_answer(v)[0] if _normalize_answer(v) else "")
        for k, v in answers.items()
    }
    attempt.score = score
    attempt.total_marks = total_marks
    if attempt.status == AttemptStatus.in_progress:
        attempt.status = AttemptStatus.submitted
    attempt.submitted_at = datetime.now(timezone.utc)

    questionnaire = db.get(Questionnaire, attempt.questionnaire_id)
    passed = total_marks > 0 and (score / total_marks) * 100 >= questionnaire.passing_score_percent
    if passed:
        enrollment = db.query(Enrollment).filter(
            Enrollment.course_id == questionnaire.course_id, Enrollment.trainee_id == attempt.trainee_id
        ).first()
        if enrollment:
            enrollment.status = EnrollmentStatus.completed
            enrollment.progress_percent = 100.0
            enrollment.completed_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptOut)
def submit_attempt(
    attempt_id: int, payload: AttemptSubmit, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id, AssessmentAttempt.trainee_id == trainee.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.submitted_at is not None or attempt.status not in (AttemptStatus.in_progress, AttemptStatus.auto_submitted):
        raise HTTPException(status_code=400, detail="This attempt has already been finalized")

    _grade_attempt(db, attempt, payload.answers)
    db.refresh(attempt)
    return attempt


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
def get_attempt(attempt_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id, AssessmentAttempt.trainee_id == trainee.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


@router.get("/attempts/{attempt_id}/review", response_model=AttemptReview)
def get_attempt_review(attempt_id: int, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id, AssessmentAttempt.trainee_id == trainee.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == AttemptStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot review an attempt that is still in progress")

    questions = db.query(Question).filter(Question.questionnaire_id == attempt.questionnaire_id).all()
    
    return AttemptReview(
        id=attempt.id,
        questionnaire_id=attempt.questionnaire_id,
        trainee_id=attempt.trainee_id,
        status=attempt.status.value,
        score=attempt.score,
        total_marks=attempt.total_marks,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        answers=attempt.answers,
        questions=questions
    )


@router.post("/attempts/{attempt_id}/request-reattempt", response_model=ReAttemptRequestOut)
def request_reattempt(
    attempt_id: int, payload: ReAttemptRequestCreate, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)
):
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id, AssessmentAttempt.trainee_id == trainee.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    existing = db.query(ReAttemptRequest).filter(
        ReAttemptRequest.attempt_id == attempt_id,
        ReAttemptRequest.status == ReAttemptStatus.requested
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A re-attempt request is already pending for this attempt")
    
    req = ReAttemptRequest(
        attempt_id=attempt.id,
        trainee_id=trainee.id,
        questionnaire_id=attempt.questionnaire_id,
        reason=payload.reason
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

@router.get("/reattempt-requests/pending", response_model=list[ReAttemptRequestOut])
def pending_reattempt_requests(db: Session = Depends(get_db), trainer: User = Depends(require_trainer)):
    return db.query(ReAttemptRequest).join(Questionnaire).filter(
        Questionnaire.trainer_id == trainer.id,
        ReAttemptRequest.status == ReAttemptStatus.requested
    ).all()

@router.post("/reattempt-requests/{request_id}/review", response_model=ReAttemptRequestOut)
def review_reattempt_request(
    request_id: int, payload: ReAttemptRequestReview, db: Session = Depends(get_db), trainer: User = Depends(require_trainer)
):
    req = db.query(ReAttemptRequest).join(Questionnaire).filter(
        ReAttemptRequest.id == request_id,
        Questionnaire.trainer_id == trainer.id
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or not authorized")
    if req.status != ReAttemptStatus.requested:
        raise HTTPException(status_code=400, detail="Request is already reviewed")
    
    req.status = ReAttemptStatus.approved if payload.action == "approve" else ReAttemptStatus.rejected
    req.reviewed_by = trainer.id
    req.reviewed_at = datetime.now(timezone.utc)
    
    if req.status == ReAttemptStatus.approved:
        # Delete the old attempt so the trainee can start a new one
        attempt = db.get(AssessmentAttempt, req.attempt_id)
        if attempt:
            db.delete(attempt)
    
    db.commit()
    db.refresh(req)
    return req
