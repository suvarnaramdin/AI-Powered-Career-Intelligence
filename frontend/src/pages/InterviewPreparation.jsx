import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaArrowRight, FaChevronRight, FaRegLightbulb } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import InsightLayout from "../components/InsightLayout";

const API = API_BASE_URL;
const roundDescriptions = {
  "Technical Fundamentals": "Programming, OOP, DBMS, operating systems, networking, Git, cloud, and security.",
  "Programming / Coding Round": "Coding, data structures, algorithms, debugging, complexity, and edge cases.",
  "SQL / Database Round": "Queries, joins, normalization, indexes, transactions, and database design.",
  "Core Computer Science Round": "Operating systems, networks, HTTP, APIs, and software engineering basics.",
  "Project Discussion Round": "Your project problem, design, contribution, challenges, and results.",
  "Resume-Based Interview": "Questions based on the skills, education, and experience on your resume.",
  "HR / Behavioral Round": "Introduction, motivation, teamwork, strengths, conflict, and work style.",
  "Managerial Round": "Ownership, prioritization, leadership, accountability, and decisions.",
  "Group Discussion": "Discussion topics and clear, balanced professional communication.",
  "Communication / JAM Round": "Impromptu speaking and workplace communication practice.",
  "Online Assessment / Aptitude": "Frequently repeated aptitude and assessment questions.",
};

export default function InterviewPreparation() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    axios.get(`${API}/api/interview/categories`)
      .then((response) => setCategories(response.data || []))
      .catch(() => setError("Unable to load interview rounds."));
  }, []);

  const selectRound = async (category) => {
    setSelectedCategory(category);
    setQuestions([]);
    setCurrentIndex(0);
    setShowAnswer(false);
    setPracticeAnswer("");
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API}/api/interview/questions`, {
        params: { category, page: 1, page_size: 50, include_answers: true },
      });
      setQuestions(response.data.items || []);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load questions for this round.");
    } finally {
      setLoading(false);
    }
  };

  const moveToQuestion = (index) => {
    setCurrentIndex(index);
    setShowAnswer(false);
    setPracticeAnswer("");
  };

  const recordPractice = async () => {
    if (!currentQuestion) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(`${API}/api/interview/questions/${currentQuestion.id}/practice`, {
        answer_submitted: practiceAnswer,
        completed: true,
      });
      setShowAnswer(true);
    } catch (saveError) {
      setError(saveError.response?.data?.detail || "Unable to record this practice attempt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <InsightLayout title="Interview Preparation" subtitle="Choose a round, answer one question at a time, and compare your response with professional guidance.">
      <div className="space-y-6">
        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Round-wise preparation</p>
          <h1 className="mt-2 text-2xl font-bold">Prepare like you are in the interview.</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Select a round to practice up to 50 questions. Every answer, expectation, and mistake is stored against its question ID.</p>
        </section>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!selectedCategory ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((item) => (
              <button type="button" key={item.category} onClick={() => selectRound(item.category)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md">
                <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-900">{item.category}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{roundDescriptions[item.category] || "Practice the questions most often asked in this interview round."}</p></div><FaChevronRight className="mt-1 shrink-0 text-slate-300 transition group-hover:text-cyan-500" /></div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cyan-700">{Math.min(item.count, 50)} questions available</p>
              </button>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button type="button" onClick={() => { setSelectedCategory(""); setQuestions([]); setCurrentIndex(0); }} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><FaArrowLeft /> All interview rounds</button>
            <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">{selectedCategory}</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Question {questions.length ? currentIndex + 1 : 0} of {questions.length || 50}</h2></div>{questions.length ? <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div> : null}</div>

            {loading ? <div className="mt-5 h-96 animate-pulse rounded-xl bg-slate-100" /> : !currentQuestion ? <p className="py-10 text-sm text-slate-500">No questions are available for this round yet.</p> : <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <article className="rounded-xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><h3 className="text-xl font-bold leading-8 text-slate-900">{currentQuestion.question}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{currentQuestion.difficulty}</span></div><textarea value={practiceAnswer} onChange={(event) => setPracticeAnswer(event.target.value)} rows={6} placeholder="Write how you would answer in the interview..." className="mt-5 w-full rounded-xl border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-cyan-500" />{showAnswer ? <div className="mt-5 space-y-5"><div className="rounded-xl bg-cyan-50 p-4 text-sm leading-7 text-slate-700"><h4 className="font-bold text-cyan-900">Sample professional answer</h4><p className="mt-2">{currentQuestion.answer}</p></div><div><h4 className="font-bold text-slate-900">What the interviewer is evaluating</h4><p className="mt-2 text-sm leading-6 text-slate-600">{currentQuestion.interviewer_expectation || currentQuestion.explanation}</p></div><div><h4 className="font-bold text-slate-900">Key points to include</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">{(currentQuestion.key_points || []).map((point) => <li key={point}>{point}</li>)}</ul></div><div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Common mistake:</strong> {currentQuestion.common_mistake}</div>{currentQuestion.tips ? <p className="text-sm leading-6 text-slate-500"><strong className="text-slate-700">Interview tip:</strong> {currentQuestion.tips}</p> : null}</div> : <p className="mt-4 text-sm text-slate-500">Take a moment to answer aloud or write your response before revealing the sample guidance.</p>}<div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={recordPractice} disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : showAnswer ? "Save practice again" : "Reveal sample answer"}</button>{!showAnswer ? <button type="button" onClick={() => setShowAnswer(true)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Reveal without saving</button> : null}</div></article>
              <aside className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold text-slate-900">Question navigation</h3><div className="mt-4 grid grid-cols-5 gap-2">{questions.map((item, index) => <button type="button" key={item.id} onClick={() => moveToQuestion(index)} aria-label={`Open question ${index + 1}`} className={`h-9 rounded-lg text-sm font-semibold ${index === currentIndex ? "bg-cyan-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-cyan-400"}`}>{index + 1}</button>)}</div><div className="mt-5 flex justify-between gap-2"><button type="button" disabled={currentIndex === 0} onClick={() => moveToQuestion(currentIndex - 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"><FaArrowLeft /> Previous</button><button type="button" disabled={currentIndex === questions.length - 1} onClick={() => moveToQuestion(currentIndex + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next <FaArrowRight /></button></div></aside>
            </div>}
          </section>
        )}
      </div>
    </InsightLayout>
  );
}
