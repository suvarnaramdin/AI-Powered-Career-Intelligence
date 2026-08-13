import { useEffect, useState } from "react";
import { adminFetch } from "./adminAuth";

export default function AdminNotificationsPage() {
  const [data, setData] = useState({ items: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await adminFetch("/api/admin/notifications");
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markRead = async (notificationId) => {
    try {
      await adminFetch(`/api/admin/notifications/${notificationId}/read`, { method: "POST" });
      await loadData();
    } catch (markError) {
      setError(markError.message || "Unable to mark notification as read.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Step 8</p>
        <h1 className="mt-3 text-3xl font-bold">Notifications Center</h1>
        <p className="mt-3 max-w-2xl text-sm text-amber-100">Monitor important operational updates and clear alert items from the admin system.</p>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Unread notifications</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{data.unread_count} unread</span>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
        ) : (
          <div className="space-y-3">
            {data.items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">No notifications available.</div> : data.items.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${item.read ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  {!item.read ? <button type="button" onClick={() => markRead(item.id)} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-400">Mark read</button> : <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Read</span>}
                </div>
                <p className="mt-3 text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
