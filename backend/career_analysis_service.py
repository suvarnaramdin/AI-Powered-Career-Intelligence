"""
Unified Career Analysis Service
Calculates all career metrics based on actual user data
"""

import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
import models
from ats import (
    extract_skills, 
    SKILL_CATEGORIES,
    compare_resume_job,
    CAREER_ROLE_LIBRARY,
    COURSE_RECOMMENDATIONS_LIBRARY,
)


class CareerAnalysisService:
    """
    Central service for all career analysis calculations.
    Ensures consistent, user-specific analysis across all modules.
    """

    @staticmethod
    def calculate_career_analysis(
        db: Session,
        user_email: str,
        resume_id: int,
        job_description_id: int,
        force_recalculate: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates comprehensive career analysis for user + resume + job.
        Caches results in CareerAnalysis table.
        """
        
        # Check if analysis exists
        cached = db.query(models.CareerAnalysis).filter(
            models.CareerAnalysis.user_email == user_email,
            models.CareerAnalysis.resume_id == resume_id,
            models.CareerAnalysis.job_description_id == job_description_id,
        ).first()

        if cached and not force_recalculate:
            return CareerAnalysisService._format_analysis_response(cached)

        # Fetch resume and job
        resume = db.query(models.Resume).filter(
            models.Resume.id == resume_id,
            models.Resume.user_email == user_email,
        ).first()

        job = db.query(models.JobDescription).filter(
            models.JobDescription.id == job_description_id,
            models.JobDescription.user_email == user_email,
        ).first()

        if not resume or not job:
            raise ValueError("Resume or Job Description not found or not owned by user")

        # Perform analysis
        base_analysis = compare_resume_job(resume.content, job.description)
        
        # Calculate dynamic metrics
        resume_quality = CareerAnalysisService._calculate_resume_quality(
            resume, base_analysis
        )
        
        career_readiness = CareerAnalysisService._calculate_career_readiness(
            base_analysis, resume_quality
        )
        
        employability = CareerAnalysisService._calculate_employability(
            base_analysis, resume_quality
        )
        
        technical_strength = CareerAnalysisService._calculate_technical_strength(
            base_analysis
        )
        
        # Generate personalized recommendations
        career_recommendations = CareerAnalysisService._generate_career_recommendations(
            base_analysis, resume, job
        )
        
        # Generate action plan
        action_plan = CareerAnalysisService._generate_action_plan(
            base_analysis, career_recommendations
        )
        
        # Generate career roadmap
        career_roadmap = CareerAnalysisService._generate_career_roadmap(
            career_recommendations
        )
        
        # Generate personalized insights
        career_insights = CareerAnalysisService._generate_career_insights(
            base_analysis, job
        )
        
        # Get recommended courses
        recommended_courses = CareerAnalysisService._get_recommended_courses(
            base_analysis
        )

        # Determine best matching path
        best_path = (
            career_recommendations[0].get("title", "")
            if career_recommendations
            else "Not Available"
        )

        # Store in database
        if cached:
            # Update existing record
            cached.ats_score = base_analysis.get("ats_score", 0)
            cached.match_percentage = base_analysis.get("match_percentage", 0)
            cached.resume_quality_score = resume_quality
            cached.career_readiness_score = career_readiness
            cached.employability_score = employability
            cached.technical_strength_score = technical_strength
            cached.resume_skills = base_analysis.get("resume_skills", [])
            cached.job_skills = base_analysis.get("job_skills", [])
            cached.matched_skills = base_analysis.get("matched_skills", [])
            cached.missing_skills = base_analysis.get("missing_skills", [])
            cached.top_career_recommendation = (
                career_recommendations[0].get("title", "") if career_recommendations else ""
            )
            cached.career_recommendations = career_recommendations
            cached.target_role = job.job_title
            cached.best_matching_path = best_path
            cached.top_strengths = base_analysis.get("strengths", [])
            cached.areas_for_improvement = base_analysis.get("missing_skills", [])
            cached.action_plan = action_plan
            cached.career_insights = career_insights
            cached.career_roadmap = career_roadmap
            cached.recommended_courses = recommended_courses
            db.commit()
        else:
            # Create new record
            analysis_record = models.CareerAnalysis(
                user_email=user_email,
                resume_id=resume_id,
                job_description_id=job_description_id,
                ats_score=base_analysis.get("ats_score", 0),
                match_percentage=base_analysis.get("match_percentage", 0),
                resume_quality_score=resume_quality,
                career_readiness_score=career_readiness,
                employability_score=employability,
                technical_strength_score=technical_strength,
                resume_skills=base_analysis.get("resume_skills", []),
                job_skills=base_analysis.get("job_skills", []),
                matched_skills=base_analysis.get("matched_skills", []),
                missing_skills=base_analysis.get("missing_skills", []),
                top_career_recommendation=(
                    career_recommendations[0].get("title", "")
                    if career_recommendations
                    else ""
                ),
                career_recommendations=career_recommendations,
                target_role=job.job_title,
                best_matching_path=best_path,
                top_strengths=base_analysis.get("strengths", []),
                areas_for_improvement=base_analysis.get("missing_skills", []),
                action_plan=action_plan,
                career_insights=career_insights,
                career_roadmap=career_roadmap,
                recommended_courses=recommended_courses,
            )
            db.add(analysis_record)
            db.commit()
            db.refresh(analysis_record)

        return CareerAnalysisService._format_analysis_response(analysis_record or cached)

    @staticmethod
    def _calculate_resume_quality(resume: models.Resume, analysis: Dict) -> float:
        """Calculate resume quality score (0-100)"""
        score = 0
        
        # Content completeness
        if resume.parsed_name:
            score += 10
        if resume.parsed_email:
            score += 10
        if resume.parsed_phone:
            score += 5
        if resume.parsed_skills:
            score += 15
        if resume.parsed_experience:
            score += 20
        if resume.parsed_projects:
            score += 15
        if resume.parsed_certifications:
            score += 10
        
        # ATS compatibility (based on match score)
        ats_score = analysis.get("ats_score", 0)
        score += (ats_score * 0.15)
        
        return min(100, score)

    @staticmethod
    def _calculate_career_readiness(analysis: Dict, resume_quality: float) -> float:
        """Calculate career readiness (0-100)"""
        ats_score = analysis.get("ats_score", 0)
        match_percentage = analysis.get("match_percentage", 0)
        
        # Weighted calculation
        readiness = (
            ats_score * 0.25 +
            match_percentage * 0.30 +
            resume_quality * 0.20 +
            (len(analysis.get("matched_skills", [])) * 5) * 0.15 +  # Skill count bonus
            50 * 0.10  # Base score for effort
        )
        
        return min(100, max(0, readiness))

    @staticmethod
    def _calculate_employability(analysis: Dict, resume_quality: float) -> float:
        """Calculate employability score (0-100)"""
        ats_score = analysis.get("ats_score", 0)
        match_percentage = analysis.get("match_percentage", 0)
        
        employability = (
            resume_quality * 0.30 +
            match_percentage * 0.35 +
            ats_score * 0.20 +
            (len(analysis.get("matched_skills", [])) * 5) * 0.15
        )
        
        return min(100, max(0, employability))

    @staticmethod
    def _calculate_technical_strength(analysis: Dict) -> float:
        """Calculate technical strength based on skill depth and relevance"""
        matched_skills = analysis.get("matched_skills", [])
        missing_skills = analysis.get("missing_skills", [])
        total_job_skills = len(analysis.get("job_skills", []))
        
        if total_job_skills == 0:
            return 0
        
        # More matched skills = higher strength
        match_ratio = len(matched_skills) / total_job_skills
        
        # Consider skill complexity (arbitrary scoring)
        skill_depth_score = 0
        for skill in matched_skills:
            skill_lower = skill.lower()
            if any(complex_skill in skill_lower for complex_skill in 
                   ["machine learning", "kubernetes", "docker", "aws", "gcp"]):
                skill_depth_score += 10
            elif any(mid_skill in skill_lower for mid_skill in 
                     ["python", "react", "fastapi", "sql", "node.js"]):
                skill_depth_score += 7
            else:
                skill_depth_score += 5
        
        # Normalize skill depth score
        max_skill_score = len(matched_skills) * 10
        if max_skill_score > 0:
            normalized_skill_score = (skill_depth_score / max_skill_score) * 100
        else:
            normalized_skill_score = 0
        
        # Technical strength is combination of match ratio and skill complexity
        technical_strength = (match_ratio * 100 * 0.6) + (normalized_skill_score * 0.4)
        
        return min(100, max(0, technical_strength))

    @staticmethod
    def _generate_career_recommendations(
        analysis: Dict, 
        resume: models.Resume,
        job: models.JobDescription
    ) -> List[Dict]:
        """
        Generate personalized career recommendations based on actual data.
        Returns list sorted by relevance score.
        """
        matched_skills = set(analysis.get("matched_skills", []))
        resume_skills = set(analysis.get("resume_skills", []))
        job_skills = set(analysis.get("job_skills", []))
        
        recommendations = []
        
        for role in CAREER_ROLE_LIBRARY:
            role_required_skills = set(
                skill.lower() for skill in role.get("required_skills", [])
            )
            
            # Calculate match score for this role
            role_matches = matched_skills & role_required_skills
            role_partial = resume_skills & role_required_skills - matched_skills
            role_missing = role_required_skills - resume_skills
            
            # Dynamic scoring
            match_score = (
                len(role_matches) * 20 +  # Exact matches
                len(role_partial) * 10 +  # Partial matches (have skill from resume)
                (len(role_required_skills) - len(role_missing)) * 5  # Coverage
            )
            
            if role_required_skills:
                match_percentage = (match_score / (len(role_required_skills) * 20)) * 100
            else:
                match_percentage = 0
            
            match_percentage = min(99, max(0, match_percentage))
            
            # Only include if reasonably relevant (>= 60%)
            if match_percentage >= 60:
                # Generate role-specific explanation
                explanation = CareerAnalysisService._generate_role_explanation(
                    role, matched_skills, role_matches, role_missing
                )
                
                recommendations.append({
                    "title": role["title"],
                    "match_percentage": match_percentage,
                    "reason": explanation,
                    "matched_skills": list(role_matches),
                    "missing_skills": list(role_missing),
                    "required_skills": role.get("required_skills", []),
                    "average_salary": role.get("average_salary", "Not Available"),
                    "future_demand": role.get("future_demand", "Moderate"),
                })
        
        # Sort by match percentage descending
        recommendations.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        return recommendations

    @staticmethod
    def _generate_role_explanation(
        role: Dict, 
        matched_skills: set, 
        role_matches: set,
        role_missing: set
    ) -> str:
        """Generate personalized explanation for why a role is recommended"""
        if role_matches:
            matched_str = ", ".join(sorted(list(role_matches))[:3])
            return (
                f"Your resume demonstrates strong {matched_str} experience "
                f"relevant to {role['title']} positions."
            )
        else:
            return (
                f"Your overall technical background and problem-solving skills "
                f"align well with the {role['title']} career path."
            )

    @staticmethod
    def _generate_action_plan(
        analysis: Dict,
        career_recommendations: List[Dict]
    ) -> Dict:
        """Generate personalized action plan based on skill gaps"""
        missing_skills = analysis.get("missing_skills", [])
        matched_skills = analysis.get("matched_skills", [])
        
        # Immediate actions (next 1-2 weeks)
        immediate = []
        if missing_skills:
            top_3_missing = missing_skills[:3]
            immediate.append(
                f"Update your resume to highlight {', '.join(matched_skills[:2] or ['your strongest skills'])} "
                f"and include keywords from {matched_skills[0] or 'the target role'}."
            )
            immediate.append(
                f"Incorporate these key skills from the job description: {', '.join(top_3_missing)}. "
                f"Update your resume with projects or achievements that demonstrate these skills."
            )
        else:
            immediate.append("Your resume already strongly aligns with the target role.")
            immediate.append("Review your resume formatting for ATS compatibility.")
        
        # Short-term actions (1-3 months)
        short_term = []
        if missing_skills:
            top_skill = missing_skills[0] if missing_skills else "relevant technical skills"
            short_term.append(
                f"Complete an online course or certification in {top_skill} to strengthen this key competency."
            )
            if len(missing_skills) > 1:
                short_term.append(
                    f"Build a practical project demonstrating {missing_skills[0]} and {missing_skills[1] if len(missing_skills) > 1 else 'another gap skill'}."
                )
        
        best_role = career_recommendations[0]["title"] if career_recommendations else "your target role"
        short_term.append(
            f"Pursue learning resources aligned with {best_role} to develop expertise."
        )
        
        # Long-term actions (3-12 months)
        long_term = []
        if career_recommendations:
            target = career_recommendations[0]["title"]
            long_term.append(
                f"Work toward becoming a {target} by building a diverse portfolio of projects "
                f"that demonstrate the required skills."
            )
        
        long_term.append(
            "Pursue relevant certifications and professional development in your target domain."
        )
        long_term.append(
            "Network with professionals in your target role and contribute to open-source projects "
            "to build industry credibility."
        )
        
        return {
            "immediate": immediate,
            "short_term": short_term,
            "long_term": long_term,
        }

    @staticmethod
    def _generate_career_roadmap(recommendations: List[Dict]) -> List[Dict]:
        """Generate personalized career growth roadmap"""
        if not recommendations:
            return [
                {"level": "Current", "role": "Skill Development Phase"},
                {"level": "3-6 Months", "role": "Entry-level Position"},
                {"level": "1-2 Years", "role": "Mid-level Position"},
                {"level": "3-5 Years", "role": "Senior Position"},
                {"level": "5+ Years", "role": "Leadership/Architect Role"},
            ]
        
        target_role = recommendations[0]["title"]
        
        # Extract domain from role
        role_lower = target_role.lower()
        if "frontend" in role_lower:
            domain = "Frontend Development"
        elif "backend" in role_lower:
            domain = "Backend Development"
        elif "full stack" in role_lower:
            domain = "Full Stack Development"
        elif "data" in role_lower:
            domain = "Data Science"
        elif "ai" in role_lower or "machine learning" in role_lower:
            domain = "AI/ML Engineering"
        elif "cloud" in role_lower or "devops" in role_lower:
            domain = "Cloud/DevOps Engineering"
        else:
            domain = target_role
        
        return [
            {"level": "Current", "role": "Skill Development & Foundation"},
            {"level": "3-6 Months", "role": f"Junior {domain}"},
            {"level": "1-2 Years", "role": f"{domain} (Mid-level)"},
            {"level": "3-5 Years", "role": f"Senior {domain}"},
            {"level": "5+ Years", "role": f"{domain} Technical Lead/Architect"},
        ]

    @staticmethod
    def _generate_career_insights(analysis: Dict, job: models.JobDescription) -> str:
        """Generate personalized career insights"""
        matched_skills = analysis.get("matched_skills", [])
        missing_skills = analysis.get("missing_skills", [])
        match_percentage = analysis.get("match_percentage", 0)
        job_title = job.job_title
        
        insights = []
        
        # Opening insight
        if match_percentage >= 80:
            insights.append(
                f"Your resume is well-positioned for {job_title} opportunities. "
                f"You have strong alignment with {len(matched_skills)} key required skills."
            )
        elif match_percentage >= 60:
            insights.append(
                f"You have a solid foundation for {job_title} roles. "
                f"You match {match_percentage:.0f}% of the required skills."
            )
        else:
            insights.append(
                f"To be competitive for {job_title} positions, focus on developing "
                f"the high-priority skills where you currently have gaps."
            )
        
        # Strength insight
        if matched_skills:
            top_matched = matched_skills[:3]
            insights.append(
                f"Your strongest areas are {', '.join(top_matched)}. "
                f"Highlight these competencies prominently in your resume and interviews."
            )
        
        # Development insight
        if missing_skills:
            priority_gaps = missing_skills[:3]
            insights.append(
                f"Priority development areas: {', '.join(priority_gaps)}. "
                f"These skills would significantly improve your candidacy for this role."
            )
        
        return " ".join(insights)

    @staticmethod
    def _get_recommended_courses(analysis: Dict) -> List[Dict]:
        """Get course recommendations based on skill gaps"""
        missing_skills = set(analysis.get("missing_skills", []))
        matched_skills = set(analysis.get("matched_skills", []))
        
        if not missing_skills and not matched_skills:
            return []
        
        # Filter courses that match missing skills
        relevant_courses = []
        for course in COURSE_RECOMMENDATIONS_LIBRARY:
            skill_covered = course.get("skill_covered", "").lower()
            
            # Recommend if covers missing skill
            for skill in missing_skills:
                if skill.lower() in skill_covered:
                    relevant_courses.append(course)
                    break
        
        # If no courses found for missing skills, recommend based on matched skills
        if not relevant_courses:
            for course in COURSE_RECOMMENDATIONS_LIBRARY:
                skill_covered = course.get("skill_covered", "").lower()
                for skill in matched_skills:
                    if skill.lower() in skill_covered:
                        relevant_courses.append(course)
                        break
        
        # Return top 5 courses
        return relevant_courses[:5] if relevant_courses else COURSE_RECOMMENDATIONS_LIBRARY[:3]

    @staticmethod
    def _format_analysis_response(analysis_record: models.CareerAnalysis) -> Dict:
        """Format CareerAnalysis database record for API response"""
        return {
            "id": analysis_record.id,
            "user_email": analysis_record.user_email,
            "resume_id": analysis_record.resume_id,
            "job_description_id": analysis_record.job_description_id,
            "ats_score": analysis_record.ats_score,
            "match_percentage": analysis_record.match_percentage,
            "resume_quality_score": analysis_record.resume_quality_score,
            "career_readiness_score": analysis_record.career_readiness_score,
            "employability_score": analysis_record.employability_score,
            "technical_strength_score": analysis_record.technical_strength_score,
            "resume_skills": analysis_record.resume_skills,
            "job_skills": analysis_record.job_skills,
            "matched_skills": analysis_record.matched_skills,
            "missing_skills": analysis_record.missing_skills,
            "top_career_recommendation": analysis_record.top_career_recommendation,
            "career_recommendations": analysis_record.career_recommendations,
            "target_role": analysis_record.target_role,
            "best_matching_path": analysis_record.best_matching_path,
            "top_strengths": analysis_record.top_strengths,
            "areas_for_improvement": analysis_record.areas_for_improvement,
            "action_plan": analysis_record.action_plan,
            "career_insights": analysis_record.career_insights,
            "career_roadmap": analysis_record.career_roadmap,
            "recommended_courses": analysis_record.recommended_courses,
        }
