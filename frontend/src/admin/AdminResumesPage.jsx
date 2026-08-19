import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaChevronLeft, FaChevronRight, FaEye, FaTrash } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import { adminFetch, getAdminToken } from "./adminAuth";

const ADMIN_API = API_BASE_URL;

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminResumesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedResume, setSelectedResume] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const loadResumes = async () => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      setError("Admin session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({ page: String(page), page_size: String(pageSize), search: debouncedSearch });
      const response = await fetch(`${ADMIN_API}/api/admin/resumes?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load resume records.");
      const payload = await response.json();
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError.message || "Unable to load resumes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [page, pageSize, debouncedSearch]);

  const openResumeDetails = async (resumeId) => {
    const token = getAdminToken();
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${ADMIN_API}/api/admin/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load resume details.");
      const payload = await response.json();
      setSelectedResume(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load resume details.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(Math.ceil(total / pageSize), 1), [total, pageSize]);
  const showingText = total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} resumes` : "Showing 0 resumes";

  const handleDelete = async (resumeId) => {
    if (!window.confirm("Delete this resume? This action cannot be undone.")) return;

    try {
      await adminFetch(`/api/admin/resumes/${resumeId}`, { method: "DELETE" });
      await loadResumes();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete resume.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Resume Management</p>
        <h1 className="mt-3 text-3xl font-bold">Resume Administration</h1>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <FaSearch className="text-slate-400" />
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search by resume ID, user, or filename" className="w-full bg-transparent text-sm outline-none" />
            {search ? <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-slate-700">Clear</button> : null}
          </div>
          <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-800">Resumes</h2>
            <div className="text-sm text-slate-500">{showingText}</div>
          </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Resume ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">User</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Filename</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Upload Date</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Parsing Status</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Analysis</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading resumes...</td></tr> : items.length ? items.map((resume) => (
                <tr key={resume.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm text-slate-700">#{resume.id}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{resume.user_name || resume.user_email || "Unknown"}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{resume.filename || "Unknown"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{resume.upload_date ? new Date(resume.upload_date).toLocaleDateString() : "Not available"}</td>
                  <td className="px-5 py-4 text-sm"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{resume.parsing_status || "Pending"}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{resume.analysis_status || "Pending"}</td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openResumeDetails(resume.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"><FaEye /> View</button>
                      <button onClick={() => handleDelete(resume.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100"><FaTrash /> Delete</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No resumes found for the current search and filters.</td></tr>}
            </tbody>
          </table>
        </div>

          {!loading && total > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">Page {page} of {totalPages}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><FaChevronLeft /> Previous</button>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Next <FaChevronRight /></button>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      {selectedResume ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Resume Details</p>
              <h3 className="text-2xl font-bold text-slate-900">{selectedResume.filename}</h3>
            </div>
            <button onClick={() => setSelectedResume(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Close</button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="mb-3 text-lg font-semibold text-slate-800">Metadata</h4>
              <dl className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><dt>Owner</dt><dd className="font-medium text-slate-800">{selectedResume.user?.name || selectedResume.user?.email || "Unknown"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Upload Date</dt><dd className="font-medium text-slate-800">{selectedResume.upload_date || "Not available"}</dd></div>
                <div className="flex justify-between gap-3"><dt>File type</dt><dd className="font-medium text-slate-800">{selectedResume.file_type || "UNKNOWN"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Parsing status</dt><dd className="font-medium text-slate-800">{selectedResume.parsing_status || "Pending"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Analysis status</dt><dd className="font-medium text-slate-800">{selectedResume.analysis_status || "Pending"}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="mb-3 text-lg font-semibold text-slate-800">Extracted Content</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>Skills: {selectedResume.extracted_skills?.length ? selectedResume.extracted_skills.join(", ") : "N/A"}</li>
                <li>Education: {selectedResume.extracted_education || "N/A"}</li>
                <li>Experience: {selectedResume.extracted_experience || "N/A"}</li>
                <li>Projects: {selectedResume.extracted_projects || "N/A"}</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
