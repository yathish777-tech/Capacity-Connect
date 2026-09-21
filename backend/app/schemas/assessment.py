from datetime import datetime
from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class QuestionIn(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: Optional[Literal["a", "b", "c", "d"]] = None
    correct_options: Optional[List[Literal["a", "b", "c", "d"]]] = None
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
    is_multi_answer: bool = False


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
    correct_options: List[str] = Field(default_factory=list, validation_alias="correct_option_list")
    is_multi_answer: bool = False
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


AnswerValue = Union[Literal["a", "b", "c", "d"], List[Literal["a", "b", "c", "d"]]]


class AttemptSubmit(BaseModel):
    answers: Dict[int, AnswerValue]


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

class AttemptReview(AttemptOut):
    answers: Optional[Dict[str, Union[str, List[str]]]] = None
    questions: List[QuestionOutTrainer]

class ReAttemptRequestCreate(BaseModel):
    reason: str

class ReAttemptRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    attempt_id: int
    trainee_id: int
    questionnaire_id: int
    reason: Optional[str] = None
    status: str
    requested_at: datetime
    reviewed_at: Optional[datetime] = None

class ReAttemptRequestReview(BaseModel):
    action: Literal["approve", "reject"]
