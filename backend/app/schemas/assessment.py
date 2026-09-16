from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class QuestionIn(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: Literal["a", "b", "c", "d"]
    marks: int = 1


class QuestionnaireCreate(BaseModel):
    course_id: int
    title: str
    deadline: Optional[datetime] = None
    duration_minutes: int = 30
    passing_score_percent: int = 50
    questions: List[QuestionIn]


class QuestionOutTrainee(BaseModel):
    """What a trainee sees while taking the test — no correct_option."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    marks: int


class QuestionnaireOutTrainee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    deadline: Optional[datetime] = None
    duration_minutes: int
    passing_score_percent: int
    questions: List[QuestionOutTrainee]


class QuestionOutTrainer(BaseModel):
    """Trainer/Admin view - includes the correct answer."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    marks: int


class QuestionnaireDetailTrainer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    deadline: Optional[datetime] = None
    duration_minutes: int
    passing_score_percent: int
    questions: List[QuestionOutTrainer]


class QuestionnaireSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    deadline: Optional[datetime] = None
    duration_minutes: int
    passing_score_percent: int
    question_count: int = 0


class AttemptSubmit(BaseModel):
    answers: Dict[int, Literal["a", "b", "c", "d"]]


class ViolationLog(BaseModel):
    violation_type: Literal["tab_switch", "window_blur", "fullscreen_exit"]


class ViolationLogResult(BaseModel):
    violation_number: int
    action: Literal["warning", "final_warning", "auto_submit"]


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    questionnaire_id: int
    trainee_id: int
    status: str
    score: Optional[float] = None
    total_marks: Optional[float] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None


class AttemptWithViolations(AttemptOut):
    trainee_name: str
    violation_count: int


class AttemptStartResponse(BaseModel):
    attempt: AttemptOut
    questionnaire: QuestionnaireOutTrainee
