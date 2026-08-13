import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:@localhost:3306/internship_db",
)

if DATABASE_URL.startswith("sqlite"):
    if DATABASE_URL == "sqlite:///:memory:":
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def ensure_columns(table_name, column_definitions):
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        Base.metadata.create_all(bind=engine)
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    for column_name, definition in column_definitions.items():
        if column_name not in existing_columns:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def ensure_profile_columns():
    ensure_columns(
        "profile",
        {
            "headline": "VARCHAR(255)",
            "location": "VARCHAR(255)",
            "about": "TEXT",
            "contact_info": "TEXT",
            "education": "TEXT",
            "projects": "TEXT",
            "social_links": "TEXT",
            "preferences": "TEXT",
            "profile_picture": "VARCHAR(500)",
            "banner_image": "VARCHAR(500)",
            "completion_percentage": "INT",
            "completion_suggestions": "TEXT",
            "experience": "TEXT",
        },
    )


def ensure_user_columns():
    ensure_columns(
        "users",
        {
            "role": "VARCHAR(20) DEFAULT 'USER'",
        },
    )


def ensure_resume_columns():
    ensure_columns(
        "resumes",
        {
            "user_email": "VARCHAR(100)",
            "stored_path": "VARCHAR(500)",
            "content": "TEXT",
            "parsed_name": "VARCHAR(100)",
            "parsed_email": "VARCHAR(100)",
            "parsed_phone": "VARCHAR(20)",
            "parsed_skills": "TEXT",
            "parsed_college": "VARCHAR(255)",
            "parsed_degree": "VARCHAR(100)",
            "parsed_experience": "TEXT",
            "parsed_certifications": "TEXT",
            "parsed_projects": "TEXT",
            "parsed_summary": "TEXT",
            "uploaded_at": "DATETIME",
        },
    )

def ensure_job_description_table():
    Base.metadata.create_all(bind=engine)

ensure_profile_columns()
ensure_user_columns()
ensure_resume_columns()
ensure_job_description_table()
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()