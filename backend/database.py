import os
from pathlib import Path
from typing import Generator
from urllib.parse import parse_qsl, quote_plus, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

load_dotenv()

DB_HOST = (os.getenv("DB_HOST") or os.getenv("MYSQL_HOST") or "").strip()
DB_PORT = (os.getenv("DB_PORT") or os.getenv("MYSQL_PORT") or "").strip()
DB_NAME = (os.getenv("DB_NAME") or os.getenv("MYSQL_DATABASE") or "").strip()
DB_USER = (os.getenv("DB_USER") or os.getenv("MYSQL_USER") or "").strip()
DB_PASSWORD = (os.getenv("DB_PASSWORD") or os.getenv("MYSQL_PASSWORD") or "").strip()


def _normalize_database_url(url: str | None) -> str | None:
    if not url:
        return url

    url = url.strip()
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

    if "ssl" not in {k.lower() for k in filtered.keys()}:
        filtered["ssl"] = "true"

    normalized = urlunparse(parsed._replace(scheme=scheme, query=urlencode(filtered, doseq=True)))
    return normalized


def _build_database_url() -> str:
    database_url = _normalize_database_url(os.getenv("DATABASE_URL"))
    if database_url:
        return database_url

    if DB_HOST and DB_USER and DB_NAME and DB_PASSWORD:
        encoded_user = quote_plus(DB_USER)
        encoded_password = quote_plus(DB_PASSWORD)
        port = DB_PORT or "3306"
        return f"mysql+pymysql://{encoded_user}:{encoded_password}@{DB_HOST}:{port}/{DB_NAME}?ssl=true"

    fallback_db_path = Path(__file__).resolve().parent / "internship_db"
    return f"sqlite:///{fallback_db_path}"


DATABASE_URL = _build_database_url()

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 1800,
    "echo": False,
}

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
            dialect_name = engine.dialect.name.lower()

            for table_name in (
                "resumes",
                "resume",
                "user_resumes"
            ):
                if dialect_name == "sqlite":
                    table_exists = connection.execute(
                        text("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :table_name"),
                        {"table_name": table_name},
                    ).fetchone()
                else:
                    table_exists = connection.execute(
                        text(f"SHOW TABLES LIKE '{table_name}'")
                    ).fetchone()

                if not table_exists:
                    continue

                print(f"✅ Resume table verified: {table_name}")

                if dialect_name == "sqlite":
                    existing_columns = {
                        row[1] for row in connection.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
                    }
                    required_columns = {
                        "user_email": "VARCHAR(100)",
                        "stored_path": "VARCHAR(500)",
                        "content": "TEXT",
                        "parsed_name": "VARCHAR(100)",
                        "parsed_email": "VARCHAR(100)",
                        "parsed_phone": "VARCHAR(20)",
                        "parsed_skills": "TEXT",
                        "parsed_college": "TEXT",
                        "parsed_degree": "TEXT",
                        "parsed_experience": "TEXT",
                        "parsed_certifications": "TEXT",
                        "parsed_projects": "TEXT",
                        "parsed_summary": "TEXT",
                        "uploaded_at": "DATETIME",
                    }

                    for column_name, column_type in required_columns.items():
                        if column_name not in existing_columns:
                            connection.execute(
                                text(f"ALTER TABLE '{table_name}' ADD COLUMN '{column_name}' {column_type}")
                            )
                            print(f"✅ Added {table_name}.{column_name}")
                else:
                    existing_columns = {
                        row[0] for row in connection.execute(
                            text(
                                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name"
                            ),
                            {"table_name": table_name},
                        ).fetchall()
                    }
                    required_columns = {
                        "user_email": "VARCHAR(100)",
                        "stored_path": "VARCHAR(500)",
                        "content": "TEXT",
                        "parsed_name": "VARCHAR(100)",
                        "parsed_email": "VARCHAR(100)",
                        "parsed_phone": "VARCHAR(20)",
                        "parsed_skills": "TEXT",
                        "parsed_college": "TEXT",
                        "parsed_degree": "TEXT",
                        "parsed_experience": "TEXT",
                        "parsed_certifications": "TEXT",
                        "parsed_projects": "TEXT",
                        "parsed_summary": "TEXT",
                        "uploaded_at": "DATETIME",
                    }
                    for column_name, column_type in required_columns.items():
                        if column_name not in existing_columns:
                            connection.execute(
                                text(
                                    f"ALTER TABLE `{table_name}` "
                                    f"ADD COLUMN `{column_name}` {column_type}"
                                )
                            )
                            print(f"✅ Added {table_name}.{column_name}")

                    for column_name in ("parsed_college", "parsed_degree"):
                        result = connection.execute(
                            text(
                                "SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH "
                                "FROM INFORMATION_SCHEMA.COLUMNS "
                                "WHERE TABLE_SCHEMA = DATABASE() "
                                "AND TABLE_NAME = :table_name "
                                "AND COLUMN_NAME = :column_name"
                            ),
                            {"table_name": table_name, "column_name": column_name},
                        )
                        column_info = result.fetchone()
                        if column_info and column_info[0] in ("varchar", "char"):
                            connection.execute(
                                text(
                                    f"ALTER TABLE `{table_name}` "
                                    f"MODIFY COLUMN `{column_name}` TEXT"
                                )
                            )
                            print(f"✅ Fixed {table_name}.{column_name} to TEXT")

                return True

            print("⚠️ Resume table not found")
            return False

    except Exception as e:
        print(
            f"⚠️ Resume table verification failed: {e}"
        )
        return False