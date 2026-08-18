

import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool


# ============================================================
# AIVEN MYSQL CONFIGURATION
# ============================================================

DB_HOST = os.getenv(
    "DB_HOST",
    "mysql-34f42d66-ramdinsuvarna10-1663.j.aivencloud.com"
)

DB_PORT = os.getenv(
    "DB_PORT",
    "15306"
)

DB_NAME = os.getenv(
    "DB_NAME",
    "defaultdb"
)

DB_USER = os.getenv(
    "DB_USER",
    "avnadmin"
)

DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL and DB_PASSWORD:
    encoded_password = quote_plus(DB_PASSWORD)
    DATABASE_URL = (
        f"mysql+pymysql://"
        f"{DB_USER}:{encoded_password}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

if not DATABASE_URL:
    fallback_db_path = Path(__file__).resolve().parent / "internship_db"
    DATABASE_URL = f"sqlite:///{fallback_db_path}"


# ============================================================
# SQLALCHEMY ENGINE
# ============================================================

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool
else:
    engine_kwargs["connect_args"] = {"ssl": {}}

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs
)


# ============================================================
# SESSION
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# BASE
# ============================================================

Base = declarative_base()


# ============================================================
# DATABASE CONNECTION TEST
# ============================================================

def test_database_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        print("========================================")
        print("Successfully connected to Aiven MySQL")
        print("========================================")

        return True

    except Exception as e:
        print("========================================")
        print("Aiven MySQL connection failed")
        print(f"Error: {e}")
        print("========================================")

        raise


# ============================================================
# ENSURE COLUMNS
# ============================================================

def ensure_columns(table_name, column_definitions):
    """
    Check whether required columns exist.
    Add missing columns automatically.
    """

    inspector = inspect(engine)

    if not inspector.has_table(table_name):
        Base.metadata.create_all(bind=engine)
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    for column_name, definition in column_definitions.items():

        if column_name not in existing_columns:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        f"ALTER TABLE `{table_name}` "
                        f"ADD COLUMN `{column_name}` {definition}"
                    )
                )

            print(
                f"Added missing column "
                f"{table_name}.{column_name}"
            )


# ============================================================
# PROFILE TABLE
# ============================================================

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
        }
    )


# ============================================================
# USERS TABLE
# ============================================================

def ensure_user_columns():

    ensure_columns(
        "users",
        {
            "role": "VARCHAR(20) DEFAULT 'USER'",
        }
    )


# ============================================================
# RESUMES TABLE
# ============================================================

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
        }
    )


# ============================================================
# JOB DESCRIPTION TABLE
# ============================================================

def ensure_job_description_table():

    Base.metadata.create_all(bind=engine)


# ============================================================
# INITIALIZE DATABASE
# ============================================================

def initialize_database():

    print("========================================")
    print("Starting database initialization...")
    print("Database Host:", DB_HOST)
    print("Database Port:", DB_PORT)
    print("Database Name:", DB_NAME)
    print("Database User:", DB_USER)
    print("========================================")

    # Test connection first
    test_database_connection()

    # Create all SQLAlchemy model tables
    Base.metadata.create_all(bind=engine)

    # Add required columns
    ensure_profile_columns()
    ensure_user_columns()
    ensure_resume_columns()
    ensure_job_description_table()

    print("========================================")
    print("Database initialization completed")
    print("========================================")


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# RUN DATABASE INITIALIZATION
# ============================================================

initialize_database()
