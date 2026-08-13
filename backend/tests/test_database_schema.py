import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from sqlalchemy import inspect, text
from sqlalchemy.orm import sessionmaker

import database


class ResumeSchemaTests(unittest.TestCase):
    def test_ensure_resume_columns_adds_missing_columns(self):
        original_engine = database.engine
        original_session_local = database.SessionLocal

        engine = None
        db_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmpfile:
                db_path = tmpfile.name

            engine = database.create_engine(
                f"sqlite:///{db_path}",
                connect_args={"check_same_thread": False},
            )
            database.engine = engine
            database.SessionLocal = sessionmaker(bind=engine)

            with engine.begin() as conn:
                conn.execute(
                    text(
                        "CREATE TABLE resumes ("
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                        "email VARCHAR(100), "
                        "filename VARCHAR(255), "
                        "file_path VARCHAR(500), "
                        "file_type VARCHAR(50), "
                        "upload_date DATETIME"
                        ")"
                    )
                )

            database.ensure_resume_columns()

            inspector = inspect(engine)
            columns = {column["name"] for column in inspector.get_columns("resumes")}

            self.assertIn("user_email", columns)
            self.assertIn("stored_path", columns)
            self.assertIn("content", columns)
            self.assertIn("parsed_name", columns)
            self.assertIn("parsed_email", columns)
            self.assertIn("parsed_phone", columns)
            self.assertIn("parsed_skills", columns)
            self.assertIn("parsed_college", columns)
            self.assertIn("parsed_degree", columns)
            self.assertIn("parsed_experience", columns)
            self.assertIn("parsed_summary", columns)
            self.assertIn("uploaded_at", columns)
        finally:
            if engine is not None:
                engine.dispose()
            database.engine = original_engine
            database.SessionLocal = original_session_local
            if db_path and os.path.exists(db_path):
                try:
                    os.remove(db_path)
                except PermissionError:
                    pass


if __name__ == "__main__":
    unittest.main()
