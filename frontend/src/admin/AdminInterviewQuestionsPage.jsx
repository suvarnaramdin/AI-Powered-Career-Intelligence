import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

const emptyForm = { category: "Technical Fundamentals", subcategory: "General", question: "", answer: "", explanation: "", difficulty: "Beginner", tags: "", code_example: "", expected_output: "", tips: "", is_active: true };
const categories = ["Online Assessment / Aptitude", "Verbal Ability / Communication", "Technical Fundamentals", "Programming / Coding Round", "SQL / Database Round", "Core Computer Science Round", "Project Discussion Round", "Resume-Based Interview", "HR / Behavioral Round", "Managerial Round", "Group Discussion", "Communication / JAM Round", "Case Study / Situational Round", "Managerial + Technical Combined Round", "Final HR / Offer Discussion"];

export default function AdminInterviewQuestionsPage() {
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [active, setActive] = useState("");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "12" });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);
      if (active !== "") params.set("active", active);
      params.set("order", order);
      const [questions, questionStats] = await Promise.all([adminFetch(`/api/admin/interview/questions?${params}`), adminFetch("/api/admin/interview/stats")]);
      setData(questions);
      setStats(questionStats);
    } catch (loadError) { setError(loadError.message || "Unable to load interview questions."); } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [page, search, category, difficulty, active, order]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const endpoint = editingId ? `/api/admin/interview/questions/${editingId}` : "/api/admin/interview/questions";
      await adminFetch(endpoint, { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
      setForm(emptyForm); setEditingId(null); setNotice(editingId ? "Question updated." : "Question added."); await loadData();
    } catch (saveError) { setError(saveError.message || "Unable to save question."); } finally { setSaving(false); }
  };

  const edit = (item) => { setEditingId(item.id); setForm({ ...emptyForm, ...item, tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const deactivate = async (id) => { if (!window.confirm("Deactivate this question? It will no longer appear to users.")) return; try { await adminFetch(`/api/admin/interview/questions/${id}`, { method: "DELETE" }); setNotice("Question deactivated."); await loadData(); } catch (deleteError) { setError(deleteError.message || "Unable to deactivate question."); } };

  return <div className="space-y-6">
    <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-800 p-8 text-white shadow-lg"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Content management</p><h1 className="mt-3 text-3xl font-bold">Interview Questions</h1><p className="mt-3 max-w-2xl text-sm text-blue-100">Manage the curated preparation bank used by the student assistant.</p></section>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">{[["Total", stats.total], ["Active", stats.active], ["Inactive", stats.inactive], ["Categories", stats.categories], ["Beginner", stats.beginner], ["Intermediate", stats.intermediate], ["Advanced", stats.advanced]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value || 0}</p></div>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit question" : "Add question"}</h2>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-sm font-semibold text-slate-500">Cancel</button> : null}</div>{notice ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}{error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Subcategory<input value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700 md:col-span-2">Question<textarea required rows={2} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Answer<textarea required rows={4} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Explanation<textarea rows={4} value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Difficulty<select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label className="text-sm font-semibold text-slate-700">Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700 md:col-span-2">Code example<textarea rows={3} value={form.code_example} onChange={(event) => setForm({ ...form, code_example: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Expected output<textarea rows={2} value={form.expected_output} onChange={(event) => setForm({ ...form, expected_output: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Interview tips<textarea rows={2} value={form.tips} onChange={(event) => setForm({ ...form, tips: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Active</label><div className="md:col-span-2"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : editingId ? "Update question" : "Add question"}</button></div></form></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search question or tag" className="rounded-xl border p-2.5" /><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value="">All difficulty</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value="">All status</option><option value="1">Active</option><option value="0">Inactive</option></select><select value={order} onChange={(event) => { setOrder(event.target.value); setPage(1); }} className="rounded-xl border p-2.5"><option value="desc">Newest</option><option value="oldest">Oldest</option><option value="category">Category</option><option value="difficulty">Difficulty</option></select></div>{loading ? <div className="mt-5 h-32 animate-pulse rounded-xl bg-slate-100" /> : <div className="mt-5 space-y-3">{data.items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold text-slate-900">{item.question}</p><p className="mt-1 text-xs text-slate-500">{item.category} · {item.subcategory} · {item.difficulty}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{item.is_active ? "Active" : "Inactive"}</span></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => edit(item)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Edit</button>{item.is_active ? <button type="button" onClick={() => deactivate(item.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Deactivate</button> : null}</div></article>)}{!data.items.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No questions found.</p> : null}</div>}<div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>Page {data.page || page} of {data.total_pages || 1}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= (data.total_pages || 1)} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div></section>
  </div>;
}
