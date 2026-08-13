import { useEffect, useState } from "react";
import axios from "axios";
import ATSResults from "./ATSResults";

const API = "http://127.0.0.1:8000";

export default function JobDescription() {
  const email = localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "";
  const resumeId = localStorage.getItem("resume_id");

  const [jobs, setJobs] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectionMessage, setSelectionMessage] = useState("");

  const [form, setForm] = useState({
    job_title: "",
    company_name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedJob = localStorage.getItem("selectedJob");
    if (savedJob) {
      try {
        setSelectedJob(JSON.parse(savedJob));
      } catch (err) {
        console.error(err);
      }
    }
    loadJobs();
  }, [email]);

  const loadJobs = async () => {
    if (!email) return;

    try {
      const res = await axios.get(`${API}/job-description/${email}`);
      setJobs(res.data);

      const savedJob = localStorage.getItem("selectedJob");
      if (savedJob) {
        try {
          const parsed = JSON.parse(savedJob);
          const stillExists = res.data.find((job) => String(job.id) === String(parsed.id));
          if (stillExists) {
            setSelectedJob(stillExists);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (res.data.length > 0 && !selectedJob) {
        const firstJob = res.data[0];
        setSelectedJob(firstJob);
        localStorage.setItem("selectedJob", JSON.stringify(firstJob));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Please log in before saving a job description.");
      return;
    }

    if (!form.job_title || !form.description) {
      setSelectionMessage("Job title and description are required.");
      return;
    }

    setSaving(true);

    try {
      let response;
      if (editingId) {
        response = await axios.put(`${API}/job-description/${editingId}`, {
          user_email: email,
          ...form,
        });
        setEditingId(null);
      } else {
        response = await axios.post(`${API}/job-description`, {
          user_email: email,
          ...form,
        });
      }

      const savedJob = {
        id: editingId || response?.data?.id,
        user_email: email,
        job_title: form.job_title,
        company_name: form.company_name,
        description: form.description,
      };

      setSelectedJob(savedJob);
      localStorage.setItem("selectedJob", JSON.stringify(savedJob));
      setSelectionMessage("Job description saved and selected.");

      setForm({
        job_title: "",
        company_name: "",
        description: "",
      });

      await loadJobs();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Failed to save job description";
      setSelectionMessage(msg);
    }
    finally {
      setSaving(false);
    }
  };

  const deleteJob = async (id) => {
    try {
      await axios.delete(`${API}/job-description/${id}`);
      await loadJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const selectJob = (job) => {
    setSelectedJob(job);
    localStorage.setItem("selectedJob", JSON.stringify(job));
    setSelectionMessage(`Selected: ${job.job_title}`);
  };

  const analyzeResume = async (job) => {
    const activeJob = job || selectedJob;

    try {
      const selectedResumeId = resumeId || localStorage.getItem("resume_id");
      if (!selectedResumeId) {
        alert("Please upload a resume first.");
        return;
      }

      if (!activeJob) {
        alert("Please select or add a job description first.");
        return;
      }

      const res = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${activeJob.id}`);
      setAnalysisResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Analysis Failed");
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="text-xl font-bold mb-5">Job Description Management</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded p-2"
            placeholder="Job Title"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
          />

          <input
            className="w-full border rounded p-2"
            placeholder="Company Name"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />

          <textarea
            rows="8"
            className="w-full border rounded p-2"
            placeholder="Paste Job Description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-60">
            {saving ? "Saving..." : (editingId ? "Update Job Description" : "Save Job Description")}
          </button>
          {selectionMessage && (
            <p className="text-sm text-green-600">{selectionMessage}</p>
          )}
        </form>

        <hr className="my-6" />

        <h3 className="font-semibold text-lg mb-3">Saved Job Descriptions</h3>

        {jobs.length === 0 ? (
          <p>No Job Descriptions Found.</p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`border rounded-lg p-4 mb-4 ${selectedJob?.id === job.id ? "border-green-500 bg-green-50" : "border-slate-200"}`}
            >
              <h4 className="font-bold text-lg">{job.job_title}</h4>
              <p className="text-gray-500">{job.company_name}</p>
              <p className="mt-3 whitespace-pre-wrap">{job.description}</p>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => analyzeResume(job)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Analyze Resume
                </button>

                <button
                  onClick={() => {
                    setEditingId(job.id);
                    setForm({
                      job_title: job.job_title,
                      company_name: job.company_name,
                      description: job.description,
                    });
                  }}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => selectJob(job)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded"
                >
                  {selectedJob?.id === job.id ? "Selected" : "Select"}
                </button>

                <button
                  onClick={() => deleteJob(job.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}

        {selectedJob && (
          <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
            <h3 className="font-bold text-green-700">Selected Job</h3>
            <p className="mt-2">
              <b>Title:</b> {selectedJob.job_title}
            </p>
            <p>
              <b>Company:</b> {selectedJob.company_name}
            </p>
          </div>
        )}
      </div>

      <ATSResults result={analysisResult} />
    </>
  );
}