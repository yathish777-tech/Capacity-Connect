from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine, ensure_course_material_metadata_columns, ensure_database_schema
from app.routers import admin, ai_doubt, assessments, auth, certificates, courses, trainee, trainer


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.models  # noqa: F401 - populate Base.metadata with every table

    if settings.using_implicit_database_fallback():
        raise RuntimeError(
            "DATABASE_URL is not configured. Create backend/.env from backend/.env.example and set "
            "DATABASE_URL to your real local Postgres password or Supabase postgresql:// connection string. "
            "The app otherwise falls back to postgres:postgres@localhost, which does not match your machine."
        )

    ensure_database_schema()
    Base.metadata.create_all(bind=engine)
    ensure_course_material_metadata_columns()

    from app.seed.seed_admin import run as seed_admin_run
    from app.seed.seed_courses import run as seed_courses_run

    seed_admin_run()
    seed_courses_run()

    yield
    # (no shutdown cleanup needed - SQLAlchemy's engine pool closes with the process)


app = FastAPI(
    title="CAPACITY CONNECT",
    description="Digital Capacity Building and Learning Management Portal for the India Meteorological Department",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([*settings.frontend_origins, settings.frontend_origin])),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin.public_router)
app.include_router(trainer.router)
app.include_router(trainee.router)
app.include_router(courses.router)
app.include_router(assessments.router)
app.include_router(certificates.router)
app.include_router(ai_doubt.router)


@app.get("/")
def root():
    return {
        "service": "CAPACITY CONNECT API",
        "docs": "/docs",
        "status": "ok",
    }
