import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminReportsPage() {
  const [data, setData] = useState({ user_report: {}, resume_report: {}, ats_report: {}, job_report: {}, skill_report: {}, recommendation_report: {}, feedback_report: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await adminFetch("/api/admin/reports");
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = [
    { label: "Users", value: data.user_report.total_users ?? 0, accent: "indigo" },
    { label: "Profiles", value: data.user_report.profile_completion ?? 0, accent: "emerald", suffix: "%" },
    { label: "Resumes", value: data.resume_report.uploaded_resumes ?? 0, accent: "sky" },
    { label: "ATS Score", value: data.ats_report.average_ats_score ?? 0, accent: "amber", suffix: "%" },
    { label: "Jobs", value: data.job_report.total_jobs ?? 0, accent: "violet" },
    { label: "Career Rec", value: data.recommendation_report.career_recommendations ?? 0, accent: "rose" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Step 8</p>
        <h1 className="mt-3 text-3xl font-bold">Admin Reporting</h1>
        <p className="mt-3 max-w-2xl text-sm text-indigo-100">Executive summaries of user health, resume processing, ATS performance, jobs, and recommendations.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}{item.suffix ?? ""}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">User & profile report</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Active users: {data.user_report.active_users ?? 0}</li>
            <li>New users: {data.user_report.new_users ?? 0}</li>
            <li>Profile completion: {data.user_report.profile_completion ?? 0}%</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Resume & parsing report</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Uploaded resumes: {data.resume_report.uploaded_resumes ?? 0}</li>
            <li>Parsed resumes: {data.resume_report.parsed_resumes ?? 0}</li>
            <li>Failed resumes: {data.resume_report.failed_resumes ?? 0}</li>
            <li>Parsing success: {data.resume_report.parsing_success_rate ?? 0}%</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">ATS & jobs</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>ATS analyses: {data.ats_report.number_of_analyses ?? 0}</li>
            <li>Average ATS score: {data.ats_report.average_ats_score ?? 0}%</li>
            <li>Total jobs: {data.job_report.total_jobs ?? 0}</li>
            <li>Active jobs: {data.job_report.active_jobs ?? 0}</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Skills & recommendations</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Top skills: {(data.skill_report.most_common_skills || []).slice(0, 3).map((item) => item.label || item.name || item).join(", ") || "No data"}</li>
            <li>Job recommendations: {data.recommendation_report.job_recommendations ?? 0}</li>
            <li>Career recommendations: {data.recommendation_report.career_recommendations ?? 0}</li>
            <li>Feedback entries: {data.feedback_report.total_feedback ?? 0}</li>
          </ul>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="h-20 animate-pulse rounded-xl bg-slate-200" /> : null}
    </div>
  );
}
