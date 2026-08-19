"""Seed the interview question bank without deleting existing records.

Run from the repository root:
    .venv\\Scripts\\python.exe backend\\seed_interview_questions.py
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

import models
from database import SessionLocal, engine

TOPICS = [
    "Core definition", "Common example", "When to use it", "Common mistake", "Trade-off", "Step-by-step approach", "How to explain it to an interviewer", "Edge case", "Debugging approach", "Testing strategy",
    "Performance impact", "Security consideration", "Scalability consideration", "Compare two alternatives", "Real-world application", "Input validation", "Failure handling", "Maintainability", "Team collaboration", "Production readiness",
    "Beginner exercise", "Intermediate exercise", "Advanced follow-up", "Frequently asked variation", "Short answer practice", "Explain your reasoning", "What changes if constraints grow", "What would you monitor", "How would you improve it", "What would you document",
    "Common interview trap", "Give a counterexample", "Derive the result", "Estimate the complexity", "Choose suitable data", "Discuss assumptions", "Walk through a sample", "Identify risks", "Suggest an alternative", "Summarize in one minute",
    "Question an interviewer may ask next", "How to communicate uncertainty", "How to verify the answer", "What beginners misunderstand", "Practical checklist", "Role of documentation", "Role of automation", "Career relevance", "Placement-focused scenario", "Final revision prompt",
]

CATEGORIES = {
    "Online Assessment / Aptitude": "quantitative aptitude, logical reasoning, data interpretation, probability, and analytical reasoning",
    "Verbal Ability / Communication": "grammar, vocabulary, reading comprehension, sentence correction, and professional English",
    "Technical Fundamentals": "programming, OOP, data structures, DBMS, operating systems, networking, Git, cloud, and security",
    "Programming / Coding Round": "coding with arrays, strings, linked lists, stacks, queues, trees, hashing, recursion, sorting, and dynamic programming",
    "SQL / Database Round": "SQL querying, joins, aggregation, normalization, indexes, transactions, constraints, and database design",
    "Core Computer Science Round": "operating systems, processes, threads, deadlocks, memory, networks, HTTP, DNS, APIs, and client-server systems",
    "Project Discussion Round": "honest project explanation, architecture, database design, APIs, security, testing, deployment, and teamwork",
    "Resume-Based Interview": "answering from your own education, skills, projects, internships, certifications, and achievements without fabrication",
    "HR / Behavioral Round": "STAR-based behavioral answers about teamwork, strengths, conflict, failure, adaptability, ethics, and work pressure",
    "Managerial Round": "leadership, ownership, prioritization, accountability, deadlines, decision-making, and communication with managers",
    "Group Discussion": "technology, AI, education, social media, environment, employment, business, and workplace discussion topics",
    "Communication / JAM Round": "Just A Minute, impromptu speaking, public speaking, self-introduction, and workplace communication",
    "Case Study / Situational Round": "problem solving, analytical thinking, customer scenarios, business situations, teamwork, and decisions",
    "Managerial + Technical Combined Round": "technical knowledge, project experience, leadership, problem solving, decisions, and communication",
    "Final HR / Offer Discussion": "career expectations, joining availability, location, relocation, growth, role expectations, and professional goals",
}


def make_record(category, topic_number, topic, description):
    difficulty = ("Beginner", "Intermediate", "Advanced")[(topic_number - 1) % 3]
    question = f"{topic_number}. {topic}: What should a fresher know about {topic.lower()} in {category.lower()}?"
    answer = (
        f"Give a clear, honest answer focused on {description}. Define the idea first, explain the reasoning or steps, "
        "then connect it to a small placement-oriented example. State assumptions instead of guessing."
    )
    explanation = (
        f"Interviewers use this prompt to check whether you can communicate {topic.lower()} clearly in the context of "
        f"{category.lower()}. A strong response is structured, concise, and supported by an example."
    )
    tips = "Think aloud, verify assumptions, and mention a trade-off or edge case when relevant. Never claim experience you do not have."
    code_example = None
    expected_output = None
    if category == "Programming / Coding Round":
        code_example = "# Explain the approach first, then write a small tested Python solution.\n# Include input validation and state the complexity."
        expected_output = "Walk through one normal case and one edge case."
    if category == "SQL / Database Round":
        code_example = "SELECT category, COUNT(*) AS question_count\nFROM interview_questions\nWHERE is_active = 1\nGROUP BY category;"
        expected_output = "One row per active category with its question count."
    if category in {"HR / Behavioral Round", "Managerial Round", "Project Discussion Round", "Resume-Based Interview", "Final HR / Offer Discussion"}:
        answer += " For experience-based questions, use Situation, Task, Action, Result and keep every detail truthful to your own background."
    if category in {"Group Discussion", "Communication / JAM Round"}:
        answer += " A useful structure is opening point, two supporting reasons, balanced counterpoint, and a concise conclusion."
    return {
        "category": category,
        "subcategory": topic,
        "question": question,
        "answer": answer,
        "explanation": explanation,
        "difficulty": difficulty,
        "tags": ", ".join((category, topic, "fresher", "placement")),
        "code_example": code_example,
        "expected_output": expected_output,
        "tips": tips,
        "is_active": 1,
    }


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    inserted = 0
    try:
        for category, description in CATEGORIES.items():
            for number, topic in enumerate(TOPICS, start=1):
                record = make_record(category, number, topic, description)
                exists = db.query(models.InterviewQuestion.id).filter(
                    models.InterviewQuestion.category == record["category"],
                    models.InterviewQuestion.question == record["question"],
                ).first()
                if exists:
                    continue
                db.add(models.InterviewQuestion(**record))
                inserted += 1
        db.commit()
        print(f"Inserted {inserted} interview questions.")
        print(f"Question bank target: {len(CATEGORIES) * len(TOPICS)} records across {len(CATEGORIES)} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
