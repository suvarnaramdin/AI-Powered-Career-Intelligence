import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminSystemPage() {
  const [data, setData] = useState({ services: {}, response_times_ms: {}, recent_errors: [], last_checked_at: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await adminFetch("/api/admin/system");
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load system status.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const serviceEntries = Object.entries(data.services || {});

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Step 8</p>
        <h1 className="mt-3 text-3xl font-bold">System Monitoring</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">Operational overview of backend, database, parsing, ATS, and recommendation services.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {serviceEntries.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-slate-700">{key.replace(/_/g, " ")}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value === "Online" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{value}</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{data.response_times_ms?.[key] ?? 0} ms</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">System health</h2>
        <p className="mt-3 text-sm text-slate-600">Last checked: {data.last_checked_at ? new Date(data.last_checked_at).toLocaleString() : "Not available"}</p>
        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-200" /> : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <ul className="space-y-2 text-sm text-slate-600">
              {data.recent_errors && data.recent_errors.length ? data.recent_errors.map((entry, index) => <li key={index}>• {entry}</li>) : <li>• No recent system errors recorded.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
