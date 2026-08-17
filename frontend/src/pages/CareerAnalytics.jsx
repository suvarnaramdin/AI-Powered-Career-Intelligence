import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import ModuleAnalysisControls from "../components/ModuleAnalysisControls";
import ErrorBoundary from "../components/ErrorBoundary";
import { API_BASE_URL } from "../config/api";

const API = API_BASE_URL;

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

function CareerAnalyticsComponent() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const token = localStorage.getItem("token") || "";
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ 
    type: "info", 
    message: "Select a resume and job description to generate personalized career analytics." 
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

        // Auto-select first resume
        if (resumeRes.data && resumeRes.data.length > 0) {
          const firstResumeId = resumeRes.data[0].id;
          setSelectedResumeId(firstResumeId);
          localStorage.setItem("resume_id", firstResumeId);
        }

        // Auto-select first job
        if (jobRes.data && jobRes.data.length > 0) {
          setSelectedJobId(jobRes.data[0].id);
          localStorage.setItem("selectedJob", JSON.stringify(jobRes.data[0]));
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load resumes or jobs" });
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
    setStatus({ type: "info", message: "Calculating your career analytics..." });

    try {
      const response = await axios.post(
        `${API}/api/career-analytics`,
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
      setStatus({ type: "success", message: "Career analytics generated successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ 
        type: "error", 
        message: err.response?.data?.detail || "Unable to generate career analytics." 
      });
    } finally {
      setLoading(false);
    }
  };

  // Get rounded values from analysis
  const readiness = analysis?.career_readiness ? Math.round(analysis.career_readiness) : 0;
  const employability = analysis?.employability ? Math.round(analysis.employability) : 0;
  const technicalStrength = analysis?.technical_strength ? Math.round(analysis.technical_strength) : 0;
  const resumeQuality = analysis?.resume_quality ? Math.round(analysis.resume_quality) : 0;
  const projectStrength = analysis?.career_readiness ? Math.round(analysis.career_readiness * 0.9 + 10) : 0;
  
  const strengths = analysis?.top_strengths?.slice(0, 5) || [];
  const improvements = analysis?.areas_for_improvement?.slice(0, 5) || [];
  const insights = analysis?.career_insights || "Loading insights...";
  const targetPath = analysis?.target_role || "Not Available";
  const salary = "Not Available";
  
  const industryReadiness = analysis ? [
    { label: "Startup", score: Math.round((readiness * 0.9) + 10) },
    { label: "Service-Based", score: Math.round(readiness) },
    { label: "Product-Based", score: Math.round((readiness * 0.85) + 15) },
  ] : [];
  
  const actionPlan = analysis?.action_plan || { immediate: [], shortTerm: [], longTerm: [] };

  const buildRoadmapComponent = () => {
    if (!analysis?.career_roadmap || analysis.career_roadmap.length === 0) {
      return <p className="text-slate-600">No roadmap available yet.</p>;
    }
    
    return (
      <div className="space-y-3">
        {analysis.career_roadmap.map((level, idx) => (
          <div key={idx} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-600">{level.level}</p>
            <p className="text-lg font-bold text-slate-900">{level.role}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <InsightLayout 
      title="Career Analytics" 
      subtitle="Comprehensive AI-powered analysis of your career growth and readiness metrics."
    >
      <div className="rounded-3xl bg-white p-6 shadow">
        <ModuleAnalysisControls
          resumes={resumes}
          jobs={jobs}
          selectedResumeId={selectedResumeId}
          selectedJobId={selectedJobId}
          onResumeChange={(e) => {
            setSelectedResumeId(e.target.value);
            setAnalysis(null);
          }}
          onJobChange={(e) => {
            setSelectedJobId(e.target.value);
            setAnalysis(null);
          }}
          onRun={runAnalysis}
          loading={loading}
          buttonLabel="Generate Career Analytics"
          status={status}
        />

        {analysis ? (
          <div className="mt-8 space-y-8">
            {/* Core Metrics */}
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard 
                  title="Career Readiness" 
                  value={`${readiness}%`} 
                  subtitle="Overall readiness across resume, skills, and profile" 
                  badge="Dynamic" 
                />
                <SummaryCard 
                  title="Employability" 
                  value={`${employability}%`} 
                  subtitle="Assessment of job-fit and role readiness" 
                  badge="Market Signal" 
                />
                <SummaryCard 
                  title="Technical Strength" 
                  value={`${technicalStrength}%`} 
                  subtitle="Matched technical skills and depth" 
                  badge="Skills" 
                />
                <SummaryCard 
                  title="Resume Quality" 
                  value={`${resumeQuality}%`} 
                  subtitle="Resume completeness and optimization" 
                  badge="Quality" 
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">Career Profile Snapshot</h3>
                <div className="mt-6 space-y-4">
                  <StatPill title="Target Role" value={targetPath} />
                  <StatPill title="Best Path" value={analysis?.best_matching_path || "Not Available"} />
                  <StatPill title="Salary Range" value={salary} />
                  <StatPill 
                    title="Experience Level" 
                    value={
                      technicalStrength >= 85 ? "Senior-Level" :
                      technicalStrength >= 70 ? "Mid-Level" :
                      technicalStrength >= 50 ? "Associate-Level" :
                      "Entry-Level"
                    } 
                  />
                </div>
              </div>
            </div>

            {/* Insights and Analysis */}
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
                    {strengths.length ? strengths.map((skill, idx) => <li key={idx}>• {skill}</li>) : <li>No strengths found yet.</li>}
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Areas for Improvement</h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {improvements.length ? improvements.map((skill, idx) => <li key={idx}>• {skill}</li>) : <li>No gaps detected yet.</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Plan */}
            <div className="grid gap-6 xl:grid-cols-[0.75fr_0.25fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Personalized Action Plan</h3>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Immediate (1-2 weeks)</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.immediate && actionPlan.immediate.length > 0 ? (
                        actionPlan.immediate.map((item, idx) => <li key={idx}>• {item}</li>)
                      ) : (
                        <li>Focus on skill development</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Short-Term (1-3 months)</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.short_term && actionPlan.short_term.length > 0 ? (
                        actionPlan.short_term.map((item, idx) => <li key={idx}>• {item}</li>)
                      ) : (
                        <li>Complete courses and projects</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Long-Term (3-12 months)</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {actionPlan.long_term && actionPlan.long_term.length > 0 ? (
                        actionPlan.long_term.map((item, idx) => <li key={idx}>• {item}</li>)
                      ) : (
                        <li>Build experience and network</li>
                      )}
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

            {/* Roadmap and Recommendations */}
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Career Growth Roadmap</h3>
                <div className="mt-5">
                  <ErrorBoundary>
                    {buildRoadmapComponent()}
                  </ErrorBoundary>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Quick Stats</h3>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Matched Skills</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{analysis?.matched_skills?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Skill Gaps</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{analysis?.missing_skills?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Recommended Courses</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{analysis?.recommended_courses?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
            <p className="text-slate-600 text-lg">
              {selectedResumeId && selectedJobId 
                ? "Click 'Generate Career Analytics' to see your personalized analysis." 
                : "Select a resume and job description to get started."}
            </p>
          </div>
        )}
      </div>
    </InsightLayout>
  );
}

export default CareerAnalyticsComponent;
