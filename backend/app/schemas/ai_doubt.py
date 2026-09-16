from typing import List

from pydantic import BaseModel


class DoubtQuestion(BaseModel):
    course_id: int
    question: str


class SourceReference(BaseModel):
    material_title: str
    chunk_preview: str


class DoubtAnswer(BaseModel):
    answer: str
    sources: List[SourceReference]
