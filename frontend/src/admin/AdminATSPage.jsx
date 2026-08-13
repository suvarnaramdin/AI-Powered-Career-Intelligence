import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminATSPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [data, setData] = useState({ summary: {}, distribution: {}, items: [], total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) params.set("search", search.trim());
      const payload = await adminFetch(`/api/admin/ats?${params.toString()}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load ATS analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [search, page]);

  const summary = data.summary || {};
  const distribution = data.distribution || { "0_40": 0, "41_60": 0, "61_80": 0, "81_100": 0 };
  const maxBin = useMemo(() => Math.max(...Object.values(distribution), 1), [distribution]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-700 via-green-700 to-teal-600 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Step 5B</p>
        <h1 className="mt-3 text-3xl font-bold">ATS Monitoring</h1>
        <p className="mt-3 max-w-2xl text-sm text-emerald-100">Track ATS results, score ranges, and recent resume-to-job comparisons from the live platform data.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Total analyses", value: summary.total_analyses || 0 },
          { label: "Average score", value: summary.average_score || 0 },
          { label: "Highest", value: summary.highest_score || 0 },
          { label: "Lowest", value: summary.lowest_score || 0 },
          { label: "High scores", value: summary.high_scores || 0 },
          { label: "Low scores", value: summary.low_scores || 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">ATS score distribution</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: "0–40", key: "0_40", info: "Needs Improvement" },
              { label: "41–60", key: "41_60", info: "Average" },
              { label: "61–80", key: "61_80", info: "Good" },
              { label: "81–100", key: "81_100", info: "Excellent" },
            ].map((bar) => {
              const value = distribution[bar.key] || 0;
              return (
                <div key={bar.key}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{bar.label}</span>
                    <span>{bar.info}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${Math.max((value / maxBin) * 100, value ? 8 : 0)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{value} analyses</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent ATS analyses</h2>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search user, job, resume..." className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500" />
          </div>

          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : data.items?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-3 py-2 font-semibold">User</th>
                    <th className="px-3 py-2 font-semibold">Job</th>
                    <th className="px-3 py-2 font-semibold">Score</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-3 py-3 text-slate-700">{item.user_name || item.user_email}</td>
                      <td className="px-3 py-3 text-slate-700">{item.job_title}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.ats_score}</td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => navigate(`/admin/ats/${item.id}`)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">{item.status}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">No ATS data available yet.</div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {data.total_pages || 1}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= (data.total_pages || 1)} onClick={() => setPage((value) => Math.min(data.total_pages || 1, value + 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
