from sqlalchemy import Column, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import OptionLetter


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)

    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_option = Column(Enum(OptionLetter), nullable=False)
    correct_options = Column(Text, nullable=True)  # comma-separated option letters, e.g. "a,c"
    marks = Column(Integer, default=1)

    questionnaire = relationship("Questionnaire", back_populates="questions")

    @property
    def correct_option_list(self) -> list[str]:
        if self.correct_options:
            return [letter.strip() for letter in self.correct_options.split(",") if letter.strip()]
        return [self.correct_option.value]

    @property
    def is_multi_answer(self) -> bool:
        return len(self.correct_option_list) > 1
