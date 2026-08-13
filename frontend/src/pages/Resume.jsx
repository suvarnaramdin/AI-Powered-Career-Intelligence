import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaFileUpload, FaArrowLeft, FaCheckCircle } from "react-icons/fa";
const API = "http://127.0.0.1:8000";

export default function Resume() {
  const navigate = useNavigate();
  const email =
  localStorage.getItem("selectedEmail") ||
  localStorage.getItem("email") ||
  "";
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resumes, setResumes] = useState([]);
  const [parsedResume, setParsedResume] = useState(null);
  const [uploadedResumeId, setUploadedResumeId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [compareAnalysis, setCompareAnalysis] = useState(null);
  const [resumeJobSelection, setResumeJobSelection] = useState({});
  const [compareResults, setCompareResults] = useState({});
  const [completion, setCompletion] = useState(0);
  const [editingId, setEditingId] = useState(null);

  const loadResumes = async () => {
    if (!email) return;

    try {
        const res = await axios.get(`${API}/resumes/${email}`);

        console.log("Email:", email);
        console.log("API Response:", res.data);

        setResumes(res.data);

    } catch (err) {
        console.log(err);
    }
};

  useEffect(() => {
    loadResumes();
    const loadJobs = async () => {
      if (!email) return;
      try {
        const res = await axios.get(`${API}/job-description/${email}`);
        setJobs(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadJobs();
    if (email) {
      axios.get(`${API}/profile/${email}/completion`).then((res) => setCompletion(res.data.completion_percentage || 0)).catch(() => setCompletion(0));
    }
  }, [email]);


  const compareUploadedResumeWithSelectedJob = async (resumeId) => {
    if (!resumeId) {
      setMessage("Upload a resume first before comparing.");
      return;
    }
    if (!selectedJobId) {
      alert("Select a job from the dropdown to compare with.");
      return;
    }

    try {
      const res = await axios.post(`${API}/ats/analyze/${resumeId}/${selectedJobId}`);
      setCompareAnalysis(res.data);
      setMessage("ATS comparison completed.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to run ATS comparison.");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a resume file to upload.");
      return;
    }
    if (!email) {
      setMessage("Please sign in or select your profile email before uploading.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      if (selectedJobId) {
        formData.append("job_id", selectedJobId);
      }

      const response = await axios.post(`${API}/resume/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const payload = response.data;
      setParsedResume(payload.parsed_data);
      setUploadedResumeId(payload.resume_id);
      setMessage(payload.message || "Resume uploaded successfully.");
      if (payload.analysis) {
        setCompareAnalysis(payload.analysis);
      }
      localStorage.setItem("resume_id", payload.resume_id);
      await loadResumes();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.detail || "Failed to upload resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resumeId) => {
    const confirmDelete = window.confirm("Delete this resume entry?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/resume/${resumeId}`);
      setMessage("Resume deleted successfully.");
      await loadResumes();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to delete resume");
    }
  };

  const handleView = async (resume) => {
    try {
      const response = await axios.get(`${API}/resume/${resume.id}/view`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers["content-type"] || "application/pdf" }));
      window.open(url, "_blank");
      setMessage("Resume opened in a new tab.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to open resume");
    }
  };

  const analyzeResumeItem = async (resumeId, jobId) => {
    if (!jobId) {
      alert("Please select a job description to compare with.");
      return;
    }

    try {
      const res = await axios.post(`${API}/ats/analyze/${resumeId}/${jobId}`);
      setCompareResults((prev) => ({ ...prev, [resumeId]: res.data }));
    } catch (err) {
      console.error(err);
      alert("Analysis failed for selected resume.");
    }
  };

  const handleDownload = async (resume) => {
    try {
      const response = await axios.get(`${API}/resume/${resume.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", resume.filename || "resume.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Resume downloaded successfully.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to download resume");
    }
  };

  const completionPercentage = completion;
  const selectedJob = jobs.find((j) => String(j.id) === String(selectedJobId));

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-blue-600 font-semibold mb-3"><FaArrowLeft />Back to Dashboard</button>
            <h1 className="text-3xl font-bold text-slate-800">Resume Upload & Intelligence</h1>
            <p className="text-slate-500 mt-2">Upload PDF or DOC files, parse resume content, and store structured career insights securely.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Upload New Resume</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <label className="block border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer bg-blue-50">
                <FaFileUpload className="mx-auto text-4xl text-blue-600 mb-3" />
                <span className="text-lg font-semibold text-slate-700">Choose PDF or DOC file</span>
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              </label>
                <div className="mt-3">
                  <label className="text-sm font-medium">Optional: Compare with Job Description</label>
                  <div className="flex gap-2 items-center mt-2">
                    <select value={selectedJobId || ""} onChange={(e) => setSelectedJobId(e.target.value)} className="flex-1 border rounded p-2">
                      <option value="">-- Select a saved job (optional) --</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>{j.job_title} — {j.company_name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => navigate('/job-description')} className="text-sm text-blue-600">Manage</button>
                  </div>
                </div>
              {file && <p className="text-sm text-slate-600">Selected file: {file.name}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">
                {loading ? "Uploading..." : "Upload & Parse Resume"}
              </button>
            </form>
            {message && <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-green-700">{message}</div>}
          </div>

          <div className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Parsed Resume Preview</h2>
            {parsedResume ? (
              <div className="space-y-4 text-sm text-slate-600">
                <div className="space-y-3">
                  <p><span className="font-semibold text-slate-800">Name:</span> {parsedResume.name || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Email:</span> {parsedResume.email || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Phone:</span> {parsedResume.phone || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Skills:</span> {parsedResume.skills || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">College:</span> {parsedResume.college || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Degree:</span> {parsedResume.degree || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Experience:</span> {parsedResume.experience || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Certifications:</span> {parsedResume.certifications || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Projects:</span> {parsedResume.projects || "N/A"}</p>
                  <p><span className="font-semibold text-slate-800">Summary:</span> {parsedResume.summary || "N/A"}</p>
                </div>

                {compareAnalysis && (
                  <div className="mt-4 bg-white border rounded p-4">
                    <h4 className="font-semibold">ATS Quick Comparison</h4>
                    <div className="flex gap-4 mt-2">
                      <div className="p-3 bg-green-50 rounded">
                        <div className="text-sm text-gray-600">ATS Score</div>
                        <div className="text-2xl font-bold">{compareAnalysis.ats_score}%</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        <div className="text-sm text-gray-600">Match %</div>
                        <div className="text-2xl font-bold">{compareAnalysis.match_percentage}%</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h5 className="font-semibold">Skill Gap Analysis</h5>
                      {compareAnalysis.skill_gap_analysis && compareAnalysis.skill_gap_analysis.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {compareAnalysis.skill_gap_analysis.map((item) => (
                            <div key={item.skill} className={`rounded p-2 text-sm ${item.status === 'matched' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              <div className="font-semibold">{item.skill}</div>
                              <div className="text-xs mt-1">{item.status === 'matched' ? 'Matched in your resume' : 'Missing from your resume'}: {item.recommendation}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 mt-2">No skill-gap analysis available.</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <h5 className="font-semibold">Missing Skills</h5>
                      {compareAnalysis.missing_skills && compareAnalysis.missing_skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {compareAnalysis.missing_skills.map(s => <div key={s} className="bg-red-50 rounded p-2">{s}</div>)}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 mt-2">No missing skills detected.</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <h5 className="font-semibold">Suggested Skills to Learn</h5>
                      {compareAnalysis.learning_resources && compareAnalysis.learning_resources.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-slate-600 mt-2">
                          {compareAnalysis.learning_resources.map(r => <li key={r}>{r}</li>)}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-600 mt-2">No specific learning suggestions available.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2"><FaCheckCircle className="text-green-500" /><span>Secure file storage</span></div>
                <div className="flex items-center gap-2"><FaCheckCircle className="text-green-500" /><span>Structured resume parsing</span></div>
                <div className="flex items-center gap-2"><FaCheckCircle className="text-green-500" /><span>Career-ready dashboards</span></div>
                <div className="flex items-center gap-2"><FaCheckCircle className="text-green-500" /><span>Professional internship-ready UI</span></div>
              </div>
            )}
          </div>
        </div>

        {compareAnalysis && (
          <div className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">ATS Comparison Result</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded">
                <h4 className="font-semibold">ATS Score</h4>
                <p className="text-2xl font-bold">{compareAnalysis.ats_score}%</p>
              </div>
              <div className="p-4 bg-blue-50 rounded">
                <h4 className="font-semibold">Match %</h4>
                <p className="text-2xl font-bold">{compareAnalysis.match_percentage}%</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Matched Skills</h4>
                {compareAnalysis.matched_skills.map((s) => <div key={s} className="bg-green-50 rounded p-2 mb-2">{s}</div>)}
              </div>
              <div>
                <h4 className="font-semibold text-red-700 mb-2">Missing Skills</h4>
                {compareAnalysis.missing_skills.map((s) => <div key={s} className="bg-red-50 rounded p-2 mb-2">{s}</div>)}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Skill Gap Analysis</h4>
              {compareAnalysis.skill_gap_analysis?.length > 0 ? (
                <div className="space-y-2">
                  {compareAnalysis.skill_gap_analysis.map((item) => (
                    <div key={item.skill} className={`rounded p-3 text-sm ${item.status === 'matched' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <div className="font-semibold">{item.skill}</div>
                      <div className="text-xs mt-1">{item.status === 'matched' ? 'Matched in your resume' : 'Missing from your resume'}: {item.recommendation}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No skill-gap analysis available.</p>
              )}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Strengths</h4>
              {compareAnalysis.strengths.map((it) => <div key={it} className="bg-green-50 rounded p-2 mb-2">{it}</div>)}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Suggestions</h4>
              {compareAnalysis.suggestions.map((it) => <div key={it} className="bg-yellow-50 rounded p-2 mb-2">{it}</div>)}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Recommended Career Paths</h4>
              <div className="flex flex-wrap gap-2">
                {compareAnalysis.career_paths?.length > 0 ? (
  compareAnalysis.career_paths.map((c) => (
    <div key={c} className="bg-purple-50 rounded p-2">
      {c}
    </div>
  ))
) : (
  <p>No career recommendations available.</p>
)}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Suggested Learning</h4>
              {compareAnalysis.learning_resources?.length > 0 ? (
                compareAnalysis.learning_resources.map((r) => <div key={r} className="bg-amber-50 rounded p-2 mb-2">{r}</div>)
              ) : (
                <p>No learning resources available.</p>
              )}
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded">
                <h4 className="font-semibold mb-2">Expected Salary</h4>
                <p className="text-xl font-bold">{compareAnalysis.expected_salary || "₹6L–₹12L"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded">
                <h4 className="font-semibold mb-2">Projects to Strengthen Resume</h4>
                {compareAnalysis.recommended_projects?.length > 0 ? (
                  compareAnalysis.recommended_projects.map((pr) => <div key={pr} className="bg-white rounded p-2 mb-2">{pr}</div>)
                ) : (
                  <p className="text-sm text-slate-600">Add one strong project and highlight technologies used.</p>
                )}
              </div>
            </div>
          </div>
        )}


        <div className="bg-white rounded-3xl shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-800">Uploaded Resumes</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Profile completion</span>
              <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${completionPercentage}%` }}></div>
              </div>
              <span className="text-sm font-semibold text-slate-700">{completionPercentage}%</span>
            </div>
          </div>
          {resumes.length === 0 ? (
            <p className="text-slate-500">No resumes uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {resumes.map((item) => (
                <div key={item.id} className="border rounded-2xl p-4 bg-slate-50">
                  <div className="flex justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">{item.filename}</h3>
                      <p className="text-sm text-slate-500">Parsed Name: {item.parsed_name || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{item.uploaded_at?.slice(0, 10)}</span>
                        <select value={resumeJobSelection[item.id] || selectedJobId || ""} onChange={(e) => setResumeJobSelection(prev => ({...prev, [item.id]: e.target.value}))} className="text-sm border rounded px-2 py-1">
                          <option value="">Compare with job (optional)</option>
                          {jobs.map(j => <option key={j.id} value={j.id}>{j.job_title} — {j.company_name}</option>)}
                        </select>
                        <button onClick={() => analyzeResumeItem(item.id, resumeJobSelection[item.id] || selectedJobId)} className="text-sm bg-emerald-500 text-white px-3 py-1 rounded-lg">Compare</button>
                      <label className="text-sm bg-amber-600 text-white px-3 py-1 rounded-lg cursor-pointer">
                        Replace
                        <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={async (e) => {
                          const selected = e.target.files?.[0];
                          if (!selected) return;
                          const formData = new FormData();
                          formData.append("file", selected);
                          formData.append("email", email);
                          try {
                            await axios.put(`${API}/resume/${item.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
                            setMessage("Resume replaced successfully.");
                            await loadResumes();
                          } catch (err) {
                            setMessage(err.response?.data?.detail || "Failed to replace resume");
                          }
                        }} />
                      </label>
                      <button onClick={() => handleView(item)} className="text-sm bg-sky-600 text-white px-3 py-1 rounded-lg">View</button>
                      <button onClick={() => handleDownload(item)} className="text-sm bg-emerald-600 text-white px-3 py-1 rounded-lg">Download</button>
                      <button onClick={() => handleDelete(item.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
                    </div>
                  </div>
                    <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                    <p><span className="font-semibold">Email:</span> {item.parsed_email || "N/A"}</p>
                    <p><span className="font-semibold">Phone:</span> {item.parsed_phone || "N/A"}</p>
                    <p><span className="font-semibold">Skills:</span> {item.parsed_skills || "N/A"}</p>
                    <p><span className="font-semibold">College:</span> {item.parsed_college || "N/A"}</p>
                    <p><span className="font-semibold">Certifications:</span> {item.parsed_certifications || "N/A"}</p>
                    <p><span className="font-semibold">Projects:</span> {item.parsed_projects || "N/A"}</p>
                  </div>
                    {compareResults[item.id] && (
                      <div className="mt-4 bg-white border rounded p-4">
                        <h4 className="font-semibold">ATS Comparison</h4>
                        <div className="flex gap-4 mt-2">
                          <div className="p-3 bg-green-50 rounded">
                            <div className="text-sm text-gray-600">ATS Score</div>
                            <div className="text-2xl font-bold">{compareResults[item.id].ats_score}%</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded">
                            <div className="text-sm text-gray-600">Match %</div>
                            <div className="text-2xl font-bold">{compareResults[item.id].match_percentage}%</div>
                          </div>
                        </div>
                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                          <div>
                            <h5 className="font-semibold text-green-700">Matched Skills</h5>
                            {compareResults[item.id].matched_skills.map(s => <div key={s} className="bg-green-50 rounded p-2 mt-2">{s}</div>)}
                          </div>
                          <div>
                            <h5 className="font-semibold text-red-700">Missing Skills</h5>
                            {compareResults[item.id].missing_skills.map(s => <div key={s} className="bg-red-50 rounded p-2 mt-2">{s}</div>)}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
