import { useEffect, useState } from "react";
import axios from "axios";
import { FaBookmark, FaCommentDots, FaSearch, FaStar } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import InsightLayout from "../components/InsightLayout";

const API = API_BASE_URL;
const quickCategories = ["Technical Fundamentals", "HR / Behavioral Round", "SQL / Database Round", "Programming / Coding Round", "Project Discussion Round", "Resume-Based Interview", "Managerial Round", "Group Discussion", "Online Assessment / Aptitude"];

export default function InterviewPreparation() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [questions, setQuestions] = useState({ items: [], total: 0, total_pages: 1 });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState("");

  const loadCategories = async () => {
    const response = await axios.get(`${API}/api/interview/categories`);
    setCategories(response.data || []);
  };

  const loadQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "12" });
      if (selectedCategory) params.set("category", selectedCategory);
      if (search.trim()) params.set("search", search.trim());
      const response = savedOnly ? await axios.get(`${API}/api/interview/bookmarks?page=${page}&page_size=12`) : await axios.get(`${API}/api/interview/questions?${params.toString()}`);
      setQuestions(response.data);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load interview questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories().catch(() => setError("Unable to load interview categories.")); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadQuestions(); }, [selectedCategory, search, page, savedOnly]);

  const openQuestion = async (question) => {
    try {
      const response = await axios.get(`${API}/api/interview/questions/${question.id}`);
      setSelected(response.data);
      setShowAnswer(false);
      setPracticeAnswer("");
      const bookmarks = await axios.get(`${API}/api/interview/bookmarks?page_size=100`);
      setSaved((bookmarks.data.items || []).some((item) => item.id === question.id));
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to open this question.");
    }
  };

  const toggleBookmark = async () => {
    if (!selected) return;
    if (saved) await axios.delete(`${API}/api/interview/questions/${selected.id}/bookmark`);
    else await axios.post(`${API}/api/interview/questions/${selected.id}/bookmark`);
    setSaved(!saved);
  };

  const recordPractice = async () => {
    if (!selected) return;
    await axios.post(`${API}/api/interview/questions/${selected.id}/practice`, { answer_submitted: practiceAnswer, completed: true });
    setShowAnswer(true);
  };

  const askAssistant = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    setChatMessages((items) => [...items, { role: "user", text: message }]);
    setChatInput("");
    try {
      const response = await axios.post(`${API}/api/interview/chat`, { message, category: selectedCategory });
      setChatMessages((items) => [...items, { role: "assistant", text: response.data.answer, question: response.data.question }]);
    } catch (chatError) {
      setError(chatError.response?.data?.detail || "Unable to contact the preparation assistant.");
    }
  };

  return (
    <InsightLayout title="Interview Preparation" subtitle="Practice commonly encountered fresher interview questions with a structured assistant.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Interview Preparation Assistant</p><h1 className="mt-2 text-2xl font-bold">Ask me anything about your interview preparation.</h1></div><FaCommentDots className="text-3xl text-cyan-300" /></div>
            <div className="mt-5 flex flex-wrap gap-2">{quickCategories.map((category) => <button key={category} type="button" onClick={() => { setSelectedCategory(category); setPage(1); }} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-300 hover:text-white">{category.split(" ")[0]}</button>)}</div>
            <form onSubmit={askAssistant} className="mt-5 flex gap-2"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about SQL joins, HR answers, or coding practice" className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300" /><button className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Ask</button></form>
            {chatMessages.length > 0 ? <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-xl p-3 text-sm ${message.role === "user" ? "ml-8 bg-slate-700 text-white" : "mr-8 bg-white text-slate-700"}`}><strong>{message.role === "user" ? "You" : "Assistant"}:</strong> {message.text}</div>)}</div> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Question bank</h2><p className="text-sm text-slate-500">{questions.total || 0} active questions available</p></div><div className="relative"><FaSearch className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search questions, tags, topics" className="rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></div></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2"> <button type="button" onClick={() => { setSavedOnly(false); setSelectedCategory(""); setPage(1); }} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${!savedOnly && !selectedCategory ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>All categories</button><button type="button" onClick={() => { setSavedOnly(true); setSelectedCategory(""); setPage(1); }} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${savedOnly ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}><FaBookmark className="mr-1 inline" />Saved</button>{categories.map((item) => <button type="button" key={item.category} onClick={() => { setSavedOnly(false); setSelectedCategory(item.category); setPage(1); }} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm ${!savedOnly && selectedCategory === item.category ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item.category} ({item.count})</button>)}</div>
            {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {loading ? <div className="mt-5 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div> : <div className="mt-5 space-y-3">{questions.items.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No questions match this search.</p> : questions.items.map((question) => <button type="button" key={question.id} onClick={() => openQuestion(question)} className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{question.question}</p><p className="mt-1 text-xs text-slate-500">{question.category} · {question.subcategory}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{question.difficulty}</span></div></button>)}</div>}
            <div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>Page {page} of {questions.total_pages || 1}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page >= (questions.total_pages || 1)} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:h-fit"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Practice mode</p>{selected ? <button type="button" onClick={toggleBookmark} aria-label={saved ? "Remove bookmark" : "Save question"} className={`rounded-lg p-2 ${saved ? "text-amber-500" : "text-slate-400"}`}><FaBookmark /></button> : null}</div>{selected ? <div className="mt-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{selected.category}</span><h2 className="mt-4 text-xl font-bold text-slate-900">{selected.question}</h2><p className="mt-3 text-sm text-slate-600">Think through your answer, then reveal the curated guidance.</p><textarea value={practiceAnswer} onChange={(event) => setPracticeAnswer(event.target.value)} rows={5} placeholder="Write your answer here..." className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm" />{showAnswer ? <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p><strong>Recommended answer:</strong> {selected.answer}</p><p><strong>Explanation:</strong> {selected.explanation}</p>{selected.code_example ? <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-cyan-200">{selected.code_example}</pre> : null}<p><strong>Interview tip:</strong> {selected.tips}</p></div> : null}<div className="mt-4 flex gap-2"><button type="button" onClick={recordPractice} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{showAnswer ? "Record practice" : "Show answer"}</button><button type="button" onClick={() => setShowAnswer(true)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700">Reveal</button></div></div> : <div className="py-16 text-center text-slate-500"><FaStar className="mx-auto text-3xl text-amber-400" /><p className="mt-3 text-sm">Select a question to begin practicing.</p></div>}</aside>
      </div>
    </InsightLayout>
  );
}
