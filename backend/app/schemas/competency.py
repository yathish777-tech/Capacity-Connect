from typing import List

from pydantic import BaseModel


class CompetencyTagOut(BaseModel):
    id: int
    name: str
    category: str | None = None


class TrainerCompetencyIn(BaseModel):
    tag_name: str
    proficiency_level: int = 3


class TrainerSuggestion(BaseModel):
    trainer_id: int
    full_name: str
    email: str
    match_score: float  # 0-1
    matched_tags: List[str]
