from ats import build_milestone3_insights


def test_build_milestone3_insights_contains_recommendations_and_scores():
    resume_text = "I have strong experience with Python, FastAPI, React, and SQL in production apps."
    job_text = "We need a full stack developer with Python, FastAPI, React, AWS, and SQL experience."

    result = build_milestone3_insights(resume_text, job_text)

    assert result["ats_score"] >= 0
    assert result["match_percentage"] >= 0
    assert result["skill_gap_percentage"] >= 0
    assert any(item["title"] == "Full Stack Developer" for item in result["career_recommendations"])
    assert any(item["title"] == "Python API Development" for item in result["course_recommendations"])
    assert any(item["category"] == "missing" for item in result["skill_gap_items"])
    assert any(item["category"] == "matched" for item in result["skill_gap_items"])
