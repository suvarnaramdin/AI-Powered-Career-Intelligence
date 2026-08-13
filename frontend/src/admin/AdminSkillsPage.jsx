import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminSkillsPage() {
  const [data, setData] = useState({ summary: {}, top_user_skills: [], top_demanded_skills: [], most_common_skill_gaps: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const payload = await adminFetch("/api/admin/skills/analytics");
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load skill analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const summary = data.summary || {};

  const renderTable = (title, rows, valueKey = "skill", countKey = "count") => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {rows.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Skill</th>
                <th className="px-3 py-2 font-semibold">Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row[valueKey]}-${index}`} className="border-t border-slate-200">
                  <td className="px-3 py-3 text-slate-700">{row[valueKey]}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{row[countKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No data available yet.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-fuchsia-700 to-purple-600 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Step 6</p>
        <h1 className="mt-3 text-3xl font-bold">Skill Gap Analytics</h1>
        <p className="mt-3 max-w-2xl text-sm text-violet-100">Compare the skills present in resumes and profiles against the skills demanded by jobs to surface the major gaps.</p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (<div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total skills identified</p><p className="mt-3 text-3xl font-bold text-slate-900">{summary.total_skills_identified || 0}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Avg skill match %</p><p className="mt-3 text-3xl font-bold text-slate-900">{summary.average_skill_match_percentage || 0}%</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Most common user skills</p><p className="mt-3 text-lg font-bold text-slate-900">{summary.most_common_user_skills?.[0]?.skill || "N/A"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Most demanded skill</p><p className="mt-3 text-lg font-bold text-slate-900">{summary.most_demanded_skills?.[0]?.skill || "N/A"}</p></div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {renderTable("Top user skills", data.top_user_skills || [])}
            {renderTable("Top demanded skills", data.top_demanded_skills || [])}
            {renderTable("Most common skill gaps", data.most_common_skill_gaps || [])}
          </div>
        </>
      )}
    </div>
  );
}
