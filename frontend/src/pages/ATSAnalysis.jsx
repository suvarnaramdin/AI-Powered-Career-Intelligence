import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";

const API = "http://127.0.0.1:8000";

export default function ATSAnalysis() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    job_title: "",
    company_name: "",
    description: "",
  });
  const [status, setStatus] = useState({
    type: "info",
    message: "Upload a resume and add or select a job description to start the ATS comparison.",
  });

  useEffect(() => {
    const loadData = async () => {
      if (!email) return;
      try {
        const jobRes = await axios.get(`${API}/job-description/${email}`);
        setJobs(jobRes.data || []);

        const savedJob = localStorage.getItem("selectedJob");
        if (savedJob) {
          try {
            const parsedJob = JSON.parse(savedJob);
            setSelectedJobId(parsedJob.id || "");
          } catch {
            // ignore saved job parse errors
          }
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load existing job data." });
      }
    };

    loadData();
  }, [email]);

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setStatus({ type: "error", message: "Please choose a resume file before uploading it." });
      return;
    }

    if (!email) {
      setStatus({ type: "error", message: "Please sign in before uploading a resume." });
      return;
    }

    setUploadingResume(true);
    setStatus({ type: "info", message: "Uploading and parsing your resume..." });

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("email", email);

      const response = await axios.post(`${API}/resume/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const payload = response.data;
      setSelectedResumeId(payload.resume_id);
      localStorage.setItem("resume_id", payload.resume_id);
      setStatus({ type: "success", message: payload.message || "Resume uploaded and parsed successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Failed to upload resume." });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();

    if (!email) {
      setStatus({ type: "error", message: "Please sign in before saving a job description." });
      return;
    }

    if (!jobForm.job_title || !jobForm.description) {
      setStatus({ type: "error", message: "Job title and description are required." });
      return;
    }

    setSavingJob(true);
    setStatus({ type: "info", message: "Saving your job description..." });

    try {
      const response = await axios.post(`${API}/job-description`, {
        user_email: email,
        ...jobForm,
      });

      const savedJob = {
        id: response.data?.id,
        ...jobForm,
        user_email: email,
      };

      setSelectedJobId(savedJob.id);
      localStorage.setItem("selectedJob", JSON.stringify(savedJob));
      setJobForm({ job_title: "", company_name: "", description: "" });
      const jobRes = await axios.get(`${API}/job-description/${email}`);
      setJobs(jobRes.data || []);
      setStatus({ type: "success", message: "Job description saved and selected for ATS comparison." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Failed to save job description." });
    } finally {
      setSavingJob(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Upload a resume and add or select a job description before analyzing." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Comparing your resume against the selected job description..." });
    try {
      const response = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${selectedJobId}`);
      setAnalysis(response.data);
      setStatus({ type: "success", message: "ATS analysis completed successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Failed to run ATS analysis." });
    } finally {
      setLoading(false);
    }
  };

  const score = analysis?.ats_score || 0;

  return (
    <InsightLayout title="ATS Resume Analysis" subtitle="Upload a resume and add or select a job description to compare ATS fit.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-800">Upload Resume</h3>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleResumeUpload}
                  disabled={uploadingResume}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-70"
                >
                  {uploadingResume ? "Uploading..." : "Upload & Parse Resume"}
                </button>
              </div>
              {resumeFile ? <p className="mt-2 text-sm text-slate-600">Selected file: {resumeFile.name}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-800">Select or Add Job Description</h3>
              <div className="mt-3">
                <label className="text-sm font-medium text-slate-700">
                  Saved Job Descriptions
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      const job = jobs.find((item) => String(item.id) === String(e.target.value));
                      if (job) localStorage.setItem("selectedJob", JSON.stringify(job));
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Choose a saved job</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.job_title} — {job.company_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <form onSubmit={handleSaveJob} className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Job Title"
                  value={jobForm.job_title}
                  onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })}
                />
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Company Name"
                  value={jobForm.company_name}
                  onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                />
                <textarea
                  rows="6"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Paste job description here..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                />
                <button
                  type="submit"
                  disabled={savingJob}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-70"
                >
                  {savingJob ? "Saving..." : "Add Job Description"}
                </button>
              </form>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Analyzing..." : "Compare Resume vs Job Description"}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
              {status.message}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white">
            <div className="flex items-center justify-center">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border-8 border-slate-700" style={{ background: `conic-gradient(#38bdf8 ${score}%, #1e293b 0%)` }}>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 text-3xl font-bold">{score}%</div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-400">Circular ATS Score</p>
          </div>
        </div>

        {analysis ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-1">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">ATS Score</p>
                  <p className="text-3xl font-bold text-blue-700">{analysis.ats_score}%</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-sm text-slate-500">Resume Match Percentage</p>
                  <p className="text-3xl font-bold text-emerald-700">{analysis.match_percentage}%</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">ATS Progress Bar</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{analysis.ats_score}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${analysis.ats_score}%` }}></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Resume Strength</h3>
                <div className="mt-3 h-3 rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500" style={{ width: `${analysis.match_percentage}%` }}></div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800">Matching Keywords</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.matched_skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800">Missing Keywords</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.missing_skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
