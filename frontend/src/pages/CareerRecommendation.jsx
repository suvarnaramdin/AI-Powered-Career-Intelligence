import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";

const API = "http://127.0.0.1:8000";

export default function CareerRecommendation() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    type: "info",
    message: "Upload a resume and link a job description to recommend suitable career paths.",
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
        setStatus({ type: "error", message: "Unable to load job descriptions." });
      }
    };

    loadData();
  }, [email]);

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Please upload a resume and select a job description first." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Generating career recommendations..." });

    try {
      const response = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${selectedJobId}`);
      setAnalysis(response.data);
      setStatus({ type: "success", message: "Career recommendations generated." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Unable to generate career recommendations." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InsightLayout title="Career Recommendation" subtitle="Recommend suitable career paths based on the user's profile and resume.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Objective</h3>
          <p className="mt-2 text-lg text-slate-700">Recommend suitable career paths based on the user's profile and resume.</p>
          <h3 className="mt-6 text-2xl font-bold text-slate-800">Features</h3>
          <ul className="mt-3 space-y-2 text-lg text-slate-700">
            <li>• Analyze Education</li>
            <li>• Analyze Skills</li>
            <li>• Analyze Experience</li>
            <li>• Recommend Career Roles</li>
          </ul>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-sm font-medium text-slate-700">
                Select Job Description
                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    const job = jobs.find((item) => String(item.id) === String(e.target.value));
                    if (job) localStorage.setItem("selectedJob", JSON.stringify(job));
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Choose a saved job description</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_title} — {job.company_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Analyzing..." : "Recommend Career Roles"}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
              {status.message}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">Current ATS Inputs</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Resume</p>
                <p>{selectedResumeId ? `Resume ID: ${selectedResumeId}` : "No resume linked yet"}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Job Description</p>
                <p>{selectedJobId ? `Job ID: ${selectedJobId}` : "No job linked yet"}</p>
              </div>
            </div>
          </div>
        </div>

        {analysis ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {analysis.career_paths?.map((role) => (
              <div key={role} className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-800">{role}</h3>
                <p className="mt-2 text-sm text-slate-600">Recommended career role based on your resume alignment and profile signals.</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
