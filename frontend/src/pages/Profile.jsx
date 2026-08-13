import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUserCircle } from "react-icons/fa";
const API = "http://127.0.0.1:8000";

const blankProfile = {
  fullname: "",
  email: "",
  headline: "",
  location: "",
  about: "",
  phone: "",
  dob: "",
  gender: "",
  linkedin: "",
  github: "",
  portfolio: "",
  college: "",
  degree: "",
  branch: "",
  cgpa: "",
  graduation: "",
  education: "",
  projects: "",
  skills: "",
  certifications: "",
  experience: "",
  career_interest: "",
};

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentEmail = localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "";
  const [profileExists, setProfileExists] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ ...blankProfile, email: currentEmail });

  const isEditable = editing || !profileExists;

  const loadProfile = async () => {
    const email = localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "";
    if (!email) return;

    try {
      const res = await axios.get(`${API}/profile/${email}`);
      setProfile({
        fullname: res.data.fullname || "",
        email: res.data.email || email,
        headline: res.data.headline || "",
        location: res.data.location || "",
        about: res.data.about || "",
        phone: res.data.phone || "",
        dob: res.data.dob ? res.data.dob.substring(0, 10) : "",
        gender: res.data.gender || "",
        linkedin: res.data.linkedin || "",
        github: res.data.github || "",
        portfolio: res.data.portfolio || "",
        college: res.data.college || "",
        degree: res.data.degree || "",
        branch: res.data.branch || "",
        cgpa: res.data.cgpa || "",
        graduation: res.data.graduation || "",
        education: formatResponseText(res.data.education),
        projects: formatResponseText(res.data.projects),
        skills: formatResponseText(res.data.skills),
        certifications: formatResponseText(res.data.certifications),
        experience: formatResponseText(res.data.experience),
        career_interest: res.data.career_interest || "",
      });
      setProfileExists(true);
    } catch (err) {
      setProfile((prev) => ({ ...prev, email }));
      setProfileExists(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (location.state?.editing === true) {
      setEditing(true);
      return;
    }

    if (!profileExists) {
      setEditing(true);
    }
  }, [location.state?.editing, profileExists]);

  const formatResponseText = (value) => {
    if (Array.isArray(value)) return value.join(", ");
    return value || "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("selectedEmail") || localStorage.getItem("email") || profile.email;
    if (!email) {
      alert("Please enter an email before saving your profile.");
      return;
    }

      const payload = {
      fullname: profile.fullname,
      email,
      headline: profile.headline,
      location: profile.location,
      about: profile.about,
      phone: profile.phone,
      dob: profile.dob,
      gender: profile.gender,
      linkedin: profile.linkedin,
      github: profile.github,
      portfolio: profile.portfolio,
      college: profile.college,
      degree: profile.degree,
      branch: profile.branch,
      cgpa: profile.cgpa,
      graduation: profile.graduation,
      contact_info: {
        phone: profile.phone || "",
        email: email || profile.email || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        portfolio: profile.portfolio || "",
      },
      education_text: profile.education || "",
      skills_text: profile.skills || "",
      certifications_text: profile.certifications || "",
      experience_text: profile.experience || "",
      projects_text: profile.projects || "",
      career_interest: profile.career_interest || "",
    };

    try {
      let res;
      if (profileExists) {
        res = await axios.put(`${API}/profile/${email}`, payload);
      } else {
        res = await axios.post(`${API}/profile`, payload);
      }
      alert(res.data.message);
      setEditing(false);
      setProfileExists(true);
      localStorage.setItem("email", email);
      await loadProfile();
    } catch (err) {
      console.error("Profile save failed", err);
      const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message ?? "Unknown error";
      alert(typeof detail === "object" ? JSON.stringify(detail, null, 2) : detail);
    }
  };

  const deleteProfile = async () => {
    const confirmDelete = window.confirm("Delete your profile?");
    if (!confirmDelete) return;

    const email = localStorage.getItem("selectedEmail") || localStorage.getItem("email");
    try {
      const res = await axios.delete(`${API}/profile/${email}`);
      alert(res.data.message);
      setProfile({ ...blankProfile, email: "" });
      setProfileExists(false);
      localStorage.removeItem("selectedEmail");
      localStorage.removeItem("editing");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.detail || "Unable to delete profile");
    }
  };

  const startEdit = () => {
    setEditing(true);
  };

  const viewProfile = async () => {
    setEditing(false);
    await loadProfile();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <FaUserCircle className="text-8xl text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold">Profile Management</h1>
                <p className="text-gray-500 mt-2">Create, update, and manage your education, experience, skills, and career preferences.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate("/dashboard")} className="bg-slate-700 text-white px-4 py-2 rounded-xl">Back to Dashboard</button>
              <button type="button" onClick={() => navigate("/history")} className="bg-blue-600 text-white px-4 py-2 rounded-xl">View History</button>
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-8 mt-8">
          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <input type="text" name="fullname" placeholder="Full Name" value={profile.fullname} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="headline" placeholder="Headline" value={profile.headline} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="location" placeholder="Location" value={profile.location} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="email" name="email" placeholder="Email" value={profile.email} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="phone" placeholder="Phone Number" value={profile.phone} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="date" name="dob" value={profile.dob} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <select name="gender" value={profile.gender} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`}>
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <textarea rows="3" name="about" placeholder="Short summary about you" value={profile.about} onChange={handleChange} disabled={!isEditable} className={`md:col-span-2 border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Professional Links</h2>
            <div className="grid md:grid-cols-3 gap-5">
              <input type="text" name="linkedin" placeholder="LinkedIn URL" value={profile.linkedin} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="github" placeholder="GitHub URL" value={profile.github} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="portfolio" placeholder="Portfolio URL" value={profile.portfolio} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Education</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <input type="text" name="college" placeholder="College Name" value={profile.college} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="degree" placeholder="Degree" value={profile.degree} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="branch" placeholder="Branch" value={profile.branch} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="cgpa" placeholder="CGPA" value={profile.cgpa} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
              <input type="text" name="graduation" placeholder="Graduation Year" value={profile.graduation} onChange={handleChange} disabled={!isEditable} className={`border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Experience</h2>
            <textarea rows="4" name="experience" placeholder="Describe internships, projects, leadership roles, and technical contributions..." value={profile.experience} onChange={handleChange} disabled={!isEditable} className={`w-full border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Skills</h2>
            <textarea rows="3" name="skills" placeholder="React, Python, SQL, Machine Learning..." value={profile.skills} onChange={handleChange} disabled={!isEditable} className={`w-full border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Certifications</h2>
            <textarea rows="3" name="certifications" placeholder="Infosys AI Internship, AWS..." value={profile.certifications} onChange={handleChange} disabled={!isEditable} className={`w-full border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Projects</h2>
            <textarea rows="3" name="projects" placeholder="Project A, Project B, Project C..." value={profile.projects} onChange={handleChange} disabled={!isEditable} className={`w-full border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
          </div>

          <div className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Career Interests</h2>
            <textarea rows="3" name="career_interest" placeholder="Artificial Intelligence, Full Stack Development..." value={profile.career_interest} onChange={handleChange} disabled={!isEditable} className={`w-full border rounded-xl p-3 ${isEditable ? "bg-white" : "bg-gray-100"}`} />
          </div>

          <div className="flex gap-5">
            {editing || !profileExists ? (
              <>
                <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl">Save Profile</button>
                <button
                  type="button"
                  onClick={async () => {
                    setEditing(false);
                    if (profileExists) {
                      await loadProfile();
                    } else {
                      setProfile({ ...blankProfile, email: localStorage.getItem("email") || "" });
                    }
                  }}
                  className="bg-gray-600 text-white px-8 py-3 rounded-xl"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startEdit} className="bg-green-600 text-white px-8 py-3 rounded-xl">Edit Profile</button>
                <button type="button" onClick={viewProfile} className="bg-slate-500 text-white px-8 py-3 rounded-xl">View Profile</button>
                <button type="button" onClick={deleteProfile} className="bg-red-600 text-white px-8 py-3 rounded-xl">Delete Profile</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
