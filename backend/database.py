import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")


# Aiven MySQL requires SSL.
# PyMySQL expects SSL configuration as a dictionary.
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "ssl": {}
    },
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=10,
    echo=False,
)


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


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


def get_database_info():
    return {
        "database_configured": bool(DATABASE_URL),
        "database_name": "defaultdb",
        "database_type": "MySQL",
        "driver": "PyMySQL",
    }


# ============================================================
# FUNCTIONS REQUIRED BY main.py
# ============================================================

def ensure_user_columns():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SHOW TABLES LIKE 'users'")
            )

            if result.fetchone():
                print("✅ Users table verified")
                return True

            print("⚠️ Users table not found")
            return False

    except Exception as e:
        print(f"⚠️ Users table verification failed: {e}")
        return False


def ensure_profile_columns():
    try:
        with engine.connect() as connection:

            for table_name in (
                "profiles",
                "profile",
                "user_profiles"
            ):
                result = connection.execute(
                    text(f"SHOW TABLES LIKE '{table_name}'")
                )

                if result.fetchone():
                    print(
                        f"✅ Profile table verified: {table_name}"
                    )
                    return True

            print("⚠️ Profile table not found")
            return False

    except Exception as e:
        print(
            f"⚠️ Profile table verification failed: {e}"
        )
        return False


def ensure_resume_columns():
    try:
        with engine.connect() as connection:

            for table_name in (
                "resumes",
                "resume",
                "user_resumes"
            ):
                result = connection.execute(
                    text(f"SHOW TABLES LIKE '{table_name}'")
                )

                if result.fetchone():
                    print(
                        f"✅ Resume table verified: {table_name}"
                    )
                    return True

            print("⚠️ Resume table not found")
            return False

    except Exception as e:
        print(
            f"⚠️ Resume table verification failed: {e}"
        )
        return False