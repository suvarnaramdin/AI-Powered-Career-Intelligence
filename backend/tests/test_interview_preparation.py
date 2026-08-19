import os
import sys
import unittest
from pathlib import Path

import bcrypt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi.testclient import TestClient

import main
import models
from database import SessionLocal


class InterviewPreparationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        db = SessionLocal()
        try:
            db.query(models.InterviewPractice).delete()
            db.query(models.InterviewBookmark).delete()
            db.query(models.InterviewQuestion).delete()
            db.query(models.User).delete()
            db.commit()
        finally:
            db.close()

    def register_login(self, email, name):
        registered = self.client.post("/register", json={"name": name, "email": email, "password": "secret123"})
        self.assertEqual(registered.status_code, 200, registered.text)
        logged_in = self.client.post("/login", json={"email": email, "password": "secret123"})
        return {"Authorization": f"Bearer {logged_in.json()['access_token']}"}

    def test_user_browsing_bookmarks_and_practice_are_isolated(self):
        user_a = self.register_login("interview-a@example.com", "Interview A")
        user_b = self.register_login("interview-b@example.com", "Interview B")
        db = SessionLocal()
        try:
            question = models.InterviewQuestion(
                category="SQL / Database Round",
                subcategory="Joins",
                question="How do INNER JOIN and LEFT JOIN differ?",
                answer="INNER JOIN keeps matching rows; LEFT JOIN keeps every left row and fills missing matches with NULL.",
                explanation="Choose the join based on whether unmatched left-side rows must remain.",
                difficulty="Beginner",
                tags="SQL, joins, fresher",
                is_active=1,
            )
            db.add(question)
            db.commit()
            question_id = question.id
        finally:
            db.close()

        listed = self.client.get("/api/interview/questions?search=joins", headers=user_a)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["total"], 1)
        self.assertEqual(self.client.post(f"/api/interview/questions/{question_id}/bookmark", headers=user_a).status_code, 200)
        self.assertEqual(len(self.client.get("/api/interview/bookmarks", headers=user_a).json()["items"]), 1)
        self.assertEqual(self.client.get("/api/interview/bookmarks", headers=user_b).json()["items"], [])
        practice = self.client.post(f"/api/interview/questions/{question_id}/practice", headers=user_a, json={"answer_submitted": "I would use LEFT JOIN when unmatched rows matter.", "completed": True})
        self.assertEqual(practice.status_code, 200)

    def test_admin_crud_and_regular_user_forbidden(self):
        user = self.register_login("interview-user@example.com", "Interview User")
        db = SessionLocal()
        try:
            admin = models.User(name="Interview Admin", email="interview-admin@example.com", password=bcrypt.hashpw("secret123".encode(), bcrypt.gensalt()).decode(), role="ADMIN")
            db.add(admin)
            db.commit()
        finally:
            db.close()
        admin_login = self.client.post("/api/admin/login", json={"email": "interview-admin@example.com", "password": "secret123"})
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        self.assertEqual(self.client.get("/api/admin/interview/questions", headers=user).status_code, 403)
        created = self.client.post("/api/admin/interview/questions", headers=admin_headers, json={"category": "HR / Behavioral Round", "subcategory": "STAR", "question": "Tell me about a challenge.", "answer": "Use Situation, Task, Action, Result.", "explanation": "This shows structured reflection.", "difficulty": "Beginner", "tags": "HR, STAR"})
        self.assertEqual(created.status_code, 200, created.text)
        question_id = created.json()["id"]
        self.assertEqual(self.client.get("/api/interview/questions", headers=user).json()["total"], 1)
        deactivated = self.client.delete(f"/api/admin/interview/questions/{question_id}", headers=admin_headers)
        self.assertEqual(deactivated.status_code, 200)
        self.assertEqual(self.client.get("/api/interview/questions", headers=user).json()["total"], 0)


if __name__ == "__main__":
    unittest.main()
