export default function ModuleAnalysisControls({
  resumes,
  jobs,
  selectedResumeId,
  selectedJobId,
  onResumeChange,
  onJobChange,
  onRun,
  loading,
  buttonLabel,
  status,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Select uploaded resume
          <select
            value={selectedResumeId}
            onChange={onResumeChange}
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

        <label className="text-sm font-medium text-slate-700">
          Select job description
          <select
            value={selectedJobId}
            onChange={onJobChange}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="">Choose a job</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.job_title} — {job.company_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={onRun}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
      >
        {loading ? "Analyzing..." : buttonLabel}
      </button>

      {status ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : status.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
