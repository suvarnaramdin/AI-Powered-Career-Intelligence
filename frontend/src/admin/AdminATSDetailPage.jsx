import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminATSDetailPage() {
  const { analysisId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const payload = await adminFetch(`/api/admin/ats/${analysisId}`);
        setItem(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load ATS detail.");
      } finally {
        setLoading(false);
      }
    };

    if (analysisId) loadData();
  }, [analysisId]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading ATS detail...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!item) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ATS Analysis</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{item.job?.title || "ATS score"}</h1>
          </div>
          <Link to="/admin/ats" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to ATS</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">ATS score</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.ats_score}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Keyword match</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.keyword_match || 0}%</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Skill match</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.skill_match || 0}%</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-2 text-lg font-semibold text-slate-900">{item.status}</p></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Matched skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(item.matched_skills?.length ? item.matched_skills : ["No matched skills recorded"]).map((skill) => (
                <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">{skill}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Missing skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(item.missing_skills?.length ? item.missing_skills : ["No missing skills recorded"]).map((skill) => (
                <span key={skill} className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">{skill}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Matched keywords</h2>
            <p className="mt-3 text-slate-700">{(item.matched_keywords || []).join(", ") || "Not available."}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Missing keywords</h2>
            <p className="mt-3 text-slate-700">{(item.missing_keywords || []).join(", ") || "Not available."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
