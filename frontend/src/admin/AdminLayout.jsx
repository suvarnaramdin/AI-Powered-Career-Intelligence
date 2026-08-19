import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaBell, FaChartBar, FaCog, FaFileAlt, FaHome, FaLifeRing, FaShieldAlt, FaSignOutAlt, FaUser, FaUsers, FaBriefcase, FaClipboardList, FaBookOpen, FaProjectDiagram, FaTasks, FaBellSlash } from "react-icons/fa";
import { adminFetch, clearAdminSession, getAdminSession } from "./adminAuth";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: FaHome },
  { label: "Users", path: "/admin/users", icon: FaUsers },
  { label: "Profiles", path: "/admin/profiles", icon: FaUser },
  { label: "Resumes", path: "/admin/resumes", icon: FaFileAlt },
  { label: "Jobs", path: "/admin/jobs", icon: FaBriefcase },
  { label: "ATS Analysis", path: "/admin/ats", icon: FaClipboardList },
  { label: "Skill Gap", path: "/admin/skills", icon: FaTasks },
  { label: "Career Recommendations", path: "/admin/career-recommendations", icon: FaProjectDiagram },
  { label: "Job Recommendations", path: "/admin/job-recommendations", icon: FaBriefcase },
  { label: "Courses & Certifications", path: "/admin/courses", icon: FaBookOpen },
  { label: "Feedback", path: "/admin/feedback", icon: FaLifeRing },
  { label: "Activity", path: "/admin/activity", icon: FaChartBar },
  { label: "Reports", path: "/admin/reports", icon: FaChartBar },
  { label: "System Monitoring", path: "/admin/system", icon: FaCog },
  { label: "Notifications", path: "/admin/notifications", icon: FaBell },
  { label: "Interview Questions", path: "/admin/interview-questions", icon: FaClipboardList },
  { label: "Roles & Security", path: "/admin/security", icon: FaShieldAlt },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAdminSession();
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const payload = await adminFetch("/api/admin/notifications");
        if (active) setUnreadCount(Number(payload.unread_count || 0));
      } catch {
        if (active) setUnreadCount(0);
      }
    };
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const pageTitle = navItems.find((item) => location.pathname === item.path)?.label || "Admin Dashboard";
  const filteredNavItems = navItems.filter(({ label }) => label.toLowerCase().includes(search.toLowerCase().trim()));

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-slate-900 text-white p-5 hidden lg:block">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-slate-400 mt-1">Career Intelligence</p>
          </div>

          <nav className="space-y-2">
            {filteredNavItems.length > 0 ? filteredNavItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive ? "bg-blue-600 text-white shadow" : "text-slate-200 hover:bg-slate-800"
                  }`
                }
              >
                <Icon className="text-base" />
                {label}
              </NavLink>
            )) : <p className="rounded-xl border border-slate-700 px-3 py-3 text-sm text-slate-300">No matching admin sections.</p>}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</p>
                <h2 className="text-2xl font-bold text-slate-800">{pageTitle}</h2>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate("/admin/notifications")} className="relative rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-500 hover:bg-slate-200" aria-label="Open notifications">
                  <FaBell />
                  {unreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                </button>
                <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 md:flex">
                  <FaBellSlash className="text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search admin modules"
                    className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-700">{session?.user?.name || "Admin"}</p>
                    <p className="text-xs text-slate-500">{session?.user?.role || "ADMIN"}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
