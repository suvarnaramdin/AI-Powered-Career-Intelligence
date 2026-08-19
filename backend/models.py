from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Float, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    role = Column(String(20), default="USER", nullable=False)


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)

    fullname = Column(String(100))
    email = Column(String(100), unique=True, index=True)

    headline = Column(String(255))
    location = Column(String(255))
    about = Column(Text)

    phone = Column(String(20))
    dob = Column(Date)
    gender = Column(String(20))

    linkedin = Column(String(255))
    github = Column(String(255))
    portfolio = Column(String(255))

    college = Column(String(255))
    degree = Column(String(100))
    branch = Column(String(100))

    cgpa = Column(String(10))
    graduation = Column(String(20))

    contact_info = Column(Text)
    education = Column(Text)
    skills = Column(Text)
    certifications = Column(Text)
    experience = Column(Text)
    projects = Column(Text)
    social_links = Column(Text)
    preferences = Column(Text)
    career_interest = Column(Text)
    profile_picture = Column(String(500))
    banner_image = Column(String(500))
    completion_percentage = Column(Integer)
    completion_suggestions = Column(Text)


class ProfileHistory(Base):
    __tablename__ = "profile_history"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), index=True)
    action = Column(String(20))
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), index=True, nullable=False)
    rating = Column(Integer, nullable=False, default=5)
    category = Column(String(50), nullable=False, default="General")
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="Pending")
    admin_response = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), index=True)
    filename = Column(String(255))
    stored_path = Column(String(500))
    content = Column(Text)
    parsed_name = Column(String(100))
    parsed_email = Column(String(100))
    parsed_phone = Column(String(20))
    parsed_skills = Column(Text)
    parsed_college = Column(Text)
    parsed_degree = Column(Text)
    parsed_experience = Column(Text)
    parsed_certifications = Column(Text)
    parsed_projects = Column(Text)
    parsed_summary = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), index=True)
    job_title = Column(String(255))
    company_name = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CareerAnalysis(Base):
    """Stores comprehensive career analysis for a specific user, resume, and job combination"""
    __tablename__ = "career_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), index=True)
    resume_id = Column(Integer, index=True)
    job_description_id = Column(Integer, index=True)
    
    # Skill matching scores
    ats_score = Column(Float, default=0)
    match_percentage = Column(Float, default=0)
    resume_quality_score = Column(Float, default=0)
    career_readiness_score = Column(Float, default=0)
    employability_score = Column(Float, default=0)
    technical_strength_score = Column(Float, default=0)
    
    # Skill data (stored as JSON for flexibility)
    resume_skills = Column(JSON, default=[])
    job_skills = Column(JSON, default=[])
    matched_skills = Column(JSON, default=[])
    missing_skills = Column(JSON, default=[])
    
    # Career recommendations and analysis
    top_career_recommendation = Column(String(255))
    career_recommendations = Column(JSON, default=[])
    target_role = Column(String(255))
    best_matching_path = Column(String(255))
    
    # Strengths and improvements
    top_strengths = Column(JSON, default=[])
    areas_for_improvement = Column(JSON, default=[])
    
    # Action plan and insights
    action_plan = Column(JSON, default={})
    career_insights = Column(Text)
    career_roadmap = Column(JSON, default=[])
    
    # Course recommendations
    recommended_courses = Column(JSON, default=[])
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ResumeAnalysis(Base):
    """Stores static analysis of a resume"""
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), index=True)
    resume_id = Column(Integer, unique=True, index=True)
    
    # Parsed resume content
    years_of_experience = Column(Float, default=0)
    education_level = Column(String(100))
    certifications_list = Column(JSON, default=[])
    projects_list = Column(JSON, default=[])
    
    # Resume quality metrics
    completeness_score = Column(Float, default=0)
    ats_friendliness_score = Column(Float, default=0)
    keyword_optimization_score = Column(Float, default=0)
    overall_quality_score = Column(Float, default=0)
    
    # Skill analysis
    technical_skills = Column(JSON, default=[])
    soft_skills = Column(JSON, default=[])
    skill_categories = Column(JSON, default={})
    
    # Content analysis
    weak_sections = Column(JSON, default=[])
    strengths_sections = Column(JSON, default=[])
    improvement_suggestions = Column(JSON, default=[])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, default="system")
    related_entity_id = Column(String(100), nullable=True)
    is_read = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)