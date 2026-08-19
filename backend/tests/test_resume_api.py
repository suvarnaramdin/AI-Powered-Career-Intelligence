import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi.testclient import TestClient
import main


class ResumeAPITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_upload_and_list_resume(self):
        self.client.post("/register", json={"name": "Jane Doe", "email": "jane@example.com", "password": "secret123"})
        login = self.client.post("/login", json={"email": "jane@example.com", "password": "secret123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        content = b"Name: Jane Doe\nEmail: jane@example.com\nPhone: 9876543210\nSkills: Python, FastAPI, SQL\nEducation: B.Tech Computer Science\nExperience: Intern at AI Labs\nCertifications: AWS Cloud Practitioner\nProjects: Resume Analyzer Dashboard"
        response = self.client.post(
            "/resume/upload",
            files={"file": ("resume.txt", content, "text/plain")},
            data={"email": "jane@example.com"},
            headers=headers,
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["parsed_data"]["name"], "Jane Doe")
        self.assertEqual(payload["parsed_data"]["email"], "jane@example.com")
        self.assertIn("AWS Cloud Practitioner", payload["parsed_data"]["certifications"])
        self.assertIn("Resume Analyzer Dashboard", payload["parsed_data"]["projects"])

        list_response = self.client.get("/resumes/jane@example.com", headers=headers)
        self.assertEqual(list_response.status_code, 200)
        resumes = list_response.json()
        self.assertGreaterEqual(len(resumes), 1)

        resume_id = resumes[0]["id"]

        download_response = self.client.get(f"/resume/{resume_id}/download", headers=headers)
        self.assertEqual(download_response.status_code, 200)
        self.assertEqual(download_response.headers["content-disposition"].startswith("attachment"), True)

        view_response = self.client.get(f"/resume/{resume_id}/view", headers=headers)
        self.assertEqual(view_response.status_code, 200)
        self.assertEqual(view_response.headers["content-disposition"].startswith("inline"), True)

        replace_content = b"Name: Jane Doe\nEmail: jane@example.com\nPhone: 9876543210\nSkills: Python, FastAPI, SQL, Docker\nExperience: Intern at AI Labs"
        replace_response = self.client.put(
            f"/resume/{resume_id}",
            files={"file": ("resume_updated.txt", replace_content, "text/plain")},
            data={"email": "jane@example.com"},
            headers=headers,
        )
        self.assertEqual(replace_response.status_code, 200)

        job_description_payload = {
            "user_email": "jane@example.com",
            "job_title": "Backend Developer",
            "company_name": "TechCorp",
            "description": "Looking for a Backend Developer with Python, FastAPI, SQL and Docker experience.",
        }
        job_response = self.client.post("/job-description", json=job_description_payload, headers=headers)
        self.assertEqual(job_response.status_code, 200)
        job_id = job_response.json()["id"]

        analysis_response = self.client.post(f"/ats/analyze/{resume_id}/{job_id}", headers=headers)
        self.assertEqual(analysis_response.status_code, 200)
        analysis_payload = analysis_response.json()
        self.assertIn("ats_score", analysis_payload)
        self.assertIn("match_percentage", analysis_payload)
        self.assertIn("matched_skills", analysis_payload)
        self.assertIn("missing_skills", analysis_payload)
        self.assertIn("expected_salary", analysis_payload)
        self.assertIn("recommended_projects", analysis_payload)

        delete_response = self.client.delete(f"/resume/{resume_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 200)

        missing_response = self.client.get(f"/resume/{resume_id}/download", headers=headers)
        self.assertEqual(missing_response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
