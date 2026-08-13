import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBrain, FaBriefcase, FaChartLine, FaGraduationCap } from "react-icons/fa";

export default function Insights() {
  const navigate = useNavigate();
  const modules = [
    { title: "AI Resume Analysis", icon: <FaBrain />, description: "Get an AI-style summary of your resume, strengths, and skill gaps.", highlight: "Resume Fit Score: 88%" },
    { title: "Career Recommendation", icon: <FaBriefcase />, description: "Receive role suggestions based on your education, skills, and preferences.", highlight: "Top Match: Data Analyst" },
    { title: "Career Insights", icon: <FaChartLine />, description: "Explore growth trends, salary outlooks, and market demand for your profile.", highlight: "Demand Trend: Rising" },
    { title: "Learning Resources", icon: <FaGraduationCap />, description: "Discover curated learning pathways to bridge your skill gaps.", highlight: "Recommended Courses: 5" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-blue-600 font-semibold mb-3">
            <FaArrowLeft />Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-800">AI Career Intelligence Modules</h1>
          <p className="text-slate-500 mt-2">These modules provide professional guidance across analysis, recommendations, learning, and career planning.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {modules.map((item, index) => (
            <div key={index} className="bg-white rounded-3xl shadow p-6">
              <div className="flex items-center gap-3 text-blue-700 text-2xl">{item.icon}<h2 className="font-bold text-slate-800">{item.title}</h2></div>
              <p className="text-slate-600 mt-3">{item.description}</p>
              <div className="mt-4 inline-block rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm font-semibold">{item.highlight}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
