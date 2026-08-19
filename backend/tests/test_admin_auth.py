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


class AdminAuthTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        db = SessionLocal()
        try:
            db.query(models.User).delete()
            db.commit()
        finally:
            db.close()

    def user_headers(self, email, password):
        response = self.client.post("/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_admin_login_and_protected_route(self):
        db = SessionLocal()
        try:
            user = models.User(
                name="Admin User",
                email="admin@example.com",
                password=bcrypt.hashpw("secret123".encode(), bcrypt.gensalt()).decode(),
                role="ADMIN",
            )
            db.add(user)
            db.commit()
        finally:
            db.close()

        login = self.client.post(
            "/api/admin/login",
            json={"email": "admin@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        self.assertIn("access_token", login.json())
        self.assertEqual(login.json()["user"]["role"], "ADMIN")

        protected = self.client.get(
            "/api/admin/me",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )
        self.assertEqual(protected.status_code, 200)
        self.assertEqual(protected.json()["email"], "admin@example.com")

    def test_regular_user_is_forbidden_from_admin_access(self):
        reg = self.client.post(
            "/register",
            json={"name": "Regular User", "email": "user@example.com", "password": "secret123"},
        )
        self.assertEqual(reg.status_code, 200)

        login = self.client.post(
            "/api/admin/login",
            json={"email": "user@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 403)

    def test_missing_token_is_rejected(self):
        response = self.client.get("/api/admin/me")
        self.assertEqual(response.status_code, 401)

    def test_career_recommendations_accepts_json_body(self):
        self.client.post(
            "/register",
            json={"name": "Recommendation User", "email": "recommendation@example.com", "password": "secret123"},
        )
        headers = self.user_headers("recommendation@example.com", "secret123")

        resume = self.client.post(
            "/resume/upload",
            files={"file": ("resume.txt", b"Name: Recommendation User\nSkills: Python, FastAPI, SQL\nExperience: Backend Engineer\n", "text/plain")},
            data={"email": "recommendation@example.com"},
            headers=headers,
        )
        self.assertEqual(resume.status_code, 200)

        job = self.client.post(
            "/job-description",
            json={
                "user_email": "recommendation@example.com",
                "job_title": "Python Developer",
                "company_name": "ExampleCorp",
                "description": "Python FastAPI SQL backend engineering role",
            },
            headers=headers,
        )
        self.assertEqual(job.status_code, 200)

        login = self.client.post(
            "/login",
            json={"email": "recommendation@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 200)

        response = self.client.post(
            "/api/career-recommendations",
            json={"resume_id": 1, "job_description_id": 1},
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("recommendations", response.json())

    def test_admin_dashboard_stats_endpoint(self):
        self.client.post(
            "/register",
            json={"name": "Admin Dashboard User", "email": "dashboard-admin@example.com", "password": "secret123"},
        )

        headers = self.user_headers("dashboard-admin@example.com", "secret123")

        db = SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.email == "dashboard-admin@example.com").first()
            user.role = "ADMIN"
            db.commit()
        finally:
            db.close()

        self.client.post(
            "/profile",
            json={
                "email": "dashboard-admin@example.com",
                "fullname": "Admin User",
                "headline": "Platform Administrator",
                "about": "I manage the platform.",
                "contact_info": {"phone": "9999999999", "email": "dashboard-admin@example.com"},
                "education": [{"institution": "Test University", "degree": "MBA", "field": "Leadership"}],
                "experience": [{"company": "Career Platform", "designation": "Admin"}],
                "skills": [{"name": "Python", "category": "Backend"}],
                "certifications": [{"name": "Leadership"}],
            },
        )

        self.client.post(
            "/resume/upload",
            files={"file": ("resume.txt", b"Name: Admin User\nEmail: dashboard-admin@example.com\nSkills: Python, SQL\nEducation: MBA\nExperience: Admin at Career Platform\n", "text/plain")},
            data={"email": "dashboard-admin@example.com"},
            headers=headers,
        )

        login = self.client.post(
            "/api/admin/login",
            json={"email": "dashboard-admin@example.com", "password": "secret123"},
        )
        token = login.json()["access_token"]

        response = self.client.get(
            "/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("stats", response.json())
        self.assertGreaterEqual(response.json()["stats"]["totalUsers"], 1)
        self.assertGreaterEqual(response.json()["stats"]["totalResumes"], 1)

    def test_admin_user_profile_and_resume_endpoints(self):
        self.client.post(
            "/register",
            json={"name": "Admin Example", "email": "admin.manager@example.com", "password": "secret123"},
        )
        self.client.post(
            "/register",
            json={"name": "User Example", "email": "user.example@example.com", "password": "secret123"},
        )

        db = SessionLocal()
        try:
            admin = db.query(models.User).filter(models.User.email == "admin.manager@example.com").first()
            admin.role = "ADMIN"
            db.commit()
        finally:
            db.close()

        headers = self.user_headers("user.example@example.com", "secret123")

        self.client.post(
            "/profile",
            json={
                "email": "user.example@example.com",
                "fullname": "User Example",
                "headline": "Backend Engineer",
                "location": "Hyderabad",
                "about": "I build APIs and data systems.",
                "contact_info": {"phone": "9876543210", "email": "user.example@example.com"},
                "education": [{"institution": "IIT", "degree": "B.Tech", "field": "Computer Science"}],
                "experience": [{"company": "Example Corp", "designation": "Backend Engineer"}],
                "skills": [{"name": "Python", "category": "Backend"}],
                "projects": [{"title": "Career Planner", "description": "Built a recommendation engine"}],
                "certifications": [{"name": "AWS Practitioner"}],
            },
            headers=headers,
        )

        self.client.post(
            "/resume/upload",
            files={"file": ("user_resume.txt", b"Name: User Example\nEmail: user.example@example.com\nSkills: Python, FastAPI\nEducation: B.Tech\nExperience: Backend Engineer\n", "text/plain")},
            data={"email": "user.example@example.com"},
            headers=headers,
        )

        login = self.client.post(
            "/api/admin/login",
            json={"email": "admin.manager@example.com", "password": "secret123"},
        )
        token = login.json()["access_token"]

        users = self.client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(users.status_code, 200)
        self.assertGreaterEqual(len(users.json()["items"]), 2)
        self.assertIn("items", users.json())

        profiles = self.client.get("/api/admin/profiles", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(profiles.status_code, 200)
        self.assertGreaterEqual(profiles.json()["total"], 1)

        resumes = self.client.get("/api/admin/resumes", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resumes.status_code, 200)
        self.assertGreaterEqual(resumes.json()["total"], 1)

        parsing = self.client.get("/api/admin/resume-parsing", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(parsing.status_code, 200)
        self.assertIn("stats", parsing.json())

    def test_admin_job_ats_and_analytics_endpoints(self):
        self.client.post(
            "/register",
            json={"name": "Analytics Admin", "email": "analytics.admin@example.com", "password": "secret123"},
        )

        db = SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.email == "analytics.admin@example.com").first()
            user.role = "ADMIN"
            db.commit()
        finally:
            db.close()

        admin_login = self.client.post(
            "/api/admin/login",
            json={"email": "analytics.admin@example.com", "password": "secret123"},
        )
        self.assertEqual(admin_login.status_code, 200, admin_login.text)
        headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        self.client.post(
            "/job-description",
            json={
                "user_email": "analytics.admin@example.com",
                "job_title": "Full Stack Developer",
                "company_name": "Example Corp",
                "description": "Build APIs with Python FastAPI, React, SQL, Docker, AWS.",
            },
            headers=headers,
        )

        self.client.post(
            "/resume/upload",
            files={"file": ("resume.txt", b"Name: Analyst User\nEmail: analyst@example.com\nSkills: Python, React, SQL\nExperience: 2 years\n", "text/plain")},
            data={"email": "analyst@example.com"},
            headers=headers,
        )

        login = self.client.post(
            "/api/admin/login",
            json={"email": "analytics.admin@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 200)
        token = login.json()["access_token"]

        jobs = self.client.get("/api/admin/jobs", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(jobs.status_code, 200)
        self.assertGreaterEqual(jobs.json()["total"], 1)

        ats = self.client.get("/api/admin/ats", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(ats.status_code, 200)
        self.assertIn("summary", ats.json())
        self.assertIn("items", ats.json())

        skills = self.client.get("/api/admin/skills/analytics", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(skills.status_code, 200)
        self.assertIn("top_user_skills", skills.json())
        self.assertIn("top_demanded_skills", skills.json())

        career = self.client.get("/api/admin/career-recommendations", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(career.status_code, 200)
        self.assertIn("summary", career.json())

        job_recs = self.client.get("/api/admin/job-recommendations", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(job_recs.status_code, 200)
        self.assertIn("summary", job_recs.json())

    def test_admin_crud_actions_for_users_profiles_and_resumes(self):
        db = SessionLocal()
        try:
            admin = models.User(
                name="Crud Admin",
                email="crud.admin@example.com",
                password=bcrypt.hashpw("secret123".encode(), bcrypt.gensalt()).decode(),
                role="ADMIN",
            )
            db.add(admin)
            db.commit()
        finally:
            db.close()

        login = self.client.post(
            "/api/admin/login",
            json={"email": "crud.admin@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        created_user = self.client.post(
            "/api/admin/users",
            json={"name": "Crud User", "email": "crud.user@example.com", "password": "secret123", "role": "USER"},
            headers=headers,
        )
        self.assertEqual(created_user.status_code, 200, created_user.text)
        user_id = created_user.json()["id"]

        update_user = self.client.put(
            f"/api/admin/users/{user_id}",
            json={"name": "Updated Crud User", "role": "ADMIN"},
            headers=headers,
        )
        self.assertEqual(update_user.status_code, 200, update_user.text)

        created_profile = self.client.post(
            "/api/admin/profiles",
            json={
                "email": "crud.user@example.com",
                "fullname": "Updated Crud User",
                "headline": "Product Analyst",
                "location": "Bengaluru",
                "about": "Experience in product analytics",
                "skills": ["SQL", "Python"],
                "experience": [{"company": "ACME", "designation": "Analyst"}],
                "education": [{"institution": "IIM", "degree": "MBA"}],
            },
            headers=headers,
        )
        self.assertEqual(created_profile.status_code, 200, created_profile.text)
        profile_id = created_profile.json()["id"]

        update_profile = self.client.put(
            f"/api/admin/profiles/{profile_id}",
            json={"headline": "Senior Product Analyst", "location": "Hyderabad"},
            headers=headers,
        )
        self.assertEqual(update_profile.status_code, 200, update_profile.text)

        created_resume = self.client.post(
            "/api/admin/resumes",
            json={
                "user_email": "crud.user@example.com",
                "filename": "crud_resume.txt",
                "content": "Python, SQL, product analytics experience",
                "parsed_skills": ["Python", "SQL"],
            },
            headers=headers,
        )
        self.assertEqual(created_resume.status_code, 200, created_resume.text)
        resume_id = created_resume.json()["id"]

        update_resume = self.client.put(
            f"/api/admin/resumes/{resume_id}",
            json={"filename": "updated_crud_resume.txt"},
            headers=headers,
        )
        self.assertEqual(update_resume.status_code, 200, update_resume.text)

        delete_resume = self.client.delete(f"/api/admin/resumes/{resume_id}", headers=headers)
        self.assertEqual(delete_resume.status_code, 200, delete_resume.text)

        delete_profile = self.client.delete(f"/api/admin/profiles/{profile_id}", headers=headers)
        self.assertEqual(delete_profile.status_code, 200, delete_profile.text)

        delete_user = self.client.delete(f"/api/admin/users/{user_id}", headers=headers)
        self.assertEqual(delete_user.status_code, 200, delete_user.text)

    def test_admin_credentials_cannot_be_used_on_regular_login(self):
        db = SessionLocal()
        try:
            user = models.User(
                name="Admin User",
                email="admin@example.com",
                password=bcrypt.hashpw("AdminPassword123".encode(), bcrypt.gensalt()).decode(),
                role="ADMIN",
            )
            db.add(user)
            db.commit()
        finally:
            db.close()

        response = self.client.post(
            "/login",
            json={"email": "admin@example.com", "password": "AdminPassword123"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Admin login required", response.json()["detail"])

    def test_reserved_admin_email_cannot_be_registered(self):
        response = self.client.post(
            "/register",
            json={"name": "Regular User", "email": "admin@example.com", "password": "secret123"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("reserved", response.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
