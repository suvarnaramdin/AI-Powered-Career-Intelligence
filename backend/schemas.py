from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class ContactInfo(BaseModel):
    phone: str = ""
    email: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


class EducationItem(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class ExperienceItem(BaseModel):
    company: str = ""
    designation: str = ""
    employment_type: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class SkillItem(BaseModel):
    name: str = ""
    category: str = ""
    proficiency: str = ""


class ProjectItem(BaseModel):
    title: str = ""
    description: str = ""
    technologies: List[str] = []
    link: str = ""


class CertificationItem(BaseModel):
    name: str = ""
    issuing_organization: str = ""
    issue_date: str = ""
    expiry_date: str = ""
    credential_id: str = ""
    credential_url: str = ""


class SocialLinkItem(BaseModel):
    platform: str = ""
    url: str = ""


class Preferences(BaseModel):
    privacy: str = "public"
    notifications: bool = True


class ProfileCreate(BaseModel):
    fullname: str = ""
    email: str = ""
    headline: str = ""
    location: str = ""
    about: str = ""
    phone: str = ""
    dob: Optional[str] = ""
    gender: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""
    college: str = ""
    degree: str = ""
    branch: str = ""
    cgpa: str = ""
    graduation: str = ""
    contact_info: Optional[ContactInfo] = None
    education: Optional[Union[List[EducationItem], str]] = None
    experience: Optional[Union[List[ExperienceItem], str]] = None
    skills: Optional[Union[List[SkillItem], str]] = None
    projects: Optional[Union[List[ProjectItem], str]] = None
    certifications: Optional[Union[List[CertificationItem], str]] = None
    social_links: Optional[List[SocialLinkItem]] = None
    preferences: Optional[Preferences] = None
    profile_picture: str = ""
    banner_image: str = ""
    education_text: Optional[str] = ""
    skills_text: Optional[str] = ""
    certifications_text: Optional[str] = ""
    experience_text: Optional[str] = ""
    projects_text: Optional[str] = ""
    career_interest: Optional[str] = ""


class PasswordChangeRequest(BaseModel):
    email: str
    current_password: str
    new_password: str


class FeedbackCreate(BaseModel):
    rating: int = 5
    category: str = "General"
    message: str


class FeedbackOut(BaseModel):
    id: int
    user_email: str
    rating: int
    category: str
    message: str
    status: str
    admin_response: str = ""
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ParsedResumeData(BaseModel):
    name: str
    email: str
    phone: str
    skills: str
    college: str
    degree: str
    experience: str
    certifications: str
    projects: str
    summary: str


class ATSAnalysisResponse(BaseModel):
    resume_skills: List[str] = []
    job_skills: List[str] = []
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    ats_score: int = 0
    match_percentage: int = 0
    strengths: List[str] = []
    suggestions: List[str] = []
    career_paths: List[str] = []
    learning_resources: List[str] = []
    expected_salary: str = ""
    recommended_projects: List[str] = []
    skill_gap_percentage: int = 0
    skill_gap_items: List[dict] = []
    career_recommendations: List[dict] = []
    job_recommendations: List[dict] = []
    course_recommendations: List[dict] = []
    resume_improvement: dict = {}
    analytics: dict = {}

    model_config = {"from_attributes": True, "extra": "allow"}


class ResumeUploadResponse(BaseModel):
    message: str
    resume_id: int
    parsed_data: ParsedResumeData
    file_path: str
    analysis: Optional[ATSAnalysisResponse] = None


class ResumeOut(BaseModel):
    id: int
    user_email: str = ""
    filename: str = ""
    stored_path: str = ""
    content: str = ""
    parsed_name: str = ""
    parsed_email: str = ""
    parsed_phone: str = ""
    parsed_skills: str = ""
    parsed_college: str = ""
    parsed_degree: str = ""
    parsed_experience: str = ""
    parsed_certifications: Optional[str] = ""
    parsed_projects: Optional[str] = ""
    parsed_summary: str = ""
    uploaded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobDescriptionCreate(BaseModel):
    user_email: str
    job_title: str
    company_name: str
    description: str


class JobDescriptionOut(BaseModel):
    id: int
    user_email: str
    job_title: str
    company_name: str
    description: str

    model_config = {"from_attributes": True}


class ATSAnalysisResponse(BaseModel):
    resume_skills: List[str] = []
    job_skills: List[str] = []
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    ats_score: int = 0
    match_percentage: int = 0
    strengths: List[str] = []
    suggestions: List[str] = []
    career_paths: List[str] = []
    learning_resources: List[str] = []
    expected_salary: str = ""
    recommended_projects: List[str] = []

    model_config = {"from_attributes": True}
