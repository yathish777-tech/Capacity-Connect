from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

metadata = MetaData(schema=settings.database_schema if settings.database_schema != "public" else None)
Base = declarative_base(metadata=metadata)


def ensure_database_schema() -> None:
    """Create the app schema before SQLAlchemy creates any tables in it."""
    if not settings.database_schema or settings.database_schema == "public":
        return

    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{settings.database_schema}"'))


def ensure_course_material_metadata_columns() -> None:
    """Add columns for databases created before newer review/viewer support."""
    schema_prefix = f'"{settings.database_schema}".' if settings.database_schema != "public" else ""
    with engine.begin() as connection:
        connection.execute(text(f'ALTER TABLE {schema_prefix}users ADD COLUMN IF NOT EXISTS rejection_reason TEXT'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS file_size BIGINT'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150)'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}course_materials ADD COLUMN IF NOT EXISTS review_remark TEXT'))
        connection.execute(text(f'ALTER TABLE {schema_prefix}questions ADD COLUMN IF NOT EXISTS correct_options TEXT'))
        connection.execute(
            text(
                f"""
                UPDATE {schema_prefix}course_materials
                SET
                    created_at = COALESCE(created_at, uploaded_at),
                    updated_at = COALESCE(updated_at, uploaded_at)
                WHERE created_at IS NULL OR updated_at IS NULL
                """
            )
        )


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
