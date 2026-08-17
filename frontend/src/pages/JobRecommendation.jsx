import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import { API_BASE_URL } from "../config/api";

const API = API_BASE_URL;

const PORTAL_MAP = {
  linkedin: "https://www.linkedin.com/jobs/search/?keywords=",
  naukri: "https://www.naukri.com/job-search/",
  internshala: "https://internshala.com/internships/",
  indeed: "https://in.indeed.com/jobs?q=",
};

const normalize = (value = "") => String(value).toLowerCase().trim();

const parseSkillTokens = (value = "") =>
  normalize(value)
    .split(/[,\s/|]+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ""))
    .filter(Boolean);

const extractYears = (value = "") => {
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/i);
  if (match) return Number(match[1]);
  if (/fresher/i.test(value)) return 0;
  if (/intern/i.test(value)) return 0;
  return 0;
};

const buildPortalUrl = (portal, job) => {
  const query = encodeURIComponent(`${job.jobTitle} ${job.company} ${job.location}`);
  return `${PORTAL_MAP[portal]}${query}`;
};

const decideBestPortal = (job) => {
  const title = normalize(job?.jobTitle || "");
  const location = normalize(job?.location || "");
  const score = Number(job?.match_percentage || 0);

  if (/(intern|fresher|graduate)/.test(title)) return "internshala";
  if (/remote/.test(location)) return "linkedin";
  if (/(bangalore|hyderabad|chennai|mumbai|pune|delhi|gurugram|noida|kolkata)/.test(location)) return "naukri";
  if (score >= 88) return "linkedin";
  if (score >= 75) return "naukri";
  return "indeed";
};

const getQualificationScore = (resumeQualification = "", jobQualification = "") => {
  const resumeText = normalize(resumeQualification);
  const jobText = normalize(jobQualification);

  if (!jobText || /any/i.test(jobText) || /open/i.test(jobText)) return 100;
  if (!resumeText) return 60;
  if (resumeText.includes(jobText) || jobText.includes(resumeText)) return 100;

  const resumeKeywords = ["btech", "be", "bachelor", "bca", "mca", "mtech", "diploma", "engineering", "degree", "graduate"];
  const jobKeywords = ["btech", "be", "bachelor", "bca", "mca", "mtech", "diploma", "engineering", "degree", "graduate"];

  const overlap = resumeKeywords.filter((keyword) => resumeText.includes(keyword) && jobKeywords.includes(keyword));
  return overlap.length > 0 ? 85 : 60;
};

const getExperienceScore = (resumeExperience = "", jobExperience = "") => {
  const resumeYears = extractYears(resumeExperience);
  const jobYears = extractYears(jobExperience);

  if (jobYears === 0) return 100;
  if (resumeYears >= jobYears) return 100;
  if (resumeYears + 1 >= jobYears) return 85;
  if (resumeYears + 2 >= jobYears) return 70;
  return 50;
};

export default function JobRecommendation() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [filters, setFilters] = useState({ location: "All", experience: "All", salaryRange: "All", company: "All", workMode: "All" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "info", message: "Use your parsed resume profile to find the most relevant jobs." });

  useEffect(() => {
    const loadData = async () => {
      if (!email) return;

      try {
        const [resumeResp, jobsResp] = await Promise.all([
          axios.get(`${API}/resumes/${email}`),
          fetch("/jobs.json"),
        ]);

        const resumeList = resumeResp.data || [];
        const jobsJson = await jobsResp.json();
        setResumes(resumeList);
        setAllJobs(jobsJson || []);

        const savedResumeId = Number(localStorage.getItem("resume_id"));
        if (savedResumeId) {
          setSelectedResumeId(savedResumeId);
        } else if (resumeList[0]?.id) {
          setSelectedResumeId(resumeList[0].id);
          localStorage.setItem("resume_id", String(resumeList[0].id));
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load resume or jobs information." });
      }
    };

    loadData();
  }, [email]);

  const uniqueOptions = useMemo(() => {
    const companies = [...new Set(allJobs.map((job) => job.company).filter(Boolean))].sort();
    const locations = [...new Set(allJobs.map((job) => job.location).filter(Boolean))].sort();
    const salaryRanges = [...new Set(allJobs.map((job) => job.salaryRange).filter(Boolean))].sort();
    const workModes = [...new Set(allJobs.map((job) => job.workMode).filter(Boolean))].sort();
    const experienceLevels = [...new Set(allJobs.map((job) => job.experience).filter(Boolean))].sort();

    return { companies, locations, salaryRanges, workModes, experienceLevels };
  }, [allJobs]);

  const handleRecommendJobs = () => {
    if (!selectedResumeId) {
      setStatus({ type: "error", message: "Please upload or select a resume before recommending jobs." });
      return;
    }

    const selectedResume = resumes.find((resume) => String(resume.id) === String(selectedResumeId));
    if (!selectedResume) {
      setStatus({ type: "error", message: "The selected resume could not be found." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Computing the Top 10 job matches from your parsed resume..." });

    const resumeSkillSet = new Set(parseSkillTokens(selectedResume.parsed_skills || ""));
    const resumeQualification = selectedResume.parsed_degree || "";
    const resumeExperience = selectedResume.parsed_experience || "";

    const scoredJobs = allJobs
      .map((job) => {
        const requiredSkills = job.requiredSkills || [];
        const preferredSkills = job.preferredSkills || [];
        const allJobSkills = [...requiredSkills, ...preferredSkills];
        const matchingSkills = allJobSkills.filter((skill) => resumeSkillSet.has(normalize(skill)));
        const missingSkills = allJobSkills.filter((skill) => !resumeSkillSet.has(normalize(skill)));

        const skillCoverage = allJobSkills.length ? (matchingSkills.length / allJobSkills.length) * 100 : 0;
        const qualificationScore = getQualificationScore(resumeQualification, job.qualification);
        const experienceScore = getExperienceScore(resumeExperience, job.experience);

        const match_percentage = Math.round(
          skillCoverage * 0.6 + qualificationScore * 0.2 + experienceScore * 0.2
        );

        return {
          ...job,
          matchingSkills,
          missingSkills,
          match_percentage,
        };
      })
      .sort((a, b) => b.match_percentage - a.match_percentage)
      .slice(0, 10);

    setRecommendedJobs(scoredJobs);
    setLoading(false);
    setStatus({ type: "success", message: `Found ${scoredJobs.length} relevant job recommendations.` });
  };

  const visibleJobs = recommendedJobs.filter((job) => {
    const locationMatch = filters.location === "All" || job.location === filters.location;
    const experienceMatch = filters.experience === "All" || job.experience === filters.experience;
    const salaryMatch = filters.salaryRange === "All" || job.salaryRange === filters.salaryRange;
    const companyMatch = filters.company === "All" || job.company === filters.company;
    const workModeMatch = filters.workMode === "All" || job.workMode === filters.workMode;

    return locationMatch && experienceMatch && salaryMatch && companyMatch && workModeMatch;
  });

  const fallbackJobs = recommendedJobs.slice(0, 5);

  const openPortal = (job) => {
    window.open(buildPortalUrl(decideBestPortal(job), job), "_blank", "noopener,noreferrer");
  };

  return (
    <InsightLayout title="Job Recommendation" subtitle="Recommend suitable jobs based on your parsed resume profile.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Objective</h3>
          <p className="mt-2 text-lg text-slate-700">Recommend suitable jobs based on user skills and qualifications.</p>
          <h3 className="mt-6 text-2xl font-bold text-slate-800">Features</h3>
          <ul className="mt-3 space-y-2 text-lg text-slate-700">
            <li>• Match Skills</li>
            <li>• Match Qualification</li>
            <li>• Match Experience</li>
            <li>• Filter by Location</li>
            <li>• Filter by Salary Range</li>
            <li>• Filter by Company</li>
            <li>• Filter by Work Mode</li>
            <li>• Recommend Jobs</li>
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
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Choose a stored resume</option>
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.filename || `Resume #${resume.id}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <select value={filters.location} onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2">
                <option value="All">Location: All</option>
                {uniqueOptions.locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <select value={filters.experience} onChange={(e) => setFilters((prev) => ({ ...prev, experience: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2">
                <option value="All">Experience: All</option>
                {uniqueOptions.experienceLevels.map((experience) => (
                  <option key={experience} value={experience}>{experience}</option>
                ))}
              </select>
              <select value={filters.salaryRange} onChange={(e) => setFilters((prev) => ({ ...prev, salaryRange: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2">
                <option value="All">Salary: All</option>
                {uniqueOptions.salaryRanges.map((salaryRange) => (
                  <option key={salaryRange} value={salaryRange}>{salaryRange}</option>
                ))}
              </select>
              <select value={filters.company} onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2">
                <option value="All">Company: All</option>
                {uniqueOptions.companies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              <select value={filters.workMode} onChange={(e) => setFilters((prev) => ({ ...prev, workMode: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2">
                <option value="All">Work Mode: All</option>
                {uniqueOptions.workModes.map((workMode) => (
                  <option key={workMode} value={workMode}>{workMode}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRecommendJobs}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Finding Jobs..." : "Recommend Jobs"}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
              {status.message}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">Resume Snapshot</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Selected Resume</p>
                <p>{selectedResumeId ? `Resume ID: ${selectedResumeId}` : "No resume selected"}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="font-semibold text-white">Source</p>
                <p>Uses the existing parsed resume profile and the static jobs dataset from the frontend.</p>
              </div>
            </div>
          </div>
        </div>

        {recommendedJobs.length > 0 ? (
          <div className="mt-8 space-y-4">
            {visibleJobs.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <h3 className="text-lg font-semibold">No jobs match the selected filters.</h3>
                <p className="mt-2">Showing the closest matching opportunities instead.</p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {(visibleJobs.length > 0 ? visibleJobs : fallbackJobs).map((job) => (
                <div key={job.jobId} className="rounded-2xl border border-slate-200 p-5 shadow-sm bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{job.jobTitle}</h3>
                      <p className="text-sm text-slate-500">{job.company}</p>
                    </div>
                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{job.match_percentage}%</div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Company:</span> {job.company}</p>
                    <p><span className="font-semibold text-slate-800">Location:</span> {job.location}</p>
                    <p><span className="font-semibold text-slate-800">Work Mode:</span> {job.workMode}</p>
                    <p><span className="font-semibold text-slate-800">Salary Range:</span> {job.salaryRange}</p>
                    <p><span className="font-semibold text-slate-800">Match Percentage:</span> {job.match_percentage}%</p>
                    <p><span className="font-semibold text-slate-800">Matching Skills:</span> {job.matchingSkills.join(", ") || "No direct match"}</p>
                    <p><span className="font-semibold text-slate-800">Missing Skills:</span> {job.missingSkills.join(", ") || "None"}</p>
                    <p><span className="font-semibold text-slate-800">Experience Required:</span> {job.experience}</p>
                    <p><span className="font-semibold text-slate-800">Qualification Required:</span> {job.qualification}</p>
                  </div>

                  <button onClick={() => openPortal(job)} className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
                    Apply on {decideBestPortal(job).charAt(0).toUpperCase() + decideBestPortal(job).slice(1)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
