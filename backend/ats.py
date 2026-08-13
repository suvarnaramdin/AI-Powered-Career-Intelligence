import re
from typing import Any, Dict, List

COMMON_SKILLS = {
    "python": ["python", "pythonic"],
    "java": ["java"],
    "c": ["c"],
    "c++": ["c++", "cpp"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "react": ["react", "reactjs"],
    "angular": ["angular"],
    "vue": ["vue", "vuejs"],
    "node.js": ["node.js", "nodejs", "node js"],
    "express": ["express", "expressjs"],
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "html": ["html"],
    "css": ["css"],
    "mysql": ["mysql"],
    "postgresql": ["postgresql", "postgres"],
    "mongodb": ["mongodb"],
    "git": ["git", "github"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure"],
    "gcp": ["gcp", "google cloud"],
    "rest api": ["rest api", "restful api", "api"],
    "machine learning": ["machine learning", "ml"],
    "deep learning": ["deep learning"],
    "tensorflow": ["tensorflow"],
    "pytorch": ["pytorch"],
    "sql": ["sql"],
    "linux": ["linux", "ubuntu"],
    "data analysis": ["data analysis", "analytics"],
    "testing": ["testing", "pytest", "unit testing"],
}

STOP_WORDS = {
    "the", "and", "for", "with", "from", "that", "this", "have", "has", "work", "working",
    "experience", "skills", "strong", "good", "using", "build", "built", "developer",
    "engineer", "team", "projects", "resume", "job", "description", "description", "company",
    "role", "responsible", "responsibilities", "candidate", "hiring", "application", "applications"
}

SKILL_CATEGORIES = {
    "Frontend": ["react", "javascript", "typescript", "html", "css", "vue", "angular"],
    "Backend": ["python", "fastapi", "django", "flask", "node.js", "express", "java", "c#", "c++"],
    "Database": ["sql", "mysql", "postgresql", "mongodb"],
    "Cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "linux"],
    "Programming": ["python", "javascript", "typescript", "java", "c", "c++", "git", "testing"],
    "Soft Skills": ["communication", "leadership", "problem solving", "teamwork", "agile", "collaboration"],
}

CAREER_ROLE_LIBRARY = [
    {
        "title": "Frontend Developer",
        "match_percentage": 92,
        "reason": "Strong frontend stack alignment with React, JavaScript, and UI-focused experience.",
        "required_skills": ["React", "JavaScript", "HTML", "CSS"],
        "average_salary": "₹8L–₹16L",
        "future_demand": "High",
    },
    {
        "title": "Backend Developer",
        "match_percentage": 88,
        "reason": "Your background aligns well with APIs, server-side logic, and database integration.",
        "required_skills": ["Python", "FastAPI", "SQL", "REST APIs"],
        "average_salary": "₹9L–₹18L",
        "future_demand": "High",
    },
    {
        "title": "Full Stack Developer",
        "match_percentage": 90,
        "reason": "You show combined strengths in frontend and backend development.",
        "required_skills": ["React", "Node.js", "Python", "SQL"],
        "average_salary": "₹10L–₹20L",
        "future_demand": "Very High",
    },
    {
        "title": "Software Engineer",
        "match_percentage": 86,
        "reason": "Good engineering fundamentals and practical implementation experience are present.",
        "required_skills": ["Data Structures", "System Design", "Testing"],
        "average_salary": "₹7L–₹15L",
        "future_demand": "High",
    },
    {
        "title": "Data Analyst",
        "match_percentage": 78,
        "reason": "Analytical thinking and SQL-based work are strong indicators for analytics roles.",
        "required_skills": ["SQL", "Analytics", "Reporting"],
        "average_salary": "₹6L–₹13L",
        "future_demand": "Moderate",
    },
    {
        "title": "Machine Learning Engineer",
        "match_percentage": 74,
        "reason": "Machine learning keywords and practical programming experience support this path.",
        "required_skills": ["Python", "ML", "Data Science"],
        "average_salary": "₹12L–₹25L",
        "future_demand": "High",
    },
    {
        "title": "AI Engineer",
        "match_percentage": 80,
        "reason": "Your profile shows a strong base for AI product engineering and automation work.",
        "required_skills": ["Python", "ML", "APIs"],
        "average_salary": "₹14L–₹30L",
        "future_demand": "Very High",
    },
]

JOB_RECOMMENDATIONS_LIBRARY = [
    {
        "title": "Frontend Engineer",
        "company": "Innovate Labs",
        "location": "Remote",
        "salary": "₹10L–₹18L",
        "required_skills": ["React", "TypeScript", "CSS"],
        "match_percentage": 91,
    },
    {
        "title": "Python Backend Developer",
        "company": "DataForge",
        "location": "Bangalore",
        "salary": "₹9L–₹17L",
        "required_skills": ["Python", "FastAPI", "SQL"],
        "match_percentage": 89,
    },
    {
        "title": "Full Stack Product Engineer",
        "company": "BuildHub",
        "location": "Hyderabad",
        "salary": "₹11L–₹20L",
        "required_skills": ["React", "Node.js", "Python"],
        "match_percentage": 87,
    },
    {
        "title": "Cloud Engineer",
        "company": "CloudVista",
        "location": "Remote",
        "salary": "₹12L–₹22L",
        "required_skills": ["AWS", "Docker", "Kubernetes"],
        "match_percentage": 79,
    },
]

COURSE_RECOMMENDATIONS_LIBRARY = [
    {
        "title": "Python API Development",
        "platform": "Coursera",
        "duration": "4 Weeks",
        "difficulty": "Intermediate",
        "skill_covered": "FastAPI",
        "learning_path": ["Week 1: API basics", "Week 2: FastAPI fundamentals", "Week 3: Database integration", "Week 4: Deployment"],
    },
    {
        "title": "React Mastery",
        "platform": "Udemy",
        "duration": "6 Weeks",
        "difficulty": "Intermediate",
        "skill_covered": "React",
        "learning_path": ["Week 1: Components", "Week 2: State management", "Week 3: Hooks", "Week 4: Routing", "Week 5: Performance", "Week 6: Deployment"],
    },
    {
        "title": "AWS Cloud Foundations",
        "platform": "AWS Skill Builder",
        "duration": "3 Weeks",
        "difficulty": "Beginner",
        "skill_covered": "AWS",
        "learning_path": ["Week 1: Core services", "Week 2: Security", "Week 3: Hands-on labs"],
    },
]


def _normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_skills(text):
    normalized = _normalize_text(text)
    if not normalized:
        return []

    found = set()

    for skill, aliases in COMMON_SKILLS.items():
        for alias in aliases:
            if re.search(r"\b" + re.escape(alias.replace(" ", " ")) + r"\b", normalized):
                found.add(skill)
                break

    tokens = [token for token in normalized.split() if len(token) > 2 and token not in STOP_WORDS]
    for token in tokens:
        for skill in COMMON_SKILLS:
            if token in skill.replace(" ", "") or token in skill.split():
                found.add(skill)
                break

    return sorted(found)


def _classify_skill(skill: str) -> str:
    normalized = _normalize_text(skill)
    if not normalized:
        return "Programming"
    for category, skill_names in SKILL_CATEGORIES.items():
        if any(_normalize_text(name) in normalized or normalized in _normalize_text(name) for name in skill_names):
            return category
    return "Programming"


def build_milestone3_insights(resume_text: str, job_text: str) -> Dict[str, Any]:
    base_result = compare_resume_job(resume_text, job_text)
    resume_skills = base_result["resume_skills"]
    job_skills = base_result["job_skills"]
    matched_skills = base_result["matched_skills"]
    missing_skills = base_result["missing_skills"]

    skill_gap_items = []
    for skill in sorted(set(job_skills) | set(resume_skills)):
        category = "matched" if skill in matched_skills else "missing"
        skill_gap_items.append({
            "skill": skill,
            "category": category,
            "group": _classify_skill(skill),
        })

    skill_gap_percentage = round((len(missing_skills) / max(1, len(job_skills))) * 100) if job_skills else 0

    career_recommendations = []
    for role in CAREER_ROLE_LIBRARY:
        role_match = role["match_percentage"]
        if any(skill in ["react", "javascript", "typescript"] for skill in matched_skills) and "Frontend Developer" in role["title"]:
            role_match += 2
        if any(skill in ["python", "fastapi", "sql", "node.js"] for skill in matched_skills) and "Backend Developer" in role["title"]:
            role_match += 2
        if any(skill in ["python", "react", "sql"] for skill in matched_skills) and "Full Stack Developer" in role["title"]:
            role_match += 2
        if any(skill in ["machine learning", "python"] for skill in matched_skills) and "Machine Learning Engineer" in role["title"]:
            role_match += 2
        role_match = min(99, role_match)
        career_recommendations.append({
            **role,
            "match_percentage": role_match,
        })

    job_recommendations = []
    for job in JOB_RECOMMENDATIONS_LIBRARY:
        if any(skill in ["react", "javascript", "typescript"] for skill in matched_skills) and "Frontend" in job["title"]:
            job["match_percentage"] += 2
        if any(skill in ["python", "fastapi", "sql"] for skill in matched_skills) and "Python Backend" in job["title"]:
            job["match_percentage"] += 2
        if any(skill in ["python", "react"] for skill in matched_skills) and "Full Stack" in job["title"]:
            job["match_percentage"] += 2
        if any(skill in ["aws", "docker", "kubernetes"] for skill in missing_skills) and "Cloud Engineer" in job["title"]:
            job["match_percentage"] += 1
        job_recommendations.append({**job, "match_percentage": min(99, job["match_percentage"])})

    course_recommendations = []
    for course in COURSE_RECOMMENDATIONS_LIBRARY:
        if course["skill_covered"].lower() in [skill.lower() for skill in missing_skills] or course["skill_covered"].lower() in [skill.lower() for skill in matched_skills]:
            course_recommendations.append(course)
    if not course_recommendations:
        course_recommendations = COURSE_RECOMMENDATIONS_LIBRARY[:2]

    missing_keywords = [skill.replace("-", " ").title() for skill in missing_skills[:8]]
    improved_summary = (
        f"A results-oriented developer with experience in {', '.join(matched_skills[:4] or ['software engineering'])} "
        f"and a strong focus on building reliable, scalable applications aligned to the target role."
    )
    weak_sections = [
        "Projects section should include measurable outcomes and business impact.",
        "Add a brief certification section for cloud or modern framework learning.",
        "Highlight collaboration, leadership, or ownership examples in the experience section.",
    ]
    project_suggestions = [
        f"Build a project that demonstrates {missing_skills[0] if missing_skills else 'modern full-stack development'} in a real-world scenario.",
        "Publish a GitHub repo with architecture notes, screenshots, and deployment details.",
    ]
    certification_suggestions = [
        "AWS Cloud Practitioner",
        "Google Data Analytics",
        "Microsoft Azure Fundamentals",
    ]
    achievement_suggestions = [
        "Quantify your impact with metrics such as performance improvements or user growth.",
        "Add one featured project that demonstrates the most relevant missing skill.",
    ]

    return {
        **base_result,
        "skill_gap_percentage": skill_gap_percentage,
        "skill_gap_items": skill_gap_items,
        "career_recommendations": career_recommendations,
        "job_recommendations": job_recommendations,
        "course_recommendations": course_recommendations,
        "resume_improvement": {
            "improved_summary": improved_summary,
            "missing_keywords": missing_keywords,
            "weak_sections": weak_sections,
            "project_suggestions": project_suggestions,
            "certification_suggestions": certification_suggestions,
            "achievement_suggestions": achievement_suggestions,
            "resume_health_score": min(99, max(55, base_result["ats_score"] + 10)),
            "formatting_score": max(70, min(99, base_result["ats_score"] + 5)),
            "keyword_score": base_result["ats_score"],
            "project_score": max(60, min(99, base_result["ats_score"] + 8)),
            "skills_score": max(60, min(99, base_result["match_percentage"] + 5)),
        },
        "analytics": {
            "ats_score": base_result["ats_score"],
            "profile_completion": 82,
            "resume_status": "Ready for targeted review",
            "matching_skills": len(matched_skills),
            "missing_skills": len(missing_skills),
            "career_recommendations_count": len(career_recommendations),
            "recommended_courses_count": len(course_recommendations),
            "recommended_jobs_count": len(job_recommendations),
            "resume_strength": base_result["match_percentage"],
        },
    }


def compare_resume_job(resume_text, job_text):
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_text)

    matched = sorted(list(set(resume_skills) & set(job_skills)))
    missing = sorted(list(set(job_skills) - set(resume_skills)))

    skill_gap_analysis = []
    for skill in sorted(set(job_skills) | set(resume_skills)):
        if skill in matched:
            status = "matched"
            recommendation = "You already highlight this skill in your resume."
        else:
            status = "missing"
            recommendation = f"Add evidence of {skill} through a project, certification, or work example."

        skill_gap_analysis.append({
            "skill": skill,
            "status": status,
            "recommendation": recommendation,
        })

    if not job_skills:
        score = 0
    else:
        score = int((len(matched) / len(job_skills)) * 100)

    strengths = []
    if matched:
        strengths.append(f"Strong alignment with the required skills: {', '.join(matched[:4])}")
    if resume_skills:
        strengths.append(f"Resume highlights practical experience in {', '.join(resume_skills[:4])}")
    if not strengths:
        strengths.append("Resume content is present and can be strengthened with more targeted keywords")

    suggestions = []
    if missing:
        suggestions.extend([f"Add experience with {skill} if you have worked with it." for skill in missing[:4]])
    if score < 60:
        suggestions.append("Improve the resume by matching more keywords from the job description.")
    if score < 80:
        suggestions.append("Add a short project or achievement that demonstrates the missing skills.")
    if not suggestions:
        suggestions.append("Your resume already aligns well with the job description.")

    # Simple career mapping based on skills
    SKILL_TO_CAREERS = {
        "python": ["Backend Developer", "Data Scientist", "Automation Engineer"],
        "javascript": ["Frontend Developer", "Full Stack Developer"],
        "react": ["Frontend Developer", "React Engineer"],
        "node.js": ["Backend Developer", "Full Stack Developer"],
        "machine learning": ["Machine Learning Engineer", "Data Scientist"],
        "data analysis": ["Data Analyst", "Business Analyst"],
        "aws": ["Cloud Engineer", "DevOps Engineer"],
        "docker": ["DevOps Engineer", "Site Reliability Engineer"],
        "kubernetes": ["DevOps Engineer", "Platform Engineer"],
        "sql": ["Data Analyst", "Database Administrator"],
    }

    career_paths = []
    for s in resume_skills:
        if s in SKILL_TO_CAREERS:
            for c in SKILL_TO_CAREERS[s]:
                if c not in career_paths:
                    career_paths.append(c)

    # If matched skills point to careers prefer those
    for s in matched:
        if s in SKILL_TO_CAREERS:
            for c in SKILL_TO_CAREERS[s]:
                if c not in career_paths:
                    career_paths.insert(0, c)

    # Learning resources suggestions for missing skills
    LEARNING_RESOURCES = {
        "python": ["Complete 'Python for Everybody' on Coursera", "Practice projects on Real Python"],
        "javascript": ["Complete 'JavaScript: The Good Parts' book", "Practice on freeCodeCamp"],
        "react": ["Official React docs tutorials", "Build projects on Frontend Mentor"],
        "node.js": ["Node.js crash course videos", "Build APIs with Express"],
        "machine learning": ["Andrew Ng's ML course on Coursera", "Hands-on ML with Scikit-Learn"] ,
        "aws": ["AWS Certified Cloud Practitioner"],
        "docker": ["Docker getting started guide"],
        "kubernetes": ["Kubernetes basics by Google"],
        "sql": ["SQLZoo, Mode SQL tutorials"],
    }

    learning_resources = []
    for s in missing:
        if s in LEARNING_RESOURCES:
            for r in LEARNING_RESOURCES[s]:
                if r not in learning_resources:
                    learning_resources.append(r)

    # Fallback generic recommendations
    if not career_paths:
        career_paths = ["Software Engineer", "Technical Contributor"]
    if not learning_resources:
        learning_resources = ["Improve domain-specific projects and add measurable outcomes to your resume."]

    return {
        "resume_skills": resume_skills,
        "job_skills": job_skills,
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_gap_analysis": skill_gap_analysis,
        "ats_score": score,
        "match_percentage": score,
        "strengths": strengths,
        "suggestions": suggestions,
        "career_paths": career_paths,
        "learning_resources": learning_resources,
    }