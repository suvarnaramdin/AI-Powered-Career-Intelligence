import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFileUpload,
  FaRobot,
  FaChartLine,
  FaSignOutAlt,
  FaGraduationCap,
  FaBriefcase,
  FaBookOpen,
  FaClipboardList,
  FaFileAlt,
  FaUserCircle,
  FaPenFancy,
  FaCommentDots,
} from "react-icons/fa";
import { clearUserSession } from "../config/api";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: FaHome },
  { label: "Resume Upload", path: "/resume", icon: FaFileUpload },
];

const MODULE_ITEMS = [
  { label: "ATS Resume Analysis", path: "/ats-analysis", icon: FaRobot },
  { label: "Skill Gap Analysis", path: "/skill-gap-analysis", icon: FaChartLine },
  { label: "Career Recommendation", path: "/career-recommendation", icon: FaBriefcase },
  { label: "Job Recommendation", path: "/job-recommendation", icon: FaFileAlt },
  { label: "Course Recommendation", path: "/course-recommendation", icon: FaBookOpen },
  { label: "Resume Improvement", path: "/resume-improvement", icon: FaClipboardList },
  { label: "Resume Builder", path: "/resume-builder", icon: FaPenFancy },
  { label: "Career Analytics", path: "/analytics", icon: FaGraduationCap },
  { label: "Feedback", path: "/feedback", icon: FaCommentDots },
];

export default function InsightLayout({ title, subtitle, children, headerAction = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => localStorage.getItem("user") || "User", []);

  const logout = () => {
    clearUserSession();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-72 bg-slate-900 text-white p-6 hidden lg:flex lg:flex-col">
        <div>
          <h1 className="text-2xl font-bold">AI Career Platform</h1>
          <p className="mt-2 text-sm text-slate-400">Milestone 3 intelligence suite</p>
        </div>

        <nav className="mt-8 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition ${
                  isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}

          {MODULE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition ${
                  isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-8 flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 px-4 py-3"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </aside>

      <main className="flex-1">
        <header className="bg-white shadow px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-slate-800">{user}</p>
              <p className="text-sm text-slate-500">Career Explorer</p>
            </div>
            <FaUserCircle className="text-3xl text-blue-600" />
          </div>
        </header>

        <section className="p-6 md:p-8">
          {headerAction ? <div className="mb-4">{headerAction}</div> : null}
          {children}
        </section>
      </main>
    </div>
  );
}
