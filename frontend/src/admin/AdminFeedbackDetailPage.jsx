import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminFeedbackDetailPage() {
  const { feedbackId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await adminFetch(`/api/admin/feedback`);
        const target = (data.items || []).find((entry) => String(entry.id) === String(feedbackId));
        setItem(target || null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [feedbackId]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-16 animate-pulse rounded-xl bg-slate-200" /></div>;
  if (!item) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-700">Feedback record not found.</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-fuchsia-700 via-pink-700 to-rose-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">Feedback detail</p>
        <h1 className="mt-3 text-3xl font-bold">{item.user_name}</h1>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Rating</p>
            <p className="text-2xl font-bold text-slate-900">{item.rating}/5</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{item.status}</span>
        </div>
        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <p><strong>Date:</strong> {new Date(item.date).toLocaleString()}</p>
          <p><strong>Message:</strong> {item.message}</p>
          <p><strong>Response:</strong> {item.admin_response || "No admin response recorded."}</p>
        </div>
      </div>
    </div>
  );
}
