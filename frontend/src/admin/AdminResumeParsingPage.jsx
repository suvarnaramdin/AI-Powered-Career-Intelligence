import { useEffect, useState } from "react";
import { FaChartBar, FaExclamationTriangle } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import { getAdminToken } from "./adminAuth";

const ADMIN_API = API_BASE_URL;

export default function AdminResumeParsingPage() {
  const [data, setData] = useState({ stats: {}, recent_activity: [], failed_parsing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadParsing = async () => {
      const token = getAdminToken();
      if (!token) {
        setLoading(false);
        setError("Admin session expired. Please log in again.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${ADMIN_API}/api/admin/resume-parsing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Unable to load resume parsing status.");
        const payload = await response.json();
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load parsing insights.");
      } finally {
        setLoading(false);
      }
    };

    loadParsing();
  }, []);

  const stats = data.stats || {};

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Resume Parsing Monitoring</p>
        <h1 className="mt-3 text-3xl font-bold">Parsing Pipeline Overview</h1>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Total Processed", value: stats.total_resumes_processed || 0 },
          { label: "Successfully Parsed", value: stats.successfully_parsed || 0 },
          { label: "Failed Parsing", value: stats.failed_parsing || 0 },
          { label: "Currently Processing", value: stats.currently_processing || 0 },
          { label: "Pending", value: stats.pending_parsing || 0 },
          { label: "Success Rate", value: `${stats.parsing_success_rate || 0}%` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-4 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Recent parsing activity</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-700">Resume</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-700">User</th>
                  <th className="px-3 py-2 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">Loading parsing activity...</td></tr> : data.recent_activity?.length ? data.recent_activity.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.resume_name || "Resume"}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{item.user_name || "Unknown"}</td>
                    <td className="px-3 py-3 text-sm"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.processing_status || "Pending"}</span></td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">No parsing activity recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Failure monitor</h2>
          <div className="mt-5 space-y-3">
            {data.failed_parsing?.length ? data.failed_parsing.map((item) => (
              <div key={item.resume_id} className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700"><FaExclamationTriangle /> <span className="font-semibold">{item.resume_name}</span></div>
                <p className="mt-2 text-sm text-red-600">User: {item.user_name}</p>
                <p className="text-sm text-red-600">Time: {item.failure_time || "Not available"}</p>
                <p className="mt-2 text-sm text-red-700">{item.error_message || "Safe human-readable parsing failure message is unavailable."}</p>
              </div>
            )) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No parsing failures reported.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
