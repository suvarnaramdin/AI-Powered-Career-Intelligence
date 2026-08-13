import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaHome,
  FaUserCircle,
  FaFileUpload,
  FaRobot,
  FaGraduationCap,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaSearch,
  FaBriefcase,
  FaBookOpen,
  FaClipboardList,
  FaFileAlt,
} from "react-icons/fa";

const API = "http://127.0.0.1:8000";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = localStorage.getItem("user") || "User";
  const email = localStorage.getItem("email") || "";
  const [profile, setProfile] = useState(null);
  const [resume, setResume] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [search, setSearch] = useState("");

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("email");
    navigate("/login");
  };

  const goProfile = () => {
    localStorage.removeItem("selectedEmail");
    localStorage.removeItem("editing");
    navigate("/profile");
  };

  const goResume = () => navigate("/resume");
  const goSettings = () => navigate("/settings");

  const actions = [
    { title: "Resume Upload & Parsing", route: "/resume" },
    { title: "ATS Resume Analysis", route: "/ats-analysis" },
    { title: "Skill Gap Analysis", route: "/skill-gap-analysis" },
    { title: "Career Recommendation", route: "/career-recommendation" },
    { title: "Job Recommendation", route: "/job-recommendation" },
    { title: "Course Recommendation", route: "/course-recommendation" },
    { title: "Resume Improvement", route: "/resume-improvement" },
    { title: "Resume Builder", route: "/resume-builder" },
    { title: "Career Analytics", route: "/analytics" },
  ];

  const filteredActions = actions.filter((action) => {
    const haystack = [action.title, action.route].join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!email) return;

      try {
        const profileRes = await axios.get(`${API}/profile/${email}`);
        setProfile(profileRes.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const resumeRes = await axios.get(`${API}/resumes/${email}`);
        if (resumeRes.data.length > 0) {
          setResume(resumeRes.data[0]);
        }
      } catch (err) {
        console.log(err);
      }
      try {
        const jobsRes = await axios.get(`${API}/job-description/${email}`);
        setJobs(jobsRes.data || []);
        const saved = localStorage.getItem("selectedJob");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const match = (jobsRes.data || []).find((j) => String(j.id) === String(parsed.id));
            if (match) setSelectedJob(match);
          } catch (e) {}
        } else if (jobsRes.data && jobsRes.data.length > 0) {
          setSelectedJob(jobsRes.data[0]);
          localStorage.setItem("selectedJob", JSON.stringify(jobsRes.data[0]));
        }
      } catch (err) {
        console.log(err);
      }
    };

    loadDashboardData();
  }, [email]);

  const analyzeResume = async (job) => {
    const activeJob = job || selectedJob;
    try {
      const selectedResumeId = resume?.id || localStorage.getItem("resume_id");
      if (!selectedResumeId) {
        alert("Please upload a resume first.");
        return;
      }
      if (!activeJob) {
        alert("Please select or add a job description first.");
        return;
      }

      const res = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${activeJob.id}`);
      setAnalysisResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Analysis failed");
    }
  };

  const cards = [
    { title: "Resume Score", value: analysisResult ? `${analysisResult.ats_score}%` : "82%", color: "bg-blue-600" },
    { title: "Skill Match", value: analysisResult ? `${analysisResult.match_percentage}%` : "76%", color: "bg-green-600" },
    { title: "Career Paths", value: "12", color: "bg-purple-600" },
    { title: "Courses", value: "18", color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-72 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">AI Career Platform</h1>
        <nav className="space-y-3">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-blue-600">
            <FaHome />Dashboard
          </button>
          <button onClick={goProfile} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaUserCircle />Profile
          </button>
          <button onClick={goResume} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaFileUpload />Resume Upload & Parsing
          </button>
          <button onClick={() => navigate('/ats-analysis')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaRobot />ATS Resume Analysis
          </button>
          <button onClick={() => navigate('/skill-gap-analysis')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaChartLine />Skill Gap Analysis
          </button>
          <button onClick={() => navigate('/career-recommendation')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaBriefcase />Career Recommendation
          </button>
          <button onClick={() => navigate('/job-recommendation')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaFileAlt />Job Recommendation
          </button>
          <button onClick={() => navigate('/course-recommendation')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaBookOpen />Course Recommendation
          </button>
          <button onClick={() => navigate('/resume-improvement')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaClipboardList />Resume Improvement
          </button>
          <button onClick={() => navigate('/analytics')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaGraduationCap />Career Analytics
          </button>
          <button onClick={goSettings} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800">
            <FaCog />Settings
          </button>
        </nav>
        <button onClick={logout} className="mt-10 w-full bg-red-600 p-3 rounded-xl flex items-center justify-center gap-2">
          <FaSignOutAlt />Logout
        </button>
      </aside>

      <main className="flex-1">
        <header className="bg-white shadow px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl">
            <FaSearch className="text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none" placeholder="Search modules..." />
          </div>
          <div className="flex items-center gap-5">
            <FaBell className="text-xl" />
            <div className="text-right">
              <h3 className="font-bold">{user}</h3>
              <p className="text-sm text-gray-500">Career Explorer</p>
            </div>
            <FaUserCircle className="text-4xl text-blue-600" />
          </div>
        </header>

        <section className="p-8">
          <div className="bg-gradient-to-r from-blue-700 to-cyan-500 text-white rounded-3xl p-8 shadow-lg mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-bold">Welcome, {user} 👋</h2>
                <p className="mt-3 text-lg">
                  Manage your career, analyze your resume and receive AI-powered recommendations.
                </p>
              </div>
              <button 
                onClick={() => navigate('/career-insights')}
                className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg"
              >
                📊 Career Insights
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mt-8">
            {cards.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-6">
                <div className={`w-12 h-12 rounded-xl ${c.color}`}></div>
                <h4 className="mt-4 text-gray-500">{c.title}</h4>
                <p className="text-3xl font-bold mt-2">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-3xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Profile Snapshot</h3>
                <button onClick={goProfile} className="text-sm text-blue-600 font-semibold">Open Profile</button>
              </div>
              {profile ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Name:</span> {profile.fullname || "Not added yet"}</p>
                  <p><span className="font-semibold text-slate-800">College:</span> {profile.college || "Not added yet"}</p>
                  <p><span className="font-semibold text-slate-800">Skills:</span> {profile.skills || "Not added yet"}</p>
                  <p><span className="font-semibold text-slate-800">Career Interest:</span> {profile.career_interest || "Not added yet"}</p>
                </div>
              ) : (
                <p className="text-slate-500">No profile data yet. Complete your profile to see it here.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Latest Parsed Resume</h3>
                <button onClick={goResume} className="text-sm text-blue-600 font-semibold">Upload Resume</button>
              </div>
              {resume ? (
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">File:</span> {resume.filename}</p>
                  <p><span className="font-semibold text-slate-800">Name:</span> {resume.parsed_name || "Not parsed"}</p>
                  <p><span className="font-semibold text-slate-800">Email:</span> {resume.parsed_email || "Not parsed"}</p>
                  <p><span className="font-semibold text-slate-800">Skills:</span> {resume.parsed_skills || "Not parsed"}</p>
                </div>
              ) : (
                <p className="text-slate-500">No resume uploaded yet. Add a resume to unlock AI-ready insights.</p>
              )}
            </div>
          </div>

          {/* Job Description Quick Panel and ATS */}
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-1 bg-white rounded-2xl shadow p-6">
              <h3 className="text-xl font-bold mb-4">Job Description (Quick)</h3>

              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <p className="text-slate-500">No saved job descriptions. Use Job Description page to add.</p>
                ) : (
                  jobs.slice(0,5).map((job) => (
                    <div key={job.id} className={`p-3 rounded border ${selectedJob?.id === job.id ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{job.job_title}</div>
                          <div className="text-sm text-gray-500">{job.company_name}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => { setSelectedJob(job); localStorage.setItem('selectedJob', JSON.stringify(job)); }} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded">Select</button>
                          <button onClick={() => analyzeResume(job)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Compare</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <button onClick={() => navigate('/job-description')} className="w-full bg-blue-600 text-white px-4 py-2 rounded">Manage Job Descriptions</button>
              </div>
            </div>

            <div className="lg:col-span-2">
              {analysisResult ? (
                <div>
                  {/* Reuse ATSResults component by lazy import to avoid duplication */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-2xl font-bold mb-4">ATS Summary</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-green-100 rounded-xl p-6 text-center">
                        <h4 className="font-semibold">ATS Score</h4>
                        <p className="text-4xl font-bold text-green-700 mt-2">{analysisResult.ats_score}%</p>
                      </div>
                      <div className="bg-blue-100 rounded-xl p-6 text-center">
                        <h4 className="font-semibold">Match %</h4>
                        <p className="text-4xl font-bold text-blue-700 mt-2">{analysisResult.match_percentage}%</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2">Matched Skills</h4>
                        {analysisResult.matched_skills.map((s) => <div key={s} className="bg-green-50 rounded p-2 mb-2">{s}</div>)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">Missing Skills</h4>
                        {analysisResult.missing_skills.map((s) => <div key={s} className="bg-red-50 rounded p-2 mb-2">{s}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow p-6">
                  <h4 className="font-semibold mb-2">ATS Dashboard</h4>
                  <p className="text-slate-500">Select a job and compare with your latest resume to see ATS results here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
              <h3 className="text-2xl font-bold mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredActions.length > 0 ? filteredActions.map((a, i) => (
                  <button key={i} onClick={() => navigate(a.route)} className="text-left p-4 rounded-xl border hover:bg-blue-50 hover:border-blue-600 transition">
                    {a.title}
                  </button>
                )) : <p className="text-slate-500 md:col-span-2">No matching modules found.</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-2xl font-bold mb-4">Recent Activity</h3>
              <ul className="space-y-4 text-gray-600">
                <li>✅ Registration completed</li>
                <li>✅ Login successful</li>
                <li>📄 Resume upload pending</li>
                <li>🤖 AI analysis waiting</li>
                <li>🎯 Complete your profile</li>
              </ul>
              <button
                onClick={() => navigate("/history")}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl p-4"
              >
                <h3 className="text-xl font-bold">Profile History</h3>
                <p className="mt-2">View all saved profiles</p>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
