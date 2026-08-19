"""Seed realistic, question-specific interview preparation content."""
import json
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
    "HR / Behavioral Round": "teamwork, strengths, conflict, failure, adaptability, ethics, and work pressure",
    "Managerial Round": "leadership, ownership, prioritization, accountability, deadlines, decision-making, and communication with managers",
    "Group Discussion": "technology, AI, education, social media, environment, employment, business, and workplace discussion",
    "Communication / JAM Round": "impromptu speaking, public speaking, self-introduction, and workplace communication",
    "Case Study / Situational Round": "problem solving, analytical thinking, customer scenarios, business situations, teamwork, and decisions",
    "Managerial + Technical Combined Round": "technical knowledge, project experience, leadership, problem solving, decisions, and communication",
    "Final HR / Offer Discussion": "career expectations, joining availability, location, relocation, growth, role expectations, and professional goals",
}

HR_QUESTIONS = [
    ("Tell me about yourself.", "I am a Computer Science student with a foundation in programming and web development. Through academic projects, I have practiced building features, debugging issues, and explaining technical decisions. I am now looking for a fresher role where I can contribute to real products while learning from an experienced team.", "The interviewer is checking whether you can give a focused introduction connected to the role, rather than repeating your entire resume.", ["education", "relevant skills", "projects or internship", "career direction"], "Listing every personal detail or reciting the resume word for word."),
    ("Walk me through your resume.", "I would start with my education, then highlight the skills most relevant to this role. After that I would explain my strongest project, the problem it solved, my contribution, and what I learned. I would finish with any internship or achievement that shows I am ready to learn in a professional environment.", "The interviewer wants a clear story linking your background to the job requirements.", ["follow the resume order", "prioritize relevant work", "explain your contribution", "connect experience to the role"], "Mentioning technologies without explaining how you used them."),
    ("Why should we hire you?", "I have a solid foundation in programming and I am comfortable learning tools that a project requires. In my projects, I have practiced breaking problems into smaller tasks, debugging issues, and working with teammates. As a fresher, I bring curiosity, consistency, and the ability to accept feedback and turn it into better work.", "The interviewer is evaluating the value you can bring now and your potential to grow, not looking for exaggerated claims.", ["relevant skills", "evidence from projects", "learning ability", "team contribution"], "Using only adjectives such as hardworking without evidence."),
    ("What are your strengths?", "My main strengths are structured problem-solving, patience while debugging, and clear communication. For example, when a project feature did not work as expected, I reproduced the issue, checked the inputs step by step, and explained the fix to my teammates instead of guessing. These strengths help me make steady progress while working with others.", "The interviewer wants strengths that matter for the role and a short example that makes them believable.", ["choose two or three strengths", "give evidence", "keep them role-relevant", "show self-awareness"], "Calling every desirable trait a strength without an example."),
    ("What is one weakness you are working on?", "I used to spend too long perfecting an initial solution before sharing it. I am improving by setting a time limit for the first version, asking for feedback earlier, and then iterating. That approach helps me maintain quality without delaying the team.", "The interviewer is looking for honest self-awareness and a practical improvement habit.", ["name a manageable weakness", "explain its impact", "show a concrete action", "describe progress"], "Giving a disguised strength or claiming to have no weaknesses."),
    ("Why do you want to join our company?", "I am interested in this role because it matches my foundation in software development and gives me the chance to work on real users' problems. I also value the opportunity to learn from a team that follows professional development practices. I would research the company's product and mention one specific part that genuinely interests me.", "The interviewer wants evidence that you understand the role and company and are not applying only for salary or job security.", ["mention the product or domain", "connect the role to your skills", "show realistic motivation", "avoid unsupported praise"], "Giving the same company-independent answer to every employer."),
    ("Where do you see yourself in five years?", "In five years, I want to be a dependable software engineer who can own features from understanding the requirement through testing and release. I expect to deepen my technical skills first, then take more responsibility for design and mentoring as I gain experience. My immediate focus is building a strong foundation and delivering consistently.", "The interviewer is checking whether your expectations are realistic and compatible with the role's growth path.", ["show a learning path", "focus on contribution", "be realistic for a fresher", "avoid rigid titles"], "Promising an exact title or promotion timeline."),
    ("Why did you choose Computer Science?", "I chose Computer Science because I enjoy understanding how a problem can be broken into logical steps and turned into something useful. Coursework gave me the fundamentals, while projects showed me that building software also requires testing, communication, and persistence. That combination is what makes the field interesting to me.", "The interviewer is assessing genuine interest and whether your choice is supported by experience.", ["give a personal reason", "mention learning or projects", "show realistic interest", "connect to the role"], "Saying only that the field has many jobs."),
    ("Tell me about a challenge you faced.", "During an academic project, an integration worked in one environment but failed after deployment. I first reproduced the issue and compared configuration and request logs instead of changing random code. I found a missing environment setting, documented it, and added a basic deployment checklist so the team would catch it earlier.", "The interviewer is evaluating ownership, problem-solving, and how calmly you respond when work does not go as planned.", ["describe the situation", "explain your personal action", "show the result", "state the lesson"], "Blaming a teammate or describing a challenge without your action."),
    ("Tell me about a time you received criticism.", "A teammate once pointed out that my explanation of a feature was difficult to follow. I asked which parts were unclear, reorganized the explanation around the user flow, and used a small example. The next review was easier to follow, and I now ask for feedback before finalizing important documentation.", "The interviewer is checking maturity, listening, and whether feedback changes your behavior.", ["accept feedback", "avoid defensiveness", "take a specific action", "show improvement"], "Arguing that the criticism was completely wrong."),
]

PROJECT_QUESTIONS = [
    ("Explain your project.", "My project is a web application that solves [state the user problem]. It uses [mention your technologies] to provide [main outcome]. I was responsible for [your contribution], including [one concrete feature]. The main challenge was [challenge], which I addressed by [action]. If I continued it, I would improve [future enhancement].", "The interviewer wants a structured explanation showing that you understand both the product problem and your own technical contribution.", ["problem", "solution", "technologies", "your contribution", "challenge and result"], "Describing the whole team project as if you built every part."),
    ("What problem does your project solve?", "The project addresses [specific user problem], which otherwise causes [practical difficulty]. We designed it so users can [main action] more easily and receive [result]. We validated the idea through [testing, feedback, or a small demonstration], and that helped us focus on the features that mattered most.", "The interviewer is checking whether you built for a real need rather than selecting technologies first.", ["identify the user", "state the pain point", "explain the outcome", "mention validation"], "Starting with a list of frameworks instead of the problem."),
    ("Why did you choose this technology?", "I chose [technology] because its strengths matched the project requirement. For example, [specific reason such as component reuse, library support, or relational queries] helped us implement [feature]. I also considered [alternative], but selected the final option because of [trade-off].", "The interviewer expects a reasoned trade-off, not a claim that the technology is universally best.", ["tie choice to a requirement", "mention an alternative", "explain one trade-off", "be honest about familiarity"], "Choosing a tool only because it is popular."),
    ("What was your contribution to the project?", "My main contribution was [specific module or feature]. I clarified the inputs, implemented the core flow, tested normal and edge cases, and coordinated with teammates when my changes affected their work. I can explain the code and decisions in that area in detail, while being clear about which parts were completed by others.", "The interviewer is testing ownership and honesty about individual contribution.", ["name a concrete feature", "explain decisions", "mention testing", "separate your work from team work"], "Claiming ownership of work you cannot explain."),
    ("What was the hardest part of the project?", "The hardest part was [specific challenge], because [technical reason]. I broke it into smaller tests, checked the failing assumptions, and changed [implementation or design choice]. The result was [measurable or observable improvement], and I learned to verify the data flow before optimizing the code.", "The interviewer wants to hear how you reason through difficulty, not just that the project was challenging.", ["name the technical difficulty", "show investigation", "explain the solution", "state the lesson"], "Calling a routine task the hardest part without details."),
    ("How did you debug problems in the project?", "I start by reproducing the issue consistently and recording the input and expected behavior. Then I narrow the failing layer using logs, small test cases, and the debugger. After making a focused fix, I rerun the failing case and related regression tests. This keeps me from changing several things at once and losing the cause.", "The interviewer is evaluating whether your debugging process is systematic and repeatable.", ["reproduce", "isolate", "inspect evidence", "fix narrowly", "regression test"], "Changing code randomly until the symptom disappears."),
    ("How would you scale your project?", "I would first measure the current bottleneck instead of assuming the database or server is the problem. Depending on the evidence, I would add indexes for proven query issues, paginate large responses, cache stable reads, and run more application instances behind a load balancer. I would also add monitoring so scaling changes can be evaluated safely.", "The interviewer is checking whether you understand measurement, bottlenecks, and incremental design.", ["measure first", "database efficiency", "pagination or caching", "horizontal scaling", "monitoring"], "Saying only that you would add more servers."),
    ("What would you improve if you had more time?", "I would prioritize improvements based on user impact. My first choices would be stronger automated tests around [risky area], better validation and error messages, and monitoring for failures. I would avoid adding features before making the existing workflow reliable and easy to maintain.", "The interviewer is evaluating prioritization and whether you can distinguish valuable improvements from feature accumulation.", ["prioritize by impact", "improve reliability", "add tests", "improve observability"], "Listing unrelated features without explaining their value."),
    ("How did you test the project?", "I tested the main success paths first, then added cases for empty input, invalid values, missing records, and permission boundaries. For the API, I checked both status codes and response content. I also performed a manual end-to-end check after integration because unit tests alone do not prove that all layers are connected correctly.", "The interviewer wants evidence that quality was considered beyond a happy-path demonstration.", ["happy path", "edge cases", "API assertions", "integration check", "security boundaries"], "Saying that testing was only opening the application once."),
    ("How is your project different from existing solutions?", "The difference is [specific user or workflow advantage], not simply the technology stack. We focused on [design choice] because it reduced [user difficulty or process time]. I would support that claim with a small comparison or user feedback rather than saying the project is unique without evidence.", "The interviewer is checking product understanding and whether you can make a defensible comparison.", ["state a specific difference", "connect to user value", "avoid exaggerated claims", "use evidence"], "Calling the project unique just because it uses a newer framework."),
]

SPECIAL_QUESTIONS = {
    "HR / Behavioral Round": HR_QUESTIONS,
    "Project Discussion Round": PROJECT_QUESTIONS,
}

GUIDANCE = {
    topic: f"the {topic.lower()} of the concept, its purpose, and a small example relevant to {category.lower()}"
    for category in CATEGORIES.values() for topic in TOPICS
}


def _fallback_record(category, number, topic, description):
    question = f"How would you discuss {topic.lower()} in a {category.lower()} interview?"
    guidance = GUIDANCE[topic]
    answer = f"For a {category} question, I would begin with {guidance}. I would then explain the decision or process in simple steps and give a small example rather than only quoting a definition. For a fresher-level answer, I would be honest about what I have practiced and mention one edge case or trade-off when it is relevant."
    expectation = f"The interviewer is checking whether you understand {topic.lower()} in the context of {category.lower()} and can explain it clearly without memorized jargon."
    points = [f"define {topic.lower()}", "connect it to the round", "give a simple example", "mention a limitation or check"]
    mistake = f"Do not give a definition of {topic.lower()} without explaining when it matters or how you would verify it."
    return question, answer, expectation, points, mistake


def make_record(category, number, topic, description):
    special_questions = SPECIAL_QUESTIONS.get(category, [])
    if number <= len(special_questions):
        question, answer, expectation, points, mistake = special_questions[number - 1]
    else:
        question, answer, expectation, points, mistake = _fallback_record(category, number, topic, description)
    difficulty = ("Beginner", "Intermediate", "Advanced")[(number - 1) % 3]
    return {
        "category": category,
        "subcategory": topic,
        "question": question,
        "answer": answer,
        "explanation": expectation,
        "interviewer_expectation": expectation,
        "key_points": json.dumps(points),
        "common_mistake": mistake,
        "difficulty": difficulty,
        "tags": ", ".join((category, topic, "fresher", "placement")),
        "code_example": None,
        "expected_output": None,
        "tips": "Keep the answer truthful, speak in your own words, and adapt the example to your actual background.",
        "is_active": 1,
    }


def _validate_records(records):
    questions = set()
    answers = set()
    for record in records:
        question_key = " ".join(record["question"].lower().split())
        answer_key = " ".join(record["answer"].lower().split())
        if not question_key or not record["answer"].strip() or not record["interviewer_expectation"].strip():
            raise ValueError(f"Incomplete interview record: {record['question']}")
        if question_key in questions:
            raise ValueError(f"Duplicate interview question: {record['question']}")
        if answer_key in answers:
            raise ValueError(f"Duplicate interview answer: {record['question']}")
        questions.add(question_key)
        answers.add(answer_key)


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        records = [
            make_record(category, number, topic, description)
            for category, description in CATEGORIES.items()
            for number, topic in enumerate(TOPICS, start=1)
        ]
        _validate_records(records)

        # Legacy generated rows have no creator. Deactivate them so old generic
        # answers cannot remain visible, while preserving user bookmarks/history.
        db.query(models.InterviewQuestion).filter(models.InterviewQuestion.created_by.is_(None)).update({"is_active": 0}, synchronize_session=False)
        for record in records:
            existing = db.query(models.InterviewQuestion).filter(
                models.InterviewQuestion.category == record["category"],
                models.InterviewQuestion.question == record["question"],
            ).first()
            if existing is None:
                db.add(models.InterviewQuestion(**record))
            else:
                for field, value in record.items():
                    setattr(existing, field, value)
        db.commit()
        print(f"Seeded {len(records)} interview questions with question-specific answers.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
