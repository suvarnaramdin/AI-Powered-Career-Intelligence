import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi.testclient import TestClient

import main


class TestUserIsolation:
    def setup_method(self):
        self.client = TestClient(main.app)

    def register_and_login(self, email, name):
        registered = self.client.post(
            "/register",
            json={"name": name, "email": email, "password": "secret123"},
        )
        assert registered.status_code in (200, 400), registered.text
        logged_in = self.client.post(
            "/login", json={"email": email, "password": "secret123"}
        )
        assert logged_in.status_code == 200, logged_in.text
        return {"Authorization": f"Bearer {logged_in.json()['access_token']}"}

    def create_user_a_data(self):
        headers = self.register_and_login("isolation-a@example.com", "Isolation A")
        profile = self.client.post(
            "/profile",
            headers=headers,
            json={
                "email": "isolation-b@example.com",
                "fullname": "Private A",
                "headline": "A only",
                "skills": [{"name": "Python"}],
            },
        )
        assert profile.status_code == 200, profile.text
        resume = self.client.post(
            "/resume/upload",
            headers=headers,
            files={"file": ("a.txt", b"Name: Private A\nSkills: Python", "text/plain")},
            data={"email": "isolation-b@example.com"},
        )
        assert resume.status_code == 200, resume.text
        job = self.client.post(
            "/job-description",
            headers=headers,
            json={
                "user_email": "isolation-b@example.com",
                "job_title": "Private Role",
                "company_name": "Private Company",
                "description": "Python backend role",
            },
        )
        assert job.status_code == 200, job.text
        return headers, resume.json()["resume_id"], job.json()["id"]

    def test_user_cannot_read_or_mutate_another_users_resources(self):
        _, resume_id, job_id = self.create_user_a_data()
        user_b = self.register_and_login("isolation-b@example.com", "Isolation B")

        assert self.client.get("/profile/isolation-a@example.com", headers=user_b).status_code == 404
        assert self.client.get("/profile-history", headers=user_b).json() == []
        assert self.client.get("/resumes/isolation-a@example.com", headers=user_b).status_code == 404
        assert self.client.get("/job-description/isolation-a@example.com", headers=user_b).status_code == 404
        assert self.client.get(f"/resume/{resume_id}/view", headers=user_b).status_code == 404
        assert self.client.delete(f"/resume/{resume_id}", headers=user_b).status_code == 404
        assert self.client.put(
            f"/resume/{resume_id}",
            headers=user_b,
            files={"file": ("attack.txt", b"not A", "text/plain")},
            data={"email": "isolation-a@example.com"},
        ).status_code == 404
        assert self.client.post(f"/ats/analyze/{resume_id}/{job_id}", headers=user_b).status_code == 404
        assert self.client.post(
            "/api/career-recommendations",
            headers=user_b,
            json={"resume_id": resume_id, "job_description_id": job_id},
        ).status_code == 404
        assert self.client.post(
            "/api/career-analytics",
            headers=user_b,
            json={"resume_id": resume_id, "job_description_id": job_id},
        ).status_code == 404

        spoofed_profile = self.client.post(
            "/profile",
            headers=user_b,
            json={"email": "isolation-a@example.com", "fullname": "Private B"},
        )
        assert spoofed_profile.status_code == 200
        assert spoofed_profile.json()["profile"]["email"] == "isolation-b@example.com"

    def test_owner_can_read_own_data_and_unauthenticated_requests_are_rejected(self):
        user_a, resume_id, job_id = self.create_user_a_data()
        assert self.client.get("/profile/isolation-a@example.com", headers=user_a).json()["fullname"] == "Private A"
        assert self.client.get("/resumes/isolation-a@example.com", headers=user_a).json()[0]["id"] == resume_id
        assert self.client.get("/profile-history", headers=user_a).json()
        assert self.client.post(
            "/api/career-recommendations",
            headers=user_a,
            json={"resume_id": resume_id, "job_description_id": job_id},
        ).status_code == 200
        assert self.client.get("/profiles").status_code == 401
        assert self.client.get("/profile-history").status_code == 401

    def test_feedback_is_owned_by_user(self):
        user_a = self.register_and_login("feedback-a@example.com", "Feedback A")
        created = self.client.post(
            "/feedback",
            headers=user_a,
            json={"rating": 4, "category": "Product", "message": "Helpful career insights."},
        )
        assert created.status_code == 200, created.text
        assert created.json()["user_email"] == "feedback-a@example.com"

        user_b = self.register_and_login("feedback-b@example.com", "Feedback B")
        assert self.client.get("/feedback", headers=user_b).json() == []
        assert self.client.post(
            "/feedback",
            headers=user_b,
            json={"rating": 6, "message": "Invalid rating"},
        ).status_code == 400
