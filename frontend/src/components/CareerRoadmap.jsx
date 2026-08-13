import React from "react";

function estimateLearningTime(skills) {
  if (!skills || skills.length === 0) return "1-2 weeks";
  const weeks = Math.max(2, Math.min(24, skills.length * 4));
  const months = Math.round(weeks / 4);
  return months <= 1 ? `${weeks} weeks` : `${months} months`;
}

export default function CareerRoadmap({ analysis }) {
  if (!analysis) return null;

  const topRole = (analysis.career_recommendations && analysis.career_recommendations[0] && analysis.career_recommendations[0].title) || "Frontend Developer";

  const baseSteps = ["Student", topRole, "Software Engineer", "Senior Engineer", "Tech Lead", "Solution Architect"];
  const steps = baseSteps.filter((v, i, a) => a.indexOf(v) === i);

  const findRole = (title) => (analysis.career_recommendations || []).find((r) => r.title === title);

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800">Career Growth Roadmap (Future Growth)</h3>
      <div className="mt-4 space-y-6">
        {steps.map((step, idx) => {
          const next = steps[idx + 1];
          const nextRoleData = findRole(next);
          const skillsNeeded = nextRoleData ? nextRoleData.required_skills || [] : (analysis.missing_skills || []).slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
          const certifications = analysis.resume_improvement && analysis.resume_improvement.certification_suggestions ? analysis.resume_improvement.certification_suggestions.slice(0,2) : ["Relevant certification"];
          const project = (analysis.resume_improvement && analysis.resume_improvement.project_suggestions && analysis.resume_improvement.project_suggestions[0]) || "Build a focused project that demonstrates the skills for the next role.";

          return (
            <div key={step} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold">{idx+1}</div>
                {idx < steps.length - 1 && <div className="h-8 w-px bg-slate-200 mt-2"></div>}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">{idx === 0 ? "Current (shown as starting point)" : "Future Level"}</p>
                <h4 className="text-lg font-semibold text-slate-800">{step}</h4>
                {next ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-600 font-medium">Skills needed for next level</p>
                      <ul className="mt-2 text-sm text-slate-700 space-y-1">
                        {skillsNeeded.length ? skillsNeeded.map(s => <li key={s}>• {s}</li>) : <li>• General engineering skills</li>}
                      </ul>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-600 font-medium">Estimated learning time</p>
                      <p className="mt-2 text-sm text-slate-700">{estimateLearningTime(skillsNeeded)}</p>
                      <p className="text-xs text-slate-600 font-medium mt-3">Recommended certifications</p>
                      <ul className="mt-2 text-sm text-slate-700 space-y-1">
                        {certifications.map(c => <li key={c}>• {c}</li>)}
                      </ul>
                    </div>
                    <div className="sm:col-span-2 rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-600 font-medium">Recommended project</p>
                      <p className="mt-2 text-sm text-slate-700">{project}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">This is the top target level.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
