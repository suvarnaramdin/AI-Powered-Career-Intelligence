import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";

const API = "http://127.0.0.1:8000";

const LEARNING_GUIDES = {
  python: [
    { platform: "Coursera", website: "https://www.coursera.org" },
    { platform: "Real Python", website: "https://realpython.com" },
  ],
  javascript: [
    { platform: "freeCodeCamp", website: "https://www.freecodecamp.org" },
    { platform: "MDN Web Docs", website: "https://developer.mozilla.org" },
  ],
  react: [
    { platform: "React Docs", website: "https://react.dev" },
    { platform: "Frontend Mentor", website: "https://www.frontendmentor.io" },
  ],
  "node.js": [
    { platform: "Node.js Docs", website: "https://nodejs.org" },
    { platform: "Express.js", website: "https://expressjs.com" },
  ],
  aws: [
    { platform: "AWS Skill Builder", website: "https://skillbuilder.aws" },
    { platform: "Coursera", website: "https://www.coursera.org" },
  ],
  docker: [
    { platform: "Docker Docs", website: "https://docs.docker.com" },
    { platform: "Play with Docker", website: "https://labs.play-with-docker.com" },
  ],
  kubernetes: [
    { platform: "Kubernetes.io", website: "https://kubernetes.io" },
    { platform: "Google Cloud Skills Boost", website: "https://www.cloudskillsboost.google" },
  ],
  sql: [
    { platform: "SQLBolt", website: "https://sqlbolt.com" },
    { platform: "Mode Analytics", website: "https://mode.com" },
  ],
  "machine learning": [
    { platform: "Coursera", website: "https://www.coursera.org" },
    { platform: "Kaggle", website: "https://www.kaggle.com" },
  ],
};

export default function SkillGapAnalysis() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    type: "info",
    message: "Upload a resume and select the ATS job description to generate the skill gap report.",
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

        const savedJob = localStorage.getItem("selectedJob");
        if (savedJob) {
          try {
            const parsedJob = JSON.parse(savedJob);
            setSelectedJobId(parsedJob.id || "");
          } catch {
            // ignore saved job parse errors
          }
        }

        if (resumeRes.data?.length && !selectedResumeId) {
          setSelectedResumeId(String(resumeRes.data[0].id));
          localStorage.setItem("resume_id", String(resumeRes.data[0].id));
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load saved resumes and jobs." });
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

      const resumeRes = await axios.get(`${API}/resumes/${email}`);
      setResumes(resumeRes.data || []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Failed to upload resume." });
    } finally {
      setUploadingResume(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Upload a resume and select the ATS job description first." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Generating your skill gap report..." });

    try {
      const response = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${selectedJobId}`);
      const payload = response.data;
      setAnalysis(payload);
      localStorage.setItem("skillGapAnalysis", JSON.stringify(payload));
      setStatus({ type: "success", message: "Skill gap report generated successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Unable to compute skill gap analysis." });
    } finally {
      setLoading(false);
    }
  };

  const selectedResume = resumes.find((resume) => String(resume.id) === String(selectedResumeId));
  const selectedJob = jobs.find((job) => String(job.id) === String(selectedJobId));

  const matchingSkills = analysis?.matched_skills || [];
  const missingSkills = analysis?.missing_skills || [];
  const skillGapSummary = analysis?.skill_gap_analysis || [];

  return (
    <InsightLayout title="Skill Gap Analysis" subtitle="Compare the ATS-selected resume with the job description and generate a skill gap report.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Identify the skills required by the job but missing in the candidate's resume.</h3>
          <p className="mt-3 text-sm text-slate-600">Features</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>• Extract Resume Skills</li>
            <li>• Extract Job Description Skills</li>
            <li>• Compare Skills</li>
            <li>• Display Missing Skills</li>
            <li>• Suggest Skills to Learn</li>
          </ul>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
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
                  {uploadingResume ? "Uploading..." : "Upload Resume"}
                </button>
              </div>
              {selectedResume ? <p className="mt-2 text-sm text-slate-600">Linked ATS resume: {selectedResume.filename}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-800">Select Job Description</h3>
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  const job = jobs.find((item) => String(item.id) === String(e.target.value));
                  if (job) localStorage.setItem("selectedJob", JSON.stringify(job));
                }}
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">Choose a saved job description</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_title} — {job.company_name}
                  </option>
                ))}
              </select>
              {selectedJob ? <p className="mt-2 text-sm text-slate-600">Linked ATS job: {selectedJob.job_title} — {selectedJob.company_name}</p> : null}
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Generating..." : "Generate Skill Gap Report"}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
              {status.message}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">ATS Linked Inputs</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Resume</p>
                <p>{selectedResume?.filename || "No resume linked yet"}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Job Description</p>
                <p>{selectedJob ? `${selectedJob.job_title} — ${selectedJob.company_name}` : "No job linked yet"}</p>
              </div>
            </div>
          </div>
        </div>

        {analysis ? (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm text-slate-500">Skill Gap Percentage</p>
                <p className="text-3xl font-bold text-blue-700">{analysis.match_percentage}%</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-slate-500">ATS Score</p>
                <p className="text-3xl font-bold text-emerald-700">{analysis.ats_score}%</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Extract Resume Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.resume_skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Extract Job Description Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.job_skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">{skill}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Compare Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchingSkills.length > 0 ? matchingSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">{skill}</span>
                  )) : <p className="text-sm text-slate-500">No matching skills found.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Display Missing Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingSkills.length > 0 ? missingSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700">{skill}</span>
                  )) : <p className="text-sm text-slate-500">No missing skills found.</p>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Suggest Skills to Learn</h3>
              <div className="mt-4 space-y-3">
                {missingSkills.length > 0 ? missingSkills.map((skill) => {
                  const platformList = LEARNING_GUIDES[skill] || [];
                  return (
                    <div key={skill} className="rounded-xl bg-amber-50 p-3">
                      <p className="font-semibold text-amber-700">{skill}</p>
                      {platformList.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {platformList.map((item) => (
                            <a key={`${skill}-${item.platform}`} href={item.website} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 border border-amber-200">
                              {item.platform}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">No direct learning platform mapping available yet.</p>
                      )}
                    </div>
                  );
                }) : <p className="text-sm text-slate-500">No learning suggestions yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Skill Gap Detail</h3>
              <div className="mt-3 space-y-2">
                {skillGapSummary.map((item) => (
                  <div key={item.skill} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.skill}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${item.status === "matched" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
