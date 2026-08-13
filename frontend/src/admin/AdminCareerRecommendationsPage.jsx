import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminCareerRecommendationsPage() {
  const [data, setData] = useState({ summary: {}, items: [], top_career_recommendations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const payload = await adminFetch("/api/admin/career-recommendations");
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load career recommendations.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const summary = data.summary || {};
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Step 6</p>
        <h1 className="mt-3 text-3xl font-bold">Career Recommendations</h1>
        <p className="mt-3 max-w-2xl text-sm text-amber-100">Review the recommended career paths generated from user resumes and observed job demand signals.</p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (<div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total recommendations</p><p className="mt-3 text-3xl font-bold text-slate-900">{summary.total_recommendations || 0}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Unique users</p><p className="mt-3 text-3xl font-bold text-slate-900">{summary.unique_users || 0}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Most recommended</p><p className="mt-3 text-lg font-bold text-slate-900">{summary.most_recommended_career || "N/A"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Career categories</p><p className="mt-3 text-3xl font-bold text-slate-900">{summary.career_categories || 0}</p></div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Top career recommendations</h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2 font-semibold">Role</th><th className="px-3 py-2 font-semibold">Count</th></tr></thead>
                  <tbody>
                    {(data.top_career_recommendations || []).map((row, index) => (
                      <tr key={`${row.role}-${index}`} className="border-t border-slate-200">
                        <td className="px-3 py-3 text-slate-700">{row.role}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Recent recommendation items</h3>
              <div className="mt-4 space-y-3">
                {(data.items || []).slice(0, 8).map((item, index) => (
                  <div key={`${item.id || index}`} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-800">{item.recommended_role}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">{item.confidence_score}%</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.user_name || item.user_email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
