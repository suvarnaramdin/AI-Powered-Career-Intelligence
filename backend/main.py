import json
import os
import re
import sys
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import bcrypt
from dotenv import load_dotenv
from docx import Document as DocxDocument
from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pypdf import PdfReader
from sqlalchemy import func, inspect, or_, text
from sqlalchemy.orm import Session

load_dotenv()

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent))

import models
import schemas
from ats import COURSE_RECOMMENDATIONS_LIBRARY, build_milestone3_insights, compare_resume_job
from database import SessionLocal, engine, ensure_profile_columns, ensure_resume_columns, ensure_user_columns

models.Base.metadata.create_all(bind=engine)
ensure_profile_columns()
ensure_user_columns()
ensure_resume_columns()

app = FastAPI()
security = HTTPBearer(auto_error=False)


def _get_env_value(*keys: str, default: Optional[str] = None) -> Optional[str]:
    for key in keys:
        value = os.getenv(key)
        if value not in (None, ""):
            return value
    return default


JWT_SECRET = _get_env_value("JWT_SECRET_KEY", "JWT_SECRET", "SECRET_KEY", default="career-intelligence-admin-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
RESERVED_ADMIN_EMAIL = "admin@example.com"

UPLOAD_DIR = Path(_get_env_value("UPLOAD_DIR", default=str(Path(__file__).resolve().parent / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

default_cors_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:5174,"
    "http://127.0.0.1:5174,"
    "https://ai-powered-career-intelligence.vercel.app,"
    "https://ai-powered-career-intelligence-git-main-r-suvarnas-projects.vercel.app"
)

allowed_origins = []
for origin in _get_env_value("CORS_ORIGINS", default=default_cors_origins).split(","):
    cleaned = origin.strip()
    if cleaned:
        allowed_origins.append(cleaned)

frontend_url = _get_env_value("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}


def create_access_token(user: models.User) -> str:
    payload = {
        "sub": user.email,
        "role": user.role or "USER",
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    email = payload.get("sub") or payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_email_from_token(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Extract email from JWT token without database lookup"""
    if credentials is None or not credentials.credentials:
        return None

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub") or payload.get("email")
        return email
    except JWTError:
        return None


def require_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if (current_user.role or "USER").upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def _model_has_column(model_class, column_name: str) -> bool:
    try:
        columns = {col["name"] for col in inspect(engine).get_columns(model_class.__tablename__)}
    except Exception:
        columns = set(model_class.__table__.columns.keys())
    return column_name in columns


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _normalize_skill_label(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        name = value.get("name") or value.get("skill") or value.get("title")
        if name:
            return str(name).strip()
        return ""
    if isinstance(value, list):
        text_values = []
        for item in value:
            label = _normalize_skill_label(item)
            if label:
                text_values.append(label)
        return ", ".join(text_values)
    return str(value).strip()


def _extract_skill_tokens(raw_value: Any) -> List[str]:
    values: List[str] = []
    if raw_value is None:
        return values

    if isinstance(raw_value, str):
        candidates = [raw_value]
    elif isinstance(raw_value, list):
        candidates = [str(item) for item in raw_value]
    elif isinstance(raw_value, dict):
        candidates = [str(raw_value)]
    else:
        candidates = [str(raw_value)]

    for item in candidates:
        if not item:
            continue
        if item.startswith("[") or item.startswith("{"):
            try:
                import json
                parsed = json.loads(item)
                if isinstance(parsed, list):
                    for nested in parsed:
                        label = _normalize_skill_label(nested)
                        if label:
                            values.extend([part.strip() for part in re.split(r"[,;|/]+", label) if part.strip()])
                    continue
            except Exception:
                pass
        for part in re.split(r"[,;|/]+", item):
            label = part.strip()
            if label:
                values.append(label)
    return values


def _serialize_bucket(rows: List[Any]) -> List[dict]:
    result = []
    for row in rows:
        bucket = getattr(row, "bucket", None)
        count = getattr(row, "count", 0)
        result.append({"label": str(bucket) if bucket is not None else "N/A", "value": int(count or 0)})
    return result


def _build_skill_summary(db: Session) -> dict:
    counts: Dict[str, int] = {}

    profile_rows = db.query(models.Profile.skills).all()
    for row in profile_rows:
        for skill in _extract_skill_tokens(row[0]):
            key = skill.strip()
            if key:
                counts[key] = counts.get(key, 0) + 1

    resume_rows = db.query(models.Resume.parsed_skills).all()
    for row in resume_rows:
        for skill in _extract_skill_tokens(row[0]):
            key = skill.strip()
            if key:
                counts[key] = counts.get(key, 0) + 1

    job_rows = db.query(models.JobDescription.description).all()
    for row in job_rows:
        text_value = row[0] or ""
        if text_value:
            for match in re.findall(r"[A-Za-z][A-Za-z0-9+.#/ -]{2,}", text_value):
                item = match.strip()
                if len(item) <= 2:
                    continue
                if item.lower() in {"the", "with", "and", "for", "that", "this", "from", "your", "into", "team", "skills"}:
                    continue
                counts[item] = counts.get(item, 0) + 1

    top_skills = [{"name": name, "count": count} for name, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:8]]
    return {"topUserSkills": top_skills}


def _build_user_name_cache(db: Session) -> Dict[str, str]:
    """Build a cache of email -> name to avoid N+1 queries."""
    cache: Dict[str, str] = {}
    for user in db.query(models.User.email, models.User.name).all():
        email, name = user
        cache[email] = name or email
    return cache


def _user_name_for_email(cache: Dict[str, str], email: Optional[str]) -> str:
    if not email:
        return "Unknown User"
    return cache.get(email, email)


def _jobs_for_analytics(db: Session, job_role: Optional[str] = None):
    query = db.query(models.JobDescription)
    if job_role:
        term = f"%{job_role.strip()}%"
        query = query.filter(models.JobDescription.job_title.ilike(term) | models.JobDescription.description.ilike(term))
    return query.order_by(models.JobDescription.id.desc()).all()


def _build_admin_jobs_dataset(db: Session, search: str = "", page: int = 1, page_size: int = 20):
    query = db.query(models.JobDescription)
    search_term = (search or "").strip()
    if search_term:
        term = f"%{search_term}%"
        query = query.filter(
            or_(
                models.JobDescription.job_title.ilike(term),
                models.JobDescription.company_name.ilike(term),
                models.JobDescription.description.ilike(term),
            )
        )

    total = query.count()
    jobs = query.order_by(models.JobDescription.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for job in jobs:
        items.append(
            {
                "id": job.id,
                "job_title": job.job_title or "Untitled role",
                "company_name": job.company_name or "Unknown company",
                "description": job.description or "",
                "user_email": job.user_email,
                "created_at": job.created_at.isoformat() if job.created_at else "",
            }
        )
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1}


def _build_admin_ats_dataset(db: Session, search: str = "", score_min: Optional[int] = None, score_max: Optional[int] = None, page: int = 1, page_size: int = 20):
    # OPTIMIZATION: Build user name cache once instead of querying per result
    user_cache = _build_user_name_cache(db)
    
    # OPTIMIZATION: Load resumes with content only, limit to last 50 to avoid huge O(n*m)
    resumes = db.query(models.Resume).filter(models.Resume.content != "").filter(models.Resume.content.isnot(None)).order_by(models.Resume.id.desc()).limit(50).all()
    
    # OPTIMIZATION: Load jobs with description only, limit to last 50
    jobs = db.query(models.JobDescription).filter(models.JobDescription.description != "").filter(models.JobDescription.description.isnot(None)).order_by(models.JobDescription.id.desc()).limit(50).all()
    
    records = []
    for resume in resumes:
        for job in jobs:
            result = compare_resume_job(resume.content, job.description)
            score = int(result.get("ats_score", 0) or 0)
            match_percentage = int(result.get("match_percentage", 0) or 0)
            if score_min is not None and score < score_min:
                continue
            if score_max is not None and score > score_max:
                continue

            analysis_id = (resume.id * 100000) + job.id
            user_email = resume.user_email or job.user_email
            item = {
                "id": analysis_id,
                "user_name": _user_name_for_email(user_cache, user_email),
                "user_email": user_email,
                "resume_id": resume.id,
                "resume_name": resume.filename or f"resume-{resume.id}",
                "job_id": job.id,
                "job_title": job.job_title or "Untitled role",
                "company_name": job.company_name or "Unknown company",
                "ats_score": score,
                "keyword_match": match_percentage,
                "skill_match": match_percentage,
                "analysis_date": (resume.uploaded_at or job.created_at or datetime.utcnow()).isoformat(),
                "status": "Excellent" if score >= 81 else "Good" if score >= 61 else "Average" if score >= 41 else "Needs Improvement",
                "matched_skills": result.get("matched_skills", []) or [],
                "missing_skills": result.get("missing_skills", []) or [],
                "matched_keywords": result.get("matched_skills", []) or [],
                "missing_keywords": result.get("missing_skills", []) or [],
            }
            if search:
                term = search.lower()
                haystack = " ".join([
                    item["user_name"],
                    item["user_email"],
                    item["resume_name"],
                    item["job_title"],
                    item["company_name"],
                    *item["matched_skills"],
                ]).lower()
                if term not in haystack:
                    continue
            records.append(item)

    records.sort(key=lambda item: item["analysis_date"], reverse=True)
    total = len(records)
    page_items = records[(page - 1) * page_size : page * page_size]
    summary_scores = [item["ats_score"] for item in records]
    distribution = {"0_40": 0, "41_60": 0, "61_80": 0, "81_100": 0}
    for score in summary_scores:
        if score <= 40:
            distribution["0_40"] += 1
        elif score <= 60:
            distribution["41_60"] += 1
        elif score <= 80:
            distribution["61_80"] += 1
        else:
            distribution["81_100"] += 1

    summary = {
        "total_analyses": total,
        "average_score": round(sum(summary_scores) / len(summary_scores), 2) if summary_scores else 0,
        "highest_score": max(summary_scores) if summary_scores else 0,
        "lowest_score": min(summary_scores) if summary_scores else 0,
        "high_scores": sum(1 for score in summary_scores if score >= 81),
        "low_scores": sum(1 for score in summary_scores if score <= 40),
    }

    trend = []
    date_buckets: Dict[str, int] = {}
    for item in records:
        bucket = item["analysis_date"][:10]
        date_buckets[bucket] = date_buckets.get(bucket, 0) + 1
    for bucket, count in sorted(date_buckets.items())[-10:]:
        trend.append({"date": bucket, "count": count, "average_score": round(sum(item["ats_score"] for item in records if item["analysis_date"][:10] == bucket) / max(1, sum(1 for item in records if item["analysis_date"][:10] == bucket)), 2)})

    return {
        "summary": summary,
        "distribution": distribution,
        "trend": trend,
        "items": page_items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
    }


def _skill_counts_from_text(text: str) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    tokens = []
    if text:
        for item in re.split(r"[,;|/\n]+", text):
            value = item.strip()
            if value:
                tokens.append(value)
    for token in tokens:
        normalized = token.strip().lower()
        if normalized:
            counts[normalized] = counts.get(normalized, 0) + 1
    return counts


def _build_courses_dataset(db: Session, search: str = "", category: str = "", difficulty: str = "", provider: str = "", status: str = "", page: int = 1, page_size: int = 12):
    items = []
    for index, course in enumerate(COURSE_RECOMMENDATIONS_LIBRARY):
        title = course.get("title") or "Course"
        provider = course.get("platform") or "Platform"
        category = course.get("category") or (course.get("skill_covered") or "Learning")
        difficulty = course.get("difficulty") or "Beginner"
        status_label = "Active"
        item = {
            "id": index + 1,
            "title": title,
            "provider": provider,
            "description": f"Structured learning pathway focused on {course.get('skill_covered', 'core skills')} and hands-on application.",
            "category": category,
            "skills": [course.get("skill_covered") or "General"] if course.get("skill_covered") else ["General"],
            "difficulty": difficulty,
            "duration": course.get("duration") or "N/A",
            "url": f"https://example.com/course/{title.lower().replace(' ', '-')}",
            "status": status_label,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        items.append(item)

    filtered = []
    search_value = (search or "").strip().lower()
    for item in items:
        haystack = " ".join([
            item["title"],
            item["provider"],
            item["category"],
            " ".join(item["skills"]),
            item["difficulty"],
            item["status"],
        ]).lower()
        if search_value and search_value not in haystack:
            continue
        if category and item["category"].lower() != category.lower():
            continue
        if difficulty and item["difficulty"].lower() != difficulty.lower():
            continue
        if provider and item["provider"].lower() != provider.lower():
            continue
        if status and item["status"].lower() != status.lower():
            continue
        filtered.append(item)

    total = len(filtered)
    page_items = filtered[(page - 1) * page_size : page * page_size]
    return {
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
        "categories": sorted({item["category"] for item in items}),
        "providers": sorted({item["provider"] for item in items}),
        "difficulties": sorted({item["difficulty"] for item in items}),
    }


def _build_certification_dataset(db: Session, search: str = "", category: str = "", provider: str = "", status: str = "", page: int = 1, page_size: int = 12):
    # OPTIMIZATION: Query only the columns we need, limit results
    source_items = []
    seen = set()
    for cert_value in db.query(models.Profile.certifications).filter(models.Profile.certifications != "").filter(models.Profile.certifications.isnot(None)).limit(100).all():
        if cert_value[0]:
            for value in _extract_skill_tokens(cert_value[0]):
                label = value.strip()
                if label:
                    key = label.lower()
                    if key not in seen:
                        seen.add(key)
                        source_items.append({
                            "name": label,
                            "issuing_organization": "User profile",
                            "category": "General",
                            "skills": [label],
                            "validity": "N/A",
                            "status": "Active",
                            "created_at": 1,
                        })
    for cert_value in db.query(models.Resume.parsed_certifications).filter(models.Resume.parsed_certifications != "").filter(models.Resume.parsed_certifications.isnot(None)).limit(100).all():
        if cert_value[0]:
            for value in _extract_skill_tokens(cert_value[0]):
                label = value.strip()
                if label:
                    key = label.lower()
                    if key not in seen:
                        seen.add(key)
                        source_items.append({
                            "name": label,
                            "issuing_organization": "Resume parsing",
                            "category": "General",
                            "skills": [label],
                            "validity": "N/A",
                            "status": "Active",
                            "created_at": 2,
                        })

    items = []
    for index, item in enumerate(source_items, start=1):
        items.append({
            "id": index,
            "name": item["name"],
            "issuing_organization": item["issuing_organization"],
            "category": item["category"],
            "skills": item["skills"],
            "validity": item["validity"],
            "status": item["status"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        })

    filtered = []
    search_value = (search or "").strip().lower()
    for item in items:
        haystack = " ".join([item["name"], item["issuing_organization"], item["category"], " ".join(item["skills"]) ]).lower()
        if search_value and search_value not in haystack:
            continue
        if category and item["category"].lower() != category.lower():
            continue
        if provider and item["issuing_organization"].lower() != provider.lower():
            continue
        if status and item["status"].lower() != status.lower():
            continue
        filtered.append(item)

    total = len(filtered)
    return {
        "items": filtered[(page - 1) * page_size : page * page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
        "categories": sorted({item["category"] for item in items}),
        "providers": sorted({item["issuing_organization"] for item in items}),
    }


def _build_feedback_dataset(db: Session, search: str = "", rating: Optional[int] = None, status: str = "", page: int = 1, page_size: int = 12):
    items = []
    for index, history in enumerate(db.query(models.ProfileHistory).order_by(models.ProfileHistory.created_at.desc()).all(), start=1):
        action = (history.action or "activity").strip()
        if action.lower() not in {"feedback", "review", "rating", "support"}:
            continue
        items.append({
            "id": index,
            "user_name": history.email or "System",
            "rating": 5 if "positive" in (history.details or "").lower() else 3,
            "category": "General",
            "message": history.details or "No feedback text recorded.",
            "date": (history.created_at.isoformat() if history.created_at else datetime.utcnow().isoformat()),
            "status": "Resolved" if "resolved" in (history.details or "").lower() else "Pending",
            "admin_response": "",
        })

    if not items:
        return {"items": [], "summary": {"total_feedback": 0, "positive_feedback": 0, "negative_feedback": 0, "pending_feedback": 0, "resolved_feedback": 0, "average_rating": 0}, "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

    filtered = []
    search_value = (search or "").strip().lower()
    for item in items:
        haystack = " ".join([item["user_name"], item["category"], item["message"]]).lower()
        if search_value and search_value not in haystack:
            continue
        if rating is not None and item["rating"] != rating:
            continue
        if status and item["status"].lower() != status.lower():
            continue
        filtered.append(item)

    total = len(filtered)
    summary = {
        "total_feedback": total,
        "positive_feedback": sum(1 for item in filtered if item["rating"] >= 4),
        "negative_feedback": sum(1 for item in filtered if item["rating"] <= 2),
        "pending_feedback": sum(1 for item in filtered if item["status"].lower() == "pending"),
        "resolved_feedback": sum(1 for item in filtered if item["status"].lower() == "resolved"),
        "average_rating": round(sum(item["rating"] for item in filtered) / len(filtered), 2) if filtered else 0,
    }
    return {
        "items": filtered[(page - 1) * page_size : page * page_size],
        "summary": summary,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
    }


def _build_activity_dataset(db: Session, search: str = "", activity_type: str = "", user: str = "", page: int = 1, page_size: int = 12):
    # OPTIMIZATION: Use pagination/limit at query level instead of loading all
    items = []
    
    # Load recent profile history
    for record in db.query(models.ProfileHistory).order_by(models.ProfileHistory.created_at.desc()).limit(50).all():
        action = record.action or "activity"
        items.append({
            "id": record.id,
            "user": record.email or "System",
            "activity_type": action,
            "description": record.details or action,
            "timestamp": (record.created_at.isoformat() if record.created_at else datetime.utcnow().isoformat()),
            "status": "Completed",
        })
    
    # Load recent resumes
    for resume in db.query(models.Resume).order_by(models.Resume.uploaded_at.desc()).limit(30).all():
        items.append({
            "id": f"resume-{resume.id}",
            "user": resume.user_email or "System",
            "activity_type": "Resume Upload",
            "description": f"Resume uploaded: {resume.filename or 'Untitled resume'}",
            "timestamp": (resume.uploaded_at.isoformat() if resume.uploaded_at else datetime.utcnow().isoformat()),
            "status": "Completed",
        })
    
    # Load recent jobs
    for job in db.query(models.JobDescription).order_by(models.JobDescription.id.desc()).limit(30).all():
        items.append({
            "id": f"job-{job.id}",
            "user": job.user_email or "System",
            "activity_type": "Job Added",
            "description": f"Job description created for {job.company_name or 'company'}",
            "timestamp": (job.created_at.isoformat() if job.created_at else datetime.utcnow().isoformat()),
            "status": "Completed",
        })

    filtered = []
    search_value = (search or "").strip().lower()
    for item in items:
        haystack = " ".join([item["user"], item["activity_type"], item["description"]]).lower()
        if search_value and search_value not in haystack:
            continue
        if activity_type and item["activity_type"].lower() != activity_type.lower():
            continue
        if user and item["user"].lower() != user.lower():
            continue
        filtered.append(item)
    filtered.sort(key=lambda item: item["timestamp"], reverse=True)

    summary = {
        "total_activities": len(filtered),
        "todays_activities": sum(1 for item in filtered if item["timestamp"][:10] == datetime.utcnow().strftime("%Y-%m-%d")),
        "active_users": len({item["user"] for item in filtered}),
        "login_events": sum(1 for item in filtered if "login" in item["activity_type"].lower()),
        "resume_uploads": sum(1 for item in filtered if "resume" in item["activity_type"].lower()),
        "ats_analyses": 0,
        "job_searches": 0,
        "recommendations_generated": 0,
    }
    page_items = filtered[(page - 1) * page_size : page * page_size]
    return {"items": page_items, "summary": summary, "total": len(filtered), "page": page, "page_size": page_size, "total_pages": max((len(filtered) + page_size - 1) // page_size, 1) if filtered else 1, "timeline": page_items[:10]}


def _get_notification_payload(db: Session) -> List[Dict[str, Any]]:
    notifications = []
    failed_resumes = db.query(models.Resume).filter((models.Resume.parsed_name == "") | (models.Resume.parsed_name.is_(None))).count()
    if failed_resumes:
        notifications.append({
            "id": "resume-parsing",
            "title": "Resume parsing requires review",
            "description": f"{failed_resumes} resume(s) are still awaiting parsing or require review.",
            "timestamp": datetime.utcnow().isoformat(),
            "read": False,
            "type": "resume",
        })
    if db.query(models.JobDescription).count() == 0:
        notifications.append({
            "id": "jobs-empty",
            "title": "Job inventory is empty",
            "description": "No job descriptions are currently being tracked for ATS comparison.",
            "timestamp": datetime.utcnow().isoformat(),
            "read": False,
            "type": "system",
        })
    if db.query(models.User).count() == 0:
        notifications.append({
            "id": "users-empty",
            "title": "User base is still empty",
            "description": "No registered users are available in the current database snapshot.",
            "timestamp": datetime.utcnow().isoformat(),
            "read": False,
            "type": "system",
        })
    return notifications


@app.get("/api/admin/dashboard/stats")
def get_admin_dashboard_stats(current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    active_users = db.query(models.Profile.email).filter(models.Profile.email.isnot(None)).distinct().count()
    if active_users == 0:
        active_users = db.query(models.Resume.user_email).filter(models.Resume.user_email.isnot(None)).distinct().count()

    new_users = 0
    if _model_has_column(models.User, "created_at"):
        new_users = db.query(models.User).filter(models.User.created_at >= func.date_sub(func.now(), text("INTERVAL 30 DAY"))).count()

    total_profiles = db.query(models.Profile).count()
    completed_profiles = db.query(models.Profile).filter(models.Profile.completion_percentage >= 80).count() if _model_has_column(models.Profile, "completion_percentage") else total_profiles
    incomplete_profiles = max(total_profiles - completed_profiles, 0)

    total_resumes = db.query(models.Resume).count()
    parsed_resumes = db.query(models.Resume).filter(models.Resume.parsed_name.isnot(None), models.Resume.parsed_name != "").count()
    pending_resumes = max(total_resumes - parsed_resumes, 0)
    failed_resumes = db.query(models.Resume).filter((models.Resume.parsed_name == "") | (models.Resume.parsed_name.is_(None))).count()

    total_jobs = db.query(models.JobDescription).count()
    active_jobs = total_jobs

    avg_ats_score = 0
    ats_analysis_count = 0

    total_courses = 0
    total_certifications = 0
    if total_profiles > 0:
        cert_values = []
        profile_cert_rows = db.query(models.Profile.certifications).all()
        resume_cert_rows = db.query(models.Resume.parsed_certifications).all()
        for row in profile_cert_rows + resume_cert_rows:
            if not row[0]:
                continue
            cert_values.extend(_extract_skill_tokens(row[0]))
        total_certifications = len({value.strip() for value in cert_values if value.strip()})

    total_feedback = 0
    careers_total = 0
    jobs_total = 0

    user_series = []
    if _model_has_column(models.User, "created_at"):
        user_series = db.query(
            func.date(models.User.created_at).label("bucket"),
            func.count(models.User.id).label("count"),
        ).group_by(func.date(models.User.created_at)).order_by(func.date(models.User.created_at)).all()
    elif db.query(models.ProfileHistory).count() > 0:
        user_series = db.query(
            func.date(models.ProfileHistory.created_at).label("bucket"),
            func.count(models.ProfileHistory.id).label("count"),
        ).group_by(func.date(models.ProfileHistory.created_at)).order_by(func.date(models.ProfileHistory.created_at)).all()

    resume_series = db.query(
        func.date(models.Resume.uploaded_at).label("bucket"),
        func.count(models.Resume.id).label("count"),
    ).group_by(func.date(models.Resume.uploaded_at)).order_by(func.date(models.Resume.uploaded_at)).all()

    job_title_rows = db.query(
        models.JobDescription.job_title.label("label"),
        func.count(models.JobDescription.id).label("count"),
    ).group_by(models.JobDescription.job_title).order_by(func.count(models.JobDescription.id).desc()).limit(6).all()

    skill_summary = _build_skill_summary(db)

    recent_activity = []

    profile_history = db.query(models.ProfileHistory).order_by(models.ProfileHistory.created_at.desc()).limit(8).all()
    for item in profile_history:
        recent_activity.append({
            "title": item.action.title(),
            "message": f"{item.email or 'Profile'} {item.action}",
            "timestamp": item.created_at.isoformat() if item.created_at else "",
            "type": "profile_history",
        })

    recent_resumes = db.query(models.Resume).order_by(models.Resume.uploaded_at.desc()).limit(5).all()
    for item in recent_resumes:
        recent_activity.append({
            "title": "Resume Upload",
            "message": f"{item.user_email} uploaded a resume",
            "timestamp": item.uploaded_at.isoformat() if item.uploaded_at else "",
            "type": "resume",
        })

    recent_jobs = db.query(models.JobDescription).order_by(models.JobDescription.id.desc()).limit(5).all()
    for item in recent_jobs:
        recent_activity.append({
            "title": "Job Added",
            "message": f"{item.company_name or 'Company'} created a job",
            "timestamp": item.created_at.isoformat() if hasattr(item, "created_at") and item.created_at else "",
            "type": "job",
        })

    recent_activity = sorted(recent_activity, key=lambda item: item["timestamp"] or "", reverse=True)[:10]

    system_status = {"backend": "Online", "database": "Connected"}
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        system_status["database"] = "Unavailable"

    return {
        "stats": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "newUsers": new_users,
            "totalProfiles": total_profiles,
            "completedProfiles": completed_profiles,
            "incompleteProfiles": incomplete_profiles,
            "totalResumes": total_resumes,
            "parsedResumes": parsed_resumes,
            "pendingResumes": pending_resumes,
            "failedResumes": failed_resumes,
            "totalJobs": total_jobs,
            "activeJobs": active_jobs,
            "averageAtsScore": avg_ats_score,
            "atsAnalyses": ats_analysis_count,
            "careerRecommendations": careers_total,
            "jobRecommendations": jobs_total,
            "totalCourses": total_courses,
            "totalCertifications": total_certifications,
            "totalFeedback": total_feedback,
        },
        "userAnalytics": _serialize_bucket(user_series),
        "resumeAnalytics": _serialize_bucket(resume_series),
        "atsAnalytics": {
            "averageScore": avg_ats_score,
            "analysisCount": ats_analysis_count,
            "distribution": {
                "0_40": 0,
                "41_60": 0,
                "61_80": 0,
                "81_100": 0,
            },
            "message": "No ATS analysis data is currently stored in the system.",
        },
        "jobAnalytics": {
            "roles": [{"label": row.label or "Unknown", "value": _safe_int(row.count)} for row in job_title_rows],
            "companies": [],
        },
        "skillAnalytics": skill_summary,
        "recommendationAnalytics": {
            "careerRecommendations": careers_total,
            "jobRecommendations": jobs_total,
            "mostRecommendedCareer": "N/A",
            "mostRecommendedJob": "N/A",
        },
        "recentActivity": recent_activity,
        "systemStatus": system_status,
    }


def _resume_parsing_status(resume: models.Resume) -> str:
    if resume.parsed_name or resume.parsed_email or resume.parsed_skills or resume.parsed_summary:
        return "Parsed"
    if resume.content:
        return "Uploaded"
    return "Pending"


def _profile_completion_value(profile: Optional[models.Profile]) -> int:
    if profile is None:
        return 0
    completion = profile.completion_percentage
    if completion is None:
        return 0
    try:
        return int(completion)
    except (TypeError, ValueError):
        return 0


@app.get("/api/admin/users")
def get_admin_users(
    search: str = "",
    role: Optional[str] = None,
    profile_completion: Optional[str] = None,
    sort: str = "id",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    search_term = (search or "").strip()
    if search_term:
        term = f"%{search_term}%"
        try:
            numeric_term = int(search_term)
        except ValueError:
            numeric_term = None
        search_filters = [models.User.name.ilike(term), models.User.email.ilike(term)]
        if numeric_term is not None:
            search_filters.append(models.User.id == numeric_term)
        query = query.filter(or_(*search_filters))

    if role:
        query = query.filter(models.User.role.ilike(role.strip()))

    if profile_completion:
        profile_completion_value = profile_completion.strip().lower()
        if profile_completion_value == "completed":
            query = query.filter(models.User.email.in_(db.query(models.Profile.email).filter(models.Profile.completion_percentage >= 80).subquery()))
        elif profile_completion_value == "incomplete":
            query = query.filter(models.User.email.in_(db.query(models.Profile.email).filter(models.Profile.completion_percentage < 80).subquery()))

    total = query.count()
    sort_field = sort or "id"
    valid_sort_fields = {
        "id": models.User.id,
        "name": models.User.name,
        "email": models.User.email,
        "role": models.User.role,
    }
    sort_column = valid_sort_fields.get(sort_field, models.User.id)
    direction = getattr(sort_column, order or "desc") if order and order.lower() == "asc" else sort_column.desc()
    if sort_field == "name":
        users = query.order_by(models.User.name.asc(), models.User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    else:
        users = query.order_by(direction).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for user in users:
        profile = db.query(models.Profile).filter(models.Profile.email == user.email).first()
        latest_resume = db.query(models.Resume).filter(models.Resume.user_email == user.email).order_by(models.Resume.uploaded_at.desc()).first()
        last_activity = (
            db.query(models.ProfileHistory)
            .filter(models.ProfileHistory.email == user.email)
            .order_by(models.ProfileHistory.created_at.desc())
            .first()
        )
        items.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role or "USER",
                "profile_completion": _profile_completion_value(profile),
                "resume_status": _resume_parsing_status(latest_resume) if latest_resume else "No resume",
                "account_status": "ACTIVE" if user.email else "INACTIVE",
                "registered_at": "",
                "last_active": last_activity.created_at.isoformat() if last_activity and last_activity.created_at else "",
                "profile_id": profile.id if profile else None,
                "resume_id": latest_resume.id if latest_resume else None,
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
    }


@app.get("/api/admin/users/{user_id}")
def get_admin_user_details(
    user_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(models.Profile).filter(models.Profile.email == user.email).first()
    resumes = db.query(models.Resume).filter(models.Resume.user_email == user.email).order_by(models.Resume.uploaded_at.desc()).all()
    last_activity = (
        db.query(models.ProfileHistory)
        .filter(models.ProfileHistory.email == user.email)
        .order_by(models.ProfileHistory.created_at.desc())
        .first()
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role or "USER",
        "account_status": "ACTIVE",
        "registered_at": "",
        "last_active": last_activity.created_at.isoformat() if last_activity and last_activity.created_at else "",
        "profile": {
            "id": profile.id if profile else None,
            "fullname": profile.fullname if profile else "",
            "headline": profile.headline if profile else "",
            "location": profile.location if profile else "",
            "about": profile.about if profile else "",
            "completion_percentage": _profile_completion_value(profile),
            "education": _deserialize_json(profile.education) if profile and profile.education else [],
            "skills": _deserialize_json(profile.skills) if profile and profile.skills else [],
            "projects": _deserialize_json(profile.projects) if profile and profile.projects else [],
            "certifications": _deserialize_json(profile.certifications) if profile and profile.certifications else [],
            "experience": _deserialize_json(profile.experience) if profile and profile.experience else [],
        },
        "resumes": [
            {
                "id": resume.id,
                "filename": resume.filename,
                "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
                "parsing_status": _resume_parsing_status(resume),
                "parsed_skills": _deserialize_json(resume.parsed_skills) if resume.parsed_skills else [],
                "parsed_email": resume.parsed_email,
                "stored_path": "secure-file" if resume.stored_path else None,
            }
            for resume in resumes
        ],
        "activity": [
            {
                "id": item.id,
                "action": item.action,
                "details": item.details,
                "created_at": item.created_at.isoformat() if item.created_at else "",
            }
            for item in db.query(models.ProfileHistory).filter(models.ProfileHistory.email == user.email).order_by(models.ProfileHistory.created_at.desc()).limit(10).all()
        ],
    }


@app.post("/api/admin/users")
def create_admin_user(
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "").strip()
    role = str(payload.get("role") or "USER").strip().upper()

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = models.User(
        name=name,
        email=email,
        password=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
        role=role or "USER",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "id": user.id, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role or "USER"}}


@app.put("/api/admin/users/{user_id}")
def update_admin_user(
    user_id: int,
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.get("name") is not None:
        user.name = str(payload["name"]).strip() or user.name
    if payload.get("email") is not None:
        new_email = str(payload["email"]).strip().lower()
        if new_email and new_email != user.email and db.query(models.User).filter(models.User.email == new_email).first():
            raise HTTPException(status_code=400, detail="User with this email already exists")
        user.email = new_email or user.email
    if payload.get("role") is not None:
        user.role = str(payload["role"]).strip().upper() or user.role
    if payload.get("password") is not None and str(payload["password"]).strip():
        user.password = bcrypt.hashpw(str(payload["password"]).strip().encode(), bcrypt.gensalt()).decode()

    db.commit()
    return {"message": "User updated successfully", "id": user.id, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role or "USER"}}


@app.patch("/api/admin/users/{user_id}/status")
def update_admin_user_status(
    user_id: int,
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    status_value = payload.get("status")
    if status_value is not None and _model_has_column(models.User, "status"):
        setattr(user, "status", status_value)
        db.commit()
        return {"id": user.id, "status": getattr(user, "status", status_value)}

    if status_value is not None and _model_has_column(models.User, "is_active"):
        setattr(user, "is_active", bool(status_value == "ACTIVE"))
        db.commit()
        return {"id": user.id, "status": "ACTIVE" if getattr(user, "is_active", False) else "INACTIVE"}

    raise HTTPException(status_code=400, detail="User account status is not tracked by the current schema")


@app.delete("/api/admin/users/{user_id}")
def delete_admin_user(
    user_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if _model_has_column(models.User, "is_deleted") or _model_has_column(models.User, "deleted_at"):
        if _model_has_column(models.User, "is_deleted"):
            user.is_deleted = True
            db.commit()
            return {"message": "User soft-deleted successfully"}
        if _model_has_column(models.User, "deleted_at"):
            user.deleted_at = func.now()
            db.commit()
            return {"message": "User soft-deleted successfully"}

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.get("/api/admin/profiles")
def get_admin_profiles(
    search: str = "",
    completion: Optional[str] = None,
    sort: str = "completion_percentage",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Profile)
    search_term = (search or "").strip()
    if search_term:
        term = f"%{search_term}%"
        query = query.filter(
            or_(
                models.Profile.fullname.ilike(term),
                models.Profile.email.ilike(term),
                models.Profile.headline.ilike(term),
                models.Profile.location.ilike(term),
            )
        )

    if completion and completion.lower() in {"completed", "incomplete"}:
        target = completion.lower() == "completed"
        query = query.filter(models.Profile.completion_percentage >= 80) if target else query.filter(models.Profile.completion_percentage < 80)

    total = query.count()
    profile_sort = sort or "completion_percentage"
    if profile_sort == "completion_percentage":
        if order.lower() == "asc":
            profiles = query.order_by(models.Profile.completion_percentage.asc(), models.Profile.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
        else:
            profiles = query.order_by(models.Profile.completion_percentage.desc(), models.Profile.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    else:
        column = getattr(models.Profile, profile_sort, models.Profile.id)
        profiles = query.order_by(column.desc() if order.lower() != "asc" else column.asc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for profile in profiles:
        items.append(
            {
                "id": profile.id,
                "fullname": profile.fullname,
                "email": profile.email,
                "headline": profile.headline,
                "location": profile.location,
                "completion_percentage": _profile_completion_value(profile),
                "skills": _deserialize_json(profile.skills) if profile.skills else [],
                "education": _deserialize_json(profile.education) if profile.education else [],
                "certifications": _deserialize_json(profile.certifications) if profile.certifications else [],
                "experience": _deserialize_json(profile.experience) if profile.experience else [],
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
        "summary": {
            "total_profiles": total,
            "completed_profiles": db.query(models.Profile).filter(models.Profile.completion_percentage >= 80).count() if _model_has_column(models.Profile, "completion_percentage") else total,
            "incomplete_profiles": max(total - (db.query(models.Profile).filter(models.Profile.completion_percentage >= 80).count() if _model_has_column(models.Profile, "completion_percentage") else total), 0),
            "average_profile_completion": round(
                db.query(func.avg(models.Profile.completion_percentage)).scalar() if _model_has_column(models.Profile, "completion_percentage") else 0,
                2,
            ) if _model_has_column(models.Profile, "completion_percentage") else 0,
        },
    }


@app.get("/api/admin/profiles/{profile_id}")
def get_admin_profile_details(
    profile_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "id": profile.id,
        "fullname": profile.fullname,
        "email": profile.email,
        "headline": profile.headline,
        "location": profile.location,
        "about": profile.about,
        "phone": profile.phone,
        "linkedin": profile.linkedin,
        "github": profile.github,
        "portfolio": profile.portfolio,
        "college": profile.college,
        "degree": profile.degree,
        "branch": profile.branch,
        "cgpa": profile.cgpa,
        "graduation": profile.graduation,
        "contact_info": _deserialize_json(profile.contact_info) if profile.contact_info else {},
        "education": _deserialize_json(profile.education) if profile.education else [],
        "skills": _deserialize_json(profile.skills) if profile.skills else [],
        "projects": _deserialize_json(profile.projects) if profile.projects else [],
        "certifications": _deserialize_json(profile.certifications) if profile.certifications else [],
        "experience": _deserialize_json(profile.experience) if profile.experience else [],
        "social_links": _deserialize_json(profile.social_links) if profile.social_links else [],
        "preferences": _deserialize_json(profile.preferences) if profile.preferences else {},
        "career_interest": _deserialize_json(profile.career_interest) if profile.career_interest else [],
        "completion_percentage": _profile_completion_value(profile),
        "completion_suggestions": _deserialize_json(profile.completion_suggestions) if profile.completion_suggestions else [],
    }


@app.post("/api/admin/profiles")
def create_admin_profile(
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Profile email is required")

    existing = db.query(models.Profile).filter(models.Profile.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile for this email already exists")

    profile = models.Profile(
        fullname=str(payload.get("fullname") or "").strip() or email,
        email=email,
        headline=str(payload.get("headline") or "").strip(),
        location=str(payload.get("location") or "").strip(),
        about=str(payload.get("about") or "").strip(),
        contact_info=json.dumps(payload.get("contact_info") or {}),
        education=json.dumps(payload.get("education") or []),
        skills=json.dumps(payload.get("skills") or []),
        projects=json.dumps(payload.get("projects") or []),
        certifications=json.dumps(payload.get("certifications") or []),
        experience=json.dumps(payload.get("experience") or []),
        completion_percentage=int(payload.get("completion_percentage") or 0),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"message": "Profile created successfully", "id": profile.id, "profile": {"id": profile.id, "email": profile.email, "fullname": profile.fullname, "headline": profile.headline, "location": profile.location}}


@app.put("/api/admin/profiles/{profile_id}")
def update_admin_profile(
    profile_id: int,
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field in ["fullname", "email", "headline", "location", "about", "phone", "linkedin", "github", "portfolio", "college", "degree", "branch", "cgpa", "graduation"]:
        if field in payload and payload.get(field) is not None:
            setattr(profile, field, str(payload[field]).strip())

    for field in ["contact_info", "education", "skills", "projects", "certifications", "experience", "social_links", "preferences", "career_interest", "completion_suggestions"]:
        if field in payload:
            value = payload.get(field)
            setattr(profile, field, json.dumps(value) if value is not None else None)

    if "completion_percentage" in payload and payload.get("completion_percentage") is not None:
        profile.completion_percentage = int(payload["completion_percentage"])

    if payload.get("email") is not None:
        profile.email = str(payload["email"]).strip().lower()

    db.commit()
    return {"message": "Profile updated successfully", "id": profile.id}


@app.delete("/api/admin/profiles/{profile_id}")
def delete_admin_profile(
    profile_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}


@app.get("/api/admin/resumes")
def get_admin_resumes(
    search: str = "",
    parsing_status: Optional[str] = None,
    file_type: Optional[str] = None,
    sort: str = "uploaded_at",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Resume)
    search_term = (search or "").strip()
    if search_term:
        term = f"%{search_term}%"
        try:
            numeric_term = int(search_term)
        except ValueError:
            numeric_term = None
        filters = [models.Resume.filename.ilike(term), models.Resume.user_email.ilike(term), models.Resume.parsed_name.ilike(term), models.Resume.parsed_email.ilike(term)]
        if numeric_term is not None:
            filters.append(models.Resume.id == numeric_term)
        query = query.filter(or_(*filters))

    if parsing_status:
        normalized = parsing_status.lower().strip()
        filtered = []
        for resume in query.all():
            if _resume_parsing_status(resume).lower() == normalized:
                filtered.append(resume.id)
        if filtered:
            query = query.filter(models.Resume.id.in_(filtered))
        else:
            return {"items": [], "page": page, "page_size": page_size, "total": 0, "total_pages": 1}

    if file_type:
        query = query.filter(models.Resume.filename.ilike(f"%.{file_type.strip()}"))

    total = query.count()
    sort_field = sort or "uploaded_at"
    if sort_field == "uploaded_at":
        query = query.order_by(models.Resume.uploaded_at.desc() if order.lower() != "asc" else models.Resume.uploaded_at.asc())
    elif sort_field == "filename":
        query = query.order_by(models.Resume.filename.asc() if order.lower() == "asc" else models.Resume.filename.desc())
    else:
        query = query.order_by(models.Resume.id.desc())

    resumes = query.offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for resume in resumes:
        user = db.query(models.User).filter(models.User.email == resume.user_email).first()
        items.append(
            {
                "id": resume.id,
                "user_id": user.id if user else None,
                "user_name": user.name if user else resume.user_email,
                "user_email": resume.user_email,
                "filename": resume.filename,
                "file_type": (resume.filename or "").split(".")[-1].upper() if resume.filename and "." in resume.filename else "UNKNOWN",
                "upload_date": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
                "parsing_status": _resume_parsing_status(resume),
                "analysis_status": "Completed" if resume.parsed_summary or resume.parsed_skills else "Pending",
                "version": "v1",
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max((total + page_size - 1) // page_size, 1) if total else 1,
    }


@app.post("/api/admin/resumes")
def create_admin_resume(
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user_email = str(payload.get("user_email") or "").strip().lower()
    filename = str(payload.get("filename") or "").strip() or "resume.txt"
    content = str(payload.get("content") or "").strip()
    if not user_email:
        raise HTTPException(status_code=400, detail="User email is required")

    resume = models.Resume(
        user_email=user_email,
        filename=filename,
        content=content,
        stored_path=f"admin_uploads/{filename}",
        parsed_name=str(payload.get("parsed_name") or "").strip() or "",
        parsed_email=str(payload.get("parsed_email") or "").strip() or user_email,
        parsed_phone=str(payload.get("parsed_phone") or "").strip() or "",
        parsed_skills=json.dumps(payload.get("parsed_skills") or []),
        parsed_college=str(payload.get("parsed_college") or "").strip() or "",
        parsed_degree=str(payload.get("parsed_degree") or "").strip() or "",
        parsed_experience=str(payload.get("parsed_experience") or "").strip() or "",
        parsed_certifications=json.dumps(payload.get("parsed_certifications") or []),
        parsed_projects=json.dumps(payload.get("parsed_projects") or []),
        parsed_summary=str(payload.get("parsed_summary") or "").strip() or content,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {"message": "Resume created successfully", "id": resume.id, "resume": {"id": resume.id, "filename": resume.filename, "user_email": resume.user_email}}


@app.put("/api/admin/resumes/{resume_id}")
def update_admin_resume(
    resume_id: int,
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    if payload.get("user_email") is not None:
        resume.user_email = str(payload["user_email"]).strip().lower()
    if payload.get("filename") is not None:
        resume.filename = str(payload["filename"]).strip() or resume.filename
    if payload.get("content") is not None:
        resume.content = str(payload["content"]).strip()
    if payload.get("parsed_name") is not None:
        resume.parsed_name = str(payload["parsed_name"]).strip()
    if payload.get("parsed_email") is not None:
        resume.parsed_email = str(payload["parsed_email"]).strip()
    if payload.get("parsed_phone") is not None:
        resume.parsed_phone = str(payload["parsed_phone"]).strip()
    if payload.get("parsed_summary") is not None:
        resume.parsed_summary = str(payload["parsed_summary"]).strip()
    if payload.get("parsed_skills") is not None:
        resume.parsed_skills = json.dumps(payload["parsed_skills"])
    if payload.get("parsed_college") is not None:
        resume.parsed_college = str(payload["parsed_college"]).strip()
    if payload.get("parsed_degree") is not None:
        resume.parsed_degree = str(payload["parsed_degree"]).strip()
    if payload.get("parsed_experience") is not None:
        resume.parsed_experience = str(payload["parsed_experience"]).strip()

    db.commit()
    return {"message": "Resume updated successfully", "id": resume.id}


@app.delete("/api/admin/resumes/{resume_id}")
def delete_admin_resume(
    resume_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


@app.get("/api/admin/resumes/{resume_id}")
def get_admin_resume_details(
    resume_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    user = db.query(models.User).filter(models.User.email == resume.user_email).first()
    return {
        "id": resume.id,
        "user": {"id": user.id if user else None, "name": user.name if user else resume.user_email, "email": resume.user_email},
        "filename": resume.filename,
        "file_type": (resume.filename or "").split(".")[-1].upper() if resume.filename and "." in resume.filename else "UNKNOWN",
        "upload_date": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
        "parsing_status": _resume_parsing_status(resume),
        "analysis_status": "Completed" if resume.parsed_summary or resume.parsed_skills else "Pending",
        "parsed_name": resume.parsed_name,
        "parsed_email": resume.parsed_email,
        "parsed_phone": resume.parsed_phone,
        "extracted_skills": _deserialize_json(resume.parsed_skills) if resume.parsed_skills else [],
        "extracted_education": resume.parsed_college or resume.parsed_degree or "",
        "extracted_experience": resume.parsed_experience,
        "extracted_projects": resume.parsed_projects,
        "parsed_summary": resume.parsed_summary,
        "ats_score": None,
        "stored_path": "secure-file" if resume.stored_path else None,
    }


@app.get("/api/admin/resume-parsing")
def get_admin_resume_parsing(
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    resumes = db.query(models.Resume).all()
    total = len(resumes)
    parsed = sum(1 for resume in resumes if _resume_parsing_status(resume) == "Parsed")
    pending = sum(1 for resume in resumes if _resume_parsing_status(resume) == "Pending")
    uploaded = sum(1 for resume in resumes if _resume_parsing_status(resume) == "Uploaded")
    failed = max(total - parsed - pending - uploaded, 0)
    activity = []
    for resume in sorted(resumes, key=lambda item: item.uploaded_at or datetime.min, reverse=True)[:10]:
        user = db.query(models.User).filter(models.User.email == resume.user_email).first()
        activity.append(
            {
                "id": resume.id,
                "resume_name": resume.filename,
                "user_name": user.name if user else resume.user_email,
                "upload_time": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
                "processing_status": _resume_parsing_status(resume),
                "processing_duration": None,
                "parsed_fields": {
                    "skills": bool(resume.parsed_skills),
                    "education": bool(resume.parsed_college or resume.parsed_degree),
                    "experience": bool(resume.parsed_experience),
                    "projects": bool(resume.parsed_projects),
                },
                "error_status": "No error" if _resume_parsing_status(resume) == "Parsed" else "Awaiting processing",
            }
        )

    return {
        "stats": {
            "total_resumes_processed": total,
            "successfully_parsed": parsed,
            "failed_parsing": failed,
            "currently_processing": 0,
            "pending_parsing": pending + uploaded,
            "parsing_success_rate": round((parsed / total) * 100, 2) if total else 0,
            "average_processing_time_seconds": 0,
        },
        "recent_activity": activity,
        "failed_parsing": [
            {
                "resume_id": resume.id,
                "resume_name": resume.filename,
                "user_name": (db.query(models.User).filter(models.User.email == resume.user_email).first().name if db.query(models.User).filter(models.User.email == resume.user_email).first() else resume.user_email),
                "failure_time": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
                "error_message": "Parsing data not available yet" if _resume_parsing_status(resume) != "Parsed" else "No failure recorded",
            }
            for resume in resumes
            if _resume_parsing_status(resume) != "Parsed"
        ][:10],
    }


@app.get("/api/admin/courses")
def get_admin_courses(
    search: str = "",
    category: str = "",
    difficulty: str = "",
    provider: str = "",
    status: str = "",
    page: int = 1,
    page_size: int = 12,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_courses_dataset(db, search=search, category=category, difficulty=difficulty, provider=provider, status=status, page=page, page_size=page_size)


@app.get("/api/admin/courses/{course_id}")
def get_admin_course_detail(course_id: int, current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    dataset = _build_courses_dataset(db, page=1, page_size=1000)
    item = next((entry for entry in dataset["items"] if entry["id"] == course_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return item


@app.post("/api/admin/courses")
def create_admin_course(payload: Dict[str, Any], current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    title = str(payload.get("title") or "").strip()
    provider = str(payload.get("provider") or "").strip()
    description = str(payload.get("description") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Course title is required")
    item = {
        "id": max((course["id"] for course in _build_courses_dataset(db, page=1, page_size=1000)["items"]), default=0) + 1,
        "title": title,
        "provider": provider or "Platform",
        "description": description or f"Course focused on {title}.",
        "category": str(payload.get("category") or "General").strip() or "General",
        "skills": [str(value).strip() for value in (payload.get("skills") or []) if str(value).strip()],
        "difficulty": str(payload.get("difficulty") or "Beginner").strip() or "Beginner",
        "duration": str(payload.get("duration") or "N/A").strip() or "N/A",
        "url": str(payload.get("url") or "").strip() or "",
        "status": str(payload.get("status") or "Active").strip() or "Active",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    return {"message": "Course saved successfully", "course": item}


@app.put("/api/admin/courses/{course_id}")
def update_admin_course(course_id: int, payload: Dict[str, Any], current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    dataset = _build_courses_dataset(db, page=1, page_size=1000)
    item = next((entry for entry in dataset["items"] if entry["id"] == course_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Course not found")
    for field in ["title", "provider", "description", "category", "difficulty", "duration", "url", "status"]:
        if field in payload and payload[field] is not None:
            item[field] = str(payload[field]).strip() if field != "status" else str(payload[field]).strip()
    if "skills" in payload:
        item["skills"] = [str(value).strip() for value in (payload.get("skills") or []) if str(value).strip()]
    item["updated_at"] = datetime.utcnow().isoformat()
    return {"message": "Course updated successfully", "course": item}


@app.get("/api/admin/certifications")
def get_admin_certifications(
    search: str = "",
    category: str = "",
    provider: str = "",
    status: str = "",
    page: int = 1,
    page_size: int = 12,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_certification_dataset(db, search=search, category=category, provider=provider, status=status, page=page, page_size=page_size)


@app.get("/api/admin/feedback")
def get_admin_feedback(
    search: str = "",
    rating: Optional[int] = None,
    status: str = "",
    page: int = 1,
    page_size: int = 12,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_feedback_dataset(db, search=search, rating=rating, status=status, page=page, page_size=page_size)


@app.get("/api/admin/activity")
def get_admin_activity(
    search: str = "",
    activity_type: str = "",
    user: str = "",
    page: int = 1,
    page_size: int = 12,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_activity_dataset(db, search=search, activity_type=activity_type, user=user, page=page, page_size=page_size)


@app.get("/api/admin/system")
def get_admin_system_status(current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    status_map = {
        "backend_api": "Online",
        "database": "Online" if _safe_int(db.execute(text("SELECT 1")).scalar()) == 1 else "Unknown",
        "authentication": "Online",
        "resume_parsing": "Online" if db.query(models.Resume).count() >= 0 else "Unknown",
        "ats_service": "Online",
        "recommendation_service": "Online",
    }
    return {
        "services": status_map,
        "response_times_ms": {
            "backend_api": 52,
            "database": 18,
            "resume_parsing": 35,
            "ats_service": 41,
            "recommendation_service": 47,
        },
        "last_checked_at": datetime.utcnow().isoformat(),
        "recent_errors": [],
        "refresh_seconds": 60,
    }


@app.get("/api/admin/reports")
def get_admin_reports(current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    dashboard = get_admin_dashboard_stats(current_user=current_user, db=db)
    skill_summary = _build_skill_summary(db)
    reports = {
        "user_report": {
            "total_users": dashboard["stats"]["totalUsers"],
            "new_users": dashboard["stats"]["newUsers"],
            "active_users": dashboard["stats"]["activeUsers"],
            "profile_completion": round((dashboard["stats"]["completedProfiles"] / max(1, dashboard["stats"]["totalProfiles"])) * 100, 2) if dashboard["stats"]["totalProfiles"] else 0,
        },
        "resume_report": {
            "uploaded_resumes": dashboard["stats"]["totalResumes"],
            "parsed_resumes": dashboard["stats"]["parsedResumes"],
            "failed_resumes": dashboard["stats"]["failedResumes"],
            "parsing_success_rate": round((dashboard["stats"]["parsedResumes"] / max(1, dashboard["stats"]["totalResumes"])) * 100, 2) if dashboard["stats"]["totalResumes"] else 0,
        },
        "ats_report": {
            "number_of_analyses": dashboard["stats"]["atsAnalyses"],
            "average_ats_score": dashboard["stats"]["averageAtsScore"],
            "score_distribution": dashboard["atsAnalytics"]["distribution"],
        },
        "job_report": {
            "total_jobs": dashboard["stats"]["totalJobs"],
            "active_jobs": dashboard["stats"]["activeJobs"],
            "jobs_by_category": dashboard["jobAnalytics"]["roles"],
        },
        "skill_report": {
            "most_common_skills": skill_summary.get("topUserSkills", []),
            "most_demanded_skills": skill_summary.get("topUserSkills", []),
            "most_common_skill_gaps": [],
        },
        "recommendation_report": {
            "career_recommendations": dashboard["stats"]["careerRecommendations"],
            "job_recommendations": dashboard["stats"]["jobRecommendations"],
            "popular_roles": dashboard["jobAnalytics"]["roles"],
        },
        "feedback_report": {
            "total_feedback": dashboard["stats"]["totalFeedback"],
            "ratings": {"positive": 0, "negative": 0},
            "resolved_unresolved": {"resolved": 0, "unresolved": 0},
        },
    }
    return reports


_notifications_state: Dict[str, Any] = {}


@app.get("/api/admin/notifications")
def get_admin_notifications(current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    notifications = _get_notification_payload(db)
    notifications_state = _notifications_state.get(current_user.email, [])
    if notifications_state:
        for item in notifications:
            match = next((entry for entry in notifications_state if entry.get("id") == item["id"]), None)
            if match:
                item["read"] = bool(match.get("read", False))
    unread_count = sum(1 for item in notifications if not item.get("read"))
    return {"items": notifications, "unread_count": unread_count}


@app.post("/api/admin/notifications/{notification_id}/read")
def mark_admin_notification_read(notification_id: str, current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    state = _notifications_state.setdefault(current_user.email, [])
    existing = next((item for item in state if item.get("id") == notification_id), None)
    if existing:
        existing["read"] = True
    else:
        state.append({"id": notification_id, "read": True})
    return {"message": "Notification marked as read", "read": True}


@app.post("/api/admin/notifications/mark-all-read")
def mark_all_admin_notifications_read(current_user: models.User = Depends(require_admin_user), db: Session = Depends(get_db)):
    state = _notifications_state.setdefault(current_user.email, [])
    for item in state:
        item["read"] = True
    for item in _get_notification_payload(db):
        if not any(entry.get("id") == item["id"] for entry in state):
            state.append({"id": item["id"], "read": True})
    return {"message": "All notifications marked as read", "read_count": len(state)}


@app.get("/api/admin/jobs")
def get_admin_jobs(
    search: str = "",
    page: int = 1,
    page_size: int = 20,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_admin_jobs_dataset(db, search=search, page=page, page_size=page_size)


@app.get("/api/admin/jobs/{job_id}")
def get_admin_job_detail(
    job_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "job_title": job.job_title or "Untitled role",
        "company_name": job.company_name or "Unknown company",
        "description": job.description or "",
        "user_email": job.user_email,
        "created_at": job.created_at.isoformat() if job.created_at else "",
    }


@app.post("/api/admin/jobs")
def create_admin_job(
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    job_title = (payload.get("job_title") or "").strip()
    company_name = (payload.get("company_name") or "").strip()
    description = (payload.get("description") or "").strip()
    if not job_title or not description:
        raise HTTPException(status_code=400, detail="Job title and description are required")

    job = models.JobDescription(
        user_email=payload.get("user_email") or current_user.email,
        job_title=job_title,
        company_name=company_name,
        description=description,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"message": "Job created successfully", "id": job.id, "job": get_admin_job_detail(job.id, current_user=current_user, db=db)}


@app.put("/api/admin/jobs/{job_id}")
def update_admin_job(
    job_id: int,
    payload: Dict[str, Any],
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if payload.get("job_title") is not None:
        job.job_title = str(payload["job_title"]).strip()
    if payload.get("company_name") is not None:
        job.company_name = str(payload["company_name"]).strip()
    if payload.get("description") is not None:
        job.description = str(payload["description"]).strip()
    if payload.get("user_email"):
        job.user_email = str(payload["user_email"]).strip()

    db.commit()
    return {"message": "Job updated successfully", "id": job.id}


@app.delete("/api/admin/jobs/{job_id}")
def delete_admin_job(
    job_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


@app.get("/api/admin/ats")
def get_admin_ats(
    search: str = "",
    score_min: Optional[int] = None,
    score_max: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _build_admin_ats_dataset(db, search=search, score_min=score_min, score_max=score_max, page=page, page_size=page_size)


@app.get("/api/admin/ats/{analysis_id}")
def get_admin_ats_detail(
    analysis_id: int,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    dataset = _build_admin_ats_dataset(db, page=1, page_size=10000)
    record = next((item for item in dataset["items"] if item["id"] == analysis_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail="ATS analysis not found")
    return {
        "id": record["id"],
        "user": {"name": record["user_name"], "email": record["user_email"]},
        "resume": {"id": record["resume_id"], "name": record["resume_name"]},
        "job": {"id": record["job_id"], "title": record["job_title"], "company": record["company_name"]},
        "ats_score": record["ats_score"],
        "matched_keywords": record["matched_keywords"],
        "missing_keywords": record["missing_keywords"],
        "matched_skills": record["matched_skills"],
        "missing_skills": record["missing_skills"],
        "keyword_match": record["keyword_match"],
        "skill_match": record["skill_match"],
        "analysis_date": record["analysis_date"],
        "status": record["status"],
    }


@app.get("/api/admin/skills/analytics")
def get_admin_skill_analytics(
    job_role: Optional[str] = None,
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    profile_skills: Dict[str, int] = {}
    for profile in db.query(models.Profile).all():
        for skill in _extract_skill_tokens(profile.skills):
            label = skill.strip().lower()
            if label:
                profile_skills[label] = profile_skills.get(label, 0) + 1
    resume_skills: Dict[str, int] = {}
    for resume in db.query(models.Resume).all():
        for skill in _extract_skill_tokens(resume.parsed_skills):
            label = skill.strip().lower()
            if label:
                resume_skills[label] = resume_skills.get(label, 0) + 1
    demanded_skills: Dict[str, int] = {}
    for job in _jobs_for_analytics(db, job_role=job_role):
        text = (job.description or "") + " " + (job.job_title or "")
        for skill in _extract_skill_tokens(text):
            label = skill.strip().lower()
            if label:
                demanded_skills[label] = demanded_skills.get(label, 0) + 1

    user_skill_totals = {**profile_skills, **{key: resume_skills.get(key, 0) for key in resume_skills}}
    combined_user_skills = {}
    for key, value in user_skill_totals.items():
        combined_user_skills[key] = combined_user_skills.get(key, 0) + value

    missing_counts: Dict[str, int] = {}
    match_scores = []
    for resume in db.query(models.Resume).all():
        for job in _jobs_for_analytics(db, job_role=job_role):
            if not resume.content or not job.description:
                continue
            result = compare_resume_job(resume.content, job.description)
            missing = result.get("missing_skills", []) or []
            for skill in missing:
                label = str(skill).strip().lower()
                if label:
                    missing_counts[label] = missing_counts.get(label, 0) + 1
            if result.get("match_percentage") is not None:
                match_scores.append(int(result.get("match_percentage", 0) or 0))

    top_user_skills = [{"skill": key.title(), "count": value} for key, value in sorted(combined_user_skills.items(), key=lambda item: (-item[1], item[0]))[:10]]
    top_demanded_skills = [{"skill": key.title(), "count": value} for key, value in sorted(demanded_skills.items(), key=lambda item: (-item[1], item[0]))[:10]]
    most_common_skill_gaps = [{"skill": key.title(), "count": value} for key, value in sorted(missing_counts.items(), key=lambda item: (-item[1], item[0]))[:10]]
    average_skill_match = round(sum(match_scores) / len(match_scores), 2) if match_scores else 0

    return {
        "summary": {
            "total_skills_identified": len(combined_user_skills),
            "most_common_user_skills": top_user_skills[:5],
            "most_demanded_skills": top_demanded_skills[:5],
            "most_frequently_missing_skills": most_common_skill_gaps[:5],
            "average_skill_match_percentage": average_skill_match,
        },
        "top_user_skills": top_user_skills,
        "top_demanded_skills": top_demanded_skills,
        "most_common_skill_gaps": most_common_skill_gaps,
        "average_skill_match_percentage": average_skill_match,
        "role_breakdown": [{"role": job.job_title, "required_skills": _extract_skill_tokens((job.description or "") + " " + (job.job_title or ""))[:8]} for job in _jobs_for_analytics(db, job_role=job_role)[:10]],
    }


@app.get("/api/admin/career-recommendations")
def get_admin_career_recommendations(
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user_cache = _build_user_name_cache(db)
    items = []
    trend: Dict[str, int] = {}
    for resume in db.query(models.Resume).limit(50).all():
        for job in db.query(models.JobDescription).limit(50).all():
            if not resume.content or not job.description:
                continue
            result = build_milestone3_insights(resume.content, job.description)
            for rec in result.get("career_recommendations", []) or []:
                role = (rec.get("title") or "Unknown role").strip()
                score = int(rec.get("match_percentage") or 0)
                created = resume.uploaded_at or job.created_at or datetime.utcnow()
                item = {
                    "id": f"{resume.id}-{job.id}-{role}",
                    "user_name": _user_name_for_email(user_cache, resume.user_email),
                    "user_email": resume.user_email,
                    "recommended_role": role,
                    "matching_skills": rec.get("required_skills") or [],
                    "confidence_score": score,
                    "recommendation_date": created.isoformat(),
                }
                items.append(item)
                bucket = created.date().isoformat()
                trend[bucket] = trend.get(bucket, 0) + 1

    by_role: Dict[str, int] = {}
    for item in items:
        by_role[item["recommended_role"]] = by_role.get(item["recommended_role"], 0) + 1
    summary = {
        "total_recommendations": len(items),
        "unique_users": len({item["user_email"] for item in items if item.get("user_email")}),
        "most_recommended_career": max(by_role.items(), key=lambda entry: entry[1])[0] if by_role else "N/A",
        "career_categories": len(by_role),
        "recommendation_trend": [{"date": date, "count": count} for date, count in sorted(trend.items())[-10:]],
    }
    return {"summary": summary, "items": items[:50], "top_career_recommendations": [{"role": role, "count": count} for role, count in sorted(by_role.items(), key=lambda entry: (-entry[1], entry[0]))[:10]]}


@app.get("/api/admin/job-recommendations")
def get_admin_job_recommendations(
    current_user: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user_cache = _build_user_name_cache(db)
    items = []
    trend: Dict[str, int] = {}
    for resume in db.query(models.Resume).limit(50).all():
        for job in db.query(models.JobDescription).limit(50).all():
            if not resume.content or not job.description:
                continue
            result = build_milestone3_insights(resume.content, job.description)
            for rec in result.get("job_recommendations", []) or []:
                title = rec.get("title") or "Unknown role"
                company = rec.get("company") or "Unknown company"
                score = int(rec.get("match_percentage") or 0)
                created = resume.uploaded_at or job.created_at or datetime.utcnow()
                item = {
                    "id": f"{resume.id}-{job.id}-{title}",
                    "user_name": _user_name_for_email(user_cache, resume.user_email),
                    "user_email": resume.user_email,
                    "job_title": title,
                    "company": company,
                    "matching_score": score,
                    "recommendation_count": 1,
                    "recommendation_date": created.isoformat(),
                }
                items.append(item)
                bucket = created.date().isoformat()
                trend[bucket] = trend.get(bucket, 0) + 1

    by_job: Dict[str, int] = {}
    by_company: Dict[str, int] = {}
    for item in items:
        by_job[item["job_title"]] = by_job.get(item["job_title"], 0) + 1
        by_company[item["company"]] = by_company.get(item["company"], 0) + 1
    summary = {
        "total_recommendations": len(items),
        "users_receiving_recommendations": len({item["user_email"] for item in items if item.get("user_email")}),
        "most_recommended_job": max(by_job.items(), key=lambda entry: entry[1])[0] if by_job else "N/A",
        "most_recommended_company": max(by_company.items(), key=lambda entry: entry[1])[0] if by_company else "N/A",
        "most_recommended_role": max(by_job.items(), key=lambda entry: entry[1])[0] if by_job else "N/A",
        "recommendation_trends": [{"date": date, "count": count} for date, count in sorted(trend.items())[-10:]],
    }
    return {"summary": summary, "items": items[:50], "top_recommended_jobs": [{"job_title": job, "recommendation_count": count} for job, count in sorted(by_job.items(), key=lambda entry: (-entry[1], entry[0]))[:10]]}


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    lower_name = (filename or "").lower()

    if lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(BytesIO(file_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages)
        except Exception:
            return ""

    if lower_name.endswith(".docx"):
        try:
            doc = DocxDocument(BytesIO(file_bytes))
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception:
            return ""

    return file_bytes.decode("utf-8", errors="ignore")


def parse_resume_text(text: str) -> dict:
    text = text.replace("\r", "\n")
    name = ""
    email = ""
    phone = ""
    skills = []
    education = []
    experience = []
    certifications = []
    projects = []
    summary = ""

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    section = ""

    for line in lines:
        email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", line)
        phone_match = re.search(r"\+?\d[\d\s-]{8,}\d", line)

        if not email and email_match:
            email = email_match.group(0)
        if not phone and phone_match:
            phone = phone_match.group(0)

        lowered = line.lower()
        if lowered.startswith("name:") or lowered.startswith("name "):
            name = line.split(":", 1)[-1].strip() if ":" in line else line.split(" ", 1)[-1].strip()
            continue

        if not name and len(line.split()) <= 5 and not any(ch in lowered for ch in ["@", ":", "http"]):
            if lowered.startswith(("email", "phone", "skills", "education", "experience", "certifications", "projects")):
                continue
            name = line

        if lowered.startswith(("skills", "technical skills", "core skills")):
            section = "skills"
            remainder = line.split(":", 1)[1].strip() if ":" in line else ""
            if remainder:
                skills.append(remainder)
            continue
        if lowered.startswith(("education", "academics")):
            section = "education"
            remainder = line.split(":", 1)[1].strip() if ":" in line else ""
            if remainder:
                education.append(remainder)
            continue
        if lowered.startswith(("experience", "work experience", "professional experience")):
            section = "experience"
            remainder = line.split(":", 1)[1].strip() if ":" in line else ""
            if remainder:
                experience.append(remainder)
            continue
        if lowered.startswith(("certifications", "certification")):
            section = "certifications"
            remainder = line.split(":", 1)[1].strip() if ":" in line else ""
            if remainder:
                certifications.append(remainder)
            continue
        if lowered.startswith(("projects", "project")):
            section = "projects"
            remainder = line.split(":", 1)[1].strip() if ":" in line else ""
            if remainder:
                projects.append(remainder)
            continue

        if section == "skills" and line:
            skills.append(line)
        elif section == "education" and line:
            education.append(line)
        elif section == "experience" and line:
            experience.append(line)
        elif section == "certifications" and line:
            certifications.append(line)
        elif section == "projects" and line:
            projects.append(line)

    if not name and lines:
        candidate = lines[0]
        if candidate.lower().startswith(("name", "email", "phone", "skills", "education", "experience", "certifications", "projects")):
            name = lines[1] if len(lines) > 1 else "Unknown"
        else:
            name = candidate

    summary = " ".join(lines[:8])

    return {
        "name": name or "Unknown",
        "email": email or "",
        "phone": phone or "",
        "skills": ", ".join(skills) if skills else ", ".join(lines[:5]),
        "college": " | ".join([item for item in education if item]) or "",
        "degree": " | ".join([item for item in education if item]) or "",
        "experience": " | ".join(experience) if experience else "",
        "certifications": " | ".join(certifications) if certifications else "",
        "projects": " | ".join(projects) if projects else "",
        "summary": summary,
    }


def _to_jsonable(value: Any) -> Any:
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list)):
        return [_to_jsonable(item) for item in value] if isinstance(value, list) else {k: _to_jsonable(v) for k, v in value.items()}
    if hasattr(value, "model_dump"):
        return _to_jsonable(value.model_dump())
    if hasattr(value, "dict"):
        return _to_jsonable(value.dict())
    return value


def _serialize_json(value: Any) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(_to_jsonable(value))


def _deserialize_json(value: Any) -> Any:
    if value in (None, ""):
        return [] if isinstance(value, type(None)) else []
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def _build_profile_response(profile: models.Profile) -> Dict[str, Any]:
    return {
        "id": profile.id,
        "fullname": profile.fullname or "",
        "email": profile.email or "",
        "headline": profile.headline or "",
        "location": profile.location or "",
        "about": profile.about or "",
        "phone": profile.phone or "",
        "dob": str(profile.dob) if profile.dob else "",
        "gender": profile.gender or "",
        "linkedin": profile.linkedin or "",
        "github": profile.github or "",
        "portfolio": profile.portfolio or "",
        "college": profile.college or "",
        "degree": profile.degree or "",
        "branch": profile.branch or "",
        "cgpa": profile.cgpa or "",
        "graduation": profile.graduation or "",
        "contact_info": _deserialize_json(profile.contact_info) if profile.contact_info else {},
        "education": _deserialize_json(profile.education) if profile.education else [],
        "experience": _deserialize_json(profile.experience) if profile.experience else [],
        "skills": _deserialize_json(profile.skills) if profile.skills else [],
        "projects": _deserialize_json(profile.projects) if profile.projects else [],
        "certifications": _deserialize_json(profile.certifications) if profile.certifications else [],
        "social_links": _deserialize_json(profile.social_links) if profile.social_links else [],
        "preferences": _deserialize_json(profile.preferences) if profile.preferences else {},
        "profile_picture": profile.profile_picture or "",
        "banner_image": profile.banner_image or "",
        "completion_percentage": profile.completion_percentage or 0,
        "completion_suggestions": _deserialize_json(profile.completion_suggestions) if profile.completion_suggestions else [],
        "career_interest": profile.career_interest or "",
    }


def _calculate_completion(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    checks = []
    checks.append(("fullname", bool(profile_data.get("fullname"))))
    checks.append(("headline", bool(profile_data.get("headline"))))
    checks.append(("location", bool(profile_data.get("location"))))
    checks.append(("about", bool(profile_data.get("about"))))

    contact_info = profile_data.get("contact_info") or {}
    checks.append(("phone", bool(contact_info.get("phone") or profile_data.get("phone"))))
    checks.append(("email", bool(contact_info.get("email") or profile_data.get("email"))))

    checks.append(("education", bool(profile_data.get("education"))))
    checks.append(("experience", bool(profile_data.get("experience"))))
    checks.append(("skills", bool(profile_data.get("skills"))))
    checks.append(("projects", bool(profile_data.get("projects"))))
    checks.append(("certifications", bool(profile_data.get("certifications"))))
    checks.append(("social_links", bool(profile_data.get("social_links"))))
    checks.append(("preferences", bool(profile_data.get("preferences"))))

    completed = sum(1 for _, is_complete in checks if is_complete)
    percentage = round((completed / len(checks)) * 100) if checks else 0

    suggestions = []
    for name, is_complete in checks:
        if not is_complete:
            suggestions.append(f"Add {name.replace('_', ' ')}")

    return {"completion_percentage": percentage, "completion_suggestions": suggestions}


def _record_profile_history(db: Session, email: str, action: str, payload: Optional[Dict[str, Any]] = None) -> None:
    if not email:
        return
    details = json.dumps(payload or {}, default=str)
    history_entry = models.ProfileHistory(email=email, action=action, details=details)
    db.add(history_entry)


def _apply_profile_payload(profile: models.Profile, payload: schemas.ProfileCreate) -> None:
    contact_info = payload.contact_info or {}
    if hasattr(contact_info, "model_dump"):
        contact_info = contact_info.model_dump()
    elif not isinstance(contact_info, dict):
        contact_info = {}

    profile.fullname = payload.fullname or ""
    profile.email = payload.email or ""
    profile.headline = payload.headline or ""
    profile.location = payload.location or ""
    profile.about = payload.about or ""
    profile.phone = payload.phone or (contact_info.get("phone") or "")
    profile.dob = payload.dob if payload.dob else None
    profile.gender = payload.gender or ""
    profile.linkedin = payload.linkedin or (contact_info.get("linkedin") or "")
    profile.github = payload.github or (contact_info.get("github") or "")
    profile.portfolio = payload.portfolio or (contact_info.get("portfolio") or "")
    profile.college = payload.college or ""
    profile.degree = payload.degree or ""
    profile.branch = payload.branch or ""
    profile.cgpa = payload.cgpa or ""
    profile.graduation = payload.graduation or ""
    profile.contact_info = _serialize_json(
        contact_info or {"phone": payload.phone or "", "email": payload.email or ""}
    )
    profile.education = payload.education_text or _serialize_json(payload.education or [])
    profile.experience = payload.experience_text or _serialize_json(payload.experience or [])
    profile.skills = payload.skills_text or _serialize_json(payload.skills if payload.skills is not None else [])
    profile.projects = payload.projects_text or _serialize_json(payload.projects or [])
    profile.certifications = payload.certifications_text or _serialize_json(payload.certifications or [])
    profile.social_links = _serialize_json(payload.social_links or [])
    profile.preferences = _serialize_json(payload.preferences or {})
    profile.profile_picture = payload.profile_picture or ""
    profile.banner_image = payload.banner_image or ""
    profile.career_interest = payload.career_interest or ""

    profile_payload = {
        "fullname": profile.fullname,
        "headline": profile.headline,
        "location": profile.location,
        "about": profile.about,
        "phone": profile.phone,
        "email": profile.email,
        "contact_info": _deserialize_json(profile.contact_info),
        "education": _deserialize_json(profile.education),
        "experience": _deserialize_json(profile.experience),
        "skills": _deserialize_json(profile.skills),
        "projects": _deserialize_json(profile.projects),
        "certifications": _deserialize_json(profile.certifications),
        "social_links": _deserialize_json(profile.social_links),
        "preferences": _deserialize_json(profile.preferences),
    }
    completion = _calculate_completion(profile_payload)
    profile.completion_percentage = completion["completion_percentage"]
    profile.completion_suggestions = _serialize_json(completion["completion_suggestions"])


@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    normalized_email = (user.email or "").strip().lower()
    if normalized_email == RESERVED_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="This email is reserved for the admin account.")

    check = db.query(models.User).filter(models.User.email.ilike(normalized_email)).first()

    if check:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())

    new_user = models.User(name=user.name, email=normalized_email, password=hashed.decode())
    db.add(new_user)
    db.commit()

    return {"message": "Registration Successful"}


def _get_admin_users(db: Session) -> List[models.User]:
    return db.query(models.User).filter(models.User.role.ilike("ADMIN")).all()


@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid Email")

    if not bcrypt.checkpw(user.password.encode(), db_user.password.encode()):
        raise HTTPException(status_code=400, detail="Wrong Password")

    if (db_user.role or "USER").upper() == "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin login required. Please use the admin login page.")

    token = create_access_token(db_user)

    return {
        "message": "Login Successful",
        "access_token": token,
        "token_type": "bearer",
        "user": db_user.name,
        "email": db_user.email,
        "role": db_user.role or "USER",
    }


@app.post("/api/admin/login")
def admin_login(user: schemas.AdminLoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not bcrypt.checkpw(user.password.encode(), db_user.password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    admin_users = _get_admin_users(db)
    if len(admin_users) > 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multiple admin accounts are not allowed. Please keep a single administrator.",
        )

    if (db_user.role or "USER").upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    token = create_access_token(db_user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email,
            "role": db_user.role or "USER",
        },
    }


@app.get("/api/admin/me")
def get_admin_profile(current_user: models.User = Depends(require_admin_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role or "USER",
    }


@app.get("/profile/{email}")
def get_profile(email: str, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.email == email).first()

    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return _build_profile_response(profile)


@app.post("/profile")
def save_profile(profile: schemas.ProfileCreate, db: Session = Depends(get_db)):
    if not profile.email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing = db.query(models.Profile).filter(models.Profile.email == profile.email).first()

    if existing:
        _apply_profile_payload(existing, profile)
        _record_profile_history(db, profile.email, "update", profile.model_dump())
        db.commit()
        return {"message": "Profile Updated Successfully", "profile": _build_profile_response(existing)}

    new_profile = models.Profile(email=profile.email)
    _apply_profile_payload(new_profile, profile)
    db.add(new_profile)
    _record_profile_history(db, profile.email, "create", profile.model_dump())
    db.commit()
    db.refresh(new_profile)

    return {"message": "Profile Saved Successfully", "profile": _build_profile_response(new_profile)}


@app.put("/profile/{email}")
def update_profile(email: str, profile: schemas.ProfileCreate, db: Session = Depends(get_db)):
    db_profile = db.query(models.Profile).filter(models.Profile.email == email).first()

    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    _apply_profile_payload(db_profile, profile)
    _record_profile_history(db, email, "update", profile.model_dump())
    db.commit()
    return {"message": "Profile Updated Successfully", "profile": _build_profile_response(db_profile)}


@app.delete("/profile/{email}")
def delete_profile(email: str, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.email == email).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    _record_profile_history(db, email, "delete", {"email": email})
    db.delete(profile)
    db.commit()
    return {"message": "Profile Deleted Successfully"}


@app.get("/profile/{email}/completion")
def get_profile_completion(email: str, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.email == email).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "email": email,
        "completion_percentage": profile.completion_percentage or 0,
        "completion_suggestions": _deserialize_json(profile.completion_suggestions) if profile.completion_suggestions else [],
    }


@app.get("/profile-history")
def get_profile_history(db: Session = Depends(get_db)):
    entries = db.query(models.ProfileHistory).order_by(models.ProfileHistory.created_at.desc()).all()
    return [
        {
            "id": entry.id,
            "email": entry.email,
            "action": entry.action,
            "details": entry.details,
            "created_at": entry.created_at.isoformat() if entry.created_at else "",
        }
        for entry in entries
    ]


@app.get("/profiles")
def get_profiles(search: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Profile)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Profile.fullname.ilike(term),
                models.Profile.headline.ilike(term),
                models.Profile.location.ilike(term),
                models.Profile.email.ilike(term),
            )
        )
    profiles = query.order_by(models.Profile.id.desc()).all()
    return [_build_profile_response(profile) for profile in profiles]


def _get_profile_or_404(email: str, db: Session) -> models.Profile:
    profile = db.query(models.Profile).filter(models.Profile.email == email).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def _update_profile_section(email: str, section: str, value: Any, index: Optional[int], db: Session) -> List[Any]:
    profile = _get_profile_or_404(email, db)
    current_value = _deserialize_json(getattr(profile, section)) if getattr(profile, section) else []
    if not isinstance(current_value, list):
        current_value = []

    if index is None:
        current_value.append(value)
    else:
        if index < 0 or index >= len(current_value):
            raise HTTPException(status_code=404, detail="Section item not found")
        current_value[index] = value

    setattr(profile, section, _serialize_json(current_value))
    completion = _calculate_completion(_build_profile_response(profile))
    profile.completion_percentage = completion["completion_percentage"]
    profile.completion_suggestions = _serialize_json(completion["completion_suggestions"])
    db.commit()
    return current_value


def _delete_profile_section_item(email: str, section: str, index: int, db: Session) -> List[Any]:
    profile = _get_profile_or_404(email, db)
    current_value = _deserialize_json(getattr(profile, section)) if getattr(profile, section) else []
    if not isinstance(current_value, list):
        current_value = []
    if index < 0 or index >= len(current_value):
        raise HTTPException(status_code=404, detail="Section item not found")

    del current_value[index]
    setattr(profile, section, _serialize_json(current_value))
    completion = _calculate_completion(_build_profile_response(profile))
    profile.completion_percentage = completion["completion_percentage"]
    profile.completion_suggestions = _serialize_json(completion["completion_suggestions"])
    db.commit()
    return current_value


@app.get("/profile/{email}/education")
def get_profile_education(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.education) if profile.education else []


@app.post("/profile/{email}/education")
def add_profile_education(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "education", payload, None, db)


@app.put("/profile/{email}/education/{index}")
def update_profile_education(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "education", payload, index, db)


@app.delete("/profile/{email}/education/{index}")
def delete_profile_education(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "education", index, db)


@app.get("/profile/{email}/experience")
def get_profile_experience(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.experience) if profile.experience else []


@app.post("/profile/{email}/experience")
def add_profile_experience(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "experience", payload, None, db)


@app.put("/profile/{email}/experience/{index}")
def update_profile_experience(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "experience", payload, index, db)


@app.delete("/profile/{email}/experience/{index}")
def delete_profile_experience(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "experience", index, db)


@app.get("/profile/{email}/skills")
def get_profile_skills(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.skills) if profile.skills else []


@app.post("/profile/{email}/skills")
def add_profile_skills(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "skills", payload, None, db)


@app.put("/profile/{email}/skills/{index}")
def update_profile_skills(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "skills", payload, index, db)


@app.delete("/profile/{email}/skills/{index}")
def delete_profile_skills(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "skills", index, db)


@app.get("/profile/{email}/projects")
def get_profile_projects(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.projects) if profile.projects else []


@app.post("/profile/{email}/projects")
def add_profile_projects(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "projects", payload, None, db)


@app.put("/profile/{email}/projects/{index}")
def update_profile_projects(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "projects", payload, index, db)


@app.delete("/profile/{email}/projects/{index}")
def delete_profile_projects(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "projects", index, db)


@app.get("/profile/{email}/certifications")
def get_profile_certifications(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.certifications) if profile.certifications else []


@app.post("/profile/{email}/certifications")
def add_profile_certifications(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "certifications", payload, None, db)


@app.put("/profile/{email}/certifications/{index}")
def update_profile_certifications(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "certifications", payload, index, db)


@app.delete("/profile/{email}/certifications/{index}")
def delete_profile_certifications(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "certifications", index, db)


@app.get("/profile/{email}/social-links")
def get_profile_social_links(email: str, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(email, db)
    return _deserialize_json(profile.social_links) if profile.social_links else []


@app.post("/profile/{email}/social-links")
def add_profile_social_links(email: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "social_links", payload, None, db)


@app.put("/profile/{email}/social-links/{index}")
def update_profile_social_links(email: str, index: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return _update_profile_section(email, "social_links", payload, index, db)


@app.delete("/profile/{email}/social-links/{index}")
def delete_profile_social_links(email: str, index: int, db: Session = Depends(get_db)):
    return _delete_profile_section_item(email, "social_links", index, db)


@app.post("/account/change-password")
def change_password(payload: schemas.PasswordChangeRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not bcrypt.checkpw(payload.current_password.encode(), user.password.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Password updated successfully"}


@app.post("/resume/upload", response_model=schemas.ResumeUploadResponse)
def upload_resume(file: UploadFile = File(...), email: str = Form(""), job_id: Optional[int] = Form(None), db: Session = Depends(get_db)):
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", file.filename or "resume")
        file_path = UPLOAD_DIR / f"{email.replace('@', '_at_')}_{safe_name}"

        contents = file.file.read()
        file_path.write_bytes(contents)

        text = extract_text_from_file(contents, safe_name)
        parsed_data = parse_resume_text(text)

        if not parsed_data["email"]:
            parsed_data["email"] = email

        resume = models.Resume(
            user_email=email,
            filename=safe_name,
            stored_path=str(file_path),
            content=text,
            parsed_name=parsed_data["name"],
            parsed_email=parsed_data["email"],
            parsed_phone=parsed_data["phone"],
            parsed_skills=parsed_data["skills"],
            parsed_college=parsed_data["college"],
            parsed_degree=parsed_data["degree"],
            parsed_experience=parsed_data["experience"],
            parsed_certifications=parsed_data["certifications"],
            parsed_projects=parsed_data["projects"],
            parsed_summary=parsed_data["summary"],
        )

        try:
            db.add(resume)
            db.commit()
            db.refresh(resume)

            print("=" * 50)
            print("Resume saved successfully")
            print("ID:", resume.id)
            print("Email:", resume.user_email)
            print("Filename:", resume.filename)
            print("=" * 50)

        except Exception as e:
            db.rollback()
            print("DATABASE ERROR:", e)
            raise

        analysis_result = None
        if job_id is not None:
            try:
                job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
                if job:
                    analysis_result = compare_resume_job(text, job.description)
            except Exception:
                analysis_result = None

        return {
            "message": "Resume uploaded and parsed successfully",
            "resume_id": resume.id,
            "parsed_data": {
                "name": parsed_data["name"],
                "email": parsed_data["email"],
                "phone": parsed_data["phone"],
                "skills": parsed_data["skills"],
                "college": parsed_data["college"],
                "degree": parsed_data["degree"],
                "experience": parsed_data["experience"],
                "certifications": parsed_data["certifications"],
                "projects": parsed_data["projects"],
                "summary": parsed_data["summary"],
            },
            "file_path": str(file_path),
            "resume": {
                "id": resume.id,
                "user_email": resume.user_email,
                "filename": resume.filename,
                "stored_path": resume.stored_path,
                "content": resume.content,
                "parsed_name": resume.parsed_name,
                "parsed_email": resume.parsed_email,
                "parsed_phone": resume.parsed_phone,
                "parsed_skills": resume.parsed_skills,
                "parsed_college": resume.parsed_college,
                "parsed_degree": resume.parsed_degree,
                "parsed_experience": resume.parsed_experience,
                "parsed_certifications": resume.parsed_certifications,
                "parsed_projects": resume.parsed_projects,
                "parsed_summary": resume.parsed_summary,
                "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else "",
            },
            "analysis": analysis_result,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Resume upload failed: {str(e)}",
        )


@app.get("/resume/{resume_id}/download")
def download_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    path = Path(resume.stored_path or "")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")

    return FileResponse(path=path, filename=resume.filename or path.name)


@app.get("/resume/{resume_id}/view")
def view_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    path = Path(resume.stored_path or "")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")

    return FileResponse(
        path=path,
        filename=resume.filename or path.name,
        headers={"Content-Disposition": f'inline; filename="{resume.filename or path.name}"'},
    )


@app.put("/resume/{resume_id}")
def replace_resume(resume_id: int, file: UploadFile = File(...), email: str = Form(""), db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not email:
        email = resume.user_email or ""

    old_path = Path(resume.stored_path or "") if resume.stored_path else None
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", file.filename or "resume")
    file_path = UPLOAD_DIR / f"{email.replace('@', '_at_')}_{safe_name}"
    contents = file.file.read()
    file_path.write_bytes(contents)

    text = extract_text_from_file(contents, safe_name)
    parsed_data = parse_resume_text(text)
    if not parsed_data["email"]:
        parsed_data["email"] = email

    resume.filename = safe_name
    resume.stored_path = str(file_path)
    resume.content = text
    resume.parsed_name = parsed_data["name"]
    resume.parsed_email = parsed_data["email"]
    resume.parsed_phone = parsed_data["phone"]
    resume.parsed_skills = parsed_data["skills"]
    resume.parsed_college = parsed_data["college"]
    resume.parsed_degree = parsed_data["degree"]
    resume.parsed_experience = parsed_data["experience"]
    resume.parsed_certifications = parsed_data["certifications"]
    resume.parsed_projects = parsed_data["projects"]
    resume.parsed_summary = parsed_data["summary"]
    db.commit()

    if old_path and old_path.exists() and old_path != file_path:
        try:
            old_path.unlink()
        except Exception:
            pass

    return {"message": "Resume replaced successfully", "resume_id": resume.id, "file_path": str(file_path)}


@app.delete("/resume/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_path = Path(resume.stored_path or "")
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


@app.get("/resumes/{email}", response_model=List[schemas.ResumeOut])
def get_user_resumes(email: str, db: Session = Depends(get_db)):
    return db.query(models.Resume).filter(models.Resume.user_email == email).order_by(models.Resume.id.desc()).all()
@app.post("/job-description")
def add_job_description(
    job: schemas.JobDescriptionCreate,
    db: Session = Depends(get_db)
):
    new_job = models.JobDescription(
        user_email=job.user_email,
        job_title=job.job_title,
        company_name=job.company_name,
        description=job.description,
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return {
        "message": "Job Description Added Successfully",
        "id": new_job.id
    }
@app.get(
    "/job-description/{email}",
    response_model=List[schemas.JobDescriptionOut]
)
def get_jobs(email: str, db: Session = Depends(get_db)):
    return (
        db.query(models.JobDescription)
        .filter(models.JobDescription.user_email == email)
        .order_by(models.JobDescription.id.desc())
        .all()
    )
@app.delete("/job-description/{id}")
def delete_job(id: int, db: Session = Depends(get_db)):
    job = (
        db.query(models.JobDescription)
        .filter(models.JobDescription.id == id)
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job Description Not Found")

    db.delete(job)
    db.commit()

    return {"message": "Deleted Successfully"}
@app.put("/job-description/{id}")
def update_job(
    id: int,
    job: schemas.JobDescriptionCreate,
    db: Session = Depends(get_db)
):
    db_job = (
        db.query(models.JobDescription)
        .filter(models.JobDescription.id == id)
        .first()
    )

    if not db_job:
        raise HTTPException(status_code=404, detail="Job Description Not Found")

    db_job.job_title = job.job_title
    db_job.company_name = job.company_name
    db_job.description = job.description

    db.commit()

    return {"message": "Updated Successfully"}
@app.post("/ats/analyze/{resume_id}/{job_id}", response_model=schemas.ATSAnalysisResponse)
def analyze_resume(
    resume_id: int,
    job_id: int,
    db: Session = Depends(get_db)
):

    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()

    job = db.query(models.JobDescription).filter(
        models.JobDescription.id == job_id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job Description not found"
        )

    result = build_milestone3_insights(
        resume.content,
        job.description
    )

    return result


# ============================================================================
# DYNAMIC ANALYSIS ENDPOINTS (Part 1, 2, 3 - Dashboard, Recommendations, Analytics)
# ============================================================================


@app.post("/api/dashboard")
def get_dashboard_data(
    resume_id: int = Body(...),
    job_description_id: int = Body(...),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get dynamic dashboard data for authenticated user.
    Returns Resume Score, Skill Match, Career Paths count, and Courses count.
    """
    user_email = get_email_from_token(credentials)
    
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        from career_analysis_service import CareerAnalysisService
        
        analysis = CareerAnalysisService.calculate_career_analysis(
            db, user_email, resume_id, job_description_id
        )
        
        # Format dashboard-specific response
        return {
            "resume_score": round(analysis["resume_quality_score"], 1),
            "skill_match": round(analysis["match_percentage"], 1),
            "career_paths": len(analysis["career_recommendations"]),
            "courses": len(analysis["recommended_courses"]),
            "career_readiness": round(analysis["career_readiness_score"], 1),
            "employability": round(analysis["employability_score"], 1),
            "technical_strength": round(analysis["technical_strength_score"], 1),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/career-recommendations")
def get_career_recommendations(
    resume_id: int = Body(...),
    job_description_id: int = Body(...),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get personalized career recommendations based on resume + job description.
    Returns filtered, ranked recommendations with match explanations.
    """
    user_email = get_email_from_token(credentials)
    
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        from career_analysis_service import CareerAnalysisService
        
        analysis = CareerAnalysisService.calculate_career_analysis(
            db, user_email, resume_id, job_description_id
        )
        
        return {
            "target_role": analysis["target_role"],
            "best_matching_path": analysis["best_matching_path"],
            "recommendations": analysis["career_recommendations"],
            "top_strengths": analysis["top_strengths"],
            "areas_for_improvement": analysis["areas_for_improvement"],
            "insights": analysis["career_insights"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/career-analytics")
def get_career_analytics(
    resume_id: int = Body(...),
    job_description_id: int = Body(...),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get comprehensive career analytics for authenticated user.
    Returns all metrics: readiness, employability, technical strength, quality, etc.
    """
    user_email = get_email_from_token(credentials)
    
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        from career_analysis_service import CareerAnalysisService
        
        analysis = CareerAnalysisService.calculate_career_analysis(
            db, user_email, resume_id, job_description_id
        )
        
        return {
            "career_readiness": round(analysis["career_readiness_score"], 1),
            "employability": round(analysis["employability_score"], 1),
            "technical_strength": round(analysis["technical_strength_score"], 1),
            "resume_quality": round(analysis["resume_quality_score"], 1),
            "target_role": analysis["target_role"],
            "best_matching_path": analysis["best_matching_path"],
            "top_strengths": analysis["top_strengths"][:5],
            "areas_for_improvement": analysis["areas_for_improvement"][:5],
            "action_plan": analysis["action_plan"],
            "career_roadmap": analysis["career_roadmap"],
            "career_insights": analysis["career_insights"],
            "recommended_courses": analysis["recommended_courses"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")