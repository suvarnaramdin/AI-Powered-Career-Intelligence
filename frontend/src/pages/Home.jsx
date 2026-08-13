import { useNavigate } from "react-router-dom";
import {
  FaRobot,
  FaBriefcase,
  FaChartLine,
  FaGraduationCap,
  FaFileAlt,
  FaBrain,
} from "react-icons/fa";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaRobot />,
      title: "AI Resume Analysis",
      desc: "Analyze resumes intelligently using Artificial Intelligence.",
    },
    {
      icon: <FaBriefcase />,
      title: "Career Recommendation",
      desc: "Get personalized career paths based on your skills.",
    },
    {
      icon: <FaChartLine />,
      title: "Salary Prediction",
      desc: "Estimate salary ranges for different career roles.",
    },
    {
      icon: <FaGraduationCap />,
      title: "Learning Resources",
      desc: "Receive AI-recommended courses to improve your skills.",
    },
    {
      icon: <FaFileAlt />,
      title: "Resume Builder",
      desc: "Create and manage ATS-friendly resumes professionally.",
    },
    {
      icon: <FaBrain />,
      title: "Skill Gap Detection",
      desc: "Identify missing skills required for your dream job.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-500">

      {/* Navbar */}

      <nav className="flex justify-between items-center px-10 py-6 text-white">

        <h1 className="text-3xl font-bold">
          AI Career Intelligence
        </h1>

        <div className="flex gap-4 items-center">
          <button
            onClick={() => navigate("/login")}
            className="border border-white px-6 py-2 rounded-full hover:bg-white hover:text-blue-700 transition font-semibold"
          >
            User Login
          </button>

          <button
            onClick={() => navigate("/admin/login")}
            className="bg-yellow-400 text-blue-700 px-6 py-2 rounded-full hover:bg-yellow-300 transition font-bold"
          >
            Admin Login
          </button>
        </div>

      </nav>

      {/* Hero */}

      <section className="max-w-7xl mx-auto px-10 pt-16 pb-20 grid lg:grid-cols-2 gap-16 items-center">

        <div>

          <span className="bg-white text-blue-700 px-4 py-2 rounded-full font-semibold">
            AI Powered Career Platform
          </span>

          <h1 className="text-6xl font-extrabold text-white mt-8 leading-tight">

            AI-Powered Career Intelligence Platform

          </h1>

          <h3 className="text-2xl text-blue-100 mt-6">

            Smart Career Guidance using Artificial Intelligence

          </h3>

          <p className="text-blue-50 mt-8 text-lg leading-8">

            Empower your career journey with intelligent resume analysis,
            personalized career recommendations, skill gap detection,
            salary prediction, learning resource suggestions and AI-driven
            career insights. Build your professional profile and make
            better career decisions through Artificial Intelligence.

          </p>

          <div className="mt-10 flex gap-5">

            <button
              onClick={() => navigate("/register")}
              className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition"
            >
              Get Started →
            </button>

            <button
              onClick={() => navigate("/login")}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-700 transition"
            >
              Login
            </button>

          </div>

        </div>

        {/* Right Side */}

        <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-white/20">

          <h2 className="text-3xl text-white font-bold mb-8">

            Platform Highlights

          </h2>

          <div className="grid gap-6">

            {features.map((item, index) => (

              <div
                key={index}
                className="bg-white rounded-2xl p-5 flex gap-5 items-start hover:scale-105 transition"
              >

                <div className="text-4xl text-blue-700">
                  {item.icon}
                </div>

                <div>

                  <h3 className="text-xl font-bold text-gray-800">
                    {item.title}
                  </h3>

                  <p className="text-gray-600 mt-2">
                    {item.desc}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* Statistics */}

      <section className="bg-white rounded-t-[50px] py-16">

        <div className="max-w-7xl mx-auto px-10">

          <h2 className="text-4xl font-bold text-center text-blue-700 mb-14">

            Why Choose Our Platform?

          </h2>

          <div className="grid md:grid-cols-4 gap-8">

            <div className="bg-blue-50 rounded-3xl p-8 text-center shadow">

              <h1 className="text-5xl font-bold text-blue-700">
                AI
              </h1>

              <p className="mt-4 text-gray-600">
                Intelligent Resume Analysis
              </p>

            </div>

            <div className="bg-indigo-50 rounded-3xl p-8 text-center shadow">

              <h1 className="text-5xl font-bold text-indigo-700">
                ML
              </h1>

              <p className="mt-4 text-gray-600">
                Machine Learning Predictions
              </p>

            </div>

            <div className="bg-cyan-50 rounded-3xl p-8 text-center shadow">

              <h1 className="text-5xl font-bold text-cyan-700">
                24/7
              </h1>

              <p className="mt-4 text-gray-600">
                Personalized Career Guidance
              </p>

            </div>

            <div className="bg-green-50 rounded-3xl p-8 text-center shadow">

              <h1 className="text-5xl font-bold text-green-700">
                100%
              </h1>

              <p className="mt-4 text-gray-600">
                Secure User Authentication
              </p>

            </div>

          </div>

          {/* Admin Portal Section */}
          <div className="mt-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-12 shadow-2xl">

            <div className="grid md:grid-cols-2 gap-8 items-center">

              <div>
                <h2 className="text-4xl font-bold text-blue-900 mb-6">
                  Admin Portal Access
                </h2>
                <p className="text-lg text-blue-800 mb-6 leading-8">
                  Manage the entire platform with powerful admin tools. Monitor user activity, 
                  manage resumes, jobs, courses, and generate comprehensive reports.
                </p>
                <ul className="text-blue-800 mb-8 space-y-3">
                  <li className="flex items-center gap-2">
                    <span className="text-2xl">✓</span> Dashboard & Analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-2xl">✓</span> User & Profile Management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-2xl">✓</span> Resume & ATS Management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-2xl">✓</span> Courses & Certifications
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-2xl">✓</span> System Monitoring & Reports
                  </li>
                </ul>
                <button
                  onClick={() => navigate("/admin/login")}
                  className="bg-blue-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition"
                >
                  Go to Admin Portal →
                </button>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">Quick Login</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input 
                      type="text" 
                      value="admin@example.com" 
                      disabled
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input 
                      type="password" 
                      value="AdminPassword123" 
                      disabled
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-mono"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg">
                    📝 Use these credentials to access the admin dashboard. Click the button above to login.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}