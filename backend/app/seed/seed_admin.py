from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.profile import Profile
from app.models.user import User


def run() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.seed_admin_email).first()
        if existing:
            return

        admin = User(
            email=settings.seed_admin_email,
            hashed_password=hash_password(settings.seed_admin_password),  # never store plaintext, even in seed data
            role=UserRole.admin,
            status=UserStatus.approved,
        )
        db.add(admin)
        db.flush()

        db.add(
            Profile(
                user_id=admin.id,
                full_name="IMD Portal Administrator",
                employee_id="IMD-ADMIN-001",
                current_role_title="System Administrator",
            )
        )
        db.commit()
        print(f"[seed_admin] Created default admin account: {settings.seed_admin_email}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
