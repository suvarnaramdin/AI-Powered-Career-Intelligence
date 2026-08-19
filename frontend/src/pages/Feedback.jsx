import { useEffect, useState } from "react";
import { FaCommentDots, FaStar } from "react-icons/fa";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import InsightLayout from "../components/InsightLayout";

const API = API_BASE_URL;
const emptyForm = { rating: 5, category: "General", message: "" };

export default function Feedback() {
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadFeedback = async () => {
    try {
      const response = await axios.get(`${API}/feedback`);
      setItems(response.data || []);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load your feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const submitFeedback = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      await axios.post(`${API}/feedback`, {
        rating: Number(form.rating),
        category: form.category,
        message: form.message,
      });
      setForm(emptyForm);
      setMessage("Thank you. Your feedback was sent to the support team.");
      await loadFeedback();
    } catch (submitError) {
      setError(submitError.response?.data?.detail || "Unable to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InsightLayout title="Feedback" subtitle="Share feedback with the career intelligence team.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={submitFeedback} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FaCommentDots className="text-2xl text-pink-600" />
            <h1 className="text-2xl font-bold text-slate-900">Send feedback</h1>
          </div>
          {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Category
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3">
              <option>General</option>
              <option>Profile</option>
              <option>Resume and ATS</option>
              <option>Recommendations</option>
              <option>Technical issue</option>
            </select>
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-700">Rating</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" aria-label={`${rating} stars`} onClick={() => setForm({ ...form, rating })} className={`rounded-lg p-2 ${Number(form.rating) >= rating ? "text-amber-500" : "text-slate-300"}`}>
                  <FaStar />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Message
            <textarea required minLength={5} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-3" placeholder="Tell us what would make your experience better." />
          </label>
          <button disabled={submitting} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Sending..." : "Submit feedback"}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Your previous feedback</h2>
          {loading ? <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-100" /> : null}
          {!loading && items.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">You have not submitted feedback yet.</p> : null}
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{item.category}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span>
                </div>
                <div className="mt-2 flex gap-1 text-amber-500">{Array.from({ length: item.rating }, (_, index) => <FaStar key={index} />)}</div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>
                {item.admin_response ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600"><strong>Admin response:</strong> {item.admin_response}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </InsightLayout>
  );
}
