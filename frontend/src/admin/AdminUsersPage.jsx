import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaEye, FaSyncAlt, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { adminFetch, getAdminToken } from "./adminAuth";

const ADMIN_API = "http://127.0.0.1:8000";

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminUsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const loadUsers = async () => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      setError("Admin session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search: debouncedSearch,
      });
      if (role) query.set("role", role);

      const response = await fetch(`${ADMIN_API}/api/admin/users?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Unable to load user records.");
      }

      const payload = await response.json();
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, debouncedSearch, role]);

  const openUserDetails = async (userId) => {
    const token = getAdminToken();
    if (!token) return;

    try {
      setDetailsLoading(true);
      const response = await fetch(`${ADMIN_API}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Unable to load user details.");
      }

      const payload = await response.json();
      setSelectedUser(payload);
    } catch (loadError) {
      setError(loadError.message || "Unable to load user details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(Math.ceil(total / pageSize), 1), [total, pageSize]);
  const showingText = total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} users` : "Showing 0 users";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body = { ...form };
      if (!editingId && !body.password.trim()) {
        setError("Password is required for a new user.");
        return;
      }
      body.role = body.role || "USER";

      if (editingId) {
        await adminFetch(`/api/admin/users/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await adminFetch("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
      }

      setForm({ name: "", email: "", password: "", role: "USER" });
      setEditingId(null);
      setPage(1);
      await loadUsers();
    } catch (submitError) {
      setError(submitError.message || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "USER",
    });
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user record? This action cannot be undone.")) return;

    try {
      await adminFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete user.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">User Management</p>
        <h1 className="mt-3 text-3xl font-bold">User Administration</h1>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <FaSearch className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search by name, email, or user ID"
              className="w-full bg-transparent text-sm outline-none"
            />
            {search ? (
              <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <FaFilter className="text-slate-400" />
              <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }} className="bg-transparent text-sm outline-none">
                <option value="">All roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="USER">USER</option>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-800">Users</h2>
            <div className="text-sm text-slate-500">{showingText}</div>
          </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">User ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Email</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Role</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Profile Completion</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Resume Status</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Account Status</th>
                <th className="px-5 py-3 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : items.length ? (
                items.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-700">#{user.id}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{user.name || "Unknown"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                        {user.role || "USER"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.profile_completion}%</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.resume_status}</td>
                    <td className="px-5 py-4 text-sm">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{user.account_status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openUserDetails(user.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                          <FaEye /> View
                        </button>
                        <button onClick={() => handleEdit(user)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100">
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">No users found for the current search and filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {!loading && total > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">Page {page} of {totalPages}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <FaChevronLeft /> Previous
                </button>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">User actions</p>
              <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit user" : "Add user"}</h2>
            </div>
            <button type="button" onClick={() => { setEditingId(null); setForm({ name: "", email: "", password: "", role: "USER" }); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{editingId ? "Reset" : "New"}</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder={editingId ? "Leave blank to keep current password" : "Create a password"} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <FaPlus /> {submitting ? "Saving..." : editingId ? "Update user" : "Add user"}
            </button>
          </form>
        </div>
      </div>

      {selectedUser ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">User Details</p>
              <h3 className="text-2xl font-bold text-slate-900">{selectedUser.name || selectedUser.email}</h3>
            </div>
            <button onClick={() => setSelectedUser(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Close</button>
          </div>

          {detailsLoading ? <div className="text-slate-500">Loading user details...</div> : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="mb-3 text-lg font-semibold text-slate-800">Basic Information</h4>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3"><dt>Name</dt><dd className="font-medium text-slate-800">{selectedUser.name || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Email</dt><dd className="font-medium text-slate-800">{selectedUser.email || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Role</dt><dd className="font-medium text-slate-800">{selectedUser.role || "USER"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Account status</dt><dd className="font-medium text-slate-800">{selectedUser.account_status || "ACTIVE"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Registration</dt><dd className="font-medium text-slate-800">{selectedUser.registered_at || "Not available"}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="mb-3 text-lg font-semibold text-slate-800">Profile</h4>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3"><dt>Completion</dt><dd className="font-medium text-slate-800">{selectedUser.profile?.completion_percentage ?? 0}%</dd></div>
                  <div className="flex justify-between gap-3"><dt>Headline</dt><dd className="font-medium text-slate-800">{selectedUser.profile?.headline || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Location</dt><dd className="font-medium text-slate-800">{selectedUser.profile?.location || "-"}</dd></div>
                </dl>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
