import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminActivityPage() {
  const [data, setData] = useState({ items: [], summary: {}, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [activityType, setActivityType] = useState("");
  const [user, setUser] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "12" });
      if (search.trim()) params.set("search", search.trim());
      if (activityType) params.set("activity_type", activityType);
      if (user) params.set("user", user);
      const payload = await adminFetch(`/api/admin/activity?${params.toString()}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load activity log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [search, activityType, user, page]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-sky-700 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Step 8</p>
        <h1 className="mt-3 text-3xl font-bold">Activity Monitoring</h1>
        <p className="mt-3 max-w-2xl text-sm text-cyan-100">Track recent user actions, resume uploads, and platform events with a live activity feed.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Activities</p><p className="mt-2 text-2xl font-bold text-slate-900">{data.summary?.total_activities ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Today</p><p className="mt-2 text-2xl font-bold text-emerald-600">{data.summary?.todays_activities ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Users</p><p className="mt-2 text-2xl font-bold text-violet-600">{data.summary?.active_users ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Resumes</p><p className="mt-2 text-2xl font-bold text-sky-600">{data.summary?.resume_uploads ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Logins</p><p className="mt-2 text-2xl font-bold text-cyan-600">{data.summary?.login_events ?? 0}</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-bold text-slate-900">Live timeline</h2>
          <div className="flex flex-col gap-2 md:flex-row">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search activity" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <input value={user} onChange={(event) => { setUser(event.target.value); setPage(1); }} placeholder="User email" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <select value={activityType} onChange={(event) => { setActivityType(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Any activity</option><option value="Resume Upload">Resume Upload</option><option value="Job Added">Job Added</option><option value="profile">Profile</option></select>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
        ) : (
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.activity_type}</p>
                    <p className="text-xs text-slate-500">{item.user}</p>
                  </div>
                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">{item.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{item.description}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
