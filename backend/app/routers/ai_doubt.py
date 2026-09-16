from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_trainee
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.ai_doubt import DoubtAnswer, DoubtQuestion
from app.services.rag_pipeline import answer_doubt

router = APIRouter(prefix="/ai-doubt", tags=["ai-doubt"], dependencies=[Depends(require_trainee)])


@router.post("/ask", response_model=DoubtAnswer)
def ask(payload: DoubtQuestion, db: Session = Depends(get_db), trainee: User = Depends(require_trainee)):
    enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == payload.course_id, Enrollment.trainee_id == trainee.id
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Enroll in this course to ask the doubt bot about it")

    try:
        result = answer_doubt(db, payload.course_id, payload.question)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"The AI doubt bot couldn't be reached - make sure Ollama is running locally ({exc})",
        ) from exc

    return DoubtAnswer(**result)
