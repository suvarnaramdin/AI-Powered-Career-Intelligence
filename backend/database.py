# backend/database.py

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not configured."
    )


# ============================================================
# DATABASE ENGINE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=10,
    echo=False,
)


# ============================================================
# DATABASE SESSION
# ============================================================

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ============================================================
# SQLALCHEMY BASE
# ============================================================

Base = declarative_base()


# ============================================================
# FASTAPI DATABASE DEPENDENCY
# ============================================================

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ============================================================
# DATABASE CONNECTION TEST
# ============================================================

def test_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        print("========================================")
        print("Aiven MySQL connection successful")
        print("========================================")

        return True

    except Exception as e:
        print("========================================")
        print("Aiven MySQL connection failed")
        print(f"Error: {e}")
        print("========================================")

        return False


# ============================================================
# DATABASE INFORMATION
# ============================================================

def get_database_info():
    return {
        "database_configured": bool(DATABASE_URL),
        "database_name": "defaultdb",
        "database_type": "MySQL",
        "driver": "PyMySQL",
    }


# ============================================================
# EXISTING DATABASE COMPATIBILITY FUNCTIONS
# ============================================================
#
# These functions are imported by main.py.
#
# IMPORTANT:
# They do NOT drop tables or delete existing data.
# They only verify that the expected tables/columns exist.
#
# ============================================================

def ensure_user_columns():
    """
    Verify the users table exists.

    Existing application schema is preserved.
    No destructive changes are performed here.
    """

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SHOW TABLES LIKE 'users'")
            )

            if result.fetchone():
                print("✅ Users table verified")
                return True

            print("⚠️ Users table was not found")
            return False

    except Exception as e:
        print(f"⚠️ User table verification failed: {e}")
        return False


def ensure_profile_columns():
    """
    Verify the profile table exists.

    This intentionally does not automatically alter the
    production schema.
    """

    try:
        with engine.connect() as connection:

            # Try common profile table names used by the project.
            for table_name in ("profiles", "profile", "user_profiles"):

                result = connection.execute(
                    text(f"SHOW TABLES LIKE '{table_name}'")
                )

                if result.fetchone():
                    print(f"✅ Profile table verified: {table_name}")
                    return True

            print("⚠️ Profile table was not found")
            return False

    except Exception as e:
        print(f"⚠️ Profile table verification failed: {e}")
        return False


def ensure_resume_columns():
    """
    Verify the resume table exists.

    This intentionally does not automatically alter the
    production schema.
    """

    try:
        with engine.connect() as connection:

            # Try common resume table names used by the project.
            for table_name in ("resumes", "resume", "user_resumes"):

                result = connection.execute(
                    text(f"SHOW TABLES LIKE '{table_name}'")
                )

                if result.fetchone():
                    print(f"✅ Resume table verified: {table_name}")
                    return True

            print("⚠️ Resume table was not found")
            return False

    except Exception as e:
        print(f"⚠️ Resume table verification failed: {e}")
        return False