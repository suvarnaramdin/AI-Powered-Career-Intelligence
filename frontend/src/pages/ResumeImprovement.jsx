import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";

const API = "http://127.0.0.1:8000";

const CERTIFICATION_LIBRARY = {
  python: ["Python Institute - PCAP", "Microsoft Azure AI Fundamentals"],
  react: ["Meta Front-End Developer", "React Certification (Scrimba/Frontend Masters)"],
  javascript: ["JavaScript Algorithms and Data Structures", "Meta Front-End Developer"],
  sql: ["Google Data Analytics", "Microsoft SQL Server Fundamentals"],
  aws: ["AWS Cloud Practitioner", "AWS Solutions Architect Associate"],
  docker: ["Docker Certified Associate", "Coursera Docker Specialization"],
  kubernetes: ["Certified Kubernetes Administrator", "Google Cloud Architect"],
  "machine learning": ["Google ML Bootcamp", "IBM AI Developer Professional Certificate"],
  fastapi: ["Python Web Development", "FastAPI Practical Certification"],
  nodejs: ["Node.js Certified Developer", "MongoDB Developer Certification"],
};

function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSkillTokens(text = "") {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .filter((token) => token.length > 2)
    .map((token) => token.replace(/s$/, ""));
}

function buildImprovementPlan(resume, profile = {}) {
  const resumeSkills = extractSkillTokens(resume?.parsed_skills || resume?.content || "");
  const resumeProjects = resume?.parsed_projects || "";
  const resumeCertifications = resume?.parsed_certifications || "";
  const resumeExperience = resume?.parsed_experience || "";
  const careerInterest = profile?.career_interest || "software development";
  const education = profile?.college || profile?.degree || resume?.parsed_college || resume?.parsed_degree || "";
  const summarySource = resume?.parsed_summary || "";

  const scoreFactors = [
    { present: Boolean(summarySource) },
    { present: Boolean(resume?.parsed_skills) },
    { present: Boolean(education) },
    { present: Boolean(resumeExperience) },
    { present: Boolean(resumeProjects) },
    { present: Boolean(resumeCertifications) },
  ];

  const score = Math.round((scoreFactors.filter((item) => item.present).length / scoreFactors.length) * 100);

  const improvedSummary = [
    `Results-driven ${careerInterest} candidate with a strong foundation in ${resumeSkills.slice(0, 3).join(", ") || "core technical skills"}.`,
    "Experienced in building, testing, and documenting practical solutions that improve usability, performance, and business impact.",
    `Focused on applying academic learning and hands-on project work to deliver value in ${careerInterest} and related technical roles.`,
  ].join(" ");

  const sectionSuggestions = [];
  if (!summarySource) {
    sectionSuggestions.push("Add a concise professional summary that highlights your strongest technical skills and career direction.");
  }
  if (!resume?.parsed_skills) {
    sectionSuggestions.push("Expand your skills section with technical stack keywords, tools, and frameworks relevant to your target role.");
  }
  if (!resumeExperience) {
    sectionSuggestions.push("Strengthen experience entries with role ownership, technologies used, and measurable outcomes.");
  }
  if (!resumeProjects) {
    sectionSuggestions.push("Add 2–3 portfolio projects with problem statement, implementation details, tools used, and business impact.");
  }
  if (!resumeCertifications) {
    sectionSuggestions.push("Include certifications that validate your most relevant technical skills and increase resume credibility.");
  }
  if (!education) {
    sectionSuggestions.push("Add the highest qualification, college name, and graduation year to improve educational credibility.");
  }

  const projectImprovementSuggestions = [
    "Rewrite each project description using action verbs such as Built, Developed, Optimized, Automated, and Delivered.",
    "Quantify outcomes with metrics like improved performance, reduced time, increased accuracy, or user growth.",
    "Mention the tools, frameworks, and datasets used so recruiters can quickly understand your technical depth.",
  ];

  const recommendedProjects = [
    `Build a ${careerInterest} portfolio project that demonstrates ${resumeSkills.slice(0, 2).join(" and ") || "strong technical execution"} with a clean UI and live deployment.`,
    `Create a case-study project that uses ${resumeSkills.slice(0, 3).join(", ") || "modern development tools"} to solve a real-world problem and include measurable results.`,
    `Develop a project that combines your education background in ${education || "your domain"} with practical implementation using ${resumeSkills.slice(0, 2).join(" and ") || "current tech stack"}.`,
  ];

  const recommendedCertifications = [];
  const seen = new Set();

  for (const skill of Object.keys(CERTIFICATION_LIBRARY)) {
    if (resumeSkills.includes(skill)) {
      for (const cert of CERTIFICATION_LIBRARY[skill]) {
        if (!seen.has(cert)) {
          recommendedCertifications.push(cert);
          seen.add(cert);
        }
      }
    }
  }

  if (recommendedCertifications.length === 0) {
    recommendedCertifications.push("AWS Cloud Practitioner", "Google Data Analytics", "Meta Front-End Developer");
  }

  return {
    improvedSummary,
    qualityScore: score,
    sectionSuggestions,
    projectImprovementSuggestions,
    recommendedCertifications: recommendedCertifications.slice(0, 4),
    recommendedProjects,
  };
}

export default function ResumeImprovement() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState({ type: "info", message: "Analyze the uploaded resume and generate targeted improvement suggestions." });

  useEffect(() => {
    const loadData = async () => {
      if (!email) return;
      try {
        const [resumeRes, profileRes] = await Promise.all([
          axios.get(`${API}/resumes/${email}`),
          axios.get(`${API}/profile/${email}`).catch(() => null),
        ]);

        const resumeList = resumeRes.data || [];
        setResumes(resumeList);

        if (resumeList.length && !selectedResumeId) {
          const firstResumeId = String(resumeList[0].id);
          setSelectedResumeId(firstResumeId);
          localStorage.setItem("resume_id", firstResumeId);
        }

        setProfile(profileRes?.data || null);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load the saved resume and profile data." });
      }
    };

    loadData();
  }, [email]);

  const runAnalysis = () => {
    if (!selectedResumeId) {
      setStatus({ type: "error", message: "Please choose a saved resume to analyze." });
      return;
    }

    const resume = resumes.find((item) => String(item.id) === String(selectedResumeId));
    if (!resume) {
      setStatus({ type: "error", message: "The selected resume could not be found." });
      return;
    }

    const result = buildImprovementPlan(resume, profile);
    setAnalysis(result);
    localStorage.setItem("resumeImprovementResult", JSON.stringify(result));
    setStatus({ type: "success", message: "Resume quality suggestions generated successfully." });
  };

  return (
    <InsightLayout title="Resume Improvement" subtitle="Provide recommendations to improve resume quality.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Objective</h3>
          <p className="mt-2 text-lg text-slate-700">Provide recommendations to improve resume quality.</p>
          <h3 className="mt-6 text-2xl font-bold text-slate-800">Features</h3>
          <ul className="mt-3 space-y-2 text-lg text-slate-700">
            <li>• Improve Resume Summary</li>
            <li>• Suggest Missing Keywords</li>
            <li>• Improve Project Descriptions</li>
            <li>• Recommend Certifications</li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-medium text-slate-700">
            Select uploaded resume
            <select
              value={selectedResumeId}
              onChange={(e) => {
                setSelectedResumeId(e.target.value);
                localStorage.setItem("resume_id", e.target.value);
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

          <button
            type="button"
            onClick={runAnalysis}
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
          >
            Analyze Resume
          </button>
        </div>

        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
          {status.message}
        </div>

        {analysis ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Improved Resume Summary</h3>
              <p className="mt-3 text-sm text-slate-600">{analysis.improvedSummary}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Resume Quality Score</h3>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-blue-700">
                  {analysis.qualityScore}%
                </div>
                <div className="text-sm text-slate-600">
                  This score is based on the completeness of your summary, skills, education, experience, projects, and certifications.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Section-wise Suggestions</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {analysis.sectionSuggestions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Project Improvement Suggestions</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {analysis.projectImprovementSuggestions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Recommended Certifications</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {analysis.recommendedCertifications.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800">Recommended Projects</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {analysis.recommendedProjects.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
