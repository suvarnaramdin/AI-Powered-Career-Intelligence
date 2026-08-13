import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaShieldAlt, FaBell, FaCog } from "react-icons/fa";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-blue-600 font-semibold mb-3">
            <FaArrowLeft />Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Platform Settings</h1>
          <p className="text-slate-500 mt-2">Manage your account preferences, notifications, and privacy settings in a professional dashboard.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center gap-3 text-blue-700 text-2xl"><FaShieldAlt /><h2 className="font-bold text-slate-800">Privacy & Security</h2></div>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>• Secure authentication and profile storage</li>
              <li>• Controlled access to your career data</li>
              <li>• Role-based dashboard experience</li>
            </ul>
          </div>
          <div className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center gap-3 text-blue-700 text-2xl"><FaBell /><h2 className="font-bold text-slate-800">Notifications</h2></div>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>• Resume upload updates</li>
              <li>• Career recommendations alerts</li>
              <li>• Profile completion reminders</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center gap-3 text-blue-700 text-2xl"><FaCog /><h2 className="font-bold text-slate-800">Account Preferences</h2></div>
          <div className="mt-4 text-slate-600">Your account is configured to manage profile updates, resume uploads, and intelligent career recommendations from one secure workspace.</div>
        </div>
      </div>
    </div>
  );
}
