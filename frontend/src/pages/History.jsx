import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
  FaHistory,
} from "react-icons/fa";

const API = "http://127.0.0.1:8000";

export default function History() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");

  const loadProfiles = async () => {
    try {
      const res = await axios.get(`${API}/profiles`);
      setProfiles(res.data || []);
    } catch (err) {
      console.error("Failed to load profiles", err);
      setProfiles([]);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/profile-history`);
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load history", err);
      setHistory([]);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadHistory();
  }, []);

  const deleteProfile = async (email) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this profile?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/profile/${email}`);
      alert("Profile Deleted Successfully");
      await loadProfiles();
      await loadHistory();
    } catch (err) {
      alert(err.response?.data?.detail || "Unable to delete profile");
    }
  };

  const viewProfile = (email) => {
    localStorage.setItem("selectedEmail", email);
    navigate("/profile", { state: { editing: false } });
  };

  const editProfile = (email) => {
    localStorage.setItem("selectedEmail", email);
    navigate("/profile", { state: { editing: true } });
  };

  const filteredProfiles = profiles.filter(
    (item) =>
      item.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatHistoryDetails = (details) => {
    try {
      const parsed = JSON.parse(details);
      return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed);
    } catch {
      return String(details || "");
    }
  };

  const profileCompletion = (item) => {
    const fields = [
      item.fullname,
      item.email,
      item.phone,
      item.college,
      item.degree,
      item.branch,
      item.cgpa,
      item.skills,
      item.certifications,
      item.career_interest,
    ];

    const isComplete = (field) => {
      if (typeof field === "string") {
        return field.trim() !== "";
      }
      if (Array.isArray(field)) {
        return field.length > 0;
      }
      return Boolean(field);
    };

    const completed = fields.filter(isComplete).length;
    return Math.round((completed / fields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">

      <div className="max-w-7xl mx-auto">

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">

          <div className="flex justify-between items-center">

            <div>

              <h1 className="text-4xl font-bold text-blue-700 flex items-center gap-3">

                <FaHistory />

                Profile History

              </h1>

              <p className="text-gray-500 mt-2">
                View, Search, Edit and Manage Profiles
              </p>

            </div>

            <div className="relative">

              <FaSearch className="absolute left-3 top-4 text-gray-500" />

              <input
                type="text"
                placeholder="Search Name or Email..."
                className="pl-10 pr-4 py-3 border rounded-xl w-80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>

          </div>

        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">

          <table className="w-full">

            <thead className="bg-blue-700 text-white">

              <tr>

                <th className="p-4">Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>College</th>
                <th>Degree</th>
                <th>Skills</th>
                <th>Completion</th>
                <th>Actions</th>

              </tr>

            </thead>

            <tbody>
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-gray-500">
                    No profiles found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-blue-50 transition"
                  >
                    <td className="p-4 font-semibold">{item.fullname}</td>
                    <td>{item.email}</td>
                    <td>{item.phone}</td>
                    <td>{item.college}</td>
                    <td>{item.degree}</td>
                    <td>{item.skills}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{ width: `${profileCompletion(item)}%` }}
                          />
                        </div>
                        <span>{profileCompletion(item)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => viewProfile(item.email)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => editProfile(item.email)}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteProfile(item.email)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>

        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Profile Activity</h2>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="border rounded-xl p-3 bg-slate-50 text-gray-500">
                No profile history yet.
              </div>
            ) : (
              history.slice(0, 8).map((entry) => (
                <div key={entry.id} className="border rounded-xl p-3 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">{entry.action}</span>
                    <span className="text-sm text-gray-500">{entry.created_at}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{entry.email}</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-600 mt-2 bg-white p-3 rounded-xl border">{formatHistoryDetails(entry.details)}</pre>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}