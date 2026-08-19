import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaChevronRight, FaRegLightbulb } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import InsightLayout from "../components/InsightLayout";

const API = API_BASE_URL;

const roundDescriptions = {
  "Technical Fundamentals": "Core concepts in computer science, systems, and web technology.",
  "Programming / Coding Round": "Frequently asked coding, data structure, and algorithm questions.",
  "SQL / Database Round": "Queries, joins, database design, and transaction fundamentals.",
  "Core Computer Science Round": "Operating systems, networks, APIs, and software engineering basics.",
  "Project Discussion Round": "Questions about your projects, decisions, architecture, and results.",
  "Resume-Based Interview": "Questions based on the skills, education, and experience on your resume.",
  "HR / Behavioral Round": "Common questions about teamwork, strengths, conflict, and work style.",
  "Managerial Round": "Ownership, prioritization, leadership, and decision-making questions.",
  "Group Discussion": "Discussion topics and ways to communicate a clear, balanced viewpoint.",
  "Communication / JAM Round": "Impromptu speaking and workplace communication practice.",
  "Online Assessment / Aptitude": "Frequently repeated aptitude and assessment questions.",
};

export default function InterviewPreparation() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/interview/categories`)
      .then((response) => setCategories(response.data || []))
      .catch(() => setError("Unable to load interview rounds."));
  }, []);

  const selectRound = async (category) => {
    setSelectedCategory(category);
    setQuestions([]);
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

  return (
    <InsightLayout title="Interview Preparation" subtitle="Choose an interview round to practice the 50 most repeated questions with simple answers.">
      <div className="space-y-6">
        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Round-wise preparation</p>
          <h1 className="mt-2 text-2xl font-bold">What round are you preparing for?</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Select a round below. You will get up to 50 commonly repeated questions and their interview-ready answers.</p>
        </section>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!selectedCategory ? (
          <section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((item) => (
                <button type="button" key={item.category} onClick={() => selectRound(item.category)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div><h2 className="font-bold text-slate-900">{item.category}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{roundDescriptions[item.category] || "Practice the questions most often asked in this interview round."}</p></div>
                    <FaChevronRight className="mt-1 shrink-0 text-slate-300 transition group-hover:text-cyan-500" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cyan-700">{Math.min(item.count, 50)} questions available</p>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button type="button" onClick={() => { setSelectedCategory(""); setQuestions([]); }} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><FaArrowLeft /> All interview rounds</button>
            <div className="mt-5 border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Selected round</p><h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedCategory}</h2><p className="mt-2 text-sm text-slate-500">Top {questions.length || 50} repeated questions with concise answers.</p></div>
            {loading ? <div className="space-y-4 pt-5">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}</div> : questions.length === 0 ? <p className="pt-5 text-sm text-slate-500">No questions are available for this round yet.</p> : <div className="space-y-4 pt-5">{questions.map((item, index) => <article key={item.id} className="rounded-xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold leading-6 text-slate-900">{index + 1}. {item.question}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.difficulty}</span></div><div className="mt-4 rounded-lg bg-cyan-50 p-4 text-sm leading-6 text-slate-700"><p className="font-semibold text-cyan-900"><FaRegLightbulb className="mr-2 inline" />Answer</p><p className="mt-1">{item.answer}</p></div>{item.explanation ? <p className="mt-3 text-sm leading-6 text-slate-500"><strong className="text-slate-700">Why it matters:</strong> {item.explanation}</p> : null}</article>)}</div>}
          </section>
        )}
      </div>
    </InsightLayout>
  );
}
