from ats import compare_resume_job


def test_compare_resume_job_extracts_dynamic_skills_from_text():
    resume_text = "I have strong experience with TypeScript, React, and Node.js in production apps."
    job_text = "We are hiring a frontend engineer with TypeScript, React, and Express experience."

    result = compare_resume_job(resume_text, job_text)

    assert "typescript" in result["matched_skills"]
    assert "react" in result["matched_skills"]
    assert "express" in result["missing_skills"] or "express" in result["matched_skills"]
    assert result["ats_score"] >= 0
    assert "skill_gap_analysis" in result
    assert any(item["skill"] == "express" and item["status"] == "missing" for item in result["skill_gap_analysis"])
    assert any(item["skill"] == "react" and item["status"] == "matched" for item in result["skill_gap_analysis"])
