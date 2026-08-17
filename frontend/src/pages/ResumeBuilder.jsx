import { useEffect, useMemo, useState } from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import axios from "axios";
import InsightLayout from "../components/InsightLayout";
import { API_BASE_URL } from "../config/api";

const API = API_BASE_URL;

function safeText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "").trim();
}

function splitLines(value) {
  return safeText(value)
    .split(/\r?\n|\s*•\s*|\s*[-–]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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
    .map((token) => token.replace(/s$/, ""))
    .slice(0, 12);
}

function splitPdfLines(value = "") {
  return safeText(value)
    .split(/\r?\n|\s*•\s*|\s*[-–]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 10,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0f172a",
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    fontSize: 10,
    color: "#475569",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563eb",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: "#334155",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    marginRight: 6,
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    fontSize: 9,
    color: "#0f172a",
  },
  bullet: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.35,
    marginBottom: 3,
  },
});

function ResumePdfDocument({ profileSnapshot, form }) {
  const skillTags = extractSkillTokens(form.skills);
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.name}>{profileSnapshot?.fullName || "Your Name"}</Text>
          <View style={pdfStyles.contactRow}>
            <Text>{profileSnapshot?.emailAddress || "your.email@example.com"}</Text>
            <Text> • </Text>
            <Text>{profileSnapshot?.phone || "+1 000 000 0000"}</Text>
            {profileSnapshot?.github ? (<><Text> • </Text><Text>{profileSnapshot.github}</Text></>) : null}
            {profileSnapshot?.linkedin ? (<><Text> • </Text><Text>{profileSnapshot.linkedin}</Text></>) : null}
            {profileSnapshot?.portfolio ? (<><Text> • </Text><Text>{profileSnapshot.portfolio}</Text></>) : null}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Professional Summary</Text>
          <Text style={pdfStyles.bodyText}>{form.summary || "Results-driven professional with strong technical execution and practical project impact."}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Skills</Text>
          <View style={pdfStyles.chipRow}>
            {skillTags.length ? skillTags.map((tag) => <Text key={tag} style={pdfStyles.chip}>{tag}</Text>) : <Text style={pdfStyles.bodyText}>No skills entered yet.</Text>}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Education</Text>
          <Text style={pdfStyles.bodyText}>{form.education || "Education details will appear here."}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Experience</Text>
          <Text style={pdfStyles.bodyText}>{form.experience || "Experience details will appear here."}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Projects</Text>
          <Text style={pdfStyles.bodyText}>{form.projects || "Project details will appear here."}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Certifications</Text>
          <Text style={pdfStyles.bodyText}>{form.certifications || "Certification details will appear here."}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Achievements</Text>
          {splitPdfLines(form.achievements).length ? splitPdfLines(form.achievements).map((item) => <Text key={item} style={pdfStyles.bullet}>• {item}</Text>) : <Text style={pdfStyles.bodyText}>No achievements entered yet.</Text>}
        </View>
      </Page>
    </Document>
  );
}

export default function ResumeBuilder() {
  const email = useMemo(() => localStorage.getItem("selectedEmail") || localStorage.getItem("email") || "", []);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(localStorage.getItem("resume_id") || "");
  const [profile, setProfile] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState({ type: "info", message: "Build a professional one-page ATS-friendly resume from your saved parsed data." });
  const [form, setForm] = useState({
    summary: "",
    skills: "",
    education: "",
    experience: "",
    projects: "",
    certifications: "",
    achievements: "",
  });

  const [personal, setPersonal] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("resumeBuilderProfile") || "null") || {
        fullName: "",
        emailAddress: "",
        phone: "",
        github: "",
        linkedin: "",
        portfolio: "",
      };
    } catch {
      return { fullName: "", emailAddress: "", phone: "", github: "", linkedin: "", portfolio: "" };
    }
  });

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

        const activeResume = resumeList.find((item) => String(item.id) === String(selectedResumeId)) || resumeList[0];
        if (activeResume) {
          setSelectedResumeId(String(activeResume.id));
          localStorage.setItem("resume_id", String(activeResume.id));
          hydrateFromResume(activeResume, profileRes?.data || null);
        }

        setProfile(profileRes?.data || null);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Unable to load the saved resume details needed for the builder." });
      }
    };

    loadData();
  }, [email]);

  const hydrateFromResume = (resume, savedProfile = null) => {
    const improvement = JSON.parse(localStorage.getItem("resumeImprovementResult") || "null");
    const fullName = savedProfile?.fullname || resume?.parsed_name || "Your Name";
    const emailAddress = savedProfile?.email || resume?.parsed_email || email || "your.email@example.com";
    const phone = savedProfile?.phone || resume?.parsed_phone || "";
    const college = savedProfile?.college || resume?.parsed_college || resume?.parsed_degree || "";
    const degree = savedProfile?.degree || resume?.parsed_degree || "";
    const skills = resume?.parsed_skills || resume?.content || savedProfile?.skills || "";
    const experience = resume?.parsed_experience || savedProfile?.experience || "";
    const projects = resume?.parsed_projects || savedProfile?.projects || "";
    const certifications = resume?.parsed_certifications || savedProfile?.certifications || "";
    const summary = improvement?.improvedSummary || resume?.parsed_summary || "Results-driven professional with strong technical execution and project experience.";
    const achievements = safeText(resume?.parsed_achievements || savedProfile?.achievements || experience);

    setForm({
      summary,
      skills: safeText(skills),
      education: [college, degree].filter(Boolean).join(" • "),
      experience: safeText(experience),
      projects: safeText(projects),
      certifications: safeText(certifications),
      achievements: achievements || "Delivered practical projects, worked effectively in team environments, and maintained strong ownership of outcomes.",
    });

    const profileObj = {
      fullName,
      emailAddress,
      phone,
      github: savedProfile?.github || "",
      linkedin: savedProfile?.linkedin || "",
      portfolio: savedProfile?.portfolio || "",
    };

    setPersonal(profileObj);
    localStorage.setItem("resumeBuilderProfile", JSON.stringify(profileObj));
  };

  const profileSnapshot = personal;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownload = async () => {
    if (!form.summary && !form.skills && !form.education && !form.experience && !form.projects && !form.certifications && !form.achievements) {
      setStatus({ type: "error", message: "Please wait until the resume content has been loaded before downloading." });
      return;
    }

    try {
      setIsExporting(true);
      setStatus({ type: "info", message: "Preparing your ATS-friendly PDF download..." });

      const blob = await pdf(
        <ResumePdfDocument profileSnapshot={profileSnapshot} form={form} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus({ type: "success", message: "Resume PDF downloaded successfully." });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "PDF export failed. Please try again." });
    } finally {
      setIsExporting(false);
    }
  };

  const skillTags = extractSkillTokens(form.skills);

  return (
    <InsightLayout title="Resume Builder" subtitle="Create a professional ATS-friendly one-page resume from your existing saved data.">
      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-2xl font-bold text-slate-800">Professional one-page resume builder</h3>
          <p className="mt-2 text-slate-700">
            Reuse your parsed resume details and the AI improvement summary to draft a clean, responsive, print-ready resume.
          </p>
        </div>

        <div className="no-print mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-medium text-slate-700">
            Select uploaded resume
            <select
              value={selectedResumeId}
              onChange={(e) => {
                setSelectedResumeId(e.target.value);
                localStorage.setItem("resume_id", e.target.value);
                const resume = resumes.find((item) => String(item.id) === String(e.target.value));
                if (resume) hydrateFromResume(resume, profile);
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
            onClick={handleDownload}
            disabled={isExporting}
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isExporting ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>

        <div className={`no-print mb-6 rounded-2xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-200 bg-red-50 text-red-700" : status.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
          {status.message}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="no-print space-y-4 rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">Full name</label>
                <input value={personal.fullName} onChange={(e)=>{ const v=e.target.value; const next={...personal, fullName:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input value={personal.emailAddress} onChange={(e)=>{ const v=e.target.value; const next={...personal, emailAddress:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <input value={personal.phone} onChange={(e)=>{ const v=e.target.value; const next={...personal, phone:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">GitHub</label>
                <input value={personal.github} onChange={(e)=>{ const v=e.target.value; const next={...personal, github:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">LinkedIn</label>
                <input value={personal.linkedin} onChange={(e)=>{ const v=e.target.value; const next={...personal, linkedin:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Portfolio / Website</label>
                <input value={personal.portfolio} onChange={(e)=>{ const v=e.target.value; const next={...personal, portfolio:v}; setPersonal(next); localStorage.setItem('resumeBuilderProfile', JSON.stringify(next)); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Summary</label>
              <textarea value={form.summary} onChange={(e) => handleChange("summary", e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Skills</label>
              <textarea value={form.skills} onChange={(e) => handleChange("skills", e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Education</label>
              <textarea value={form.education} onChange={(e) => handleChange("education", e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Experience</label>
              <textarea value={form.experience} onChange={(e) => handleChange("experience", e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Projects</label>
              <textarea value={form.projects} onChange={(e) => handleChange("projects", e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Certifications</label>
              <textarea value={form.certifications} onChange={(e) => handleChange("certifications", e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Achievements</label>
              <textarea value={form.achievements} onChange={(e) => handleChange("achievements", e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </div>
          </div>

          <div className="preview-sheet rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mx-auto max-w-[210mm] rounded-[18px] border border-slate-300 bg-white p-6 text-slate-800 print-page">
              <div className="mb-5 border-b border-slate-300 pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
                  {profileSnapshot?.fullName || "Your Name"}
                </h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span>{profileSnapshot?.emailAddress || "your.email@example.com"}</span>
                  <span>•</span>
                  <span>{profileSnapshot?.phone || "+1 000 000 0000"}</span>
                  {profileSnapshot?.github ? (<><span>•</span><span>{profileSnapshot.github}</span></>) : null}
                  {profileSnapshot?.linkedin ? (<><span>•</span><span>{profileSnapshot.linkedin}</span></>) : null}
                  {profileSnapshot?.portfolio ? (<><span>•</span><span>{profileSnapshot.portfolio}</span></>) : null}
                </div>
              </div>

              <div className="grid gap-5 text-[13px] leading-6">
                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Professional Summary</h2>
                  <p>{form.summary || "Results-driven professional with strong technical execution and practical project impact."}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {skillTags.length ? skillTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">{tag}</span>
                    )) : <span className="text-slate-600">No skills entered yet.</span>}
                  </div>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Education</h2>
                  <p>{form.education || "Education details will appear here."}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Experience</h2>
                  <p>{form.experience || "Experience details will appear here."}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Projects</h2>
                  <p>{form.projects || "Project details will appear here."}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Certifications</h2>
                  <p>{form.certifications || "Certification details will appear here."}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-blue-700">Achievements</h2>
                  <ul className="list-disc space-y-1 pl-5">
                    {splitLines(form.achievements).length ? splitLines(form.achievements).map((item) => (
                      <li key={item}>{item}</li>
                    )) : <li>No achievements entered yet.</li>}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          .preview-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .print-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </InsightLayout>
  );
}
