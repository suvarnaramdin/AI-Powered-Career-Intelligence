import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import ModuleAnalysisControls from "../components/ModuleAnalysisControls";
import CareerRoadmap from "../components/CareerRoadmap";
import ErrorBoundary from "../components/ErrorBoundary";

const API = "http://127.0.0.1:8000";

function formatSalary(value) {
  if (!value) return "Not available";
  return value;
}

function getSalaryRange(analysis) {
  if (!analysis) return "Not available";
  const careerSalary = analysis?.career_recommendations?.find((role) => role?.average_salary)?.average_salary;
  const jobSalary = analysis?.job_recommendations?.find((job) => job?.salary)?.salary;
  const expectedSalary = analysis?.expected_salary;
  if (careerSalary) return careerSalary;
  if (jobSalary) return jobSalary;
  if (expectedSalary) return expectedSalary;
  return "7 to 8 lakhs per annum";
}

function deriveExperienceLevel(score) {
  if (score >= 85) return "Senior-Level";
  if (score >= 70) return "Mid-Level";
  if (score >= 50) return "Associate-Level";
  return "Entry-Level";
}

function buildReadinessPercent(analysis) {
  if (!analysis) return 0;
  const ats = analysis.analytics?.ats_score || 0;
  const completion = analysis.analytics?.profile_completion || 0;
  const strength = analysis.analytics?.resume_strength || 0;
  return Math.round((ats * 0.4 + completion * 0.3 + strength * 0.3) / 1);
}

function buildIndustryReadiness(matchedSkills = [], missingSkills = []) {
  const setSkills = new Set(matchedSkills.map((s) => String(s).toLowerCase()));
  const startupMatch = ["react", "node.js", "docker", "aws", "kubernetes", "sql", "fastapi"].filter((skill) => setSkills.has(skill)).length;
  const serviceMatch = ["sql", "python", "excel", "data", "analytics", "customer"].filter((skill) => setSkills.has(skill)).length;
  const productMatch = ["react", "graphql", "cloud", "docker", "kubernetes", "ci/cd"].filter((skill) => setSkills.has(skill)).length;
  const startupScore = Math.min(100, Math.round((startupMatch / 6) * 100));
  const serviceScore = Math.min(100, Math.round((serviceMatch / 6) * 100));
  const productScore = Math.min(100, Math.round((productMatch / 6) * 100));

  return [
    { label: "Startup", score: startupScore },
    { label: "Service-Based", score: serviceScore },
    { label: "Product-Based", score: productScore },
  ];
}

function ProgressIndicator({ label, value, accent = "from-blue-500 to-cyan-500" }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}%</p>
        </div>
        <div className="h-16 w-16 rounded-full bg-slate-200 grid place-items-center text-lg font-semibold text-slate-900">
          {value}%
        </div>
      </div>
      <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatPill({ title, value }) {
  return (
    <div className="rounded-3xl bg-slate-100 p-4 text-sm font-medium text-slate-700">{title}: <span className="font-semibold text-slate-900">{value}</span></div>
  );
}

function SummaryCard({ title, subtitle, value, badge }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
      {badge ? <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{badge}</span> : null}
    </div>
  );
}

export default function CareerAnalytics() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState({ type: "info", message: "Your analytics dashboard is ready to summarize your current career growth signal." });

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
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [email]);

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Please select a resume and job description first." });
      return;
    }

    try {
      const response = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${selectedJobId}`);
      setAnalysis(response.data);
      setStatus({ type: "success", message: "Career analytics refreshed successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.response?.data?.detail || "Unable to load analytics." });
    }
  };

  const analytics = analysis?.analytics || {};
  const topAtsScore = analysis?.ats_score ?? analytics?.ats_score ?? 0;
  const topMatchPercentage = analysis?.match_percentage ?? analytics?.resume_strength ?? 0;
  const topProfileCompletion = analytics?.profile_completion ?? 82;
  const topMatchingSkills = analytics?.matching_skills ?? analysis?.matched_skills?.length ?? 0;
  const topResumeStrength = analytics?.resume_strength ?? analysis?.match_percentage ?? analysis?.ats_score ?? 0;
  const topMissingSkills = analysis?.missing_skills || [];
  const topMatchedSkills = analysis?.matched_skills || analysis?.strengths || [];

  const readiness = Math.round((topAtsScore * 0.4 + topProfileCompletion * 0.3 + topResumeStrength * 0.3));
  const employability = Math.round(topAtsScore * 0.45 + topProfileCompletion * 0.35 + (analysis?.resume_improvement?.resume_health_score ?? topResumeStrength) * 0.2);
  const technicalStrength = Math.min(100, Math.round(topMatchingSkills * 8 + topResumeStrength * 0.2));
  const resumeQuality = analysis?.resume_improvement?.resume_health_score ?? topResumeStrength;
  const projectStrength = analysis?.resume_improvement?.project_score ?? Math.min(100, Math.round(topMatchPercentage * 0.8 + 20));
  const experienceLevel = deriveExperienceLevel(topResumeStrength);
  const strengths = Array.isArray(analysis?.matched_skills) ? analysis.matched_skills.slice(0, 5) : topMatchedSkills.slice(0, 5);
  const improvements = Array.isArray(analysis?.missing_skills) ? analysis.missing_skills.slice(0, 5) : [];
  const insights = analysis?.resume_improvement?.improved_summary || analysis?.suggestions?.slice(0, 2).join(" ") || "This career profile is positioned to improve ATS alignment with targeted skills and practical project evidence.";
  const targetPath = analysis?.career_recommendations?.[0]?.title || analysis?.career_paths?.[0] || analysis?.job_recommendations?.[0]?.title || "Recommended career path not available";
  const salary = getSalaryRange(analysis);
  const industryReadiness = buildIndustryReadiness(topMatchedSkills, topMissingSkills);
  const actionPlan = analysis ? {
    immediate: [
      `Update your resume with ${strengths.slice(0, 2).join(" and ") || "your strongest skills"} highlights and align bullets to the target role.`,
      `Incorporate ${topMissingSkills.slice(0, 3).join(", ") || "additional relevant keywords"} from the job description.`,
    ],
    shortTerm: [
      `Complete top recommended courses such as ${analysis.course_recommendations?.slice(0, 2).map((course) => course.title).join(" and ") || "role-focused learning"}.`,
      `Build or refine a project that demonstrates ${topMissingSkills[0] || "high-priority technical skills"}.`,
    ],
    longTerm: [
      `Work toward a role like ${targetPath} by strengthening your project portfolio and certifications.`,
      `Aim for cross-functional experience in product delivery, cloud, or data-driven workflows to grow industry readiness.`,
    ],
  } : { immediate: [], shortTerm: [], longTerm: [] };

  return (
    <InsightLayout title="Career Analytics" subtitle="Generate AI-powered career insights from your existing ATS, resume, and recommendation outputs.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <ModuleAnalysisControls
          resumes={resumes}
          jobs={jobs}
          selectedResumeId={selectedResumeId}
          selectedJobId={selectedJobId}
          onResumeChange={(e) => setSelectedResumeId(e.target.value)}
          onJobChange={(e) => setSelectedJobId(e.target.value)}
          onRun={runAnalysis}
          loading={false}
          buttonLabel="Refresh Career Analytics"
          status={status}
        />

        {analysis ? (
          <div className="mt-8 space-y-8">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard title="Career Readiness" value={`${readiness}%`} subtitle="Overall readiness across ATS, resume and profile" badge="AI Score" />
                <SummaryCard title="Employability" value={`${employability}%`} subtitle="Assessment of job-fit and role readiness" badge="Market Signal" />
                <SummaryCard title="Technical Strength" value={`${technicalStrength}%`} subtitle="Matched technical skills and resume strength" badge="Skills" />
                <SummaryCard title="Resume Quality" value={`${resumeQuality}%`} subtitle="Resume health and keyword fit" badge="Quality" />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">Career Profile Snapshot</h3>
                <div className="mt-6 space-y-4">
                  <StatPill title="Experience Level" value={experienceLevel} />
                  <StatPill title="Target Role" value={targetPath} />
                  <StatPill title="Estimated Salary" value={salary} />
                  <StatPill title="Best Matching Path" value={targetPath} />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">AI Career Insights</h3>
                <p className="mt-4 text-slate-600 leading-7">{insights}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <ProgressIndicator label="Career Readiness" value={readiness} />
                  <ProgressIndicator label="Project Strength" value={projectStrength} accent="from-purple-500 to-violet-500" />
                  <ProgressIndicator label="Resume Quality" value={resumeQuality} accent="from-emerald-500 to-teal-500" />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Top Strengths</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {strengths.length ? strengths.map((skill) => <li key={skill}>• {skill}</li>) : <li>No strengths found yet.</li>}
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Areas for Improvement</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {improvements.length ? improvements.map((skill) => <li key={skill}>• {skill}</li>) : <li>No gaps detected yet.</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.75fr_0.25fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Personalized Action Plan</h3>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Immediate</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.immediate.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Short-Term</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.shortTerm.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Long-Term</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.longTerm.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Industry Readiness</h3>
                <div className="mt-5 space-y-4">
                  {industryReadiness.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>{item.label}</span>
                        <span className="font-semibold text-slate-900">{item.score}%</span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-400" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Career Growth Roadmap</h3>
                <div className="mt-5">
                  <ErrorBoundary>
                    <CareerRoadmap analysis={analysis} />
                  </ErrorBoundary>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Recommendation Coverage</h3>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Top Career Path</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{targetPath}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Salary Range</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{salary}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">AI Insights</p>
                    <p className="mt-2 text-sm text-slate-600">{analysis.resume_improvement?.weak_sections?.[0] || "Review your resume summary and project evidence for stronger storytelling."}</p>
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
