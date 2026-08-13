import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi.testclient import TestClient
import main


class ProfileManagementTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_profile_crud_with_sections_and_completion(self):
        payload = {
            "email": "jane@example.com",
            "fullname": "Jane Doe",
            "headline": "Software Engineer",
            "location": "Bengaluru",
            "about": "I build resilient backend systems.",
            "contact_info": {"phone": "9876543210", "email": "jane@example.com"},
            "education": [{"institution": "IIT", "degree": "B.Tech", "field": "Computer Science"}],
            "experience": [{"company": "Example Labs", "designation": "Software Engineer"}],
            "skills": [{"name": "Python", "category": "Backend"}],
            "projects": [{"title": "Resume Analyzer", "description": "Parsed resumes"}],
            "certifications": [{"name": "AWS Certified"}],
            "social_links": [{"platform": "GitHub", "url": "https://github.com/jane"}],
            "preferences": {"privacy": "public", "notifications": True},
        }

        create_response = self.client.post("/profile", json=payload)
        self.assertEqual(create_response.status_code, 200)

        profile_response = self.client.get("/profile/jane@example.com")
        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.json()["headline"], "Software Engineer")
        self.assertEqual(profile_response.json()["education"][0]["institution"], "IIT")

        completion_response = self.client.get("/profile/jane@example.com/completion")
        self.assertEqual(completion_response.status_code, 200)
        self.assertGreaterEqual(completion_response.json()["completion_percentage"], 0)

        self.client.post(
            "/profile/jane@example.com/education",
            json={"institution": "IIM", "degree": "MBA", "field": "Product Management"},
        )
        education_response = self.client.get("/profile/jane@example.com/education")
        self.assertEqual(education_response.status_code, 200)
        self.assertGreaterEqual(len(education_response.json()), 2)

    def test_change_password(self):
        self.client.post(
            "/register",
            json={"name": "Jane Doe", "email": "jane2@example.com", "password": "oldpass"},
        )

        response = self.client.post(
            "/account/change-password",
            json={"email": "jane2@example.com", "current_password": "oldpass", "new_password": "newpass"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Password updated successfully")


if __name__ == "__main__":
    unittest.main()
