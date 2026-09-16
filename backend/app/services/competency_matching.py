"""
Competency Engine.

Matches trainers to a course based on weighted tag-overlap between the
course's subject tags and each trainer's declared competency tags. Score is
a proficiency-weighted Jaccard-style overlap in [0, 1]:

    score = sum(proficiency for shared tags) / (sum(proficiency for all trainer tags) + course_tag_count - shared)

Trainers with zero overlapping tags are excluded from the ranking.
"""

from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_subject_tag import CourseSubjectTag
from app.models.enums import UserRole, UserStatus
from app.models.trainer_competency import TrainerCompetency
from app.models.user import User
from app.schemas.competency import TrainerSuggestion


def rank_trainers_for_course(db: Session, course: Course, limit: int = 10) -> list[TrainerSuggestion]:
    course_tag_ids = {
        row.tag_id for row in db.query(CourseSubjectTag).filter(CourseSubjectTag.course_id == course.id)
    }
    if not course_tag_ids:
        return []

    trainers = (
        db.query(User)
        .filter(User.role == UserRole.trainer, User.status == UserStatus.approved)
        .all()
    )

    suggestions: list[TrainerSuggestion] = []
    for trainer in trainers:
        trainer_tags: dict[int, int] = {
            tc.tag_id: tc.proficiency_level for tc in trainer.competencies
        }
        shared_ids = course_tag_ids & trainer_tags.keys()
        if not shared_ids:
            continue

        shared_weight = sum(trainer_tags[tid] for tid in shared_ids)
        trainer_total_weight = sum(trainer_tags.values()) or 1
        union_size = len(set(trainer_tags.keys()) | course_tag_ids)
        score = shared_weight / (trainer_total_weight + union_size - len(shared_ids))
        score = round(min(score, 1.0), 4)

        matched_tag_names = [
            tag.tag.name
            for tag in trainer.competencies
            if tag.tag_id in shared_ids
        ]

        suggestions.append(
            TrainerSuggestion(
                trainer_id=trainer.id,
                full_name=trainer.profile.full_name if trainer.profile else trainer.email,
                email=trainer.email,
                match_score=score,
                matched_tags=matched_tag_names,
            )
        )

    suggestions.sort(key=lambda s: s.match_score, reverse=True)
    return suggestions[:limit]
