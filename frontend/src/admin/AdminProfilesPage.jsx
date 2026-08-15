import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaEye, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { adminFetch, getAdminToken } from "./adminAuth";

const ADMIN_API = "http://127.0.0.1:8000";

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminProfilesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [completionFilter, setCompletionFilter] = useState("");
  const [summary, setSummary] = useState({ total_profiles: 0, completed_profiles: 0, incomplete_profiles: 0, average_profile_completion: 0 });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ email: "", fullname: "", headline: "", location: "", about: "", skills: "", experience: "" });
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const loadProfiles = async () => {
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
      if (completionFilter) query.set("completion", completionFilter);

      const response = await fetch(`${ADMIN_API}/api/admin/profiles?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Unable to load profile records.");
      }

      const payload = await response.json();
      setItems(payload.items || []);
      setSummary(payload.summary || { total_profiles: 0, completed_profiles: 0, incomplete_profiles: 0, average_profile_completion: 0 });
    } catch (loadError) {
      setError(loadError.message || "Unable to load profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [page, pageSize, debouncedSearch, completionFilter]);

  const openProfileDetails = async (profileId) => {
    const token = getAdminToken();
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${ADMIN_API}/api/admin/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load profile details.");
      const payload = await response.json();
      setSelectedProfile(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const total = summary.total_profiles || 0;
  const totalPages = useMemo(() => Math.max(Math.ceil(total / pageSize), 1), [total, pageSize]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) {
      setError("Profile email is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body = {
        email: form.email,
        fullname: form.fullname,
        headline: form.headline,
        location: form.location,
        about: form.about,
        skills: form.skills ? form.skills.split(",").map((value) => value.trim()).filter(Boolean) : [],
        experience: form.experience ? [{ company: "Custom", designation: form.experience.trim() }] : [],
      };

      if (editingId) {
        await adminFetch(`/api/admin/profiles/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await adminFetch("/api/admin/profiles", { method: "POST", body: JSON.stringify(body) });
      }

      setForm({ email: "", fullname: "", headline: "", location: "", about: "", skills: "", experience: "" });
      setEditingId(null);
      setPage(1);
      await loadProfiles();
    } catch (submitError) {
      setError(submitError.message || "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setForm({
      email: profile.email || "",
      fullname: profile.fullname || "",
      headline: profile.headline || "",
      location: profile.location || "",
      about: profile.about || "",
      skills: Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
      experience: Array.isArray(profile.experience) ? (profile.experience[0]?.designation || profile.experience[0]?.company || "") : "",
    });
  };

  const handleDelete = async (profileId) => {
    if (!window.confirm("Delete this profile? This action cannot be undone.")) return;

    try {
      await adminFetch(`/api/admin/profiles/${profileId}`, { method: "DELETE" });
      await loadProfiles();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete profile.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Profile Management</p>
        <h1 className="mt-3 text-3xl font-bold">Profile Administration</h1>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total Profiles</p><p className="mt-4 text-3xl font-bold text-slate-900">{summary.total_profiles}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Completed</p><p className="mt-4 text-3xl font-bold text-slate-900">{summary.completed_profiles}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Incomplete</p><p className="mt-4 text-3xl font-bold text-slate-900">{summary.incomplete_profiles}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Avg Completion</p><p className="mt-4 text-3xl font-bold text-slate-900">{summary.average_profile_completion}%</p></div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <FaSearch className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => { setPage(1); setSearch(event.target.value); }}
              placeholder="Search profiles"
              className="w-full bg-transparent text-sm outline-none"
            />
            {search ? <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-slate-700">Clear</button> : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <FaFilter className="text-slate-400" />
              <select value={completionFilter} onChange={(event) => { setPage(1); setCompletionFilter(event.target.value); }} className="bg-transparent text-sm outline-none">
                <option value="">All profiles</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
            <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Full name</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Email</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Headline</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Location</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Completion</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading profiles...</td></tr> : items.length ? items.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm text-slate-700">#{profile.id}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-800">{profile.fullname || "N/A"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{profile.email || "N/A"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{profile.headline || "N/A"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{profile.location || "N/A"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{profile.completion_percentage ?? 0}%</td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openProfileDetails(profile.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"><FaEye /> View</button>
                      <button onClick={() => handleEdit(profile)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"><FaEdit /> Edit</button>
                      <button onClick={() => handleDelete(profile.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100"><FaTrash /> Delete</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No profiles found for the current filters.</td></tr>}
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

      {selectedProfile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Profile Details</p>
              <h3 className="text-2xl font-bold text-slate-900">{selectedProfile.fullname || selectedProfile.email}</h3>
            </div>
            <button onClick={() => setSelectedProfile(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Close</button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="mb-3 text-lg font-semibold text-slate-800">Profile</h4>
              <dl className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><dt>Completion</dt><dd className="font-medium text-slate-800">{selectedProfile.completion_percentage ?? 0}%</dd></div>
                <div className="flex justify-between gap-3"><dt>Email</dt><dd className="font-medium text-slate-800">{selectedProfile.email || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Location</dt><dd className="font-medium text-slate-800">{selectedProfile.location || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Headline</dt><dd className="font-medium text-slate-800">{selectedProfile.headline || "-"}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="mb-3 text-lg font-semibold text-slate-800">Sections</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>Education: {selectedProfile.education?.length ? selectedProfile.education.length : 0}</li>
                <li>Skills: {selectedProfile.skills?.length ? selectedProfile.skills.length : 0}</li>
                <li>Projects: {selectedProfile.projects?.length ? selectedProfile.projects.length : 0}</li>
                <li>Certifications: {selectedProfile.certifications?.length ? selectedProfile.certifications.length : 0}</li>
                <li>Experience: {selectedProfile.experience?.length ? selectedProfile.experience.length : 0}</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
