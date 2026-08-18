import os
from pathlib import Path
from typing import Generator
from urllib.parse import parse_qsl, quote_plus, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "mysql-34f42d66-ramdinsuvarna10-1663.j.aivencloud.com")
DB_PORT = os.getenv("DB_PORT", "15306")
DB_NAME = os.getenv("DB_NAME", "defaultdb")
DB_USER = os.getenv("DB_USER", "avnadmin")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def _normalize_database_url(url: str | None) -> str | None:
    if not url:
        return url

    try:
        parsed = urlparse(url)
    except Exception:
        return url

    scheme = parsed.scheme.lower()
    if scheme in {"mysql", "mysql+pymysql"}:
        scheme = "mysql+pymysql"
    elif scheme in {"mysql+mysqlconnector", "mysql+mysqldb"}:
        scheme = "mysql+pymysql"
    else:
        return url

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    filtered = {}
    for key, value in query.items():
        if key.lower() in {"ssl_mode", "ssl-mode"}:
            continue
        filtered[key] = value

    # Keep MySQL SSL enabled for Aiven while stripping unsupported parameters.
    if "ssl" not in {k.lower() for k in filtered.keys()}:
        filtered["ssl"] = "true"

    normalized = urlunparse(parsed._replace(scheme=scheme, query=urlencode(filtered, doseq=True)))
    return normalized


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))

if not DATABASE_URL and DB_PASSWORD:
    encoded_password = quote_plus(DB_PASSWORD)
    DATABASE_URL = (
        f"mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl=true"
    )

if not DATABASE_URL:
    fallback_db_path = Path(__file__).resolve().parent / "internship_db"
    DATABASE_URL = f"sqlite:///{fallback_db_path}"


engine_kwargs = {"pool_pre_ping": True, "pool_recycle": 280, "echo": False}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool
else:
    engine_kwargs["connect_args"] = {"ssl": {}}
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs,
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