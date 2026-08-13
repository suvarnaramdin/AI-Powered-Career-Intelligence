import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], summary: {}, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => Math.max(1, Number(data.total_pages || 1)), [data]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (rating) params.set("rating", rating);
      const payload = await adminFetch(`/api/admin/feedback?${params.toString()}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load feedback data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [search, page, status, rating]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-fuchsia-700 via-pink-700 to-rose-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">Step 8</p>
        <h1 className="mt-3 text-3xl font-bold">Feedback & Response Center</h1>
        <p className="mt-3 max-w-2xl text-sm text-pink-100">Review user feedback trends and prioritize support follow-ups using the latest activity history.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.summary?.total_feedback ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Positive</p><p className="mt-2 text-2xl font-bold text-emerald-600">{data.summary?.positive_feedback ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Negative</p><p className="mt-2 text-2xl font-bold text-rose-600">{data.summary?.negative_feedback ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Pending</p><p className="mt-2 text-2xl font-bold text-amber-600">{data.summary?.pending_feedback ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Avg. Rating</p><p className="mt-2 text-2xl font-bold text-violet-600">{data.summary?.average_rating ?? 0}</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recent feedback</h2>
          <div className="flex flex-col gap-2 md:flex-row">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search feedback or user" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pink-500" />
            <select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Any rating</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Any status</option><option value="Pending">Pending</option><option value="Resolved">Resolved</option></select>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
        ) : (
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.user_name}</p>
                    <p className="text-sm text-slate-500">{new Date(item.date).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{item.rating}/5</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{item.status}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{item.message}</p>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => navigate(`/admin/feedback/${item.id}`)} className="rounded-xl bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-500">Open details</button>
                </div>
              </div>
            ))}
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
    </div>
  );
}
