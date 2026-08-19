import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
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
  FaTrophy,
  FaCheckCircle,
  FaTimesCircle,
  FaStar,
  FaFire,
  FaLightbulb,
} from "react-icons/fa";
import { API_BASE_URL, clearUserSession } from "../config/api";

const API = API_BASE_URL;

export default function CareerInsightsDashboard() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "";
  const user = localStorage.getItem("user") || "User";
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!email) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        
        // Get profile data
        const profileRes = await axios.get(`${API}/profile/${email}`);
        setProfile(profileRes.data);

        // Get resume and job data
        const resumeRes = await axios.get(`${API}/resumes/${email}`);
        const jobsRes = await axios.get(`${API}/job-description/${email}`);

        if (resumeRes.data.length > 0 && jobsRes.data.length > 0) {
          const resume = resumeRes.data[0];
          const job = jobsRes.data[0];

          // Get analysis data
          const analysisRes = await axios.post(`${API}/ats/analyze/${resume.id}/${job.id}`);
          
          setDashboardData({
            analysis: analysisRes.data,
            resume: resume,
            job: job,
            profile: profileRes.data,
          });
        } else {
          setError("Please upload a resume and add a job description to view insights.");
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [email, navigate]);

  const logout = () => {
    clearUserSession();
    navigate("/login");
  };

  const goProfile = () => {
    localStorage.removeItem("selectedEmail");
    localStorage.removeItem("editing");
    navigate("/profile");
  };

  const goResume = () => navigate("/resume");
  const goSettings = () => navigate("/settings");

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className={`rounded-2xl p-6 text-white shadow-lg ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
        </div>
        <Icon className="text-5xl opacity-30" />
      </div>
    </div>
  );

  const SkillBadge = ({ skill, type }) => (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
        type === "matched"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {type === "matched" ? (
        <FaCheckCircle className="text-green-600" />
      ) : (
        <FaTimesCircle className="text-red-600" />
      )}
      {skill}
    </div>
  );

  const CareerCard = ({ career }) => (
    <div className="rounded-2xl bg-white p-6 shadow-md border-l-4 border-blue-600 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-slate-800">{career.title}</h3>
        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
          <FaStar className="text-yellow-500" />
          {career.match_percentage}%
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-3">{career.reason}</p>
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-semibold text-slate-700">Salary:</span>{" "}
          <span className="text-slate-600">{career.average_salary}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">Demand:</span>{" "}
          <span className={`font-medium ${career.future_demand === "Very High" ? "text-red-600" : "text-orange-600"}`}>
            {career.future_demand}
          </span>
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-2">Required Skills:</p>
        <div className="flex flex-wrap gap-2">
          {career.required_skills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const CourseCard = ({ course }) => (
    <div className="rounded-2xl bg-white p-6 shadow-md border-l-4 border-purple-600 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{course.title}</h3>
          <p className="text-sm text-slate-500 mt-1">{course.platform}</p>
        </div>
        <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
          {course.duration}
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm">
          <span className="font-semibold text-slate-700">Skill:</span>{" "}
          <span className="text-slate-600">{course.skill_covered}</span>
        </p>
        <p className="text-sm">
          <span className="font-semibold text-slate-700">Level:</span>{" "}
          <span
            className={`font-medium ${
              course.difficulty === "Beginner"
                ? "text-green-600"
                : course.difficulty === "Intermediate"
                ? "text-blue-600"
                : "text-red-600"
            }`}
          >
            {course.difficulty}
          </span>
        </p>
      </div>
      <div className="pt-4 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-2">Learning Path:</p>
        <ul className="space-y-1">
          {course.learning_path.slice(0, 2).map((week, idx) => (
            <li key={idx} className="text-xs text-slate-600">
              • {week}
            </li>
          ))}
          {course.learning_path.length > 2 && (
            <li className="text-xs text-slate-500 italic">
              + {course.learning_path.length - 2} more weeks...
            </li>
          )}
        </ul>
      </div>
    </div>
  );

  const ProgressBar = ({ percentage, label }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-blue-600">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <FaFire className="text-5xl text-blue-600 mx-auto" />
          </div>
          <p className="text-lg font-semibold text-slate-700">Loading your career insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">AI Career Platform</h1>
        <nav className="space-y-3">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-blue-600">
            <FaHome />
            Dashboard
          </button>
          <button
            onClick={goProfile}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaUserCircle />
            Profile
          </button>
          <button
            onClick={goResume}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaFileUpload />
            Resume Upload & Parsing
          </button>
          <button
            onClick={() => navigate("/ats-analysis")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaRobot />
            ATS Resume Analysis
          </button>
          <button
            onClick={() => navigate("/skill-gap-analysis")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaChartLine />
            Skill Gap Analysis
          </button>
          <button
            onClick={() => navigate("/career-recommendation")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaBriefcase />
            Career Recommendation
          </button>
          <button
            onClick={() => navigate("/job-recommendation")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaFileAlt />
            Job Recommendation
          </button>
          <button
            onClick={() => navigate("/course-recommendation")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaBookOpen />
            Course Recommendation
          </button>
          <button
            onClick={() => navigate("/resume-improvement")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaClipboardList />
            Resume Improvement
          </button>
          <button
            onClick={() => navigate("/analytics")}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaGraduationCap />
            Career Analytics
          </button>
          <button
            onClick={goSettings}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition"
          >
            <FaCog />
            Settings
          </button>
        </nav>
        <button
          onClick={logout}
          className="mt-10 w-full bg-red-600 p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl">
            <FaSearch className="text-gray-500" />
            <input
              className="bg-transparent outline-none"
              placeholder="Search or navigate..."
            />
          </div>
          <div className="flex items-center gap-5">
            <FaBell className="text-xl cursor-pointer hover:text-blue-600" />
            <div className="text-right">
              <h3 className="font-bold">{user}</h3>
              <p className="text-sm text-gray-500">Career Explorer</p>
            </div>
            <FaUserCircle className="text-4xl text-blue-600 cursor-pointer" />
          </div>
        </header>

        <section className="p-8">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <FaTimesCircle className="text-5xl text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-red-700">{error}</p>
              <div className="mt-6 flex gap-4 justify-center">
                <button
                  onClick={goResume}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Upload Resume
                </button>
                <button
                  onClick={() => navigate("/job-description")}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  Add Job Description
                </button>
              </div>
            </div>
          ) : dashboardData ? (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white rounded-3xl p-8 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-bold mb-2">Welcome back, {user}! 👋</h2>
                    <p className="text-lg opacity-90">Here's your comprehensive career insights dashboard</p>
                  </div>
                  <FaTrophy className="text-7xl opacity-20" />
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="ATS Score"
                  value={`${dashboardData.analysis.ats_score}%`}
                  icon={FaRobot}
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                  subtitle="Resume Match"
                />
                <StatCard
                  title="Resume Status"
                  value={dashboardData.analysis.analytics?.resume_status || "Ready"}
                  icon={FaFileUpload}
                  color="bg-gradient-to-br from-green-500 to-green-600"
                  subtitle="Analysis Complete"
                />
                <StatCard
                  title="Profile Completion"
                  value={`${dashboardData.analysis.analytics?.profile_completion || 82}%`}
                  icon={FaUserCircle}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                  subtitle="Profile Ready"
                />
                <StatCard
                  title="Job Match"
                  value={`${dashboardData.analysis.match_percentage}%`}
                  icon={FaBriefcase}
                  color="bg-gradient-to-br from-orange-500 to-orange-600"
                  subtitle="Skill Alignment"
                />
              </div>

              {/* Matching Skills & Missing Skills */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Matching Skills */}
                <div className="bg-white rounded-3xl p-8 shadow-md">
                  <div className="flex items-center gap-3 mb-6">
                    <FaCheckCircle className="text-2xl text-green-600" />
                    <h3 className="text-2xl font-bold text-slate-800">Matching Skills</h3>
                    <span className="ml-auto bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
                      {dashboardData.analysis.matched_skills?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {dashboardData.analysis.matched_skills?.length > 0 ? (
                      dashboardData.analysis.matched_skills.map((skill, idx) => (
                        <SkillBadge key={idx} skill={skill} type="matched" />
                      ))
                    ) : (
                      <p className="text-slate-500">No matching skills found. Upload a resume to get started.</p>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-white rounded-3xl p-8 shadow-md">
                  <div className="flex items-center gap-3 mb-6">
                    <FaTimesCircle className="text-2xl text-red-600" />
                    <h3 className="text-2xl font-bold text-slate-800">Missing Skills</h3>
                    <span className="ml-auto bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold">
                      {dashboardData.analysis.missing_skills?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {dashboardData.analysis.missing_skills?.length > 0 ? (
                      dashboardData.analysis.missing_skills.map((skill, idx) => (
                        <SkillBadge key={idx} skill={skill} type="missing" />
                      ))
                    ) : (
                      <p className="text-slate-500">Great! You have all the required skills.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description Status */}
              <div className="bg-white rounded-3xl p-8 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <FaFileAlt className="text-2xl text-blue-600" />
                  <h3 className="text-2xl font-bold text-slate-800">Current Job Description</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-2">Job Title</p>
                    <p className="text-lg font-bold text-slate-800">{dashboardData.job.job_title}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-2">Company</p>
                    <p className="text-lg font-bold text-slate-800">{dashboardData.job.company_name}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-2">Experience Match</p>
                    <p className="text-lg font-bold text-blue-600">{dashboardData.analysis.match_percentage}%</p>
                  </div>
                </div>
                <ProgressBar
                  percentage={dashboardData.analysis.match_percentage}
                  label="Overall Fit"
                />
              </div>

              {/* Recommended Careers */}
              <div className="rounded-3xl bg-white p-8 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <FaBriefcase className="text-2xl text-blue-600" />
                  <h3 className="text-2xl font-bold text-slate-800">Recommended Career Paths</h3>
                  <span className="ml-auto bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
                    {dashboardData.analysis.career_recommendations?.length || 0}
                  </span>
                </div>
                <p className="text-slate-600 mb-6">
                  Based on your skills and experience, here are the career paths best suited for you:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.analysis.career_recommendations?.slice(0, 6).map((career, idx) => (
                    <CareerCard key={idx} career={career} />
                  ))}
                </div>
              </div>

              {/* Recommended Courses */}
              <div className="rounded-3xl bg-white p-8 shadow-md mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <FaGraduationCap className="text-2xl text-purple-600" />
                  <h3 className="text-2xl font-bold text-slate-800">Recommended Courses</h3>
                  <span className="ml-auto bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold">
                    {dashboardData.analysis.course_recommendations?.length || 0}
                  </span>
                </div>
                <p className="text-slate-600 mb-6">
                  Upskill with these carefully curated courses to bridge your skill gaps:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.analysis.course_recommendations?.slice(0, 6).map((course, idx) => (
                    <CourseCard key={idx} course={course} />
                  ))}
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl p-8 shadow-lg mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Ready to take the next step?</h3>
                    <p className="text-lg opacity-90">Explore detailed recommendations and start your growth journey</p>
                  </div>
                  <FaLightbulb className="text-6xl opacity-20" />
                </div>
                <div className="mt-6 flex gap-4 flex-wrap">
                  <button
                    onClick={() => navigate("/resume-improvement")}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    Improve Resume
                  </button>
                  <button
                    onClick={() => navigate("/course-recommendation")}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                  >
                    View All Courses
                  </button>
                  <button
                    onClick={() => navigate("/job-recommendation")}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
                  >
                    Browse Jobs
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FaLightbulb className="text-6xl text-slate-400 mx-auto mb-4" />
              <p className="text-xl text-slate-600">Loading your insights...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
