import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import ModuleAnalysisControls from "../components/ModuleAnalysisControls";

const API = "http://127.0.0.1:8000";

const COURSE_LIBRARY = [
  {
    title: "Python API Development",
    platform: "Coursera",
    duration: "4 Weeks",
    difficulty: "Intermediate",
    skill_covered: "fastapi",
    learning_path: ["Week 1: API basics", "Week 2: FastAPI fundamentals", "Week 3: Database integration", "Week 4: Deployment"],
  },
  {
    title: "React Mastery",
    platform: "Udemy",
    duration: "6 Weeks",
    difficulty: "Intermediate",
    skill_covered: "react",
    learning_path: ["Week 1: Components", "Week 2: State management", "Week 3: Hooks", "Week 4: Routing", "Week 5: Performance", "Week 6: Deployment"],
  },
  {
    title: "AWS Cloud Foundations",
    platform: "AWS Skill Builder",
    duration: "3 Weeks",
    difficulty: "Beginner",
    skill_covered: "aws",
    learning_path: ["Week 1: Core services", "Week 2: Security", "Week 3: Hands-on labs"],
  },
  {
    title: "SQL Essentials",
    platform: "SQLBolt",
    duration: "2 Weeks",
    difficulty: "Beginner",
    skill_covered: "sql",
    learning_path: ["Week 1: Queries", "Week 2: Joins and filtering"],
  },
  {
    title: "JavaScript Fundamentals",
    platform: "freeCodeCamp",
    duration: "3 Weeks",
    difficulty: "Beginner",
    skill_covered: "javascript",
    learning_path: ["Week 1: Basics", "Week 2: DOM", "Week 3: Async JavaScript"],
  },
  {
    title: "Docker & Containers",
    platform: "Docker Docs",
    duration: "2 Weeks",
    difficulty: "Beginner",
    skill_covered: "docker",
    learning_path: ["Week 1: Container basics", "Week 2: Image build and deployment"],
  },
  {
    title: "Machine Learning Basics",
    platform: "Kaggle",
    duration: "4 Weeks",
    difficulty: "Intermediate",
    skill_covered: "machine learning",
    learning_path: ["Week 1: Core concepts", "Week 2: Python ML", "Week 3: Model evaluation", "Week 4: Practical notebook"],
  },
];

const LEARNING_GUIDES = {
  python: [
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/python-programming-language/" },
    { platform: "freeCodeCamp", website: "https://www.freecodecamp.org/" },
  ],
  javascript: [
    { platform: "freeCodeCamp", website: "https://www.freecodecamp.org/" },
    { platform: "MDN Web Docs", website: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  ],
  react: [
    { platform: "React Docs", website: "https://react.dev" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/reactjs/" },
  ],
  "node.js": [
    { platform: "Node.js Docs", website: "https://nodejs.org/en/docs/" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/nodejs/" },
  ],
  fastapi: [
    { platform: "FastAPI Docs", website: "https://fastapi.tiangolo.com/" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/fastapi/" },
  ],
  sql: [
    { platform: "SQLBolt", website: "https://sqlbolt.com/" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/sql/" },
  ],
  aws: [
    { platform: "AWS Skill Builder", website: "https://skillbuilder.aws/" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/aws/" },
  ],
  docker: [
    { platform: "Docker Docs", website: "https://docs.docker.com/" },
    { platform: "Play with Docker", website: "https://labs.play-with-docker.com/" },
  ],
  kubernetes: [
    { platform: "Kubernetes.io", website: "https://kubernetes.io/" },
    { platform: "GeeksforGeeks", website: "https://www.geeksforgeeks.org/kubernetes/" },
  ],
  "machine learning": [
    { platform: "Kaggle", website: "https://www.kaggle.com/" },
    { platform: "Google Colab", website: "https://colab.research.google.com/" },
  ],
  html: [
    { platform: "MDN Web Docs", website: "https://developer.mozilla.org/en-US/docs/Learn/HTML" },
    { platform: "freeCodeCamp", website: "https://www.freecodecamp.org/" },
  ],
  css: [
    { platform: "MDN Web Docs", website: "https://developer.mozilla.org/en-US/docs/Learn/CSS" },
    { platform: "freeCodeCamp", website: "https://www.freecodecamp.org/" },
  ],
};

function buildCourseRecommendations(missingSkills = [], matchedSkills = []) {
  const skillPool = new Set([...missingSkills, ...matchedSkills]);
  const recommendations = COURSE_LIBRARY.filter((course) => {
    const skillMatch = course.skill_covered.toLowerCase();
    return missingSkills.some((item) => item.toLowerCase() === skillMatch) || skillPool.has(course.skill_covered);
  });

  if (recommendations.length > 0) {
    return recommendations.slice(0, 3);
  }

  return COURSE_LIBRARY.slice(0, 3);
}

export default function CourseRecommendation() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [selectedJobId, setSelectedJobId] = useState(localStorage.getItem("selectedJob") ? JSON.parse(localStorage.getItem("selectedJob") || "{}")?.id || "" : "");
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState({ type: "info", message: "Reuse the ATS-linked resume and job description to generate course recommendations from missing skills." });

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

        const savedResumeId = localStorage.getItem("resume_id");
        const savedJob = localStorage.getItem("selectedJob");
        if (savedResumeId) setSelectedResumeId(savedResumeId);
        if (savedJob) {
          try {
            const parsedJob = JSON.parse(savedJob);
            if (parsedJob?.id) setSelectedJobId(String(parsedJob.id));
          } catch {
            // ignore malformed saved job data
          }
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load ATS-linked resume and job description data." });
      }
    };

    loadData();
  }, [email]);

  const runAnalysis = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setStatus({ type: "error", message: "Please select the ATS-linked resume and job description first." });
      return;
    }

    try {
      const savedAnalysis = localStorage.getItem("skillGapAnalysis");
      if (savedAnalysis) {
        const parsedAnalysis = JSON.parse(savedAnalysis);
        setAnalysis(parsedAnalysis);
        setStatus({ type: "success", message: "Course recommendations reused from the ATS + Skill Gap analysis." });
        return;
      }

      const response = await axios.post(`${API}/ats/analyze/${selectedResumeId}/${selectedJobId}`);
      const payload = response.data;
      localStorage.setItem("skillGapAnalysis", JSON.stringify(payload));
      setAnalysis(payload);
      setStatus({ type: "success", message: "Course recommendations generated from the ATS-linked missing skills." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Unable to generate course recommendations from the ATS inputs." });
    }
  };

  const missingSkills = useMemo(() => analysis?.missing_skills || [], [analysis]);
  const matchedSkills = useMemo(() => analysis?.matched_skills || [], [analysis]);
  const recommendations = useMemo(() => buildCourseRecommendations(missingSkills, matchedSkills), [missingSkills, matchedSkills]);

  return (
    <InsightLayout title="Course Recommendation" subtitle="Recommend courses to bridge identified skill gaps.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 mb-6">
          <h3 className="text-2xl font-bold text-slate-800">Objective</h3>
          <p className="mt-2 text-lg text-slate-700">Recommend courses to bridge identified skill gaps.</p>
          <h3 className="mt-6 text-2xl font-bold text-slate-800">Features</h3>
          <ul className="mt-3 space-y-2 text-lg text-slate-700">
            <li>• Detect Missing Skills</li>
            <li>• Suggest Relevant Courses</li>
            <li>• Display Learning Path</li>
          </ul>
        </div>

        <ModuleAnalysisControls
          resumes={resumes}
          jobs={jobs}
          selectedResumeId={selectedResumeId}
          selectedJobId={selectedJobId}
          onResumeChange={(e) => setSelectedResumeId(e.target.value)}
          onJobChange={(e) => setSelectedJobId(e.target.value)}
          onRun={runAnalysis}
          loading={false}
          buttonLabel="Recommend Courses"
          status={status}
        />

        <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
          <h3 className="text-lg font-semibold">ATS Linked Inputs</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              <span className="font-semibold text-white">Resume:</span> {resumes.find((resume) => String(resume.id) === String(selectedResumeId))?.filename || "No ATS resume selected"}
            </div>
            <div className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              <span className="font-semibold text-white">Job Description:</span> {jobs.find((job) => String(job.id) === String(selectedJobId)) ? `${jobs.find((job) => String(job.id) === String(selectedJobId))?.job_title} — ${jobs.find((job) => String(job.id) === String(selectedJobId))?.company_name}` : "No ATS job selected"}
            </div>
          </div>
        </div>

        {analysis ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Missing Skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingSkills.length > 0 ? missingSkills.map((skill) => <span key={skill} className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700">{skill}</span>) : <p className="text-sm text-slate-500">No missing skills identified.</p>}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {recommendations.map((course) => (
                <div key={course.title} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-800">{course.title}</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Learning Platform:</span> {course.platform}</p>
                    <p><span className="font-semibold text-slate-800">Duration:</span> {course.duration}</p>
                    <p><span className="font-semibold text-slate-800">Difficulty:</span> {course.difficulty}</p>
                    <p><span className="font-semibold text-slate-800">Skill Covered:</span> {course.skill_covered}</p>
                    <div>
                      <p className="font-semibold text-slate-800">Suggested Free Learning Platforms:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(LEARNING_GUIDES[course.skill_covered] || []).map((item) => (
                          <a key={`${course.title}-${item.platform}`} href={item.website} target="_blank" rel="noreferrer" className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700 border border-amber-200">
                            {item.platform}
                          </a>
                        ))}
                      </div>
                    </div>
                    <p><span className="font-semibold text-slate-800">Learning Path:</span></p>
                    <ul className="ml-4 list-disc">
                      {course.learning_path.map((week) => <li key={week}>{week}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </InsightLayout>
  );
}
