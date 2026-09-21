from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.certificate import CertificateTemplate
from app.models.competency_tag import CompetencyTag
from app.models.course import Course
from app.models.course_subject_tag import CourseSubjectTag
from app.models.enums import AssignmentStatus, CourseStatus, UserRole, UserStatus
from app.models.profile import Profile
from app.models.question import Question
from app.models.questionnaire import Questionnaire
from app.models.trainer_competency import TrainerCompetency
from app.models.user import User

SEED_PASSWORD = "ImdDemo@123"  # shared demo password for every seeded trainer/trainee - documented in the README

TAGS = [
    "AWS Sensor Calibration",
    "Radar Systems",
    "Cyclone Forecasting",
    "Monsoon Analysis",
    "Satellite Meteorology",
    "Data Quality Control",
    "Seismic Monitoring",
]

COURSES = [
    ("AWS Sensor Calibration", "Instrumentation", "Calibrating Automatic Weather Station sensors to IMD standards.", ["AWS Sensor Calibration", "Data Quality Control"]),
    ("Radar Maintenance Fundamentals", "Instrumentation", "Preventive maintenance and fault diagnosis for Doppler weather radar.", ["Radar Systems"]),
    ("Cyclone Forecasting Protocols", "Forecasting", "Track prediction, intensity estimation, and warning bulletin protocols.", ["Cyclone Forecasting"]),
    ("Monsoon Pattern Analysis", "Forecasting", "Seasonal monsoon onset/withdrawal analysis using historical and live data.", ["Monsoon Analysis"]),
    ("Satellite Meteorology Basics", "Remote Sensing", "Interpreting INSAT imagery for cloud, moisture and storm analysis.", ["Satellite Meteorology"]),
    ("Weather Data Quality Control", "Data Management", "QC pipelines for observational data before assimilation.", ["Data Quality Control"]),
    ("Seismic Monitoring for Tsunami Warning", "Instrumentation", "Seismic sensor networks feeding the tsunami early-warning system.", ["Seismic Monitoring"]),
]

TRAINERS = [
    # email, full_name, employee_id, approved?, tag->proficiency
    ("trainer.radar@imd.gov.in", "Ananya Rao", "IMD-TR-101", True, {"Radar Systems": 5, "AWS Sensor Calibration": 3}),
    ("trainer.forecast@imd.gov.in", "Vikram Sinha", "IMD-TR-102", True, {"Cyclone Forecasting": 5, "Monsoon Analysis": 4}),
    ("trainer.satellite@imd.gov.in", "Priya Nair", "IMD-TR-103", False, {"Satellite Meteorology": 4, "Data Quality Control": 3}),
    ("trainer.pending.radar@imd.gov.in", "Farhan Ali", "IMD-TR-104", False, {"Radar Systems": 4}),
    ("trainer.pending.aws@imd.gov.in", "Meera Joshi", "IMD-TR-105", False, {"AWS Sensor Calibration": 5}),
]

TRAINEES = [
    ("trainee.one@imd.gov.in", "Rahul Verma", "IMD-TE-201", True),
    ("trainee.two@imd.gov.in", "Sneha Iyer", "IMD-TE-202", True),
    ("trainee.three@imd.gov.in", "Arjun Das", "IMD-TE-203", False),
    ("trainee.pending.one@imd.gov.in", "Nisha Roy", "IMD-TE-204", False),
    ("trainee.pending.two@imd.gov.in", "Kabir Menon", "IMD-TE-205", False),
]

SAMPLE_QUESTIONS = [
    ("What does AWS stand for in IMD instrumentation?", "Automatic Weather Station", "Advanced Wind Sensor", "Atmospheric Warning System", "Aerial Water Survey", "a"),
    ("Which sensor typically requires the most frequent recalibration due to drift?", "Rain gauge", "Barometric pressure sensor", "Humidity sensor", "Wind vane", "c"),
    ("A calibration certificate is normally valid for how long before re-verification?", "1 month", "1 year", "5 years", "10 years", "b"),
    ("What is the first step before recalibrating a live AWS sensor?", "Delete historical data", "Take it offline / flag it in the network", "Increase sampling rate", "Restart the whole network", "b"),
]


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Course).count() > 0:
            return  # already seeded

        tag_by_name: dict[str, CompetencyTag] = {}
        for name in TAGS:
            tag = CompetencyTag(name=name)
            db.add(tag)
            db.flush()
            tag_by_name[name] = tag

        for email, full_name, employee_id, approved, competencies in TRAINERS:
            user = User(
                email=email,
                hashed_password=hash_password(SEED_PASSWORD),
                role=UserRole.trainer,
                status=UserStatus.approved if approved else UserStatus.pending,
            )
            db.add(user)
            db.flush()
            db.add(Profile(user_id=user.id, full_name=full_name, employee_id=employee_id, current_role_title="Scientist, IMD"))
            for tag_name, level in competencies.items():
                db.add(TrainerCompetency(trainer_id=user.id, tag_id=tag_by_name[tag_name].id, proficiency_level=level))

        trainee_ids = []
        for email, full_name, employee_id, approved in TRAINEES:
            user = User(
                email=email,
                hashed_password=hash_password(SEED_PASSWORD),
                role=UserRole.trainee,
                status=UserStatus.approved if approved else UserStatus.pending,
            )
            db.add(user)
            db.flush()
            db.add(Profile(user_id=user.id, full_name=full_name, employee_id=employee_id, current_role_title="Junior Scientist, IMD"))
            trainee_ids.append(user.id)

        db.flush()
        radar_trainer = db.query(User).filter(User.email == "trainer.radar@imd.gov.in").first()
        seed_admin = db.query(User).filter(User.role == UserRole.admin).first()

        first_course = None
        for idx, (title, category, description, tag_names) in enumerate(COURSES):
            course = Course(
                title=title,
                category=category,
                description=description,
                duration_hours=6,
                status=CourseStatus.draft,
            )
            db.add(course)
            db.flush()
            for tag_name in tag_names:
                db.add(CourseSubjectTag(course_id=course.id, tag_id=tag_by_name[tag_name].id))
            if idx == 0:
                first_course = course

        # Fully wire up the first course end-to-end so the demo has one complete flow:
        # assigned trainer, published, a questionnaire, and questions.
        if first_course is not None and radar_trainer is not None:
            first_course.assigned_trainer_id = radar_trainer.id
            first_course.assignment_status = AssignmentStatus.accepted
            first_course.status = CourseStatus.published

            questionnaire = Questionnaire(
                course_id=first_course.id,
                trainer_id=radar_trainer.id,
                title=f"{first_course.title} - Knowledge Check",
                duration_minutes=20,
                passing_score_percent=50,
            )
            db.add(questionnaire)
            db.flush()
            for q_text, a, b, c, d, correct in SAMPLE_QUESTIONS:
                db.add(
                    Question(
                        questionnaire_id=questionnaire.id,
                        question_text=q_text,
                        option_a=a,
                        option_b=b,
                        option_c=c,
                        option_d=d,
                        correct_option=correct,
                        correct_options=correct,
                        marks=1,
                    )
                )
            db.add(
                CertificateTemplate(
                    course_id=first_course.id,
                    file_url="seed/placeholders/aws-certificate-template.pdf",
                    file_type="pdf",
                    name_position={"x": 120, "y": 320, "font_size": 28},
                    uploaded_by=seed_admin.id if seed_admin else radar_trainer.id,
                )
            )

        db.commit()
        print(f"[seed_courses] Seeded {len(COURSES)} courses, {len(TRAINERS)} trainers, {len(TRAINEES)} trainees.")
        print(f"[seed_courses] Demo login password for all seeded trainers/trainees: {SEED_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
