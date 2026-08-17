import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import { API_BASE_URL } from "../config/api";

const API = API_BASE_URL;

export default function CareerRecommendation() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const token = localStorage.getItem("token") || "";
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    type: "info",
    message: "Upload a resume and select a job description to see personalized career recommendations.",
  });

  useEffect(() => {
    const loadData = async () => {
      if (!email) return;
      try {
        const [resumeRes, jobRes] = await Promise.all([
          axios.get(`${API}/resumes/${email}`),
          axios.get(`${API}/job-description/${email}`),
        ]);
        
        setResumes(resumeRes.data || []);
        setJobs(jobRes.data || []);

        // Auto-select first resume if available
        if (resumeRes.data && resumeRes.data.length > 0 && !selectedResumeId) {
          setSelectedResumeId(resumeRes.data[0].id);
          localStorage.setItem("resume_id", resumeRes.data[0].id);
        }

        // Auto-select first job if available
        const savedJob = localStorage.getItem("selectedJob");
        if (savedJob) {
          try {
            const parsedJob = JSON.parse(savedJob);
            const match = (jobRes.data || []).find((j) => String(j.id) === String(parsedJob.id));
            if (match) setSelectedJobId(match.id);
          } catch {
            if (jobRes.data && jobRes.data.length > 0) {
              setSelectedJobId(jobRes.data[0].id);
              localStorage.setItem("selectedJob", JSON.stringify(jobRes.data[0]));
            }
          }
        } else if (jobRes.data && jobRes.data.length > 0) {
          setSelectedJobId(jobRes.data[0].id);
          localStorage.setItem("selectedJob", JSON.stringify(jobRes.data[0]));
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load resumes or job descriptions." });
      }
    };

    loadData();
  }, [email]);

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Please select both a resume and a job description." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Generating personalized career recommendations..." });

    try {
      const response = await axios.post(
        `${API}/api/career-recommendations`,
        {
          resume_id: parseInt(selectedResumeId),
          job_description_id: parseInt(selectedJobId),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setAnalysis(response.data);
      setStatus({ type: "success", message: "Career recommendations generated successfully." });
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item?.msg || item?.error || "Validation error").join(". ")
          : "Unable to generate career recommendations.";

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InsightLayout 
      title="Career Recommendation" 
      subtitle="Personalized career recommendations based on your resume and selected job description."
    >
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">How It Works</h3>
          <p className="mt-2 text-lg text-slate-700">
            Select your resume and target job description, then we'll analyze your background and recommend 
            the most suitable career paths based on skill matching, experience, and market trends.
          </p>
          <h3 className="mt-6 text-2xl font-bold text-slate-800">What You'll Get</h3>
          <ul className="mt-3 space-y-2 text-lg text-slate-700">
            <li>• Personalized career recommendations ranked by relevance</li>
            <li>• Match percentage for each career path</li>
            <li>• Your matched skills vs. missing skills for each role</li>
            <li>• Detailed explanations of why roles are recommended</li>
          </ul>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-sm font-medium text-slate-700">
                Select Resume
                <select
                  value={selectedResumeId}
                  onChange={(e) => {
                    setSelectedResumeId(e.target.value);
                    localStorage.setItem("resume_id", e.target.value);
                    setAnalysis(null); // Clear results when resume changes
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Choose a resume</option>
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.filename}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-sm font-medium text-slate-700">
                Select Job Description
                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    const job = jobs.find((item) => String(item.id) === String(e.target.value));
                    if (job) localStorage.setItem("selectedJob", JSON.stringify(job));
                    setAnalysis(null); // Clear results when job changes
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Choose a job description</option>
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
              disabled={loading || !selectedResumeId || !selectedJobId}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70 hover:bg-blue-700 transition"
            >
              {loading ? "Analyzing..." : "Generate Recommendations"}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : 
              status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : 
              "border-blue-200 bg-blue-50 text-blue-700"
            }`}>
              {status.message}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">Analysis Context</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Resume</p>
                <p>{selectedResumeId ? `ID: ${selectedResumeId}` : "Not selected"}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Target Job</p>
                <p>{selectedJobId ? `ID: ${selectedJobId}` : "Not selected"}</p>
              </div>
            </div>
          </div>
        </div>

        {analysis ? (
          <div className="mt-8 space-y-8">
            {/* Target Role Summary */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-6">
              <h3 className="text-2xl font-bold text-slate-800">Target Role</h3>
              <p className="mt-2 text-lg text-slate-700">{analysis.target_role}</p>
              <p className="mt-3 text-sm text-slate-600">Best Matching Path: <span className="font-semibold text-blue-700">{analysis.best_matching_path}</span></p>
            </div>

            {/* Career Insights */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800">AI Career Insights</h3>
              <p className="mt-4 text-slate-700 leading-relaxed">{analysis.insights}</p>
            </div>

            {/* Top Strengths */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800">Top Strengths</h3>
                <ul className="mt-4 space-y-2">
                  {analysis.top_strengths && analysis.top_strengths.length > 0 ? (
                    analysis.top_strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-green-600 font-bold mt-1">✓</span>
                        <span className="text-slate-700">{strength}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500">No strengths identified</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800">Areas for Improvement</h3>
                <ul className="mt-4 space-y-2">
                  {analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 ? (
                    analysis.areas_for_improvement.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span className="text-slate-700">{area}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500">No gaps identified</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Career Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">Recommended Career Paths</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {analysis.recommendations.map((role, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition">
                      <div className="flex items-start justify-between">
                        <h4 className="text-lg font-semibold text-slate-800">{role.title}</h4>
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                          {Math.round(role.match_percentage)}% Match
                        </span>
                      </div>
                      
                      <p className="mt-3 text-slate-700">{role.reason}</p>
                      
                      <div className="mt-4 grid gap-3 text-sm">
                        {role.matched_skills && role.matched_skills.length > 0 && (
                          <div>
                            <p className="font-semibold text-green-700">Matched Skills:</p>
                            <p className="text-slate-600">{role.matched_skills.join(", ")}</p>
                          </div>
                        )}
                        
                        {role.missing_skills && role.missing_skills.length > 0 && (
                          <div>
                            <p className="font-semibold text-orange-700">Missing Skills:</p>
                            <p className="text-slate-600">{role.missing_skills.join(", ")}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-slate-600">Salary Range</p>
                          <p className="font-semibold text-slate-800">{role.average_salary}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-slate-600">Demand</p>
                          <p className="font-semibold text-slate-800">{role.future_demand}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-6">
                <p className="text-yellow-800">No relevant career recommendations found. Try adjusting your resume or job selection.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
            <p className="text-slate-600 text-lg">
              {selectedResumeId && selectedJobId 
                ? "Click 'Generate Recommendations' to see personalized career suggestions." 
                : "Select a resume and job description to get started."}
            </p>
          </div>
        )}
      </div>
    </InsightLayout>
  );
}
