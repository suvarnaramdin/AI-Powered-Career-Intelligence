import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch, getAdminSession } from "./adminAuth";

const truncate = (value, max = 140) => {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
};

export default function AdminJobsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ job_title: "", company_name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const session = getAdminSession();

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) params.set("search", search.trim());
      const payload = await adminFetch(`/api/admin/jobs?${params.toString()}`);
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError.message || "Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadJobs, 250);
    return () => clearTimeout(timer);
  }, [search, page]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.job_title.trim() || !form.description.trim()) {
      setError("Job title and description are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body = {
        user_email: session?.user?.email || "admin@career.local",
        ...form,
      };

      if (editingId) {
        await adminFetch(`/api/admin/jobs/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch("/api/admin/jobs", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setForm({ job_title: "", company_name: "", description: "" });
      setEditingId(null);
      setPage(1);
      await loadJobs();
    } catch (submitError) {
      setError(submitError.message || "Failed to save job.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (job) => {
    setEditingId(job.id);
    setForm({
      job_title: job.job_title || "",
      company_name: job.company_name || "",
      description: job.description || "",
    });
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm("Delete this job description? This action cannot be undone.")) return;

    try {
      await adminFetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
      await loadJobs();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete job.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Step 5</p>
        <h1 className="mt-3 text-3xl font-bold">Job Description Management</h1>
        <p className="mt-3 max-w-2xl text-sm text-blue-100">Monitor and administer the real job descriptions stored in the platform database.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Jobs</h2>
              <p className="text-sm text-slate-500">Showing {items.length} of {total} jobs</p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search jobs, company, skill..."
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">No jobs available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-3 py-2 font-semibold">Title</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 font-semibold">Created</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((job) => (
                    <tr key={job.id} className="rounded-2xl bg-slate-50 text-slate-700">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">{job.job_title}</td>
                      <td className="px-3 py-3">{job.company_name || "Unknown"}</td>
                      <td className="px-3 py-3 text-slate-600">{truncate(job.description, 110)}</td>
                      <td className="px-3 py-3">{job.created_at ? new Date(job.created_at).toLocaleDateString() : "-"}</td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => navigate(`/admin/jobs/${job.id}`)} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500">View</button>
                          <button type="button" onClick={() => handleEdit(job)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Edit</button>
                          <button type="button" onClick={() => handleDelete(job.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Delete</button>
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
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Job" : "Add Job"}</h2>
          <p className="mt-1 text-sm text-slate-500">Use the real platform job schema to add or update job descriptions.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Job title</label>
              <input value={form.job_title} onChange={(event) => setForm((current) => ({ ...current, job_title: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Full Stack Developer" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
              <input value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Example Corp" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="8" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Paste the job description..." />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Saving..." : editingId ? "Update job" : "Add job"}
              </button>
              {editingId ? (
                <button type="button" onClick={() => { setEditingId(null); setForm({ job_title: "", company_name: "", description: "" }); }} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">Cancel</button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
