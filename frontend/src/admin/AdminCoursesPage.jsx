import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminCoursesPage({ mode = "courses" }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", provider: "", description: "", category: "", skills: "", difficulty: "Beginner", duration: "", url: "", status: "Active" });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const endpoint = mode === "certifications" ? "/api/admin/certifications" : "/api/admin/courses";
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });

  const totalPages = useMemo(() => Math.max(1, Number(data?.total_pages || 1)), [data]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (provider) params.set("provider", provider);
      if (difficulty) params.set("difficulty", difficulty);
      if (status) params.set("status", status);
      const payload = await adminFetch(`${endpoint}?${params.toString()}`);
      setData(payload);
      setItems(payload.items || []);
      setCategories(payload.categories || []);
      setProviders(payload.providers || []);
      setDifficulties(payload.difficulties || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load learning records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [search, category, provider, difficulty, status, page, mode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        provider: form.provider,
        description: form.description,
        category: form.category || "General",
        skills: form.skills ? form.skills.split(",").map((value) => value.trim()).filter(Boolean) : [],
        difficulty: form.difficulty,
        duration: form.duration,
        url: form.url,
        status: form.status,
      };
      if (editingId) {
        await adminFetch(`${endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await adminFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      }
      setForm({ title: "", provider: "", description: "", category: "", skills: "", difficulty: "Beginner", duration: "", url: "", status: "Active" });
      setEditingId(null);
      setPage(1);
      await loadData();
    } catch (submitError) {
      setError(submitError.message || "Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || item.name || "",
      provider: item.provider || item.issuing_organization || "",
      description: item.description || "",
      category: item.category || "",
      skills: (item.skills || []).join(", "),
      difficulty: item.difficulty || "Beginner",
      duration: item.duration || "",
      url: item.url || "",
      status: item.status || "Active",
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Step 7</p>
        <h1 className="mt-3 text-3xl font-bold">{mode === "certifications" ? "Certification Management" : "Course Management"}</h1>
        <p className="mt-3 max-w-2xl text-sm text-violet-100">Monitor real learning resources and certifications from the existing platform data with admin-safe search and filtering.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{mode === "certifications" ? "Certifications" : "Courses"}</h2>
              <p className="text-sm text-slate-500">Showing {items.length} of {data.total || 0} records</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search title, provider, skill..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <button type="button" onClick={() => { setSearch(""); setCategory(""); setProvider(""); setDifficulty(""); setStatus(""); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear</button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {categories.length ? <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select> : null}
            {difficulties.length ? <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All difficulty</option>{difficulties.map((value) => <option key={value} value={value}>{value}</option>)}</select> : null}
            {providers.length ? <select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All providers</option>{providers.map((value) => <option key={value} value={value}>{value}</option>)}</select> : null}
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">No learning records found for the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead><tr className="text-slate-500"><th className="px-3 py-2 font-semibold">Title</th><th className="px-3 py-2 font-semibold">Provider</th><th className="px-3 py-2 font-semibold">Category</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Actions</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="rounded-2xl bg-slate-50 text-slate-700">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">{item.title || item.name}</td>
                      <td className="px-3 py-3">{item.provider || item.issuing_organization || "-"}</td>
                      <td className="px-3 py-3">{item.category || "General"}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{item.status || "Active"}</span></td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => navigate(`/admin/courses/${item.id}`)} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500">View</button>
                          <button type="button" onClick={() => handleEdit(item)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit" : "Add"} {mode === "certifications" ? "Certification" : "Course"}</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Title</label><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Provider</label><input value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Category</label><input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="4" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div>
            <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-medium text-slate-700">Skills</label><input value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Python, SQL" /></div><div><label className="mb-1 block text-sm font-medium text-slate-700">Difficulty</label><select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select></div></div>
            <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-medium text-slate-700">Duration</label><input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div><div><label className="mb-1 block text-sm font-medium text-slate-700">Status</label><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">URL</label><input value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></div>
            <div className="flex gap-3"><button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{submitting ? "Saving..." : editingId ? "Update" : "Add"}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm({ title: "", provider: "", description: "", category: "", skills: "", difficulty: "Beginner", duration: "", url: "", status: "Active" }); }} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">Cancel</button> : null}</div>
          </form>
        </div>
      </div>
    </div>
  );
}
