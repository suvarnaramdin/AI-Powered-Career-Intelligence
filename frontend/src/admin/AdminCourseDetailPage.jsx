import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminFetch } from "./adminAuth";

export default function AdminCourseDetailPage() {
  const { courseId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await adminFetch(`/api/admin/courses?page=1&page_size=1000`);
        const target = (data.items || []).find((entry) => String(entry.id) === String(courseId));
        setItem(target || null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-16 animate-pulse rounded-xl bg-slate-200" /></div>;
  if (!item) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-700">Course record not found.</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Course detail</p>
        <h1 className="mt-3 text-3xl font-bold">{item.title || item.name}</h1>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Overview</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p><strong>Provider:</strong> {item.provider || item.issuing_organization || "-"}</p>
            <p><strong>Category:</strong> {item.category || "General"}</p>
            <p><strong>Difficulty:</strong> {item.difficulty || "Beginner"}</p>
            <p><strong>Status:</strong> {item.status || "Active"}</p>
            <p><strong>Duration:</strong> {item.duration || "N/A"}</p>
            <p><strong>URL:</strong> {item.url ? <a className="text-blue-600 underline" href={item.url} target="_blank" rel="noreferrer">Open resource</a> : "N/A"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Description</h2>
          <p className="mt-4 text-sm leading-6 text-slate-700">{item.description || "No description available."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(item.skills || []).map((skill) => (
              <span key={skill} className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{skill}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
