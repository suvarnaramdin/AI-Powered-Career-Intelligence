import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminJobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadJob = async () => {
      try {
        const payload = await adminFetch(`/api/admin/jobs/${jobId}`);
        setJob(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load selected job.");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) loadJob();
  }, [jobId]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading job details...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!job) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Job Details</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{job.job_title}</h1>
          </div>
          <Link to="/admin/jobs" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to jobs</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Company</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{job.company_name || "Unknown company"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{job.user_email || "System"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{job.created_at ? new Date(job.created_at).toLocaleString() : "-"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-900">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-slate-700">{job.description || "No description available."}</p>
        </div>
      </div>
    </div>
  );
}
