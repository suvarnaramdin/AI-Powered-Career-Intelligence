from sqlalchemy import Column, Integer, String, Text, Date, DateTime
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
    parsed_college = Column(String(255))
    parsed_degree = Column(String(100))
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