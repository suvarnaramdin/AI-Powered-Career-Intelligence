import { useEffect, useMemo, useState } from "react";
import { FaUsers, FaFileAlt, FaBriefcase, FaChartLine, FaFileUpload, FaCheckCircle, FaExclamationTriangle, FaBook, FaGraduationCap } from "react-icons/fa";
import { adminFetch } from "./adminAuth";

const formatNumber = (value) => (typeof value === "number" ? value.toLocaleString() : "0");

const buildBarChartData = (items, maxValue) =>
  items.map((item) => ({
    ...item,
    height: maxValue > 0 ? Math.max((Number(item.value || 0) / maxValue) * 100, 8) : 0,
  }));

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const payload = await adminFetch("/api/admin/dashboard/stats");
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = data?.stats || {};

  const cards = useMemo(
    () => [
      { label: "Total Users", value: formatNumber(stats.totalUsers), icon: FaUsers, accent: "bg-blue-600" },
      { label: "Active Users", value: formatNumber(stats.activeUsers), icon: FaUsers, accent: "bg-indigo-600" },
      { label: "Total Profiles", value: formatNumber(stats.totalProfiles), icon: FaFileAlt, accent: "bg-violet-600" },
      { label: "Total Resumes", value: formatNumber(stats.totalResumes), icon: FaFileUpload, accent: "bg-cyan-600" },
      { label: "Total Jobs", value: formatNumber(stats.totalJobs), icon: FaBriefcase, accent: "bg-amber-600" },
      { label: "Average ATS Score", value: stats.averageAtsScore ? `${stats.averageAtsScore}` : "0", icon: FaChartLine, accent: "bg-emerald-600" },
      { label: "Career Recommendations", value: formatNumber(stats.careerRecommendations), icon: FaCheckCircle, accent: "bg-pink-600" },
      { label: "Total Certifications", value: formatNumber(stats.totalCertifications), icon: FaGraduationCap, accent: "bg-purple-600" },
    ],
    [stats]
  );

  const userChart = useMemo(() => {
    const items = data?.userAnalytics || [];
    const maxValue = Math.max(...items.map((entry) => Number(entry.value || 0)), 1);
    return buildBarChartData(items.slice(-10), maxValue);
  }, [data]);

  const resumeChart = useMemo(() => {
    const items = data?.resumeAnalytics || [];
    const maxValue = Math.max(...items.map((entry) => Number(entry.value || 0)), 1);
    return buildBarChartData(items.slice(-10), maxValue);
  }, [data]);

  const skillList = data?.skillAnalytics?.topUserSkills || [];
  const jobRoles = data?.jobAnalytics?.roles || [];
  const recentActivity = data?.recentActivity || [];
  const systemStatus = data?.systemStatus || { backend: "Online", database: "Connected" };

  const atsDistribution = data?.atsAnalytics?.distribution || { "0_40": 0, "41_60": 0, "61_80": 0, "81_100": 0 };
  const atsBars = [
    { label: "0-40", value: atsDistribution["0_40"] || 0 },
    { label: "41-60", value: atsDistribution["41_60"] || 0 },
    { label: "61-80", value: atsDistribution["61_80"] || 0 },
    { label: "81-100", value: atsDistribution["81_100"] || 0 },
  ];

  const emptyState = !loading && !error && !data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Admin Overview</p>
        <h1 className="mt-3 text-3xl font-bold">Welcome back, Admin</h1>
        <p className="mt-3 max-w-2xl text-sm text-blue-100">
          Platform health, user growth, ATS performance, and resume analytics are updated from the live database.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : null}

      {!loading && data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
                  </div>
                  <div className={`${accent} flex h-11 w-11 items-center justify-center rounded-xl text-white`}>
                    <Icon />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">User registration activity</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Last 10 buckets</span>
              </div>
              {userChart.length ? (
                <div className="flex h-52 items-end gap-2">
                  {userChart.map((entry) => (
                    <div key={`${entry.label}-${entry.value}`} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-xl bg-blue-600" style={{ height: `${entry.height}%` }} title={`${entry.label}: ${entry.value}`} />
                      <span className="text-[10px] text-slate-500">{String(entry.label).slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-slate-500">No user data available yet.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Resume uploads</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Last 10 buckets</span>
              </div>
              {resumeChart.length ? (
                <div className="flex h-52 items-end gap-2">
                  {resumeChart.map((entry) => (
                    <div key={`${entry.label}-${entry.value}`} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-xl bg-cyan-600" style={{ height: `${entry.height}%` }} title={`${entry.label}: ${entry.value}`} />
                      <span className="text-[10px] text-slate-500">{String(entry.label).slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-slate-500">No resume activity available yet.</div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">ATS score distribution</h2>
              <div className="mt-5 space-y-4">
                {atsBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex justify-between text-sm text-slate-600">
                      <span>{bar.label}</span>
                      <span>{bar.value}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
                        style={{ width: `${Math.min((bar.value / Math.max(...atsBars.map((item) => item.value), 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Top Skills</h2>
              <div className="mt-5 space-y-3">
                {skillList.length ? (
                  skillList.map((skill) => (
                    <div key={skill.name} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-700">{skill.name}</span>
                        <span className="text-sm text-slate-500">{skill.count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No skill data available yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Job roles</h2>
              <div className="mt-5 space-y-3">
                {jobRoles.length ? (
                  jobRoles.map((job) => (
                    <div key={job.label} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-700">{job.label}</span>
                        <span className="text-sm text-slate-500">{job.value}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No job data available yet.</div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Recent activity</h2>
              <div className="mt-5 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((entry, index) => (
                    <div key={`${entry.title}-${entry.timestamp || index}`} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-700">{entry.title}</span>
                        <span className="text-xs text-slate-500">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Recently"}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{entry.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No recent admin activity available yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">System status</h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-600">Backend API</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{systemStatus.backend || "Online"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-600">Database</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{systemStatus.database || "Connected"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-600">Average ATS</span>
                  <span className="font-semibold text-slate-800">{data?.atsAnalytics?.averageScore || 0}</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {emptyState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No data available yet.
        </div>
      ) : null}
    </div>
  );
}
