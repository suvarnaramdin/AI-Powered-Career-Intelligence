import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CareerInsightsDashboard from "./pages/CareerInsightsDashboard";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Resume from "./pages/Resume";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import JobDescription from "./pages/JobDescription";
import ATSAnalysis from "./pages/ATSAnalysis";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import CareerRecommendation from "./pages/CareerRecommendation";
import JobRecommendation from "./pages/JobRecommendation";
import CourseRecommendation from "./pages/CourseRecommendation";
import ResumeImprovement from "./pages/ResumeImprovement";
import ResumeBuilder from "./pages/ResumeBuilder";
import CareerAnalytics from "./pages/CareerAnalytics";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLayout from "./admin/AdminLayout";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminProfilesPage from "./admin/AdminProfilesPage";
import AdminResumesPage from "./admin/AdminResumesPage";
import AdminResumeParsingPage from "./admin/AdminResumeParsingPage";
import AdminJobsPage from "./admin/AdminJobsPage";
import AdminJobDetailPage from "./admin/AdminJobDetailPage";
import AdminATSPage from "./admin/AdminATSPage";
import AdminATSDetailPage from "./admin/AdminATSDetailPage";
import AdminSkillsPage from "./admin/AdminSkillsPage";
import AdminCareerRecommendationsPage from "./admin/AdminCareerRecommendationsPage";
import AdminJobRecommendationsPage from "./admin/AdminJobRecommendationsPage";
import AdminCoursesPage from "./admin/AdminCoursesPage";
import AdminCourseDetailPage from "./admin/AdminCourseDetailPage";
import AdminFeedbackPage from "./admin/AdminFeedbackPage";
import AdminFeedbackDetailPage from "./admin/AdminFeedbackDetailPage";
import AdminActivityPage from "./admin/AdminActivityPage";
import AdminSystemPage from "./admin/AdminSystemPage";
import AdminReportsPage from "./admin/AdminReportsPage";
import AdminNotificationsPage from "./admin/AdminNotificationsPage";
import AdminPlaceholderPage from "./admin/AdminPlaceholderPage";
import { ProtectedAdminRoute } from "./admin/adminAuth";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/career-insights" element={<CareerInsightsDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/job-description" element={<JobDescription />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ats-analysis" element={<ATSAnalysis />} />
        <Route path="/skill-gap-analysis" element={<SkillGapAnalysis />} />
        <Route path="/career-recommendation" element={<CareerRecommendation />} />
        <Route path="/job-recommendation" element={<JobRecommendation />} />
        <Route path="/course-recommendation" element={<CourseRecommendation />} />
        <Route path="/resume-improvement" element={<ResumeImprovement />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/analytics" element={<CareerAnalytics />} />
        <Route path="/career-analytics" element={<CareerAnalytics />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/users" element={<ProtectedAdminRoute><AdminLayout><AdminUsersPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/profiles" element={<ProtectedAdminRoute><AdminLayout><AdminProfilesPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/resumes" element={<ProtectedAdminRoute><AdminLayout><AdminResumesPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/resume-parsing" element={<ProtectedAdminRoute><AdminLayout><AdminResumeParsingPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/jobs" element={<ProtectedAdminRoute><AdminLayout><AdminJobsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/jobs/:jobId" element={<ProtectedAdminRoute><AdminLayout><AdminJobDetailPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/ats" element={<ProtectedAdminRoute><AdminLayout><AdminATSPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/ats/:analysisId" element={<ProtectedAdminRoute><AdminLayout><AdminATSDetailPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/skills" element={<ProtectedAdminRoute><AdminLayout><AdminSkillsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/career-recommendations" element={<ProtectedAdminRoute><AdminLayout><AdminCareerRecommendationsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/job-recommendations" element={<ProtectedAdminRoute><AdminLayout><AdminJobRecommendationsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/courses" element={<ProtectedAdminRoute><AdminLayout><AdminCoursesPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/certifications" element={<ProtectedAdminRoute><AdminLayout><AdminCoursesPage mode="certifications" /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/courses/:courseId" element={<ProtectedAdminRoute><AdminLayout><AdminCourseDetailPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/feedback" element={<ProtectedAdminRoute><AdminLayout><AdminFeedbackPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/feedback/:feedbackId" element={<ProtectedAdminRoute><AdminLayout><AdminFeedbackDetailPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/activity" element={<ProtectedAdminRoute><AdminLayout><AdminActivityPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/reports" element={<ProtectedAdminRoute><AdminLayout><AdminReportsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/system" element={<ProtectedAdminRoute><AdminLayout><AdminSystemPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminLayout><AdminNotificationsPage /></AdminLayout></ProtectedAdminRoute>} />
        <Route path="/admin/security" element={<ProtectedAdminRoute><AdminLayout><AdminPlaceholderPage title="Roles & Security" /></AdminLayout></ProtectedAdminRoute>} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;