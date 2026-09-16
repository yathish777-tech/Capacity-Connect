"""
Server-side authority for assessment integrity violations. The frontend
listens for tab-switch / window-blur / fullscreen-exit events and reports
each one here; the server (not the browser) decides what happens, so a
tampered client can't skip straight to a clean submission.

Policy: 1st violation -> warning, 2nd -> final warning, 3rd -> auto-submit.
"""

from sqlalchemy.orm import Session

from app.models.assessment_attempt import AssessmentAttempt
from app.models.assessment_violation import AssessmentViolation
from app.models.enums import AttemptStatus, ViolationType

AUTO_SUBMIT_THRESHOLD = 3


def record_violation(db: Session, attempt: AssessmentAttempt, violation_type: ViolationType) -> dict:
    existing_count = (
        db.query(AssessmentViolation).filter(AssessmentViolation.attempt_id == attempt.id).count()
    )
    violation_number = existing_count + 1

    db.add(
        AssessmentViolation(
            attempt_id=attempt.id,
            violation_type=violation_type,
            violation_number=violation_number,
        )
    )

    if violation_number >= AUTO_SUBMIT_THRESHOLD:
        attempt.status = AttemptStatus.auto_submitted
        action = "auto_submit"
    elif violation_number == AUTO_SUBMIT_THRESHOLD - 1:
        action = "final_warning"
    else:
        action = "warning"

    db.commit()
    return {"violation_number": violation_number, "action": action}
