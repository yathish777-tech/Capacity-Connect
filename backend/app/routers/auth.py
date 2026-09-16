from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import UserRole, UserStatus
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    if db.query(Profile).filter(Profile.employee_id == payload.employee_id).first():
        raise HTTPException(status_code=400, detail="This employee ID is already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole(payload.role),
        status=UserStatus.pending,
    )
    db.add(user)
    db.flush()  # get user.id before creating the profile

    profile = Profile(
        user_id=user.id,
        full_name=payload.full_name,
        employee_id=payload.employee_id,
        qualifications=payload.qualifications,
        work_experience=payload.work_experience,
        skills=payload.skills,
        current_role_title=payload.current_role_title,
        phone=payload.phone,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token(subject=str(user.id), role=user.role.value, status=user.status.value)
    full_name = user.profile.full_name if user.profile else user.email.split("@")[0]
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=user.role.value,
        status=user.status.value,
        full_name=full_name,
    )


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user
